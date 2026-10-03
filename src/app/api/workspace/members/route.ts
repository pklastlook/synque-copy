import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/workspace/members
 *   Returns team members available for workspace sharing.
 *   Filtered by tenant (same client only).
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const members = await db.user.findMany({
    where: tenantWhere(scope, { id: { not: user!.userId }, status: "active" }),
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      color: true,
      role: true,
      title: true,
    },
  });

  return NextResponse.json({ members });
}
