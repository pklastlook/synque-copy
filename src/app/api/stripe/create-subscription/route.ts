import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createStripeSubscription,
  findOrCreateStripeCustomer,
  createCustomerPortalSession,
} from "@/lib/stripe";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { computeBillingTotals } from "@/lib/billing";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/create-subscription
 *
 * Auth required. Creates a *recurring* Stripe Subscription (auto-charges on
 * each renewal) for a tenant's plan, and links the Stripe Subscription id
 * back to our internal Subscription record. The browser mounts Stripe Elements
 * with the returned `clientSecret` to collect the card on the first invoice;
 * subsequent renewals are auto-charged by Stripe on each `current_period_end`.
 *
 * Body:
 *   - subscriptionId?: string  — when present, the authoritative
 *     amount/plan/currency is pulled from the existing Subscription row so
 *     the client can never undercharge. When omitted, a brand-new
 *     Subscription row is created from `planName` + `amount` + `currency`.
 *   - planName:      string   — shown on the Stripe invoice + Customer Portal
 *     (e.g. "Growth"). Required when `subscriptionId` is omitted.
 *   - amount?:       number   — base plan price (major unit, e.g. 499).
 *     Required when `subscriptionId` is omitted.
 *   - currency?:     string   — defaults to "USD".
 *   - billingCycle?: "monthly" | "yearly"  — defaults to "monthly".
 *
 * Side effects:
 *   1. Resolves (or mints) a Stripe Customer object by email — so a tenant
 *      always reuses the same Stripe Customer across subscription cycles.
 *   2. Stamps `stripeCustomerId` on the internal Customer (best-effort — the
 *      Customer model doesn't have a stripe column, so we persist it on the
 *      Subscription row only).
 *   3. Creates a Stripe Product + recurring Price + Subscription with
 *      `payment_behavior: "default_incomplete"` — the first invoice's
 *      PaymentIntent client secret is returned for Stripe Elements.
 *   4. Stamps `stripeSubscriptionId` + `stripeCustomerId` + `stripeStatus`
 *      on our internal Subscription row so the /billing page can show
 *      "Auto-renew: ON" + "Next charge: <date>" without an extra API call.
 *
 * Returns:
 *   - { ok, stripeSubscriptionId, clientSecret, subscriptionId } on success
 *   - { error } + 4xx/5xx on validation failure
 *
 * The Stripe webhook (/api/stripe/webhook) listens for `invoice.paid` +
 * `invoice.payment_failed` events to record renewals, fire notifications,
 * and trigger the dunning sequence (see src/lib/dunning.ts).
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

  // ===== Resolve the internal Subscription row (existing or new). =====
  let subscriptionId: string;
  let planName: string;
  let baseAmount: number;
  let currency: string = typeof body.currency === "string" ? body.currency : "USD";
  let billingCycle: "monthly" | "yearly" =
    body.billingCycle === "yearly" ? "yearly" : "monthly";

  if (typeof body.subscriptionId === "string" && body.subscriptionId.trim().length > 0) {
    const sub = await db.subscription.findFirst({
      where: {
        id: body.subscriptionId,
        ...tenantWhere(scope) as { customerId?: string },
      },
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
    // If the existing Subscription has a billingCycle, prefer it over the body.
    if (sub.billingCycle === "yearly") {
      billingCycle = "yearly";
    } else {
      // "monthly" + "quarterly" (treated as monthly — Stripe doesn't natively
      // support quarterly) + null all fall back to monthly.
      billingCycle = "monthly";
    }
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

    // Compute the final charge amount (no discount/tax for new subs from
    // the /billing flow — admins can apply discounts via the Subscriptions API).
    const totals = computeBillingTotals({
      base: baseAmount,
      taxRate: 0,
    });

    // Create a new Subscription row in our DB first so we have an id to
    // stamp on the Stripe Subscription's metadata.
    const sub = await db.subscription.create({
      data: {
        customerId,
        plan: planName.toLowerCase(),
        status: "trial", // flipped to "active" by the webhook on first payment
        amount: baseAmount,
        currency,
        billingCycle,
        startDate: new Date(),
        trialEnds: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        totalAmount: totals.total,
      },
    });
    subscriptionId = sub.id;
  }

  if (baseAmount <= 0) {
    return NextResponse.json(
      { error: "amount must be greater than 0" },
      { status: 400 },
    );
  }

  // ===== Resolve the customer record so we know their email + name. =====
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { id: true, email: true, name: true },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer record not found" }, { status: 404 });
  }
  if (!customer.email) {
    return NextResponse.json(
      { error: "Customer has no email on file — Stripe requires an email to create a Customer" },
      { status: 400 },
    );
  }

  try {
    // 1) Reuse (or mint) a Stripe Customer object for this tenant's email.
    const stripeCustomer = await findOrCreateStripeCustomer({
      email: customer.email,
      name: customer.name,
      internalCustomerId: customer.id,
    });

    // 2) Create the recurring Stripe Subscription + the first invoice.
    const created = await createStripeSubscription({
      customerId: customer.id,
      stripeCustomerId: stripeCustomer.id,
      priceAmount: baseAmount,
      currency,
      interval: billingCycle === "yearly" ? "year" : "month",
      subscriptionId,
      planName,
    });

    // 3) Stamp our Subscription row with the Stripe ids so the webhook +
    //    /billing page can resolve the Stripe object back to our record.
    await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        stripeCustomerId: stripeCustomer.id,
        stripeSubscriptionId: created.stripeSubscriptionId,
        stripeStatus: "incomplete", // → "active" after the first invoice.paid
      },
    });

    await audit(req, user!.userId, "stripe.subscription.created", {
      targetType: "subscription",
      targetId: subscriptionId,
      metadata: {
        stripeSubscriptionId: created.stripeSubscriptionId,
        stripeCustomerId: stripeCustomer.id,
        amount: baseAmount,
        currency,
        billingCycle,
        planName,
      },
    });

    return NextResponse.json({
      ok: true,
      stripeSubscriptionId: created.stripeSubscriptionId,
      stripeCustomerId: stripeCustomer.id,
      clientSecret: created.clientSecret ?? null,
      subscriptionId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/stripe/create-subscription] failed:", msg);
    return NextResponse.json(
      { error: `Failed to create Stripe subscription: ${msg}` },
      { status: 500 },
    );
  }
}

/**
 * GET /api/stripe/create-subscription?portal=true
 *
 * Auth required. Creates a Stripe Customer Portal session for the caller's
 * active subscription and returns the URL the browser should redirect to.
 * The portal lets the user update their card, swap plans, view past invoices,
 * and cancel their subscription — all hosted by Stripe.
 *
 * Returns: `{ url }`
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  // Find the caller's most recent Subscription that has a Stripe Customer id.
  const sub = await db.subscription.findFirst({
    where: {
      ...tenantWhere(scope) as { customerId?: string },
      stripeCustomerId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, stripeCustomerId: true, stripeStatus: true },
  });
  if (!sub || !sub.stripeCustomerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file for this account. Subscribe to a plan first." },
      { status: 404 },
    );
  }

  const origin = new URL(req.url).origin;
  const returnUrl = `${origin}/billing`;

  try {
    const { url } = await createCustomerPortalSession({
      stripeCustomerId: sub.stripeCustomerId,
      returnUrl,
    });
    await audit(req, user!.userId, "stripe.customer_portal.session_created", {
      targetType: "subscription",
      targetId: sub.id,
      metadata: { stripeCustomerId: sub.stripeCustomerId },
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[api/stripe/create-subscription GET] portal session failed:", msg);
    return NextResponse.json(
      { error: `Failed to create Stripe Customer Portal session: ${msg}` },
      { status: 500 },
    );
  }
}
