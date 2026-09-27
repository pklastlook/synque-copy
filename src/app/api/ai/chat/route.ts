import { NextRequest, NextResponse } from "next/server";
import { chatWithFallback, type LLMMessage } from "@/lib/llm";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/chat — ChatGPT-style conversational assistant for the Composer.
 *
 * Body:
 *   messages: [{ role: "user" | "assistant", content: string }, ...]
 *   tone?: string           — current tone the user picked
 *   platforms?: string[]    — which platforms they're targeting
 *   currentCaption?: string — what's already in the textbox (so AI has context)
 *
 * Returns: { reply: string, suggestions?: string[] }
 *   - reply: the assistant's conversational reply
 *   - suggestions: 0-3 concrete caption drafts the user can click to apply
 *
 * The AI is instructed to:
 *   - Be conversational and helpful (ask clarifying questions when brief is vague)
 *   - When the user asks for a caption, provide 1-3 concrete drafts as `suggestions`
 *   - Respect the chosen tone + platform conventions
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    messages = [],
    tone = "Confident",
    platforms = [],
    currentCaption = "",
  } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    tone?: string;
    platforms?: string[];
    currentCaption?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 });
  }

  const platformList = platforms.length > 0 ? platforms.join(", ") : "any platform";

  const system = `You are an expert social media copywriter assistant inside a composer app.
You help the user craft the perfect caption through conversation.

Context:
- Target tone: ${tone}
- Target platforms: ${platformList}
- Current caption in the textbox: ${currentCaption ? '"' + currentCaption.slice(0, 500) + '"' : "(empty — user hasn't written anything yet)"}

Your job:
1. Be conversational, warm, and concise (1-4 sentences per reply, never long essays).
2. When the user's brief is vague, ask ONE clarifying question (audience? goal? emotion? CTA?).
3. When the user asks you to write, draft, suggest, or refine a caption, you MUST follow this EXACT format in your reply:

First, a brief conversational note (1-2 sentences max), then on a new line:

SUGGESTIONS:
1. <first draft caption — complete, ready to post>
2. <second draft caption — distinct angle, ready to post>
3. <third draft caption — distinct angle, ready to post>

CRITICAL RULES for the SUGGESTIONS block:
- The word "SUGGESTIONS:" must appear EXACTLY as written (uppercase, with colon).
- Each suggestion must be a COMPLETE caption (not a description), under 280 chars.
- Each suggestion must be on its own line, numbered "1. ", "2. ", "3. ".
- Provide 1-3 suggestions (3 by default, fewer if user asked for "one").
- Match the target tone: ${tone}
- Tailor to ${platformList} conventions.
- Never repeat the current caption verbatim — always improve or vary it.

If the user is just chatting or asking a question (NOT requesting a caption), skip the SUGGESTIONS block entirely and reply conversationally.`;

  // Build the messages array for the LLM: system first, then the conversation history.
  const llmMessages: LLMMessage[] = [
    { role: "system", content: system },
    ...messages.map((m) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    })),
  ];

  let raw = "";
  try {
    const result = await chatWithFallback(llmMessages);
    raw = result.content;
  } catch (err) {
    console.error(
      "[ai/chat] All LLM providers failed:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(
      {
        reply:
          "I couldn't reach the AI service. Please try again — your conversation is preserved.",
      },
      { status: 200 }
    );
  }

  // Parse out the SUGGESTIONS block (if present) so the client can render
  // clickable "apply" buttons for each draft.
  let reply = raw;
  const suggestions: string[] = [];

  const suggestionsMatch = raw.match(/\n*SUGGESTIONS:\s*\n([\s\S]+)$/i);
  if (suggestionsMatch) {
    // Strip the SUGGESTIONS block from the reply text
    reply = raw.slice(0, suggestionsMatch.index).trim();
    const block = suggestionsMatch[1];
    // Each suggestion starts with "1. ", "2. ", "3. " (or just "1.", "2.", "3.")
    const lines = block.split(/\n/);
    let current: string[] = [];
    for (const line of lines) {
      const m = line.match(/^\s*(\d+)[.)]\s*(.*)$/);
      if (m) {
        if (current.length > 0) {
          suggestions.push(current.join(" ").trim());
        }
        current = [m[2]];
      } else if (line.trim() && current.length > 0) {
        // Continuation of the current suggestion (multi-line caption)
        current.push(line.trim());
      }
    }
    if (current.length > 0) {
      suggestions.push(current.join(" ").trim());
    }
  } else {
    // Fallback: if the AI didn't use the SUGGESTIONS: marker but the reply
    // contains a numbered list (1. ... 2. ... 3. ...), parse those as suggestions.
    // This handles cases where the AI puts drafts directly in the reply text.
    const numberedLines = raw.split(/\n/);
    const draftLines: { idx: number; text: string }[] = [];
    numberedLines.forEach((line) => {
      const m = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
      if (m && parseInt(m[1], 10) <= 10) {
        draftLines.push({ idx: parseInt(m[1], 10), text: m[2].trim() });
      }
    });
    // Only treat as suggestions if we found 2+ consecutive numbered drafts
    // (otherwise it's probably just a regular list in the conversation).
    if (draftLines.length >= 2) {
      // Find the start of the numbered list in the raw text
      const firstIdx = raw.indexOf(`\n${draftLines[0].idx}.`);
      if (firstIdx > 0) {
        reply = raw.slice(0, firstIdx).trim();
        for (const d of draftLines) {
          if (d.text.length > 10 && d.text.length < 500) {
            suggestions.push(d.text);
          }
        }
      }
    }
  }

  // Filter out empty / placeholder suggestions
  const filtered = suggestions.filter((s) => s.length > 0 && s.length < 2000);
  suggestions.length = 0;
  suggestions.push(...filtered);

  return NextResponse.json({ reply, suggestions });
}
