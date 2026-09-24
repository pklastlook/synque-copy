import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

const WHATSAPP_SERVICE_URL = "http://localhost:3002";

/**
 * POST /api/whatsapp/send
 *
 * Sends a text message from the connected WhatsApp account to a phone
 * number or group. Proxies to the WhatsApp mini-service.
 *
 * Body: { to, text }
 *   to: phone number (e.g. "+1234567890") or group JID (e.g. "xxx@g.us")
 *   text: the message text to send
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { to, text } = (await req.json()) as { to?: string; text?: string };

  if (!to?.trim() || !text?.trim()) {
    return NextResponse.json({ error: "to and text are required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: to.trim(), text: text.trim() }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "WhatsApp service error" },
        { status: res.status }
      );
    }

    return NextResponse.json({
      ok: true,
      messageId: data.messageId,
      to: data.to,
    });
  } catch {
    return NextResponse.json(
      { error: "WhatsApp service is not running. Ask the admin to start it." },
      { status: 503 }
    );
  }
}
