import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyTotp } from "@/lib/totp";
import { verify2faTempToken } from "@/lib/2fa-temp-token";
import { issueSession, setAuthCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/2fa/login
 *
 * Completes the 2FA login flow. The user has already entered their email
 * + password (verified by /api/auth/login, which returned a tempToken).
 * Now they submit their TOTP code + the tempToken. If valid, we issue
 * the full session JWT + create a Session row.
 *
 * Body: { tempToken: "...", code: "123456" }
 */
export async function POST(req: NextRequest) {
  try {
    const { tempToken, code } = (await req.json()) as {
      tempToken?: string;
      code?: string;
    };

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: "tempToken and code are required" },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code.trim())) {
      return NextResponse.json(
        { error: "code must be a 6-digit number" },
        { status: 400 }
      );
    }

    const userId = verify2faTempToken(tempToken);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired 2FA session. Please log in again." },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        avatar: true,
        bio: true,
        timezone: true,
        language: true,
        department: true,
        customerId: true,
        emailVerified: true,
        twoFactorEnabled: true,
        totpSecret: true,
        password: true,
        status: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Account not found. Please log in again." },
        { status: 401 }
      );
    }

    // Defensive: if the user has disabled 2FA between login and now, the
    // tempToken shouldn't have been issued — but be safe and reject.
    if (!user.twoFactorEnabled || !user.totpSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled for this account." },
        { status: 400 }
      );
    }

    // Reject suspended accounts even if they had a valid password earlier
    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "This account has been suspended. Contact an administrator." },
        { status: 403 }
      );
    }

    const valid = verifyTotp(code.trim(), user.totpSecret);
    if (!valid) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Update last active
    await db.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    }).catch((e) => console.error("[api]", e));

    const { token, userPublic } = await issueSession({ user, req });

    const response = NextResponse.json({ token, user: userPublic });
    setAuthCookie(response, token);
    return response;
  } catch (e) {
    console.error("[2fa/login] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Failed to complete 2FA login" }, { status: 500 });
  }
}
