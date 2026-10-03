import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Batch sync across competitors can be slow

/**
 * POST /api/competitors/sync
 *
 * Fetches REAL follower counts, engagement rates, and posting frequency
 * for tracked competitors from the underlying social platform APIs.
 *
 * Body: { competitorId?: string }
 *   - If competitorId is provided, sync only that competitor
 *   - If omitted, sync ALL competitors with status="tracking"
 *
 * For each competitor:
 *   1. Resolve a connected PlatformCredential for the competitor's platform
 *      (prefers the authenticated user's credentials, falls back to any
 *       connected credential for that platform).
 *   2. Call the platform's public metrics API:
 *        - X/Twitter   → api.twitter.com/2/users/by/username/{handle}
 *        - Instagram   → graph.facebook.com/v19.0/{ig_business_id}
 *        - Facebook    → graph.facebook.com/v19.0/{page_id}
 *        - LinkedIn    → api.linkedin.com/v2/organizations/{id}
 *   3. Update the Competitor record (followers, engagementRate, postingFreq).
 *   4. Create a CompetitorSnapshot row with the current date + real values.
 *
 * Returns:
 *   { ok, synced: [...], errors: [...], total, updated }
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { competitorId } = (await req.json().catch(() => ({}))) as { competitorId?: string };

  // Build the where clause — single competitor, or all "tracking" competitors.
  // Always AND with the tenant scope so a tenant user can only sync their own
  // competitors (super-admins bypass via empty tenantWhere).
  const baseWhere = competitorId ? { id: competitorId } : { status: "tracking" as const };
  const where = { ...baseWhere, ...tenantWhere(scope) as { customerId?: string } };
  const competitors = await db.competitor.findMany({ where });

  if (competitors.length === 0) {
    return NextResponse.json({
      ok: true,
      synced: [],
      errors: competitorId
        ? [`No competitor found with id "${competitorId}"`]
        : ["No competitors with status=tracking found"],
      total: 0,
      updated: 0,
    });
  }

  const synced: {
    name: string;
    platform: string;
    followers: number;
    snapshots: number;
  }[] = [];
  const errors: string[] = [];

  for (const competitor of competitors) {
    const label = `Competitor ${competitor.name}`;
    try {
      const platform = normalizePlatform(competitor.platform);
      const handle = cleanHandle(competitor.handle);

      // Resolve a connected PlatformCredential for this platform.
      // Prefer the authenticated user's credentials; fall back to any.
      let cred = await db.platformCredential.findFirst({
        where: { userId: user!.userId, platform, connected: true },
      });
      if (!cred) {
        cred = await db.platformCredential.findFirst({
          where: { platform, connected: true },
        });
      }

      if (!cred || !hasUsableToken(cred)) {
        errors.push(
          `${label}: no API credentials for platform ${competitor.platform}`
        );
        continue;
      }

      // Fetch REAL stats from the platform API
      const stats = await fetchPlatformStats(platform, handle, cred);

      if (!stats) {
        errors.push(
          `${label}: failed to fetch data from ${competitor.platform}`
        );
        continue;
      }

      // Update the Competitor record with real values
      const updated = await db.competitor.update({
        where: { id: competitor.id },
        data: {
          followers: stats.followers,
          engagementRate: stats.engagementRate,
          postingFreq: stats.postingFreq,
        },
      });

      // Create a CompetitorSnapshot for this sync point
      await db.competitorSnapshot.create({
        data: {
          competitorId: competitor.id,
          date: new Date(),
          followers: stats.followers,
          engagement: stats.engagementRate,
          posts: stats.posts,
        },
      });

      synced.push({
        name: updated.name,
        platform: updated.platform,
        followers: updated.followers,
        snapshots: 1,
      });
    } catch (err) {
      errors.push(
        `${label}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return NextResponse.json({
    ok: true,
    synced,
    errors,
    total: competitors.length,
    updated: synced.length,
  });
}

// ============================================================================
// Helpers
// ============================================================================

interface PlatformStats {
  followers: number;
  engagementRate: number; // percentage (0–100)
  posts: number;
  postingFreq: number; // posts in last 7 days
}

interface CredentialLike {
  accessToken?: string | null;
  bearerToken?: string | null;
  oauth2UserToken?: string | null;
  pageId?: string | null;
  profileId?: string | null;
}

/** Normalize platform names so "x" and "twitter" map to the same value. */
function normalizePlatform(p: string): string {
  const lower = (p ?? "").toLowerCase().trim();
  if (lower === "x" || lower === "twitter") return "twitter";
  return lower;
}

/** Strip leading @ and whitespace from a social handle. */
function cleanHandle(h: string): string {
  return (h ?? "").replace(/^@+/, "").trim();
}

/** Check whether the credential has at least one usable token. */
function hasUsableToken(cred: CredentialLike): boolean {
  return Boolean(
    cred.accessToken || cred.bearerToken || cred.oauth2UserToken
  );
}

/** Compute (avg engagement / followers) * 100 — clamped to >= 0. */
function computeEngagementRate(totalEngagement: number, postCount: number, followers: number): number {
  if (postCount <= 0 || followers <= 0) return 0;
  const avg = totalEngagement / postCount;
  return Math.max(0, (avg / followers) * 100);
}

/** Count items in the last 7 days from ISO timestamps. */
function countRecent(items: { timestamp?: string }[]): number {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return items.filter((it) => {
    if (!it.timestamp) return false;
    return new Date(it.timestamp).getTime() >= weekAgo;
  }).length;
}

// ============================================================================
// Platform-specific stats fetchers
// ============================================================================

async function fetchPlatformStats(
  platform: string,
  handle: string,
  cred: CredentialLike
): Promise<PlatformStats | null> {
  switch (platform) {
    case "twitter":
      return fetchTwitterStats(handle, cred);
    case "instagram":
      return fetchInstagramStats(handle, cred);
    case "facebook":
      return fetchFacebookStats(handle, cred);
    case "linkedin":
      return fetchLinkedInStats(handle, cred);
    default:
      console.warn(`[competitors/sync] Unsupported platform: ${platform}`);
      return null;
  }
}

/**
 * Fetch real follower / engagement / post counts from Twitter API v2.
 * GET https://api.twitter.com/2/users/by/username/{handle}
 *   → data.public_metrics.{followers_count, following_count, tweet_count}
 * Then fetch the user's recent tweets (max 20) to compute engagement rate
 * (avg of like+reply+retweet+quote per tweet, divided by followers).
 */
async function fetchTwitterStats(
  handle: string,
  cred: CredentialLike
): Promise<PlatformStats | null> {
  // Prefer the OAuth 2.0 user-context token, then OAuth 1.0a access token,
  // then the app-only Bearer token.
  const token = cred.oauth2UserToken ?? cred.accessToken ?? cred.bearerToken;
  if (!token || !handle) return null;

  try {
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!userRes.ok) {
      console.warn(
        `[competitors/sync] Twitter @${handle}: user fetch failed (${userRes.status})`
      );
      return null;
    }
    const userJson = await userRes.json();
    const data = userJson?.data;
    if (!data) return null;

    const metrics = data.public_metrics ?? {};
    const followers = metrics.followers_count ?? 0;
    const tweetCount = metrics.tweet_count ?? 0;
    const twitterUserId = data.id;

    // Try to fetch recent tweets for engagement rate + posting frequency.
    // Failures here are non-fatal — we still return the follower/tweet counts.
    let engagementRate = 0;
    let postingFreq = 0;
    try {
      if (twitterUserId) {
        const tweetsRes = await fetch(
          `https://api.twitter.com/2/users/${twitterUserId}/tweets?` +
            new URLSearchParams({
              max_results: "20",
              "tweet.fields": "public_metrics,created_at",
              exclude: "retweets",
            }).toString(),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (tweetsRes.ok) {
          const tweetsJson = await tweetsRes.json();
          const tweets: any[] = tweetsJson.data ?? [];
          if (tweets.length > 0) {
            const totalEng = tweets.reduce((sum, t) => {
              const m = t.public_metrics ?? {};
              return (
                sum +
                (m.like_count ?? 0) +
                (m.reply_count ?? 0) +
                (m.retweet_count ?? 0) +
                (m.quote_count ?? 0)
              );
            }, 0);
            engagementRate = computeEngagementRate(totalEng, tweets.length, followers);
            postingFreq = countRecent(
              tweets.map((t) => ({ timestamp: t.created_at }))
            );
          }
        }
      }
    } catch (engErr) {
      console.warn(
        `[competitors/sync] Twitter @${handle}: engagement fetch failed:`,
        engErr instanceof Error ? engErr.message : String(engErr)
      );
    }

    return {
      followers,
      engagementRate,
      posts: tweetCount,
      postingFreq,
    };
  } catch (err) {
    console.error(
      `[competitors/sync] Twitter @${handle} error:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Fetch real follower / media / engagement counts from the Instagram Graph API.
 * GET https://graph.facebook.com/v19.0/{ig_business_id}
 *     ?fields=followers_count,media_count&access_token={token}
 *
 * The IG Business ID is stored on PlatformCredential.pageId. Engagement rate is
 * computed from the most recent ~20 media items' like_count + comments_count.
 */
async function fetchInstagramStats(
  handle: string,
  cred: CredentialLike
): Promise<PlatformStats | null> {
  const token = cred.accessToken;
  const igBusinessId = cred.pageId;
  if (!token || !igBusinessId) return null;

  try {
    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/${igBusinessId}?` +
        new URLSearchParams({
          fields: "followers_count,media_count",
          access_token: token,
        }).toString()
    );
    if (!profileRes.ok) {
      console.warn(
        `[competitors/sync] Instagram @${handle}: profile fetch failed (${profileRes.status})`
      );
      return null;
    }
    const profileJson = await profileRes.json();
    const followers = profileJson.followers_count ?? 0;
    const mediaCount = profileJson.media_count ?? 0;

    // Fetch recent media for engagement + posting frequency.
    let engagementRate = 0;
    let postingFreq = 0;
    try {
      const mediaRes = await fetch(
        `https://graph.facebook.com/v19.0/${igBusinessId}/media?` +
          new URLSearchParams({
            fields: "id,like_count,comments_count,timestamp",
            limit: "20",
            access_token: token,
          }).toString()
      );
      if (mediaRes.ok) {
        const mediaJson = await mediaRes.json();
        const media: any[] = mediaJson.data ?? [];
        if (media.length > 0) {
          const totalEng = media.reduce((sum, m) => {
            return sum + (m.like_count ?? 0) + (m.comments_count ?? 0);
          }, 0);
          engagementRate = computeEngagementRate(totalEng, media.length, followers);
          postingFreq = countRecent(
            media.map((m) => ({ timestamp: m.timestamp }))
          );
        }
      }
    } catch (engErr) {
      console.warn(
        `[competitors/sync] Instagram @${handle}: engagement fetch failed:`,
        engErr instanceof Error ? engErr.message : String(engErr)
      );
    }

    return {
      followers,
      engagementRate,
      posts: mediaCount,
      postingFreq,
    };
  } catch (err) {
    console.error(
      `[competitors/sync] Instagram @${handle} error:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Fetch real fan_count + post engagement from the Facebook Graph API.
 * GET https://graph.facebook.com/v19.0/{page_id}
 *     ?fields=fan_count,posts.limit(20){created_time,likes.summary(true),comments.summary(true)}
 *     &access_token={token}
 *
 * Engagement rate is computed from avg (likes + comments) per post divided by
 * the page's fan_count.
 */
async function fetchFacebookStats(
  handle: string,
  cred: CredentialLike
): Promise<PlatformStats | null> {
  const token = cred.accessToken;
  const pageId = cred.pageId;
  if (!token || !pageId) return null;

  try {
    const pageRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}?` +
        new URLSearchParams({
          fields:
            "fan_count,posts.limit(20){created_time,likes.limit(1).summary(true),comments.limit(1).summary(true)}",
          access_token: token,
        }).toString()
    );
    if (!pageRes.ok) {
      console.warn(
        `[competitors/sync] Facebook @${handle}: page fetch failed (${pageRes.status})`
      );
      return null;
    }
    const pageJson = await pageRes.json();
    const followers = pageJson.fan_count ?? 0;
    const posts: any[] = pageJson.posts?.data ?? [];

    let engagementRate = 0;
    if (posts.length > 0) {
      const totalEng = posts.reduce((sum, p) => {
        const likes = p.likes?.summary?.total_count ?? 0;
        const comments = p.comments?.summary?.total_count ?? 0;
        return sum + likes + comments;
      }, 0);
      engagementRate = computeEngagementRate(totalEng, posts.length, followers);
    }

    const postingFreq = countRecent(
      posts.map((p) => ({ timestamp: p.created_time }))
    );

    return {
      followers,
      engagementRate,
      posts: posts.length,
      postingFreq,
    };
  } catch (err) {
    console.error(
      `[competitors/sync] Facebook @${handle} error:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Fetch real followerCount from the LinkedIn Organizations API.
 * GET https://api.linkedin.com/v2/organizations/{id}?fields=followerCount
 *
 * NOTE: LinkedIn v2 only exposes the follower count for organizations you
 * manage. Post counts / engagement require the Marketing API and an
 * organization URN — limited by available scopes. We return zeros for those
 * when the call cannot be completed.
 */
async function fetchLinkedInStats(
  handle: string,
  cred: CredentialLike
): Promise<PlatformStats | null> {
  const token = cred.accessToken;
  // profileId stores a LinkedIn URN — for org sync we use it as the org ID.
  const orgId = cred.profileId;
  if (!token || !orgId) return null;

  try {
    const orgRes = await fetch(
      `https://api.linkedin.com/v2/organizations/${orgId}?fields=followerCount`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );
    if (!orgRes.ok) {
      console.warn(
        `[competitors/sync] LinkedIn @${handle}: org fetch failed (${orgRes.status})`
      );
      return null;
    }
    const orgJson = await orgRes.json();
    const followers = orgJson.followerCount ?? 0;

    // LinkedIn v2 doesn't expose post count via this endpoint without the
    // Marketing API + an organization URN — leave as zero for now.
    return {
      followers,
      engagementRate: 0,
      posts: 0,
      postingFreq: 0,
    };
  } catch (err) {
    console.error(
      `[competitors/sync] LinkedIn @${handle} error:`,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}
