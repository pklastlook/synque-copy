import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/posts/[id]/publish-now
 *
 * Manually publish a scheduled post immediately — bypassing the cron job
 * entirely. This is the "Publish Now" button in the Composer UI: it lets
 * a user ship a scheduled post right now instead of waiting for the next
 * 5-minute cron tick.
 *
 * Auth: standard requireAuth (user JWT). The caller must own the post in
 * their tenant (verified via tenantWhere, same pattern as
 * /api/posts/[id] PATCH/DELETE).
 *
 * For each variant on the post, this calls the same /api/publish/[platform]
 * endpoint the cron uses — so the actual publishing logic (per-platform API
 * calls, account-protection enforcement, activity logging) is identical.
 *
 * Variants that are already `published` are skipped (idempotent). Variants
 * in `failed` status are retried. Variants in `draft` are also published.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const scope = getTenantScope(user!);

  // Verify the post exists AND belongs to the caller's tenant.
  const post = await db.post.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    include: {
      variants: { include: { account: true } },
    },
  });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The scheduler key lets /api/publish/[platform] bypass its JWT check for
  // this server-to-server call. Required — without it the publish route 401s.
  const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY;
  if (!SCHEDULER_API_KEY) {
    console.error("[publish-now] SCHEDULER_API_KEY env var is not set");
    return NextResponse.json(
      { error: "Server misconfiguration — missing SCHEDULER_API_KEY" },
      { status: 500 }
    );
  }

  // Optional body: { variantIds?: string[] } — if supplied, only publish the
  // listed variants. Otherwise publish every non-published variant on the post.
  const body = (await req.json().catch(() => ({}))) as { variantIds?: string[] };
  const targetVariantIds = body.variantIds?.length ? new Set(body.variantIds) : null;

  const publishableVariants = post.variants.filter((v) => {
    if (targetVariantIds && !targetVariantIds.has(v.id)) return false;
    return v.status !== "published"; // skip already-published variants
  });

  if (publishableVariants.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "All variants are already published",
      published: 0,
      failed: 0,
    });
  }

  const APP_URL = process.env.APP_URL || "http://localhost:3000";
  let published = 0;
  let failed = 0;
  const failures: Array<{ variantId: string; platform: string; error: string }> = [];

  for (const variant of publishableVariants) {
    const platform =
      variant.account.platform === "x" ? "twitter" : variant.account.platform;

    const content = variant.hashtags
      ? `${variant.content}\n\n${variant.hashtags
          .split(",")
          .map((t) => `#${t.trim()}`)
          .filter((t) => t !== "#")
          .join(" ")}`
      : variant.content;

    try {
      const res = await fetch(`${APP_URL}/api/publish/${platform}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scheduler-key": SCHEDULER_API_KEY,
        },
        body: JSON.stringify({
          userId: post.authorId,
          accountId: variant.accountId,
          content,
        }),
      });

      if (res.ok) {
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
      } else {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errBody = (await res.json()) as { error?: string };
          if (errBody?.error) errMsg = errBody.error.slice(0, 280);
        } catch {
          // keep HTTP status as the error message
        }
        await db.postVariant.update({
          where: { id: variant.id },
          data: { status: "failed", lastError: errMsg },
        });
        failed++;
        failures.push({ variantId: variant.id, platform, error: errMsg });
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message.slice(0, 280) : "Network error";
      await db.postVariant.update({
        where: { id: variant.id },
        data: { status: "failed", lastError: errMsg },
      });
      failed++;
      failures.push({ variantId: variant.id, platform, error: errMsg });
    }
  }

  // Reconcile parent post status.
  const allVariants = await db.postVariant.findMany({
    where: { postId: id },
    select: { status: true },
  });
  const allPublished =
    allVariants.length > 0 && allVariants.every((v) => v.status === "published");
  const anyFailed = allVariants.some((v) => v.status === "failed");
  const allSettled = allVariants.every(
    (v) => v.status === "published" || v.status === "failed"
  );

  if (allSettled) {
    await db.post.update({
      where: { id },
      data: {
        status: allPublished ? "published" : anyFailed ? "failed" : "published",
        // Clear scheduledAt — the post has been published (or definitively
        // failed), so it's no longer awaiting a future time slot.
        scheduledAt: allPublished ? null : post.scheduledAt,
      },
    });
  }

  // Log a manual-publish Activity so the team feed reflects the action.
  // (Auto-publishes from cron create their own activities via the
  // /api/publish/[platform] route; this entry is specifically for the
  // "Publish Now" user action.)
  try {
    await db.activity.create({
      data: {
        userId: user!.userId,
        type: published > 0 && failed === 0 ? "post_published" : "post_scheduled",
        description:
          failed === 0
            ? `published "${post.title}" now to ${published} account(s)`
            : `partially published "${post.title}" — ${published} ok, ${failed} failed`,
      },
    });
  } catch (e) {
    console.error("[publish-now] activity log failed:", e);
  }

  return NextResponse.json({
    ok: failed === 0,
    published,
    failed,
    failures,
    postId: id,
  });
}
