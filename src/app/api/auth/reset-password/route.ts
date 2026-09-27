import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 *
 * Resets a user's password using a valid reset token from the
 * `PasswordResetToken` table. Marks the token as used on success.
 *
 * Body: { token, newPassword }
 *
 * Security: this endpoint does NOT log the user in — they must re-enter
 * their credentials on the login page after resetting. This ensures a
 * stolen reset link can't be combined with an existing session to
 * silently take over an account.
 */
export async function POST(req: NextRequest) {
  const { token, newPassword } = (await req.json()) as { token?: string; newPassword?: string };

  if (!token?.trim() || !newPassword?.trim()) {
    return NextResponse.json({ error: "token and newPassword are required" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Look up the token in the DB
  const resetRecord = await db.passwordResetToken.findUnique({
    where: { token: token.trim() },
  }).catch((e) => {
    console.error("[reset-password] DB lookup failed:", e instanceof Error ? e.message : String(e));
    return null;
  });

  if (!resetRecord) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  // Already used?
  if (resetRecord.usedAt) {
    return NextResponse.json(
      { error: "This reset link has already been used. Please request a new one." },
      { status: 400 }
    );
  }

  // Expired?
  if (resetRecord.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Find the user by the email attached to the token (not by the token
  // alone — defends against a token being valid for an account whose
  // email changed after the token was issued).
  const user = await db.user.findUnique({ where: { email: resetRecord.email } });
  if (!user) {
    // Account was deleted between the reset request and now — mark the
    // token as used so it can't be retried.
    await db.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }).catch((e) => console.error("[api]", e));
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  // Hash the new password + mark the token as used in a single transaction
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    db.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  // Best-effort: revoke any active sessions for this user so they have to
  // log in again with the new password (defends against an attacker who
  // already had a session).
  await db.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  }).catch((e) => console.error("[api]", e));

  return NextResponse.json({
    ok: true,
    message: "Password reset successfully. You can now log in with your new password.",
  });
}
