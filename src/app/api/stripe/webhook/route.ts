import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { computeBillingTotals } from "@/lib/billing";

// CRITICAL: this route is invoked by Stripe (not by a logged-in user), so it
// MUST skip JWT auth. The middleware's PUBLIC_ROUTES allowlist includes
// `/api/stripe/webhook` for exactly this reason — see src/middleware.ts.
//
// Authentication is instead enforced by the Stripe webhook signature: every
// request from Stripe includes a `Stripe-Signature` header that we verify
// against `STRIPE_WEBHOOK_SECRET`. Any request without a valid signature
// is rejected with 400.

export const dynamic = "force-dynamic";

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe webhook events and reconciles them against the matching
 * Payment row. Public endpoint (no JWT) — verified via Stripe signature.
 *
 * Events handled:
 *   - `checkout.session.completed`         — checkout flow success
 *   - `payment_intent.succeeded`           — direct-PaymentIntent flow success
 *   - `payment_intent.payment_failed`      — mark Payment as failed
 *   - `checkout.session.async_payment_failed` — mark Payment as failed
 *
 * Side effects on success (run at most once per Payment — idempotent):
 *   1. Payment.status → "completed" (with stripePaymentIntentId stamped
 *      if it wasn't already, e.g. for the checkout flow where the row was
 *      created from a Session id before the PaymentIntent id was known).
 *   2. The linked Subscription (if any) is flipped to `status="active"`.
 *   3. A paid Invoice is generated for the current billing period (mirrors
 *      `/api/payments` POST: same `computeBillingTotals` math, same
 *      `subscription:<id>|payment:<id>` fingerprint for idempotency).
 *   4. The owner's default BankAccount is linked to the Payment (already
 *      set when the row was created; the analytics route sums it up).
 *
 * Returns 200 OK for every event Stripe might fire (even unknown ones) so
 * Stripe doesn't keep retrying. Only signature-verification failures and
 * DB connection errors produce non-200 responses.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  // Stripe needs the RAW body — `req.text()` preserves the exact bytes.
  // (Next.js Route Handlers normally parse JSON for us; we opt out here.)
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe/webhook] signature verification failed:", msg);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${msg}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutCompleted(stripe, event);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event);
        break;
      case "payment_intent.payment_failed":
      case "checkout.session.async_payment_failed":
        await handlePaymentFailed(event);
        break;
      default:
        // Acknowledge unhandled event types so Stripe stops retrying.
        console.log(`[stripe/webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    // Surface the error to Stripe — they'll retry with exponential backoff.
    // Most failures here are transient DB hiccups.
    console.error(
      "[stripe/webhook] handler error:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// ----------------------------------------------------------------------------
// Success handlers
// ----------------------------------------------------------------------------

/**
 * Handle `checkout.session.completed` — fires when a Stripe Checkout Session
 * is fully paid. Looks up our Payment row by `stripeSessionId`, stamps the
 * PaymentIntent id onto it (we didn't know it at session-creation time),
 * then runs the standard success side effects (activate sub, generate paid
 * invoice, link bank account).
 */
async function handleCheckoutCompleted(
  stripe: Stripe,
  event: Stripe.Event,
) {
  const session = event.data.object as Stripe.Checkout.Session;
  if (!session.id) return;

  const payment = await db.payment.findFirst({
    where: { stripeSessionId: session.id },
  });
  if (!payment) {
    console.warn(
      `[stripe/webhook] no Payment row for checkout session ${session.id} — ignoring`,
    );
    return;
  }

  // Stamp the PaymentIntent id onto the row (we couldn't know it at
  // session-creation time — Stripe only creates it when the session is
  // paid). Idempotent: if it's already set, leave it alone.
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  await runSuccessSideEffects({
    payment,
    stripePaymentIntentId: paymentIntentId,
    cardLast4: null, // Checkout doesn't expose card details on the session
    cardBrand: null,
    // Stripe returns a Stripe-generated transaction id we can store for
    // reconciliation; falls back to the existing transactionId.
    transactionId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : payment.transactionId,
  });
}

/**
 * Handle `payment_intent.succeeded` — fires for both the direct-PaymentIntent
 * flow (Stripe Elements) and after a Checkout Session completes. For the
 * direct flow we look up the Payment by `stripePaymentIntentId`. For the
 * checkout flow the row may still be missing the PaymentIntent id (if the
 * `checkout.session.completed` event hasn't arrived yet) — we fall back to
 * matching by metadata (customerId + subscriptionId).
 */
async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent;
  if (!pi.id) return;

  // Pull the charge details (card last4 + brand) so we can record them on
  // the Payment row for reconciliation. `latest_charge` is the charge id
  // string on the PaymentIntent object in stripe-node v23.
  let cardLast4: string | null = null;
  let cardBrand: string | null = null;
  const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null;
  if (chargeId) {
    try {
      const charge = await getStripe().charges.retrieve(chargeId);
      const pm = charge.payment_method_details;
      if (pm?.card) {
        cardLast4 = pm.card.last4 ?? null;
        cardBrand = pm.card.brand ?? null;
      }
    } catch {
      // Non-fatal — leave cardLast4/cardBrand null.
    }
  }

  // Primary lookup: by stripePaymentIntentId.
  let payment = await db.payment.findFirst({
    where: { stripePaymentIntentId: pi.id },
  });

  // Fallback: by metadata + pending status (checkout flow, before
  // checkout.session.completed handler ran).
  if (!payment) {
    const customerId = pi.metadata?.customerId;
    const subscriptionId = pi.metadata?.subscriptionId;
    if (customerId && subscriptionId) {
      payment = await db.payment.findFirst({
        where: { customerId, subscriptionId, status: "pending" },
        orderBy: { createdAt: "desc" },
      });
    } else if (customerId) {
      payment = await db.payment.findFirst({
        where: { customerId, status: "pending" },
        orderBy: { createdAt: "desc" },
      });
    }
    if (payment) {
      // Stamp the PaymentIntent id now so subsequent events match.
      await db.payment.update({
        where: { id: payment.id },
        data: { stripePaymentIntentId: pi.id },
      });
    }
  }

  if (!payment) {
    console.warn(
      `[stripe/webhook] no Payment row for PaymentIntent ${pi.id} — ignoring`,
    );
    return;
  }

  await runSuccessSideEffects({
    payment,
    stripePaymentIntentId: pi.id,
    cardLast4,
    cardBrand,
    transactionId: pi.id,
  });
}

/**
 * Run the success side effects for a Payment row.
 *
 * Idempotent: if the Payment is already `completed`, this is a no-op
 * (Stripe can fire `checkout.session.completed` + `payment_intent.succeeded`
 * back-to-back for the same payment).
 */
async function runSuccessSideEffects(opts: {
  payment: { id: string; customerId: string; subscriptionId: string | null; status: string };
  stripePaymentIntentId: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  transactionId: string | null;
}) {
  const { payment, stripePaymentIntentId, cardLast4, cardBrand, transactionId } = opts;

  // Idempotency guard — already completed, nothing to do.
  if (payment.status === "completed") {
    return;
  }

  // 1) Flip the Payment row to completed + stamp the Stripe fields.
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "completed",
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      cardLast4,
      cardBrand,
      transactionId,
    },
  });

  // 2) Activate the linked Subscription (if any) + 3) generate a paid
  //    invoice. Mirrors the side-effect block in POST /api/payments.
  if (payment.subscriptionId) {
    const sub = await db.subscription.findUnique({
      where: { id: payment.subscriptionId },
    });
    if (sub) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { status: "active" },
      });

      // Generate a paid invoice — idempotent on the
      // `subscription:<id>|payment:<paymentId>` fingerprint.
      const fingerprint = `subscription:${sub.id}|payment:${payment.id}`;
      const existing = await db.invoice.findFirst({
        where: { customerId: payment.customerId, notes: { contains: fingerprint } },
      });
      if (!existing) {
        const cycle = sub.billingCycle ?? "monthly";
        const CYCLE_DAYS: Record<string, number> = {
          monthly: 30,
          quarterly: 90,
          yearly: 365,
        };
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
            customerId: payment.customerId,
            items: JSON.stringify(items),
            subtotal: baseAmount,
            discountType: sub.discountType,
            discountValue: sub.discountValue,
            discountAmount,
            taxRate,
            taxAmount,
            total,
            status: "paid",
            notes: `Paid via Stripe (PaymentIntent ${stripePaymentIntentId ?? "?"})${cardLast4 ? ` · •••• ${cardLast4}` : ""}. ${fingerprint}`,
          },
        });
        // Link the Payment to the newly-created invoice.
        await db.payment.update({
          where: { id: payment.id },
          data: { invoiceId: invoice.id },
        });
      }
    }
  }

  console.log(
    `[stripe/webhook] payment ${payment.id} marked completed (PI ${stripePaymentIntentId ?? "—"})`,
  );
}

// ----------------------------------------------------------------------------
// Failure handler
// ----------------------------------------------------------------------------

/**
 * Handle `payment_intent.payment_failed` + `checkout.session.async_payment_failed`
 * — mark the linked Payment row as `failed`.
 */
async function handlePaymentFailed(event: Stripe.Event) {
  let paymentIntentId: string | null = null;
  let sessionId: string | null = null;
  let customerId: string | null = null;
  let subscriptionId: string | null = null;

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    paymentIntentId = pi.id;
    customerId = pi.metadata?.customerId ?? null;
    subscriptionId = pi.metadata?.subscriptionId || null;
  } else {
    // checkout.session.async_payment_failed
    const session = event.data.object as Stripe.Checkout.Session;
    sessionId = session.id;
    customerId = session.metadata?.customerId ?? null;
    subscriptionId = session.metadata?.subscriptionId || null;
    paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : null;
  }

  // Try PaymentIntent id first, then session id, then metadata fallback.
  let payment = paymentIntentId
    ? await db.payment.findFirst({ where: { stripePaymentIntentId: paymentIntentId } })
    : null;
  if (!payment && sessionId) {
    payment = await db.payment.findFirst({ where: { stripeSessionId: sessionId } });
  }
  if (!payment && customerId && subscriptionId) {
    payment = await db.payment.findFirst({
      where: { customerId, subscriptionId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!payment) {
    console.warn(
      `[stripe/webhook] no Payment row for failed ${event.type} (${paymentIntentId ?? sessionId ?? "no id"})`,
    );
    return;
  }

  if (payment.status === "failed" || payment.status === "completed") {
    // Idempotent — already terminal.
    return;
  }

  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "failed",
      stripePaymentIntentId: paymentIntentId ?? payment.stripePaymentIntentId,
    },
  });

  console.warn(
    `[stripe/webhook] payment ${payment.id} marked FAILED (PI ${paymentIntentId ?? "—"}, session ${sessionId ?? "—"})`,
  );
}
