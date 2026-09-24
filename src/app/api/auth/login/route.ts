import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Use JWT_SECRET from env, or a known fallback. The fallback matches
// the .env value so local + Vercel produce compatible tokens.
// IMPORTANT: Set JWT_SECRET in Vercel env vars for production security.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[auth] WARNING: JWT_SECRET not set in production. Using fallback — set JWT_SECRET in Vercel env vars.");
}
const SECRET = JWT_SECRET || "REDACTED";

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
        user = await db.user.findUnique({ where: { email } });
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

    // Update last active
    await db.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    }).catch(() => null);

    // Generate JWT — includes customerId for multi-tenant data isolation
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, customerId: user.customerId },
      SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
        bio: user.bio,
        timezone: user.timezone,
        language: user.language,
        department: user.department,
        customerId: user.customerId,
      },
    });

    // Also set the token as a cookie so server-side API routes + the browser
    // can authenticate without requiring a Bearer header on every request.
    response.cookies.set("token", token, {
      httpOnly: false, // needs to be readable by client-side JS too
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", // required on Vercel HTTPS
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
