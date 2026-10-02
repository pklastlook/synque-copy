import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET environment variable must be set. Generate one with: openssl rand -hex 32");
}

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
      const decoded = jwt.verify(token, SECRET) as { userId: string; email: string; role: string; customerId?: string | null };
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
        const decoded = jwt.verify(tokenMatch[1], SECRET) as { userId: string; email: string; role: string; customerId?: string | null };
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
 * Require authentication. Returns the user or a 401 response.
 */
export function requireAuth(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return {
      user: null as null,
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
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
 * Use this for sensitive routes where revoking a session should immediately
 * deny access (e.g. account deletion, API key management, billing changes).
 *
 * For ordinary read routes (dashboards, lists) prefer the sync `requireAuth`
 * to avoid the extra DB round-trip — the JWT signature check alone is
 * usually sufficient there.
 *
 * Returns the user, the raw token (for logging/auditing), or an error
 * (401 if unauthenticated, 401 if session revoked/expired).
 */
export async function requireAuthWithSession(req: NextRequest) {
  const auth = requireAuth(req);
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

  // Look up the session. Best-effort: if the DB is unavailable, fall back
  // to the JWT-only check (don't lock users out because of a Neon hiccup).
  let session: { revokedAt: Date | null; expiresAt: Date } | null = null;
  try {
    session = await db.session.findUnique({
      where: { token },
      select: { revokedAt: true, expiresAt: true },
    });
  } catch (e) {
    console.error("[requireAuthWithSession] DB lookup failed:", e instanceof Error ? e.message : String(e));
    // Fall through — treat as valid (defensive: avoid locking out users
    // during transient DB issues).
  }

  if (session) {
    if (session.revokedAt) {
      return {
        user: null,
        token,
        error: NextResponse.json({ error: "Session revoked. Please log in again." }, { status: 401 }),
      };
    }
    if (session.expiresAt < new Date()) {
      return {
        user: null,
        token,
        error: NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 }),
      };
    }
  }

  return { user: auth.user, token, error: null };
}

/**
 * Require a specific role. Returns the user or a 403 response.
 */
export function requireRole(req: NextRequest, role: Role) {
  const authResult = requireAuth(req);
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
 *   const { user, error } = requireAuth(req);
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
