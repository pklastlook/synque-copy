import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

function genApiKey() {
  // Use cryptographic randomness instead of Math.random() for security-sensitive tokens.
  return "sf_" + randomBytes(20).toString("hex");
}

/**
 * GET /api/api-keys
 *
 * Admin-only. The ApiKey model has no userId / customerId column (it's a
 * global server-side API key for the SYNQUE API itself), so per-user
 * scoping isn't possible without a schema migration. Restricting to admins
 * closes the IDOR — only admins can list/manage API keys.
 *
 * TODO: add a `userId` column to ApiKey so we can scope by ownership (then
 * non-admins could mint their own keys; super-admin could see all). Requires
 * `bun run db:push` after editing prisma/schema.prisma.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, "admin");
  if (error) return error;

  const keys = await db.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(keys.map((k) => ({
    id: k.id, name: k.name,
    // Mask the key in GET responses — only show prefix + last 4 chars.
    key: k.key.length > 12 ? k.key.slice(0, 8) + "…" + k.key.slice(-4) : k.key,
    permissions: JSON.parse(k.permissions),
    status: k.status, lastUsed: k.lastUsed?.toISOString() ?? null, createdAt: k.createdAt.toISOString(),
  })));
}

/**
 * POST /api/api-keys
 *
 * Admin-only. Mints a new API key.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireRole(req, "admin");
  if (error) return error;

  const { name, permissions } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  let key = genApiKey();
  let existing = await db.apiKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e));
  while (existing) { key = genApiKey(); existing = await db.apiKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e)); }
  const apiKey = await db.apiKey.create({ data: { name, key, permissions: JSON.stringify(permissions || ["*"]) } });
  return NextResponse.json({ id: apiKey.id, key: apiKey.key, ok: true });
}
