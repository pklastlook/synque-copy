import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * Integration definitions — what each integration needs.
 * The `fields` array describes the form inputs the admin must fill in.
 * `testFn` is optional and describes how to verify the credentials.
 */
export const INTEGRATION_DEFS: Record<string, {
  name: string;
  desc: string;
  icon: string; // lucide icon name
  fields: { key: string; label: string; type: "text" | "password" | "url"; placeholder: string; required: boolean }[];
}> = {
  mail: {
    name: "Mail Server",
    desc: "SMTP server for sending digests & alerts from your own domain.",
    icon: "Mail",
    fields: [
      { key: "host", label: "SMTP Host", type: "text", placeholder: "smtp.hostinger.com", required: true },
      { key: "port", label: "Port", type: "text", placeholder: "465", required: true },
      { key: "user", label: "Username", type: "text", placeholder: "noreply@yourcompany.com", required: true },
      { key: "pass", label: "Password", type: "password", placeholder: "••••••••", required: true },
      { key: "from", label: "From Email", type: "text", placeholder: "SocialFlow <noreply@yourcompany.com>", required: false },
    ],
  },
  slack: {
    name: "Slack",
    desc: "Pipe alerts and notifications into your Slack channels.",
    icon: "MessageSquare",
    fields: [
      { key: "webhookUrl", label: "Incoming Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/T.../B.../...", required: true },
      { key: "channel", label: "Default Channel", type: "text", placeholder: "#social-alerts", required: false },
    ],
  },
  stripe: {
    name: "Stripe",
    desc: "Accept card payments for subscriptions & invoices.",
    icon: "CreditCard",
    fields: [
      { key: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_live_...", required: true },
      { key: "publishableKey", label: "Publishable Key", type: "text", placeholder: "pk_live_...", required: true },
      { key: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "whsec_...", required: false },
    ],
  },
  ga: {
    name: "Google Analytics",
    desc: "Pull GA4 traffic data into your analytics reports.",
    icon: "BarChart3",
    fields: [
      { key: "measurementId", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXXXXX", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", placeholder: "••••••••", required: true },
      { key: "propertyId", label: "Property ID", type: "text", placeholder: "123456789", required: false },
    ],
  },
  canva: {
    name: "Canva",
    desc: "Import Canva designs straight into your media library.",
    icon: "ImageIcon",
    fields: [
      { key: "clientId", label: "Client ID", type: "text", placeholder: "canva-client-id", required: true },
      { key: "clientSecret", label: "Client Secret", type: "password", placeholder: "••••••••", required: true },
      { key: "redirectUri", label: "Redirect URI", type: "url", placeholder: "https://yourdomain.com/api/oauth/callback/canva", required: false },
    ],
  },
  unsplash: {
    name: "Unsplash",
    desc: "Free stock photography for your next post.",
    icon: "ImageIcon",
    fields: [
      { key: "accessKey", label: "Access Key", type: "password", placeholder: "unsplash-access-key", required: true },
      { key: "secretKey", label: "Secret Key", type: "password", placeholder: "••••••••", required: false },
    ],
  },
  zapier: {
    name: "Zapier",
    desc: "Trigger SocialFlow actions from 6,000+ apps.",
    icon: "Zap",
    fields: [
      { key: "webhookUrl", label: "Zapier Webhook URL", type: "url", placeholder: "https://hooks.zapier.com/hooks/catch/.../...", required: true },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "••••••••", required: false },
    ],
  },
};

/** GET /api/integrations — list all integrations with their current config status */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const rows = await db.integration.findMany();
  const byType: Record<string, { enabled: boolean; connectedAt: string | null; lastSyncAt: string | null }> = {};
  for (const r of rows) {
    byType[r.type] = {
      enabled: r.enabled,
      connectedAt: r.connectedAt?.toISOString() ?? null,
      lastSyncAt: r.lastSyncAt?.toISOString() ?? null,
    };
  }

  // Merge definitions with DB state
  const result = Object.entries(INTEGRATION_DEFS).map(([type, def]) => ({
    type,
    name: def.name,
    desc: def.desc,
    icon: def.icon,
    fields: def.fields.map((f) => ({ ...f, value: undefined })), // never return stored values
    enabled: byType[type]?.enabled ?? false,
    connectedAt: byType[type]?.connectedAt ?? null,
    lastSyncAt: byType[type]?.lastSyncAt ?? null,
  }));

  return NextResponse.json({ integrations: result });
}

/** POST /api/integrations — save credentials + enable an integration */
export async function POST(req: NextRequest) {
  const { user, error } = requireRole(req, "admin");
  if (error) return error;

  const { type, credentials } = (await req.json()) as { type: string; credentials: Record<string, string> };
  if (!type || !INTEGRATION_DEFS[type]) {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
  }

  const def = INTEGRATION_DEFS[type];
  // Validate required fields
  for (const f of def.fields) {
    if (f.required && !credentials[f.key]?.trim()) {
      return NextResponse.json({ error: `${f.label} is required` }, { status: 400 });
    }
  }

  await db.integration.upsert({
    where: { type },
    update: {
      name: def.name,
      credentials: JSON.stringify(credentials),
      enabled: true,
      connectedAt: new Date(),
    },
    create: {
      type,
      name: def.name,
      credentials: JSON.stringify(credentials),
      enabled: true,
      connectedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, enabled: true });
}
