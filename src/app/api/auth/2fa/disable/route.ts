import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { verifyTotp } from "@/lib/totp";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/disable
 *
 * Disables 2FA for the current user: clears `totpSecret` (and any staged
 * `pendingTotpSecret`) and sets `twoFactorEnabled = false`.
 *
 * SECURITY: A current 6-digit TOTP code from the user's authenticator app is
 * **required**. A hijacked session (e.g. stolen JWT, XSS-exfiltrated cookie,
 * session-fixation on a shared device) cannot strip 2FA without also
 * compromising the user's authenticator.
 *
 * Body: { code: "123456" } — required. Returns 400 if missing, 403 if
 * verification fails, 400 if 2FA is not currently enabled for this user.
 *
 * Requires authentication.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const userId = auth.user!.userId;

    // Require a TOTP code unconditionally. Previously the code was optional
    // and 2FA would be silently stripped if omitted — that defeated the
    // purpose of having 2FA (any hijacked session could trivially disable
    // it).
    if (!body.code || !/^\d{6}$/.test(body.code.trim())) {
      return NextResponse.json(
        { error: "TOTP code required to disable 2FA" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.twoFactorEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled" },
        { status: 400 }
      );
    }

    // Verify the supplied code against the stored TOTP secret. The
    // existing `verifyTotp` helper (src/lib/totp.ts) accepts the current
    // ±30s window to absorb clock skew. Failure → 403 (this is a security
    // boundary, not a client-validation issue).
    const ok = verifyTotp(body.code.trim(), user.totpSecret);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid TOTP code" },
        { status: 403 }
      );
    }

    await db.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        pendingTotpSecret: null,
        twoFactorEnabled: false,
      },
    });

    return NextResponse.json({
      ok: true,
      twoFactorEnabled: false,
      message: "Two-factor authentication disabled.",
    });
  } catch (e) {
    console.error("[2fa/disable] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
  }
}
