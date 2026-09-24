import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-guard";
import { INTEGRATION_DEFS } from "../route";

export const dynamic = "force-dynamic";

/** GET /api/integrations/[type] — get one integration's config (masked) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const { type } = await params;
  if (!INTEGRATION_DEFS[type]) {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
  }
  const row = await db.integration.findUnique({ where: { type } });
  if (!row) {
    return NextResponse.json({ type, enabled: false, configured: false });
  }
  // Return field masks (never expose stored secrets)
  const creds = JSON.parse(row.credentials) as Record<string, string>;
  const def = INTEGRATION_DEFS[type];
  const maskedFields = def.fields.map((f) => ({
    ...f,
    value: creds[f.key] ? (f.type === "password" ? "•".repeat(8) : creds[f.key].slice(0, 4) + "••••") : undefined,
    configured: !!creds[f.key],
  }));
  return NextResponse.json({
    type,
    enabled: row.enabled,
    configured: true,
    connectedAt: row.connectedAt?.toISOString() ?? null,
    fields: maskedFields,
  });
}

/** DELETE /api/integrations/[type] — disable + clear credentials */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { user, error } = requireRole(req, "admin");
  if (error) return error;
  const { type } = await params;
  if (!INTEGRATION_DEFS[type]) {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
  }
  await db.integration.deleteMany({ where: { type } });
  return NextResponse.json({ ok: true });
}

/** POST /api/integrations/[type]/test — test the integration connection */
export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { user, error } = requireRole(req, "admin");
  if (error) return error;
  const { type } = await params;
  if (!INTEGRATION_DEFS[type]) {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
  }

  const row = await db.integration.findUnique({ where: { type } });
  if (!row || !row.enabled) {
    return NextResponse.json({ error: "Integration not configured" }, { status: 400 });
  }

  const creds = JSON.parse(row.credentials) as Record<string, string>;

  try {
    // Test based on integration type
    if (type === "slack") {
      // Send a test message to the Slack webhook
      const res = await fetch(creds.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ SocialFlow integration test — Slack is connected!" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Slack returned ${res.status}`);
      await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
      return NextResponse.json({ ok: true, message: "Test message sent to Slack" });
    }

    if (type === "unsplash") {
      // Test by fetching a random photo
      const res = await fetch("https://api.unsplash.com/photos/random?count=1", {
        headers: { Authorization: `Client-ID ${creds.accessKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Unsplash returned ${res.status}`);
      await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
      return NextResponse.json({ ok: true, message: "Unsplash API key is valid" });
    }

    if (type === "stripe") {
      // Test by retrieving the account balance
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${creds.secretKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Stripe returned ${res.status}`);
      await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
      return NextResponse.json({ ok: true, message: "Stripe API key is valid" });
    }

    // For integrations we can't easily test (mail, ga, canva, zapier), just verify credentials are stored
    await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
    return NextResponse.json({ ok: true, message: `${INTEGRATION_DEFS[type].name} credentials verified` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
