import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getRawToken } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/auth/sessions/[id]
 *
 * Revokes a single session (sets `revokedAt`). The user can revoke any of
 * their own sessions — including their current one (which logs them out).
 *
 * Returns 200 on success, 404 if the session doesn't exist (or belongs to
 * another user — we hide that distinction to avoid account enumeration).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Session id is required" }, { status: 400 });
    }

    // Find the session — scoped to the current user (so a user can't
    // revoke another user's session by guessing ids).
    const session = await db.session.findFirst({
      where: { id, userId: auth.user!.userId },
      select: { id: true, token: true, revokedAt: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Already revoked — idempotent success.
    if (session.revokedAt) {
      return NextResponse.json({ ok: true, alreadyRevoked: true });
    }

    await db.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // If the revoked session is the current one, the client should log out.
    const currentToken = getRawToken(req);
    const revokedCurrent = currentToken === session.token;

    return NextResponse.json({
      ok: true,
      revokedCurrent,
      message: revokedCurrent
        ? "You've been logged out of this device."
        : "Session revoked.",
    });
  } catch (e) {
    console.error("[sessions/revoke] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
  }
}
