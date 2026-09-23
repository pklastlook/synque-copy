import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const config = OAUTH_CONFIG[platform];
  if (!config) {
    return NextResponse.json({ error: `OAuth for '${platform}' not supported` }, { status: 400 });
  }

  // Get the OAuth app credentials (clientId + clientSecret) from the DB
  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!cred?.clientId || !cred?.clientSecret) {
    return NextResponse.json({
      error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth App not configured. The workspace owner must add the App ID and App Secret in Settings → Platform API Keys (one-time setup).`,
    }, { status: 400 });
  }

  // Build the redirect URI — use the request URL to get the correct host
  const requestUrl = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const hostHeader = req.headers.get("host");
  const host = forwardedHost || hostHeader || requestUrl.host;
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/oauth/callback/${platform}`;

  // Build the OAuth authorize URL
  const state = Buffer.from(JSON.stringify({ userId, platform })).toString("base64url");
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", cred.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", config.scopes.join(" "));

  // For Twitter OAuth 2.0, need PKCE code_challenge
  if (platform === "twitter") {
    // Generate a random code_verifier (43-128 chars, RFC 7636)
    const codeVerifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // For "plain" method, code_challenge = code_verifier (no hashing)
    authUrl.searchParams.set("code_challenge", codeVerifier);
    authUrl.searchParams.set("code_challenge_method", "plain");
    // Store the code_verifier in the state so the callback can use it
    const stateData = { userId, platform, cv: codeVerifier };
    const stateEncoded = Buffer.from(JSON.stringify(stateData)).toString("base64url");
    authUrl.searchParams.set("state", stateEncoded);
    console.log(`[oauth/connect/twitter] code_verifier length: ${codeVerifier.length}`);
  }

  console.log(`[oauth/connect/${platform}] redirect_uri=${redirectUri}`);
  console.log(`[oauth/connect/${platform}] auth_url=${authUrl.toString()}`);

  // Redirect the browser to the platform's login page
  return NextResponse.redirect(authUrl.toString());
}
