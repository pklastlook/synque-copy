import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-email
 *
 * Sends an email verification link to the user. The verification token
 * is stored in the User's `title` field (repurposed — in production, add
 * a proper `emailVerified` + `verifyToken` column).
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
    return NextResponse.json({
      ok: true,
      message: "If an account with that email exists, a verification link has been sent.",
    });
  }

  // Generate a verification token
  const verifyToken = randomBytes(32).toString("hex");

  // Store in the user's `title` field (repurposed)
  await db.user.update({
    where: { id: user.id },
    data: {
      title: `verify:${verifyToken}`,
    },
  }).catch(() => null);

  // Build the verification URL
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const verifyUrl = `${proto}://${host}/?verify=${verifyToken}`;

  // Try to send via mail server
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
        subject: "Verify your SocialFlow email",
        text: `Hi ${user.name},\n\nClick the link below to verify your email address:\n\n${verifyUrl}\n\nIf you didn't create an account, ignore this email.`,
      });

      return NextResponse.json({
        ok: true,
        message: "Verification email sent.",
        sent: true,
      });
    }
  } catch (e) {
    console.error("[verify-email] Failed to send:", e);
  }

  // No mail server — return the link for dev/testing
  return NextResponse.json({
    ok: true,
    message: "Verification link generated. No mail server configured — check the response.",
    verifyUrl,
    sent: false,
  });
}

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * Verifies an email using the token from the verification link.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
  }

  const users = await db.user.findMany({
    where: { title: `verify:${token}` },
  });

  if (users.length === 0) {
    return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
  }

  const user = users[0];

  // Clear the verification token + mark email as verified
  // (we store the verified status in the title field as "verified")
  await db.user.update({
    where: { id: user.id },
    data: {
      title: "verified",
      status: "active",
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Email verified successfully. You can now log in.",
  });
}
