import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[auth/signup] WARNING: JWT_SECRET not set in production. Using fallback.");
}
const SECRET = JWT_SECRET || "socialflow-jwt-secret-2024-very-secure";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, company, teamSize } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email } }).catch(() => null);
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Determine role — first user becomes admin, subsequent users are members
    const userCount = await db.user.count();
    const role = userCount === 0 ? "admin" : "member";

    // Create the user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        title: role === "admin" ? "Administrator" : "Team Member",
        department: company || null,
        color: "blue",
        permissions: JSON.stringify(role === "admin" ? ["*"] : ["posts:create", "media:read"]),
        status: "active",
        lastActive: new Date(),
      },
    });

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
        avatar: user.avatar,
        bio: user.bio,
        timezone: user.timezone,
        language: user.language,
        department: user.department,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
