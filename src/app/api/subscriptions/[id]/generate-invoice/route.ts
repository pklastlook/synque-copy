import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";
import { audit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/subscriptions/[id]/generate-invoice
 *
 * Auth required. Generates (or returns an existing) Invoice for the
 * subscription's current billing period. The invoice is built from the
 * subscription's plan / amount / discount / tax settings and one line
 * item per billing period (description derived from the plan + cycle).
 *
 * Behaviour:
 *   1. Loads the subscription (must belong to the caller's tenant unless
 *      the caller is a super-admin).
 *   2. Resolves the billing period: [startDate .. startDate + cycle).
 *   3. Idempotency — if a matching invoice (same customer + items hash +
 *      issueDate day) already exists, returns it instead of duplicating.
 *   4. Builds the Invoice row with the same discount/tax math used by
 *      the subscriptions + invoices routes (computeBillingTotals).
 *   5. Stamps `notes` with `subscription:<id>` metadata so the Invoices
 *      UI can link back to the source subscription.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const sub = await db.subscription.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    include: { customer: true },
  });
  if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

  const customer = sub.customer;
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // ===== Resolve billing period + cycle multiplier =====
  const cycle = sub.billingCycle ?? "monthly";
  const CYCLE_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };
  const CYCLE_LABEL: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };
  const periodDays = CYCLE_DAYS[cycle] ?? 30;

  // Period anchors on the subscription start date; subsequent calls
  // would naturally roll forward (kept simple here — one invoice per
  // generate call, the Invoices list shows what's been issued).
  const periodStart = new Date(sub.startDate);
  const periodEnd = new Date(periodStart.getTime() + periodDays * 24 * 60 * 60 * 1000);
  const dueDate = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days grace

  const planLabel = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
  const description = `${planLabel} plan — ${CYCLE_LABEL[cycle] ?? "Monthly"} subscription (${formatDate(periodStart)} → ${formatDate(periodEnd)})`;

  // ===== Idempotency: skip if an invoice with the same fingerprint
  //       (subscription id + period start day + customer id) was already
  //       created. The fingerprint is stored in the `notes` field as JSON
  //       so the Invoices list can group / link invoices back to subs. =====
  const fingerprint = `subscription:${sub.id}|period:${periodStart.toISOString().slice(0, 10)}`;
  const existing = await db.invoice.findFirst({
    where: { customerId: customer.id, notes: { contains: fingerprint } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      id: existing.id,
      number: existing.number,
      total: existing.total,
      duplicate: true,
    });
  }

  // ===== Build line items — one item per billing cycle (the typical case
  //       for a SaaS subscription). If a discount is configured, we expose
  //       it via the Invoice's own discount fields so the printed invoice
  //       shows the line item at full price + a discount row. =====
  const baseAmount = Number.isFinite(sub.amount) ? sub.amount : 0;
  const items = [
    {
      description,
      qty: 1,
      price: baseAmount,
      amount: baseAmount,
    },
  ];

  const taxRate = sub.taxRate ?? 0;
  const { discountAmount, taxAmount, total } = computeBillingTotals({
    base: baseAmount,
    discountType: sub.discountType,
    discountValue: sub.discountValue,
    taxRate,
  });

  // ===== Mint the next invoice number (INV-####) =====
  const count = await db.invoice.count();
  const number = `INV-${String(count + 1).padStart(4, "0")}`;

  // The `notes` field carries the subscription fingerprint as JSON so the
  // UI can parse it back and link the invoice to its subscription.
  const notes = JSON.stringify({
    subscriptionId: sub.id,
    plan: sub.plan,
    billingCycle: cycle,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    fingerprint,
    label: `Auto-generated from subscription (${planLabel}, ${CYCLE_LABEL[cycle] ?? "Monthly"})`,
  });

  const invoice = await db.invoice.create({
    data: {
      number,
      customerId: customer.id,
      items: JSON.stringify(items),
      subtotal: baseAmount,
      discountType: sub.discountType ?? null,
      discountValue: sub.discountValue ?? null,
      discountAmount,
      taxRate,
      taxAmount,
      total,
      status: "sent",
      dueDate,
      notes,
    },
  });

  await audit(req, user!.userId, "invoice.generated_from_subscription", {
    targetType: "invoice",
    targetId: invoice.id,
    metadata: {
      subscriptionId: sub.id,
      invoiceNumber: number,
      customerId: customer.id,
      total,
    },
  });

  // Notify every user in the client's tenant that the invoice was generated.
  // The customer (tenant) gets a "Invoice {number} generated — ${total}"
  // bell alert pointing back to the Owner → Invoices panel.
  try {
    const tenantUsers = await db.user.findMany({
      where: { customerId: customer.id },
      select: { id: true },
    });
    const formattedTotal = total.toLocaleString(undefined, {
      style: "currency",
      currency: sub.currency ?? "USD",
    });
    await Promise.all(
      tenantUsers.map((u) =>
        createNotification({
          userId: u.id,
          type: "payment_received",
          title: `Invoice ${number} generated`,
          message: `Invoice ${number} generated — ${formattedTotal}`,
          actionView: "owner",
          actionId: invoice.id,
        })
      )
    );
  } catch (e) {
    console.error(
      "[api/subscriptions/generate-invoice] notification failed:",
      e instanceof Error ? e.message : String(e)
    );
  }

  return NextResponse.json({
    ok: true,
    id: invoice.id,
    number,
    subtotal: baseAmount,
    discountAmount,
    taxAmount,
    total,
    dueDate: dueDate.toISOString(),
    customerId: customer.id,
    fingerprint,
  });
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
