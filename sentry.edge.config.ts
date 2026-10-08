import * as Sentry from "@sentry/nextjs";

/**
 * Sentry — EDGE runtime config.
 *
 * Covers `src/middleware.ts` and any route declared with
 * `export const runtime = "edge"`. The Edge runtime is a lighter V8
 * isolate (no `node:*` modules) — Sentry ships a separate bundle for it.
 *
 * Loaded automatically by `@sentry/nextjs` when the build detects an
 * Edge runtime entrypoint. DO NOT import this file directly.
 *
 * Note: trace sampling is shared with the server config — the Edge SDK
 * picks up the same `SENTRY_DSN` env var.
 */

const SENTRY_DSN = process.env.SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  // Lower sample rate on the Edge runtime because middleware runs on
  // EVERY request — full sampling would 10x the event volume.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.NODE_ENV ?? "development",
  enabled: !!SENTRY_DSN && !SENTRY_DSN.includes("xxx"),
  beforeSend(event) {
    if (!SENTRY_DSN || SENTRY_DSN.includes("xxx")) return null;
    return event;
  },
});
