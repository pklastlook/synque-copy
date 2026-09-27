import { NextRequest, NextResponse } from "next/server";
import { getRawToken } from "@/lib/auth-guard";
import { revokeSessionByToken } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 *
 * Logs the user out by revoking their current session (sets `revokedAt`
 * on the matching Session row) and clearing the auth cookie.
 *
 * Safe to call even if no session exists — idempotent.
 */
export async function POST(req: NextRequest) {
  // Auth is optional on logout — if the token is invalid/expired, we just
  // clear the cookie and return success.
  const token = getRawToken(req);

  if (token) {
    await revokeSessionByToken(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // expires immediately
    path: "/",
  });
  return response;
}

// Also support GET for a redirect-style logout (rarely used in this app,
// but useful for the cookie-based auth flow).
export async function GET(req: NextRequest) {
  const token = getRawToken(req);
  if (token) await revokeSessionByToken(token);

  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.set("token", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
