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

// Routes that don't require authentication.
//
// IMPORTANT: we use EXACT match for routes whose sub-paths include
// authenticated mutations. Earlier this list used `startsWith`, which made
// e.g. `/api/linkbio` expose `/api/linkbio/[id]` PATCH/DELETE (stored-XSS
// sink — see SECURITY-INPUT Finding 1) and `/api/whatsapp/webhook` expose
// any future sub-path. The exact-match allowlist below closes that hole:
// only the explicitly-listed paths (and the public click tracker) bypass JWT.
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
  // WebAuthn authenticate routes are public (login without password)
  "/api/webauthn/authenticate",
];

// Sub-paths that are public even though they live under an otherwise-protected
// parent. Currently just the link-in-bio click tracker (called by every
// visitor on a public `/l/[slug]` page) and the link-in-bio list/create
// endpoints (POST a new page is part of the public sign-up demo flow).
const PUBLIC_EXACT_ROUTES = new Set<string>([
  "/api/linkbio",
  "/api/linkbio/click",
]);

// Regex for public link-in-bio click tracking: `/api/linkbio/<id>/click`.
// `<id>` is a cuid, so we accept any URL-safe character.
const PUBLIC_LINKBIO_CLICK_RE = /^\/api\/linkbio\/[^/]+\/click$/;

function isPublicRoute(pathname: string): boolean {
  // 1. Exact-match allowlist for the small set of routes that must bypass JWT
  //    but whose sub-paths must NOT (e.g. `/api/whatsapp/webhook` is public,
  //    but a hypothetical `/api/whatsapp/webhook/anything-else` is not).
  if (PUBLIC_ROUTES.includes(pathname)) return true;

  // 2. Exact-match routes under `/api/linkbio` that are intentionally public
  //    (listing + creating pages). PATCH/DELETE on `/api/linkbio/[id]` is
  //    NOT in this set — it requires auth (it's the stored-XSS sink).
  if (PUBLIC_EXACT_ROUTES.has(pathname)) return true;

  // 3. Click tracker: `/api/linkbio/[id]/click` is hit by every visitor on a
  //    public `/l/[slug]` page, so it must be public.
  if (PUBLIC_LINKBIO_CLICK_RE.test(pathname)) return true;

  return false;
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
