import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe, toStripeAmount } from "@/lib/stripe";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { computeBillingTotals } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/create-payment-intent
 *
 * Auth required. Creates a Stripe PaymentIntent for a subscription purchase
 * (or upgrade/downgrade) and persists a *pending* Payment row linked back to
 * the PaymentIntent id. The webhook (/api/stripe/webhook) flips the Payment
 * row to `status="completed"` when Stripe fires `payment_intent.succeeded`.
 *
 * Body:
 *   - subscriptionId?: string   — required when paying for an *existing*
 *     subscription row (we pull its `totalAmount` straight from the DB so the
 *     client can never undercharge). Omit when creating a brand-new
 *     subscription (e.g. checkout flow on /billing) — in that case pass:
 *       - amount:    number  — the base plan price (major unit, e.g. 299)
 *       - currency?: string  — defaults to "USD"
 *       - plan?:     string  — for metadata only ("starter" | "growth" | …)
 *   - customerId?: string   — super-admins can pay on behalf of any tenant;
 *     tenant users are auto-bound to their own customer.
 *
 * Returns: `{ clientSecret, paymentIntentId, paymentId, amount }`
 *
 * The amount charged always comes from the subscription's `totalAmount`
 * (with discount + tax already applied). When `subscriptionId` is omitted,
 * we compute `totalAmount` from the body's `amount` using the standard
 * billing math (`computeBillingTotals`) with no discount/tax.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json().catch(() => ({}));
  const customerId = scope.isSuperAdmin ? body.customerId : scope.customerId;
  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  // ===== Resolve amount + subscription linkage. =====
  let subscriptionId: string | null = null;
  let baseAmount: number;
  let currency: string = typeof body.currency === "string" ? body.currency : "USD";
  let plan: string | null = null;
  let discountType: string | null = null;
  let discountValue: number | null = null;
  let taxRate: number | null = null;

  if (typeof body.subscriptionId === "string" && body.subscriptionId.trim().length > 0) {
    // Existing subscription — pull authoritative totals from DB.
    const sub = await db.subscription.findFirst({
      where: { id: body.subscriptionId, ...tenantWhere(scope) as { customerId?: string } },
    });
    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found in your tenant scope" },
        { status: 404 },
      );
    }
    subscriptionId = sub.id;
    baseAmount = Number.isFinite(sub.amount) ? sub.amount : 0;
    currency = sub.currency ?? currency;
    plan = sub.plan;
    discountType = sub.discountType;
    discountValue = sub.discountValue;
    taxRate = sub.taxRate;
  } else {
    // Checkout-style flow: brand new subscription being purchased.
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "amount (number, > 0) is required when subscriptionId is omitted" },
        { status: 400 },
      );
    }
    baseAmount = body.amount;
    plan = typeof body.plan === "string" ? body.plan : null;
  }

  // ===== Compute the final charge amount (discount + tax already applied). =====
  const totals = computeBillingTotals({
    base: baseAmount,
    discountType,
    discountValue,
    taxRate: taxRate ?? 0,
  });
  const chargeAmountMajor = totals.total;
  if (chargeAmountMajor <= 0) {
    return NextResponse.json(
      { error: "Computed charge amount must be greater than 0" },
      { status: 400 },
    );
  }

  // ===== Resolve the owner's default bank account so the credit can be
  //       linked back to it once the webhook fires. Mirrors /api/payments. =====
  const bankAccount =
    (await db.bankAccount.findFirst({
      where: { customerId: null, isDefault: true },
    })) ??
    (await db.bankAccount.findFirst({
      where: tenantWhere(scope) as { customerId?: string },
      orderBy: { isDefault: "desc" },
    }));
  const bankAccountId = bankAccount?.id ?? null;

  const stripe = getStripe();

  // ===== Create the Stripe PaymentIntent. =====
  const paymentIntent = await stripe.paymentIntents.create({
    amount: toStripeAmount(chargeAmountMajor, currency),
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: {
      customerId,
      subscriptionId: subscriptionId ?? "",
      plan: plan ?? "",
      userId: user!.userId,
      source: "synque-billing",
    },
    description: plan
      ? `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan subscription`
      : "SYNQUE subscription purchase",
  });

  // ===== Persist a *pending* Payment row linked to the PaymentIntent. =====
  const payment = await db.payment.create({
    data: {
      subscriptionId,
      customerId,
      amount: chargeAmountMajor,
      currency,
      method: "card",
      status: "pending",
      transactionId: paymentIntent.id, // pi_xxx
      stripePaymentIntentId: paymentIntent.id,
      bankAccountId,
    },
  });

  await audit(req, user!.userId, "stripe.payment_intent.created", {
    targetType: "payment",
    targetId: payment.id,
    metadata: {
      paymentIntentId: paymentIntent.id,
      amount: chargeAmountMajor,
      currency,
      subscriptionId,
      plan,
    },
  });

  return NextResponse.json({
    ok: true,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    paymentId: payment.id,
    amount: chargeAmountMajor,
    currency,
  });
}
