import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { checkAndIncrementAiUsage } from "@/lib/ai-usage";
import { chatWithFallback, type LLMMessage } from "@/lib/llm";
import { PLATFORMS } from "@/lib/platforms";

export const dynamic = "force-dynamic";

interface Target {
  accountId: string;
  platform: keyof typeof PLATFORMS;
  handle: string;
}

export async function POST(req: NextRequest) {
  // P2-CORE — require auth so we can attribute the AI usage to a real user
  // and enforce their plan's monthly quota.
  const { user, error } = await requireAuth(req);
  if (error) return error;

  // Quota check — also resets the 30-day window if stale + increments the
  // counter for this call. Returns 429 if the user is over their plan's cap.
  const quota = await checkAndIncrementAiUsage(user!);
  if (!quota.ok) {
    return NextResponse.json(
      { error: quota.message, usage: quota.snapshot },
      { status: quota.status ?? 429 }
    );
  }

  const { caption, tone, targets, mediaHint } = (await req.json()) as {
    caption: string;
    tone: string;
    targets: Target[];
    mediaHint?: string;
    userId?: string;
  };

  if (!caption || !targets?.length) {
    return NextResponse.json({ error: "caption and targets required" }, { status: 400 });
  }

  const targetSpec = targets
    .map((t, i) => {
      const p = PLATFORMS[t.platform];
      return `${i + 1}. accountId=${t.accountId} | Platform: ${p.name} | Handle: ${t.handle} | Char limit: ${p.charLimit}`;
    })
    .join("\n");

  const system = `You are an expert social media copywriter for a brand's dissemination team. You write platform-native captions that match each platform's tone, format conventions, and length limits. You adapt ONE core message into distinct, platform-optimized variants — never just copy-paste. You use relevant hashtags sparingly and appropriately per platform.`;

  const userMsg = `Core message / brief:
"""
${caption}
"""

Tone: ${tone}
${mediaHint ? `Media context: ${mediaHint}` : ""}

Write distinct captions for each of these destination accounts. Respect each platform's conventions:
- Instagram: visual-first, hook in first line, 5-10 relevant hashtags at the end, emoji friendly, max ~2200 chars.
- Facebook: conversational, story-driven, 1-2 hashtags max, clear CTA.
- X: punchy, under 280 chars, no hashtags or 1 max, strong hook.
- LinkedIn: professional, value-led, slightly longer, no emoji overload, 1-3 professional hashtags.
- TikTok: trendy, casual, hook-heavy, short, 2-4 trending hashtags.
- YouTube: descriptive, keyword-rich title feel, can be longer, 2-3 hashtags.
- Threads: conversational and casual like a close friends update, short, minimal hashtags.

Destinations (in this exact order — keep the order):
${targetSpec}

Respond with ONLY a JSON object (no markdown fences, no prose) of this exact shape:
{
  "variants": [
    { "index": 1, "content": "...", "hashtags": "comma,separated,without,#" },
    { "index": 2, "content": "...", "hashtags": "..." }
  ]
}
The "index" MUST match the destination number above, in order. Include exactly one entry per destination. Make each variant genuinely distinct in wording, not just reformatted.`;

  let raw = "";
  try {
    const llmMessages: LLMMessage[] = [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ];
    const result = await chatWithFallback(llmMessages);
    raw = result.content;
  } catch (err) {
    console.error("[ai/generate] All LLM providers failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "AI request failed", fallback: fallback(caption, targets), usage: quota.snapshot },
      { status: 200 }
    );
  }

  // parse JSON robustly — accept either an array (preferred) or an object keyed by accountId/platform
  let parsed: unknown = null;
  try {
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    parsed = null;
  }

  // Normalize into a Record<accountId, {content, hashtags}>
  const variantsByAccount: Record<string, { content: string; hashtags?: string }> = {};

  if (parsed && typeof parsed === "object") {
    const v = (parsed as { variants?: unknown }).variants;
    if (Array.isArray(v)) {
      // array form: map by index → targets[index]
      v.forEach((item, i) => {
        const target = targets[i];
        if (!target || typeof item !== "object" || item === null) return;
        const it = item as { content?: string; hashtags?: string };
        variantsByAccount[target.accountId] = {
          content: (it.content ?? "").trim(),
          hashtags: it.hashtags ?? "",
        };
      });
    } else if (v && typeof v === "object") {
      // object form: try accountId keys, else match by platform name
      const obj = v as Record<string, { content?: string; hashtags?: string }>;
      for (const t of targets) {
        const p = PLATFORMS[t.platform];
        const hit = obj[t.accountId] ?? obj[p.name] ?? obj[p.name.toLowerCase()] ?? obj[t.handle] ?? obj[String(targets.indexOf(t) + 1)];
        if (hit) {
          variantsByAccount[t.accountId] = { content: (hit.content ?? "").trim(), hashtags: hit.hashtags ?? "" };
        }
      }
    }
  }

  const filled = Object.keys(variantsByAccount).length;
  if (filled === 0) {
    return NextResponse.json(
      { error: "AI returned malformed output", fallback: fallback(caption, targets), usage: quota.snapshot },
      { status: 200 }
    );
  }
  // ensure every target has an entry (fill missing with fallback)
  for (const t of targets) {
    if (!variantsByAccount[t.accountId]) {
      const fb = fallback(caption, [t]).variants[t.accountId];
      if (fb) variantsByAccount[t.accountId] = fb;
    }
  }

  // log activity (only if we have a real userId from the session — never
  // hardcode one. Activity logging is non-critical so failures are swallowed.)
  if (user!.userId) {
    try {
      await db.activity.create({
        data: {
          userId: user!.userId,
          type: "ai_generated",
          description: `generated ${targets.length} platform-specific captions for “${caption.slice(0, 40)}…”`,
        },
      });
    } catch {
      /* ignore — activity log is non-critical */
    }
  }

  // Echo the post-quota snapshot so the client can update its usage indicator
  // without a separate /api/ai/usage round-trip.
  return NextResponse.json({ variants: variantsByAccount, usage: quota.snapshot });
}

function fallback(caption: string, targets: Target[]) {
  const variants: Record<string, { content: string; hashtags: string }> = {};
  for (const t of targets) {
    const p = PLATFORMS[t.platform];
    const tags =
      t.platform === "instagram" || t.platform === "tiktok"
        ? "prism, creators, design"
        : t.platform === "linkedin"
        ? "design, branding"
        : "";
    const prefix =
      t.platform === "x"
        ? caption.slice(0, 260)
        : t.platform === "linkedin"
        ? `Here's what we're shipping: ${caption} What would you build with it?`
        : t.platform === "tiktok"
        ? `${caption} ✨`
        : caption;
    variants[t.accountId] = {
      content: prefix,
      hashtags: tags,
    };
    void p;
  }
  return { variants };
}
