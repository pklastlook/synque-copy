/**
 * Shared login helpers: issue a JWT + create a Session row + set the cookie.
 *
 * Used by /api/auth/login, /api/auth/2fa/login, and /api/auth/demo so
 * session creation logic stays in one place.
 */

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { parsePermissions } from "@/lib/module-permissions";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET environment variable must be set. Generate one with: openssl rand -hex 32");
}
// Assert non-null after the runtime check above — TypeScript strict mode
// (P3-9: ignoreBuildErrors=false) does not carry this narrowing across module
// boundaries to the jwt.sign/verify call sites below.
const JWT_SECRET: string = SECRET;

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Compute a SHA-256 hex digest of the raw JWT.
 *
 * We persist only the hash in `Session.token` so that a DB read alone
 * (e.g. via a SQL dump, a compromised replica, or an SSRF into the DB)
 * does not grant a usable bearer token. To revoke a session or check
 * whether one is active, callers MUST pass the raw JWT here first.
 *
 * The hash is computed synchronously via Node's `crypto` module
 * (the same primitive used by `jsonwebtoken` for HS256) and is constant
 * time on the comparison side via Prisma's `@unique` index lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

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
    /** Module rights — raw JSON string from the DB (parsed here). */
    permissions?: string | null;
  };
  req?: Request;
  res?: NextResponse;
}): Promise<{ token: string; sessionExpiresAt: Date; userPublic: Record<string, unknown> }> {
  const { user, req } = opts;

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      // P2-CORE — carry emailVerified on the JWT so middleware + handlers
      // can branch on verification status without a DB hit. Boolean (true
      // iff `User.emailVerified` is non-null).
      emailVerified: !!user.emailVerified,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  // Capture client info for the session (best-effort — headers may be missing)
  const userAgent = req?.headers.get("user-agent") ?? null;
  const forwardedFor = req?.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? null;

  // Persist the session row so we can list/revoke it later.
  //
  // SECURITY (P3-6): store a SHA-256 hash of the raw JWT in `Session.token`
  // instead of the raw token itself. A DB-only compromise (read replica,
  // SQL dump, backup theft) therefore cannot yield a usable bearer token.
  // `hashToken` is the single canonical hashing helper — both write and
  // lookup paths go through it so the comparison is consistent.
  const tokenHash = hashToken(token);
  await db.session.create({
    data: {
      userId: user.id,
      token: tokenHash,
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
    // Parse the permissions JSON string here so every caller gets a
    // clean string[] (or [] on parse failure) — the sidebar relies on
    // this to gate nav items by module rights.
    permissions: parsePermissions(user.permissions),
  };

  return { token, sessionExpiresAt: expiresAt, userPublic };
}

/**
 * Set the auth cookie on a NextResponse (mirrors the original login route).
 */
export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

/**
 * Revoke the session matching a token, if one exists.
 * Safe to call even if the token is invalid or the session is missing.
 *
 * Accepts the RAW JWT (as produced by `issueSession`) and hashes it
 * internally before looking it up — callers never need to handle the
 * hash directly.
 */
export async function revokeSessionByToken(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = hashToken(token);
  await db.session.updateMany({
    where: { token: tokenHash, revokedAt: null },
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
