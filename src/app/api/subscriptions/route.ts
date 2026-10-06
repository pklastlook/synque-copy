import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";

export const dynamic = "force-dynamic";

// Plan → default monthly amount. `custom` exposes the amount field in the UI
// (no preset price; admin enters a custom amount).
const PLAN_DEFAULT_AMOUNT: Record<string, number> = {
  starter: 299,
  growth: 499,
  enterprise: 0,
  custom: 0,
};

/**
 * Compute the discount + tax totals for a subscription.
 *
 * - discountAmount = percentage?  amount * discountValue / 100  :  discountValue
 * - taxAmount      = (amount - discountAmount) * taxRate / 100
 * - totalAmount    = amount - discountAmount + taxAmount
 *
 * Returns `{ discountAmount, taxAmount, totalAmount }`.
 */
export function computeSubscriptionTotals(opts: {
  amount: number;
  discountType?: string | null;
  discountValue?: number | null;
  taxRate?: number | null;
}) {
  const { discountAmount, taxAmount, total } = computeBillingTotals({
    base: opts.amount,
    discountType: opts.discountType,
    discountValue: opts.discountValue,
    taxRate: opts.taxRate ?? 0,
  });
  return { discountAmount, taxAmount, totalAmount: total };
}

/**
 * GET /api/subscriptions
 *
 * Auth required. Super-admins see all subscriptions; tenant users see only
 * subscriptions belonging to their customer.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const subs = await db.subscription.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(subs.map((s) => ({
    id: s.id, customerId: s.customerId, customerName: s.customer?.name ?? "Unknown",
    plan: s.plan, status: s.status, amount: s.amount, currency: s.currency,
    startDate: s.startDate.toISOString(), endDate: s.endDate?.toISOString() ?? null,
    trialEnds: s.trialEnds?.toISOString() ?? null, createdAt: s.createdAt.toISOString(),
    discountType: s.discountType ?? null,
    discountValue: s.discountValue ?? null,
    discountAmount: s.discountAmount ?? null,
    taxRate: s.taxRate ?? null,
    taxAmount: s.taxAmount ?? null,
    totalAmount: s.totalAmount ?? null,
    billingCycle: s.billingCycle ?? null,
    notes: s.notes ?? null,
  })));
}

/**
 * POST /api/subscriptions
 *
 * Auth required. The customerId is bound to the caller's tenant — the body
 * `customerId` is ignored unless the caller is a super-admin (who can mint
 * subscriptions for any customer).
 *
 * Accepts the full set of billing fields (plan, amount, discountType,
 * discountValue, taxRate, billingCycle, notes) and computes `discountAmount`,
 * `taxAmount`, and `totalAmount` on the server.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  // Bind customerId to the caller's tenant. Super-admins can pass a body
  // customerId (for cross-tenant billing); tenant users CANNOT.
  const customerId = scope.isSuperAdmin ? body.customerId : scope.customerId;
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });

  const plan: string = body.plan ?? "growth";
  const defaultAmount = plan in PLAN_DEFAULT_AMOUNT ? PLAN_DEFAULT_AMOUNT[plan] : 89;
  // For "custom" / "enterprise" plans, the body.amount is mandatory in the
  // UI (admin types it in); for the preset plans, default to the standard
  // monthly amount if the client didn't pass one.
  const amount: number =
    typeof body.amount === "number" ? body.amount : defaultAmount;
  const currency: string = body.currency ?? "USD";
  const status: string = body.status ?? "trial";
  const billingCycle: string | null =
    body.billingCycle ?? (plan === "starter" || plan === "growth" || plan === "enterprise"
      ? "monthly"
      : null);
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const trialEnds = body.trialEnds
    ? new Date(body.trialEnds)
    : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const endDate = body.endDate ? new Date(body.endDate) : null;
  const notes: string | null = body.notes ? String(body.notes) : null;

  const discountType: string | null =
    body.discountType === "percentage" || body.discountType === "fixed"
      ? body.discountType
      : null;
  const discountValue: number | null =
    typeof body.discountValue === "number" ? body.discountValue : null;
  const taxRate: number | null =
    typeof body.taxRate === "number" ? body.taxRate : null;

  const { discountAmount, taxAmount, totalAmount } = computeSubscriptionTotals({
    amount,
    discountType,
    discountValue,
    taxRate,
  });

  const sub = await db.subscription.create({
    data: {
      customerId,
      plan,
      status,
      amount,
      currency,
      startDate,
      trialEnds,
      endDate,
      discountType,
      discountValue,
      discountAmount,
      taxRate,
      taxAmount,
      totalAmount,
      billingCycle,
      notes,
    },
  });
  return NextResponse.json({
    id: sub.id,
    ok: true,
    discountAmount,
    taxAmount,
    totalAmount,
  });
}
