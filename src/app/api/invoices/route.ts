import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Compute the discount + tax totals for an invoice / quotation.
 *
 * - discountAmount = percentage?  subtotal * discountValue / 100  :  discountValue
 * - taxableBase    = max(subtotal - discountAmount, 0)
 * - taxAmount      = taxableBase * taxRate / 100
 * - total          = subtotal - discountAmount + taxAmount
 */
export function computeDocTotals(opts: {
  subtotal: number;
  discountType?: string | null;
  discountValue?: number | null;
  taxRate?: number;
}) {
  return computeBillingTotals({
    base: opts.subtotal,
    discountType: opts.discountType,
    discountValue: opts.discountValue,
    taxRate: opts.taxRate ?? 0,
  });
}

/**
 * GET /api/invoices
 *
 * Auth required. Super-admins see all invoices; tenant users see only
 * invoices belonging to their customer.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const invoices = await db.invoice.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invoices.map((inv) => ({
    id: inv.id, number: inv.number, customerId: inv.customerId, customerName: inv.customer?.name ?? "Unknown",
    status: inv.status, issueDate: inv.issueDate.toISOString(), dueDate: inv.dueDate?.toISOString() ?? null,
    subtotal: inv.subtotal,
    discountType: inv.discountType ?? null,
    discountValue: inv.discountValue ?? null,
    discountAmount: inv.discountAmount,
    taxRate: inv.taxRate, taxAmount: inv.taxAmount, total: inv.total,
    notes: inv.notes, items: JSON.parse(inv.items), createdAt: inv.createdAt.toISOString(),
  })));
}

/**
 * POST /api/invoices
 *
 * Auth required. The customerId is bound to the caller's tenant — the body
 * `customerId` is ignored unless the caller is a super-admin (who can mint
 * invoices for any customer).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { items, taxRate, dueDate, notes } = body;
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

  // Discount fields (optional). When discountType is null/unknown, no discount
  // is applied. discountValue is the percentage OR fixed amount depending on
  // discountType.
  const discountType: string | null =
    body.discountType === "percentage" || body.discountType === "fixed"
      ? body.discountType
      : null;
  const discountValue: number | null =
    typeof body.discountValue === "number" ? body.discountValue : null;

  const { discountAmount, taxAmount, total } = computeDocTotals({
    subtotal,
    discountType,
    discountValue,
    taxRate: tax,
  });

  const count = await db.invoice.count();
  const number = `INV-${String(count + 1).padStart(4, "0")}`;
  const invoice = await db.invoice.create({
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
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  return NextResponse.json({ id: invoice.id, number, ok: true });
}
