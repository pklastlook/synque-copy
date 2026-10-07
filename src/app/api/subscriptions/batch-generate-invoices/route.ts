import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/subscriptions/batch-generate-invoices
 *
 * Auth required. Iterates every "active" subscription in the caller's
 * tenant scope and generates a billing-period invoice for each (idempotent
 * — skips subscriptions that already have an invoice for the current
 * period, identified by the `subscription:<id>|period:<YYYY-MM-DD>`
 * fingerprint stored in the Invoice's `notes` field).
 *
 * Returns a per-subscription result list so the UI can show exactly what
 * was generated vs skipped.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const subs = await db.subscription.findMany({
    where: {
      status: "active",
      ...tenantWhere(scope) as { customerId?: string },
    },
    include: { customer: true },
  });

  const CYCLE_DAYS: Record<string, number> = { monthly: 30, quarterly: 90, yearly: 365 };
  const CYCLE_LABEL: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };

  const results: {
    subscriptionId: string;
    customerName: string;
    status: "created" | "skipped" | "error";
    invoiceNumber?: string;
    total?: number;
    error?: string;
  }[] = [];

  // Seed the next invoice number once for the whole batch so we don't
  // re-query the count on every iteration (we increment locally).
  let nextSeq = (await db.invoice.count()) + 1;

  for (const sub of subs) {
    try {
      const customer = sub.customer;
      if (!customer) {
        results.push({
          subscriptionId: sub.id,
          customerName: "Unknown",
          status: "error",
          error: "Customer not found",
        });
        continue;
      }

      const cycle = sub.billingCycle ?? "monthly";
      const periodDays = CYCLE_DAYS[cycle] ?? 30;
      const periodStart = new Date(sub.startDate);
      const periodEnd = new Date(periodStart.getTime() + periodDays * 24 * 60 * 60 * 1000);
      const dueDate = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

      const fingerprint = `subscription:${sub.id}|period:${periodStart.toISOString().slice(0, 10)}`;
      const existing = await db.invoice.findFirst({
        where: { customerId: customer.id, notes: { contains: fingerprint } },
        orderBy: { createdAt: "desc" },
      });
      if (existing) {
        results.push({
          subscriptionId: sub.id,
          customerName: customer.name,
          status: "skipped",
          invoiceNumber: existing.number,
          total: existing.total,
        });
        continue;
      }

      const planLabel = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
      const description = `${planLabel} plan — ${CYCLE_LABEL[cycle] ?? "Monthly"} subscription (${periodStart.toISOString().slice(0, 10)} → ${periodEnd.toISOString().slice(0, 10)})`;
      const baseAmount = Number.isFinite(sub.amount) ? sub.amount : 0;
      const items = [{ description, qty: 1, price: baseAmount, amount: baseAmount }];
      const taxRate = sub.taxRate ?? 0;
      const { discountAmount, taxAmount, total } = computeBillingTotals({
        base: baseAmount,
        discountType: sub.discountType,
        discountValue: sub.discountValue,
        taxRate,
      });

      const number = `INV-${String(nextSeq).padStart(4, "0")}`;
      nextSeq += 1;

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

      results.push({
        subscriptionId: sub.id,
        customerName: customer.name,
        status: "created",
        invoiceNumber: invoice.number,
        total,
      });
    } catch (e) {
      results.push({
        subscriptionId: sub.id,
        customerName: sub.customer?.name ?? "Unknown",
        status: "error",
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errored = results.filter((r) => r.status === "error").length;

  await audit(req, user!.userId, "invoices.batch_generated", {
    targetType: "invoice",
    metadata: { created, skipped, errored, total: subs.length },
  });

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    errored,
    total: subs.length,
    results,
  });
}
