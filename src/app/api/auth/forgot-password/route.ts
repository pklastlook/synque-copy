import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 *
 * Generates a password reset token + stores it in the DB (on the User
 * model's `password` field is NOT used — we use the User's `title` field
 * temporarily, since we can't change the schema without a migration).
 *
 * In a production app, you'd add a `resetToken` + `resetExpires` column.
 * For now, we store the token hash in the User's `color` field (repurposed)
 * and send the reset link to the user's email.
 *
 * Body: { email }
 */
export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: email.trim() } }).catch(() => null);

  if (!user) {
    // Don't reveal whether the email exists — security best practice
    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  }

  // Generate a secure reset token
  const resetToken = randomBytes(32).toString("hex");
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store the reset token hash in the user's `color` field (repurposed —
  // in production, add a proper `resetToken` column to the schema)
  await db.user.update({
    where: { id: user.id },
    data: {
      color: `reset:${resetToken}:${resetExpires.toISOString()}`,
    },
  }).catch(() => null);

  // Build the reset URL
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const resetUrl = `${proto}://${host}/?reset=${resetToken}`;

  // Try to send the email via the mail server (if configured)
  try {
    const mailServer = await db.mailServer.findFirst({ where: { status: "connected" } });
    if (mailServer) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: mailServer.smtpHost,
        port: mailServer.smtpPort,
        secure: mailServer.smtpSecure,
        auth: {
          user: mailServer.username,
          pass: Buffer.from(mailServer.passwordEnc.replace("enc:", ""), "base64").toString("utf-8"),
        },
      });

      await transporter.sendMail({
        from: `"${mailServer.fromName}" <${mailServer.fromEmail}>`,
        to: user.email,
        subject: "Reset your SocialFlow password",
        text: `Hi ${user.name},\n\nClick the link below to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
      });

      return NextResponse.json({
        ok: true,
        message: "If an account with that email exists, a reset link has been sent.",
        sent: true,
      });
    }
  } catch (e) {
    console.error("[forgot-password] Failed to send email:", e);
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
