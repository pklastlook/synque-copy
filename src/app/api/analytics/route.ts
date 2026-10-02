import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const isManager = user!.role === "admin" || user!.role === "manager";
  const accountId = req.nextUrl.searchParams.get("accountId");
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10);
  const isAll = !accountId || accountId === "all";

  // For non-managers requesting "all", restrict to accounts they own
  let scopeAccountIds: string[] | null = null;
  if (!isManager && isAll) {
    const owned = await db.account.findMany({
      where: tenantWhere(scope, { ownerId: user!.userId }),
      select: { id: true },
    });
    scopeAccountIds = owned.map((a) => a.id);
  } else if (isManager && !scope.isSuperAdmin && isAll) {
    // Tenant managers: restrict to their client's accounts
    const tenantAccounts = await db.account.findMany({
      where: tenantWhere(scope),
      select: { id: true },
    });
    scopeAccountIds = tenantAccounts.map((a) => a.id);
  }

  const now = Date.now();
  const since = new Date(now - days * 86400000);

  const analytics = await db.analyticsDaily.findMany({
    where: {
      ...(isAll
        ? (scopeAccountIds ? { accountId: { in: scopeAccountIds } } : {})
        : { accountId }),
      date: { gte: since },
    },
    orderBy: { date: "asc" },
  });

  const variants = await db.postVariant.findMany({
    where: isAll
      ? (scopeAccountIds ? { accountId: { in: scopeAccountIds } } : {})
      : { accountId },
    include: { account: { include: { owner: true } }, post: { include: { author: true } } },
  });

  // aggregated series
  const byDay: Record<string, { date: string; followers: number; impressions: number; reach: number; engagement: number; posts: number }> = {};
  for (const a of analytics) {
    const key = a.date.toISOString().slice(0, 10);
    if (!byDay[key])
      byDay[key] = { date: key, followers: 0, impressions: 0, reach: 0, engagement: 0, posts: 0 };
    byDay[key].followers += a.followers;
    byDay[key].impressions += a.impressions;
    byDay[key].reach += a.reach;
    byDay[key].engagement += a.engagement;
    byDay[key].posts += a.posts;
  }
  const series = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

  // per-account summary
  const accounts = await db.account.findMany({
    where: isAll
      ? (scopeAccountIds ? { id: { in: scopeAccountIds } } : {})
      : { id: accountId },
    include: { owner: true },
  });
  const perAccount = accounts
    .filter((a) => (isAll ? true : a.id === accountId))
    .map((a) => {
      const aAnalytics = analytics.filter((an) => an.accountId === a.id);
      const aVariants = variants.filter((v) => v.accountId === a.id);
      return {
        id: a.id,
        platform: a.platform,
        handle: a.handle,
        displayName: a.displayName,
        followers: a.followers,
        impressions: aAnalytics.reduce((s, x) => s + x.impressions, 0),
        reach: aAnalytics.reduce((s, x) => s + x.reach, 0),
        engagement: aVariants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0),
        likes: aVariants.reduce((s, v) => s + v.likes, 0),
        comments: aVariants.reduce((s, v) => s + v.comments, 0),
        shares: aVariants.reduce((s, v) => s + v.shares, 0),
        saves: aVariants.reduce((s, v) => s + v.saves, 0),
        posts: aVariants.length,
        ownerName: a.owner.name,
      };
    });

  // engagement by content type (top posts)
  const topContent = variants
    .map((v) => ({
      id: v.id,
      title: v.post.title,
      mediaUrl: v.post.mediaUrl,
      platform: v.account.platform,
      handle: v.account.handle,
      authorName: v.post.author.name,
      engagement: v.likes + v.comments + v.shares + v.saves,
      reach: v.reach,
      impressions: v.impressions,
      publishedAt: v.publishedAt?.toISOString() ?? null,
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 8);

  // audience growth (followers over time)
  const followerSeries = series.map((s) => ({ date: s.date, followers: s.followers }));

  const res = NextResponse.json({ series, perAccount, topContent, followerSeries });
  res.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
  return res;
}
