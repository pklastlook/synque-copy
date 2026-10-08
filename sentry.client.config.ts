import * as Sentry from "@sentry/nextjs";

/**
 * Sentry — CLIENT (browser) config.
 *
 * Loaded automatically by `@sentry/nextjs`'s webpack magic-attr comment
 * convention (see `next.config.ts` → `withSentryConfig`). DO NOT import
 * this file directly — the Next.js Sentry plugin injects the right
 * `instrumentation.ts` hook for you.
 *
 * Replaces the previous error-tracking setup:
 *   - `SENTRY_DSN` is the project's ingest URL (https://xxx@sentry.io/xxx).
 *   - When unset (placeholder value), `Sentry.init` is a no-op: traces
 *     are dropped, no network calls fire, and the bundle impact is ~0.
 *   - When set, the SDK auto-instruments:
 *       · `Error` and `unhandledrejection` events
 *       · `fetch` and `XHR` requests
 *       · `console.error` (via ` integrations: [Sentry.captureConsole]` if added)
 *       · Next.js App-Router RSC errors (via `@sentry/nextjs` middleware)
 *
 * The DSN is safe to expose to the browser — it only authorizes sending
 * events, never reading them. The org/project names are also non-secret.
 */

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  // Performance tracing — sample 10% of sessions in production, 100% in dev.
  // Set to 0 to disable tracing entirely.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Session replay — disabled by default (PII risk on a social platform).
  // Enable per-tenant via the Owner Panel if a customer opts in.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [],
  // Tag every event with the deployment environment so we can filter
  // dev noise out of the production issue stream.
  environment: process.env.NODE_ENV ?? "development",
  // Don't send events when the DSN is unset (placeholder value) — otherwise
  // Sentry SDK throws noisy "DSN required" errors during local dev.
  enabled: !!SENTRY_DSN && !SENTRY_DSN.includes("xxx"),
  // Silence the SDK's "no DSN configured" warning during local dev.
  // We log our own notice once at startup.
  beforeSend(event) {
    if (!SENTRY_DSN || SENTRY_DSN.includes("xxx")) return null;
    return event;
  },
});
