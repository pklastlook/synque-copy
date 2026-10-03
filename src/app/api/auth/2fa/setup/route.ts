import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { generateTotpSecret, buildOtpAuthUri } from "@/lib/totp";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/setup
 *
 * Generates a new TOTP secret, stages it on the user record (in
 * `pendingTotpSecret`) — WITHOUT touching the active `totpSecret` or
 * `twoFactorEnabled` flag — and returns:
 *   - secret  (base32 string for manual entry)
 *   - otpauth  (the otpauth:// URI for QR code scanning)
 *
 * Flow:
 *   1. user calls setup → gets secret + otpauth URI
 *   2. user scans the QR / enters the secret in their authenticator app
 *   3. user calls /api/auth/2fa/verify with a 6-digit code from the app
 *   4. if correct, `pendingTotpSecret` is committed to `totpSecret` and
 *      `twoFactorEnabled` is set to true.
 *
 * SECURITY: previously, this route overwrote `totpSecret` directly and
 * flipped `twoFactorEnabled` to false. That meant a setup call would
 * immediately invalidate the user's existing 2FA (locking them out of
 * login if they aborted before verifying) AND expose the new secret on
 * disk before the user had proven their authenticator was correctly
 * configured. By staging to `pendingTotpSecret` instead, the existing
 * 2FA state is preserved until the user has proven they can produce a
 * valid code from the new secret.
 *
 * NOTE — coordination: the existing `/api/auth/2fa/verify` handler still
 * reads `totpSecret` and is therefore not wired up to commit the staged
 * secret. That route (owned by another agent / the main agent) needs to be
 * updated to (a) read `pendingTotpSecret` when present, (b) verify the
 * code against it, and (c) on success commit `pendingTotpSecret` →
 * `totpSecret`, clear `pendingTotpSecret`, and set `twoFactorEnabled = true`.
 * Until that follow-up lands, calling `setup` + `verify` will not enable
 * 2FA — this is the safer fail-closed behaviour (no half-configured 2FA
 * state that the user can't log in with).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const secret = generateTotpSecret();

    // Fetch the user's email + current 2FA state for the otpauth URI.
    // We DO NOT select/modify totpSecret or twoFactorEnabled here.
    const user = await db.user.findUnique({
      where: { id: auth.user!.userId },
      select: { email: true, twoFactorEnabled: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Stage the new secret — do NOT touch the active totpSecret or the
    // twoFactorEnabled flag. The existing 2FA setup (if any) stays live
    // until the user verifies a code from their authenticator app.
    await db.user.update({
      where: { id: auth.user!.userId },
      data: {
        pendingTotpSecret: secret,
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
