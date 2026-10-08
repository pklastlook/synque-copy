import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

/**
 * GET /api/webhooks/[id]
 *
 * Auth required. Tenant-scoped (caller can only fetch webhooks in
 * their own tenant; super-admin sees all).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  const webhook = await db.webhook.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
  });
  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: webhook.id,
    label: webhook.label,
    url: webhook.url,
    events: JSON.parse(webhook.events) as string[],
    // Masked — POST is the only path that returns the full secret.
    secret: maskSecret(webhook.secret),
    active: webhook.active,
    customerId: webhook.customerId,
    createdAt: webhook.createdAt.toISOString(),
    updatedAt: webhook.updatedAt.toISOString(),
  });
}

/**
 * PATCH /api/webhooks/[id]
 *
 * Auth required, tenant-scoped. Updates the webhook's label, url,
 * events, and/or active flag. Cannot rotate the secret via PATCH —
 * use POST /api/webhooks/[id]/rotate (separate route, future).
 *
 * Body (all optional):
 *   - label?:  string
 *   - url?:    string
 *   - events?: string[]
 *   - active?: boolean
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  const existing = await db.webhook.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.label === "string" && body.label.trim()) {
    data.label = body.label.trim().slice(0, 120);
  }
  if (typeof body.url === "string" && body.url.trim()) {
    try {
      const u = new URL(body.url);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return NextResponse.json({ error: "url must be http(s)://" }, { status: 400 });
      }
      data.url = body.url;
    } catch {
      return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
    }
  }
  if (Array.isArray(body.events)) {
    const invalid = body.events.filter((e: unknown) => !WEBHOOK_EVENTS.includes(e as never));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `unknown events: ${invalid.join(", ")}`, valid: WEBHOOK_EVENTS },
        { status: 400 },
      );
    }
    data.events = JSON.stringify(body.events);
  }
  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  await db.webhook.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/webhooks/[id]
 *
 * Auth required, tenant-scoped. Hard-delete.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  const existing = await db.webhook.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  await db.webhook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function maskSecret(secret: string): string {
  if (secret.length <= 12) return "••••";
  return secret.slice(0, 10) + "…" + secret.slice(-4);
}
