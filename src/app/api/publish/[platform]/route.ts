import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TwitterApi } from "twitter-api-v2";

export const dynamic = "force-dynamic";

/**
 * POST /api/publish/[platform]
 *
 * Posts REAL content to the specified platform using stored API credentials.
 * Body: { userId, accountId, content }
 *
 * Currently supported:
 *   - twitter: Posts a tweet via Twitter API v2
 *
 * Other platforms (instagram, linkedin, facebook) return a clear error
 * directing the user to add credentials. Their posting routes can be
 * added following the same pattern once API credentials are configured.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: rawPlatform } = await params;
  const { userId, accountId, content } = (await req.json()) as {
    userId: string;
    accountId: string;
    content: string;
  };

  if (!userId || !accountId || !content) {
    return NextResponse.json({ error: "userId, accountId, and content required" }, { status: 400 });
  }

  // Normalize platform name (x → twitter)
  const platform = rawPlatform === "x" ? "twitter" : rawPlatform;

  // Get stored credentials for this platform
  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!cred || !cred.connected) {
    return NextResponse.json({
      error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} API credentials not configured. Go to Settings → Platform API Keys to add them. Without credentials, posts are saved to your workspace but not published to ${platform}.`,
    }, { status: 400 });
  }

  // Get the account
  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // === TWITTER posting ===
  if (platform === "twitter") {
    if (content.length > 280) {
      return NextResponse.json({ error: "Tweet exceeds 280 character limit" }, { status: 400 });
    }

    try {
      // Try OAuth 1.0a first (works on Free tier for user-context posting)
      if (cred.apiKey && cred.apiSecret && cred.accessToken && cred.accessSecret) {
        try {
          const twitterClient = new TwitterApi({
            appKey: cred.apiKey,
            appSecret: cred.apiSecret,
            accessToken: cred.accessToken,
            accessSecret: cred.accessSecret,
          });

          const tweet = await twitterClient.v2.tweet(content);

          await db.account.update({
            where: { id: accountId },
            data: { postsCount: { increment: 1 } },
          });

          await db.activity.create({
            data: {
              userId,
              type: "post_published",
              description: `published a tweet: "${content.slice(0, 50)}${content.length > 50 ? "…" : ""}"`,
            },
          }).catch(() => null);

          return NextResponse.json({
            ok: true,
            tweetId: tweet.data.id,
            url: `https://x.com/i/status/${tweet.data.id}`,
            message: "Tweet published successfully!",
          });
        } catch (err1: unknown) {
          const msg1 = err1 instanceof Error ? err1.message : String(err1);
          console.error("[publish/twitter] OAuth 1.0a failed:", msg1);

          // If it's 402 (Free tier paywall), provide clear guidance
          if (msg1.includes("402") || msg1.includes("credits")) {
            return NextResponse.json({
              error: "Twitter Free tier doesn't allow posting via the API. You have two options:\n\n1. Upgrade to Basic tier ($100/month) at developer.twitter.com\n2. Copy your content and post manually at x.com/compose/post\n\nYour post has been saved in SocialFlow.",
              savedContent: content,
              manualUrl: "https://x.com/compose/post",
            }, { status: 200 });
          }

          // For other errors (401, 403, etc), fall through to OAuth 2.0
        }
      }

      // Fallback: OAuth 2.0 user token (direct fetch)
      if (cred.accessToken) {
        const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cred.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: content }),
        });

        const tweetJson = await tweetRes.json();

        if (tweetRes.ok && tweetJson.data?.id) {
          await db.account.update({
            where: { id: accountId },
            data: { postsCount: { increment: 1 } },
          });

          await db.activity.create({
            data: {
              userId,
              type: "post_published",
              description: `published a tweet: "${content.slice(0, 50)}${content.length > 50 ? "…" : ""}"`,
            },
          }).catch(() => null);

          return NextResponse.json({
            ok: true,
            tweetId: tweetJson.data.id,
            url: `https://x.com/i/status/${tweetJson.data.id}`,
            message: "Tweet published successfully!",
          });
        }

        const errMsg = tweetJson.detail || tweetJson.title || tweetJson.error?.message || `HTTP ${tweetRes.status}`;
        console.error("[publish/twitter] OAuth 2.0 failed:", tweetRes.status, JSON.stringify(tweetJson));

        if (tweetRes.status === 402) {
          return NextResponse.json({
            error: "Twitter Free tier doesn't allow posting via OAuth 2.0. Add OAuth 1.0a Access Token + Secret in Settings → Platform API Keys → Twitter (under 'Access Token' fields).",
          }, { status: 402 });
        }

        return NextResponse.json({
          error: `Failed to post tweet: ${errMsg}`,
        }, { status: tweetRes.status || 500 });
      }

      return NextResponse.json({
        error: "No access token. Add OAuth 1.0a credentials (Access Token + Access Token Secret) in Settings → Platform API Keys → Twitter.",
      }, { status: 400 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Twitter posting error";
      console.error("[publish/twitter]", message);
      return NextResponse.json({
        error: `Failed to post tweet: ${message}`,
      }, { status: 500 });
    }
  }

  // === Instagram posting (Graph API) ===
  if (platform === "instagram") {
    // Instagram requires: POST /{ig-user-id}/media (create container)
    // then POST /{ig-user-id}/media_publish (publish)
    // Both need a valid access token + image URL
    if (!cred.pageId || !cred.accessToken) {
      return NextResponse.json({
        error: "Instagram posting requires IG Business Account ID and a Graph API access token with instagram_content_publish permission.",
      }, { status: 400 });
    }

    try {
      // Step 1: Create media container
      const mediaRes = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: account.avatar ?? "https://via.placeholder.com/1080",
            caption: content,
            access_token: cred.accessToken,
          }),
        }
      );
      const mediaJson = await mediaRes.json();

      if (!mediaRes.ok) {
        return NextResponse.json({
          error: `Instagram API error: ${mediaJson.error?.message ?? "Failed to create media"}`,
        }, { status: 500 });
      }

      // Step 2: Publish the media container
      const pubRes = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: mediaJson.id,
            access_token: cred.accessToken,
          }),
        }
      );
      const pubJson = await pubRes.json();

      if (pubRes.ok) {
        await db.account.update({
          where: { id: accountId },
          data: { postsCount: { increment: 1 } },
        });
        await db.activity.create({
          data: {
            userId,
            type: "post_published",
            description: `published to Instagram: "${content.slice(0, 50)}…"`,
          },
        }).catch(() => null);

        return NextResponse.json({
          ok: true,
          mediaId: pubJson.id,
          message: "Instagram post published successfully!",
        });
      }

      return NextResponse.json({
        error: `Instagram publish failed: ${pubJson.error?.message ?? "Unknown error"}`,
      }, { status: 500 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Instagram API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === LinkedIn posting ===
  if (platform === "linkedin") {
    if (!cred.profileId || !cred.accessToken) {
      return NextResponse.json({
        error: "LinkedIn posting requires a Member URN and access token with w_member_social scope.",
      }, { status: 400 });
    }

    try {
      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cred.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: cred.profileId,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory: "NONE",
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const json = await res.json();

      if (res.ok) {
        await db.account.update({
          where: { id: accountId },
          data: { postsCount: { increment: 1 } },
        });
        await db.activity.create({
          data: {
            userId,
            type: "post_published",
            description: `published to LinkedIn: "${content.slice(0, 50)}…"`,
          },
        }).catch(() => null);

        return NextResponse.json({
          ok: true,
          postId: json.id,
          message: "LinkedIn post published successfully!",
        });
      }

      return NextResponse.json({
        error: `LinkedIn API error: ${json.message ?? "Unknown error"}`,
      }, { status: 500 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "LinkedIn API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === Facebook posting ===
  if (platform === "facebook") {
    if (!cred.pageId || !cred.accessToken) {
      return NextResponse.json({
        error: "Facebook posting requires a Page ID and Page Access Token with pages_manage_posts permission.",
      }, { status: 400 });
    }

    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            access_token: cred.accessToken,
          }),
        }
      );
      const json = await res.json();

      if (res.ok) {
        await db.account.update({
          where: { id: accountId },
          data: { postsCount: { increment: 1 } },
        });
        await db.activity.create({
          data: {
            userId,
            type: "post_published",
            description: `published to Facebook: "${content.slice(0, 50)}…"`,
          },
        }).catch(() => null);

        return NextResponse.json({
          ok: true,
          postId: json.id,
          message: "Facebook post published successfully!",
        });
      }

      return NextResponse.json({
        error: `Facebook API error: ${json.error?.message ?? "Unknown error"}`,
      }, { status: 500 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Facebook API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === Unsupported platform ===
  return NextResponse.json({
    error: `Platform '${platform}' is not yet supported for real posting. Supported: twitter, instagram, linkedin, facebook.`,
  }, { status: 501 });
}
