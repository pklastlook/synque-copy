import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

interface CsvRow {
  title: string;
  caption: string;
  platform: string;        // platform id, e.g. "instagram"
  scheduledAt: string;     // ISO date
}

interface ParsedRow extends CsvRow {
  accountId?: string;     // resolved from platform
  rowIndex: number;
}

/**
 * POST /api/posts/bulk-import
 *
 * Accepts a JSON body `{ rows: CsvRow[] }` (the calendar's Bulk Upload
 * modal parses the CSV client-side and posts the rows here — keeps the
 * server CSV-parsing concerns minimal and lets the client surface a
 * per-row progress bar).
 *
 * For each row:
 *   1. Resolves the `platform` string to one of the caller's accounts.
 *   2. Creates a Post + a single PostVariant in the requested tenant.
 *   3. Sets status to "scheduled" (or "draft" if scheduledAt is missing).
 *
 * Returns:
 *   { ok: true, imported: 25, failed: [{ row, error }] }
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const postCustomerId = scope.isSuperAdmin ? null : scope.customerId;

  const body = (await req.json()) as { rows: CsvRow[] };
  if (!body?.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "rows[] required" }, { status: 400 });
  }
  if (body.rows.length > 500) {
    return NextResponse.json(
      { error: "Too many rows — bulk import supports up to 500 posts at a time" },
      { status: 413 }
    );
  }

  // Pre-load the caller's accounts so we can resolve platform → accountId.
  const accounts = await db.account.findMany({
    where: scope.isSuperAdmin ? {} : { customerId: scope.customerId },
    select: { id: true, platform: true, handle: true },
  });
  // Build a "first account per platform" lookup. If the user has multiple
  // accounts on the same platform, we pick the first one — the user can
  // always re-target later by editing the post in the composer.
  const firstByPlatform = new Map<string, { id: string; handle: string }>();
  for (const a of accounts) {
    if (!firstByPlatform.has(a.platform)) {
      firstByPlatform.set(a.platform, { id: a.id, handle: a.handle });
    }
  }

  const failed: { row: number; error: string }[] = [];
  let imported = 0;

  // Sequential creates to keep the DB write path simple + to avoid
  // overwhelming SQLite/PG with a parallel write burst. Up to 500 rows
  // still completes in a few seconds in practice.
  for (let i = 0; i < body.rows.length; i++) {
    const row = body.rows[i];
    const rowIndex = i + 1;
    try {
      const title = (row.title ?? "").trim();
      const caption = (row.caption ?? "").trim();
      const platform = (row.platform ?? "").trim().toLowerCase();
      const scheduledAtRaw = (row.scheduledAt ?? "").trim();

      if (!title || !caption || !platform) {
        throw new Error("title, caption, and platform are required");
      }
      const account = firstByPlatform.get(platform);
      if (!account) {
        throw new Error(`no connected ${platform} account in your tenant`);
      }

      let scheduledAt: Date | null = null;
      if (scheduledAtRaw) {
        const d = new Date(scheduledAtRaw);
        if (Number.isNaN(d.getTime())) {
          throw new Error(`invalid scheduledAt: ${scheduledAtRaw}`);
        }
        scheduledAt = d;
      }

      const status = scheduledAt ? "scheduled" : "draft";
      await db.post.create({
        data: {
          title,
          caption,
          mediaType: "image",
          tone: "professional",
          status,
          scheduledAt,
          authorId: user!.userId,
          customerId: postCustomerId,
          variants: {
            create: {
              accountId: account.id,
              content: caption,
              hashtags: null,
              status,
              publishedAt: null,
            },
          },
        },
      });
      imported += 1;
    } catch (e) {
      failed.push({
        row: rowIndex,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  // Log activity (best-effort, non-blocking)
  if (imported > 0) {
    try {
      await db.activity.create({
        data: {
          userId: user!.userId,
          type: "post_scheduled",
          description: `bulk-imported ${imported} post${imported === 1 ? "" : "s"} from CSV`,
        },
      });
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ ok: true, imported, failed });
}
