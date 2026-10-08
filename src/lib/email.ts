/**
 * Email sending helper — wraps the MailServer row + nodemailer transport.
 *
 * Returns `{ sent: boolean }`. `sent: false` means no mail server is
 * configured (caller can surface a dev URL) or the send failed.
 */

import { db } from "@/lib/db";
import { randomBytes } from "node:crypto";
import { decrypt } from "@/lib/crypto";

export interface SendEmailOpts {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<{ sent: boolean }> {
  try {
    const mailServer = await db.mailServer.findFirst({ where: { status: "connected" } });
    if (!mailServer) return { sent: false };

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: mailServer.smtpHost,
      port: mailServer.smtpPort,
      secure: mailServer.smtpSecure,
      auth: {
        user: mailServer.username,
        pass: decrypt(mailServer.passwordEnc),
      },
    });

    await transporter.sendMail({
      from: `"${mailServer.fromName}" <${mailServer.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { sent: true };
  } catch (e) {
    console.error("[sendEmail] failed:", e instanceof Error ? e.message : String(e));
    return { sent: false };
  }
}

/**
 * Build a URL using the request's host/proto headers (works behind Vercel
 * proxy + locally).
 */
export function buildAppUrl(req: Request, pathAndQuery: string): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const sep = pathAndQuery.startsWith("?") ? "" : "/";
  return `${proto}://${host}${sep}${pathAndQuery}`;
}

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create an EmailVerificationToken row for the given email + try to send
 * the verification email.
 *
 * Used by both /api/auth/signup (auto-send after registration) and
 * /api/auth/verify-email (user-initiated resend).
 *
 * Idempotent-ish: invalidates prior unused tokens for the same email so
 * only the newest one is valid.
 *
 * Returns `{ sent: boolean, verifyUrl: string }` — the URL is always
 * returned so callers can surface it for dev/testing when no mail server
 * is configured.
 */
export async function sendVerificationEmail(opts: {
  req: Request;
  email: string;
  name: string;
}): Promise<{ sent: boolean; verifyUrl: string }> {
  const normalizedEmail = opts.email.trim().toLowerCase();

  // Invalidate any prior unused tokens for this email.
  await db.emailVerificationToken.updateMany({
    where: { email: normalizedEmail, usedAt: null },
    data: { usedAt: new Date() },
  }).catch(() => null);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

  await db.emailVerificationToken.create({
    data: {
      email: normalizedEmail,
      token,
      expiresAt,
    },
  });

  // P2-CORE — point the email link to the GET handler on
  // /api/auth/verify-email?token=xxx, which verifies the token + redirects
  // to /?verified=true. Earlier this built `?verify=xxx` on the home page,
  // but the AppShell never read that query — the new GET handler closes
  // the loop with a redirect that the AppShell can surface as a toast.
  const verifyUrl = buildAppUrl(opts.req, `api/auth/verify-email?token=${token}`);
  const { sent } = await sendEmail({
    to: normalizedEmail,
    subject: "Verify your SYNQUE email",
    text: `Hi ${opts.name},\n\nClick the link below to verify your email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, ignore this email.`,
  });

  return { sent, verifyUrl };
}
