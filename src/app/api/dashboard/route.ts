import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

/**
 * GET /api/dashboard
 *
 * Comprehensive command-center dashboard — the admin's at-a-glance overview.
 * Combines reach/followers (vanity) WITH content activity (posts/comments)
 * so the Dashboard is distinct from the Performance module (which is
 * purely content-activity focused).
 *
 * Sections:
 * - KPIs: followers, reach, posts created, comments (mixed vanity + content)
 * - Pages ranking: per-account followers/reach/posts/engagement (sortable)
 * - Reach + follower trend (14 days)
 * - Content pipeline (draft/scheduled/published/failed)
 * - Top performing content (by engagement)
 * - Comment inbox preview (latest unread)
 * - Top contributors (most active members)
 * - Recent posts (clickable for republish)
 * - Upcoming scheduled
 * - Team activity feed
 */
export async function GET() {
  try {
    const [accounts, posts, variants, comments, activities, analytics] = await Promise.all([
      db.account.findMany({ include: { owner: true, health: true } }),
      db.post.findMany({
        include: {
          author: true,
          variants: { include: { account: true } },
        },
      }),
      db.postVariant.findMany({ include: { account: true } }),
      db.comment.findMany({ include: { account: { include: { owner: true } } } }),
      db.activity.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.analyticsDaily.findMany({ orderBy: { date: "asc" } }),
    ]);

    const now = Date.now();
    const day = 86400000;
    const sevenDaysAgo = new Date(now - 7 * day);
    const fourteenDaysAgo = new Date(now - 14 * day);
    const thirtyDaysAgo = new Date(now - 30 * day);

    // === Followers + Reach totals ===
    const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
    const totalReach = analytics.reduce((s, a) => s + a.reach, 0);
    const totalImpressions = analytics.reduce((s, a) => s + a.impressions, 0);
    const totalEngagement = variants.reduce((s, v) => s + v.likes + v.comments + v.shares + v.saves, 0);

    // 7d vs prev 7d deltas
    const last7Analytics = analytics.filter((a) => a.date.getTime() > now - 7 * day);
    const prev7Analytics = analytics.filter(
      (a) => a.date.getTime() > now - 14 * day && a.date.getTime() <= now - 7 * day
    );
    const l7Follow = last7Analytics.reduce((s, a) => s + a.followers, 0);
    const p7Follow = prev7Analytics.reduce((s, a) => s + a.followers, 0) || 1;
    const l7Reach = last7Analytics.reduce((s, a) => s + a.reach, 0);
    const p7Reach = prev7Analytics.reduce((s, a) => s + a.reach, 0) || 1;
    const l7Imp = last7Analytics.reduce((s, a) => s + a.impressions, 0);
    const p7Imp = prev7Analytics.reduce((s, a) => s + a.impressions, 0) || 1;

    const delta = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : a > 0 ? 100 : 0);

    // === Content pipeline counts ===
    const publishedCount = posts.filter((p) => p.status === "published").length;
    const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
    const draftCount = posts.filter((p) => p.status === "draft").length;
    const failedCount = posts.filter((p) => p.status === "failed").length;

    // === Comments tracking ===
    const commentsReceived = comments.length;
    const commentsReplied = comments.filter((c) => c.replied).length;
    const commentsPending = commentsReceived - commentsReplied;
    const replyRate = commentsReceived > 0
      ? Math.round((commentsReplied / commentsReceived) * 100)
      : 0;

    // === Content activity deltas (7d vs prev 7d) ===
    const postsLast7d = posts.filter((p) => new Date(p.createdAt) > sevenDaysAgo).length;
    const postsPrev7d = posts.filter(
      (p) => new Date(p.createdAt) > fourteenDaysAgo && new Date(p.createdAt) <= sevenDaysAgo
    ).length;
    const postsDelta = delta(postsLast7d, postsPrev7d);

    const commentsLast7d = comments.filter((c) => new Date(c.createdAt) > sevenDaysAgo).length;
    const commentsPrev7d = comments.filter(
      (c) => new Date(c.createdAt) > fourteenDaysAgo && new Date(c.createdAt) <= sevenDaysAgo
    ).length;
    const commentsDelta = delta(commentsLast7d, commentsPrev7d);

    const publishedLast7d = variants.filter(
      (v) => v.publishedAt && new Date(v.publishedAt) > sevenDaysAgo
    ).length;
    const publishedPrev7d = variants.filter(
      (v) => v.publishedAt && new Date(v.publishedAt) > fourteenDaysAgo && new Date(v.publishedAt) <= sevenDaysAgo
    ).length;
    const publishedDelta = delta(publishedLast7d, publishedPrev7d);

    // === Combined trend series (14 days): followers, reach, postsCreated, comments ===
    const series: {
      date: string;
      followers: number;
      reach: number;
      impressions: number;
      postsCreated: number;
      published: number;
      comments: number;
    }[] = [];
    for (let d = 13; d >= 0; d--) {
      const date = new Date(now - d * day);
      const dayKey = date.toISOString().slice(0, 10);
      const dayAnalytics = analytics.filter((a) => a.date.toISOString().slice(0, 10) === dayKey);
      const dayPosts = posts.filter((p) => p.createdAt.toISOString().slice(0, 10) === dayKey);
      const dayVariants = variants.filter(
        (v) => v.publishedAt && v.publishedAt.toISOString().slice(0, 10) === dayKey
      );
      const dayComments = comments.filter((c) => c.createdAt.toISOString().slice(0, 10) === dayKey);
      series.push({
        date: dayKey,
        followers: dayAnalytics.reduce((s, a) => s + a.followers, 0),
        reach: dayAnalytics.reduce((s, a) => s + a.reach, 0),
        impressions: dayAnalytics.reduce((s, a) => s + a.impressions, 0),
        postsCreated: dayPosts.length,
        published: dayVariants.length,
        comments: dayComments.length,
      });
    }

    // === Pages ranking (per-account leaderboard) ===
    const pagesRanking = accounts.map((acc) => {
      const accVariants = variants.filter((v) => v.accountId === acc.id);
      const accAnalytics = analytics.filter((a) => a.accountId === acc.id);
      const followers = acc.followers;
      const reach = accAnalytics.reduce((s, a) => s + a.reach, 0);
      const impressions = accAnalytics.reduce((s, a) => s + a.impressions, 0);
      const engagement = accVariants.reduce((s, v) => s + v.likes + v.comments + v.shares + v.saves, 0);
      const postsCount = accVariants.length;
      const engagementRate = reach > 0 ? Math.round((engagement / reach) * 1000) / 10 : 0;

      // Growth 7d
      const sorted = [...accAnalytics].sort((a, b) => a.date.getTime() - b.date.getTime());
      let growth7d = 0;
      if (sorted.length >= 2) {
        const latest = sorted[sorted.length - 1].followers;
        const sevenAgo = sorted.find((x) => x.date.getTime() >= now - 7 * day)?.followers ?? null;
        if (sevenAgo !== null && sevenAgo > 0) {
          growth7d = Math.round(((latest - sevenAgo) / sevenAgo) * 1000) / 10;
        }
      }

      // Sparkline (14-day followers)
      const sparkline: number[] = Array(14).fill(0);
      for (let d = 13; d >= 0; d--) {
        const date = new Date(now - d * day);
        const dayKey = date.toISOString().slice(0, 10);
        const dayA = accAnalytics.find((x) => x.date.toISOString().slice(0, 10) === dayKey);
        sparkline[13 - d] = dayA?.followers ?? (sparkline[13 - d - 1] ?? followers);
      }
      // Fill leading zeros with current follower count
      let lastVal = followers;
      for (let i = sparkline.length - 1; i >= 0; i--) {
        if (sparkline[i] === 0) sparkline[i] = lastVal;
        else lastVal = sparkline[i];
      }

      return {
        id: acc.id,
        platform: acc.platform,
        handle: acc.handle,
        displayName: acc.displayName,
        avatar: acc.avatar,
        verified: acc.verified,
        followers,
        reach,
        impressions,
        engagement,
        postsCount,
        engagementRate,
        growth7d,
        sparkline,
        ownerName: acc.owner?.name ?? "Unassigned",
        ownerColor: acc.owner?.color ?? null,
        healthStatus: acc.health?.status ?? "healthy",
        riskLevel: acc.health?.riskLevel ?? "safe",
      };
    }).sort((a, b) => b.followers - a.followers);

    // === Pipeline ===
    const pipeline = {
      draft: draftCount,
      scheduled: scheduledCount,
      published: publishedCount,
      failed: failedCount,
    };
    const pipelineTotal = draftCount + scheduledCount + publishedCount + failedCount;

    // === Top contributors ===
    const contributorMap: Record<string, { name: string; color: string | null; avatar: string | null; posts: number; published: number; comments: number }> = {};
    for (const p of posts) {
      if (new Date(p.createdAt) < thirtyDaysAgo) continue;
      const aid = p.authorId;
      if (!contributorMap[aid]) {
        contributorMap[aid] = {
          name: p.author.name, color: p.author.color, avatar: p.author.avatar,
          posts: 0, published: 0, comments: 0,
        };
      }
      contributorMap[aid].posts++;
      if (p.status === "published") contributorMap[aid].published++;
    }
    for (const c of comments) {
      if (new Date(c.createdAt) < thirtyDaysAgo) continue;
      if (c.replied && c.account?.owner) {
        const oid = c.account.owner.id;
        if (contributorMap[oid]) contributorMap[oid].comments++;
      }
    }
    const topContributors = Object.values(contributorMap)
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5);

    // === Recent posts ===
    const recentPosts = [...posts]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        title: p.title,
        caption: p.caption,
        mediaUrl: p.mediaUrl,
        status: p.status,
        tone: p.tone,
        authorName: p.author.name,
        authorColor: p.author.color,
        createdAt: p.createdAt.toISOString(),
        publishedAt: p.variants[0]?.publishedAt?.toISOString() ?? null,
        platforms: p.variants.map((v) => v.account.platform),
        variantCount: p.variants.length,
      }));

    // === Comment inbox preview ===
    const commentInbox = comments
      .filter((c) => !c.replied)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        author: c.author,
        text: c.text,
        type: c.type,
        sentiment: c.sentiment,
        platform: c.account?.platform ?? "x",
        handle: c.account?.handle ?? "",
        accountName: c.account?.displayName ?? "",
        createdAt: c.createdAt.toISOString(),
      }));

    // === Upcoming ===
    const upcoming = posts
      .filter((p) => p.status === "scheduled" && p.scheduledAt)
      .sort((a, b) => (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        title: p.title,
        mediaUrl: p.mediaUrl,
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
        platforms: p.variants.map((v) => v.account.platform),
        authorName: p.author.name,
        authorColor: p.author.color,
      }));

    // === Top performing posts ===
    const topPosts = posts
      .map((p) => ({
        id: p.id,
        title: p.title,
        mediaUrl: p.mediaUrl,
        status: p.status,
        authorName: p.author.name,
        authorColor: p.author.color,
        engagement: p.variants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0),
        reach: p.variants.reduce((s, v) => s + v.reach, 0),
        impressions: p.variants.reduce((s, v) => s + v.impressions, 0),
        accounts: p.variants.length,
        platforms: p.variants.map((v) => v.account.platform),
        publishedAt: p.variants[0]?.publishedAt?.toISOString() ?? null,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 4);

    return NextResponse.json({
      kpis: {
        // Vanity metrics (with deltas)
        totalFollowers: { value: totalFollowers, display: fmt(totalFollowers), delta: delta(l7Follow, p7Follow) },
        totalReach: { value: totalReach, display: fmt(totalReach), delta: delta(l7Reach, p7Reach) },
        impressions: { value: totalImpressions, display: fmt(totalImpressions), delta: delta(l7Imp, p7Imp) },
        // Content activity (with deltas)
        postsCreated: { value: posts.length, display: fmt(posts.length), delta: postsDelta },
        published: { value: publishedCount, display: fmt(publishedCount), delta: publishedDelta },
        comments: { value: commentsReceived, display: fmt(commentsReceived), delta: commentsDelta },
        replyRate: { value: replyRate, display: `${replyRate}%`, delta: 0 },
        // Counts
        drafts: draftCount,
        scheduled: scheduledCount,
        failed: failedCount,
        pendingInbox: commentsPending,
        accounts: accounts.length,
        variantsPublished: variants.filter((v) => v.status === "published").length,
        totalEngagement,
      },
      pipeline,
      pipelineTotal,
      series,
      pagesRanking,
      topContributors,
      recentPosts,
      commentInbox,
      upcoming,
      topPosts,
      activities: activities.map((a) => ({
        id: a.id,
        userId: a.userId,
        userName: a.user.name,
        userColor: a.user.color,
        userAvatar: a.user.avatar,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/dashboard] DB error:", message);
    return NextResponse.json(
      { error: "Dashboard load failed", detail: message },
      { status: 500 }
    );
  }
}
