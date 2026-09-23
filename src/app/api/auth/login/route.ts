import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // In production, fail loudly rather than silently using an insecure default.
  // For local dev only, generate an ephemeral secret so the app still runs.
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production.");
  }
  console.warn("[auth] WARNING: JWT_SECRET not set — using an ephemeral dev secret. Set JWT_SECRET in .env for production.");
}
const SECRET = JWT_SECRET || "dev-only-ephemeral-secret-do-not-use-in-prod";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Find the user
    const user = await db.user.findUnique({ where: { email } }).catch(() => null);
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

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }
}
