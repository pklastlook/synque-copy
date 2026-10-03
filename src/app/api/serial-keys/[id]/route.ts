import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/serial-keys/[id]
 *
 * Admin-only. Target serial key must belong to the caller's tenant
 * (super-admins can mutate any key).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = requireRole(req, "admin");
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.serialKey.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["status", "deviceName"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  if (body.status === "revoked") data.deviceName = null;
  await db.serialKey.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/serial-keys/[id]
 *
 * Admin-only. Target serial key must belong to the caller's tenant
 * (super-admins can delete any key).
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = requireRole(_req, "admin");
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.serialKey.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.serialKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
