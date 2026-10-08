import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel cron functions cap at 60s on Pro plan

/**
 * GET /api/cron/publish-scheduled
 *
 * Automated scheduled-publishing job, invoked by Vercel Cron every 5 minutes
 * (see `vercel.json` → `crons`).
 *
 * The route is intentionally a GET (not POST) because Vercel Cron issues a
 * GET request to the configured path. It is added to the middleware's
 * PUBLIC_ROUTES list (so the global JWT gate lets it through), but the
 * handler authenticates the call itself with a CRON_SECRET bearer token —
 * this is a server-to-server call, there is no user session.
 *
 * For every PostVariant whose status is `scheduled` and whose parent
 * Post's `scheduledAt` time has passed, the route calls the existing
 * `/api/publish/[platform]` endpoint with the scheduler's internal key,
 * then updates the variant status accordingly. Failures are retried up to
 * 3 times (one attempt per cron tick — i.e. ~15 minutes total backoff
 * window) before the variant is finally marked `failed`.
 */
export async function GET(req: NextRequest) {
  // ─── Auth: CRON_SECRET (NOT JWT — this is server-to-server) ──────────────
  // Vercel Cron sets `Authorization: Bearer <CRON_SECRET>` when invoking the
  // route. Without a valid secret we 401 immediately so the endpoint can't
  // be abused by unauthenticated callers who happen to know the URL.
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    // Misconfigured deployment — refuse to run rather than fall back to a
    // known-empty default that would let anyone trigger publish sweeps.
    console.error("[cron/publish-scheduled] CRON_SECRET env var is not set");
    return NextResponse.json(
      { error: "Cron not configured — missing CRON_SECRET" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The scheduler key is what /api/publish/[platform] checks to bypass its
  // JWT auth (same flow the standalone scheduler mini-service uses).
  const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY;
  if (!SCHEDULER_API_KEY) {
    console.error("[cron/publish-scheduled] SCHEDULER_API_KEY env var is not set");
    return NextResponse.json(
      { error: "Cron not configured — missing SCHEDULER_API_KEY" },
      { status: 500 }
    );
  }

  // The cron runs in the same Next.js app, so we call /api/publish/[platform]
  // over HTTP using APP_URL (defaults to localhost:3000 in dev). Vercel
  // injects APP_URL=your-domain.com automatically when configured.
  const APP_URL = process.env.APP_URL || "http://localhost:3000";

  const MAX_RETRIES = 3;

  // ─── Find all due scheduled variants ───────────────────────────────────────
  // `scheduledAt` lives on the parent Post (not the variant), so we filter
  // via the relation. Variants in `scheduled` status whose post is also
  // `scheduled` AND whose scheduledAt time has passed are due for publishing.
  const dueVariants = await db.postVariant.findMany({
    where: {
      status: "scheduled",
      post: {
        status: "scheduled",
        scheduledAt: { lte: new Date() },
      },
    },
    include: {
      post: true,
      account: true,
    },
  });

  let published = 0;
  let retried = 0;
  let failed = 0;
  const results: Array<{ id: string; platform: string; status: string; error?: string }> = [];

  for (const variant of dueVariants) {
    const platform =
      variant.account.platform === "x" ? "twitter" : variant.account.platform;

    // Mirror the scheduler mini-service: append hashtags as #tag #tag to the
    // body before publishing so they actually reach the platform.
    const content = variant.hashtags
      ? `${variant.content}\n\n${variant.hashtags
          .split(",")
          .map((t) => `#${t.trim()}`)
          .filter((t) => t !== "#")
          .join(" ")}`
      : variant.content;

    try {
      const publishRes = await fetch(`${APP_URL}/api/publish/${platform}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // /api/publish/[platform] reads this header to bypass JWT auth —
          // it's the same path the standalone scheduler mini-service uses.
          "x-scheduler-key": SCHEDULER_API_KEY,
        },
        body: JSON.stringify({
          userId: variant.post.authorId,
          accountId: variant.accountId,
          content,
        }),
      });

      if (publishRes.ok) {
        // ─── SUCCESS ──────────────────────────────────────────────────────
        // The /api/publish/[platform] route already records a `post_published`
        // Activity row, so we don't duplicate it here. We just flip the
        // variant status, clear any prior error, and reset the retry counter
        // (so a future re-schedule starts fresh).
        await db.postVariant.update({
          where: { id: variant.id },
          data: {
            status: "published",
            publishedAt: new Date(),
            retryCount: 0,
            lastError: null,
          },
        });
        published++;
        results.push({ id: variant.id, platform, status: "published" });
      } else {
        // ─── FAILURE (4xx/5xx from /api/publish) ─────────────────────────
        // Capture the error message so the user can see *why* it failed
        // directly in the failed-variants list (instead of a bare "failed").
        let errorMsg = `HTTP ${publishRes.status}`;
        try {
          const errBody = (await publishRes.json()) as { error?: string };
          if (errBody?.error) errorMsg = errBody.error.slice(0, 280);
        } catch {
          // non-JSON response — keep the HTTP status
        }

        const nextRetry = variant.retryCount + 1;
        if (nextRetry < MAX_RETRIES) {
          // Keep the variant in `scheduled` so the next cron tick picks it
          // up again (cron runs every 5 min → ~15 min total retry window).
          await db.postVariant.update({
            where: { id: variant.id },
            data: {
              retryCount: nextRetry,
              lastError: errorMsg,
            },
          });
          retried++;
          results.push({ id: variant.id, platform, status: "retrying", error: errorMsg });
        } else {
          // Final failure — give up and surface to the user.
          await db.postVariant.update({
            where: { id: variant.id },
            data: {
              status: "failed",
              retryCount: nextRetry,
              lastError: errorMsg,
            },
          });
          failed++;
          results.push({ id: variant.id, platform, status: "failed", error: errorMsg });
        }
      }
    } catch (e) {
      // Network error / fetch threw (APP_URL wrong, app down, etc.)
      const errorMsg = e instanceof Error ? e.message.slice(0, 280) : "Network error";
      const nextRetry = variant.retryCount + 1;
      if (nextRetry < MAX_RETRIES) {
        await db.postVariant.update({
          where: { id: variant.id },
          data: { retryCount: nextRetry, lastError: errorMsg },
        });
        retried++;
        results.push({ id: variant.id, platform, status: "retrying", error: errorMsg });
      } else {
        await db.postVariant.update({
          where: { id: variant.id },
          data: { status: "failed", retryCount: nextRetry, lastError: errorMsg },
        });
        failed++;
        results.push({ id: variant.id, platform, status: "failed", error: errorMsg });
      }
    }
  }

  // After processing variants, reconcile each affected parent Post so its
  // status reflects its variants (all published → published; any failed →
  // failed; otherwise still scheduled for the next tick).
  const affectedPostIds = Array.from(
    new Set(dueVariants.map((v) => v.postId))
  );
  for (const postId of affectedPostIds) {
    try {
      const variants = await db.postVariant.findMany({
        where: { postId },
        select: { status: true },
      });
      const allPublished = variants.length > 0 && variants.every((v) => v.status === "published");
      const anyFailed = variants.some((v) => v.status === "failed");
      // Only flip the post status if every variant is settled (published or
      // failed). If some are still `scheduled` (retries pending), leave the
      // post itself `scheduled` so the next cron tick re-evaluates.
      const allSettled = variants.every(
        (v) => v.status === "published" || v.status === "failed"
      );
      if (allSettled) {
        await db.post.update({
          where: { id: postId },
          data: { status: allPublished ? "published" : anyFailed ? "failed" : "published" },
        });
      }
    } catch (e) {
      // Non-fatal — the variant statuses are already correct, this is just
      // convenience bookkeeping for the post-level UI.
      console.error("[cron/publish-scheduled] post status reconcile failed:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: dueVariants.length,
    published,
    retried,
    failed,
    timestamp: new Date().toISOString(),
    results,
  });
}
