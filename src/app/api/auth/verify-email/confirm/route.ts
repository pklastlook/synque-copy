import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/verify-email/confirm?token=xxx
 *
 * The callback endpoint that email verification links point to. Verifies
 * the token, sets `user.emailVerified = now`, and marks the token as used.
 *
 * Returns 200 on success, 400 on invalid/expired/used tokens.
 *
 * This endpoint does NOT log the user in or issue a session — they must
 * log in separately. This means a stolen verification link can't be
 * combined with an existing session to silently take over an account.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(
      { error: "Verification token is required" },
      { status: 400 }
    );
  }

  const verifyRecord = await db.emailVerificationToken.findUnique({
    where: { token },
  }).catch((e) => {
    console.error("[verify-email/confirm] DB lookup failed:", e instanceof Error ? e.message : String(e));
    return null;
  });

  if (!verifyRecord) {
    return NextResponse.json(
      { error: "Invalid or expired verification token" },
      { status: 400 }
    );
  }

  // Already used?
  if (verifyRecord.usedAt) {
    // Be forgiving: if the email is already verified, treat the duplicate
    // click as success (common UX pattern — user clicks an old link).
    const user = await db.user.findUnique({
      where: { email: verifyRecord.email },
      select: { emailVerified: true },
    }).catch(() => null);

    if (user?.emailVerified) {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
        message: "Your email is already verified. You can log in.",
      });
    }
    return NextResponse.json(
      { error: "This verification link has already been used. Please request a new one." },
      { status: 400 }
    );
  }

  // Expired?
  if (verifyRecord.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This verification link has expired. Please request a new one." },
      { status: 400 }
    );
  }

  // Find the user by email + set emailVerified
  const user = await db.user.findUnique({ where: { email: verifyRecord.email } });
  if (!user) {
    // Account deleted between the request and now — mark the token as
    // used so it can't be retried.
    await db.emailVerificationToken.update({
      where: { id: verifyRecord.id },
      data: { usedAt: new Date() },
    }).catch(() => null);
    return NextResponse.json(
      { error: "Invalid or expired verification token" },
      { status: 400 }
    );
  }

  // Already verified (e.g. via a different link) — idempotent success.
  if (user.emailVerified) {
    await db.emailVerificationToken.update({
      where: { id: verifyRecord.id },
      data: { usedAt: new Date() },
    }).catch(() => null);
    return NextResponse.json({
      ok: true,
      alreadyVerified: true,
      message: "Your email is already verified. You can log in.",
    });
  }

  // Mark email as verified + consume the token in a single transaction.
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date(), status: "active" },
    }),
    db.emailVerificationToken.update({
      where: { id: verifyRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    message: "Email verified successfully. You can now log in.",
  });
}
