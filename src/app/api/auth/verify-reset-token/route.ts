import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/verify-reset-token?token=xxx
 *
 * Checks whether a password reset token is valid (exists, not expired,
 * not already used). Used by the "enter new password" page to decide
 * whether to show the form or an error message before the user types.
 *
 * Returns:
 *   200 { valid: true, email: "user@example.com" }   — token is good
 *   200 { valid: false, reason: "expired" }          — token exists but expired/used
 *   400 { valid: false, reason: "invalid" }           — token missing or unknown
 *
 * The email is returned so the UI can confirm "Resetting password for
 * {email}" — but only if the token is valid. We don't reveal the email
 * for invalid tokens (account enumeration defense).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(
      { valid: false, reason: "invalid" },
      { status: 400 }
    );
  }

  const resetRecord = await db.passwordResetToken.findUnique({
    where: { token },
    select: { email: true, expiresAt: true, usedAt: true },
  }).catch((e) => {
    console.error("[verify-reset-token] DB lookup failed:", e instanceof Error ? e.message : String(e));
    return null;
  });

  if (!resetRecord) {
    return NextResponse.json({ valid: false, reason: "invalid" }, { status: 400 });
  }

  if (resetRecord.usedAt) {
    return NextResponse.json({ valid: false, reason: "used" }, { status: 200 });
  }

  if (resetRecord.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    email: resetRecord.email,
  });
}
