import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export async function GET() {
  try {
    const [accounts, posts, variants, comments, activities, analytics] = await Promise.all([
      db.account.findMany({ include: { owner: true } }),
      db.post.findMany({ include: { author: true, variants: { include: { account: true } } } }),
      db.postVariant.findMany(),
      db.comment.findMany({ include: { account: true, assignee: true } }),
      db.activity.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 12 }),
      db.analyticsDaily.findMany({ orderBy: { date: "asc" } }),
    ]);

  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalImpressions = analytics.reduce((s, a) => s + a.impressions, 0);
  const totalReach = analytics.reduce((s, a) => s + a.reach, 0);
  const totalEng = variants.reduce((s, v) => s + v.likes + v.comments + v.shares + v.saves, 0);
  const published = variants.filter((v) => v.status === "published").length;
  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const pendingInbox = comments.filter((c) => !c.replied).length;

  const now = Date.now();
  const day = 86400000;
  const last7 = analytics.filter((a) => a.date.getTime() > now - 7 * day);
  const prev7 = analytics.filter(
    (a) => a.date.getTime() > now - 14 * day && a.date.getTime() <= now - 7 * day
  );
  const l7Imp = last7.reduce((s, a) => s + a.impressions, 0);
  const p7Imp = prev7.reduce((s, a) => s + a.impressions, 0) || 1;
  const l7Eng = last7.reduce((s, a) => s + a.engagement, 0);
  const p7Eng = prev7.reduce((s, a) => s + a.engagement, 0) || 1;
  const l7Follow = last7.reduce((s, a) => s + a.followers, 0);
  const p7Follow = prev7.reduce((s, a) => s + a.followers, 0) || 1;

  const delta = (a: number, b: number) => Math.round(((a - b) / b) * 100);

  const byPlatform = accounts.reduce<
    Record<string, { followers: number; impressions: number; engagement: number }>
  >((acc, a) => {
    const key = a.platform;
    if (!acc[key]) acc[key] = { followers: 0, impressions: 0, engagement: 0 };
    acc[key].followers += a.followers;
    const aAnalytics = analytics.filter((an) => an.accountId === a.id);
    acc[key].impressions += aAnalytics.reduce((s, x) => s + x.impressions, 0);
    acc[key].engagement += variants
      .filter((v) => v.accountId === a.id)
      .reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
    return acc;
  }, {});

  const series: {
    date: string;
    impressions: number;
    reach: number;
    engagement: number;
    followers: number;
  }[] = [];
  for (let d = 13; d >= 0; d--) {
    const date = new Date(now - d * day);
    const dayKey = date.toISOString().slice(0, 10);
    const rows = analytics.filter((a) => a.date.toISOString().slice(0, 10) === dayKey);
    series.push({
      date: dayKey,
      impressions: rows.reduce((s, r) => s + r.impressions, 0),
      reach: rows.reduce((s, r) => s + r.reach, 0),
      engagement: Math.round(rows.reduce((s, r) => s + r.engagement, 0) * 10) / 10,
      followers: rows.reduce((s, r) => s + r.followers, 0) / Math.max(rows.length, 1),
    });
  }

  const topPosts = posts
    .map((p) => ({
      id: p.id,
      title: p.title,
      mediaUrl: p.mediaUrl,
      status: p.status,
      authorName: p.author.name,
      engagement: p.variants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0),
      reach: p.variants.reduce((s, v) => s + v.reach, 0),
      accounts: p.variants.length,
      publishedAt: p.variants[0]?.publishedAt ?? p.scheduledAt,
    }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  return NextResponse.json({
    kpis: {
      totalFollowers: { value: totalFollowers, display: fmt(totalFollowers), delta: delta(l7Follow, p7Follow) },
      impressions: { value: totalImpressions, display: fmt(totalImpressions), delta: delta(l7Imp, p7Imp) },
      engagement: { value: totalEng, display: fmt(totalEng), delta: delta(l7Eng, p7Eng) },
      published,
      scheduled,
      pendingInbox,
      accounts: accounts.length,
    },
    series,
    byPlatform,
    topPosts,
    activities: activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user.name,
      type: a.type,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    })),
    upcoming: posts
      .filter((p) => p.status === "scheduled")
      .sort((a, b) => (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0))
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        title: p.title,
        mediaUrl: p.mediaUrl,
        scheduledAt: p.scheduledAt?.toISOString() ?? null,
        accounts: p.variants.length,
        authorName: p.author.name,
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
