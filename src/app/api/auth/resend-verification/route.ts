import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { sendVerificationEmail } from "@/lib/email";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/resend-verification
 *
 * Regenerates an email verification token for the authenticated user and
 * re-sends the verification email. Used by the dismissible "Verify your
 * email" banner in AppShell when the user clicks "Resend verification email".
 *
 * Returns:
 *   - 200 + `{ ok: true, sent: true }` on a successful send
 *   - 200 + `{ ok: true, sent: false, verifyUrl }` when no mail server is
 *     configured (dev/test path — caller can surface the URL)
 *   - 200 + `{ ok: true, alreadyVerified: true }` if the user is already verified
 *   - 401 if not authenticated
 *   - 404 if the authenticated user has no DB row (shouldn't happen)
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  // Load the user from the DB to read the canonical emailVerified status.
  // (The JWT carries a claim but the DB is the source of truth.)
  const dbUser = await db.user.findUnique({
    where: { id: user!.userId },
    select: { email: true, name: true, emailVerified: true },
  }).catch((e) => {
    console.error("[resend-verification] DB lookup failed:", e instanceof Error ? e.message : String(e));
    return null;
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (dbUser.emailVerified) {
    return NextResponse.json({
      ok: true,
      alreadyVerified: true,
      message: "Your email is already verified.",
    });
  }

  const { sent, verifyUrl } = await sendVerificationEmail({
    req,
    email: dbUser.email,
    name: dbUser.name,
  });

  if (sent) {
    return NextResponse.json({
      ok: true,
      sent: true,
      message: "Verification email sent. Check your inbox.",
    });
  }

  // No mail server — return the link so dev/test callers can complete the flow.
  return NextResponse.json({
    ok: true,
    sent: false,
    verifyUrl,
    message: "Verification link generated. No mail server configured — check the response.",
  });
}
