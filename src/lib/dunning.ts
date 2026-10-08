/**
 * Dunning — automated payment-failure handling for Stripe recurring billing.
 *
 * When Stripe charges a recurring subscription and the card is declined,
 * Stripe fires `invoice.payment_failed`. We use Stripe's automatic retries
 * (Smart Retries, ~4 attempts over ~14 days) and tag each failed attempt
 * with a number (the attempt count from `invoice.attempt_count`).
 *
 * Our job here is to:
 *   - Bump the Subscription's `dunningAttempt` counter (idempotent per attempt).
 *   - Notify the tenant's users about each failure with escalating severity.
 *   - Cancel the subscription + clean up Stripe after the final attempt.
 *
 * The notification messages follow this escalating ladder:
 *
 *   Attempt 1 (immediate):   "Payment failed — please update your card"
 *   Attempt 2 (~3 days):     "Payment failed again — 3 days to update"
 *   Attempt 3 (~7 days):     "Subscription cancelled"  + sub.status=cancelled
 *
 * The actual retry schedule is owned by Stripe — we react to whatever
 * attempt_count Stripe sends us, so the messages stay accurate even if
 * Smart Retries is reconfigured.
 */

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getStripe } from "@/lib/stripe";

/**
 * Maximum dunning attempts before the subscription is cancelled. Beyond
 * this point Stripe has typically given up retrying, so we mark the
 * subscription cancelled in our DB and let Stripe expire it.
 */
export const MAX_DUNNING_ATTEMPTS = 3;

/**
 * Handle a Stripe `invoice.payment_failed` event for a recurring subscription.
 *
 * @param subscriptionId  Our internal Subscription row id (looked up via
 *                        the Stripe Subscription's metadata, or by
 *                        `stripeSubscriptionId`).
 * @param attempt         The Stripe `invoice.attempt_count` (1-indexed —
 *                        first failure = 1). When the caller can't determine
 *                        the attempt number, falls back to the Subscription's
 *                        stored `dunningAttempt + 1`.
 *
 * Behaviour:
 *   - Idempotent on attempt: if `dunningAttempt >= attempt`, no-op.
 *   - Updates `dunningAttempt` to the highest seen attempt.
 *   - Sets `stripeStatus = "past_due"` (mirrors Stripe's own state machine).
 *   - Fires an escalating notification to every user in the tenant.
 *   - At attempt >= MAX_DUNNING_ATTEMPTS: sets `status = "cancelled"` and
 *     attempts to cancel the Stripe Subscription (`stripe.subscriptions.cancel`)
 *     so Stripe stops retrying — our DB is the source of truth from here.
 */
export async function handlePaymentFailure(
  subscriptionId: string,
  attempt: number,
): Promise<{ ok: boolean; cancelled: boolean; attempt: number }> {
  const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 1;

  // Load the subscription row.
  const sub = await db.subscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      customerId: true,
      plan: true,
      status: true,
      stripeStatus: true,
      stripeSubscriptionId: true,
      dunningAttempt: true,
      amount: true,
      currency: true,
      billingCycle: true,
    },
  });
  if (!sub) {
    console.warn(
      `[dunning] subscription ${subscriptionId} not found — ignoring payment failure`,
    );
    return { ok: false, cancelled: false, attempt: safeAttempt };
  }

  // Idempotency: don't double-fire on the same attempt.
  if (sub.dunningAttempt >= safeAttempt) {
    return { ok: true, cancelled: sub.status === "cancelled", attempt: sub.dunningAttempt };
  }

  // Update the Subscription row to track the failed attempt + mark it
  // `past_due` (Stripe's own state machine uses `past_due` for subscriptions
  // with a failed renewal — we mirror it in our `stripeStatus` column).
  const shouldCancel = safeAttempt >= MAX_DUNNING_ATTEMPTS;
  await db.subscription.update({
    where: { id: sub.id },
    data: {
      dunningAttempt: safeAttempt,
      stripeStatus: shouldCancel ? "canceled" : "past_due",
      status: shouldCancel ? "cancelled" : sub.status,
    },
  });

  // Look up the tenant's users so we can fire notifications.
  const tenantUsers = await db.user.findMany({
    where: { customerId: sub.customerId },
    select: { id: true },
  });

  const cycleLabel = sub.billingCycle === "yearly" ? "Yearly" : "Monthly";
  const planLabel = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
  const amountFormatted = (sub.amount ?? 0).toLocaleString(undefined, {
    style: "currency",
    currency: sub.currency ?? "USD",
  });

  // Pick the notification message based on the attempt number.
  let title: string;
  let message: string;
  let sendEmail = true;

  if (shouldCancel) {
    // Attempt 3 (or higher) — final dunning step.
    title = "Subscription cancelled";
    message =
      `We couldn't charge your card after ${safeAttempt} attempt${safeAttempt === 1 ? "" : "s"}, ` +
      `so your ${planLabel} plan subscription has been cancelled. ` +
      `To continue using SYNQUE, resubscribe from /billing with an updated payment method.`;
  } else if (safeAttempt >= 2) {
    // Attempt 2 — escalate urgency.
    title = "Payment failed again — 3 days to update";
    message =
      `Your ${planLabel} plan renewal (${cycleLabel}, ${amountFormatted}) failed again. ` +
      `You have 3 days to update your card before the subscription is cancelled. ` +
      `Open /billing and click "Manage billing" to update your payment method.`;
  } else {
    // Attempt 1 — first failure.
    title = "Payment failed — please update your card";
    message =
      `Your ${planLabel} plan renewal (${cycleLabel}, ${amountFormatted}) couldn't be charged. ` +
      `Please update your card via the "Manage billing" button on /billing. ` +
      `Stripe will retry automatically over the next few days.`;
  }

  // Fire a notification to every user in the tenant. Best-effort — never throws.
  await Promise.all(
    tenantUsers.map((u) =>
      createNotification({
        userId: u.id,
        type: "payment_failed",
        title,
        message,
        actionView: "owner",
        actionId: sub.id,
        sendEmail,
      }).catch(() => null),
    ),
  );

  // If this was the final attempt, also cancel the Stripe Subscription so
  // Stripe stops retrying (our DB is now the source of truth — the user has
  // to resubscribe via /billing). Best-effort: if the Stripe API call fails
  // (e.g. Stripe is unreachable), the local `status="cancelled"` is still
  // the truth we want for the UI.
  if (shouldCancel && sub.stripeSubscriptionId) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      console.log(
        `[dunning] cancelled Stripe subscription ${sub.stripeSubscriptionId} for sub ${sub.id}`,
      );
    } catch (e) {
      console.error(
        "[dunning] failed to cancel Stripe subscription:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  console.log(
    `[dunning] sub ${sub.id} attempt ${safeAttempt}/${MAX_DUNNING_ATTEMPTS} ` +
      `→ ${shouldCancel ? "CANCELLED" : "past_due"}`,
  );

  return { ok: true, cancelled: shouldCancel, attempt: safeAttempt };
}
