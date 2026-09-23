import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const WHATSAPP_SERVICE_URL = "http://localhost:3002";

/**
 * GET /api/whatsapp/connection
 *   Returns the current WhatsApp connection status + QR code (if any).
 *   The frontend polls this every 2 seconds to show the QR + detect when the
 *   user has scanned it.
 *
 * POST /api/whatsapp/connection
 *   Body: { action: "start" | "logout" }
 *   - start: ensures the mini-service is running + webhook target is set
 *   - logout: disconnects the WhatsApp session
 */
export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "ownerId required" }, { status: 400 });
  }

  // Upsert a connection row for this owner
  const conn = await db.whatsAppConnection.upsert({
    where: { ownerId },
    update: {},
    create: { ownerId },
  });

  try {
    // Ask the mini-service for the current status
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/status`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();

    // Sync status back to DB (so other views can show "connected")
    if (data.connected && conn.status !== "connected") {
      await db.whatsAppConnection.update({
        where: { ownerId },
        data: {
          status: "connected",
          phone: data.phone ?? null,
          lastConnectedAt: new Date(),
        },
      });
    } else if (!data.connected && conn.status === "connected") {
      await db.whatsAppConnection.update({
        where: { ownerId },
        data: {
          status: "disconnected",
          lastDisconnectedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      connected: data.connected ?? false,
      qr: data.qr ?? null,
      phone: data.phone ?? null,
      dbStatus: data.connected ? "connected" : "disconnected",
    });
  } catch {
    // Mini-service not running
    return NextResponse.json({
      connected: false,
      qr: null,
      phone: null,
      serviceOffline: true,
      dbStatus: conn.status,
    });
  }
}

export async function POST(req: NextRequest) {
  const { action, ownerId } = (await req.json()) as { action: "start" | "logout"; ownerId?: string };

  if (!ownerId) {
    return NextResponse.json({ error: "ownerId required" }, { status: 400 });
  }

  if (action === "logout") {
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/logout`, { method: "POST", signal: AbortSignal.timeout(3000) });
    } catch {}
    await db.whatsAppConnection.update({
      where: { ownerId },
      data: { status: "disconnected", lastDisconnectedAt: new Date() },
    });
    return NextResponse.json({ ok: true, disconnected: true });
  }

  if (action === "start") {
    // Set the webhook target so incoming messages flow into our app
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
    const webhookTarget = `${proto}://${host}/api/whatsapp/webhook?ownerId=${ownerId}`;

    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/webhook-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: webhookTarget }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      return NextResponse.json({
        error: "WhatsApp service is not running. Ask the admin to start it (bun run dev in mini-services/whatsapp-service).",
      }, { status: 503 });
    }

    await db.whatsAppConnection.upsert({
      where: { ownerId },
      update: { status: "connecting" },
      create: { ownerId, status: "connecting" },
    });

    return NextResponse.json({ ok: true, started: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
