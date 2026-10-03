import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const scope = getTenantScope(user!);

  // Verify the target comment exists AND belongs to the caller's tenant.
  // Uses findFirst + tenantWhere instead of `update({ where: { id } })` so a
  // cross-tenant attempt hits a 404 (not a silent mutation, and not a 403
  // that would confirm the resource exists in another tenant).
  const existing = await db.comment.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.replied !== undefined) data.replied = body.replied;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
  await db.comment.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const scope = getTenantScope(user!);

  // Verify the target comment exists AND belongs to the caller's tenant.
  const existing = await db.comment.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
