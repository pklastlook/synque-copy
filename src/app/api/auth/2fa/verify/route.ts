import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { verifyTotp } from "@/lib/totp";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/verify
 *
 * Verifies a 6-digit TOTP code from the user's authenticator app against
 * the secret stored on their user record. If correct, sets
 * `user.twoFactorEnabled = true`.
 *
 * Body: { code: "123456" }
 *
 * Requires authentication (the user must be logged in to set up 2FA —
 * this is NOT the login-flow verify endpoint, that's /api/auth/2fa/login).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { code } = (await req.json()) as { code?: string };

    if (!code || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ error: "A 6-digit code is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: auth.user!.userId },
      select: { totpSecret: true, pendingTotpSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // P3-5 fix: if there's a pendingTotpSecret (from /api/auth/2fa/setup),
    // verify the code against the PENDING secret and commit it on success.
    // If there's no pending secret, fall back to the existing totpSecret
    // (re-verification flow for an already-enabled 2FA).
    const secretToVerify = user.pendingTotpSecret ?? user.totpSecret;

    if (!secretToVerify) {
      return NextResponse.json(
        { error: "2FA has not been set up. Call /api/auth/2fa/setup first." },
        { status: 400 }
      );
    }

    const valid = verifyTotp(code.trim(), secretToVerify);
    if (!valid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Commit the pending secret (if any) and enable 2FA
    await db.user.update({
      where: { id: auth.user!.userId },
      data: {
        twoFactorEnabled: true,
        // If there was a pending secret, promote it to the active secret
        totpSecret: user.pendingTotpSecret ?? undefined,
        pendingTotpSecret: null, // always clear the staging field
      },
    });

    return NextResponse.json({
      ok: true,
      twoFactorEnabled: true,
      message: "Two-factor authentication enabled.",
    });
  } catch (e) {
    console.error("[2fa/verify] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Failed to verify 2FA code" }, { status: 500 });
  }
}
