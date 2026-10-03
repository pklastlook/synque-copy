/**
 * In-memory token-bucket / sliding-window rate limiter.
 *
 * No external dependency (Redis, Upstash) — uses a process-local `Map`.
 * Fine for a single-instance deployment. For multi-instance production,
 * switch to `@upstash/ratelimit` + Redis (drop-in: same function shape).
 *
 * Lives in `src/lib/` so it's importable from the Edge runtime middleware
 * (no Node-only APIs used — only `Date.now()`, `Map`, and `setInterval`).
 */

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

// Cleanup expired buckets every 60s to avoid memory leak.
// `setInterval` is fine here — module is loaded once per Edge runtime instance.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000);

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count++;
  return {
    success: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/**
 * Convenience: rate-limit by IP address.
 * Returns `null` if the request is allowed, or a header+status payload
 * the caller can use to build a 429 response.
 */
export function rateLimitByIp(
  req: Request,
  limit: number,
  windowMs: number
): null | { status: number; headers: Record<string, string> } {
  const ip =
    req.headers
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const result = rateLimit(`ip:${ip}`, limit, windowMs);
  if (result.success) return null;
  return {
    status: 429,
    headers: {
      "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(result.resetAt),
    },
  };
}
