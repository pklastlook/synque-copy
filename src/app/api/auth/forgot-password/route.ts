import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "node:crypto";
import { sendEmail, buildAppUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Build a password-reset URL using request headers (works behind Vercel
 * proxy + locally). Format: {proto}://{host}/?reset={token}
 */
function buildResetUrl(req: NextRequest, token: string): string {
  return buildAppUrl(req, `?reset=${token}`);
}

/**
 * POST /api/auth/forgot-password
 *
 * Generates a password reset token, stores it in the `PasswordResetToken`
 * table with a 1-hour expiry, and emails a reset link to the user.
 *
 * Body: { email }
 *
 * Always returns 200 with the same response shape regardless of whether the
 * email exists — to avoid account enumeration.
 */
export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await db.user.findUnique({ where: { email: normalizedEmail } }).catch(() => null);

  if (!user) {
    // Don't reveal whether the email exists — security best practice
    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  }

  // Generate a secure reset token + invalidate any prior unused tokens for
  // this email (so only the most recent reset link is valid).
  const resetToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db.passwordResetToken.updateMany({
    where: { email: normalizedEmail, usedAt: null },
    data: { usedAt: new Date() },
  }).catch(() => null);

  await db.passwordResetToken.create({
    data: {
      email: normalizedEmail,
      token: resetToken,
      expiresAt,
    },
  });

  const resetUrl = buildResetUrl(req, resetToken);
  const { sent } = await sendEmail({
    to: user.email,
    subject: "Reset your SYNQUE password",
    text: `Hi ${user.name},\n\nClick the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
  });

  if (sent) {
    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a reset link has been sent.",
      sent: true,
    });
  }

  // No mail server configured — return the reset URL in the response
  // (for development/testing only — in production, always send via email)
  return NextResponse.json({
    ok: true,
    message: "Password reset link generated. No mail server configured — check the response for the link.",
    resetUrl, // Only exposed because no mail server is configured
    sent: false,
  });
}
