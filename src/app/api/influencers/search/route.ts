import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { chatWithFallback, type LLMMessage } from "@/lib/llm";

export const dynamic = "force-dynamic";

/**
 * POST /api/influencers/search
 *
 * Searches for real influencers using LLM + web search.
 *
 * Two strategies:
 * 1. ZAI web_search (if available locally) + LLM extraction
 * 2. Pure LLM approach (works on Vercel) — asks the LLM directly
 *    about influencers in a given niche
 *
 * Body: { query: string, platform?: string }
 * Returns: { results: InfluencerResult[] }
 */

interface InfluencerResult {
  name: string;
  handle: string;
  platform: string;
  followers: string;
  niche: string;
  bio: string;
  profileUrl: string;
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { query, platform } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  const platformFilter = platform && platform !== "all" ? platform : null;

  try {
    let results: InfluencerResult[] = [];

    // Strategy 1: Try ZAI web_search (works locally)
    try {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();

      const searchQuery = platformFilter
        ? `${query} ${platformFilter} influencer profile followers`
        : `${query} social media influencer profile followers`;

      const searchResults = await zai.functions.invoke("web_search", {
        query: searchQuery,
        num: 15,
      });

      if (Array.isArray(searchResults) && searchResults.length > 0) {
        // Use LLM to extract influencer data from search results
        const searchContext = searchResults
          .map((r: any, i: number) => `[${i + 1}] ${r.name}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
          .join("\n\n");

        const llmMessages: LLMMessage[] = [
          {
            role: "user",
            content: `Extract social media influencers from these search results. Return ONLY a JSON array (no markdown).

For each influencer: name, handle (with @), platform (instagram/youtube/tiktok/x), followers (e.g. "1.2M"), niche, bio (max 100 chars), profileUrl.

${platformFilter ? `Only include ${platformFilter} influencers.` : ""}

Search results:
${searchContext}

JSON array:`,
          },
        ];

        const { content } = await chatWithFallback(llmMessages);
        results = parseInfluencerJSON(content);
      }
    } catch (zaiErr) {
      console.log("[influencers/search] ZAI web_search unavailable, using LLM fallback");
    }

    // Strategy 2: Pure LLM approach (works on Vercel without ZAI SDK)
    if (results.length === 0) {
      const llmMessages: LLMMessage[] = [
        {
          role: "user",
          content: `List 10 real, well-known social media influencers in the "${query}" niche${platformFilter ? ` on ${platformFilter}` : ""}.

Return ONLY a JSON array (no markdown, no explanation). Each object must have:
- name: Full name or display name
- handle: Social media handle (with @)
- platform: Primary platform (instagram, youtube, tiktok, x)
- followers: Follower count as string (e.g. "1.2M", "450K")
- niche: Content category (e.g. "Fashion", "Tech", "Fitness")
- bio: Short description (max 100 chars)
- profileUrl: Profile URL (e.g. https://instagram.com/handle)

Only include REAL influencers that actually exist. Do not invent fake profiles.

JSON array:`,
        },
      ];

      const { content } = await chatWithFallback(llmMessages);
      results = parseInfluencerJSON(content);
    }

    // Filter by platform if specified
    if (platformFilter) {
      results = results.filter(
        (r) => r.platform?.toLowerCase() === platformFilter.toLowerCase()
      );
    }

    // Filter out empty entries
    results = results.filter((r) => r.name && r.handle && r.platform);

    // Deduplicate by handle
    const seen = new Set<string>();
    results = results.filter((r) => {
      const key = r.handle.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      results,
      total: results.length,
      query,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[influencers/search] Error:", msg);
    return NextResponse.json(
      { error: `Search failed: ${msg}`, results: [] },
      { status: 500 }
    );
  }
}

/**
 * Parse LLM response into influencer array.
 * Handles markdown code blocks, extra text, etc.
 */
function parseInfluencerJSON(text: string): InfluencerResult[] {
  let cleaned = text.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "").trim();
  }

  // Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  // Try to extract JSON array from text
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  return [];
}
