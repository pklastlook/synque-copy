/**
 * Outbound Webhook delivery system.
 *
 * Tenants register webhook endpoints via /api/webhooks. When a subscribed
 * event fires (post.published, comment.received, payment.completed), the
 * system POSTs a JSON payload to each URL with an HMAC-SHA256 signature
 * header (X-Synque-Signature) computed over the raw body using the
 * webhook's `secret`.
 *
 * Best-effort: failures are logged but never thrown — a webhook delivery
 * failure MUST NOT break the user-facing request that triggered it
 * (e.g. publishing a post, recording a payment). Mirrors the contract of
 * `createNotification()` in src/lib/notifications.ts.
 *
 * Usage:
 *   import { triggerWebhook } from "@/lib/webhooks";
 *   await triggerWebhook(customerId, "post.published", {
 *     postId: p.id, title: p.title, status: "published",
 *   });
 */

import { createHmac } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Canonical event names. Keep in sync with the events advertised in the
 * OpenAPI spec at /api/docs and the Settings → Webhooks UI toggles.
 */
export const WEBHOOK_EVENTS = [
  "post.published",
  "comment.received",
  "payment.completed",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface TriggerWebhookResult {
  delivered: number;
  failed: number;
  errors: string[];
}

/**
 * Trigger all active webhooks subscribed to `event` for the given tenant.
 *
 * - `customerId` null is treated as super-admin (matches webhooks with
 *   `customerId IS NULL`). When the caller is tenant-scoped, only that
 *   tenant's webhooks are notified.
 * - The payload is built once per webhook (with timestamp + event id
 *   added) so receivers can dedupe if the same event is delivered twice.
 * - Delivery is parallel (`Promise.allSettled`) so a single slow endpoint
 *   can't stall the others.
 * - The HTTP timeout is 10 seconds per webhook. Failures (network error,
 *   non-2xx response) are logged + counted but do NOT throw.
 *
 * @returns {delivered, failed, errors} — best-effort summary. The caller
 *   MAY log these but MUST NOT block on them.
 */
export async function triggerWebhook(
  customerId: string | null,
  event: string,
  data: unknown,
): Promise<TriggerWebhookResult> {
  // Defensive — bad input shouldn't crash the caller.
  if (!event) {
    console.warn("[webhooks] triggerWebhook called with no event");
    return { delivered: 0, failed: 0, errors: ["no event provided"] };
  }

  let webhooks: { id: string; url: string; secret: string; events: string }[] = [];
  try {
    webhooks = await db.webhook.findMany({
      where: {
        customerId,
        active: true,
      },
      select: { id: true, url: true, secret: true, events: true },
    });
  } catch (e) {
    console.error(
      "[webhooks] DB lookup failed:",
      e instanceof Error ? e.message : String(e),
    );
    return { delivered: 0, failed: 0, errors: ["db lookup failed"] };
  }

  if (webhooks.length === 0) {
    return { delivered: 0, failed: 0, errors: [] };
  }

  // Filter to only webhooks whose `events` JSON array includes `event`.
  const subscribed = webhooks.filter((w) => {
    try {
      const events = JSON.parse(w.events) as string[];
      return Array.isArray(events) && events.includes(event);
    } catch {
      // Bad events JSON — treat as not subscribed (don't fire).
      return false;
    }
  });

  if (subscribed.length === 0) {
    return { delivered: 0, failed: 0, errors: [] };
  }

  // Stable event id (timestamp + random) + timestamp — included in every
  // payload so receivers can dedupe + verify freshness.
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const timestamp = new Date().toISOString();

  const results = await Promise.allSettled(
    subscribed.map((w) => deliver(w, event, data, eventId, timestamp)),
  );

  let delivered = 0;
  let failed = 0;
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      delivered++;
    } else {
      failed++;
      const w = subscribed[i];
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push(`webhook ${w?.id ?? "?"} (${w?.url ?? "?"}): ${msg}`);
    }
  });

  return { delivered, failed, errors };
}

/**
 * Deliver one webhook: build the payload, sign it, POST it, log the
 * outcome. Throws on any failure so `Promise.allSettled` can collect.
 */
async function deliver(
  webhook: { id: string; url: string; secret: string },
  event: string,
  data: unknown,
  eventId: string,
  timestamp: string,
): Promise<void> {
  const body = JSON.stringify({
    id: eventId,
    event,
    created_at: timestamp,
    data,
  });

  // HMAC-SHA256 signature over the raw body. Receivers verify by
  // computing the same HMAC with the shared secret + comparing.
  const sig = createHmac("sha256", webhook.secret).update(body).digest("hex");

  let res: Response;
  try {
    res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Synque-Signature": `sha256=${sig}`,
        "X-Synque-Event": event,
        "X-Synque-Delivery": eventId,
        "User-Agent": "Synque-Webhooks/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000),
      redirect: "error", // Don't follow redirects — surfaces misconfigured URLs.
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`fetch failed: ${msg}`);
  }

  if (!res.ok) {
    // Log response body for debugging (best-effort — truncate).
    const errText = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status}: ${errText.slice(0, 200) || res.statusText}`,
    );
  }
}
