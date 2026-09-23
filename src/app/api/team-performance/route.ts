import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/team-performance
 *
 * CONTENT ACTIVITY command center — tracks team members' real work:
 * posts created, tweets/posts published, comments received & replied,
 * content pipeline (draft → scheduled → published → failed),
 * per-member posting cadence, and the 90-day activity heatmap.
 *
 * Vanity metrics (followers, impressions) are NOT the focus here —
 * the goal is to show what each team member is DOING, not how many
 * passive followers the brand has accumulated.
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
    campaigns,
  ] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.account.findMany({ include: { owner: true } }),
    db.post.findMany({ include: { author: true, variants: { include: { account: true } } } }),
    db.postVariant.findMany({ include: { account: true } }),
    db.comment.findMany(),
    db.task.findMany(),
    db.activity.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.campaign.findMany(),
  ]);

  // === Team-wide content totals ===
  const totalPostsCreated = posts.length;
  const totalPublished = posts.filter((p) => p.status === "published").length;
  const totalScheduled = posts.filter((p) => p.status === "scheduled").length;
  const totalDrafts = posts.filter((p) => p.status === "draft").length;
  const totalFailed = posts.filter((p) => p.status === "failed").length;
  const totalVariantsPublished = variants.filter((v) => v.status === "published").length;
  const totalCommentsReceived = comments.length;
  const totalCommentsReplied = comments.filter((c) => c.replied).length;
  const replyRate = totalCommentsReceived > 0
    ? Math.round((totalCommentsReplied / totalCommentsReceived) * 100)
    : 0;

  // Posts created in the last 7 days (team-wide cadence)
  const sevenDaysAgo = new Date(now - 7 * day);
  const postsLast7d = posts.filter((p) => new Date(p.createdAt) > sevenDaysAgo).length;
  const postsLast30d = posts.filter((p) => new Date(p.createdAt) > new Date(now - 30 * day)).length;

  // === Per-member content activity ===
  const members = users.map((u) => {
    const uPosts = posts.filter((p) => p.authorId === u.id);
    const uAccounts = accounts.filter((a) => a.ownerId === u.id);
    const uVariants = variants.filter((v) => uAccounts.some((a) => a.id === v.accountId));
    const uAccountIds = new Set(uAccounts.map((a) => a.id));
    const uComments = comments.filter((c) => uAccountIds.has(c.accountId));
    const uRepliedComments = uComments.filter((c) => c.replied);
    const uTasks = tasks.filter((t) => t.assigneeId === u.id);
    const uDoneTasks = uTasks.filter((t) => t.status === "done");

    const publishedPosts = uPosts.filter((p) => p.status === "published").length;
    const scheduledPosts = uPosts.filter((p) => p.status === "scheduled").length;
    const draftPosts = uPosts.filter((p) => p.status === "draft").length;
    const failedPosts = uPosts.filter((p) => p.status === "failed").length;

    // Posts created in the last 7 days by THIS member
    const uPostsLast7d = uPosts.filter((p) => new Date(p.createdAt) > sevenDaysAgo).length;
    const uPostsLast30d = uPosts.filter((p) => new Date(p.createdAt) > new Date(now - 30 * day)).length;
    const weeklyCadence = uPostsLast7d;
    const monthlyCadence = uPostsLast30d;

    // Comments handled (replied to) by this member's accounts
    const commentsReceived = uComments.length;
    const commentsReplied = uRepliedComments.length;
    const memberReplyRate = commentsReceived > 0
      ? Math.round((commentsReplied / commentsReceived) * 100)
      : 0;

    // Sentiment breakdown of comments received
    const positiveComments = uComments.filter((c) => c.sentiment === "positive").length;
    const neutralComments = uComments.filter((c) => c.sentiment === "neutral").length;
    const negativeComments = uComments.filter((c) => c.sentiment === "negative").length;

    // Per-platform content count (tweets to X, posts to IG, etc.)
    const platformContent: Record<string, { published: number; total: number }> = {};
    for (const v of uVariants) {
      const p = v.account.platform;
      if (!platformContent[p]) platformContent[p] = { published: 0, total: 0 };
      platformContent[p].total++;
      if (v.status === "published") platformContent[p].published++;
    }

    const sevenDaysAgoDate = new Date(now - 7 * day);
    const recentActivity = activities.filter(
      (a) => a.userId === u.id && new Date(a.createdAt) > sevenDaysAgoDate
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
        postsCreated: uPosts.length,
        publishedPosts,
        scheduledPosts,
        draftPosts,
        failedPosts,
        variantsPublished: uVariants.filter((v) => v.status === "published").length,
        commentsReceived,
        commentsReplied,
        replyRate: memberReplyRate,
        positiveComments,
        neutralComments,
        negativeComments,
        weeklyCadence,
        monthlyCadence,
        tasksAssigned: uTasks.length,
        completedTasks: uDoneTasks.length,
        taskCompletionRate: uTasks.length > 0 ? Math.round((uDoneTasks.length / uTasks.length) * 100) : 0,
        recentActivity,
      },
      platforms: Object.entries(platformContent).map(([platform, data]) => ({ platform, ...data })),
    };
  });

  // === Team totals ===
  const teamTotals = {
    members: users.length,
    activeMembers: users.filter((u) => u.status === "active").length,
    accounts: accounts.length,
    postsCreated: totalPostsCreated,
    publishedPosts: totalPublished,
    scheduledPosts: totalScheduled,
    draftPosts: totalDrafts,
    failedPosts: totalFailed,
    variantsPublished: totalVariantsPublished,
    commentsReceived: totalCommentsReceived,
    commentsReplied: totalCommentsReplied,
    replyRate,
    postsLast7d,
    postsLast30d,
    weeklyCadence: postsLast7d,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "done").length,
    pendingTasks: tasks.filter((t) => t.status !== "done").length,
    campaigns: campaigns.length,
    avgReplyRate: members.length > 0
      ? Math.round(members.reduce((s, m) => s + m.metrics.replyRate, 0) / members.length)
      : 0,
    avgTaskCompletion: members.length > 0
      ? Math.round(members.reduce((s, m) => s + m.metrics.taskCompletionRate, 0) / members.length)
      : 0,
  };

  // === Leaderboard — focused on CONTENT activity ===
  const leaderboard = {
    mostPostsCreated: [...members].sort((a, b) => b.metrics.postsCreated - a.metrics.postsCreated).slice(0, 3),
    mostPublished: [...members].sort((a, b) => b.metrics.publishedPosts - a.metrics.publishedPosts).slice(0, 3),
    mostCommentsReplied: [...members].sort((a, b) => b.metrics.commentsReplied - a.metrics.commentsReplied).slice(0, 3),
    bestReplyRate: [...members]
      .filter((m) => m.metrics.commentsReceived >= 0)
      .sort((a, b) => b.metrics.replyRate - a.metrics.replyRate)
      .slice(0, 3),
    mostActive: [...members].sort((a, b) => b.metrics.weeklyCadence - a.metrics.weeklyCadence).slice(0, 3),
  };

  // === Posts created trend (last 14 days) ===
  const trend: { date: string; postsCreated: number; published: number; comments: number }[] = [];
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now - d * day);
    const dayKey = date.toISOString().slice(0, 10);
    const dayPosts = posts.filter((p) => p.createdAt.toISOString().slice(0, 10) === dayKey);
    const dayVariants = variants.filter((v) =>
      v.publishedAt && v.publishedAt.toISOString().slice(0, 10) === dayKey
    );
    const dayComments = comments.filter((c) => c.createdAt.toISOString().slice(0, 10) === dayKey);
    trend.push({
      date: dayKey,
      postsCreated: dayPosts.length,
      published: dayVariants.length,
      comments: dayComments.length,
    });
  }

  // === Content pipeline (status breakdown) ===
  const pipeline = {
    draft: totalDrafts,
    scheduled: totalScheduled,
    published: totalPublished,
    failed: totalFailed,
  };

  // === Posts by platform (tweets to X, posts to IG, etc.) ===
  const postsByPlatform: Record<string, { published: number; total: number; comments: number }> = {};
  for (const v of variants) {
    const p = v.account.platform;
    if (!postsByPlatform[p]) postsByPlatform[p] = { published: 0, total: 0, comments: 0 };
    postsByPlatform[p].total++;
    if (v.status === "published") postsByPlatform[p].published++;
    postsByPlatform[p].comments += v.comments;
  }

  // === Comments tracking (received vs replied + sentiment) ===
  const commentsByType: Record<string, number> = {};
  for (const c of comments) {
    commentsByType[c.type] = (commentsByType[c.type] ?? 0) + 1;
  }
  const commentsBySentiment = {
    positive: comments.filter((c) => c.sentiment === "positive").length,
    neutral: comments.filter((c) => c.sentiment === "neutral").length,
    negative: comments.filter((c) => c.sentiment === "negative").length,
  };

  // === Per-account comment inbox (which accounts have the most unread comments) ===
  const accountCommentLoad = accounts.map((a) => {
    const aComments = comments.filter((c) => c.accountId === a.id);
    const unread = aComments.filter((c) => !c.replied);
    return {
      id: a.id,
      platform: a.platform,
      handle: a.handle,
      displayName: a.displayName,
      ownerName: a.owner?.name ?? "Unassigned",
      ownerColor: a.owner?.color ?? null,
      total: aComments.length,
      unread: unread.length,
      replied: aComments.length - unread.length,
      replyRate: aComments.length > 0 ? Math.round(((aComments.length - unread.length) / aComments.length) * 100) : 0,
    };
  }).filter((a) => a.total > 0).sort((a, b) => b.unread - a.unread);

  // === Activity heatmap (90 days of publishing cadence) ===
  const heatmap: { date: string; count: number; platforms: string[] }[] = [];
  for (let d = 89; d >= 0; d--) {
    const date = new Date(now - d * day);
    const dayKey = date.toISOString().slice(0, 10);
    const dayVariants = variants.filter(
      (v) => v.publishedAt && v.publishedAt.toISOString().slice(0, 10) === dayKey
    );
    // Also count posts created that day (even if not yet published) for a fuller heatmap
    const dayPostsCreated = posts.filter((p) => p.createdAt.toISOString().slice(0, 10) === dayKey);
    const dayCount = Math.max(dayVariants.length, dayPostsCreated.length);
    const platformSet = new Set<string>();
    for (const v of dayVariants) platformSet.add(v.account.platform);
    for (const p of dayPostsCreated) {
      for (const v of p.variants) platformSet.add(v.account.platform);
    }
    heatmap.push({ date: dayKey, count: dayCount, platforms: Array.from(platformSet) });
  }

  // === Recent activities (already formatted) ===
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
    pipeline,
    postsByPlatform: Object.entries(postsByPlatform).map(([platform, data]) => ({ platform, ...data })),
    commentsByType,
    commentsBySentiment,
    accountCommentLoad,
    trend,
    activityHeatmap: heatmap,
    recentActivities,
  });
}
