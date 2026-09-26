import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/posts
 *
 * Posts Performance section for the Reports view.
 *
 * Returns:
 *   - kpis: aggregate post counts (total, published, scheduled, draft, failed,
 *           total platform variants published)
 *   - platformBreakdown: per-platform posts published, total engagement (likes +
 *           comments + shares), average engagement per post, share-of-total bar
 *   - memberBreakdown: per-author posts authored/published, platforms they
 *           posted to, engagement generated, share-of-total bar
 *   - posts: flat list of every post (with variants) for the sortable/filterable
 *           posts table — author + status + platforms + engagement + date
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

  // For tenant-isolated DBs, no row filter (the DB itself is the boundary).
  // For super-admin / legacy tenants on the main db, filter by customerId.
  const where = isTenantIsolated ? {} : tenantWhere(scope);

  const [posts, variants, comments] = await Promise.all([
    targetDb.post.findMany({
      where,
      include: {
        author: true,
        variants: { include: { account: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    targetDb.postVariant.findMany({
      where: isTenantIsolated ? {} : { post: tenantWhere(scope) },
      include: { account: true, post: { include: { author: true } } },
    }),
    // Fetch comments so we can compute per-member comment counts + reply rates
    targetDb.comment.findMany({
      where: isTenantIsolated ? {} : tenantWhere(scope),
    }),
  ]);

  // ============ KPIs ============
  const totalPosts = posts.length;
  const published = posts.filter((p) => p.status === "published").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const draft = posts.filter((p) => p.status === "draft").length;
  const failed = posts.filter((p) => p.status === "failed").length;
  const totalVariantsPublished = variants.filter((v) => v.status === "published").length;

  // ============ Platform breakdown ============
  // For each platform: # posts published (variants), total engagement, avg engagement,
  // and share of total platform posts.
  const PLATFORMS = ["instagram", "facebook", "x", "linkedin", "tiktok", "youtube", "threads"];
  const platformMap: Record<string, { published: number; engagement: number; total: number }> = {};
  for (const v of variants) {
    const pl = v.account.platform;
    if (!platformMap[pl]) platformMap[pl] = { published: 0, engagement: 0, total: 0 };
    platformMap[pl].total++;
    if (v.status === "published") {
      platformMap[pl].published++;
      platformMap[pl].engagement += v.likes + v.comments + v.shares;
    }
  }
  const totalPlatformPosts = Object.values(platformMap).reduce((s, p) => s + p.total, 0);
  const platformBreakdown = PLATFORMS.map((platform) => {
    const d = platformMap[platform] ?? { published: 0, engagement: 0, total: 0 };
    const avg = d.published > 0 ? Math.round(d.engagement / d.published) : 0;
    const share = totalPlatformPosts > 0 ? Math.round((d.total / totalPlatformPosts) * 100) : 0;
    return {
      platform,
      postsPublished: d.published,
      totalVariants: d.total,
      totalEngagement: d.engagement,
      avgEngagement: avg,
      shareOfTotal: share,
    };
  }).filter((p) => p.totalVariants > 0);

  // ============ Member breakdown ============
  // For each author: posts authored, posts published, platforms they posted to,
  // engagement generated, comments received on their posts, reply rate, share of total.
  //
  // Comments are attributed to the post author whose variants received them —
  // i.e. "comments received" = comments on posts authored by this member.
  const accountToAuthor = new Map<string, string>(); // accountId → authorId
  for (const p of posts) {
    for (const v of p.variants) {
      accountToAuthor.set(v.accountId, p.authorId);
    }
  }

  // Per-author comment stats
  const memberCommentStats: Record<string, { received: number; replied: number }> = {};
  for (const c of comments) {
    const authorId = accountToAuthor.get(c.accountId);
    if (!authorId) continue;
    if (!memberCommentStats[authorId]) memberCommentStats[authorId] = { received: 0, replied: 0 };
    memberCommentStats[authorId].received++;
    if (c.replied) memberCommentStats[authorId].replied++;
  }

  const memberMap: Record<string, {
    userId: string; name: string; avatar: string | null; color: string | null;
    role: string; title: string | null;
    postsAuthored: number; postsPublished: number;
    platforms: Set<string>; engagement: number;
    commentsReceived: number; commentsReplied: number;
  }> = {};
  for (const p of posts) {
    const author = p.author;
    if (!author) continue;
    if (!memberMap[author.id]) {
      memberMap[author.id] = {
        userId: author.id, name: author.name, avatar: author.avatar,
        color: author.color, role: author.role, title: author.title,
        postsAuthored: 0, postsPublished: 0, platforms: new Set(), engagement: 0,
        commentsReceived: 0, commentsReplied: 0,
      };
    }
    const m = memberMap[author.id];
    m.postsAuthored++;
    if (p.status === "published") m.postsPublished++;
    for (const v of p.variants) {
      m.platforms.add(v.account.platform);
      if (v.status === "published") {
        m.engagement += v.likes + v.comments + v.shares;
      }
    }
    // Attach comment stats
    const cs = memberCommentStats[author.id];
    if (cs) {
      m.commentsReceived = cs.received;
      m.commentsReplied = cs.replied;
    }
  }
  const memberBreakdown = Object.values(memberMap).map((m) => ({
    userId: m.userId, name: m.name, avatar: m.avatar, color: m.color,
    role: m.role, title: m.title,
    postsAuthored: m.postsAuthored,
    postsPublished: m.postsPublished,
    platforms: Array.from(m.platforms),
    engagement: m.engagement,
    commentsReceived: m.commentsReceived,
    commentsReplied: m.commentsReplied,
    replyRate: m.commentsReceived > 0 ? Math.round((m.commentsReplied / m.commentsReceived) * 100) : 0,
    shareOfTotal: totalPosts > 0 ? Math.round((m.postsAuthored / totalPosts) * 100) : 0,
  })).sort((a, b) => b.postsAuthored - a.postsAuthored);

  // ============ Posts flat list (with variants for expansion) ============
  // Pre-compute per-post comment counts so the list view can show
  // "3 comments" badges without re-scanning the comments array per render.
  // Map account → variant → post so we can attribute comments to posts.
  const variantIdToPostId = new Map<string, string>();
  const accountIdToVariantId = new Map<string, string>();
  for (const p of posts) {
    for (const v of p.variants) {
      variantIdToPostId.set(v.id, p.id);
      accountIdToVariantId.set(v.accountId, v.id);
    }
  }
  const postCommentCounts = new Map<string, { total: number; replied: number }>();
  for (const c of comments) {
    const variantId = accountIdToVariantId.get(c.accountId);
    if (!variantId) continue;
    const postId = variantIdToPostId.get(variantId);
    if (!postId) continue;
    if (!postCommentCounts.has(postId)) postCommentCounts.set(postId, { total: 0, replied: 0 });
    const cc = postCommentCounts.get(postId)!;
    cc.total++;
    if (c.replied) cc.replied++;
  }

  const postsList = posts.map((p) => {
    const platforms = Array.from(new Set(p.variants.map((v) => v.account.platform)));
    const engagement = p.variants.reduce(
      (s, v) => s + v.likes + v.comments + v.shares, 0
    );
    const cc = postCommentCounts.get(p.id) ?? { total: 0, replied: 0 };
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
      comments: cc.total,
      commentsReplied: cc.replied,
      variants: p.variants.map((v) => ({
        id: v.id,
        platform: v.account.platform,
        handle: v.account.handle,
        accountName: v.account.displayName,
        content: v.content,
        status: v.status,
        publishedAt: v.publishedAt?.toISOString() ?? null,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        reach: v.reach,
        impressions: v.impressions,
        saves: v.saves,
        engagement: v.likes + v.comments + v.shares,
      })),
    };
  });

  return NextResponse.json({
    kpis: {
      totalPosts,
      published,
      scheduled,
      draft,
      failed,
      totalVariantsPublished,
      totalComments: comments.length,
      totalCommentsReplied: comments.filter((c) => c.replied).length,
    },
    platformBreakdown,
    memberBreakdown,
    posts: postsList,
    totals: {
      totalPlatformPosts,
      totalEngagement: platformBreakdown.reduce((s, p) => s + p.totalEngagement, 0),
      totalComments: comments.length,
      totalCommentsReplied: comments.filter((c) => c.replied).length,
    },
  });
}
