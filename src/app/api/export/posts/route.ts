import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/posts
 *
 * Exports all posts in the caller's tenant scope as a CSV file.
 * Columns: title, status, author, platform, engagement metrics, dates.
 *
 * Auth: requireAuth + tenant scoping. JWT may be passed as ?token=xxx so
 * the route works with `window.open(...)` downloads (the Authorization
 * header cannot be set on a browser navigation).
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);

  const posts = await db.post.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: {
      author: true,
      variants: { include: { account: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Post ID",
    "Title",
    "Status",
    "Author",
    "Author Email",
    "Platform",
    "Account Handle",
    "Likes",
    "Comments",
    "Shares",
    "Saves",
    "Reach",
    "Impressions",
    "Scheduled At",
    "Published At",
    "Created At",
  ];

  const rows: string[] = [headers.map(csvCell).join(",")];

  for (const p of posts) {
    if (p.variants.length === 0) {
      rows.push(
        buildRow([
          p.id,
          p.title,
          p.status,
          p.author.name,
          p.author.email,
          "",
          "",
          0,
          0,
          0,
          0,
          0,
          0,
          p.scheduledAt?.toISOString() ?? "",
          "",
          p.createdAt.toISOString(),
        ])
      );
      continue;
    }
    for (const v of p.variants) {
      rows.push(
        buildRow([
          p.id,
          p.title,
          v.status,
          p.author.name,
          p.author.email,
          v.account.platform,
          v.account.handle,
          v.likes,
          v.comments,
          v.shares,
          v.saves,
          v.reach,
          v.impressions,
          p.scheduledAt?.toISOString() ?? "",
          v.publishedAt?.toISOString() ?? "",
          p.createdAt.toISOString(),
        ])
      );
    }
  }

  const csv = rows.join("\n");
  const filename = `posts-${new Date().toISOString().split("T")[0]}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Quote a single CSV cell — escapes embedded quotes + wraps in quotes. */
function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

/** Build a CSV row from a list of cells. */
function buildRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}
