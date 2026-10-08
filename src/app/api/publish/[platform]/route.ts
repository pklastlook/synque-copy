import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TwitterApi } from "twitter-api-v2";
import { requireAuth } from "@/lib/auth-guard";
import { decryptPlatformCredential } from "@/lib/platform-credential-crypto";
import { createNotification } from "@/lib/notifications";

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
 *   - twitter:   Posts a tweet via Twitter API v2 (OAuth 2.0 user token or OAuth 1.0a)
 *   - instagram: 2-step Graph API v19.0 flow (create container → media_publish)
 *   - linkedin:  ugcPosts API v2 (text + image upload via registerUpload)
 *   - facebook:  Graph API v19.0 — /photos (image) or /feed (text-only)
 *   - tiktok:    Content Posting API v2 — video/init with PULL_FROM_URL
 *   - youtube:   Data API v3 multipart upload (video only)
 *   - threads:   Graph API v19.0 2-step flow (container → publish)
 *
 * Tokens: every platform uses `cred.oauth2UserToken ?? cred.accessToken`
 * (OAuth 2.0 user-context token from "Login with X" is preferred; the
 * manually-entered accessToken in Settings is the fallback).
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
    const { user, error } = await requireAuth(req);
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

  // Get stored credentials for this platform. Sensitive fields
  // (oauth2UserToken, apiKey, apiSecret, accessToken, accessSecret,
  //  bearerToken) are stored AES-256-GCM-encrypted at rest — decrypt
  // before using them to call the platform APIs.
  const credRow = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!credRow || !credRow.connected) {
    return NextResponse.json({
      error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} API credentials not configured. Go to Settings → Platform API Keys to add them. Without credentials, posts are saved to your workspace but not published to ${platform}.`,
    }, { status: 400 });
  }
  const cred = decryptPlatformCredential(credRow);

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

          // Notify the publisher in-app — "Your post was published on X".
          await createNotification({
            userId,
            type: "post_published",
            title: "Post published on X",
            message: `Your post was published on X (Twitter).`,
            actionView: "analytics",
            actionId: tweetJson.data.id,
          });

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

          await createNotification({
            userId,
            type: "post_published",
            title: "Post published on X",
            message: `Your post was published on X (Twitter).`,
            actionView: "analytics",
            actionId: tweet.data.id,
          });

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

  // === Instagram posting (Graph API v19.0) ===
  // Instagram requires a 2-step publishing flow:
  //   1) POST /{ig-business-account-id}/media         → create container (returns creation_id)
  //   2) POST /{ig-business-account-id}/media_publish  → publish container (returns media_id)
  // The pageId column stores the IG Business Account ID. The token is the
  // Graph API user token (prefer the OAuth 2.0 user-context token; fall back
  // to the manually-entered accessToken).
  if (platform === "instagram") {
    const igToken = cred.oauth2UserToken ?? cred.accessToken;
    if (!igToken || !cred.pageId) {
      return NextResponse.json({
        error: "Instagram posting requires an IG Business Account ID and a Graph API access token with instagram_content_publish permission.",
      }, { status: 400 });
    }

    // Instagram requires a media URL — use the post's mediaUrl, not the account avatar.
    const mediaUrlToPublish = post?.mediaUrl;
    if (!mediaUrlToPublish) {
      return NextResponse.json({
        error: "Instagram posts require an image. Attach media in the Composer before publishing.",
      }, { status: 400 });
    }

    try {
      // Step 1: Create media container
      const createRes = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: mediaUrlToPublish,
            caption: content,
            access_token: igToken,
          }),
        }
      );
      const createJson = await createRes.json();
      if (!createJson.id) {
        const errMsg = createJson.error?.message ?? `HTTP ${createRes.status}`;
        return NextResponse.json({
          error: `Instagram create container failed: ${errMsg}`,
        }, { status: 502 });
      }

      // Step 2: Publish the media container
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: createJson.id,
            access_token: igToken,
          }),
        }
      );
      const publishJson = await publishRes.json();
      if (publishJson.id) {
        await db.account.update({
          where: { id: accountId },
          data: { postsCount: { increment: 1 } },
        });
        await db.activity.create({
          data: {
            userId,
            type: "post_published",
            description: `published to Instagram: "${content.slice(0, 50)}${content.length > 50 ? "…" : ""}"`,
          },
        }).catch((e) => console.error("[api]", e));

        await createNotification({
          userId,
          type: "post_published",
          title: "Post published on Instagram",
          message: `Your post was published on Instagram.`,
          actionView: "analytics",
          actionId: publishJson.id,
        });

        return NextResponse.json({
          ok: true,
          published: true,
          platform: "instagram",
          postId: publishJson.id,
          url: `https://www.instagram.com/p/${publishJson.id}/`,
          message: "Instagram post published successfully!",
        });
      }

      const errMsg = publishJson.error?.message ?? `HTTP ${publishRes.status}`;
      return NextResponse.json({
        error: `Instagram publish failed: ${errMsg}`,
      }, { status: 502 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Instagram API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === LinkedIn posting (UGC Posts API v2) ===
  // POST https://api.linkedin.com/v2/ugcPosts with author + lifecycleState +
  // specificContent.shareCommentary. For media posts, an image must first be
  // uploaded via the /v2/assets?action=registerUpload flow to get a media URN,
  // then referenced in specificContent.shareMediaCategory = "IMAGE".
  if (platform === "linkedin") {
    const liToken = cred.oauth2UserToken ?? cred.accessToken;
    if (!liToken || !cred.profileId) {
      return NextResponse.json({
        error: "LinkedIn posting requires a Member URN (profileId) and access token with w_member_social scope.",
      }, { status: 400 });
    }

    try {
      const hasImage = !!post?.mediaUrl;
      let media: Array<{ status: string; media: string }> = [];
      let shareMediaCategory = "NONE";

      if (hasImage) {
        // 1) Register the upload — returns an upload URL + digitalmediaAsset URN.
        // 2) Fetch the image bytes from mediaUrl and PUT them to the upload URL.
        // 3) Reference the asset URN in the ugcPosts call below.
        try {
          const registerRes = await fetch(
            "https://api.linkedin.com/v2/assets?action=registerUpload",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${liToken}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
              },
              body: JSON.stringify({
                registerUploadRequest: {
                  recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                  owner: cred.profileId,
                  serviceRelationships: [
                    {
                      relationshipType: "OWNER",
                      identifier: "urn:li:userGeneratedContent",
                    },
                  ],
                },
              }),
            }
          );
          const registerJson = await registerRes.json();
          const assetUrn: string | undefined = registerJson?.value?.asset;
          const uploadUrl: string | undefined =
            registerJson?.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;

          if (assetUrn && uploadUrl) {
            const imgRes = await fetch(post!.mediaUrl!);
            if (imgRes.ok) {
              const imgBuf = Buffer.from(await imgRes.arrayBuffer());
              const putRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                  "Content-Type": imgRes.headers.get("content-type") ?? "application/octet-stream",
                },
                body: imgBuf,
              });
              if (putRes.ok) {
                media = [{ status: "READY", media: assetUrn }];
                shareMediaCategory = "IMAGE";
              } else {
                console.error("[publish/linkedin] asset PUT failed:", putRes.status);
              }
            } else {
              console.error("[publish/linkedin] could not fetch image bytes:", imgRes.status);
            }
          } else {
            console.error("[publish/linkedin] registerUpload missing asset/uploadUrl");
          }
        } catch (mediaErr) {
          // Non-fatal — fall through to text-only post below.
          console.error("[publish/linkedin] media upload failed, posting text-only:", mediaErr);
        }
      }

      const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${liToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: cred.profileId,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: content },
              shareMediaCategory,
              ...(media.length > 0 ? { media } : {}),
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });
      const json = await res.json();

      if (res.ok && json.id) {
        await db.account.update({
          where: { id: accountId },
          data: { postsCount: { increment: 1 } },
        });
        await db.activity.create({
          data: {
            userId,
            type: "post_published",
            description: `published to LinkedIn: "${content.slice(0, 50)}${content.length > 50 ? "…" : ""}"`,
          },
        }).catch((e) => console.error("[api]", e));

        await createNotification({
          userId,
          type: "post_published",
          title: "Post published on LinkedIn",
          message: `Your post was published on LinkedIn.`,
          actionView: "analytics",
          actionId: json.id,
        });

        return NextResponse.json({
          ok: true,
          published: true,
          platform: "linkedin",
          postId: json.id,
          url: `https://www.linkedin.com/feed/update/${json.id}/`,
          message: "LinkedIn post published successfully!",
        });
      }

      const errMsg = json.message ?? json.error?.message ?? `HTTP ${res.status}`;
      return NextResponse.json({
        error: `LinkedIn API error: ${errMsg}`,
      }, { status: 502 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "LinkedIn API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === Facebook posting (Graph API v19.0) ===
  // Photo post:  POST /{page-id}/photos with url + caption + access_token
  // Text post:   POST /{page-id}/feed   with message + access_token
  if (platform === "facebook") {
    const fbToken = cred.oauth2UserToken ?? cred.accessToken;
    if (!fbToken || !cred.pageId) {
      return NextResponse.json({
        error: "Facebook posting requires a Page ID and Page Access Token with pages_manage_posts permission.",
      }, { status: 400 });
    }

    const hasImage = !!post?.mediaUrl;

    try {
      let postId: string;
      let postUrl: string;

      if (hasImage) {
        // Photo post
        const photoRes = await fetch(
          `https://graph.facebook.com/v19.0/${cred.pageId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: post!.mediaUrl,
              caption: content,
              access_token: fbToken,
            }),
          }
        );
        const photoJson = await photoRes.json();
        if (!photoJson.id) {
          const errMsg = photoJson.error?.message ?? `HTTP ${photoRes.status}`;
          return NextResponse.json({
            error: `Facebook photo upload failed: ${errMsg}`,
          }, { status: 502 });
        }
        // The /photos endpoint returns the photo ID; the post_id field
        // (when present) is the actual story ID for the timeline post.
        postId = photoJson.post_id ?? photoJson.id;
        postUrl = `https://www.facebook.com/${cred.pageId}/photos/${photoJson.id}`;
      } else {
        // Text-only feed post
        const feedRes = await fetch(
          `https://graph.facebook.com/v19.0/${cred.pageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: content,
              access_token: fbToken,
            }),
          }
        );
        const feedJson = await feedRes.json();
        if (!feedJson.id) {
          const errMsg = feedJson.error?.message ?? `HTTP ${feedRes.status}`;
          return NextResponse.json({
            error: `Facebook feed post failed: ${errMsg}`,
          }, { status: 502 });
        }
        // feedJson.id is formatted as "{pageId}_{postId}" — extract the
        // trailing slug for a canonical permalink.
        postId = feedJson.id;
        const slug = feedJson.id.split("_").pop() ?? feedJson.id;
        postUrl = `https://www.facebook.com/${cred.pageId}/posts/${slug}`;
      }

      await db.account.update({
        where: { id: accountId },
        data: { postsCount: { increment: 1 } },
      });
      await db.activity.create({
        data: {
          userId,
          type: "post_published",
          description: `published to Facebook: "${content.slice(0, 50)}${content.length > 50 ? "…" : ""}"`,
        },
      }).catch((e) => console.error("[api]", e));

      await createNotification({
        userId,
        type: "post_published",
        title: "Post published on Facebook",
        message: `Your post was published on Facebook.`,
        actionView: "analytics",
        actionId: postId,
      });

      return NextResponse.json({
        ok: true,
        published: true,
        platform: "facebook",
        postId,
        url: postUrl,
        message: "Facebook post published successfully!",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Facebook API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === TikTok posting (Content Posting API v2) ===
  // Flow: POST /v2/post/publish/video/init/ with source=PULL_FROM_URL.
  // TikTok fetches the video from the provided URL itself — this is the
  // complete publish flow (no separate upload step needed on our side).
  // For text-only posts (no video), TikTok has no API — we return the
  // manual upload URL so the user can finish the post on tiktok.com.
  if (platform === "tiktok") {
    const tkToken = cred.oauth2UserToken ?? cred.accessToken;
    if (!tkToken || !cred.pageId) {
      return NextResponse.json({
        error: "TikTok posting requires OAuth login. Go to Accounts → Connect account → TikTok → Login with TikTok.",
      }, { status: 400 });
    }

    const videoUrl = post?.mediaUrl;

    if (!videoUrl) {
      // TikTok doesn't have a text-only post API. Without a video we can't
      // initialize an upload — return the manual upload URL so the user
      // can finish the post on tiktok.com.
      return NextResponse.json({
        ok: false,
        published: false,
        platform: "tiktok",
        error: "TikTok requires a video to post. Attach a video in the Composer, or post manually at tiktok.com/upload.",
        manualUrl: "https://www.tiktok.com/upload",
        savedContent: content,
      }, { status: 200 });
    }

    try {
      const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tkToken}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: content.slice(0, 150) || "Posted via SYNQUE",
            privacy_level: "PUBLIC_TO_EVERYONE",
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: videoUrl,
          },
        }),
      });
      const initJson = await initRes.json();

      if (initRes.ok && initJson.data?.publish_id) {
        await db.account.update({
          where: { id: accountId },
          data: { postsCount: { increment: 1 } },
        });
        await db.activity.create({
          data: {
            userId,
            type: "post_published",
            description: `published a TikTok video: "${content.slice(0, 50)}${content.length > 50 ? "…" : ""}"`,
          },
        }).catch((e) => console.error("[api]", e));

        await createNotification({
          userId,
          type: "post_published",
          title: "Post published on TikTok",
          message: `Your video was published on TikTok. It may take a few minutes to appear on your profile.`,
          actionView: "analytics",
          actionId: initJson.data.publish_id,
        });

        return NextResponse.json({
          ok: true,
          published: true,
          platform: "tiktok",
          postId: initJson.data.publish_id,
          url: "https://www.tiktok.com/",
          message: "TikTok video published successfully! It may take a few minutes to appear on your profile.",
        });
      }

      // If the init call returned an upload URL (FILE_UPLOAD source flow),
      // surface it so the user can complete the upload manually.
      if (initJson.data?.upload_url) {
        return NextResponse.json({
          ok: false,
          published: false,
          platform: "tiktok",
          uploadUrl: initJson.data.upload_url,
          manualUrl: "https://www.tiktok.com/upload",
          message: "TikTok video upload initialized. Complete the upload using the provided upload URL.",
        }, { status: 200 });
      }

      const errMsg = initJson?.error?.message ?? `HTTP ${initRes.status}`;
      return NextResponse.json({
        error: `TikTok publish failed: ${errMsg}`,
        manualUrl: "https://www.tiktok.com/upload",
        savedContent: content,
      }, { status: 502 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "TikTok API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === YOUTUBE posting ===
  // YouTube uses the OAuth 2.0 user token (stored in oauth2UserToken after
  // the "Login with Google" flow). The accessToken field may also contain
  // the token — check both.
  if (platform === "youtube") {
    const ytToken = cred.oauth2UserToken ?? cred.accessToken;
    if (!ytToken) {
      return NextResponse.json({
        error: "YouTube posting requires OAuth login. Go to Accounts → Connect account → YouTube → Login with Google.",
      }, { status: 400 });
    }

    try {
      // Check if the post has a media file (video) attached — YouTube ONLY
      // supports video uploads, not text posts.
      const hasMedia = post?.mediaUrl && post.mediaType === "video";
      const videoUrl = post?.mediaUrl;

      if (!hasMedia) {
        // YouTube doesn't support text-only posts via the API — the user
        // must attach a video. Return a helpful message.
        return NextResponse.json({
          error: "YouTube requires a video file. Attach a video in the Composer, or open YouTube Studio to upload manually.",
          manualUrl: "https://studio.youtube.com/",
          savedContent: content,
        }, { status: 200 });
      }

      // === Video upload via YouTube Data API v3 ===
      // Step 1: Fetch the video file from the mediaUrl (could be a
      // Cloudinary URL or a local /uploads/ path).
      const videoRes = await fetch(videoUrl!);
      if (!videoRes.ok) {
        return NextResponse.json({ error: "Failed to fetch the video file for upload." }, { status: 500 });
      }
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

      // Step 2: Upload the video via the YouTube Data API v3
      // POST https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status
      // This is a multipart/related request.
      const metadata = {
        snippet: {
          title: content.slice(0, 100) || "Uploaded via SYNQUE",
          description: content,
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: "public",
        },
      };

      const boundary = "synque_boundary_" + Date.now();
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
        Buffer.from(JSON.stringify(metadata)),
        Buffer.from(`\r\n--${boundary}\r\nContent-Type: video/*\r\n\r\n`),
        videoBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const uploadRes = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ytToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
            "Content-Length": body.length.toString(),
          },
          body,
        }
      );

      const uploadJson = await uploadRes.json();

      if (uploadRes.ok && uploadJson.id) {
        // Success — log activity
        await db.activity.create({
          data: {
            userId,
            type: "post_published",
            description: `published video "${metadata.snippet.title}" on YouTube (ID: ${uploadJson.id})`,
          },
        }).catch(() => {});

        await createNotification({
          userId,
          type: "post_published",
          title: "Post published on YouTube",
          message: `Your video "${metadata.snippet.title}" was uploaded to YouTube.`,
          actionView: "analytics",
          actionId: uploadJson.id,
        });

        return NextResponse.json({
          ok: true,
          published: true,
          platform: "youtube",
          postId: uploadJson.id,
          url: `https://www.youtube.com/watch?v=${uploadJson.id}`,
          message: "Video uploaded to YouTube successfully!",
        });
      } else {
        return NextResponse.json({
          error: uploadJson.error?.message ?? "YouTube upload failed",
          details: uploadJson.error?.errors?.[0]?.message ?? undefined,
        }, { status: 500 });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "YouTube API error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // === THREADS (Meta Threads API) ===
  if (platform === "threads") {
    try {
      const credRow = await db.platformCredential.findFirst({
        where: { userId, platform: "threads", connected: true },
      });
      if (!credRow || !credRow.accessToken) {
        return NextResponse.json({
          error: "Threads API credentials not configured. Add them in Settings → Platform API Keys.",
          manualUrl: "https://www.threads.net",
        }, { status: 400 });
      }
      const cred = decryptPlatformCredential(credRow);

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

      await createNotification({
        userId,
        type: "post_published",
        title: "Post published on Threads",
        message: `Your post was published on Threads.`,
        actionView: "analytics",
        actionId: publishJson.id,
      });

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
    error: `Platform '${platform}' is not yet supported for real posting. Supported: twitter, instagram, linkedin, facebook, tiktok, youtube, threads.`,
  }, { status: 501 });
}
