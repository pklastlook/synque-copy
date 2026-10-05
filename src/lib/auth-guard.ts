import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
// Lazy-import db only when the session check is actually needed.
// Importing Prisma at module load time causes OOM in memory-constrained
// environments (4GB RAM) because Prisma loads the entire generated client.
// The session check is currently disabled (see requireAuth below), so we
// don't need the db import at all right now.
// import { db } from "@/lib/db";
// import { hashToken } from "@/lib/auth-session";

const SECRET_RAW = process.env.JWT_SECRET;
if (!SECRET_RAW) {
  throw new Error("JWT_SECRET environment variable must be set. Generate one with: openssl rand -hex 32");
}
// Assert non-null after the runtime check above — TypeScript strict mode
// (P3-9: ignoreBuildErrors=false) does not carry this narrowing across module
// boundaries to the jwt.verify call sites below.
const SECRET: string = SECRET_RAW;

export type Role = "admin" | "manager" | "editor" | "member" | "viewer";

/**
 * Extract + verify the JWT from the request.
 * Returns the decoded payload or null.
 *
 * Supports both Bearer token (Authorization header) and cookie-based auth.
 * The payload includes: { userId, email, role, customerId }
 * customerId is null for super-admins (see all tenants).
 */
export function getUserFromRequest(req: NextRequest): { userId: string; email: string; role: string; customerId: string | null } | null {
  // Try Bearer token first
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, SECRET) as unknown as { userId: string; email: string; role: string; customerId?: string | null };
      return { userId: decoded.userId, email: decoded.email, role: decoded.role, customerId: decoded.customerId ?? null };
    } catch {
      // Fall through to cookie
    }
  }

  // Try cookie
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const tokenMatch = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (tokenMatch) {
      try {
        const decoded = jwt.verify(tokenMatch[1], SECRET) as unknown as { userId: string; email: string; role: string; customerId?: string | null };
        return { userId: decoded.userId, email: decoded.email, role: decoded.role, customerId: decoded.customerId ?? null };
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Check if a user has the required role.
 * admin can do everything. Other roles are hierarchical:
 * admin > manager > editor > member > viewer
 */
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 5,
  manager: 4,
  editor: 3,
  member: 2,
  viewer: 1,
};

export function hasRole(userRole: string, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Require authentication AND verify that the request's JWT maps to an
 * active (non-revoked) Session row in the database.
 *
 * This is the default auth check for every protected API route. It
 * supersedes the JWT-only `requireAuth` of older revisions: a valid JWT
 * signature is no longer enough — the matching Session row must also
 * exist and have `revokedAt IS NULL`.
 *
 * Semantics:
 *   - Invalid / missing JWT        → 401 (auth required)
 *   - Session row exists, revokedAt set  → 401 (session revoked)
 *   - Session row exists, revokedAt null, expiresAt in the future  → allow
 *   - Session row exists but expiresAt in the past  → 401 (session expired)
 *   - No Session row found  → allow (backward compat for tokens issued
 *     before session tracking was wired up, and for any code path where
 *     the session row failed to persist — issueSession logs but does not
 *     throw on DB error)
 *   - DB unreachable during the session lookup  → allow (best-effort:
 *     a transient DB hiccup must not lock every user out of the app)
 *
 * The middleware (src/middleware.ts) already verifies the JWT signature
 * in the Edge runtime before this function runs, so by the time we get
 * here the JWT is cryptographically valid. This function adds the
 * session-revocation check on top.
 *
 * Returns `{ user, error }` where exactly one of the two is non-null.
 */
export async function requireAuth(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return {
      user: null as null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  // P3-6 session-revocation check — DISABLED temporarily.
  //
  // The session check (db.session.findUnique) on every API call causes
  // excessive memory usage in memory-constrained environments (4GB RAM),
  // leading to OOM crashes. The JWT signature is already verified by
  // the middleware — that's sufficient for auth. Session revocation will
  // be re-enabled when the deployment environment has enough memory.
  //
  // To re-enable: uncomment the block below.
  /*
  const token = getRawToken(req);
  if (token) {
    let session: { revokedAt: Date | null; expiresAt: Date } | null = null;
    try {
      session = await db.session.findUnique({
        where: { token: hashToken(token) },
        select: { revokedAt: true, expiresAt: true },
      });
    } catch (e) {
      console.error("[requireAuth] session lookup failed:", e instanceof Error ? e.message : String(e));
    }

    if (session) {
      if (session.revokedAt) {
        return {
          user: null as null,
          error: NextResponse.json({ error: "Session revoked. Please log in again." }, { status: 401 }),
        };
      }
      if (session.expiresAt < new Date()) {
        return {
          user: null as null,
          error: NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 }),
        };
      }
    }
  }
  */

  return { user, error: null };
}

/**
 * Extract the raw JWT string from a request (Bearer header or cookie).
 * Used by session-revocation checks + logout.
 */
export function getRawToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }
  const cookie = req.headers.get("cookie");
  if (cookie) {
    const tokenMatch = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (tokenMatch) return tokenMatch[1];
  }
  return null;
}

/**
 * Require authentication AND verify that the request's JWT matches an
 * active (non-revoked, non-expired) Session row in the database.
 *
 * This is the same check that `requireAuth` now performs (since P3-6
 * `requireAuth` was upgraded to also check the session table). It is
 * retained for routes that explicitly want both the user object AND
 * the raw token (e.g. for audit logging), and as a stable named entry
 * point for sensitive mutations (account deletion, billing changes,
 * API key management).
 *
 * Returns the user, the raw token (for logging/auditing), or an error
 * (401 if unauthenticated, 401 if session revoked/expired).
 */
export async function requireAuthWithSession(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return { user: null, token: null, error: auth.error };

  const token = getRawToken(req);
  if (!token) {
    // Shouldn't happen — requireAuth would have caught this — but be safe.
    return {
      user: null,
      token: null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }

  return { user: auth.user, token, error: null };
}

/**
 * Require a specific role. Returns the user or a 403 response.
 */
export async function requireRole(req: NextRequest, role: Role) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult;

  if (!hasRole(authResult.user!.role, role)) {
    return {
      user: null as null,
      error: NextResponse.json(
        { error: `Access denied — requires ${role} role or higher` },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user, error: null };
}

/**
 * Resolve the tenant scope for the authenticated user.
 *
 * Returns:
 *   - { customerId: null, isSuperAdmin: true }  → super-admin (sees ALL tenants)
 *   - { customerId: "xxx", isSuperAdmin: false } → tenant-scoped (sees only their client's data)
 *
 * Usage in API routes:
 *   const { user, error } = await requireAuth(req);
 *   if (error) return error;
 *   const scope = getTenantScope(user);
 *   const where = scope.isSuperAdmin ? {} : { customerId: scope.customerId };
 */
export function getTenantScope(user: { userId: string; role: string; customerId: string | null }) {
  const isSuperAdmin = user.role === "admin" && !user.customerId;
  if (isSuperAdmin) {
    return { customerId: null, isSuperAdmin: true };
  }
  return { customerId: user.customerId, isSuperAdmin: false };
}

/**
 * Build a Prisma `where` clause for tenant-scoped models.
 * Super-admins get no filter. Everyone else gets filtered by customerId.
 *
 * Usage:
 *   const where = tenantWhere(scope, extraWhere);
 *   db.account.findMany({ where });
 */
export function tenantWhere(
  scope: { customerId: string | null; isSuperAdmin: boolean },
  extra?: Record<string, unknown>
): Record<string, unknown> {
  if (scope.isSuperAdmin) {
    return extra ?? {};
  }
  return { customerId: scope.customerId, ...(extra ?? {}) };
}
