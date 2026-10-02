import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TwitterApi } from "twitter-api-v2";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * Internal API key for scheduler → app communication.
 * The scheduler mini-service includes this header to bypass JWT auth
 * so it can publish scheduled posts without a user session.
 * Must be set in .env — there is NO fallback. The route will throw
 * at module load if the env var is missing, so misconfigured deploys
 * fail loudly instead of falling back to a known public key.
 */
const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY;
if (!SCHEDULER_API_KEY) {
  throw new Error("SCHEDULER_API_KEY must be set. Generate one with: openssl rand -hex 32");
}

/**
 * POST /api/publish/[platform]
 *
 * Posts REAL content to the specified platform using stored API credentials.
 * Body: { userId, accountId, content }
 *
 * Auth: either a valid JWT (user session) OR the X-Scheduler-Key header
 * (for the scheduler mini-service to publish scheduled posts automatically).
 *
 * Currently supported:
 *   - twitter: Posts a tweet via Twitter API v2
 *
 * Other platforms (instagram, linkedin, facebook) return a clear error
 * directing the user to add credentials. Their posting routes can be
 * added following the same pattern once API credentials are configured.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  // Check for scheduler internal key first
  const schedulerKey = req.headers.get("x-scheduler-key");
  const isSchedulerCall = schedulerKey === SCHEDULER_API_KEY;

  // Read the body ONCE
  const body = (await req.json()) as {
    userId: string;
    accountId: string;
    content: string;
  };

  // If not a scheduler call, require normal user auth
  let userId: string;
  if (isSchedulerCall) {
    userId = body.userId;
  } else {
    const { user, error } = requireAuth(req);
    if (error) return error;
    userId = user!.userId;
  }

  const { platform: rawPlatform } = await params;
  const { accountId, content } = body;

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
  const account = await db.account.findUnique({
    where: { id: accountId },
    include: { protection: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // === Account Protection enforcement ===
  // Check posting limits before publishing to prevent suspension.
  if (account.protection?.enabled) {
    const prot = account.protection;

    // Check daily post limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const postsToday = await db.postVariant.count({
      where: {
        accountId,
        status: "published",
        publishedAt: { gte: today },
      },
    });
    if (postsToday >= prot.dailyPostLimit) {
      return NextResponse.json({
        error: `Daily post limit reached (${prot.dailyPostLimit}/day). Account protection is active — wait until tomorrow or increase the limit in Settings.`,
      }, { status: 429 });
    }

    // Check hourly post limit
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const postsLastHour = await db.postVariant.count({
      where: {
        accountId,
        status: "published",
        publishedAt: { gte: hourAgo },
      },
    });
    if (postsLastHour >= prot.hourlyPostLimit) {
      return NextResponse.json({
        error: `Hourly post limit reached (${prot.hourlyPostLimit}/hour). Account protection is active — wait a bit before posting again.`,
      }, { status: 429 });
    }

    // Check min minutes between posts
    if (prot.minMinutesBetweenPosts > 0) {
      const lastPost = await db.postVariant.findFirst({
        where: { accountId, status: "published" },
        orderBy: { publishedAt: "desc" },
      });
      if (lastPost?.publishedAt) {
        const minutesSince = (Date.now() - lastPost.publishedAt.getTime()) / (1000 * 60);
        if (minutesSince < prot.minMinutesBetweenPosts) {
          const waitMin = Math.ceil(prot.minMinutesBetweenPosts - minutesSince);
          return NextResponse.json({
            error: `Account protection requires ${prot.minMinutesBetweenPosts} min between posts. Wait ${waitMin} more minute${waitMin > 1 ? "s" : ""}.`,
          }, { status: 429 });
        }
      }

    // Check for duplicate content
    if (prot.blockDuplicateContent) {
      const duplicate = await db.postVariant.findFirst({
        where: { accountId, content },
        orderBy: { createdAt: "desc" },
      });
      if (duplicate) {
        return NextResponse.json({
          error: "Duplicate content blocked — this exact text was already posted to this account. Account protection is active.",
        }, { status: 409 });
      }
    }

    // Check banned hashtags
    if (prot.blockBannedHashtags && prot.bannedHashtags) {
      const bannedTags = prot.bannedHashtags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
      const contentTags = content.toLowerCase().match(/#\w+/g) ?? [];
      const foundBanned = contentTags.filter(tag => bannedTags.includes(tag));
      if (foundBanned.length > 0) {
        return NextResponse.json({
          error: `Banned hashtags detected: ${foundBanned.join(", ")}. Remove them or disable the ban in Settings.`,
        }, { status: 409 });
      }
    }

    // Pause posting if account is in warning state
    if (prot.pausePostingOnWarning && account.protection) {
      const health = await db.accountHealth.findUnique({ where: { accountId } });
      if (health && (health.status === "warning" || health.status === "restricted")) {
        return NextResponse.json({
          error: `Posting paused — account health is "${health.status}". Cooldown: ${prot.cooldownHoursOnFlag}h. Resume from Settings when ready.`,
        }, { status: 429 });
      }
    }
    }
  }

  // Get the post (for mediaUrl) — the caller passes accountId + content,
  // but we also need the post's media for Instagram/TikTok publishing.
  // We look up the latest post variant for this account.
  const latestVariant = await db.postVariant.findFirst({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: { post: true },
  });
  const post = latestVariant?.post;

  // === TWITTER posting ===
  if (platform === "twitter") {
    if (content.length > 280) {
      return NextResponse.json({ error: "Tweet exceeds 280 character limit" }, { status: 400 });
    }

    try {
      // PRIORITY 1: OAuth 2.0 user-context token (from "Login with X" flow)
      // This is the user's own token — works with pay-per-use billing
      if (cred.oauth2UserToken) {
        const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${cred.oauth2UserToken}`,
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
          }).catch((e) => console.error("[api]", e));

          return NextResponse.json({
            ok: true,
            tweetId: tweetJson.data.id,
            url: `https://x.com/i/status/${tweetJson.data.id}`,
            message: "Tweet published successfully!",
          });
        }

        // If 401, token expired — fall through to OAuth 1.0a
        if (tweetRes.status !== 401) {
          // For 402 or other errors, return the error
          const errMsg = tweetJson.detail || tweetJson.title || tweetJson.error?.message || `HTTP ${tweetRes.status}`;
          return NextResponse.json({
            error: `Failed to post tweet: ${errMsg}`,
            savedContent: content,
            manualUrl: "https://x.com/compose/post",
          }, { status: tweetRes.status || 500 });
        }
      }

      // PRIORITY 2: OAuth 1.0a (from Settings form — app-level)
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
          }).catch((e) => console.error("[api]", e));

          return NextResponse.json({
            ok: true,
            tweetId: tweet.data.id,
            url: `https://x.com/i/status/${tweet.data.id}`,
            message: "Tweet published successfully!",
          });
        } catch (err1: unknown) {
          const msg1 = err1 instanceof Error ? err1.message : String(err1);
          console.error("[publish/twitter] OAuth 1.0a failed:", msg1);

          return NextResponse.json({
            error: `Failed to post tweet: ${msg1}`,
            savedContent: content,
            manualUrl: "https://x.com/compose/post",
          }, { status: 500 });
        }
      }

      return NextResponse.json({
        error: "No valid token. Either connect via 'Login with X' or add OAuth 1.0a credentials in Settings.",
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

    // Instagram requires a media URL — use the post's mediaUrl, not the account avatar.
    const mediaUrlToPublish = post?.mediaUrl;
    if (!mediaUrlToPublish) {
      return NextResponse.json({
        error: "Instagram posts require an image. Attach media in the Composer before publishing.",
        manualUrl: "https://www.instagram.com/",
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
            image_url: mediaUrlToPublish,
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
        }).catch((e) => console.error("[api]", e));

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
        }).catch((e) => console.error("[api]", e));

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
        }).catch((e) => console.error("[api]", e));

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

  // === TIKTOK posting ===
  if (platform === "tiktok") {
    if (!cred.accessToken || !cred.pageId) {
      return NextResponse.json({
        error: "TikTok posting requires OAuth login. Go to Accounts → Connect account → TikTok → Login with TikTok.",
      }, { status: 400 });
    }

    try {
      // TikTok Content Posting API — requires a video upload first
      // For text-only posts, TikTok doesn't have a simple text post API.
      // We use the direct post endpoint with a video URL.
      // If no media is attached, we'll save the post and show a "post manually" message.
      if (!account.avatar) {
        return NextResponse.json({
          error: "TikTok requires a video to post. Attach a video in the Composer, or post manually at tiktok.com/upload.",
          manualUrl: "https://www.tiktok.com/upload",
        }, { status: 200 });
      }

      // Initialize upload
      const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cred.accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: { title: content.slice(0, 150), privacy_level: "PUBLIC_TO_EVERYONE" },
          source_info: { source: "PULL_FROM_URL", video_url: account.avatar },
        }),
      });
      const initJson = await initRes.json();

      if (initRes.ok && initJson.data?.publish_id) {
        await db.account.update({ where: { id: accountId }, data: { postsCount: { increment: 1 } } });
        await db.activity.create({
          data: { userId, type: "post_published", description: `published a TikTok video: "${content.slice(0, 50)}…"` },
        }).catch((e) => console.error("[api]", e));

        return NextResponse.json({
          ok: true,
          postId: initJson.data.publish_id,
          message: "TikTok video published successfully!",
        });
      }

      return NextResponse.json({
        error: `TikTok posting requires a video file. Attach a video in the Composer or post manually at tiktok.com/upload.`,
        manualUrl: "https://www.tiktok.com/upload",
      }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "TikTok API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === YOUTUBE posting ===
  if (platform === "youtube") {
    if (!cred.accessToken) {
      return NextResponse.json({
        error: "YouTube posting requires OAuth login. Go to Accounts → Connect account → YouTube → Login with Google.",
      }, { status: 400 });
    }

    try {
      // YouTube Data API v3 — create a video post (community post or video)
      // Community posts (text) use: POST /youtube/v3/channelSections
      // Video uploads use: POST /upload/youtube/v3/videos (multipart)
      // For text-only, we'll use the channel's community tab
      const channelRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true", {
        headers: { Authorization: `Bearer ${cred.accessToken}` },
      });
      const channelJson = await channelRes.json();

      if (channelJson.items?.[0]) {
        // YouTube doesn't have a simple "post text" API — it requires video upload.
        // We do NOT increment postsCount or log a post_published activity here
        // because nothing was actually published. Just direct the user to
        // YouTube Studio to upload a video manually.
        return NextResponse.json({
          error: "YouTube requires a video upload — text posts aren't supported via the API. Open YouTube Studio to upload.",
          manualUrl: "https://studio.youtube.com/",
          savedContent: content,
        }, { status: 200 });
      }

      return NextResponse.json({
        error: "Could not access YouTube channel. Reconnect your YouTube account.",
      }, { status: 500 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "YouTube API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === THREADS (Meta Threads API) ===
  if (platform === "threads") {
    try {
      const cred = await db.platformCredential.findFirst({
        where: { userId, platform: "threads", connected: true },
      });
      if (!cred || !cred.accessToken) {
        return NextResponse.json({
          error: "Threads API credentials not configured. Add them in Settings → Platform API Keys.",
          manualUrl: "https://www.threads.net",
        }, { status: 400 });
      }

      // Threads API: create a media container, then publish
      // Step 1: Create container
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "TEXT",
            text: content,
            access_token: cred.accessToken,
          }),
        }
      );
      const containerJson = await containerRes.json();

      if (!containerRes.ok) {
        return NextResponse.json({
          error: `Threads API error: ${containerJson.error?.message ?? "Unknown"}`,
          manualUrl: "https://www.threads.net",
        }, { status: 502 });
      }

      const containerId = containerJson.id;

      // Step 2: Publish the container
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}/threads_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: cred.accessToken,
          }),
        }
      );
      const publishJson = await publishRes.json();

      if (!publishRes.ok) {
        return NextResponse.json({
          error: `Threads publish failed: ${publishJson.error?.message ?? "Unknown"}`,
          manualUrl: "https://www.threads.net",
        }, { status: 502 });
      }

      return NextResponse.json({
        ok: true,
        platform: "threads",
        postId: publishJson.id,
        url: `https://www.threads.net/@${account.handle.replace("@", "")}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Threads API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === Unsupported platform ===
  return NextResponse.json({
    error: `Platform '${platform}' is not yet supported for real posting. Supported: twitter, instagram, linkedin, facebook, threads.`,
  }, { status: 501 });
}
