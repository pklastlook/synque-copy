import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe, toStripeAmount } from "@/lib/stripe";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/create-checkout-session
 *
 * Auth required. Creates a Stripe Checkout Session for a subscription
 * purchase (or upgrade/downgrade) and returns the URL the browser should
 * redirect to (`stripe.redirectToCheckout({ url })`).
 *
 * Body:
 *   - subscriptionId?: string — when paying for an *existing* subscription
 *     row, the authoritative amount/discount/tax is pulled from the DB so
 *     the client can never undercharge.
 *   - planName:    string — shown on the Stripe Checkout page (e.g.
 *     "Growth"). Required when `subscriptionId` is omitted.
 *   - amount?:     number  — base plan price (major unit, e.g. 499).
 *     Required when `subscriptionId` is omitted.
 *   - currency?:   string  — defaults to "USD".
 *   - customerId?: string  — super-admins can pay on behalf of any tenant;
 *     tenant users are auto-bound to their own customer.
 *
 * Returns: `{ url }` (a Stripe-hosted URL — the client should redirect to it).
 *
 * success_url = `${origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`
 * cancel_url  = `${origin}/billing?canceled=true`
 *
 * The webhook (/api/stripe/webhook) listens for `checkout.session.completed`
 * + `payment_intent.succeeded` and flips the matching Payment row to
 * `status="completed"`, activates the subscription, generates a paid
 * invoice, and credits the owner's bank account.
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

  // ===== Resolve amount + subscription linkage + plan name. =====
  let subscriptionId: string | null = null;
  let planName: string;
  let baseAmount: number;
  let currency: string = typeof body.currency === "string" ? body.currency : "USD";

  if (typeof body.subscriptionId === "string" && body.subscriptionId.trim().length > 0) {
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
    planName =
      typeof body.planName === "string" && body.planName.trim().length > 0
        ? body.planName.trim()
        : sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
    baseAmount = Number.isFinite(sub.amount) ? sub.amount : 0;
    currency = sub.currency ?? currency;
  } else {
    if (typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json(
        { error: "amount (number, > 0) is required when subscriptionId is omitted" },
        { status: 400 },
      );
    }
    if (typeof body.planName !== "string" || body.planName.trim().length === 0) {
      return NextResponse.json(
        { error: "planName is required when subscriptionId is omitted" },
        { status: 400 },
      );
    }
    baseAmount = body.amount;
    planName = body.planName.trim();
  }

  // ===== Resolve the owner's default bank account for the eventual credit. =====
  const bankAccount =
    (await db.bankAccount.findFirst({
      where: { customerId: null, isDefault: true },
    })) ??
    (await db.bankAccount.findFirst({
      where: tenantWhere(scope) as { customerId?: string },
      orderBy: { isDefault: "desc" },
    }));
  const bankAccountId = bankAccount?.id ?? null;

  // ===== Build absolute success / cancel URLs from the request origin. =====
  const origin = new URL(req.url).origin;
  const successUrl = `${origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/billing?canceled=true`;

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Stripe's automatic payment methods surface card, Apple Pay, Google
    // Pay, Link, etc. based on the customer's locale — no need to pin a
    // specific set. (`payment_method_types` was removed from
    // SessionCreateParams in stripe-node v23.)
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toStripeAmount(baseAmount, currency),
          product_data: {
            name: `${planName} plan`,
            description: `${planName} plan subscription — billed once now via Stripe Checkout.`,
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      customerId,
      subscriptionId: subscriptionId ?? "",
      planName,
      userId: user!.userId,
      source: "synque-billing",
    },
    customer_email: user!.email,
    // PaymentIntent-level metadata is what the webhook actually sees on
    // `payment_intent.succeeded` events, so mirror it there too.
    payment_intent_data: {
      metadata: {
        customerId,
        subscriptionId: subscriptionId ?? "",
        planName,
        userId: user!.userId,
        source: "synque-billing",
      },
    },
  });

  // ===== Persist a *pending* Payment row linked to the Checkout Session.
  //       The webhook updates it to `status="completed"` when Stripe fires
  //       `payment_intent.succeeded` (the PaymentIntent id is only known
  //       after the session is paid — we update it then). =====
  const payment = await db.payment.create({
    data: {
      subscriptionId,
      customerId,
      amount: baseAmount,
      currency,
      method: "card",
      status: "pending",
      transactionId: session.id, // cs_test_xxx — provisional; webhook rewrites
      stripeSessionId: session.id,
      bankAccountId,
    },
  });

  await audit(req, user!.userId, "stripe.checkout_session.created", {
    targetType: "payment",
    targetId: payment.id,
    metadata: {
      sessionId: session.id,
      amount: baseAmount,
      currency,
      subscriptionId,
      planName,
    },
  });

  return NextResponse.json({
    ok: true,
    url: session.url,
    sessionId: session.id,
    paymentId: payment.id,
  });
}
