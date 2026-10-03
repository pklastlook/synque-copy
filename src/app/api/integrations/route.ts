import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { encrypt, decrypt } from "@/lib/crypto";
import { invalidateStorageAdapter } from "@/lib/storage";
import { invalidateLLMClient } from "@/lib/llm";

export const dynamic = "force-dynamic";

/**
 * Decrypt an `Integration.credentials` cell into a `Record<string, string>`.
 *
 * After P2-2-b all new writes are `encrypt(JSON.stringify(creds))`, but
 * pre-migration rows may still contain plaintext JSON. We try `decrypt()`
 * first; on any failure (unrecognised format, GCM auth-tag mismatch,
 * truncated value) we fall back to `JSON.parse()` on the raw value.
 *
 * Returns `null` for null/empty input or when neither path yields valid JSON.
 */
function decryptCredentials(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  // Try the new encrypted format first.
  try {
    return JSON.parse(decrypt(raw)) as Record<string, string>;
  } catch {
    // Fall through to plaintext JSON.parse — pre-migration rows.
  }
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return null;
  }
}

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
      { key: "from", label: "From Email", type: "text", placeholder: "SYNQUE <noreply@yourcompany.com>", required: false },
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
    desc: "Trigger SYNQUE actions from 6,000+ apps.",
    icon: "Zap",
    fields: [
      { key: "webhookUrl", label: "Zapier Webhook URL", type: "url", placeholder: "https://hooks.zapier.com/hooks/catch/.../...", required: true },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "••••••••", required: false },
    ],
  },
  cloudinary: {
    name: "Cloudinary",
    desc: "CDN-backed media storage with auto image optimization, on-the-fly transforms, and video transcoding. Required for production uploads.",
    icon: "ImageIcon",
    fields: [
      { key: "cloudName", label: "Cloud Name", type: "text", placeholder: "your-cloud-name", required: true },
      { key: "apiKey", label: "API Key", type: "text", placeholder: "123456789012345", required: true },
      { key: "apiSecret", label: "API Secret", type: "password", placeholder: "••••••••••••••••", required: true },
      { key: "folder", label: "Top-level Folder (optional)", type: "text", placeholder: "socialflow", required: false },
    ],
  },
  claude: {
    name: "Claude (Anthropic)",
    desc: "Power the AI Assistant with Claude by Anthropic. Most capable model for complex reasoning, data analysis, and natural conversation. Get an API key from console.anthropic.com.",
    icon: "Sparkles",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "sk-ant-api03-...", required: true },
      { key: "model", label: "Model", type: "text", placeholder: "claude-sonnet-4-20250514", required: true },
      { key: "workspaceId", label: "Workspace ID (optional)", type: "text", placeholder: "e.g. wksp_abc123 — only if your API key is not workspace-scoped", required: false },
    ],
  },
  openai: {
    name: "OpenAI (ChatGPT)",
    desc: "Power the AI Content Writer + caption variant generator with GPT models. Get an API key from platform.openai.com.",
    icon: "Bot",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "sk-...", required: true },
      { key: "model", label: "Model", type: "text", placeholder: "gpt-4o-mini", required: true },
      { key: "baseUrl", label: "Base URL (optional)", type: "url", placeholder: "https://api.openai.com/v1 (leave default) or https://your-azure-endpoint", required: false },
      { key: "organization", label: "Organization ID (optional)", type: "text", placeholder: "org-...", required: false },
    ],
  },
  gemini: {
    name: "Google Gemini",
    desc: "Power the AI Content Writer with Google's Gemini models. Get an API key from aistudio.google.com.",
    icon: "Sparkles",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "AIza...", required: true },
      { key: "model", label: "Model", type: "text", placeholder: "gemini-1.5-flash", required: true },
    ],
  },
};

/** GET /api/integrations — list all integrations with their current config status */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  // P2-2-b: scope by tenant. Super-admins see all rows; tenant users see
  // only rows whose customerId matches theirs (or null = global/shared rows
  // that a super-admin configured for everyone).
  const where = scope.isSuperAdmin
    ? {}
    : { OR: [{ customerId: scope.customerId }, { customerId: null }] };

  const rows = await db.integration.findMany({ where });
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
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;
  const scope = getTenantScope(user!);

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

  // P2-2-b: encrypt the JSON-stringified credentials at rest. The decrypt
  // helper (used on every read path) transparently handles both the new
  // `v1:<iv>:<ct>` format and pre-migration plaintext, so existing rows
  // keep working until the backfill script rewrites them.
  const credentialsJson = JSON.stringify(credentials);
  const encryptedCredentials = encrypt(credentialsJson);

  // Bind the row to the caller's tenant. Super-admins (no customerId) leave
  // it null = global/shared.
  const customerId = scope.isSuperAdmin ? null : scope.customerId;

  // `type` is still @unique in the schema, so this upsert targets the
  // single global row by `type`. The `customerId` is written through so
  // tenant-scoped GET queries find the row. (A follow-up task will relax
  // `type @unique` → `@@unique([customerId, type])` to give each tenant
  // its own row.)
  await db.integration.upsert({
    where: { type },
    update: {
      name: def.name,
      credentials: encryptedCredentials,
      customerId,
      enabled: true,
      connectedAt: new Date(),
    },
    create: {
      type,
      name: def.name,
      credentials: encryptedCredentials,
      customerId,
      enabled: true,
      connectedAt: new Date(),
    },
  });

  // If this is the Cloudinary integration, invalidate the cached storage
  // adapter so the next upload picks up the new credentials.
  if (type === "cloudinary") {
    invalidateStorageAdapter();
  }

  // If this is an LLM provider (OpenAI / Gemini), invalidate the cached LLM client
  if (type === "claude" || type === "openai" || type === "gemini") {
    invalidateLLMClient();
  }

  return NextResponse.json({ ok: true, enabled: true });
}

// Exported for the sibling `[type]/route.ts` so it can decrypt with the
// same plaintext-fallback logic without duplicating the try/catch dance.
export { decryptCredentials };
