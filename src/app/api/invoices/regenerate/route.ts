import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/regenerate
 *
 * Regenerates an invoice from a client's subscription — used when the
 * owner updates the subscription's discount/tax/amount and wants the
 * invoice to reflect the new totals.
 *
 * Body: { customerId: string }
 *
 * This will:
 * 1. Find the client's active/trial subscription
 * 2. Find the latest draft invoice for that client
 * 3. If a draft exists → update its line items, discount, tax, and total
 * 4. If no draft exists → create a new one
 *
 * Returns the updated/created invoice.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;

  try {
    const { customerId } = await req.json();
    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 });
    }

    // Find the client's subscription
    const subscription = await db.subscription.findFirst({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found for this client" }, { status: 404 });
    }

    // Compute totals from subscription settings
    const baseAmount = subscription.amount;
    const discountType = subscription.discountType as "percentage" | "fixed" | null;
    const discountValue = subscription.discountValue ?? 0;
    const taxRate = subscription.taxRate ?? 0;

    const totals = computeBillingTotals({
      base: baseAmount,
      discountType,
      discountValue,
      taxRate,
    });

    // Build line items from the subscription
    const planLabel = subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
    const cycleLabel = subscription.billingCycle ?? "monthly";
    const lineItems = [
      {
        description: `${planLabel} Plan — ${cycleLabel} Subscription`,
        qty: 1,
        price: baseAmount,
        amount: baseAmount,
      },
    ];

    // Find the latest draft invoice for this client
    const existingDraft = await db.invoice.findFirst({
      where: { customerId, status: "draft" },
      orderBy: { createdAt: "desc" },
    });

    if (existingDraft) {
      // Update the existing draft with new totals
      const updated = await db.invoice.update({
        where: { id: existingDraft.id },
        data: {
          subtotal: baseAmount,
          discountType: discountType,
          discountValue: discountValue || null,
          discountAmount: totals.discountAmount,
          taxRate,
          taxAmount: totals.taxAmount,
          total: totals.total,
          items: JSON.stringify(lineItems),
        },
      });

      return NextResponse.json({
        id: updated.id,
        number: updated.number,
        status: updated.status,
        subtotal: updated.subtotal,
        discountAmount: updated.discountAmount,
        taxRate: updated.taxRate,
        taxAmount: updated.taxAmount,
        total: updated.total,
        items: lineItems,
        message: "Invoice regenerated with updated subscription details",
      });
    } else {
      // Create a new draft invoice
      const count = await db.invoice.count();
      const number = `INV-${String(count + 1).padStart(4, "0")}`;

      const invoice = await db.invoice.create({
        data: {
          number,
          customerId,
          status: "draft",
          issueDate: new Date(),
          dueDate: subscription.trialEnds ?? subscription.endDate,
          subtotal: baseAmount,
          discountType: discountType,
          discountValue: discountValue || null,
          discountAmount: totals.discountAmount,
          taxRate,
          taxAmount: totals.taxAmount,
          total: totals.total,
          items: JSON.stringify(lineItems),
          notes: `Generated from ${planLabel} subscription`,
        },
      });

      return NextResponse.json({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        subtotal: invoice.subtotal,
        discountAmount: invoice.discountAmount,
        taxRate: invoice.taxRate,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        items: lineItems,
        message: "New invoice created from subscription",
      });
    }
  } catch (err) {
    console.error("[api/invoices/regenerate] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to regenerate invoice" },
      { status: 500 }
    );
  }
}
