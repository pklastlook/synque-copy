/**
 * Shared login helpers: issue a JWT + create a Session row + set the cookie.
 *
 * Used by /api/auth/login, /api/auth/2fa/login, and /api/auth/demo so
 * session creation logic stays in one place.
 */

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET environment variable must be set. Generate one with: openssl rand -hex 32");
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Issue a JWT, persist a Session row, and set the auth cookie on the
 * response. Returns the plain token + the user-facing user object.
 *
 * Callers can pass `req` to capture the user agent + IP for the session.
 */
export async function issueSession(opts: {
  user: {
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
  };
  req?: Request;
  res?: NextResponse;
}): Promise<{ token: string; sessionExpiresAt: Date; userPublic: Record<string, unknown> }> {
  const { user, req } = opts;

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role, customerId: user.customerId },
    SECRET,
    { expiresIn: "7d" }
  );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  // Capture client info for the session (best-effort — headers may be missing)
  const userAgent = req?.headers.get("user-agent") ?? null;
  const forwardedFor = req?.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  // Persist the session row so we can list/revoke it later.
  await db.session.create({
    data: {
      userId: user.id,
      token,
      userAgent,
      ipAddress,
      createdAt: now,
      expiresAt,
    },
  }).catch((e) => {
    // Log but don't fail the login — session rows are best-effort.
    console.error("[issueSession] failed to persist session:", e instanceof Error ? e.message : String(e));
  });

  const userPublic = {
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
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
  };

  return { token, sessionExpiresAt: expiresAt, userPublic };
}

/**
 * Set the auth cookie on a NextResponse (mirrors the original login route).
 */
export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

/**
 * Revoke the session matching a token, if one exists.
 * Safe to call even if the token is invalid or the session is missing.
 */
export async function revokeSessionByToken(token: string): Promise<void> {
  if (!token) return;
  await db.session.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  }).catch((e) => {
    console.error("[revokeSessionByToken] failed:", e instanceof Error ? e.message : String(e));
  });
}

/**
 * Build the public user object from a raw Prisma user row, including the
 * new security fields (emailVerified, twoFactorEnabled).
 */
export function buildUserPublic(user: {
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
}) {
  return {
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
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}
