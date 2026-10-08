import Stripe from "stripe";

/**
 * Stripe server-side client.
 *
 * Lazily constructed so importing this module never throws at boot if
 * STRIPE_SECRET_KEY is missing (e.g. during local dev before the user has
 * populated their Stripe keys). Routes that actually need Stripe will get
 * a clean, actionable error message instead of a startup crash.
 *
 * The webhook route uses `stripe.webhooks.constructEvent` with the raw
 * request body — that helper is exposed on the same instance.
 */

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env (see STRIPE_SECRET_KEY in .env.example)."
    );
  }
  // apiVersion: pinned to a known-good shape — keeps TypeScript types stable
  // across stripe-node minor versions. Override only on major upgrades.
  cached = new Stripe(secretKey, {
    apiVersion: "2026-09-30.endive" as Stripe.LatestApiVersion,
    typescript: true,
  });
  return cached;
}

/**
 * Convert a major-unit amount (e.g. $299.00) to Stripe's smallest-currency-unit
 * integer (e.g. 29900 cents). Stripe requires integer amounts for
 * PaymentIntents + Checkout Sessions.
 *
 * Zero-decimal currencies (JPY, KRW, etc.) are NOT multiplied — but we don't
 * need to special-case them here because the existing data model stores
 * every amount in major units (USD only at the moment). When a
 * zero-decimal currency is added, branch on `currency` here.
 */
export function toStripeAmount(major: number, currency = "USD"): number {
  const safe = Number.isFinite(major) ? major : 0;
  return Math.round(safe * 100);
}
