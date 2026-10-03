import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function genKey() {
  const segments = ["SQ", "PRO", "2026"];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  segments.push(Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  return segments.join("-");
}

/**
 * GET /api/serial-keys
 *
 * Auth required. Super-admins see all serial keys; tenant users see only
 * serial keys belonging to their own customer.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const keys = await db.serialKey.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(keys.map((k) => ({
    id: k.id, key: k.key, status: k.status, deviceName: k.deviceName,
    customerId: k.customerId, customerName: k.customer?.name ?? null,
    activatedAt: k.activatedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString(),
  })));
}

/**
 * POST /api/serial-keys
 *
 * Admin-only. Generates a new serial key. The customerId from the body is
 * honoured only for super-admins; tenant admins can only mint keys for
 * their own customer (the body customerId is overridden with scope.customerId).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  // Bind customerId to the caller's tenant unless the caller is a super-admin
  // (super-admins can mint keys for any customer — they manage cross-tenant).
  const customerId = scope.isSuperAdmin
    ? (body.customerId ?? null)
    : scope.customerId;

  // Generate a unique key
  let key = genKey();
  let existing = await db.serialKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e));
  while (existing) { key = genKey(); existing = await db.serialKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e)); }
  const serialKey = await db.serialKey.create({ data: { key, customerId: customerId ?? null } });
  return NextResponse.json({ id: serialKey.id, key: serialKey.key, ok: true });
}
