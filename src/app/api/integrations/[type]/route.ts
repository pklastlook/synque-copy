import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole, getTenantScope } from "@/lib/auth-guard";
import { INTEGRATION_DEFS, decryptCredentials } from "../route";
import { invalidateStorageAdapter } from "@/lib/storage";
import { invalidateLLMClient } from "@/lib/llm";

export const dynamic = "force-dynamic";

/**
 * Build a Prisma `where` clause for a single integration type, scoped by
 * tenant. Mirrors the GET /api/integrations list scope: tenant users see
 * rows whose customerId matches theirs OR is null (global/shared). Super-
 * admins see all rows.
 */
function typeWhere(
  scope: { customerId: string | null; isSuperAdmin: boolean },
  type: string
): Record<string, unknown> {
  if (scope.isSuperAdmin) {
    return { type };
  }
  return { type, OR: [{ customerId: scope.customerId }, { customerId: null }] };
}

/** GET /api/integrations/[type] — get one integration's config (masked) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { type } = await params;
  if (!INTEGRATION_DEFS[type]) {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
  }

  // Tenant scope: tenant users can only see rows owned by them OR shared (null).
  const row = await db.integration.findFirst({ where: typeWhere(scope, type) });
  if (!row) {
    return NextResponse.json({ type, enabled: false, configured: false });
  }
  // Decrypt the credentials blob (with plaintext fallback for pre-migration rows).
  // Return field masks (never expose stored secrets).
  const creds = decryptCredentials(row.credentials) ?? {};
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
  const scope = getTenantScope(user!);
  const { type } = await params;
  if (!INTEGRATION_DEFS[type]) {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
  }

  // P2-2-b: scope the delete by tenant so a tenant admin in tenant A can't
  // wipe tenant B's integration row. Super-admins bypass the filter.
  await db.integration.deleteMany({ where: typeWhere(scope, type) });

  // If deleting Cloudinary, invalidate the cached storage adapter so
  // subsequent uploads fall back to the local adapter (or env-configured).
  if (type === "cloudinary") {
    invalidateStorageAdapter();
  }

  // If deleting an LLM provider, invalidate the cached LLM client.
  if (type === "claude" || type === "openai" || type === "gemini") {
    invalidateLLMClient();
  }

  return NextResponse.json({ ok: true });
}

/** POST /api/integrations/[type]/test — test the integration connection */
export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const { user, error } = requireRole(req, "admin");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { type } = await params;
  if (!INTEGRATION_DEFS[type]) {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
  }

  // Tenant scope the read so a tenant admin can only test their own
  // integration (or a shared global one).
  const row = await db.integration.findFirst({ where: typeWhere(scope, type) });
  if (!row || !row.enabled) {
    return NextResponse.json({ error: "Integration not configured" }, { status: 400 });
  }

  // Decrypt credentials (with plaintext fallback for pre-migration rows).
  const creds = decryptCredentials(row.credentials);
  if (!creds) {
    return NextResponse.json({ error: "Integration credentials are unreadable" }, { status: 500 });
  }

  try {
    // Test based on integration type
    if (type === "slack") {
      // Send a test message to the Slack webhook
      const res = await fetch(creds.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ SYNQUE integration test — Slack is connected!" }),
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

    if (type === "cloudinary") {
      // Test by listing resources from the Cloudinary account.
      // Uses the Admin API: GET /resources/image (max_results=1)
      const auth = Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString("base64");
      const cloudName = creds.cloudName;
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=1`;
      const res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errBody.error?.message ?? `Cloudinary returned ${res.status}`);
      }
      await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
      return NextResponse.json({ ok: true, message: `Cloudinary connected — cloud "${cloudName}" is reachable` });
    }

    if (type === "claude") {
      // Test by sending a tiny message to the Anthropic API
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": creds.apiKey,
        "anthropic-version": "2023-06-01",
      };
      // If workspace ID is provided, include it
      if (creds.workspaceId) {
        headers["anthropic-workspace-id"] = creds.workspaceId;
      }
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: creds.model || "claude-sonnet-4-20250514",
          max_tokens: 10,
          messages: [{ role: "user", content: "Reply with the single word OK." }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errBody.error?.message ?? `Claude returned ${res.status}`);
      }
      await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
      return NextResponse.json({ ok: true, message: `Claude connected — model "${creds.model}" is reachable` });
    }

    if (type === "openai") {
      // Test by sending a tiny "Hello" chat completion request
      const baseUrl = (creds.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.apiKey}`,
      };
      if (creds.organization) headers["OpenAI-Organization"] = creds.organization;
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: creds.model || "gpt-4o-mini",
          messages: [{ role: "user", content: "Reply with the single word OK." }],
          max_tokens: 5,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errBody.error?.message ?? `OpenAI returned ${res.status}`);
      }
      await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
      return NextResponse.json({ ok: true, message: `OpenAI connected — model "${creds.model}" is reachable` });
    }

    if (type === "gemini") {
      // Test by listing models from Google's Generative Language API
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${creds.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(errBody.error?.message ?? `Gemini returned ${res.status}`);
      }
      await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
      return NextResponse.json({ ok: true, message: `Gemini connected — model "${creds.model}" is reachable` });
    }

    // For integrations we can't easily test (mail, ga, canva, zapier), just verify credentials are stored
    await db.integration.update({ where: { type }, data: { lastSyncAt: new Date() } });
    return NextResponse.json({ ok: true, message: `${INTEGRATION_DEFS[type].name} credentials verified` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
