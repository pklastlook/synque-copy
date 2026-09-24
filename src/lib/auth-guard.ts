import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-only-ephemeral-secret-do-not-use-in-prod";

export type Role = "admin" | "manager" | "editor" | "member" | "viewer";

/**
 * Extract + verify the JWT from the request.
 * Returns the decoded payload or null.
 *
 * Supports both Bearer token (Authorization header) and cookie-based auth.
 */
export function getUserFromRequest(req: NextRequest): { userId: string; email: string; role: string } | null {
  // Try Bearer token first
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.replace("Bearer ", "");
      return jwt.verify(token, SECRET) as { userId: string; email: string; role: string };
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
        return jwt.verify(tokenMatch[1], SECRET) as { userId: string; email: string; role: string };
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
