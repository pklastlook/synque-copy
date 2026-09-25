import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[auth/demo] WARNING: JWT_SECRET not set in production. Using fallback.");
}
const SECRET = JWT_SECRET || "REDACTED";

// Demo credentials — fixed so anyone can preview the product
const DEMO_EMAIL = "demo@socialflow.app";
const DEMO_PASSWORD = "demo1234";

// Read-only permission set — viewer role
const VIEWER_PERMISSIONS = JSON.stringify([
  "dashboard:read",
  "calendar:read",
  "inbox:read",
  "analytics:read",
  "accounts:read",
  "team:read",
  "media:read",
  "competitors:read",
  "hashtags:read",
  "campaigns:read",
  "reports:read",
  "tasks:read",
  "mail:read",
  "whatsapp:read",
  "listening:read",
  "linkbio:read",
]);

/**
 * POST /api/auth/demo
 *
 * Creates (or refreshes) the shared demo user with role "viewer" and
 * returns a fresh JWT. The demo user is read-only — they can browse every
 * module but cannot create or modify data.
 *
 * This endpoint is idempotent: calling it repeatedly just re-issues a token.
 */
export async function POST() {
  try {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

    // Look up the demo user (with retry — Neon can cold-start)
    let user = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
        break;
      } catch (dbErr) {
        console.error(
          `[auth/demo] DB findUnique attempt ${attempt + 1} failed:`,
          dbErr instanceof Error ? dbErr.message : String(dbErr)
        );
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    if (!user) {
      // Create the demo user with viewer role
      user = await db.user.create({
        data: {
          name: "Demo Viewer",
          email: DEMO_EMAIL,
          password: hashedPassword,
          role: "viewer",
          title: "Demo Viewer",
          department: "Demonstration",
          color: "blue",
          permissions: VIEWER_PERMISSIONS,
          status: "active",
          lastActive: new Date(),
        },
      });
    } else {
      // Refresh password/role/permissions to make sure the demo user is always
      // in a known-good state (in case someone changed the password)
      user = await db.user.update({
        where: { id: user.id },
        data: {
          name: "Demo Viewer",
          password: hashedPassword,
          role: "viewer",
          title: "Demo Viewer",
          department: "Demonstration",
          status: "active",
          lastActive: new Date(),
          permissions: VIEWER_PERMISSIONS,
        },
      });
    }

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
      demo: true,
    });

    // Mirror the login route: set the cookie so server-side routes authenticate too
    response.cookies.set("token", token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: "Failed to start demo session. Please try again." },
      { status: 500 }
    );
  }
}
