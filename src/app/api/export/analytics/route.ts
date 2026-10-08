import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/analytics?days=30&accountId=all
 *
 * Exports analytics data as CSV — one row per day in the requested window.
 * Columns: date, followers, reach, impressions, engagement, posts.
 *
 * Auth: requireAuth + tenant scoping. JWT may be passed as ?token=xxx so
 * the route works with `window.open(...)` downloads.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const accountId = req.nextUrl.searchParams.get("accountId") ?? "all";
  const days = Math.min(365, Math.max(1, parseInt(req.nextUrl.searchParams.get("days") ?? "30", 10)));

  // Mirror the access rules in /api/analytics: managers see all tenant
  // accounts, non-managers see only accounts they own. Super-admins see
  // everything.
  const isManager = user!.role === "admin" || user!.role === "manager";
  const isAll = !accountId || accountId === "all";
  let scopeAccountIds: string[] | null = null;

  if (!isManager && isAll) {
    const owned = await db.account.findMany({
      where: tenantWhere(scope, { ownerId: user!.userId }) as { customerId?: string; ownerId?: string },
      select: { id: true },
    });
    scopeAccountIds = owned.map((a) => a.id);
  } else if (isManager && !scope.isSuperAdmin && isAll) {
    const tenantAccounts = await db.account.findMany({
      where: tenantWhere(scope) as { customerId?: string },
      select: { id: true },
    });
    scopeAccountIds = tenantAccounts.map((a) => a.id);
  }

  const since = new Date(Date.now() - days * 86400000);

  const analytics = await db.analyticsDaily.findMany({
    where: {
      ...(isAll
        ? scopeAccountIds
          ? { accountId: { in: scopeAccountIds } }
          : {}
        : { accountId }),
      date: { gte: since },
    },
    orderBy: { date: "asc" },
  });

  // Aggregate by day (mirrors /api/analytics series shape).
  const byDay: Record<string, { date: string; followers: number; impressions: number; reach: number; engagement: number; posts: number }> = {};
  for (const a of analytics) {
    const key = a.date.toISOString().slice(0, 10);
    if (!byDay[key]) {
      byDay[key] = { date: key, followers: 0, impressions: 0, reach: 0, engagement: 0, posts: 0 };
    }
    byDay[key].followers += a.followers;
    byDay[key].impressions += a.impressions;
    byDay[key].reach += a.reach;
    byDay[key].engagement += Math.round(a.engagement);
    byDay[key].posts += a.posts;
  }
  const series = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));

  const headers = ["Date", "Followers", "Reach", "Impressions", "Engagement", "Posts"];
  const rows: string[] = [headers.map(csvCell).join(",")];
  for (const s of series) {
    rows.push(buildRow([s.date, s.followers, s.reach, s.impressions, s.engagement, s.posts]));
  }

  const csv = rows.join("\n");
  const filename = `analytics-${days}d-${new Date().toISOString().split("T")[0]}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function buildRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}
