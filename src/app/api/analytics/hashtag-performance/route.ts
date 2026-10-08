import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/hashtag-performance?days=90
 *
 * Returns the top 20 hashtags by total engagement (likes + comments + shares
 * + saves) across all published variants in the caller's tenant scope.
 *
 * Hashtags are stored on PostVariant as a comma-separated string. We split +
 * normalize (strip leading '#', lowercase, trim) and aggregate engagement per
 * hashtag.
 *
 * Returns:
 * {
 *   hashtags: [{ tag, posts, engagement, reach, impressions }]
 * }
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10)));
  const since = new Date(Date.now() - days * 86400000);

  const variants = await db.postVariant.findMany({
    where: {
      createdAt: { gte: since },
      post: tenantWhere(scope) as { customerId?: string },
    },
    select: {
      hashtags: true,
      likes: true,
      comments: true,
      shares: true,
      saves: true,
      reach: true,
      impressions: true,
    },
  });

  type TagStat = { tag: string; posts: number; engagement: number; reach: number; impressions: number };
  const stats = new Map<string, TagStat>();

  for (const v of variants) {
    if (!v.hashtags) continue;
    const tags = v.hashtags
      .split(/[,;\n]/)
      .map((t) => t.trim().replace(/^#+/, "").toLowerCase())
      .filter((t) => t.length > 0 && t.length <= 60);
    if (tags.length === 0) continue;
    const engagement = v.likes + v.comments + v.shares + v.saves;
    // De-dupe within the same variant so a post tagged "#ai #ai" only counts once.
    const uniq = Array.from(new Set(tags));
    for (const t of uniq) {
      const cur = stats.get(t);
      if (cur) {
        cur.posts += 1;
        cur.engagement += engagement;
        cur.reach += v.reach;
        cur.impressions += v.impressions;
      } else {
        stats.set(t, {
          tag: t,
          posts: 1,
          engagement,
          reach: v.reach,
          impressions: v.impressions,
        });
      }
    }
  }

  const hashtags = Array.from(stats.values())
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 20);

  return NextResponse.json({ hashtags });
}
