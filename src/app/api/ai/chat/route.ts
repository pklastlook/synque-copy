import { NextRequest, NextResponse } from "next/server";
import { chatWithFallback, type LLMMessage } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages = [], tone = "Confident", platforms = [], currentCaption = "" } = body;

  const system = `You are an expert social media copywriter assistant. Tone: ${tone}. Platforms: ${platforms.join(", ")}. Current caption: ${currentCaption || "(empty)"}. When asked to write captions, provide 1-3 drafts in SUGGESTIONS: format. Be conversational.`;

  const llmMessages: LLMMessage[] = [
    { role: "system", content: system },
    ...messages.map((m: any) => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content })),
  ];

  try {
    const result = await chatWithFallback(llmMessages);
    let reply = result.content;
    const suggestions: string[] = [];

    const match = reply.match(/\n*SUGGESTIONS:\s*\n([\s\S]+)$/i);
    if (match) {
      reply = reply.slice(0, match.index).trim();
      const lines = match[1].split(/\n/);
      let current: string[] = [];
      for (const line of lines) {
        const m = line.match(/^\s*(\d+)[.)]\s*(.*)$/);
        if (m) {
          if (current.length > 0) suggestions.push(current.join(" ").trim());
          current = [m[2]];
        } else if (line.trim() && current.length > 0) {
          current.push(line.trim());
        }
      }
      if (current.length > 0) suggestions.push(current.join(" ").trim());
    }

    return NextResponse.json({ reply, suggestions: suggestions.filter(s => s.length > 0 && s.length < 2000) });
  } catch (err) {
    return NextResponse.json({ reply: "I couldn't reach the AI service. Please try again." });
  }
}
