import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { issueSession, setAuthCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

// Demo credentials — fixed so anyone can preview the product
// Uses demo@synque.app which is the seeded demo user with rich data across all modules
const DEMO_EMAIL = "rabia@synque.app";
const DEMO_PASSWORD = "demo123456";

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
 * The subset of User fields the demo route reads + writes. Used so the
 * `let user` variable can be properly typed (instead of `let user = null`
 * which TS narrows to `null`).
 */
interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  avatar: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  department: string | null;
  customerId: string | null;
  emailVerified: Date | null;
  twoFactorEnabled: boolean;
  status: string;
}

const DEMO_SELECT = {
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
  status: true,
} as const;

/**
 * Look up the demo user with retry — Neon can cold-start.
 */
async function findDemoUser(): Promise<DemoUser | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.user.findUnique({
        where: { email: DEMO_EMAIL },
        select: DEMO_SELECT,
      });
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
  return null;
}

/**
 * POST /api/auth/demo
 *
 * Creates (or refreshes) the shared demo user with role "viewer" and
 * returns a fresh JWT. The demo user is read-only — they can browse every
 * module but cannot create or modify data.
 *
 * This endpoint is idempotent: calling it repeatedly just re-issues a token.
 */
export async function POST(req: NextRequest) {
  // Gate behind non-production — demo endpoint should not be accessible in prod
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_DEMO !== "true") {
    return NextResponse.json(
      { error: "Demo endpoint is disabled in production." },
      { status: 403 }
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

    let user: DemoUser | null = await findDemoUser();

    if (!user) {
      // Create the demo user with viewer role (NOT admin) + a real customerId
      // so they're tenant-scoped, not super-admin.
      user = await db.user.create({
        data: {
          name: "Alex Rivera",
          email: DEMO_EMAIL,
          password: hashedPassword,
          role: "viewer",
          title: "Product Demo",
          department: "Demonstration",
          color: "blue",
          permissions: VIEWER_PERMISSIONS,
          status: "active",
          lastActive: new Date(),
        },
        select: DEMO_SELECT,
      });
    } else {
      // Re-issue token but DON'T reactivate if an admin suspended the demo user
      if (user.status === "suspended") {
        return NextResponse.json(
          { error: "Demo account has been suspended." },
          { status: 403 }
        );
      }
      // Only update lastActive — don't reset password/status
      user = await db.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() },
        select: DEMO_SELECT,
      });
    }

    // Demo user never has 2FA — issue the full session immediately.
    const { token, userPublic } = await issueSession({ user, req });

    const response = NextResponse.json({ token, user: userPublic, demo: true });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: "Failed to start demo session. Please try again." },
      { status: 500 }
    );
  }
}
