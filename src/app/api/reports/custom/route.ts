import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/reports/custom
 *
 * Fully customizable report builder. Fetches exactly the data the user
 * requested — filtered by member, account, platform, date range, and
 * selected metrics.
 *
 * Body: {
 *   userId?: string,        // specific team member
 *   accountId?: string,     // specific social account
 *   platform?: string,      // filter by platform (twitter, instagram, etc.)
 *   startDate: string,      // ISO date
 *   endDate: string,        // ISO date
 *   metrics: string[],      // which metrics to include
 * }
 *
 * Returns a structured report with:
 * - summary KPIs (computed from real DB data)
 * - daily breakdown series
 * - post-level detail list
 * - comment-level detail list
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json() as {
    userId?: string;
    accountId?: string;
    platform?: string;
    startDate?: string;
    endDate?: string;
    metrics?: string[];
  };

  const startDate = body.startDate ? new Date(body.startDate) : new Date(Date.now() - 30 * 86400000);
  const endDate = body.endDate ? new Date(body.endDate) : new Date();
  endDate.setHours(23, 59, 59, 999);
  startDate.setHours(0, 0, 0, 0);

  const requestedMetrics = body.metrics ?? [
    "posts", "published", "comments", "shares", "likes", "engagement",
    "followers", "reach", "impressions", "replyRate",
  ];

  // Build account filter
  const accountWhere: Record<string, unknown> = {};
  if (body.accountId) accountWhere.id = body.accountId;
  if (body.platform) accountWhere.platform = body.platform;

  const accounts = await db.account.findMany({
    where: accountWhere,
    include: { owner: true },
  });
  const accountIds = accounts.map((a) => a.id);

  if (accountIds.length === 0) {
    return NextResponse.json({
      ok: true,
      summary: {},
      series: [],
      posts: [],
      comments: [],
      members: [],
      accounts: [],
      message: "No accounts match the selected filters.",
    });
  }

  // Build post filter
  const postWhere: Record<string, unknown> = {
    createdAt: { gte: startDate, lte: endDate },
  };
  if (body.userId) postWhere.authorId = body.userId;
  if (body.accountId || body.platform) {
    postWhere.variants = { some: { accountId: { in: accountIds } } };
  }

  // Build variant filter
  const variantWhere: Record<string, unknown> = {
    accountId: { in: accountIds },
  };
  // Variants don't have createdAt in the filter directly — we'll filter in JS

  // Build comment filter
  const commentWhere: Record<string, unknown> = {
    accountId: { in: accountIds },
    createdAt: { gte: startDate, lte: endDate },
  };

  // Fetch all data in parallel
  const [posts, allVariants, comments, analytics, teamMembers] = await Promise.all([
    db.post.findMany({
      where: postWhere,
      include: {
        author: true,
        variants: { include: { account: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.postVariant.findMany({
      where: variantWhere,
      include: { account: true, post: { include: { author: true } } },
    }),
    db.comment.findMany({
      where: commentWhere,
      include: { account: true },
      orderBy: { createdAt: "desc" },
    }),
    db.analyticsDaily.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { date: "asc" },
    }),
    body.userId
      ? db.user.findUnique({ where: { id: body.userId } })
      : db.user.findMany({
          where: { status: "active" },
          select: { id: true, name: true, email: true, role: true, title: true, avatar: true, color: true },
        }),
  ]);

  // Filter variants by date range
  const variants = allVariants.filter((v) => {
    const d = v.publishedAt ?? v.createdAt;
    return d >= startDate && d <= endDate;
  });

  // Filter posts by user if specified (also filter via variant.accountId)
  const filteredPosts = body.userId
    ? posts.filter((p) => p.authorId === body.userId)
    : posts;

  // === COMPUTE SUMMARY KPIs ===
  const totalPosts = filteredPosts.length;
  const publishedPosts = filteredPosts.filter((p) => p.status === "published").length;
  const draftPosts = filteredPosts.filter((p) => p.status === "draft").length;
  const scheduledPosts = filteredPosts.filter((p) => p.status === "scheduled").length;
  const failedPosts = filteredPosts.filter((p) => p.status === "failed").length;

  const totalVariants = variants.length;
  const publishedVariants = variants.filter((v) => v.status === "published").length;

  const totalLikes = variants.reduce((s, v) => s + v.likes, 0);
  const totalComments = comments.length;
  const totalShares = variants.reduce((s, v) => s + v.shares, 0);
  const totalSaves = variants.reduce((s, v) => s + v.saves, 0);
  const totalEngagement = totalLikes + totalComments + totalShares + totalSaves;
  const totalReach = analytics.filter((a) => a.date >= startDate && a.date <= endDate).reduce((s, a) => s + a.reach, 0);
  const totalImpressions = analytics.filter((a) => a.date >= startDate && a.date <= endDate).reduce((s, a) => s + a.impressions, 0);
  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);

  const commentsReplied = comments.filter((c) => c.replied).length;
  const replyRate = totalComments > 0 ? Math.round((commentsReplied / totalComments) * 100) : 0;

  // Sentiment breakdown
  const positive = comments.filter((c) => c.sentiment === "positive").length;
  const neutral = comments.filter((c) => c.sentiment === "neutral").length;
  const negative = comments.filter((c) => c.sentiment === "negative").length;

  // Platform breakdown
  const platformBreakdown: Record<string, { posts: number; engagement: number; followers: number }> = {};
  for (const acc of accounts) {
    const p = acc.platform;
    if (!platformBreakdown[p]) platformBreakdown[p] = { posts: 0, engagement: 0, followers: 0 };
    platformBreakdown[p].followers += acc.followers;
    const accVariants = variants.filter((v) => v.accountId === acc.id);
    platformBreakdown[p].posts += accVariants.length;
    platformBreakdown[p].engagement += accVariants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
  }

  // === COMPUTE DAILY SERIES ===
  const dayMs = 86400000;
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs);
  const seriesDays = Math.min(totalDays + 1, 90); // cap at 90 data points

  const series: {
    date: string;
    postsCreated: number;
    published: number;
    comments: number;
    shares: number;
    likes: number;
    engagement: number;
    followers: number;
    reach: number;
    impressions: number;
  }[] = [];

  for (let d = 0; d < seriesDays; d++) {
    const date = new Date(startDate.getTime() + d * dayMs);
    const dayKey = date.toISOString().slice(0, 10);

    const dayPosts = filteredPosts.filter((p) => p.createdAt.toISOString().slice(0, 10) === dayKey);
    const dayVariants = variants.filter((v) => {
      const vd = v.publishedAt ?? v.createdAt;
      return vd.toISOString().slice(0, 10) === dayKey;
    });
    const dayComments = comments.filter((c) => c.createdAt.toISOString().slice(0, 10) === dayKey);
    const dayAnalytics = analytics.filter((a) => a.date.toISOString().slice(0, 10) === dayKey);

    series.push({
      date: dayKey,
      postsCreated: dayPosts.length,
      published: dayVariants.filter((v) => v.status === "published").length,
      comments: dayComments.length,
      shares: dayVariants.reduce((s, v) => s + v.shares, 0),
      likes: dayVariants.reduce((s, v) => s + v.likes, 0),
      engagement: dayVariants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0),
      followers: dayAnalytics.reduce((s, a) => s + a.followers, 0),
      reach: dayAnalytics.reduce((s, a) => s + a.reach, 0),
      impressions: dayAnalytics.reduce((s, a) => s + a.impressions, 0),
    });
  }

  // === POST DETAIL LIST ===
  const postDetails = filteredPosts.slice(0, 50).map((p) => ({
    id: p.id,
    title: p.title,
    caption: p.caption,
    status: p.status,
    authorName: p.author?.name ?? "Unknown",
    authorAvatar: p.author?.avatar ?? null,
    createdAt: p.createdAt.toISOString(),
    scheduledAt: p.scheduledAt?.toISOString() ?? null,
    platforms: Array.from(new Set(p.variants.map((v) => v.account.platform))),
    engagement: p.variants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0),
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
  }));

  // === COMMENT DETAIL LIST ===
  const commentDetails = comments.slice(0, 50).map((c) => ({
    id: c.id,
    author: c.author,
    text: c.text,
    sentiment: c.sentiment,
    replied: c.replied,
    replyText: c.replyText,
    createdAt: c.createdAt.toISOString(),
    platform: c.account.platform,
    accountName: c.account.displayName,
  }));

  // === MEMBER BREAKDOWN (if not filtering by single user) ===
  let memberBreakdown: {
    id: string; name: string; avatar: string | null; color: string | null;
    posts: number; published: number; comments: number; engagement: number;
  }[] = [];

  if (!body.userId && Array.isArray(teamMembers)) {
    memberBreakdown = teamMembers.map((m) => {
      const mPosts = filteredPosts.filter((p) => p.authorId === m.id);
      const mVariants = variants.filter((v) => v.post?.authorId === m.id);
      const mEngagement = mVariants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar ?? null,
        color: m.color ?? null,
        posts: mPosts.length,
        published: mPosts.filter((p) => p.status === "published").length,
        comments: comments.filter((c) => {
          // Comments on accounts owned by this member
          const ownedAccounts = accounts.filter((a) => a.ownerId === m.id);
          return ownedAccounts.some((a) => a.id === c.accountId);
        }).length,
        engagement: mEngagement,
      };
    }).filter((m) => m.posts > 0 || m.comments > 0)
      .sort((a, b) => b.posts - a.posts);
  }

  return NextResponse.json({
    ok: true,
    filters: {
      userId: body.userId ?? null,
      accountId: body.accountId ?? null,
      platform: body.platform ?? null,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      metrics: requestedMetrics,
    },
    summary: {
      totalPosts,
      publishedPosts,
      draftPosts,
      scheduledPosts,
      failedPosts,
      totalVariants,
      publishedVariants,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      totalEngagement,
      totalReach,
      totalImpressions,
      totalFollowers,
      replyRate,
      commentsReplied,
      sentiment: { positive, neutral, negative },
      platformBreakdown: Object.entries(platformBreakdown).map(([platform, data]) => ({ platform, ...data })),
      activeAccounts: new Set(variants.map((v) => v.accountId)).size,
    },
    series,
    posts: postDetails,
    comments: commentDetails,
    members: memberBreakdown,
    accounts: accounts.map((a) => ({
      id: a.id,
      platform: a.platform,
      handle: a.handle,
      displayName: a.displayName,
      avatar: a.avatar,
      followers: a.followers,
      ownerName: a.owner?.name ?? "Unassigned",
    })),
  });
}
