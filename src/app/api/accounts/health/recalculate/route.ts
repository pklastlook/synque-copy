import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { recalculateAllAccountHealth } from "@/lib/account-health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/accounts/health/recalculate
 *
 * Recalculates health for ALL connected accounts.
 * Pulls real data (posts, comments, sentiment, protection limits) and
 * computes actual risk scores, risk levels, and statuses.
 *
 * This endpoint can be called:
 *   - Manually (from the Accounts UI "Refresh Health" button)
 *   - Via a scheduled job (cron) every 15-30 minutes
 *
 * No body required. Auth required.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req);
  if (error) return error;

  try {
    const result = await recalculateAllAccountHealth();

    return NextResponse.json({
      ok: true,
      total: result.total,
      updated: result.updated,
      errors: result.errors,
      message: result.errors.length === 0
        ? `Health recalculated for ${result.updated} of ${result.total} accounts`
        : `${result.updated}/${result.total} updated, ${result.errors.length} errors`,
    });
  } catch (err) {
    console.error("[health/recalculate] Error:", err);
    return NextResponse.json(
      { error: "Failed to recalculate health", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
