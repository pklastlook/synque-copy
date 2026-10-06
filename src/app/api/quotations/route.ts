import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * GET /api/quotations
 *
 * Auth required. Super-admins see all quotations; tenant users see only
 * quotations belonging to their customer.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const quotations = await db.quotation.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(quotations.map((q) => ({
    id: q.id, number: q.number, customerId: q.customerId, customerName: q.customer?.name ?? "Unknown",
    status: q.status, issueDate: q.issueDate.toISOString(), validUntil: q.validUntil?.toISOString() ?? null,
    subtotal: q.subtotal,
    discountType: q.discountType ?? null,
    discountValue: q.discountValue ?? null,
    discountAmount: q.discountAmount,
    taxRate: q.taxRate, taxAmount: q.taxAmount, total: q.total,
    notes: q.notes, items: JSON.parse(q.items), createdAt: q.createdAt.toISOString(),
  })));
}

/**
 * POST /api/quotations
 *
 * Auth required. The customerId is bound to the caller's tenant — the body
 * `customerId` is ignored unless the caller is a super-admin (who can mint
 * quotations for any customer).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { items, taxRate, validUntil, notes } = body;
  // Bind customerId to the caller's tenant. Super-admins can pass a body
  // customerId (for cross-tenant billing); tenant users CANNOT.
  const customerId = scope.isSuperAdmin ? body.customerId : scope.customerId;
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const parsedItems = (items || []).map((i: { description?: string; qty?: number; price?: number; amount?: number }) => ({
    description: i.description ?? "",
    qty: i.qty ?? 1,
    price: i.price ?? 0,
    amount: i.amount ?? (i.qty ?? 1) * (i.price ?? 0),
  }));
  const subtotal = parsedItems.reduce((s: number, i: { amount: number }) => s + (i.amount || 0), 0);
  const tax = taxRate || 0;

  // Discount fields (optional).
  const discountType: string | null =
    body.discountType === "percentage" || body.discountType === "fixed"
      ? body.discountType
      : null;
  const discountValue: number | null =
    typeof body.discountValue === "number" ? body.discountValue : null;

  const { discountAmount, taxAmount, total } = computeBillingTotals({
    base: subtotal,
    discountType,
    discountValue,
    taxRate: tax,
  });

  const count = await db.quotation.count();
  const number = `QUO-${String(count + 1).padStart(4, "0")}`;
  const quotation = await db.quotation.create({
    data: {
      number,
      customerId,
      items: JSON.stringify(parsedItems),
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      taxRate: tax,
      taxAmount,
      total,
      notes,
      validUntil: validUntil ? new Date(validUntil) : null,
    },
  });
  return NextResponse.json({ id: quotation.id, number, ok: true });
}
