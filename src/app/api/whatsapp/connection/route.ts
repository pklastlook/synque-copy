import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * The WhatsApp mini-service URL.
 *
 * Priority:
 *   1. WHATSAPP_SERVICE_URL env var (set in .env or Vercel env vars)
 *   2. Default to http://127.0.0.1:3002 (local dev)
 *
 * On Vercel/production, deploy the WhatsApp mini-service separately
 * (Railway, Render, Fly.io, or a VPS) and set WHATSAPP_SERVICE_URL to
 * its public URL. The Baileys library requires a persistent process
 * (WebSocket to WhatsApp servers), so it can't run in serverless.
 */
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "http://127.0.0.1:3002";

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
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const ownerId = user!.userId;

  // Upsert a connection row for this owner
  const conn = await db.whatsAppConnection.upsert({
    where: { ownerId },
    update: {},
    create: { ownerId },
  });

  try {
    // Ask the mini-service for this owner's status (per-user session)
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/status?ownerId=${ownerId}`, {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();

    // Always sync status back to DB
    const newStatus = data.connected ? "connected" : "disconnected";
    if (conn.status !== newStatus || (data.connected && conn.phone !== data.phone)) {
      await db.whatsAppConnection.update({
        where: { ownerId },
        data: {
          status: newStatus,
          phone: data.phone ?? null,
          ...(data.connected
            ? { lastConnectedAt: new Date() }
            : { lastDisconnectedAt: new Date() }),
        },
      });
    }

    return NextResponse.json({
      connected: data.connected ?? false,
      qr: data.qr ?? null,
      phone: data.phone ?? null,
      dbStatus: newStatus,
    });
  } catch {
    // Mini-service not running — force disconnect in DB
    if (conn.status === "connected") {
      await db.whatsAppConnection.update({
        where: { ownerId },
        data: { status: "disconnected", lastDisconnectedAt: new Date(), phone: null },
      });
    }
    return NextResponse.json({
      connected: false,
      qr: null,
      phone: null,
      serviceOffline: true,
      dbStatus: "disconnected",
    });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const ownerId = user!.userId;

  const { action } = (await req.json()) as { action: "start" | "logout" };

  if (action === "logout") {
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/logout?ownerId=${ownerId}`, { method: "POST", signal: AbortSignal.timeout(3000) });
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
      await fetch(`${WHATSAPP_SERVICE_URL}/webhook-target?ownerId=${ownerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: webhookTarget }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      return NextResponse.json({
        error: "WhatsApp service is not running. Ask the admin to start it.",
      }, { status: 503 });
    }

    // Force a restart so a fresh QR is generated for this owner's session
    try {
      await fetch(`${WHATSAPP_SERVICE_URL}/restart?ownerId=${ownerId}`, {
        method: "POST",
        signal: AbortSignal.timeout(3000),
      });
    } catch {}

    await db.whatsAppConnection.upsert({
      where: { ownerId },
      update: { status: "connecting" },
      create: { ownerId, status: "connecting" },
    });

    return NextResponse.json({ ok: true, started: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
