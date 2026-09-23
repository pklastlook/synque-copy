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

  // Build the redirect URI
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/oauth/callback/${platform}`;

  // Build the OAuth authorize URL
  const state = Buffer.from(JSON.stringify({ userId, platform })).toString("base64url");
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set("client_id", cred.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", config.scopes.join(" "));

  // For Twitter OAuth 2.0, need code_challenge (PKCE)
  if (platform === "twitter") {
    authUrl.searchParams.set("code_challenge", "challenge");
    authUrl.searchParams.set("code_challenge_method", "plain");
  }

  // Redirect the browser to the platform's login page
  return NextResponse.redirect(authUrl.toString());
}
