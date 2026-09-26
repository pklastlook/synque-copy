import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { getLLMStatus } from "@/lib/llm";

export const dynamic = "force-dynamic";

/** GET /api/llm/status — active LLM provider + connection status.
 *  Used by the Settings → Integrations UI to show whether the AI Content
 *  Writer is properly configured (OpenAI / Gemini via DB, or ZAI via env). */
export async function GET(req: NextRequest) {
  const { error } = requireAuth(req);
  if (error) return error;

  return NextResponse.json(await getLLMStatus());
}
