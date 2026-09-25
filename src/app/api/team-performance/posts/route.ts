import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

/**
 * GET /api/team-performance/posts
 *
 * Powers the Kanban board + List view in the Performance view.
 *
 * Returns:
 *   - kpis: { totalPostsThisMonth, publishingRate, avgEngagementPerPost, mostActivePlatform }
 *   - posts: flat list of all posts grouped by status for the 4 Kanban columns
 *       (draft, scheduled, published, failed). Each post carries:
 *         id, title, authorName, authorAvatar, authorColor, status,
 *         platforms[], engagement, scheduledAt, date, variants[]
 *
 * Tenant-scoped via getDbForUser:
 *   - Tenant-isolated users query their dedicated tenant DB (no customerId filter)
 *   - Super-admins / legacy tenants use the main db with tenantWhere() row filter
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb, isTenantIsolated } = await getDbForUser(user!);

  const where = isTenantIsolated ? {} : tenantWhere(scope);

  const posts = await targetDb.post.findMany({
    where,
    include: {
      author: true,
      variants: { include: { account: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // ============ KPIs ============
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalPosts = posts.length;
  const totalPostsThisMonth = posts.filter(
    (p) => new Date(p.createdAt) >= monthStart
  ).length;
  const publishedCount = posts.filter((p) => p.status === "published").length;
  const publishingRate = totalPosts > 0
    ? Math.round((publishedCount / totalPosts) * 100)
    : 0;

  // Total engagement = sum of (likes + comments + shares) across all published variants
  let totalEngagement = 0;
  const platformCounts: Record<string, number> = {};
  for (const p of posts) {
    for (const v of p.variants) {
      const pl = v.account.platform;
      platformCounts[pl] = (platformCounts[pl] ?? 0) + 1;
      if (v.status === "published") {
        totalEngagement += v.likes + v.comments + v.shares;
      }
    }
  }
  const avgEngagementPerPost = publishedCount > 0
    ? Math.round(totalEngagement / publishedCount)
    : 0;

  // Most active platform = the one with the most variants (most posted-to)
  let mostActivePlatform: string | null = null;
  let mostActiveCount = 0;
  for (const [pl, count] of Object.entries(platformCounts)) {
    if (count > mostActiveCount) {
      mostActiveCount = count;
      mostActivePlatform = pl;
    }
  }

  // ============ Posts flat list (Kanban-ready) ============
  const postsList = posts.map((p) => {
    const platforms = Array.from(new Set(p.variants.map((v) => v.account.platform)));
    const engagement = p.variants
      .filter((v) => v.status === "published")
      .reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
    return {
      id: p.id,
      title: p.title,
      caption: p.caption,
      status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      authorId: p.authorId,
      authorName: p.author?.name ?? "Unknown",
      authorAvatar: p.author?.avatar ?? null,
      authorColor: p.author?.color ?? null,
      platforms,
      engagement,
      variants: p.variants.map((v) => ({
        id: v.id,
        platform: v.account.platform,
        handle: v.account.handle,
        accountName: v.account.displayName,
        status: v.status,
        publishedAt: v.publishedAt?.toISOString() ?? null,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        engagement: v.likes + v.comments + v.shares,
      })),
    };
  });

  return NextResponse.json({
    kpis: {
      totalPostsThisMonth,
      publishingRate,
      avgEngagementPerPost,
      mostActivePlatform,
      totalPosts,
      publishedCount,
    },
    posts: postsList,
  });
}
