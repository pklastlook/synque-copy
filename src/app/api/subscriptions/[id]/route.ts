import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeSubscriptionTotals } from "../route";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/subscriptions/[id]
 *
 * Auth required. Target subscription must belong to the caller's tenant
 * (super-admins can mutate any subscription).
 *
 * Accepts the full editable set: plan, amount, currency, status, startDate,
 * endDate, trialEnds, discountType, discountValue, taxRate, billingCycle,
 * notes. Recomputes discountAmount / taxAmount / totalAmount on the server
 * whenever amount / discountType / discountValue / taxRate change.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.subscription.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.status) data.status = body.status;
  if (body.plan) data.plan = body.plan;
  if (body.amount !== undefined) data.amount = Number(body.amount) || 0;
  if (body.currency) data.currency = body.currency;
  if (body.startDate) data.startDate = new Date(body.startDate);
  if (body.endDate !== undefined) {
    data.endDate = body.endDate ? new Date(body.endDate) : null;
  }
  if (body.trialEnds !== undefined) {
    data.trialEnds = body.trialEnds ? new Date(body.trialEnds) : null;
  }
  if (body.billingCycle !== undefined) {
    data.billingCycle = body.billingCycle || null;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes) : null;
  }

  // Discount + tax — these always come as a triple from the UI. Normalize
  // the discountType so unknown values become null (no discount).
  if (body.discountType !== undefined) {
    data.discountType =
      body.discountType === "percentage" || body.discountType === "fixed"
        ? body.discountType
        : null;
  }
  if (body.discountValue !== undefined) {
    data.discountValue =
      typeof body.discountValue === "number" ? body.discountValue : null;
  }
  if (body.taxRate !== undefined) {
    data.taxRate = typeof body.taxRate === "number" ? body.taxRate : null;
  }

  // Recompute computed totals if any of their inputs changed.
  const amount = (data.amount as number | undefined) ?? existing.amount;
  const discountType =
    (data.discountType as string | null | undefined) ?? existing.discountType;
  const discountValue =
    (data.discountValue as number | null | undefined) ?? existing.discountValue;
  const taxRate =
    (data.taxRate as number | null | undefined) ?? existing.taxRate;

  const totals = computeSubscriptionTotals({
    amount,
    discountType,
    discountValue,
    taxRate,
  });
  data.discountAmount = totals.discountAmount;
  data.taxAmount = totals.taxAmount;
  data.totalAmount = totals.totalAmount;

  await db.subscription.update({ where: { id }, data });
  return NextResponse.json({ ok: true, ...totals });
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
