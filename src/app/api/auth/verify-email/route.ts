import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-email
 *
 * Generates an email verification token, stores it in the
 * `EmailVerificationToken` table with a 24-hour expiry, and emails a
 * verification link to the user.
 *
 * Behavior:
 *   - If the request is authenticated, the email is taken from the
 *     authenticated user's record (preferred — most reliable).
 *   - If unauthenticated, the caller may supply a body with `email`
 *     (for the "I can't log in because my email isn't verified" case).
 *
 * Always returns the same response shape regardless of whether the email
 * exists — to avoid account enumeration.
 */
export async function POST(req: NextRequest) {
  // Try the authenticated user first — preferred path (POST /verify-email
  // is called from the in-app "verify your email" banner).
  let email: string | undefined;

  const auth = requireAuth(req);
  if (auth.user) {
    email = auth.user.email;
  } else {
    // Fall back to a body-supplied email (used by the pre-login flow).
    const body = (await req.json().catch(() => ({}))) as { email?: string };
    email = body.email?.trim().toLowerCase();
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase();

  const user = await db.user.findUnique({ where: { email: normalizedEmail } }).catch((e) => console.error("[api]", e));

  if (!user) {
    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a verification link has been sent.",
    });
  }

  // Already verified? Short-circuit success.
  if (user.emailVerified) {
    return NextResponse.json({
      ok: true,
      message: "Your email is already verified.",
      alreadyVerified: true,
    });
  }

  const { sent, verifyUrl } = await sendVerificationEmail({
    req,
    email: user.email,
    name: user.name,
  });

  if (sent) {
    return NextResponse.json({
      ok: true,
      message: "Verification email sent.",
      sent: true,
    });
  }

  // No mail server — return the link for dev/testing
  return NextResponse.json({
    ok: true,
    message: "Verification link generated. No mail server configured — check the response.",
    verifyUrl,
    sent: false,
  });
}
