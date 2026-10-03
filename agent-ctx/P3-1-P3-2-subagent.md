# Task ID: P3-1-P3-2 — subagent (security engineer)

## Task
Add rate limiting (P3-1) + strict Content-Security-Policy (P3-2) to the
existing `src/middleware.ts` global auth middleware.

## Files owned / changed
- `src/lib/rate-limit.ts` (NEW — 75 LOC)
- `src/middleware.ts` (MODIFIED)

## P3-1 — Rate limiting

### `src/lib/rate-limit.ts` (NEW)
- In-memory sliding-window rate limiter, no external deps.
- `rateLimit(identifier, limit, windowMs)` — bucket-per-identifier; new
  bucket starts at `count: 1` with `resetAt = now + windowMs`; rejects
  once `count >= limit`.
- `rateLimitByIp(req, limit, windowMs)` — extracts IP from
  `x-forwarded-for` (first hop, trimmed) → `x-real-ip` → `"unknown"`,
  calls `rateLimit`, returns either `null` (allow) or
  `{ status: 429, headers: { Retry-After, X-RateLimit-Limit,
  X-RateLimit-Remaining, X-RateLimit-Reset } }` (block).
- `setInterval(..., 60_000)` sweeps expired buckets so memory stays
  bounded under churn.
- Edge-runtime-safe: only uses `Date.now()`, `Map`, `setInterval`.

### `src/middleware.ts` rate-limit tiers
Inserted BEFORE the JWT verification (and BEFORE the public-route
early-return) so unauthenticated brute-force attempts are throttled
regardless of credentials:

1. **Auth endpoints** (10 req/min/IP) — `pathname.startsWith` on
   `/api/auth/login`, `/api/auth/signup`, `/api/auth/forgot-password`,
   `/api/auth/2fa`.
2. **AI endpoints** (20 req/min/IP) — `/api/ai/*` plus any path
   containing `/generate` or `/classify`.
3. **All other `/api/*` write endpoints** (60 req/min/IP) — POST / PATCH
   / DELETE only; GETs left uncapped (read-heavy + cacheable).

All blocked requests return `NextResponse.json({ error: ... }, { status: 429,
headers: blocked.headers })` with the standard rate-limit response headers.

## P3-2 — Strict Content-Security-Policy

Added to `addSecurityHeaders()`:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://abs.twimg.com https://pbs.twimg.com https://avatars.githubusercontent.com;
  connect-src 'self' https://*.up.railway.app wss://*.up.railway.app https://internal-api.z.ai;
  media-src 'self' https://res.cloudinary.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

- `'unsafe-inline' 'unsafe-eval'` retained in `script-src` because Next.js
  dev mode injects inline runtime chunks; production should tighten to a
  nonce/hash-based CSP once the build pipeline supports it.
- `frame-ancestors 'none'` complements `X-Frame-Options: DENY` (double
  coverage — modern browsers honor CSP, legacy ones honor XFO).
- `connect-src` allowlist mirrors the third-party origins actually used
  by `src/lib/zai.ts` (z.ai internal API) and any Railway-hosted mini
  services (HTTPS + WSS).

### Public-route header fix
Previously the `isPublicRoute(pathname)` branch returned
`NextResponse.next()` WITHOUT calling `addSecurityHeaders(res)`, so
public routes (login, signup, link-in-bio click tracker, etc.) shipped
without CSP / XFO / etc. Fixed: now they get the full header set.

## Lint
`cd /home/z/my-project && bun run lint` → exit 0, zero errors, zero warnings.

## Known follow-ups (out of scope)
- Swap in-memory limiter for `@upstash/ratelimit` + Redis when the app
  moves to multi-instance prod (same call signature → drop-in).
- Tighten `script-src` to nonce/hash-based CSP in production builds.
- Consider adding security headers to the `401` / `429` error responses
  returned from the middleware (currently they ship without, matching
  the pre-existing pattern; CSP still applies to the HTML 401 page
  rendered by Next's error boundary).
