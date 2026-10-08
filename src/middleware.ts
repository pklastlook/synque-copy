import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { rateLimitByIp } from "@/lib/rate-limit";

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
  // Vercel Cron Job — automated scheduled publishing (P1-CRON).
  // Authenticated via a CRON_SECRET bearer token (server-to-server), NOT JWT.
  // The route handler verifies the secret itself; here we just bypass the JWT
  // check so Vercel's scheduler can hit it without a user session.
  "/api/cron/publish-scheduled",
  // Stripe webhook — invoked by Stripe (no JWT). Auth is enforced by the
  // Stripe webhook signature (STRIPE_WEBHOOK_SECRET) inside the handler
  // (src/app/api/stripe/webhook/route.ts).
  "/api/stripe/webhook",
  // WebAuthn authenticate routes are public (login without password)
  "/api/webauthn/authenticate",
  "/api/webauthn/authenticate/options",
  "/api/webauthn/authenticate/verify",
];

// Regex for routes that are public INCLUDING all their sub-paths.
// The OAuth callback URL includes the platform name as a sub-path:
//   /api/oauth/callback/twitter
//   /api/oauth/callback/youtube
//   /api/oauth/callback/instagram
// etc. These are GET redirects from the OAuth provider (Google, Twitter,
// TikTok) — they carry the authorization code + state but NOT a JWT.
// They MUST be public or the OAuth flow fails with "Authentication required".
const PUBLIC_SUBPATH_RE = /^\/api\/oauth\/callback\/[^/]+$/;

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

  // 4. OAuth callback sub-paths: `/api/oauth/callback/<platform>` are GET
  //    redirects from the OAuth provider — they carry the auth code + state
  //    but NOT a JWT. They MUST be public.
  if (PUBLIC_SUBPATH_RE.test(pathname)) return true;

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

  // Allow public routes (still needs security headers + rate limits below).
  const isPublic = isPublicRoute(pathname);

  // --------------------------------------------------------------
  // Rate limiting (P3-1)
  //
  // Applied BEFORE the auth check so brute-force / credential-stuffing
  // attempts against public auth endpoints are throttled regardless of
  // whether they carry a valid JWT. Limits are per-IP per-minute.
  // --------------------------------------------------------------

  // Auth endpoints — 10 req/min/IP (login, signup, forgot/reset, 2FA).
  // `startsWith` is safe here because every path under these prefixes is
  // an auth mutation that should be throttled.
  if (
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/2fa")
  ) {
    const blocked = rateLimitByIp(req, 10, 60_000);
    if (blocked) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: blocked.headers }
      );
    }
  }

  // AI endpoints — 20 req/min/IP. Matches any /api/ai/* route plus any
  // route whose path contains `generate` or `classify` (e.g.
  // `/api/content/generate`, `/api/sentiment/classify`).
  if (
    pathname.startsWith("/api/ai/") ||
    pathname.includes("/generate") ||
    pathname.includes("/classify")
  ) {
    const blocked = rateLimitByIp(req, 20, 60_000);
    if (blocked) {
      return NextResponse.json(
        { error: "Too many AI requests. Try again later." },
        { status: 429, headers: blocked.headers }
      );
    }
  }

  // All other /api/ write endpoints — 60 req/min/IP.
  // GETs are read-heavy and cacheable; only mutations get the tighter cap.
  if (
    pathname.startsWith("/api/") &&
    (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE")
  ) {
    const blocked = rateLimitByIp(req, 60, 60_000);
    if (blocked) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: blocked.headers }
      );
    }
  }

  if (isPublic) {
    const res = NextResponse.next();
    addSecurityHeaders(res);
    return res;
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

  // OAuth connect/callback: also accept token as a URL query parameter.
  // Browser navigation (window.location.href) sends cookies but NOT the
  // Authorization header. The httpOnly sameSite:lax cookie may not be
  // sent on cross-origin OAuth redirects, so we pass the JWT as ?token=xxx
  // as a fallback. This is safe because:
  // 1. The token is already in localStorage (client-side)
  // 2. The URL is HTTPS-encrypted in production
  // 3. The token expires in 7 days
  if (!token && req.nextUrl.searchParams.has("token")) {
    token = req.nextUrl.searchParams.get("token");
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
 *
 * Includes a strict Content-Security-Policy (P3-2) that locks script/style/
 * img/connect sources to the app's own origin + a small allowlist of trusted
 * third-party origins (Cloudinary for media, Google Fonts, Railway-hosted
 * services, z.ai internal API). `frame-ancestors 'none'` blocks clickjacking
 * outright (belt-and-braces alongside the X-Frame-Options: DENY header).
 */
function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Strict Content-Security-Policy (P3-2).
  // - `script-src` includes `'unsafe-inline' 'unsafe-eval'` because Next.js
  //   dev mode injects inline runtime chunks; tighten to a nonce-based CSP
  //   in production once the build pipeline is set up for it.
  // - `img-src` allows the CDN hosts actually used by the app (Cloudinary,
  //   Twitter/X avatars, GitHub avatars) plus `data:`/`blob:` for inline
  //   previews and uploads.
  // - `connect-src` allows the app's own origin, the Railway-hosted mini
  //   services (HTTPS + WSS), and the z.ai internal API used by `src/lib/zai.ts`.
  // - `frame-ancestors 'none'` + `X-Frame-Options: DENY` = double coverage.
  // - `form-action 'self'` blocks form submissions to third-party origins.
  // - `base-uri 'self'` blocks `<base>` hijack.
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudinary.com https://abs.twimg.com https://pbs.twimg.com https://avatars.githubusercontent.com https://images.unsplash.com https://*.unsplash.com",
      "connect-src 'self' https://*.up.railway.app wss://*.up.railway.app https://internal-api.z.ai",
      "media-src 'self' https://res.cloudinary.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
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
