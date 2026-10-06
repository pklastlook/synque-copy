import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/[id]
 *
 * Auth required. Target invoice must belong to the caller's tenant
 * (super-admins can read any invoice).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const inv = await db.invoice.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    include: { customer: true },
  });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: inv.id, number: inv.number, customerId: inv.customerId, customerName: inv.customer?.name ?? "Unknown",
    status: inv.status, issueDate: inv.issueDate.toISOString(), dueDate: inv.dueDate?.toISOString() ?? null,
    subtotal: inv.subtotal,
    discountType: inv.discountType ?? null,
    discountValue: inv.discountValue ?? null,
    discountAmount: inv.discountAmount,
    taxRate: inv.taxRate, taxAmount: inv.taxAmount, total: inv.total,
    notes: inv.notes, items: JSON.parse(inv.items), createdAt: inv.createdAt.toISOString(),
  });
}

/**
 * PATCH /api/invoices/[id]
 *
 * Auth required. Target invoice must belong to the caller's tenant
 * (super-admins can mutate any invoice).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.invoice.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.status !== undefined) data.status = body.status;
  if (body.notes !== undefined) data.notes = body.notes ?? null;
  if (body.dueDate !== undefined) {
    data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  // Recompute subtotal + discount + tax + total whenever items / discount /
  // taxRate fields are touched.
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

  await db.invoice.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/invoices/[id]
 *
 * Auth required. Target invoice must belong to the caller's tenant.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.invoice.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
