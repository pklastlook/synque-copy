import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import {
  syncAccount,
  getCredForAccount,
  type SyncAccount,
  type SyncResult,
} from "@/lib/sync-platforms";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // batch sync can take a while across many accounts

/**
 * POST /api/accounts/sync
 *
 * Unified "import existing posts" endpoint. Pulls the user's REAL
 * historical posts/videos/tweets from each connected social platform
 * and upserts them into SYNQUE as Post + PostVariant records
 * (status="published", with real publishedAt + metrics backfilled).
 *
 * Body — exactly one of these shapes:
 *
 *   1. { accountId: "abc123" }
 *      → sync a single account (any platform).
 *
 *   2. { platform: "instagram" | "youtube" | "x" | "facebook" |
 *                  "linkedin" | "tiktok" | "all" }
 *      → sync ALL of the caller's connected accounts that match the
 *        platform filter ("all" = every connected account).
 *
 * Response:
 *   {
 *     ok: true,
 *     synced: N,       // newly created posts
 *     updated: N,      // existing posts whose metrics were refreshed
 *     total: N,        // total posts the platforms returned
 *     accounts: N,     // number of accounts processed
 *     results: [...]   // per-account breakdown
 *   }
 *
 * Auth: requires a valid JWT (Bearer token or cookie) via `requireAuth`.
 * Tenant-scoped: a tenant user only syncs accounts in their tenant;
 * super-admins see all accounts.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => ({}))) as {
    accountId?: string;
    platform?: string;
  };

  // Build the Prisma `where` clause for the accounts to sync.
  const scope = getTenantScope(user!);

  let accountWhere: Record<string, unknown>;

  if (body.accountId) {
    // Single-account sync — scope to tenant + accountId.
    accountWhere = tenantWhere(scope, { id: body.accountId });
  } else if (body.platform) {
    // Platform-scoped sync — either a specific platform or "all".
    if (body.platform === "all") {
      accountWhere = tenantWhere(scope, {});
    } else {
      accountWhere = tenantWhere(scope, { platform: body.platform });
    }
  } else {
    return NextResponse.json(
      { error: "Provide either `accountId` or `platform` in the request body." },
      { status: 400 }
    );
  }

  const accounts = await db.account.findMany({
    where: accountWhere,
    orderBy: { followers: "desc" },
    take: 50,
  });

  if (accounts.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        synced: 0,
        updated: 0,
        total: 0,
        accounts: 0,
        results: [],
        message: "No connected accounts matched the request — nothing to sync.",
      },
      { status: 200 }
    );
  }

  // Sync each account sequentially (avoid hammering the platform APIs +
  // avoid concurrent Prisma writes that could deadlock on SQLite/PGlite).
  const results: SyncResult[] = [];

  for (const row of accounts) {
    const account: SyncAccount = {
      id: row.id,
      platform: row.platform,
      handle: row.handle,
      displayName: row.displayName,
      ownerId: row.ownerId,
      customerId: row.customerId,
      followers: row.followers,
      postsCount: row.postsCount,
    };

    const cred = await getCredForAccount(account);
    if (!cred || !cred.oauth2UserToken) {
      results.push({
        accountId: account.id,
        platform: account.platform,
        accountName: account.displayName,
        synced: 0,
        updated: 0,
        total: 0,
        error:
          "No OAuth 2.0 user token for this account. Connect via 'Login with X' (etc.) in Settings → Platform API Keys first.",
      });
      continue;
    }

    const result = await syncAccount(account, cred);
    results.push(result);
  }

  // Aggregate totals across all synced accounts.
  const totals = results.reduce(
    (acc, r) => {
      acc.synced += r.synced;
      acc.updated += r.updated;
      acc.total += r.total;
      return acc;
    },
    { synced: 0, updated: 0, total: 0 }
  );

  // Build a friendly message for the toast on the client.
  const okAccounts = results.filter((r) => !r.error);
  const failedAccounts = results.filter((r) => r.error);
  let message: string;
  if (okAccounts.length === 0 && failedAccounts.length > 0) {
    message = `Sync failed for ${failedAccounts.length} account${failedAccounts.length > 1 ? "s" : ""}: ${failedAccounts[0].error ?? "unknown error"}`;
  } else if (failedAccounts.length > 0) {
    message = `Synced ${totals.synced} new + updated ${totals.updated} existing posts from ${okAccounts.length} account${okAccounts.length > 1 ? "s" : ""}. ${failedAccounts.length} account${failedAccounts.length > 1 ? "s" : ""} skipped.`;
  } else {
    message = `Synced ${totals.synced} new + updated ${totals.updated} existing posts from ${okAccounts.length} account${okAccounts.length > 1 ? "s" : ""}.`;
  }

  return NextResponse.json(
    {
      ok: true,
      synced: totals.synced,
      updated: totals.updated,
      total: totals.total,
      accounts: results.length,
      results,
      message,
    },
    { status: 200 }
  );
}
