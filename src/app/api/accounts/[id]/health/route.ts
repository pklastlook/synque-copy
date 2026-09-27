import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { recalculateAccountHealth } from "@/lib/account-health";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/accounts/[id]/health
 *
 * Recalculates health for a SINGLE account.
 * Pulls real data (posts, comments, sentiment, protection limits) and
 * computes the actual risk score, risk level, and status.
 *
 * Body: none required
 * Auth: required
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const snapshot = await recalculateAccountHealth(id);

    return NextResponse.json({
      ok: true,
      accountId: id,
      ...snapshot,
    });
  } catch (err) {
    console.error(`[health] Error for account ${id}:`, err);
    return NextResponse.json(
      { error: "Failed to recalculate health", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
