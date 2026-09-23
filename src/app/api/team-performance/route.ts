import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/team-performance
 *
 * Comprehensive team performance analytics:
 * - Per-member metrics: posts, accounts, engagement, followers, tasks, comments
 * - Team-wide totals and averages
 * - Top performers leaderboard
 * - Platform distribution
 * - Activity timeline
 * - Engagement trend (last 14 days)
 */
export async function GET() {
  const [users, accounts, posts, variants, comments, tasks, activities, analytics, campaigns] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.account.findMany({ include: { health: true } }),
    db.post.findMany({ include: { author: true, variants: true } }),
    db.postVariant.findMany(),
    db.comment.findMany(),
    db.task.findMany(),
    db.activity.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.analyticsDaily.findMany({ orderBy: { date: "asc" } }),
    db.campaign.findMany(),
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

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
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
  const now = Date.now();
  const day = 86400000;
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

  return NextResponse.json({
    members,
    teamTotals,
    leaderboard,
    platformDistribution: Object.entries(platformDist).map(([platform, data]) => ({ platform, ...data })),
    trend,
    recentActivities,
  });
}
