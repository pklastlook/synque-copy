import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments
 *
 * Auth required. Super-admins see ALL payments; tenant users see only
 * payments belonging to their customer (i.e. their own subscription
 * purchases + invoice payments).
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const payments = await db.payment.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    payments.map((p) => ({
      id: p.id,
      subscriptionId: p.subscriptionId,
      invoiceId: p.invoiceId,
      customerId: p.customerId,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      cardLast4: p.cardLast4,
      cardBrand: p.cardBrand,
      status: p.status,
      transactionId: p.transactionId,
      bankAccountId: p.bankAccountId,
      createdAt: p.createdAt.toISOString(),
    })),
  );
}

/**
 * POST /api/payments
 *
 * Records a payment for a subscription purchase (or invoice payment).
 *
 * Body:
 *   - subscriptionId?: string  — links the payment to a subscription
 *   - invoiceId?:     string  — links the payment to an invoice
 *   - amount:         number  — payment amount (in the major currency unit)
 *   - currency?:      string  — defaults to "USD"
 *   - method?:        string  — "card" | "bank_transfer" | "cash" (default "card")
 *   - cardLast4?:     string  — last 4 digits of the card
 *   - cardBrand?:     string  — "visa" | "mastercard" | "amex" | …
 *   - status?:        string  — "completed" (default) | "pending" | "failed" | "refunded"
 *   - transactionId?: string  — gateway transaction id (optional)
 *
 * Side effects (only when status === "completed"):
 *   1. The linked subscription (if any) is updated to status="active".
 *   2. A paid Invoice is generated for the current billing period (one
 *      line item, same discount/tax math as the subscription).
 *   3. The owner's default BankAccount balance is credited (synthesized
 *      — the BankAccount model doesn't store a real balance column, so
 *      we record the payment + the bankAccountId so /api/finance/analytics
 *      can sum it up; this mirrors the existing pattern in that route).
 *
 * customerId is bound to the caller's tenant — tenant users CANNOT record
 * payments for other tenants. Super-admins can pass a body customerId.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  // Bind customerId to the caller's tenant unless the caller is a super-admin.
  const customerId = scope.isSuperAdmin ? body.customerId : scope.customerId;
  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  const amount = typeof body.amount === "number" ? body.amount : 0;
  if (amount <= 0) {
    return NextResponse.json({ error: "amount must be greater than 0" }, { status: 400 });
  }
  const currency: string = typeof body.currency === "string" ? body.currency : "USD";
  const method: string =
    body.method === "card" || body.method === "bank_transfer" || body.method === "cash"
      ? body.method
      : "card";
  const status: string =
    body.status === "pending" || body.status === "failed" || body.status === "refunded"
      ? body.status
      : "completed";
  const cardLast4: string | null =
    typeof body.cardLast4 === "string" && /^\d{4}$/.test(body.cardLast4)
      ? body.cardLast4
      : null;
  const cardBrand: string | null = typeof body.cardBrand === "string" ? body.cardBrand : null;
  const transactionId: string | null =
    typeof body.transactionId === "string" && body.transactionId.trim().length > 0
      ? body.transactionId.trim()
      : null;
  const subscriptionId: string | null =
    typeof body.subscriptionId === "string" ? body.subscriptionId : null;
  const invoiceIdFromBody: string | null =
    typeof body.invoiceId === "string" ? body.invoiceId : null;

  // ===== Resolve the owner's default bank account so the credit can be
  //       linked back to it. The owner (super-admin) creates bank accounts
  //       with `customerId = null` (global pool). When the payment is
  //       being recorded by a super-admin themselves, fall back to their
  //       tenant-scoped default. =====
  const bankAccount =
    (await db.bankAccount.findFirst({
      where: { customerId: null, isDefault: true },
    })) ??
    (await db.bankAccount.findFirst({
      where: tenantWhere(scope) as { customerId?: string },
      orderBy: { isDefault: "desc" },
    }));
  const bankAccountId = bankAccount?.id ?? null;

  // ===== Create the Payment row first =====
  const payment = await db.payment.create({
    data: {
      subscriptionId,
      invoiceId: invoiceIdFromBody,
      customerId,
      amount,
      currency,
      method,
      cardLast4,
      cardBrand,
      status,
      transactionId,
      bankAccountId,
    },
  });

  // ===== Side effects — only run when the payment actually completed =====
  let updatedSubscription = false;
  let createdInvoiceId: string | null = null;
  let createdInvoiceNumber: string | null = null;

  if (status === "completed") {
    // 1) Flip the linked subscription to "active" (if a subscriptionId was
    //    provided and the subscription exists in the caller's tenant scope).
    if (subscriptionId) {
      const sub = await db.subscription.findFirst({
        where: { id: subscriptionId, ...tenantWhere(scope) as { customerId?: string } },
      });
      if (sub) {
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: "active" },
        });
        updatedSubscription = true;

        // 2) Generate a paid invoice for the current billing period —
        //    mirrors /api/subscriptions/[id]/generate-invoice but with
        //    status="paid" + a payment link. Skipped if a duplicate
        //    invoice (same fingerprint in notes) already exists.
        const fingerprint = `subscription:${sub.id}|payment:${payment.id}`;
        const existing = await db.invoice.findFirst({
          where: { customerId, notes: { contains: fingerprint } },
        });
        if (!existing) {
          const cycle = sub.billingCycle ?? "monthly";
          const CYCLE_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };
          const CYCLE_LABEL: Record<string, string> = {
            monthly: "Monthly",
            quarterly: "Quarterly",
            yearly: "Yearly",
          };
          const periodDays = CYCLE_DAYS[cycle] ?? 30;
          const periodStart = new Date(sub.startDate);
          const periodEnd = new Date(periodStart.getTime() + periodDays * 24 * 60 * 60 * 1000);
          const planLabel = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
          const description = `${planLabel} plan — ${CYCLE_LABEL[cycle] ?? "Monthly"} subscription (${periodStart.toLocaleDateString()} → ${periodEnd.toLocaleDateString()})`;
          const baseAmount = Number.isFinite(sub.amount) ? sub.amount : 0;
          const items = [{ description, qty: 1, price: baseAmount, amount: baseAmount }];
          const taxRate = sub.taxRate ?? 0;
          const { discountAmount, taxAmount, total } = computeBillingTotals({
            base: baseAmount,
            discountType: sub.discountType,
            discountValue: sub.discountValue,
            taxRate,
          });
          const count = await db.invoice.count();
          const number = `INV-${String(count + 1).padStart(4, "0")}`;
          const invoice = await db.invoice.create({
            data: {
              number,
              customerId,
              items: JSON.stringify(items),
              subtotal: baseAmount,
              discountType: sub.discountType,
              discountValue: sub.discountValue,
              discountAmount,
              taxRate,
              taxAmount,
              total,
              status: "paid",
              notes: `Paid via ${method}${cardLast4 ? ` (•••• ${cardLast4})` : ""}. ${fingerprint}`,
            },
          });
          createdInvoiceId = invoice.id;
          createdInvoiceNumber = number;
          // Link the payment to the newly-created invoice.
          await db.payment.update({
            where: { id: payment.id },
            data: { invoiceId: invoice.id },
          });
        }
      }
    }
  }

  // ===== Audit log (best-effort) =====
  await audit(req, user!.userId, "payment.created", {
    targetType: "payment",
    targetId: payment.id,
    metadata: {
      amount,
      currency,
      method,
      status,
      subscriptionId,
      invoiceId: createdInvoiceId ?? invoiceIdFromBody,
      updatedSubscription,
    },
  });

  return NextResponse.json({
    ok: true,
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    updatedSubscription,
    invoiceId: createdInvoiceId,
    invoiceNumber: createdInvoiceNumber,
  });
}
