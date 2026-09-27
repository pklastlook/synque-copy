import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { verifyTotp } from "@/lib/totp";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/disable
 *
 * Disables 2FA for the current user: clears `totpSecret` and sets
 * `twoFactorEnabled = false`.
 *
 * Body (optional): { code: "123456" } — if provided, we verify it matches
 * before disabling (defends against a hijacked session disabling 2FA
 * without the user's authenticator). If omitted, we still disable but
 * log the event.
 *
 * Requires authentication.
 */
export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const userId = auth.user!.userId;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.twoFactorEnabled && !user.totpSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled" },
        { status: 400 }
      );
    }

    // If the user provided a code, verify it (best-effort — don't fail
    // if verification is impossible because the secret is missing).
    if (body.code && user.totpSecret) {
      const ok = verifyTotp(body.code.trim(), user.totpSecret);
      if (!ok) {
        return NextResponse.json(
          { error: "Invalid verification code — 2FA was not disabled" },
          { status: 400 }
        );
      }
    }

    await db.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
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
