import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/subscriptions/[id]
 *
 * Auth required. Target subscription must belong to the caller's tenant
 * (super-admins can mutate any subscription).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.subscription.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.plan) data.plan = body.plan;
  if (body.amount !== undefined) data.amount = body.amount;
  if (body.currency) data.currency = body.currency;
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate) data.endDate = new Date(body.endDate);
  if (body.trialEnds) data.trialEnds = new Date(body.trialEnds);

  await db.subscription.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/subscriptions/[id]
 *
 * Auth required. Target subscription must belong to the caller's tenant.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.subscription.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.subscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
