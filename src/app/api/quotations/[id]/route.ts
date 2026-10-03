import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/quotations/[id]
 *
 * Auth required. Target quotation must belong to the caller's tenant
 * (super-admins can mutate any quotation).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.quotation.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowed = ["status", "notes", "validUntil"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (k === "validUntil") data[k] = body[k] ? new Date(body[k]) : null;
      else data[k] = body[k];
    }
  }
  await db.quotation.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/quotations/[id]
 *
 * Auth required. Target quotation must belong to the caller's tenant.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.quotation.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.quotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
