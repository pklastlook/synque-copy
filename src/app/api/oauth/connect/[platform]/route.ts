import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes, createHash } from "node:crypto";
import { signOAuthState } from "@/lib/oauth-state";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/** Generate a cryptographic PKCE code_verifier (43-128 chars, unreserved chars only). */
function genCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** S256 code_challenge = base64url(SHA256(verifier)). */
function genCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/**
 * GET /api/oauth/connect/[platform]?userId=xxx
 *
 * Redirects the user to the platform's OAuth login page.
 * This is the "Click Facebook → Facebook login opens" flow.
 *
 * The platform's OAuth app must be configured in Settings → Platform API Keys
 * (one-time setup by the platform owner — team members never see it).
 *
 * Supported platforms: facebook, instagram, twitter, linkedin
 */

const OAUTH_CONFIG: Record<string, {
  authUrl: string;
  scopes: string[];
}> = {
  facebook: {
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    scopes: [
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
      "read_insights",
      "pages_messaging",
    ],
  },
  instagram: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    scopes: [
      "instagram_basic",
      "instagram_content_publish",
      "pages_show_list",
      "pages_read_engagement",
      "instagram_manage_insights",
    ],
  },
  twitter: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    scopes: ["r_liteprofile", "w_member_social", "r_organization_social"],
  },
  tiktok: {
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    scopes: ["user.info.basic", "video.publish", "video.list"],
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/yt-analytics.readonly",
    ],
  },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const { platform } = await params;

  // SECURITY: bind userId to the authenticated caller. Never trust an
  // arbitrary userId from the query string — that would let any logged-in
  // user initiate an OAuth flow that writes tokens into ANOTHER user's
  // PlatformCredential row (see oauth/callback which upserts on userId_platform).
  const userId = user.userId;

  const config = OAUTH_CONFIG[platform];
  if (!config) {
    return NextResponse.json({ error: `OAuth for '${platform}' not supported` }, { status: 400 });
  }

  // Get the OAuth app credentials (clientId + clientSecret) from the DB.
  // These are owned by the caller (per-user) — an attacker cannot read or
  // initiate flows against another tenant's OAuth app.
  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!cred?.clientId || !cred?.clientSecret) {
    return NextResponse.json({
      error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth App not configured. The workspace owner must add the App ID and App Secret in Settings → Platform API Keys (one-time setup).`,
    }, { status: 400 });
  }

  // Build the redirect URI.
  //
  // Priority:
  //   1. APP_URL env var (most reliable — set explicitly in .env / Vercel)
  //   2. x-forwarded-host + x-forwarded-proto (Vercel proxy headers)
  //   3. host header
  //   4. request URL host
  //
  // The redirect URI MUST match EXACTLY what's registered in the OAuth
  // provider's developer portal (Google, TikTok, etc.). A mismatch causes
  // "Error 400: redirect_uri_mismatch".
  const APP_URL = process.env.APP_URL;
  let redirectUri: string;

  if (APP_URL) {
    // Use the explicitly-configured app URL — most reliable
    redirectUri = `${APP_URL.replace(/\/$/, "")}/api/oauth/callback/${platform}`;
  } else {
    // Fall back to request headers (works in most Vercel deployments)
    const requestUrl = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host");
    const hostHeader = req.headers.get("host");
    const host = forwardedHost || hostHeader || requestUrl.host;
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");
    redirectUri = `${protocol}://${host}/api/oauth/callback/${platform}`;
  }

  // Build the OAuth authorize URL.
  // State is HMAC-SHA256 signed with JWT_SECRET to prevent CSRF / forgery.
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", cred.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", config.scopes.join(" "));

  // Default state (no PKCE)
  let state = signOAuthState({ userId, platform });

  // For Twitter OAuth 2.0, need PKCE code_challenge (S256 — not plain).
  if (platform === "twitter") {
    const codeVerifier = genCodeVerifier();
    const codeChallenge = genCodeChallenge(codeVerifier);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    state = signOAuthState({ userId, platform, cv: codeVerifier });
  }

  // TikTok OAuth 2.0 with PKCE
  if (platform === "tiktok") {
    const codeVerifier = genCodeVerifier();
    const codeChallenge = genCodeChallenge(codeVerifier);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    state = signOAuthState({ userId, platform, cv: codeVerifier });
  }

  authUrl.searchParams.set("state", state);

  // YouTube/Google OAuth 2.0 — uses access_type=offline for refresh token
  if (platform === "youtube") {
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
  }


  // Redirect the browser to the platform's login page
  return NextResponse.redirect(authUrl.toString());
}
