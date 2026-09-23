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
 * Content-activity dashboard — the admin's at-a-glance command center.
 * Tracks what the team is DOING: posts created, tweets published,
 * comments received & replied, content pipeline state, and the
 * individuals driving it all. Vanity metrics (followers, impressions)
 * are intentionally NOT surfaced here.
 */
export async function GET() {
  try {
    const [accounts, posts, variants, comments, activities] = await Promise.all([
      db.account.findMany({ include: { owner: true } }),
      db.post.findMany({
        include: {
          author: true,
          variants: { include: { account: true } },
        },
      }),
      db.postVariant.findMany({ include: { account: true } }),
      db.comment.findMany({ include: { account: { include: { owner: true } } } }),
      db.activity.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 12 }),
    ]);

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

    // === Recent activity deltas (7d vs prev 7d) ===
    const now = Date.now();
    const day = 86400000;
    const sevenDaysAgo = new Date(now - 7 * day);
    const fourteenDaysAgo = new Date(now - 14 * day);

    const postsLast7d = posts.filter((p) => new Date(p.createdAt) > sevenDaysAgo).length;
    const postsPrev7d = posts.filter(
      (p) => new Date(p.createdAt) > fourteenDaysAgo && new Date(p.createdAt) <= sevenDaysAgo
    ).length;
    const postsDelta = postsPrev7d > 0 ? Math.round(((postsLast7d - postsPrev7d) / postsPrev7d) * 100) : postsLast7d > 0 ? 100 : 0;

    const commentsLast7d = comments.filter((c) => new Date(c.createdAt) > sevenDaysAgo).length;
    const commentsPrev7d = comments.filter(
      (c) => new Date(c.createdAt) > fourteenDaysAgo && new Date(c.createdAt) <= sevenDaysAgo
    ).length;
    const commentsDelta = commentsPrev7d > 0 ? Math.round(((commentsLast7d - commentsPrev7d) / commentsPrev7d) * 100) : commentsLast7d > 0 ? 100 : 0;

    const publishedLast7d = variants.filter(
      (v) => v.publishedAt && new Date(v.publishedAt) > sevenDaysAgo
    ).length;
    const publishedPrev7d = variants.filter(
      (v) => v.publishedAt && new Date(v.publishedAt) > fourteenDaysAgo && new Date(v.publishedAt) <= sevenDaysAgo
    ).length;
    const publishedDelta = publishedPrev7d > 0 ? Math.round(((publishedLast7d - publishedPrev7d) / publishedPrev7d) * 100) : publishedLast7d > 0 ? 100 : 0;

    const repliedLast7d = comments.filter(
      (c) => c.replied && new Date(c.createdAt) > sevenDaysAgo
    ).length;
    const repliedPrev7d = comments.filter(
      (c) => c.replied && new Date(c.createdAt) > fourteenDaysAgo && new Date(c.createdAt) <= sevenDaysAgo
    ).length;
    const replyDelta = repliedPrev7d > 0 ? Math.round(((repliedLast7d - repliedPrev7d) / repliedPrev7d) * 100) : repliedLast7d > 0 ? 100 : 0;

    // === Content creation trend (14 days) ===
    const series: { date: string; postsCreated: number; published: number; comments: number }[] = [];
    for (let d = 13; d >= 0; d--) {
      const date = new Date(now - d * day);
      const dayKey = date.toISOString().slice(0, 10);
      const dayPosts = posts.filter((p) => p.createdAt.toISOString().slice(0, 10) === dayKey);
      const dayVariants = variants.filter(
        (v) => v.publishedAt && v.publishedAt.toISOString().slice(0, 10) === dayKey
      );
      const dayComments = comments.filter((c) => c.createdAt.toISOString().slice(0, 10) === dayKey);
      series.push({
        date: dayKey,
        postsCreated: dayPosts.length,
        published: dayVariants.length,
        comments: dayComments.length,
      });
    }

    // === Pipeline visualization data ===
    const pipeline = {
      draft: draftCount,
      scheduled: scheduledCount,
      published: publishedCount,
      failed: failedCount,
    };
    const pipelineTotal = draftCount + scheduledCount + publishedCount + failedCount;

    // === Top contributors (members with most posts created in last 30 days) ===
    const thirtyDaysAgo = new Date(now - 30 * day);
    const contributorMap: Record<string, { name: string; color: string | null; avatar: string | null; posts: number; published: number; comments: number }> = {};
    for (const p of posts) {
      if (new Date(p.createdAt) < thirtyDaysAgo) continue;
      const aid = p.authorId;
      if (!contributorMap[aid]) {
        contributorMap[aid] = {
          name: p.author.name,
          color: p.author.color,
          avatar: p.author.avatar,
          posts: 0,
          published: 0,
          comments: 0,
        };
      }
      contributorMap[aid].posts++;
      if (p.status === "published") contributorMap[aid].published++;
    }
    // Add comment reply counts per contributor (using account owner)
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

    // === Recent posts (latest 6, all statuses) ===
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

    // === Comment inbox preview (latest 5 unread) ===
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

    // === Scheduled posts (upcoming) ===
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

    // === Top performing posts (by engagement) ===
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
        accounts: p.variants.length,
        platforms: p.variants.map((v) => v.account.platform),
        publishedAt: p.variants[0]?.publishedAt?.toISOString() ?? null,
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 4);

    return NextResponse.json({
      kpis: {
        postsCreated: { value: posts.length, display: fmt(posts.length), delta: postsDelta },
        published: { value: publishedCount, display: fmt(publishedCount), delta: publishedDelta },
        comments: { value: commentsReceived, display: fmt(commentsReceived), delta: commentsDelta },
        replyRate: { value: replyRate, display: `${replyRate}%`, delta: replyDelta },
        drafts: draftCount,
        scheduled: scheduledCount,
        failed: failedCount,
        pendingInbox: commentsPending,
        accounts: accounts.length,
        variantsPublished: variants.filter((v) => v.status === "published").length,
      },
      pipeline,
      pipelineTotal,
      series,
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
