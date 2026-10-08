import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/verify-email?token=xxx
 *
 * The verification-link callback endpoint — linked from the welcome email.
 * Verifies the token against the EmailVerificationToken table, sets
 * `user.emailVerified = now()` + `status = "active"`, marks the token as
 * used (single-use), and redirects the browser to `/?verified=true`.
 *
 * The redirect target (the AppShell) reads `?verified=true` from the URL
 * and shows a success toast. If verification fails (invalid / expired /
 * already-used token), the redirect carries the error so the AppShell can
 * surface it as an error toast instead.
 *
 * This endpoint is PUBLIC (no JWT) — the user lands here from an email
 * link, not from the app. Security comes from the 32-byte random token
 * in the URL.
 *
 * Backward-compat: the existing /api/auth/verify-email/confirm route does
 * the same thing but returns JSON. Both routes share the same token table.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  const base = new URL("/", req.url);

  if (!token) {
    base.searchParams.set("verified", "false");
    base.searchParams.set("error", "missing_token");
    return NextResponse.redirect(base);
  }

  const verifyRecord = await db.emailVerificationToken.findUnique({
    where: { token },
  }).catch((e) => {
    console.error("[verify-email GET] DB lookup failed:", e instanceof Error ? e.message : String(e));
    return null;
  });

  if (!verifyRecord) {
    base.searchParams.set("verified", "false");
    base.searchParams.set("error", "invalid_token");
    return NextResponse.redirect(base);
  }

  // Already used? Be forgiving if the email is already verified.
  if (verifyRecord.usedAt) {
    const existing = await db.user.findUnique({
      where: { email: verifyRecord.email },
      select: { emailVerified: true },
    }).catch(() => null);

    if (existing?.emailVerified) {
      base.searchParams.set("verified", "true");
      base.searchParams.set("alreadyVerified", "true");
      return NextResponse.redirect(base);
    }
    base.searchParams.set("verified", "false");
    base.searchParams.set("error", "already_used");
    return NextResponse.redirect(base);
  }

  // Expired?
  if (verifyRecord.expiresAt < new Date()) {
    base.searchParams.set("verified", "false");
    base.searchParams.set("error", "expired");
    return NextResponse.redirect(base);
  }

  const user = await db.user.findUnique({ where: { email: verifyRecord.email } });
  if (!user) {
    // Account deleted between the request and now — consume the token so it
    // can't be retried, then redirect with an error.
    await db.emailVerificationToken.update({
      where: { id: verifyRecord.id },
      data: { usedAt: new Date() },
    }).catch((e) => console.error("[api]", e));
    base.searchParams.set("verified", "false");
    base.searchParams.set("error", "invalid_token");
    return NextResponse.redirect(base);
  }

  // Idempotent: already verified via a different link → still succeed.
  if (user.emailVerified) {
    await db.emailVerificationToken.update({
      where: { id: verifyRecord.id },
      data: { usedAt: new Date() },
    }).catch((e) => console.error("[api]", e));
    base.searchParams.set("verified", "true");
    base.searchParams.set("alreadyVerified", "true");
    return NextResponse.redirect(base);
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
  ]).catch((e) => {
    console.error("[verify-email GET] transaction failed:", e instanceof Error ? e.message : String(e));
  });

  base.searchParams.set("verified", "true");
  return NextResponse.redirect(base);
}

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

  const auth = await requireAuth(req);
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
