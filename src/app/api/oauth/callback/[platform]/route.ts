import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/callback/[platform]?code=xxx&state=xxx
 *
 * Handles the OAuth callback after the user logs in on the platform.
 * 1. Exchanges the authorization code for an access token
 * 2. Fetches the user's real profile data (followers, posts, etc.)
 * 3. Creates/updates the Account record with real data
 * 4. Stores the access token in PlatformCredential for future posting
 * 5. Redirects back to the app with a success/error message
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  // User cancelled or platform returned an error
  if (error) {
    return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/?oauth_error=missing_code_or_state", req.url));
  }

  // Decode the state to get userId
  let state: { userId: string; platform: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(new URL("/?oauth_error=invalid_state", req.url));
  }

  const { userId } = state;

  // Get the OAuth app credentials
  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!cred?.clientId || !cred?.clientSecret) {
    return NextResponse.redirect(new URL("/?oauth_error=app_not_configured", req.url));
  }

  // Build the redirect URI (must match the one used in the connect step)
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/oauth/callback/${platform}`;

  try {
    // Step 1: Exchange the code for an access token
    let accessToken = "";
    let pageId = "";

    if (platform === "facebook" || platform === "instagram") {
      // Facebook/Instagram token exchange
      const tokenRes = await fetch("https://graph.facebook.com/v19.0/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: cred.clientId,
          client_secret: cred.clientSecret,
          redirect_uri: redirectUri,
          code,
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) {
        return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(tokenJson.error?.message ?? "token_exchange_failed")}`, req.url));
      }
      accessToken = tokenJson.access_token;

      // For Facebook: get the user's pages (this is the "choose your page" step)
      if (platform === "facebook") {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,fan_count,posts&access_token=${accessToken}`
        );
        const pagesJson = await pagesRes.json();

        if (pagesJson.data && pagesJson.data.length > 0) {
          // Use the first page (in a real app, we'd show a page picker)
          const page = pagesJson.data[0];
          pageId = page.id;
          accessToken = page.access_token; // Use the page access token for posting

          // Check if this account already exists
          const existing = await db.account.findFirst({
            where: { platform: "facebook", handle: page.name },
          }).catch(() => null);

          if (!existing) {
            // Create the account with REAL data
            const account = await db.account.create({
              data: {
                platform: "facebook",
                handle: page.name,
                displayName: page.name,
                followers: page.fan_count ?? 0,
                postsCount: page.posts?.data?.length ?? 0,
                verified: false,
                ownerId: userId,
                avatar: null,
                health: { create: { riskScore: 5, riskLevel: "safe", status: "healthy", riskReasons: "[]" } },
                protection: { create: { enabled: true } },
              },
            });

            // Seed analytics with real data
            await db.analyticsDaily.create({
              data: {
                accountId: account.id,
                date: new Date(),
                followers: page.fan_count ?? 0,
                impressions: 0,
                reach: 0,
                engagement: 0,
                posts: page.posts?.data?.length ?? 0,
              },
            }).catch(() => null);

            // Log activity
            await db.activity.create({
              data: {
                userId,
                type: "account_connected",
                description: `connected ${page.name} on Facebook`,
              },
            }).catch(() => null);
          } else {
            // Update existing with fresh data
            await db.account.update({
              where: { id: existing.id },
              data: {
                followers: page.fan_count ?? 0,
                postsCount: page.posts?.data?.length ?? 0,
              },
            });
          }
        } else {
          return NextResponse.redirect(new URL("/?oauth_error=no_facebook_pages", req.url));
        }
      }

      if (platform === "instagram") {
        // Get the IG Business account
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username,name,followers_count,media_count,profile_picture_url}&access_token=${accessToken}`
        );
        const igJson = await igRes.json();

        if (igJson.data && igJson.data.length > 0) {
          const page = igJson.data[0];
          const igAccount = page.instagram_business_account;
          if (igAccount) {
            pageId = igAccount.id;

            const existing = await db.account.findFirst({
              where: { platform: "instagram", handle: `@${igAccount.username}` },
            }).catch(() => null);

            if (!existing) {
              const account = await db.account.create({
                data: {
                  platform: "instagram",
                  handle: `@${igAccount.username}`,
                  displayName: igAccount.name ?? igAccount.username,
                  followers: igAccount.followers_count ?? 0,
                  postsCount: igAccount.media_count ?? 0,
                  verified: false,
                  ownerId: userId,
                  avatar: igAccount.profile_picture_url ?? null,
                  health: { create: { riskScore: 5, riskLevel: "safe", status: "healthy", riskReasons: "[]" } },
                  protection: { create: { enabled: true } },
                },
              });

              await db.analyticsDaily.create({
                data: {
                  accountId: account.id,
                  date: new Date(),
                  followers: igAccount.followers_count ?? 0,
                  impressions: 0,
                  reach: 0,
                  engagement: 0,
                  posts: igAccount.media_count ?? 0,
                },
              }).catch(() => null);

              await db.activity.create({
                data: {
                  userId,
                  type: "account_connected",
                  description: `connected @${igAccount.username} on Instagram`,
                },
              }).catch(() => null);
            }
          }
        }
      }
    }

    if (platform === "twitter") {
      // Twitter OAuth 2.0 token exchange
      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(`${cred.clientId}:${cred.clientSecret}`).toString("base64"),
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: cred.clientId,
          redirect_uri: redirectUri,
          code_verifier: "challenge",
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) {
        return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent("twitter_token_failed")}`, req.url));
      }
      accessToken = tokenJson.access_token;

      // Fetch real profile data
      const meRes = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics,verified,name,username,profile_image_url", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meJson = await meRes.json();

      if (meJson.data) {
        const user = meJson.data;
        const metrics = user.public_metrics;

        const existing = await db.account.findFirst({
          where: { platform: "x", handle: `@${user.username}` },
        }).catch(() => null);

        if (!existing) {
          const account = await db.account.create({
            data: {
              platform: "x",
              handle: `@${user.username}`,
              displayName: user.name,
              followers: metrics?.followers_count ?? 0,
              postsCount: metrics?.tweet_count ?? 0,
              verified: user.verified ?? false,
              ownerId: userId,
              avatar: user.profile_image_url ?? null,
              health: { create: { riskScore: 5, riskLevel: "safe", status: "healthy", riskReasons: "[]" } },
              protection: { create: { enabled: true } },
            },
          });

          await db.analyticsDaily.create({
            data: {
              accountId: account.id,
              date: new Date(),
              followers: metrics?.followers_count ?? 0,
              impressions: 0,
              reach: 0,
              engagement: 0,
              posts: metrics?.tweet_count ?? 0,
            },
          }).catch(() => null);

          await db.activity.create({
            data: {
              userId,
              type: "account_connected",
              description: `connected @${user.username} on X/Twitter`,
            },
          }).catch(() => null);
        } else {
          await db.account.update({
            where: { id: existing.id },
            data: {
              followers: metrics?.followers_count ?? 0,
              postsCount: metrics?.tweet_count ?? 0,
              verified: user.verified ?? false,
            },
          });
        }
      }
    }

    if (platform === "linkedin") {
      // LinkedIn token exchange
      const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: cred.clientId,
          client_secret: cred.clientSecret,
          redirect_uri: redirectUri,
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) {
        return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent("linkedin_token_failed")}`, req.url));
      }
      accessToken = tokenJson.access_token;

      // Fetch real profile
      const meRes = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const meJson = await meRes.json();

      if (meJson.id) {
        const name = `${meJson.localizedFirstName ?? ""} ${meJson.localizedLastName ?? ""}`.trim();
        const profileId = `urn:li:person:${meJson.id}`;

        const existing = await db.account.findFirst({
          where: { platform: "linkedin", handle: name },
        }).catch(() => null);

        if (!existing) {
          await db.account.create({
            data: {
              platform: "linkedin",
              handle: name,
              displayName: name,
              followers: 0,
              postsCount: 0,
              verified: false,
              ownerId: userId,
              avatar: null,
              health: { create: { riskScore: 5, riskLevel: "safe", status: "healthy", riskReasons: "[]" } },
              protection: { create: { enabled: true } },
            },
          });

          await db.activity.create({
            data: {
              userId,
              type: "account_connected",
              description: `connected ${name} on LinkedIn`,
            },
          }).catch(() => null);
        }
      }
    }

    // Save the access token + page ID for future posting
    await db.platformCredential.update({
      where: { userId_platform: { userId, platform } },
      data: {
        accessToken,
        pageId: pageId || undefined,
        connected: true,
      },
    });

    // Redirect back to the app with success
    return NextResponse.redirect(new URL("/?oauth_success=" + platform, req.url));

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OAuth callback error";
    console.error(`[oauth/callback/${platform}]`, message);
    return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(message)}`, req.url));
  }
}
