import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/sync/twitter
 *
 * Fetches the user's REAL tweets from Twitter API v2 using the stored
 * OAuth 2.0 user token. Creates Post + PostVariant records for tweets
 * that don't exist in the DB yet, and updates analytics (likes, retweets,
 * replies, impressions) for existing ones.
 *
 * This solves the problem: "I published a post on Twitter directly but
 * it doesn't show in SYNQUE analytics."
 *
 * Body: { accountId } — the X/Twitter account to sync
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { accountId } = (await req.json()) as { accountId?: string };

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 400 });
  }

  // Get the account
  const account = await db.account.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (account.platform !== "x" && account.platform !== "twitter") {
    return NextResponse.json({ error: "This endpoint only syncs X/Twitter accounts" }, { status: 400 });
  }

  // Get stored credentials
  const ownerId = account.ownerId;
  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId: ownerId, platform: "twitter" } },
  }).catch((e) => console.error("[api]", e));

  if (!cred?.oauth2UserToken) {
    return NextResponse.json({
      error: "No OAuth 2.0 user token for this account. Connect via 'Login with X' in Settings → Platform API Keys first.",
    }, { status: 400 });
  }

  let syncedPosts = 0;
  let updatedPosts = 0;
  let syncedAnalytics = false;

  try {
    // Step 1: Fetch the user's recent tweets (last 100)

    // First get the user's Twitter ID from the account handle
    const handle = account.handle.replace("@", "");

    // Fetch user ID by username
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}`,
      {
        headers: { Authorization: `Bearer ${cred.oauth2UserToken}` },
      }
    );

    if (!userRes.ok) {
      const errJson = await userRes.json().catch(() => ({}));
      return NextResponse.json({
        error: `Failed to fetch Twitter user: ${errJson.detail ?? errJson.title ?? `HTTP ${userRes.status}`}`,
      }, { status: 502 });
    }

    const userJson = await userRes.json();
    const twitterUserId = userJson.data?.id;

    if (!twitterUserId) {
      return NextResponse.json({
        error: "Could not find Twitter user ID for handle " + handle,
      }, { status: 404 });
    }


    // Fetch recent tweets with public metrics
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${twitterUserId}/tweets?` +
      new URLSearchParams({
        max_results: "100",
        "tweet.fields": "created_at,public_metrics,text,attachments",
        exclude: "retweets,replies",
      }).toString(),
      {
        headers: { Authorization: `Bearer ${cred.oauth2UserToken}` },
      }
    );

    if (!tweetsRes.ok) {
      const errJson = await tweetsRes.json().catch(() => ({}));
      return NextResponse.json({
        error: `Failed to fetch tweets: ${errJson.detail ?? errJson.title ?? `HTTP ${tweetsRes.status}`}`,
      }, { status: 502 });
    }

    const tweetsJson = await tweetsRes.json();
    const tweets = tweetsJson.data ?? [];


    // Step 2: For each tweet, check if it exists in our DB (by matching content or created date)
    for (const tweet of tweets) {
      const tweetContent = tweet.text ?? "";
      const tweetDate = new Date(tweet.created_at);
      const metrics = tweet.public_metrics ?? {};

      // Check if we already have a variant for this tweet (by content match)
      const existingVariant = await db.postVariant.findFirst({
        where: {
          accountId,
          content: tweetContent,
        },
        include: { post: true },
      });

      if (existingVariant) {
        // Update the existing variant's metrics
        await db.postVariant.update({
          where: { id: existingVariant.id },
          data: {
            likes: metrics.like_count ?? existingVariant.likes,
            comments: metrics.reply_count ?? existingVariant.comments,
            shares: metrics.retweet_count ?? existingVariant.shares,
            reach: metrics.impression_count ?? existingVariant.reach,
            impressions: metrics.impression_count ?? existingVariant.impressions,
            status: "published",
            publishedAt: existingVariant.publishedAt ?? tweetDate,
          },
        });
        updatedPosts++;
      } else {
        // Create a new Post + PostVariant for this tweet
        const title = tweetContent.slice(0, 50).trim() || "Imported Tweet";

        const newPost = await db.post.create({
          data: {
            title,
            caption: tweetContent,
            mediaType: "none",
            tone: "professional",
            status: "published",
            authorId: ownerId,
            createdAt: tweetDate,
            variants: {
              create: {
                accountId,
                content: tweetContent,
                status: "published",
                publishedAt: tweetDate,
                likes: metrics.like_count ?? 0,
                comments: metrics.reply_count ?? 0,
                shares: metrics.retweet_count ?? 0,
                reach: metrics.impression_count ?? 0,
                impressions: metrics.impression_count ?? 0,
              },
            },
          },
        });

        // Log activity
        await db.activity.create({
          data: {
            userId: ownerId,
            type: "post_published",
            description: `synced a tweet from Twitter: "${title}…"`,
          },
        }).catch((e) => console.error("[api]", e));

        syncedPosts++;
      }
    }

    // Step 3: Update account-level metrics (followers, posts count)
    const userMetricsRes = await fetch(
      `https://api.twitter.com/2/users/${twitterUserId}?user.fields=public_metrics`,
      {
        headers: { Authorization: `Bearer ${cred.oauth2UserToken}` },
      }
    );

    if (userMetricsRes.ok) {
      const userMetricsJson = await userMetricsRes.json();
      const um = userMetricsJson.data?.public_metrics;

      if (um) {
        await db.account.update({
          where: { id: accountId },
          data: {
            followers: um.followers_count ?? account.followers,
            postsCount: um.tweet_count ?? account.postsCount,
          },
        });

        // Create/update analytics daily entry (use findFirst + create/update since no compound unique)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate total impressions from synced tweets
        const totalImpressions = tweets.reduce(
          (s, t) => s + (t.public_metrics?.impression_count ?? 0),
          0
        );
        const totalEngagement = tweets.reduce(
          (s, t) => s + (t.public_metrics?.like_count ?? 0) +
            (t.public_metrics?.reply_count ?? 0) +
            (t.public_metrics?.retweet_count ?? 0),
          0
        );

        // Find existing analytics row for today, or create a new one
        const existingAnalytics = await db.analyticsDaily.findFirst({
          where: { accountId, date: today },
        });

        if (existingAnalytics) {
          await db.analyticsDaily.update({
            where: { id: existingAnalytics.id },
            data: {
              followers: um.followers_count ?? 0,
              impressions: totalImpressions,
              engagement: totalEngagement,
              posts: um.tweet_count ?? 0,
            },
          });
        } else {
          await db.analyticsDaily.create({
            data: {
              accountId,
              date: today,
              followers: um.followers_count ?? 0,
              impressions: totalImpressions,
              reach: totalImpressions,
              engagement: totalEngagement,
              posts: um.tweet_count ?? 0,
            },
          });
        }

        syncedAnalytics = true;
      }
    }


    return NextResponse.json({
      ok: true,
      syncedPosts,
      updatedPosts,
      syncedAnalytics,
      totalTweets: tweets.length,
      message: `Synced ${syncedPosts} new tweets + updated ${updatedPosts} existing posts from Twitter`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync error";
    console.error("[sync/twitter]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
