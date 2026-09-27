import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { issueSession, setAuthCookie } from "@/lib/auth-session";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/signup
 *
 * Creates a new user account, auto-sends a verification email, and
 * immediately logs the user in (issues a session). The first user ever
 * becomes admin; subsequent users are members.
 *
 * Body: { name, email, password, company?, teamSize? }
 */
export async function POST(req: NextRequest) {
  try {
    const { name, email, password, company } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } }).catch((e) => console.error("[api]", e));
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine role — first user becomes admin, subsequent users are members
    const userCount = await db.user.count();
    const role = userCount === 0 ? "admin" : "member";

    // Create the user (emailVerified is null until they click the
    // verification link)
    const user = await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        title: role === "admin" ? "Administrator" : "Team Member",
        department: company || null,
        color: "blue",
        permissions: JSON.stringify(role === "admin" ? ["*"] : ["posts:create", "media:read"]),
        status: "active",
        lastActive: new Date(),
      },
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
      },
    });

    // Issue the session (JWT + Session row + cookie)
    const { token, userPublic } = await issueSession({ user, req });

    // Auto-send a verification email — best-effort (don't fail signup if
    // the mail server is down). The verifyUrl is returned so dev/test
    // flows can show it.
    let verifySent = false;
    let verifyUrl: string | undefined;
    try {
      const result = await sendVerificationEmail({
        req,
        email: user.email,
        name: user.name,
      });
      verifySent = result.sent;
      verifyUrl = result.verifyUrl;
    } catch (e) {
      console.error("[auth/signup] sendVerificationEmail failed:", e instanceof Error ? e.message : String(e));
    }

    const response = NextResponse.json({
      token,
      user: userPublic,
      // Surface these for the UI so it can show a "verify your email"
      // banner + a "verification email sent" toast.
      emailVerificationSent: verifySent,
      verifyUrl: verifySent ? undefined : verifyUrl, // only expose in dev/test
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
