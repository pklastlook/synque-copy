import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * REMAINING-4 — A/B test detail / stop.
 *
 * GET /api/ab-tests/[id]
 *   Returns the full test group + a per-variant engagement comparison
 *   (likes / comments / shares / saves / reach / impressions /
 *   engagement-rate). The variant with the highest engagement is
 *   flagged `isWinner: true`.
 *
 * POST /api/ab-tests/[id]/use-winner  (separate route not used — we fold
 *   the "use winner" action into the Composer by PATCHing the post's
 *   caption; see composer.tsx). The Analytics view calls
 *   `POST /api/posts/[id]` to set the winning variant's content as the
 *   post's default caption.
 *
 * DELETE /api/ab-tests/[id]
 *   Stop the test — clears `abTestGroupId` on every variant in the
 *   group. The variants themselves stay published (their engagement
 *   metrics are preserved). Returns 200 with `{ ok: true }`.
 */

interface VariantComparison {
  variantId: string;
  accountId: string;
  platform: string;
  handle: string;
  content: string;
  status: string;
  publishedAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  engagement: number;
  /** engagement / max(impressions, 1) — expressed as a fraction (0..1). */
  engagementRate: number;
  isWinner: boolean;
}

function engagementOf(v: {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}): number {
  return v.likes + v.comments + v.shares + v.saves;
}

/**
 * GET /api/ab-tests/[id] — full per-variant engagement comparison.
 *
 * `id` is the `abTestGroupId` (a string of the form `abtest_xxx`).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id: groupId } = await params;

  if (!groupId) {
    return NextResponse.json({ error: "Missing group id" }, { status: 400 });
  }

  const variants = await db.postVariant.findMany({
    where: {
      abTestGroupId: groupId,
      ...(tenantWhere(scope) as Record<string, unknown>),
    },
    include: {
      post: { select: { id: true, title: true, caption: true } },
      account: { select: { platform: true, handle: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (variants.length === 0) {
    return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
  }

  // Determine the winner — only published variants with metrics are
  // eligible. The winner is the published variant with the highest
  // engagement; ties broken by reach.
  const published = variants.filter((v) => v.status === "published");
  let winnerId: string | null = null;
  if (published.length > 0) {
    const winner = published.reduce((best, v) => {
      const bestE = engagementOf(best);
      const vE = engagementOf(v);
      if (vE > bestE) return v;
      if (vE === bestE && v.reach > best.reach) return v;
      return best;
    });
    winnerId = winner.id;
  }

  const comparisons: VariantComparison[] = variants.map((v) => {
    const engagement = engagementOf(v);
    return {
      variantId: v.id,
      accountId: v.accountId,
      platform: v.account.platform,
      handle: v.account.handle,
      content: v.content,
      status: v.status,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      likes: v.likes,
      comments: v.comments,
      shares: v.shares,
      saves: v.saves,
      reach: v.reach,
      impressions: v.impressions,
      engagement,
      engagementRate: v.impressions > 0 ? engagement / v.impressions : 0,
      isWinner: v.id === winnerId,
    };
  });

  const post = variants[0].post;
  const totalEngagement = comparisons.reduce((s, v) => s + v.engagement, 0);
  const totalReach = comparisons.reduce((s, v) => s + v.reach, 0);
  const totalImpressions = comparisons.reduce((s, v) => s + v.impressions, 0);
  const publishedCount = comparisons.filter((v) => v.status === "published").length;

  return NextResponse.json({
    id: groupId,
    postId: post.id,
    postTitle: post.title,
    postCaption: post.caption,
    variantCount: comparisons.length,
    publishedCount,
    totalEngagement,
    totalReach,
    totalImpressions,
    winnerVariantId: winnerId,
    variants: comparisons,
  });
}

/**
 * DELETE /api/ab-tests/[id] — stop the test.
 *
 * Clears `abTestGroupId` on every variant in the group. The variants
 * themselves (and their engagement metrics) are NOT deleted — only the
 * group association is removed. This makes the test disappear from the
 * active tests list while preserving the underlying data.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id: groupId } = await params;

  if (!groupId) {
    return NextResponse.json({ error: "Missing group id" }, { status: 400 });
  }

  // Confirm at least one variant exists in the group + tenant scope.
  const sample = await db.postVariant.findFirst({
    where: {
      abTestGroupId: groupId,
      ...(tenantWhere(scope) as Record<string, unknown>),
    },
    select: { id: true },
  });
  if (!sample) {
    return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
  }

  // Clear the group id on every variant in the group (still scoped to
  // the caller's tenant so a cross-tenant accidental clear is impossible).
  const result = await db.postVariant.updateMany({
    where: {
      abTestGroupId: groupId,
      ...(tenantWhere(scope) as Record<string, unknown>),
    },
    data: { abTestGroupId: null },
  });

  return NextResponse.json({ ok: true, cleared: result.count });
}
