import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyOAuthState, type OAuthStatePayload } from "@/lib/oauth-state";
import {
  decryptPlatformCredential,
  encryptIfPresent,
} from "@/lib/platform-credential-crypto";

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
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  if (error) {
  }

  // User cancelled or platform returned an error
  if (error) {
    const errorMsg = encodeURIComponent(errorDescription || error);
    return NextResponse.redirect(new URL(`/?oauth_error=${errorMsg}`, req.url));
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/?oauth_error=missing_code_or_state", req.url));
  }

  // Decode + VERIFY the HMAC signature on the state to get userId + code_verifier (for PKCE).
  // If the signature doesn't match, the state was tampered with — abort.
  const state: OAuthStatePayload | null = verifyOAuthState(stateParam);
  if (!state) {
    return NextResponse.redirect(new URL("/?oauth_error=invalid_state", req.url));
  }

  const { userId } = state;

  // Get the OAuth app credentials. The `clientSecret` column is stored
  // AES-256-GCM-encrypted at rest (see SECURITY-DATA Finding 1 remediation)
  // so we decrypt before using it for the token-exchange Basic-Auth header.
  const credRow = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });
  const cred = credRow ? decryptPlatformCredential(credRow) : null;

  if (!cred?.clientId || !cred?.clientSecret) {
    return NextResponse.redirect(new URL("/?oauth_error=app_not_configured", req.url));
  }

  // Build the redirect URI — MUST match the one used in the connect step.
  // Uses APP_URL env var (most reliable) or falls back to request headers.
  const APP_URL = process.env.APP_URL;
  let redirectUri: string;

  if (APP_URL) {
    redirectUri = `${APP_URL.replace(/\/$/, "")}/api/oauth/callback/${platform}`;
  } else {
    const requestUrl = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host");
    const hostHeader = req.headers.get("host");
    const host = forwardedHost || hostHeader || requestUrl.host;
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const protocol = forwardedProto || (host.includes("localhost") ? "http" : "https");
    redirectUri = `${protocol}://${host}/api/oauth/callback/${platform}`;
  }

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
          }).catch((e) => console.error("[api]", e));

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
            }).catch((e) => console.error("[api]", e));

            // Log activity
            await db.activity.create({
              data: {
                userId,
                type: "account_connected",
                description: `connected ${page.name} on Facebook`,
              },
            }).catch((e) => console.error("[api]", e));
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
            }).catch((e) => console.error("[api]", e));

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
              }).catch((e) => console.error("[api]", e));

              await db.activity.create({
                data: {
                  userId,
                  type: "account_connected",
                  description: `connected @${igAccount.username} on Instagram`,
                },
              }).catch((e) => console.error("[api]", e));
            }
          }
        }
      }
    }

    if (platform === "twitter") {
      // Twitter OAuth 2.0 token exchange with PKCE
      // Twitter requires Basic Auth with client_id:client_secret
      const basicAuth = Buffer.from(`${cred.clientId}:${cred.clientSecret}`).toString("base64");
      const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          client_id: cred.clientId,
          redirect_uri: redirectUri,
          code_verifier: state.cv ?? "challenge",
        }),
      });
      const tokenJson = await tokenRes.json();
      if (!tokenJson.access_token) {
        const errMsg = tokenJson.error_description || tokenJson.error || "twitter_token_failed";
        return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(errMsg)}`, req.url));
      }
      accessToken = tokenJson.access_token;

      // Fetch real profile data using the OAuth 2.0 access token
      const meRes = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics,verified,name,username,profile_image_url", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const meJson = await meRes.json();

      if (meJson.data) {
        const user = meJson.data;
        const metrics = user.public_metrics;

        const existing = await db.account.findFirst({
          where: { platform: "x", handle: user.username ?? "twitter_user" },
        }).catch((e) => console.error("[api]", e));

        if (!existing) {
          const account = await db.account.create({
            data: {
              platform: "x",
              handle: user.username ?? "twitter_user",
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
          }).catch((e) => console.error("[api]", e));

          await db.activity.create({
            data: {
              userId,
              type: "account_connected",
              description: `connected ${user.name ?? user.username} on X/Twitter`,
            },
          }).catch((e) => console.error("[api]", e));
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
      } else {
        // Profile fetch failed — but we still have the access token
        // Create the account with whatever handle we can, and store the token
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
        }).catch((e) => console.error("[api]", e));

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
          }).catch((e) => console.error("[api]", e));
        }
      }
    }

    // === TIKTOK Login Kit OAuth 2.0 ===
    // Docs: https://developers.tiktok.com/doc/login-kit-web/
    // Token endpoint: https://open.tiktokapis.com/v2/oauth/token/
    // User info endpoint: https://open.tiktokapis.com/v2/user/info/
    if (platform === "tiktok") {
      const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: cred.clientId,
          client_secret: cred.clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });
      const tokenJson = await tokenRes.json();

      if (tokenJson.access_token) {
        accessToken = tokenJson.access_token;
        const openId = tokenJson.open_id;

        // Fetch user profile via TikTok User Info API (v2)
        const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            open_id: openId,
            fields: ["open_id", "union_id", "display_name", "avatar_url", "follower_count", "likes_count", "video_count"],
          }),
        });
        const userJson = await userRes.json();

        if (userJson.data?.user) {
          const u = userJson.data.user;
          const existing = await db.account.findFirst({
            where: { platform: "tiktok", handle: u.display_name ?? "TikTok User" },
          }).catch((e) => console.error("[api]", e));

          if (!existing) {
            await db.account.create({
              data: {
                platform: "tiktok",
                handle: u.display_name ?? "TikTok User",
                displayName: u.display_name ?? "TikTok User",
                followers: u.follower_count ?? 0,
                postsCount: u.video_count ?? 0,
                verified: false,
                ownerId: userId,
                avatar: u.avatar_url ?? null,
                health: { create: { riskScore: 5, riskLevel: "safe", status: "healthy", riskReasons: "[]" } },
                protection: { create: { enabled: true } },
              },
            });

            await db.activity.create({
              data: { userId, type: "account_connected", description: `connected ${u.display_name} on TikTok` },
            }).catch((e) => console.error("[api]", e));
          }
        }
        pageId = openId;

        // Store the access token + refresh token in PlatformCredential
        // (encrypted at rest via encryptIfPresent — see P2-2-a)
        await db.platformCredential.upsert({
          where: { userId_platform: { userId, platform: "tiktok" } },
          create: {
            userId,
            platform: "tiktok",
            clientId: cred.clientId,
            clientSecret: encryptIfPresent(cred.clientSecret),
            accessToken: encryptIfPresent(accessToken),
            pageId: openId,
            connected: true,
          },
          update: {
            clientId: cred.clientId,
            clientSecret: encryptIfPresent(cred.clientSecret),
            accessToken: encryptIfPresent(accessToken),
            refreshToken: tokenJson.refresh_token ? encryptIfPresent(tokenJson.refresh_token) : undefined,
            pageId: openId,
            connected: true,
          },
        });
      } else {
        return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(tokenJson.error?.message ?? tokenJson.error ?? "tiktok_token_failed")}`, req.url));
      }
    }

    // === YOUTUBE OAuth 2.0 ===
    if (platform === "youtube") {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: cred.clientId,
          client_secret: cred.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenJson = await tokenRes.json();

      if (tokenJson.access_token) {
        accessToken = tokenJson.access_token;

        // Fetch YouTube channel info. Use the pageId from PlatformCredential
        // (the channel ID) as a fallback if "mine=true" returns empty (this
        // happens when the user's YouTube account doesn't have a channel yet
        // or the channel API requires an explicit ID).
        const channelRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const channelJson = await channelRes.json();

        // If "mine=true" didn't return any items, try fetching by the
        // pageId (channel ID) that was stored during the token exchange.
        let ch = channelJson.items?.[0];
        if (!ch && cred.pageId) {
          const channelRes2 = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${cred.pageId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const channelJson2 = await channelRes2.json();
          ch = channelJson2.items?.[0];
        }

        // Determine the channel name — use the channel title, or fall back
        // to the user's YouTube account email, or "YouTube Channel".
        const channelName = ch?.snippet?.title ?? "YouTube Channel";

        // Check if the account already exists
        const existing = await db.account.findFirst({
          where: { platform: "youtube", ownerId: userId },
        }).catch((e) => console.error("[api]", e));

        if (!existing) {
          await db.account.create({
            data: {
              platform: "youtube",
              handle: ch?.snippet?.customUrl ?? channelName,
              displayName: channelName,
              followers: parseInt(ch?.statistics?.subscriberCount ?? "0"),
              postsCount: parseInt(ch?.statistics?.videoCount ?? "0"),
              verified: false,
              ownerId: userId,
              avatar: ch?.snippet?.thumbnails?.default?.url ?? null,
              health: { create: { riskScore: 5, riskLevel: "safe", status: "healthy", riskReasons: "[]" } },
              protection: { create: { enabled: true } },
            },
          });

          await db.activity.create({
            data: { userId, type: "account_connected", description: `connected ${channelName} on YouTube` },
          }).catch((e) => console.error("[api]", e));
        }
        pageId = ch?.id ?? cred.pageId ?? "";
      } else {
        return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(tokenJson.error?.message ?? tokenJson.error ?? "youtube_token_failed")}`, req.url));
      }
    }

    // Save the access token + page ID for future posting. The
    // `oauth2UserToken` column is now AES-256-GCM-encrypted at rest (see
    // SECURITY-DATA Finding 1 remediation) so the live OAuth 2.0 user token
    // is never persisted in plaintext. `pageId` is a non-sensitive ID and
    // is stored as-is.
    await db.platformCredential.update({
      where: { userId_platform: { userId, platform } },
      data: {
        oauth2UserToken: accessToken ? encryptIfPresent(accessToken) : undefined,
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
