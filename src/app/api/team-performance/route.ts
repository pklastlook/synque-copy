import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/team-performance
 *
 * Comprehensive team performance analytics — admin command center:
 * - Per-member metrics: posts, accounts, engagement, followers, tasks, comments
 * - Team-wide totals and averages
 * - Top performers leaderboard
 * - Platform distribution
 * - Activity timeline
 * - Engagement trend (last 14 days)
 *
 * PLUS the new sections added to make this a true admin control panel:
 * - platforms[]: rich per-platform aggregation (accounts, followers, posts,
 *   engagement, growth7d, growth30d, topProfile, sparkline[14d followers])
 * - profiles[]: per-account "page" card (followers, posts, engagement rate,
 *   growth, posting cadence, health, ownerName, sparkline)
 * - pagesProgress[]: per-account progress vs workspace targets (followers
 *   target % achieved, weekly posts target vs actual, engagement target vs
 *   actual, status badge)
 * - activityHeatmap: 90-day array of { date, count, platform } for the
 *   GitHub-style posting cadence grid
 * - performanceMatrix: per-member scatter data { name, color, followers,
 *   engagementRate, posts } for the bubble matrix
 */
export async function GET() {
  const now = Date.now();
  const day = 86400000;

  const [
    users,
    accounts,
    posts,
    variants,
    comments,
    tasks,
    activities,
    analytics,
    campaigns,
    workspace,
  ] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.account.findMany({ include: { health: true, owner: true } }),
    db.post.findMany({ include: { author: true, variants: true } }),
    db.postVariant.findMany({ include: { account: true } }),
    db.comment.findMany(),
    db.task.findMany(),
    db.activity.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.analyticsDaily.findMany({ orderBy: { date: "asc" } }),
    db.campaign.findMany(),
    db.workspace.findFirst(),
  ]);

  // === Per-member performance ===
  const members = users.map((u) => {
    const uAccounts = accounts.filter((a) => a.ownerId === u.id);
    const uPosts = posts.filter((p) => p.authorId === u.id);
    const uVariants = variants.filter((v) => uAccounts.some((a) => a.id === v.accountId));
    const uComments = comments.filter((c) => uAccounts.some((a) => a.id === c.accountId));
    const uTasks = tasks.filter((t) => t.assigneeId === u.id);
    const uDoneTasks = uTasks.filter((t) => t.status === "done");
    const uAnalytics = analytics.filter((a) => uAccounts.some((acc) => acc.id === a.accountId));

    const followers = uAccounts.reduce((s, a) => s + a.followers, 0);
    const impressions = uAnalytics.reduce((s, a) => s + a.impressions, 0);
    const reach = uAnalytics.reduce((s, a) => s + a.reach, 0);
    const engagement = uVariants.reduce((s, v) => s + v.likes + v.comments + v.shares + v.saves, 0);
    const likes = uVariants.reduce((s, v) => s + v.likes, 0);
    const commentCount = uVariants.reduce((s, v) => s + v.comments, 0);
    const shares = uVariants.reduce((s, v) => s + v.shares, 0);
    const saves = uVariants.reduce((s, v) => s + v.saves, 0);

    const platforms: Record<string, { accounts: number; followers: number; engagement: number }> = {};
    for (const a of uAccounts) {
      if (!platforms[a.platform]) platforms[a.platform] = { accounts: 0, followers: 0, engagement: 0 };
      platforms[a.platform].accounts++;
      platforms[a.platform].followers += a.followers;
      const aVar = uVariants.filter((v) => v.accountId === a.id);
      platforms[a.platform].engagement += aVar.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
    }

    const engagementRate = reach > 0 ? (engagement / reach) * 100 : 0;
    const taskCompletionRate = uTasks.length > 0 ? (uDoneTasks.length / uTasks.length) * 100 : 0;
    const publishedPosts = uPosts.filter((p) => p.status === "published").length;
    const scheduledPosts = uPosts.filter((p) => p.status === "scheduled").length;
    const draftPosts = uPosts.filter((p) => p.status === "draft").length;

    const sevenDaysAgo = new Date(now - 7 * day);
    const recentActivity = activities.filter(
      (a) => a.userId === u.id && new Date(a.createdAt) > sevenDaysAgo
    ).length;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role,
      title: u.title,
      department: u.department,
      color: u.color,
      status: u.status,
      metrics: {
        accounts: uAccounts.length,
        posts: uPosts.length,
        publishedPosts,
        scheduledPosts,
        draftPosts,
        followers,
        impressions,
        reach,
        engagement,
        likes,
        comments: commentCount,
        shares,
        saves,
        engagementRate: Math.round(engagementRate * 10) / 10,
        tasks: uTasks.length,
        completedTasks: uDoneTasks.length,
        taskCompletionRate: Math.round(taskCompletionRate),
        commentsReceived: uComments.length,
        recentActivity,
      },
      platforms: Object.entries(platforms).map(([platform, data]) => ({ platform, ...data })),
    };
  });

  // === Team-wide totals ===
  const teamTotals = {
    members: users.length,
    activeMembers: users.filter((u) => u.status === "active").length,
    accounts: accounts.length,
    posts: posts.length,
    publishedPosts: posts.filter((p) => p.status === "published").length,
    scheduledPosts: posts.filter((p) => p.status === "scheduled").length,
    draftPosts: posts.filter((p) => p.status === "draft").length,
    totalFollowers: accounts.reduce((s, a) => s + a.followers, 0),
    totalImpressions: analytics.reduce((s, a) => s + a.impressions, 0),
    totalReach: analytics.reduce((s, a) => s + a.reach, 0),
    totalEngagement: variants.reduce((s, v) => s + v.likes + v.comments + v.shares + v.saves, 0),
    totalLikes: variants.reduce((s, v) => s + v.likes, 0),
    totalComments: variants.reduce((s, v) => s + v.comments, 0),
    totalShares: variants.reduce((s, v) => s + v.shares, 0),
    totalSaves: variants.reduce((s, v) => s + v.saves, 0),
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "done").length,
    pendingTasks: tasks.filter((t) => t.status !== "done").length,
    campaigns: campaigns.length,
    avgEngagementRate: 0,
    avgTaskCompletion: 0,
  };

  if (members.length > 0) {
    teamTotals.avgEngagementRate = Math.round(
      (members.reduce((s, m) => s + m.metrics.engagementRate, 0) / members.length) * 10
    ) / 10;
    teamTotals.avgTaskCompletion = Math.round(
      members.reduce((s, m) => s + m.metrics.taskCompletionRate, 0) / members.length
    );
  }

  // === Top performers leaderboard ===
  const leaderboard = {
    mostFollowers: [...members].sort((a, b) => b.metrics.followers - a.metrics.followers).slice(0, 3),
    mostPosts: [...members].sort((a, b) => b.metrics.posts - a.metrics.posts).slice(0, 3),
    mostEngagement: [...members].sort((a, b) => b.metrics.engagement - a.metrics.engagement).slice(0, 3),
    bestEngagementRate: [...members].sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate).slice(0, 3),
    mostTasksCompleted: [...members].sort((a, b) => b.metrics.completedTasks - a.metrics.completedTasks).slice(0, 3),
  };

  // === Platform distribution ===
  const platformDist: Record<string, { accounts: number; followers: number; engagement: number }> = {};
  for (const a of accounts) {
    if (!platformDist[a.platform]) platformDist[a.platform] = { accounts: 0, followers: 0, engagement: 0 };
    platformDist[a.platform].accounts++;
    platformDist[a.platform].followers += a.followers;
    const aVar = variants.filter((v) => v.accountId === a.id);
    platformDist[a.platform].engagement += aVar.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
  }

  // === Engagement trend (last 14 days) ===
  const trend: { date: string; engagement: number; posts: number; impressions: number }[] = [];
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now - d * day);
    const dayKey = date.toISOString().slice(0, 10);
    const dayAnalytics = analytics.filter((a) => a.date.toISOString().slice(0, 10) === dayKey);
    const dayPosts = posts.filter((p) => p.createdAt.toISOString().slice(0, 10) === dayKey);
    trend.push({
      date: dayKey,
      engagement: dayAnalytics.reduce((s, a) => s + a.engagement, 0),
      posts: dayPosts.length,
      impressions: dayAnalytics.reduce((s, a) => s + a.impressions, 0),
    });
  }

  const recentActivities = activities.map((a) => ({
    id: a.id,
    userId: a.userId,
    userName: a.user?.name ?? "Unknown",
    userAvatar: a.user?.avatar,
    userColor: a.user?.color,
    type: a.type,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
  }));

  // =====================================================================
  // NEW SECTIONS — Social platforms, Profiles, Pages progress, Heatmap, Matrix
  // =====================================================================

  // --- Per-platform rich aggregation with sparkline + top profile + growth ---
  const platformsMeta: Record<string, {
    accounts: number;
    followers: number;
    posts: number;
    engagement: number;
    impressions: number;
    reach: number;
    followerSparkline: number[];
    engagementSparkline: number[];
    growth7d: number;
    growth30d: number;
    topProfileId: string | null;
  }> = {};

  for (const acc of accounts) {
    const p = acc.platform;
    if (!platformsMeta[p]) {
      platformsMeta[p] = {
        accounts: 0, followers: 0, posts: 0, engagement: 0,
        impressions: 0, reach: 0,
        followerSparkline: Array(14).fill(0),
        engagementSparkline: Array(14).fill(0),
        growth7d: 0, growth30d: 0, topProfileId: null,
      };
    }
    const m = platformsMeta[p];
    m.accounts++;
    m.followers += acc.followers;
    const accVariants = variants.filter((v) => v.accountId === acc.id);
    m.posts += accVariants.length;
    m.engagement += accVariants.reduce((s, v) => s + v.likes + v.comments + v.shares + v.saves, 0);
    const accAnalytics = analytics.filter((a) => a.accountId === acc.id);
    m.impressions += accAnalytics.reduce((s, a) => s + a.impressions, 0);
    m.reach += accAnalytics.reduce((s, a) => s + a.reach, 0);
  }

  // Build sparklines per platform by summing daily analytics across all accounts of that platform
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now - d * day);
    const dayKey = date.toISOString().slice(0, 10);
    for (const p of Object.keys(platformsMeta)) {
      const dayAnalytics = analytics.filter(
        (a) => a.date.toISOString().slice(0, 10) === dayKey && accounts.find((x) => x.id === a.accountId)?.platform === p
      );
      const fol = dayAnalytics.reduce((s, a) => s + a.followers, 0);
      const eng = dayAnalytics.reduce((s, a) => s + a.engagement, 0);
      const idx = 13 - d;
      platformsMeta[p].followerSparkline[idx] = fol;
      platformsMeta[p].engagementSparkline[idx] = eng;
    }
  }

  // Growth 7d / 30d — delta of followers between latest analytics point and 7/30 days ago, per platform
  for (const p of Object.keys(platformsMeta)) {
    const pAnalytics = analytics.filter((a) => accounts.find((x) => x.id === a.accountId)?.platform === p);
    const sorted = [...pAnalytics].sort((a, b) => a.date.getTime() - b.date.getTime());
    if (sorted.length >= 2) {
      const latest = sorted[sorted.length - 1].followers;
      const sevenAgo = sorted.find((x) => x.date.getTime() >= now - 7 * day)?.followers ?? null;
      const thirtyAgo = sorted.find((x) => x.date.getTime() >= now - 30 * day)?.followers ?? null;
      if (sevenAgo !== null && sevenAgo > 0) platformsMeta[p].growth7d = Math.round(((latest - sevenAgo) / sevenAgo) * 1000) / 10;
      if (thirtyAgo !== null && thirtyAgo > 0) platformsMeta[p].growth30d = Math.round(((latest - thirtyAgo) / thirtyAgo) * 1000) / 10;
    }
    // topProfileId = account with the most followers on this platform
    const platformAccounts = accounts.filter((a) => a.platform === p).sort((a, b) => b.followers - a.followers);
    if (platformAccounts.length > 0) platformsMeta[p].topProfileId = platformAccounts[0].id;
  }

  const platformsSummary = Object.entries(platformsMeta).map(([platform, data]) => ({
    platform,
    ...data,
    engagementRate: data.reach > 0 ? Math.round((data.engagement / data.reach) * 1000) / 10 : 0,
    avgFollowersPerAccount: data.accounts > 0 ? Math.round(data.followers / data.accounts) : 0,
  })).sort((a, b) => b.followers - a.followers);

  // --- Per-account profiles (page cards) ---
  const profiles = accounts.map((acc) => {
    const accVariants = variants.filter((v) => v.accountId === acc.id);
    const accAnalytics = analytics.filter((a) => a.accountId === acc.id).sort((a, b) => a.date.getTime() - b.date.getTime());
    const engagement = accVariants.reduce((s, v) => s + v.likes + v.comments + v.shares + v.saves, 0);
    const reach = accAnalytics.reduce((s, a) => s + a.reach, 0);
    const impressions = accAnalytics.reduce((s, a) => s + a.impressions, 0);

    // Sparkline — last 14 days of followers
    const sparkline: number[] = Array(14).fill(0);
    for (let d = 13; d >= 0; d--) {
      const date = new Date(now - d * day);
      const dayKey = date.toISOString().slice(0, 10);
      const dayA = accAnalytics.find((x) => x.date.toISOString().slice(0, 10) === dayKey);
      sparkline[13 - d] = dayA?.followers ?? (sparkline[13 - d - 1] ?? acc.followers);
    }
    // Fill leading zeros with the account's current follower count for visual continuity
    let lastVal = acc.followers;
    for (let i = sparkline.length - 1; i >= 0; i--) {
      if (sparkline[i] === 0) sparkline[i] = lastVal;
      else lastVal = sparkline[i];
    }

    // Growth
    let growth7d = 0, growth30d = 0;
    if (accAnalytics.length >= 2) {
      const latest = accAnalytics[accAnalytics.length - 1].followers;
      const sevenAgo = accAnalytics.find((x) => x.date.getTime() >= now - 7 * day)?.followers ?? null;
      const thirtyAgo = accAnalytics.find((x) => x.date.getTime() >= now - 30 * day)?.followers ?? null;
      if (sevenAgo !== null && sevenAgo > 0) growth7d = Math.round(((latest - sevenAgo) / sevenAgo) * 1000) / 10;
      if (thirtyAgo !== null && thirtyAgo > 0) growth30d = Math.round(((latest - thirtyAgo) / thirtyAgo) * 1000) / 10;
    }

    // Posting cadence (posts in last 7 days / 7)
    const sevenDayPosts = accVariants.filter((v) => v.publishedAt && v.publishedAt.getTime() > now - 7 * day).length;
    const thirtyDayPosts = accVariants.filter((v) => v.publishedAt && v.publishedAt.getTime() > now - 30 * day).length;

    return {
      id: acc.id,
      platform: acc.platform,
      handle: acc.handle,
      displayName: acc.displayName,
      avatar: acc.avatar,
      followers: acc.followers,
      postsCount: acc.postsCount,
      verified: acc.verified,
      ownerName: acc.owner?.name ?? "Unassigned",
      ownerColor: acc.owner?.color ?? null,
      engagement,
      reach,
      impressions,
      engagementRate: reach > 0 ? Math.round((engagement / reach) * 1000) / 10 : 0,
      growth7d,
      growth30d,
      sparkline,
      postingCadencePerWeek: sevenDayPosts,
      postingCadencePerMonth: thirtyDayPosts,
      healthStatus: acc.health?.status ?? "healthy",
      riskLevel: acc.health?.riskLevel ?? "safe",
      lastActiveAt: accAnalytics.length > 0 ? accAnalytics[accAnalytics.length - 1].date.toISOString() : null,
    };
  }).sort((a, b) => b.followers - a.followers);

  // --- Pages progress (vs workspace targets) ---
  // Targets come from the workspace settings (per-week cadence + tone).
  // If no workspace, fallback to 3/day → 21/week.
  const postsPerWeekTarget = workspace?.cadence
    ? parseInt(workspace.cadence, 10) * 7
    : 21;
  const followersTargetPerAccount = 10000; // sensible default stretch goal
  const engagementTargetRate = 3.0; // % industry standard

  const pagesProgress = profiles.map((p) => {
    const followersProgress = Math.min(100, Math.round((p.followers / followersTargetPerAccount) * 100));
    const postsProgress = Math.min(100, Math.round((p.postingCadencePerWeek / Math.max(1, postsPerWeekTarget)) * 100));
    const engagementProgress = Math.min(100, Math.round((p.engagementRate / engagementTargetRate) * 100));

    const overall = Math.round((followersProgress + postsProgress + engagementProgress) / 3);

    let status: "on_track" | "needs_attention" | "at_risk" = "on_track";
    if (overall < 33) status = "at_risk";
    else if (overall < 66) status = "needs_attention";

    return {
      id: p.id,
      platform: p.platform,
      handle: p.handle,
      displayName: p.displayName,
      followersProgress,
      postsProgress,
      engagementProgress,
      overall,
      status,
      followersTarget: followersTargetPerAccount,
      postsTarget: postsPerWeekTarget,
      engagementTarget: engagementTargetRate,
      followersCurrent: p.followers,
      postsCurrent: p.postingCadencePerWeek,
      engagementCurrent: p.engagementRate,
    };
  });

  // --- Activity heatmap (last 90 days of post publishing) ---
  const heatmap: { date: string; count: number; platforms: string[] }[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = new Date(now - d * day);
    const dayKey = date.toISOString().slice(0, 10);
    const dayVariants = variants.filter((v) => v.publishedAt && v.publishedAt.toISOString().slice(0, 10) === dayKey);
    const platformSet = new Set<string>();
    for (const v of dayVariants) platformSet.add(v.account.platform);
    heatmap.push({ date: dayKey, count: dayVariants.length, platforms: Array.from(platformSet) });
  }

  // --- Performance matrix (per-member scatter for bubble chart) ---
  const performanceMatrix = members.map((m) => ({
    name: m.name,
    color: m.color ?? "blue",
    followers: m.metrics.followers,
    engagementRate: m.metrics.engagementRate,
    posts: m.metrics.posts,
    department: m.department ?? "General",
    role: m.role,
  }));

  // --- Engagement rate distribution (for the donut chart) ---
  const engagementBuckets = [
    { range: "0-1%", min: 0, max: 1, count: 0, color: "oklch(0.7 0.15 25)" },
    { range: "1-3%", min: 1, max: 3, count: 0, color: "oklch(0.75 0.18 75)" },
    { range: "3-5%", min: 3, max: 5, count: 0, color: "oklch(0.78 0.18 165)" },
    { range: "5-10%", min: 5, max: 10, count: 0, color: "oklch(0.6 0.2 255)" },
    { range: "10%+", min: 10, max: Infinity, count: 0, color: "oklch(0.66 0.22 305)" },
  ];
  for (const p of profiles) {
    for (const b of engagementBuckets) {
      if (p.engagementRate >= b.min && p.engagementRate < b.max) {
        b.count++;
        break;
      }
    }
  }

  return NextResponse.json({
    members,
    teamTotals,
    leaderboard,
    platformDistribution: Object.entries(platformDist).map(([platform, data]) => ({ platform, ...data })),
    trend,
    recentActivities,
    // New sections:
    platforms: platformsSummary,
    profiles,
    pagesProgress,
    activityHeatmap: heatmap,
    performanceMatrix,
    engagementBuckets,
    targets: {
      postsPerWeek: postsPerWeekTarget,
      followersPerAccount: followersTargetPerAccount,
      engagementRate: engagementTargetRate,
    },
  });
}
