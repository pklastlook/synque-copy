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
 *   postStatus?: string[],  // filter posts by status: published|draft|scheduled|failed
 *   sentiment?: string[],   // filter comments by sentiment: positive|neutral|negative
 *   sortBy?: string,        // 'date-desc' | 'date-asc' | 'engagement-desc' | 'comments-desc'
 *   groupBy?: string,       // 'day' | 'week' | 'month' — series aggregation
 *   minEngagement?: number, // minimum engagement threshold for posts
 *   search?: string,        // search in post titles/captions
 * }
 *
 * Returns a structured report with:
 * - summary KPIs (computed from real DB data)
 * - aggregated breakdown series (day / week / month)
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
    postStatus?: string[];
    sentiment?: string[];
    sortBy?: string;
    groupBy?: string;
    minEngagement?: number;
    search?: string;
  };

  const startDate = body.startDate ? new Date(body.startDate) : new Date(Date.now() - 30 * 86400000);
  const endDate = body.endDate ? new Date(body.endDate) : new Date();
  endDate.setHours(23, 59, 59, 999);
  startDate.setHours(0, 0, 0, 0);

  const requestedMetrics = body.metrics ?? [
    "posts", "published", "comments", "shares", "likes", "engagement",
    "followers", "reach", "impressions", "replyRate",
  ];

  // === Normalize new filters ===
  const postStatusFilter = Array.isArray(body.postStatus) && body.postStatus.length > 0
    ? body.postStatus
    : null;
  const sentimentFilter = Array.isArray(body.sentiment) && body.sentiment.length > 0
    ? body.sentiment
    : null;
  const sortBy = body.sortBy ?? "date-desc";
  const groupBy = body.groupBy ?? "day";
  const minEngagement = typeof body.minEngagement === "number" && !isNaN(body.minEngagement)
    ? body.minEngagement
    : 0;
  const search = typeof body.search === "string" && body.search.trim().length > 0
    ? body.search.trim().toLowerCase()
    : null;

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
      bestPost: null,
      filters: {
        userId: body.userId ?? null,
        accountId: body.accountId ?? null,
        platform: body.platform ?? null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        metrics: requestedMetrics,
        postStatus: postStatusFilter,
        sentiment: sentimentFilter,
        sortBy,
        groupBy,
        minEngagement,
        search,
      },
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
  if (postStatusFilter) {
    postWhere.status = { in: postStatusFilter };
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
  if (sentimentFilter) {
    commentWhere.sentiment = { in: sentimentFilter };
  }

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
  let variants = allVariants.filter((v) => {
    const d = v.publishedAt ?? v.createdAt;
    return d >= startDate && d <= endDate;
  });

  // Filter posts by user if specified (also filter via variant.accountId)
  let filteredPosts = body.userId
    ? posts.filter((p) => p.authorId === body.userId)
    : posts;

  // === Apply search filter (post title/caption) ===
  if (search) {
    filteredPosts = filteredPosts.filter((p) =>
      (p.title ?? "").toLowerCase().includes(search) ||
      (p.caption ?? "").toLowerCase().includes(search)
    );
    // Restrict variants to those that belong to surviving posts
    const survivingPostIds = new Set(filteredPosts.map((p) => p.id));
    variants = variants.filter((v) => survivingPostIds.has(v.postId));
  }

  // === COMPUTE POST-LEVEL ENGAGEMENT (needed for min-engagement + sort) ===
  const postEngagement = new Map<string, number>();
  for (const p of filteredPosts) {
    const eng = p.variants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
    postEngagement.set(p.id, eng);
  }
  const postCommentCount = new Map<string, number>();
  // Comments aren't linked to posts directly in the schema, so we approximate
  // by checking if a post variant was published on the account the comment
  // came from. We'll fall back to zero — used only as a sort key.
  for (const p of filteredPosts) {
    postCommentCount.set(p.id, p.variants.reduce((s, v) => s + v.comments, 0));
  }

  // === Apply min-engagement filter ===
  if (minEngagement > 0) {
    filteredPosts = filteredPosts.filter((p) => (postEngagement.get(p.id) ?? 0) >= minEngagement);
  }

  // === Apply sort ===
  const sortedPosts = [...filteredPosts];
  switch (sortBy) {
    case "date-asc":
      sortedPosts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      break;
    case "engagement-desc":
      sortedPosts.sort((a, b) => (postEngagement.get(b.id) ?? 0) - (postEngagement.get(a.id) ?? 0));
      break;
    case "comments-desc":
      sortedPosts.sort((a, b) => (postCommentCount.get(b.id) ?? 0) - (postCommentCount.get(a.id) ?? 0));
      break;
    case "date-desc":
    default:
      sortedPosts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      break;
  }

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

  // Derived: engagement rate (engagement / impressions) + avg eng per post
  const engagementRate = totalImpressions > 0
    ? Math.round((totalEngagement / totalImpressions) * 1000) / 10
    : 0;
  const avgEngagementPerPost = totalPosts > 0
    ? Math.round(totalEngagement / totalPosts)
    : 0;

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

  // === COMPUTE BEST PERFORMING POST ===
  let bestPost: {
    id: string; title: string; caption: string; status: string;
    authorName: string; engagement: number; likes: number; comments: number;
    shares: number; platforms: string[]; createdAt: string;
  } | null = null;
  if (sortedPosts.length > 0) {
    const top = [...sortedPosts].sort(
      (a, b) => (postEngagement.get(b.id) ?? 0) - (postEngagement.get(a.id) ?? 0)
    )[0];
    const topEng = postEngagement.get(top.id) ?? 0;
    if (topEng > 0) {
      bestPost = {
        id: top.id,
        title: top.title,
        caption: top.caption,
        status: top.status,
        authorName: top.author?.name ?? "Unknown",
        engagement: topEng,
        likes: top.variants.reduce((s, v) => s + v.likes, 0),
        comments: top.variants.reduce((s, v) => s + v.comments, 0),
        shares: top.variants.reduce((s, v) => s + v.shares, 0),
        platforms: Array.from(new Set(top.variants.map((v) => v.account.platform))),
        createdAt: top.createdAt.toISOString(),
      };
    }
  }

  // === COMPUTE SERIES (with groupBy aggregation) ===
  // First compute the per-day series, then aggregate by week or month.
  const dayMs = 86400000;
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs);
  const dailySeriesDays = Math.min(totalDays + 1, 365);

  const dailySeries: {
    date: string; postsCreated: number; published: number; comments: number;
    shares: number; likes: number; engagement: number; followers: number;
    reach: number; impressions: number;
  }[] = [];

  for (let d = 0; d < dailySeriesDays; d++) {
    const date = new Date(startDate.getTime() + d * dayMs);
    const dayKey = date.toISOString().slice(0, 10);

    const dayPosts = filteredPosts.filter((p) => p.createdAt.toISOString().slice(0, 10) === dayKey);
    const dayVariants = variants.filter((v) => {
      const vd = v.publishedAt ?? v.createdAt;
      return vd.toISOString().slice(0, 10) === dayKey;
    });
    const dayComments = comments.filter((c) => c.createdAt.toISOString().slice(0, 10) === dayKey);
    const dayAnalytics = analytics.filter((a) => a.date.toISOString().slice(0, 10) === dayKey);

    dailySeries.push({
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

  // === Aggregate by groupBy period (week / month) ===
  const series = (() => {
    if (groupBy === "day") return dailySeries;
    const buckets = new Map<string, {
      date: string; postsCreated: number; published: number; comments: number;
      shares: number; likes: number; engagement: number; followers: number;
      reach: number; impressions: number;
    }>();
    for (const d of dailySeries) {
      const date = new Date(d.date);
      let bucketKey: string;
      if (groupBy === "week") {
        // ISO week — find Monday of week
        const tmp = new Date(date);
        const day = (tmp.getUTCDay() + 6) % 7; // Mon=0, Sun=6
        tmp.setUTCDate(tmp.getUTCDate() - day);
        bucketKey = tmp.toISOString().slice(0, 10);
      } else {
        // month
        bucketKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
      }
      const existing = buckets.get(bucketKey) ?? {
        date: bucketKey,
        postsCreated: 0, published: 0, comments: 0,
        shares: 0, likes: 0, engagement: 0,
        followers: 0, reach: 0, impressions: 0,
      };
      existing.postsCreated += d.postsCreated;
      existing.published += d.published;
      existing.comments += d.comments;
      existing.shares += d.shares;
      existing.likes += d.likes;
      existing.engagement += d.engagement;
      existing.followers = Math.max(existing.followers, d.followers); // peak followers
      existing.reach += d.reach;
      existing.impressions += d.impressions;
      buckets.set(bucketKey, existing);
    }
    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
  })();

  // === POSTING CADENCE (posts per period — used for the cadence mini-chart) ===
  const cadence = series.map((s) => ({
    period: s.date,
    posts: s.postsCreated,
    label: groupBy === "day" ? s.date.slice(5) : s.date.slice(0, 7),
  }));

  // === POST DETAIL LIST ===
  const postDetails = sortedPosts.slice(0, 50).map((p) => ({
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
    likes: p.variants.reduce((s, v) => s + v.likes, 0),
    comments: p.variants.reduce((s, v) => s + v.comments, 0),
    shares: p.variants.reduce((s, v) => s + v.shares, 0),
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
      postStatus: postStatusFilter,
      sentiment: sentimentFilter,
      sortBy,
      groupBy,
      minEngagement,
      search,
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
      engagementRate,
      avgEngagementPerPost,
      sentiment: { positive, neutral, negative },
      platformBreakdown: Object.entries(platformBreakdown).map(([platform, data]) => ({ platform, ...data })),
      activeAccounts: new Set(variants.map((v) => v.accountId)).size,
    },
    series,
    cadence,
    posts: postDetails,
    comments: commentDetails,
    members: memberBreakdown,
    bestPost,
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
