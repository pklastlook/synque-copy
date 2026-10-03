import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "https://whatsapp-production-ff54.up.railway.app";

/**
 * POST /api/whatsapp/sync
 *
 * Triggers the WhatsApp mini-service to sync chat history.
 * The service fetches recent chats + messages from WhatsApp and
 * forwards them to /api/whatsapp/webhook (which stores them in the DB).
 *
 * This route acts as a proxy — the browser can't call Railway directly
 * (CORS + mixed content issues), so we proxy through the app's API.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    // Set the webhook target first (in case Railway restarted)
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    const webhookTarget = `${proto}://${host}/api/whatsapp/webhook?ownerId=${user!.userId}`;

    await fetch(`${WHATSAPP_SERVICE_URL}/webhook-target`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: webhookTarget }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {}); // Non-fatal if this fails

    // Trigger the sync
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/sync`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));

    if (data.ok) {
      return NextResponse.json({ ok: true, message: "Sync started" });
    } else {
      return NextResponse.json(
        { ok: false, error: data.error || "Sync failed" },
        { status: 400 }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: `WhatsApp service unreachable: ${msg}` },
      { status: 503 }
    );
  }
}
