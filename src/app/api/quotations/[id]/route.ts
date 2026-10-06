import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * GET /api/quotations/[id]
 *
 * Auth required. Target quotation must belong to the caller's tenant
 * (super-admins can read any quotation).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const q = await db.quotation.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    include: { customer: true },
  });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: q.id, number: q.number, customerId: q.customerId, customerName: q.customer?.name ?? "Unknown",
    status: q.status, issueDate: q.issueDate.toISOString(), validUntil: q.validUntil?.toISOString() ?? null,
    subtotal: q.subtotal,
    discountType: q.discountType ?? null,
    discountValue: q.discountValue ?? null,
    discountAmount: q.discountAmount,
    taxRate: q.taxRate, taxAmount: q.taxAmount, total: q.total,
    notes: q.notes, items: JSON.parse(q.items), createdAt: q.createdAt.toISOString(),
  });
}

/**
 * PATCH /api/quotations/[id]
 *
 * Auth required. Target quotation must belong to the caller's tenant
 * (super-admins can mutate any quotation).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.quotation.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes ?? null;
  if (body.validUntil !== undefined) {
    data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
  }

  // Recompute subtotal + discount + tax + total when items / discount / taxRate
  // change.
  let recompute = false;
  if (body.items !== undefined) {
    const parsedItems = body.items;
    const subtotal = parsedItems.reduce(
      (s: number, i: { amount: number }) => s + (i.amount || 0),
      0,
    );
    data.items = JSON.stringify(parsedItems);
    data.subtotal = subtotal;
    recompute = true;
  }
  if (body.taxRate !== undefined) {
    data.taxRate = Number(body.taxRate) || 0;
    recompute = true;
  }
  if (body.discountType !== undefined) {
    data.discountType =
      body.discountType === "percentage" || body.discountType === "fixed"
        ? body.discountType
        : null;
    recompute = true;
  }
  if (body.discountValue !== undefined) {
    data.discountValue =
      typeof body.discountValue === "number" ? body.discountValue : null;
    recompute = true;
  }

  if (recompute) {
    const subtotal = (data.subtotal as number | undefined) ?? existing.subtotal;
    const discountType =
      (data.discountType as string | null | undefined) ?? existing.discountType;
    const discountValue =
      (data.discountValue as number | null | undefined) ?? existing.discountValue;
    const taxRate =
      (data.taxRate as number | undefined) ?? existing.taxRate;
    const { discountAmount, taxAmount, total } = computeBillingTotals({
      base: subtotal,
      discountType,
      discountValue,
      taxRate,
    });
    data.discountAmount = discountAmount;
    data.taxAmount = taxAmount;
    data.total = total;
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
  const { user, error } = await requireAuth(_req);
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
