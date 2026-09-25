import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatWithFallback, type LLMMessage } from "@/lib/llm";
import { PLATFORMS } from "@/lib/platforms";

export const dynamic = "force-dynamic";

interface Target {
  accountId: string;
  platform: keyof typeof PLATFORMS;
  handle: string;
}

function fallback(caption: string, targets: Target[]) {
  const variants: Record<string, { content: string; hashtags: string }> = {};
  for (const t of targets) {
    variants[t.accountId] = { content: caption, hashtags: "" };
  }
  return { variants };
}

export async function POST(req: NextRequest) {
  const { caption, tone, targets, mediaHint, userId } = await req.json();

  if (!caption || !targets?.length) {
    return NextResponse.json({ error: "caption and targets required" }, { status: 400 });
  }

  const targetSpec = targets.map((t: Target, i: number) => {
    const p = PLATFORMS[t.platform];
    return `${i + 1}. accountId=${t.accountId} | Platform: ${p.name} | Handle: ${t.handle}`;
  }).join("\n");

  const system = `You are an expert social media copywriter. Write distinct captions for each destination. Respond with ONLY a JSON object: {"variants":[{"index":1,"content":"...","hashtags":"comma,separated"}]}`;

  const user = `Core message: ${caption}\nTone: ${tone}\nDestinations:\n${targetSpec}`;

  let raw = "";
  try {
    const llmMessages: LLMMessage[] = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
    const result = await chatWithFallback(llmMessages);
    raw = result.content;
  } catch (err) {
    return NextResponse.json({ error: "AI request failed", fallback: fallback(caption, targets) });
  }

  let parsed: unknown = null;
  try {
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    parsed = null;
  }

  const variantsByAccount: Record<string, { content: string; hashtags?: string }> = {};

  if (parsed && typeof parsed === "object") {
    const v = (parsed as { variants?: unknown }).variants;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        const target = targets[i];
        if (!target || typeof item !== "object" || item === null) return;
        const it = item as { content?: string; hashtags?: string };
        variantsByAccount[target.accountId] = {
          content: (it.content ?? "").trim(),
          hashtags: it.hashtags ?? "",
        };
      });
    }
  }

  if (Object.keys(variantsByAccount).length === 0) {
    return NextResponse.json({ error: "AI returned malformed output", fallback: fallback(caption, targets) });
  }

  for (const t of targets) {
    if (!variantsByAccount[t.accountId]) {
      const fb = fallback(caption, [t]).variants[t.accountId];
      if (fb) variantsByAccount[t.accountId] = fb;
    }
  }

  if (userId) {
    try {
      await db.activity.create({
        data: {
          userId,
          type: "ai_generated",
          description: `generated ${targets.length} captions`,
        },
      });
    } catch {}
  }

  return NextResponse.json({ variants: variantsByAccount });
}
