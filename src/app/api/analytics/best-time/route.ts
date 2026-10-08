import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/best-time?days=90
 *
 * Analyzes which hours of the day have the highest engagement across all
 * published posts in the caller's tenant scope. Returns one entry per hour
 * (0..23) with the average engagement per post published during that hour.
 *
 * Returns: { bestHours: [{ hour: 14, avgEngagement: 452, posts: 8 }, ...] }
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10)));
  const since = new Date(Date.now() - days * 86400000);

  // Pull every published variant with its publishedAt timestamp + engagement
  // counts, scoped to the caller's tenant.
  const variants = await db.postVariant.findMany({
    where: {
      publishedAt: { gte: since, not: null },
      post: tenantWhere(scope) as { customerId?: string },
    },
    select: {
      likes: true,
      comments: true,
      shares: true,
      saves: true,
      publishedAt: true,
    },
  });

  // Aggregate per hour 0..23.
  const buckets: Array<{ hour: number; engagement: number; posts: number }> = Array.from(
    { length: 24 },
    (_, h) => ({ hour: h, engagement: 0, posts: 0 })
  );

  for (const v of variants) {
    if (!v.publishedAt) continue;
    const h = new Date(v.publishedAt).getHours();
    const engagement = v.likes + v.comments + v.shares + v.saves;
    buckets[h].engagement += engagement;
    buckets[h].posts += 1;
  }

  const bestHours = buckets.map((b) => ({
    hour: b.hour,
    posts: b.posts,
    avgEngagement: b.posts > 0 ? Math.round(b.engagement / b.posts) : 0,
    totalEngagement: b.engagement,
  }));

  return NextResponse.json({ bestHours });
}
