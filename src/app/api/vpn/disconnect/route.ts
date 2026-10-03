import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/** POST /api/vpn/disconnect
 * Marks the user's active VPN session as disconnected. The keys + config are
 * retained in the DB (history) but the session is no longer "active".
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth.user!;

  const result = await db.vPNSession.updateMany({
    where: { userId, status: "active" },
    data: { status: "disconnected", disconnectedAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
