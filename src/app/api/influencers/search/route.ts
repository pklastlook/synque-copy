import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/influencers/search
 *
 * Searches the web for real influencers using the ZAI web_search function,
 * then uses the LLM to extract structured influencer data from the results.
 *
 * Body: { query: string, platform?: "instagram" | "youtube" | "tiktok" | "all" }
 *
 * Returns: [{ name, handle, platform, followers, niche, bio, profileUrl }]
 */

interface SearchResultItem {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  date: string;
}

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
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { query, platform } = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Search query required" }, { status: 400 });
  }

  try {
    // Step 1: Web search for influencers
    const searchQuery = platform && platform !== "all"
      ? `${query} ${platform} influencer profile followers`
      : `${query} social media influencer profile followers`;

    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const searchResults = await zai.functions.invoke("web_search", {
      query: searchQuery,
      num: 15,
    }) as SearchResultItem[];

    if (!searchResults || searchResults.length === 0) {
      return NextResponse.json({ results: [], message: "No results found" });
    }

    // Step 2: Use LLM to extract structured influencer data
    const searchContext = searchResults
      .map((r, i) => `[${i + 1}] ${r.name}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
      .join("\n\n");

    const llmPrompt = `You are an influencer data extractor. Based on these web search results, extract any social media influencers mentioned. Return ONLY a JSON array (no markdown, no explanation).

For each influencer found, include:
- name: Full name or display name
- handle: Social media handle (with @, e.g. "@johndoe")
- platform: Primary platform (instagram, youtube, tiktok, x, facebook, linkedin)
- followers: Follower count as a string (e.g. "1.2M", "450K", "89K")
- niche: Content niche/category (e.g. "Fashion", "Tech", "Food", "Fitness")
- bio: Short bio/description (max 100 chars)
- profileUrl: Profile URL if available, otherwise the source URL

Only include REAL influencers mentioned in the search results. Do not invent data.
If no influencers are found, return an empty array [].

Search results:
${searchContext}

Return JSON array only:`;

    const llmResponse = await zai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: llmPrompt,
        },
      ],
      thinking: { type: "disabled" },
    });

    const llmText = llmResponse.choices?.[0]?.message?.content || "[]";

    // Parse LLM response — handle markdown code blocks
    let cleaned = llmText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```$/, "").trim();
    }

    let influencers: InfluencerResult[] = [];
    try {
      influencers = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, try to extract array from the text
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          influencers = JSON.parse(match[0]);
        } catch {
          influencers = [];
        }
      }
    }

    // Filter out empty entries
    influencers = influencers.filter(
      (i) => i.name && i.handle && i.platform
    );

    // Deduplicate by handle
    const seen = new Set<string>();
    influencers = influencers.filter((i) => {
      const key = i.handle.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      results: influencers,
      total: searchResults.length,
      query: searchQuery,
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
