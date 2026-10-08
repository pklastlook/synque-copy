import * as Sentry from "@sentry/nextjs";

/**
 * Sentry — SERVER (Node.js runtime) config.
 *
 * Covers the Next.js Node.js server runtime:
 *   - API routes (`src/app/api/*`)
 *   - Server Components (RSC)
 *   - Server Actions
 *   - `getServerSideProps`-equivalent work (App Router data fetchers)
 *
 * Loaded automatically by `@sentry/nextjs` via instrumentation hooks
 * injected at build time. DO NOT import this file directly.
 *
 * The server DSN is the same as the browser DSN (`SENTRY_DSN` env var).
 * Sentry routes events to the right project based on the DSN's project
 * slug, not based on whether they came from the client or server.
 */

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  // Sample 100% of server-side transactions: API route handlers are the
  // most important place to spot slow queries / external API latency.
  // Drop this to 0.1 in production if the event volume is too high.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.5 : 1.0,
  environment: process.env.NODE_ENV ?? "development",
  enabled: !!SENTRY_DSN && !SENTRY_DSN.includes("xxx"),
  beforeSend(event) {
    if (!SENTRY_DSN || SENTRY_DSN.includes("xxx")) return null;
    return event;
  },
});
