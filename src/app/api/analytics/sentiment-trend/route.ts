import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/sentiment-trend?days=30
 *
 * Returns the daily count of positive / negative / neutral comments + mentions
 * in the caller's tenant scope for the requested window. Used by the Analytics
 * view's stacked area chart.
 *
 * Returns:
 * {
 *   positive: [{ date, count }],
 *   negative: [{ date, count }],
 *   neutral:  [{ date, count }]
 * }
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const days = Math.min(180, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10)));
  const since = new Date(Date.now() - days * 86400000);

  // Comments — scoped by tenant via the Comment.customerId denormalised field.
  // (Backward-compat: legacy rows with null customerId are visible only to
  // super-admins via the tenantWhere fallback.)
  const comments = await db.comment.findMany({
    where: {
      createdAt: { gte: since },
      ...(scope.isSuperAdmin ? {} : { customerId: scope.customerId }),
    },
    select: { sentiment: true, createdAt: true },
  });

  // Mentions — scoped by tenant via ListeningQuery.customerId.
  const mentions = await db.mention.findMany({
    where: {
      date: { gte: since },
      query: tenantWhere(scope) as { customerId?: string },
    },
    select: { sentiment: true, date: true },
  });

  // Build a per-day index 0..days-1.
  const dayKeys: string[] = [];
  const idx: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    idx[key] = dayKeys.length;
    dayKeys.push(key);
  }

  const positive = new Array(days).fill(0);
  const negative = new Array(days).fill(0);
  const neutral = new Array(days).fill(0);

  const bump = (sentiment: string, date: Date) => {
    const key = date.toISOString().slice(0, 10);
    const i = idx[key];
    if (i === undefined) return;
    if (sentiment === "positive") positive[i] += 1;
    else if (sentiment === "negative") negative[i] += 1;
    else neutral[i] += 1;
  };

  for (const c of comments) bump(c.sentiment, c.createdAt);
  for (const m of mentions) bump(m.sentiment, m.date);

  return NextResponse.json({
    positive: dayKeys.map((date, i) => ({ date, count: positive[i] })),
    negative: dayKeys.map((date, i) => ({ date, count: negative[i] })),
    neutral: dayKeys.map((date, i) => ({ date, count: neutral[i] })),
  });
}
