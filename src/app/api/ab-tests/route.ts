import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * REMAINING-4 — A/B Testing for Content.
 *
 * Two PostVariants (or more, up to 4) of the SAME Post can be grouped
 * into an A/B test by stamping them with the same `abTestGroupId` (a
 * cuid). The analytics dashboard then compares engagement side-by-side
 * and surfaces a winner.
 *
 * The "group" is virtual — there's no `ABTestGroup` table. The group id
 * is just a shared string on the variants; aggregation queries group by
 * it. This keeps the schema minimal and lets the same variant belong to
 * at most one test (enforced by the single field).
 */

interface VariantSummary {
  variantId: string;
  postId: string;
  postTitle: string;
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
  /** Sum of likes + comments + shares + saves. */
  engagement: number;
}

interface ABTestGroup {
  id: string;
  postId: string;
  postTitle: string;
  variantCount: number;
  publishedCount: number;
  totalEngagement: number;
  totalReach: number;
  totalImpressions: number;
  /** Variant id with the highest engagement, or null when no variant has published data. */
  winnerVariantId: string | null;
  createdAt: string; // earliest variant createdAt in the group
  variants: VariantSummary[];
}

/** Helper — compute engagement = likes + comments + shares + saves. */
function engagementOf(v: {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}): number {
  return v.likes + v.comments + v.shares + v.saves;
}

/**
 * GET /api/ab-tests
 *
 * Returns every A/B test group visible to the caller (tenant-scoped).
 * A "group" is the set of variants sharing an `abTestGroupId`. Groups
 * are sorted by most recently created.
 *
 * Each group includes per-variant engagement summaries so the analytics
 * UI can render a comparison chart without a second round-trip.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  // Pull every variant with an abTestGroupId, scoped to the caller's
  // tenant. Super-admins see all groups (no tenant filter).
  const variants = await db.postVariant.findMany({
    where: {
      abTestGroupId: { not: null },
      ...(tenantWhere(scope) as Record<string, unknown>),
    },
    include: {
      post: { select: { id: true, title: true, customerId: true } },
      account: { select: { platform: true, handle: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by abTestGroupId (preserve insertion order = newest first
  // because the query was ordered by createdAt desc).
  const groups = new Map<string, typeof variants>();
  for (const v of variants) {
    const key = v.abTestGroupId!;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }

  const out: ABTestGroup[] = [];
  for (const [groupId, groupVariants] of groups) {
    const postId = groupVariants[0]?.postId ?? "";
    const postTitle = groupVariants[0]?.post.title ?? "Untitled";

    const summaries: VariantSummary[] = groupVariants.map((v) => ({
      variantId: v.id,
      postId: v.postId,
      postTitle,
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
      engagement: engagementOf(v),
    }));

    const totalEngagement = summaries.reduce((s, v) => s + v.engagement, 0);
    const totalReach = summaries.reduce((s, v) => s + v.reach, 0);
    const totalImpressions = summaries.reduce((s, v) => s + v.impressions, 0);
    const publishedCount = summaries.filter((v) => v.status === "published").length;

    // Winner = variant with the highest engagement (only counts published
    // variants so a draft variant in the group can't "win" by virtue of
    // being the only one with metrics > 0).
    const published = summaries.filter((v) => v.status === "published");
    const winner =
      published.length > 0
        ? published.reduce((best, v) =>
            v.engagement > best.engagement ? v : best,
          )
        : null;

    const earliestCreatedAt = groupVariants
      .map((v) => v.createdAt)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    out.push({
      id: groupId,
      postId,
      postTitle,
      variantCount: summaries.length,
      publishedCount,
      totalEngagement,
      totalReach,
      totalImpressions,
      winnerVariantId: winner?.variantId ?? null,
      createdAt: earliestCreatedAt.toISOString(),
      variants: summaries,
    });
  }

  return NextResponse.json({ groups: out });
}

/**
 * POST /api/ab-tests
 *
 * Body:
 *   {
 *     postId: string,
 *     variantIds: string[], // 2–4 PostVariant ids belonging to that post
 *     name?: string         // optional label (not persisted as a separate
 *                           // row — informational only; the group id is
 *                           // the unique handle)
 *   }
 *
 * Validates that:
 *   - the caller has access to the post (tenant-scoped)
 *   - there are 2–4 variants
 *   - all variants belong to the given postId
 *   - none of the variants already belong to an A/B test group
 *
 * Stamps every variant with a fresh cuid as `abTestGroupId` and returns
 * the new group shape (same as GET items).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json().catch(() => ({}));
  const { postId, variantIds } = body as {
    postId?: string;
    variantIds?: string[];
  };

  if (!postId || !Array.isArray(variantIds) || variantIds.length < 2 || variantIds.length > 4) {
    return NextResponse.json(
      { error: "postId and variantIds (2–4 ids) are required" },
      { status: 400 },
    );
  }

  // Confirm the post exists + is in the caller's tenant scope.
  const post = await db.post.findFirst({
    where: { id: postId, ...(tenantWhere(scope) as Record<string, unknown>) },
    select: { id: true, title: true },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Fetch the variants — must all belong to the post + be in tenant scope.
  const variants = await db.postVariant.findMany({
    where: {
      id: { in: variantIds },
      postId,
      ...(tenantWhere(scope) as Record<string, unknown>),
    },
    include: {
      post: { select: { title: true } },
      account: { select: { platform: true, handle: true } },
    },
  });

  if (variants.length !== variantIds.length) {
    return NextResponse.json(
      {
        error:
          "Some variants were not found in this post or are outside your tenant scope.",
      },
      { status: 404 },
    );
  }

  // Reject variants that already belong to a test group.
  const alreadyGrouped = variants.filter((v) => v.abTestGroupId);
  if (alreadyGrouped.length > 0) {
    return NextResponse.json(
      {
        error: `Variant ${alreadyGrouped[0].id} already belongs to an A/B test group (${alreadyGrouped[0].abTestGroupId}).`,
      },
      { status: 409 },
    );
  }

  // Stamp all variants with a fresh shared group id.
  const groupId = `abtest_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
  await db.postVariant.updateMany({
    where: { id: { in: variantIds } },
    data: { abTestGroupId: groupId },
  });

  // Re-fetch the freshly stamped variants so the response includes
  // accurate engagement totals + the group shape matches GET exactly.
  const updated = await db.postVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      post: { select: { title: true } },
      account: { select: { platform: true, handle: true } },
    },
  });

  const summaries: VariantSummary[] = updated.map((v) => ({
    variantId: v.id,
    postId: v.postId,
    postTitle: v.post.title,
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
    engagement: engagementOf(v),
  }));

  const totalEngagement = summaries.reduce((s, v) => s + v.engagement, 0);
  const totalReach = summaries.reduce((s, v) => s + v.reach, 0);
  const totalImpressions = summaries.reduce((s, v) => s + v.impressions, 0);
  const publishedCount = summaries.filter((v) => v.status === "published").length;
  const published = summaries.filter((v) => v.status === "published");
  const winner =
    published.length > 0
      ? published.reduce((best, v) => (v.engagement > best.engagement ? v : best))
      : null;
  const earliestCreatedAt = updated
    .map((v) => v.createdAt)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const group: ABTestGroup = {
    id: groupId,
    postId,
    postTitle: post.title,
    variantCount: summaries.length,
    publishedCount,
    totalEngagement,
    totalReach,
    totalImpressions,
    winnerVariantId: winner?.variantId ?? null,
    createdAt: earliestCreatedAt.toISOString(),
    variants: summaries,
  };

  return NextResponse.json({ ok: true, group });
}
