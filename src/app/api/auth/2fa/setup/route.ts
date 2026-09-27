import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { generateTotpSecret, buildOtpAuthUri } from "@/lib/totp";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/setup
 *
 * Generates a new TOTP secret, stores it on the user (without enabling
 * 2FA yet — that happens after they verify a code), and returns:
 *   - secret  (base32 string for manual entry)
 *   - otpauth  (the otpauth:// URI for QR code scanning)
 *
 * Flow:
 *   1. user calls setup → gets secret + otpauth URI
 *   2. user scans the QR / enters the secret in their authenticator app
 *   3. user calls /api/auth/2fa/verify with a 6-digit code from the app
 *   4. if correct, user.twoFactorEnabled is set to true
 *
 * Note: we overwrite any existing totpSecret. If the user already had 2FA
 * enabled and re-runs setup, they'll need to re-verify before 2FA is
 * re-enabled (we set twoFactorEnabled=false here so a stale secret can't
 * be used to log in).
 */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const secret = generateTotpSecret();

    // Fetch the user's email + current 2FA state for the otpauth URI
    const user = await db.user.findUnique({
      where: { id: auth.user!.userId },
      select: { email: true, twoFactorEnabled: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Store the secret + temporarily disable 2FA (will be re-enabled on verify)
    await db.user.update({
      where: { id: auth.user!.userId },
      data: {
        totpSecret: secret,
        twoFactorEnabled: false,
      },
    });

    const otpauth = buildOtpAuthUri({ secret, email: user.email });

    return NextResponse.json({
      secret,
      otpauth,
      // Hint for the UI: was 2FA previously enabled? (e.g. to warn that
      // re-running setup will require re-verification)
      previouslyEnabled: user.twoFactorEnabled,
    });
  } catch (e) {
    console.error("[2fa/setup] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Failed to set up 2FA" }, { status: 500 });
  }
}
