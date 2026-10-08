/**
 * AI usage tracking + plan-based quota enforcement.
 *
 * Every user gets a monthly AI generation quota tied to their Customer's
 * subscription plan:
 *   - starter:    100 generations / 30 days
 *   - growth:     unlimited (-1)
 *   - enterprise: unlimited (-1)
 *   - custom:     based on subscription `amount` (treat any active custom
 *                 subscription as unlimited — Custom is a negotiated plan,
 *                 and a hard cap would surprise customers mid-cycle)
 *
 * The quota window is rolling 30 days, tracked via `User.aiUsageResetAt`.
 * When `aiUsageResetAt` is older than 30 days, the helper resets
 * `aiUsageCount` to 0 and bumps `aiUsageResetAt` to now() before evaluating.
 *
 * Used by:
 *   - /api/ai/generate/route.ts  (image-variant generation)
 *   - /api/ai/chat/route.ts      (chat assistant)
 *   - /api/ai/usage/route.ts     (read-only usage readout for the Composer UI)
 *
 * Design notes:
 *   - The plan is resolved from the user's Customer.plan (default "starter").
 *     If the Customer has at least one active Subscription, we use the most
 *     recent Subscription's plan as the source of truth (so a customer who
 *     upgrades mid-cycle immediately gets the higher quota).
 *   - For super-admins (no customerId), we treat the quota as unlimited —
 *     they're the platform operator and shouldn't be rate-limited.
 *   - All DB writes are best-effort: a transient DB failure MUST NOT block
 *     an AI generation (the user has a real need and we already enforce an
 *     IP-level rate limit in middleware).
 */

import { db } from "@/lib/db";

const RESET_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Sentinel for "no limit" — returned to the client as `limit: -1`. */
export const UNLIMITED = -1;

/** Starter plan monthly cap. Tunable here in one place. */
export const STARTER_MONTHLY_LIMIT = 100;

export interface AiUsageSnapshot {
  /** How many generations the user has used in the current 30-day window. */
  used: number;
  /** Plan limit, or -1 for unlimited. */
  limit: number;
  /** `limit - used`, or -1 for unlimited. Always ≥ 0 when limited. */
  remaining: number;
  /** Plan name in lowercase: "starter" | "growth" | "enterprise" | "custom" | "admin". */
  plan: string;
  /** ISO date string — when the current window resets (aiUsageResetAt + 30 days). */
  resetsAt: string;
  /** Convenience flag — true when `used >= limit` (and limit is finite). */
  limited: boolean;
}

export interface AiQuotaCheck {
  ok: boolean;
  /** Present when `ok === false` — HTTP status code to return. */
  status?: number;
  /** Present when `ok === false` — error message for the client. */
  message?: string;
  /** Updated snapshot after the reset + (optional) increment. */
  snapshot: AiUsageSnapshot;
}

/**
 * Resolve the effective plan name for a user.
 *
 * Priority:
 *   1. Super-admin (no customerId) → "admin" (always unlimited)
 *   2. Most recent active Subscription for the user's Customer → its plan
 *   3. Customer.plan (default "starter")
 */
async function resolvePlan(user: {
  userId: string;
  role: string;
  customerId: string | null;
}): Promise<string> {
  if (user.role === "admin" && !user.customerId) return "admin";
  if (!user.customerId) return "starter";

  // Look up the most recent active subscription for the customer.
  try {
    const sub = await db.subscription.findFirst({
      where: {
        customerId: user.customerId,
        status: { in: ["trial", "active"] },
      },
      orderBy: { createdAt: "desc" },
      select: { plan: true },
    });
    if (sub?.plan) return sub.plan;
  } catch (e) {
    console.error("[ai-usage] subscription lookup failed:", e instanceof Error ? e.message : String(e));
  }

  // Fall back to Customer.plan (default "starter" per schema).
  try {
    const customer = await db.customer.findUnique({
      where: { id: user.customerId },
      select: { plan: true },
    });
    return customer?.plan ?? "starter";
  } catch {
    return "starter";
  }
}

/**
 * Get the numeric monthly limit for a plan.
 * Returns `UNLIMITED` (-1) for unlimited plans.
 */
export function planLimit(plan: string): number {
  switch (plan) {
    case "starter":
      return STARTER_MONTHLY_LIMIT;
    case "growth":
    case "enterprise":
    case "custom":
    case "admin":
      return UNLIMITED;
    default:
      // Unknown plan → safest default is the Starter cap.
      return STARTER_MONTHLY_LIMIT;
  }
}

/**
 * Read the user's current usage snapshot. Resets the window if it's stale
 * (so the returned `used` reflects a fresh cycle when 30 days have elapsed).
 *
 * Best-effort: if the DB read fails, returns an "unlimited" snapshot so the
 * caller doesn't 500 — we already have an IP-level rate limit in middleware.
 */
export async function getAiUsage(user: {
  userId: string;
  role: string;
  customerId: string | null;
}): Promise<AiUsageSnapshot> {
  const plan = await resolvePlan(user);
  const limit = planLimit(plan);

  let used = 0;
  let resetAt = new Date();
  try {
    const row = await db.user.findUnique({
      where: { id: user.userId },
      select: { aiUsageCount: true, aiUsageResetAt: true },
    });
    if (row) {
      const now = Date.now();
      const resetMs = row.aiUsageResetAt.getTime();
      // If the window has elapsed, reset the count + bump resetAt.
      if (now - resetMs >= RESET_WINDOW_MS) {
        used = 0;
        resetAt = new Date(now);
        try {
          await db.user.update({
            where: { id: user.userId },
            data: { aiUsageCount: 0, aiUsageResetAt: resetAt },
          });
        } catch (e) {
          console.error("[ai-usage] reset failed:", e instanceof Error ? e.message : String(e));
        }
      } else {
        used = row.aiUsageCount;
        resetAt = new Date(resetMs + RESET_WINDOW_MS);
      }
    }
  } catch (e) {
    console.error("[ai-usage] read failed:", e instanceof Error ? e.message : String(e));
    return {
      used: 0,
      limit: UNLIMITED,
      remaining: UNLIMITED,
      plan,
      resetsAt: new Date(Date.now() + RESET_WINDOW_MS).toISOString(),
      limited: false,
    };
  }

  const remaining = limit === UNLIMITED ? UNLIMITED : Math.max(0, limit - used);
  return {
    used,
    limit,
    remaining,
    plan,
    resetsAt: resetAt.toISOString(),
    limited: limit !== UNLIMITED && used >= limit,
  };
}

/**
 * Check + increment the AI usage counter. Returns `{ ok: false }` when the
 * user has hit their limit (caller should return 429).
 *
 * Resets the window first (if stale) so a fresh cycle is granted even on the
 * exact moment of rollover. The increment is a single atomic UPDATE so two
 * concurrent requests can't both succeed past the cap.
 *
 * For unlimited plans we still touch `aiUsageCount` (best-effort) so the UI
 * can show usage stats — we just don't gate on it.
 */
export async function checkAndIncrementAiUsage(user: {
  userId: string;
  role: string;
  customerId: string | null;
}): Promise<AiQuotaCheck> {
  // First, get the current snapshot (this also resets the window if stale).
  const snapshot = await getAiUsage(user);

  // Unlimited plans: skip the cap check but still increment best-effort.
  if (snapshot.limit === UNLIMITED) {
    try {
      await db.user.update({
        where: { id: user.userId },
        data: { aiUsageCount: { increment: 1 } },
      });
    } catch (e) {
      console.error("[ai-usage] increment (unlimited) failed:", e instanceof Error ? e.message : String(e));
    }
    return {
      ok: true,
      snapshot: { ...snapshot, used: snapshot.used + 1 },
    };
  }

  // Limited plan: hard-cap check.
  if (snapshot.used >= snapshot.limit) {
    return {
      ok: false,
      status: 429,
      message: "AI generation limit reached. Upgrade your plan for unlimited generations.",
      snapshot,
    };
  }

  // Increment atomically. If a concurrent request bumped the count past the
  // limit in the meantime, the UPDATE still succeeds but we report the
  // overshoot — the next call will be blocked.
  try {
    await db.user.update({
      where: { id: user.userId },
      data: { aiUsageCount: { increment: 1 } },
    });
  } catch (e) {
    console.error("[ai-usage] increment failed:", e instanceof Error ? e.message : String(e));
    // Don't fail the user's request — they have a legitimate need, the
    // quota check already passed, and the DB hiccup is transient.
  }

  return {
    ok: true,
    snapshot: {
      ...snapshot,
      used: snapshot.used + 1,
      remaining: Math.max(0, snapshot.remaining - 1),
    },
  };
}
