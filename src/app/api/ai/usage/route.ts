import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { getAiUsage } from "@/lib/ai-usage";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/usage
 *
 * P2-CORE — Returns the authenticated user's AI usage snapshot for the
 * Composer's quota indicator.
 *
 * Response:
 *   {
 *     used:       number,   // generations used this cycle
 *     limit:      number,   // plan limit, or -1 for unlimited
 *     remaining:  number,   // limit - used (or -1 for unlimited)
 *     plan:       string,   // "starter" | "growth" | "enterprise" | "custom" | "admin"
 *     resetsAt:   string,   // ISO date — when the current cycle resets
 *     limited:    boolean   // true when used >= limit
 *   }
 *
 * The 30-day reset is applied lazily here (if `aiUsageResetAt` is older
 * than 30 days, the count is reset to 0 and `aiUsageResetAt` is bumped
 * before the snapshot is returned).
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const snapshot = await getAiUsage(user!);
  return NextResponse.json(snapshot);
}
