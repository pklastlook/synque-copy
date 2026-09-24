import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/data
 *
 * Rich cross-tabulated data for the advanced report templates:
 *   - userAccountMatrix: posts & comments by each user on each account
 *   - userComparison: per-member work stats side-by-side
 *   - accountUserMatrix: for each account, which users posted & how much
 *   - leaderboard: top contributors ranked by different metrics
 *   - perUserPlatform: each user's posts broken down by platform
 *
 * This powers the Team/User/Pages/Profile reports.
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
  const since = new Date(Date.now() - days * 86400000);

  const [users, accounts, posts, variants, comments] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.account.findMany({ include: { owner: true } }),
    db.post.findMany({
      where: { createdAt: { gte: since } },
      include: { author: true, variants: { include: { account: true } } },
    }),
    db.postVariant.findMany({
      where: { createdAt: { gte: since } },
      include: { account: true, post: { include: { author: true } } },
    }),
    db.comment.findMany({
      where: { createdAt: { gte: since } },
      include: { account: true },
    }),
  ]);

  // === USER × ACCOUNT matrix — how many posts & comments each user made on each account ===
  // A user "posted on" an account if they authored a post that has a variant on that account.
  // A user "received comments" on accounts they own.
  const userAccountMatrix = users.map((u) => {
    const userPosts = posts.filter((p) => p.authorId === u.id);
    const ownedAccounts = accounts.filter((a) => a.ownerId === u.id);
    const ownedAccountIds = new Set(ownedAccounts.map((a) => a.id));

    const perAccount = accounts.map((a) => {
      // posts by this user on this account (via variants)
      const postsOnAccount = userPosts.filter((p) =>
        p.variants.some((v) => v.accountId === a.id)
      ).length;
      // variants published on this account by this user
      const variantsPublished = variants.filter(
        (v) => v.accountId === a.id && v.post.authorId === u.id && v.status === "published"
      ).length;
      // comments on this account (if user owns it)
      const commentsOnAccount = ownedAccountIds.has(a.id)
        ? comments.filter((c) => c.accountId === a.id).length
        : 0;
      const commentsReplied = ownedAccountIds.has(a.id)
        ? comments.filter((c) => c.accountId === a.id && c.replied).length
        : 0;
      return {
        accountId: a.id,
        platform: a.platform,
        handle: a.handle,
        displayName: a.displayName,
        posts: postsOnAccount,
        published: variantsPublished,
        comments: commentsOnAccount,
        commentsReplied,
      };
    });

    return {
      userId: u.id,
      userName: u.name,
      userEmail: u.email,
      avatar: u.avatar,
      role: u.role,
      title: u.title,
      department: u.department,
      color: u.color,
      totals: {
        postsCreated: userPosts.length,
        published: userPosts.filter((p) => p.status === "published").length,
        scheduled: userPosts.filter((p) => p.status === "scheduled").length,
        drafts: userPosts.filter((p) => p.status === "draft").length,
        failed: userPosts.filter((p) => p.status === "failed").length,
        commentsReceived: comments.filter((c) => ownedAccountIds.has(c.accountId)).length,
        commentsReplied: comments.filter((c) => ownedAccountIds.has(c.accountId) && c.replied).length,
        accountsOwned: ownedAccounts.length,
      },
      perAccount,
    };
  });

  // === USER COMPARISON — side-by-side work stats ===
  const userComparison = users.map((u) => {
    const uPosts = posts.filter((p) => p.authorId === u.id);
    const uAccounts = accounts.filter((a) => a.ownerId === u.id);
    const uAccountIds = new Set(uAccounts.map((a) => a.id));
    const uVariants = variants.filter((v) => uAccountIds.has(v.accountId) || v.post.authorId === u.id);
    const uComments = comments.filter((c) => uAccountIds.has(c.accountId));

    // posts created in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const postsLast7d = uPosts.filter((p) => new Date(p.createdAt) > sevenDaysAgo).length;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      role: u.role,
      title: u.title,
      department: u.department,
      color: u.color,
      postsCreated: uPosts.length,
      postsPublished: uPosts.filter((p) => p.status === "published").length,
      postsScheduled: uPosts.filter((p) => p.status === "scheduled").length,
      postsDraft: uPosts.filter((p) => p.status === "draft").length,
      postsFailed: uPosts.filter((p) => p.status === "failed").length,
      variantsPublished: uVariants.filter((v) => v.status === "published").length,
      commentsReceived: uComments.length,
      commentsReplied: uComments.filter((c) => c.replied).length,
      replyRate: uComments.length > 0 ? Math.round((uComments.filter((c) => c.replied).length / uComments.length) * 100) : 0,
      accountsOwned: uAccounts.length,
      postsLast7d,
      avgPostsPerAccount: uAccounts.length > 0 ? +(uPosts.length / uAccounts.length).toFixed(1) : 0,
    };
  }).sort((a, b) => b.postsCreated - a.postsCreated);

  // === ACCOUNT × USER matrix — for each account, who posted & how much ===
  const accountUserMatrix = accounts.map((a) => {
    const aVariants = variants.filter((v) => v.accountId === a.id);
    const aComments = comments.filter((c) => c.accountId === a.id);
    const aPostIds = new Set(aVariants.map((v) => v.postId));
    const aPosts = posts.filter((p) => aPostIds.has(p.id));

    // per-user breakdown for this account
    const perUser = users.map((u) => {
      const userPostsOnAccount = aPosts.filter((p) => p.authorId === u.id).length;
      const userVariantsPublished = aVariants.filter((v) => v.post.authorId === u.id && v.status === "published").length;
      return {
        userId: u.id,
        userName: u.name,
        color: u.color,
        posts: userPostsOnAccount,
        published: userVariantsPublished,
      };
    }).filter((u) => u.posts > 0 || u.published > 0);

    return {
      accountId: a.id,
      platform: a.platform,
      handle: a.handle,
      displayName: a.displayName,
      ownerName: a.owner?.name ?? "Unassigned",
      ownerColor: a.owner?.color ?? null,
      followers: a.followers,
      totalPosts: aPosts.length,
      totalPublished: aVariants.filter((v) => v.status === "published").length,
      totalComments: aComments.length,
      repliedComments: aComments.filter((c) => c.replied).length,
      perUser,
    };
  });

  // === LEADERBOARD — top contributors by different metrics ===
  const leaderboard = {
    mostPostsCreated: [...userComparison].sort((a, b) => b.postsCreated - a.postsCreated).slice(0, 5),
    mostPublished: [...userComparison].sort((a, b) => b.postsPublished - a.postsPublished).slice(0, 5),
    mostCommentsReplied: [...userComparison].sort((a, b) => b.commentsReplied - a.commentsReplied).slice(0, 5),
    bestReplyRate: [...userComparison].filter((u) => u.commentsReceived > 0).sort((a, b) => b.replyRate - a.replyRate).slice(0, 5),
    mostActive: [...userComparison].sort((a, b) => b.postsLast7d - a.postsLast7d).slice(0, 5),
  };

  // === Per-user platform breakdown ===
  const perUserPlatform = users.map((u) => {
    const uPosts = posts.filter((p) => p.authorId === u.id);
    const platformMap: Record<string, { posts: number; published: number }> = {};
    for (const p of uPosts) {
      for (const v of p.variants) {
        const pl = v.account.platform;
        if (!platformMap[pl]) platformMap[pl] = { posts: 0, published: 0 };
        platformMap[pl].posts++;
        if (v.status === "published") platformMap[pl].published++;
      }
    }
    return {
      userId: u.id,
      userName: u.name,
      color: u.color,
      platforms: Object.entries(platformMap).map(([platform, data]) => ({ platform, ...data })),
    };
  });

  return NextResponse.json({
    userAccountMatrix,
    userComparison,
    accountUserMatrix,
    leaderboard,
    perUserPlatform,
  });
}
