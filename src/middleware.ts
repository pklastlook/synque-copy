import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Global auth middleware — enforces JWT authentication on every /api/* route
 * except an explicit allowlist of public endpoints.
 *
 * Uses `jose` (Web Crypto API) instead of `jsonwebtoken` (Node crypto)
 * because Next.js middleware runs in the Edge runtime which doesn't support
 * Node's `crypto` module.
 *
 * This is the single highest-impact security fix: it closes ~60 previously
 * unprotected API routes without modifying individual handlers.
 */

const SECRET_RAW = process.env.JWT_SECRET;
if (!SECRET_RAW) {
  throw new Error("JWT_SECRET environment variable must be set. Generate one with: openssl rand -hex 32");
}
// jose requires a Uint8Array key — encode the secret string
const SECRET = new TextEncoder().encode(SECRET_RAW);

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/verify-reset-token",
  "/api/auth/2fa/login",
  "/api/auth/demo",
  "/api/oauth/callback",
  "/api/whatsapp/webhook",
  "/api/linkbio",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /api/* routes
  if (!pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Try Bearer token first
  const authHeader = req.headers.get("authorization");
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "");
  } else {
    const cookie = req.headers.get("cookie");
    if (cookie) {
      const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) token = match[1];
    }
  }

  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    // Verify the JWT using jose (Edge-compatible)
    await jwtVerify(token, SECRET);
    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
  } catch (err) {
    console.error("[middleware] JWT verify failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}

/**
 * Add security headers to all responses.
 */
function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
}

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|.*\\.png$|.*\\.jpg$).*)"],
};
