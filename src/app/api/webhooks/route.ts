import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { randomBytes } from "node:crypto";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

/**
 * GET /api/webhooks
 *
 * Auth required. Super-admins see ALL webhooks; tenant users see only
 * their own. The `secret` is masked in GET responses (only the first 4
 * + last 4 chars are shown) so a leaked listing doesn't expose the
 * signing key.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const webhooks = await db.webhook.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    webhooks.map((w) => ({
      id: w.id,
      label: w.label,
      url: w.url,
      events: JSON.parse(w.events) as string[],
      // Mask the secret — never echo the full signing key on GET.
      secret: maskSecret(w.secret),
      active: w.active,
      customerId: w.customerId,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  );
}

/**
 * POST /api/webhooks
 *
 * Auth required. Tenant users create webhooks for their own customer;
 * super-admins may pass an explicit `customerId`.
 *
 * Body:
 *   - url:     string (required, must be http(s)://)
 *   - label:   string (optional, defaults to the hostname)
 *   - events:  string[] (required, must be a subset of WEBHOOK_EVENTS)
 *   - active?: boolean (default true)
 *   - customerId?: string (super-admin only — overrides tenant scope)
 *
 * Returns the created webhook with the FULL secret ONCE (so the admin
 * can copy it). Subsequent GET responses mask the secret.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { url, label, events, active, customerId: explicitCustomerId } = body as {
    url?: string;
    label?: string;
    events?: string[];
    active?: boolean;
    customerId?: string;
  };

  // Validate URL.
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "url must be http(s)://" },
      { status: 400 },
    );
  }

  // Validate events.
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json(
      { error: "events must be a non-empty array" },
      { status: 400 },
    );
  }
  const invalid = events.filter((e) => !WEBHOOK_EVENTS.includes(e as never));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `unknown events: ${invalid.join(", ")}`, valid: WEBHOOK_EVENTS },
      { status: 400 },
    );
  }

  // Tenant binding — super-admin may override; everyone else gets their own.
  const webhookCustomerId = scope.isSuperAdmin
    ? (explicitCustomerId ?? null)
    : scope.customerId;

  // Generate the HMAC signing secret (256 bits of entropy, hex-encoded).
  const secret = "whsec_" + randomBytes(32).toString("hex");

  const webhook = await db.webhook.create({
    data: {
      customerId: webhookCustomerId,
      label: (label ?? parsedUrl.hostname).slice(0, 120),
      url,
      events: JSON.stringify(events),
      secret,
      active: active !== false,
    },
  });

  return NextResponse.json({
    id: webhook.id,
    label: webhook.label,
    url: webhook.url,
    events,
    // The full secret is returned ONCE here. GET responses mask it.
    secret,
    active: webhook.active,
    customerId: webhook.customerId,
    createdAt: webhook.createdAt.toISOString(),
  });
}

/** Mask a secret for GET responses — keep the prefix + last 4 chars. */
function maskSecret(secret: string): string {
  if (secret.length <= 12) return "••••";
  return secret.slice(0, 10) + "…" + secret.slice(-4);
}
