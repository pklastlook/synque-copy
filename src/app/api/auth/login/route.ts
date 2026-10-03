import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { issueSession, setAuthCookie } from "@/lib/auth-session";
import { sign2faTempToken } from "@/lib/2fa-temp-token";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Find the user — don't swallow DB errors silently (Neon cold-start retries)
    let user;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            password: true,
            role: true,
            title: true,
            avatar: true,
            bio: true,
            timezone: true,
            language: true,
            department: true,
            customerId: true,
            status: true,
            emailVerified: true,
            totpSecret: true,
            twoFactorEnabled: true,
          },
        });
        break; // success
      } catch (dbErr) {
        console.error(`[auth/login] DB attempt ${attempt + 1} failed:`, dbErr instanceof Error ? dbErr.message : String(dbErr));
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); // 1s, 2s
        } else {
          return NextResponse.json({ error: "Database temporarily unavailable. Please try again in a moment." }, { status: 503 });
        }
      }
    }
    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Reject suspended accounts (the password was valid, but they can't log in)
    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "This account has been suspended. Contact an administrator." },
        { status: 403 }
      );
    }

    // Update last active (best-effort — never block login on this)
    await db.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    }).catch((e) => console.error("[api]", e));

    // If 2FA is enabled, do NOT issue a full session yet. Return a short-lived
    // temp token + a flag so the frontend can prompt for the TOTP code.
    // The user verifies via /api/auth/2fa/login to complete the login.
    if (user.twoFactorEnabled && user.totpSecret) {
      const tempToken = sign2faTempToken(user.id);
      return NextResponse.json({
        requires2FA: true,
        tempToken,
        // email is returned so the UI can show "Enter the code from your
        // authenticator for {email}" without leaking whether 2FA is on.
        email: user.email,
      });
    }

    // 2FA not enabled — issue the full session + create the Session row.
    const { token, userPublic } = await issueSession({ user, req });

    const response = NextResponse.json({ token, user: userPublic });
    setAuthCookie(response, token);

    // Audit the successful login (best-effort — never blocks the response).
    await audit(req, user.id, "user.login");

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
