import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { decryptPlatformCredential } from "@/lib/platform-credential-crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Batch sync across competitors can be slow

/**
 * POST /api/competitors/sync
 *
 * Fetches REAL follower counts, engagement rates, posting frequency, AND
 * recent posts for tracked competitors from the underlying social platform
 * APIs. Stores posts as CompetitorPost rows for the deep-analysis endpoint.
 *
 * Body: { competitorId?: string }
 *   - If competitorId is provided, sync only that competitor
 *   - If omitted, sync ALL competitors with status="tracking"
 *
 * For each competitor:
 *   1. Resolve a connected PlatformCredential for the competitor's platform.
 *   2. Call the platform's public metrics API to refresh follower count,
 *      engagement rate, and posting frequency. Update the Competitor record
 *      + create a CompetitorSnapshot for the day.
 *   3. Fetch the competitor's ~20 most-recent posts (text + engagement +
 *      timestamp). Upsert them as CompetitorPost rows keyed on
 *      `(competitorId, externalId)`. (Posts already stored are skipped
 *      via upsert's `update: {}` no-op.)
 *
 * Returns:
 *   { ok, synced: [...], errors: [...], total, updated, postsStored }
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
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
      postsStored: 0,
    });
  }

  const synced: {
    name: string;
    platform: string;
    followers: number;
    snapshots: number;
    postsStored: number;
  }[] = [];
  const errors: string[] = [];
  let totalPostsStored = 0;

  for (const competitor of competitors) {
    const label = `Competitor ${competitor.name}`;
    try {
      const platform = normalizePlatform(competitor.platform);
      const handle = cleanHandle(competitor.handle);

      // Resolve a connected PlatformCredential for this platform.
      let credRow = await db.platformCredential.findFirst({
        where: { userId: user!.userId, platform, connected: true },
      });
      if (!credRow) {
        credRow = await db.platformCredential.findFirst({
          where: { platform, connected: true },
        });
      }
      const cred = credRow ? decryptPlatformCredential(credRow) : null;

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

      // === Fetch + store recent posts for deep analysis ===
      // Best-effort — failures here don't fail the sync.
      let postsStored = 0;
      try {
        const posts = await fetchPlatformPosts(platform, handle, cred);
        if (posts.length > 0) {
          for (const p of posts) {
            try {
              // Upsert keyed on (competitorId, externalId) so re-syncing
              // the same post doesn't create duplicates. We update the
              // engagement metrics on every sync (in case they grew since
              // last fetch) but leave the sentiment/topics fields alone
              // — they're written by the /analyze endpoint.
              await db.competitorPost.upsert({
                where: {
                  competitorId_externalId: {
                    competitorId: competitor.id,
                    externalId: p.externalId,
                  },
                },
                create: {
                  competitorId: competitor.id,
                  externalId: p.externalId,
                  text: p.text.slice(0, 4000),
                  mediaUrl: p.mediaUrl ?? null,
                  likes: p.likes,
                  comments: p.comments,
                  shares: p.shares,
                  reach: p.reach,
                  postedAt: new Date(p.postedAt),
                },
                update: {
                  // Refresh engagement metrics on every sync.
                  likes: p.likes,
                  comments: p.comments,
                  shares: p.shares,
                  reach: p.reach,
                  syncedAt: new Date(),
                },
              });
              postsStored++;
            } catch (e) {
              // Skip this post if upsert fails (bad data, etc.) — best-effort.
              console.warn(
                `[competitors/sync] upsert post ${p.externalId} failed:`,
                e instanceof Error ? e.message : String(e),
              );
            }
          }
          totalPostsStored += postsStored;
        }
      } catch (e) {
        console.warn(
          `[competitors/sync] post fetch failed for ${competitor.name}:`,
          e instanceof Error ? e.message : String(e),
        );
      }

      synced.push({
        name: updated.name,
        platform: updated.platform,
        followers: updated.followers,
        snapshots: 1,
        postsStored,
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
    postsStored: totalPostsStored,
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

export interface FetchedPost {
  externalId: string;
  text: string;
  mediaUrl?: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  postedAt: string; // ISO timestamp
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
 */
async function fetchTwitterStats(
  handle: string,
  cred: CredentialLike
): Promise<PlatformStats | null> {
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
 */
async function fetchLinkedInStats(
  handle: string,
  cred: CredentialLike
): Promise<PlatformStats | null> {
  const token = cred.accessToken;
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

// ============================================================================
// Platform-specific POST fetchers (for deep analysis storage)
// ============================================================================

async function fetchPlatformPosts(
  platform: string,
  handle: string,
  cred: CredentialLike
): Promise<FetchedPost[]> {
  switch (platform) {
    case "twitter":
      return fetchTwitterPosts(handle, cred);
    case "instagram":
      return fetchInstagramPosts(handle, cred);
    case "facebook":
      return fetchFacebookPosts(handle, cred);
    case "linkedin":
      return []; // LinkedIn v2 doesn't expose post text via this endpoint.
    default:
      return [];
  }
}

/**
 * Fetch recent tweets (text + engagement) for a competitor from Twitter API v2.
 */
async function fetchTwitterPosts(
  handle: string,
  cred: CredentialLike
): Promise<FetchedPost[]> {
  const token = cred.oauth2UserToken ?? cred.accessToken ?? cred.bearerToken;
  if (!token || !handle) return [];

  try {
    // Resolve the user ID first
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!userRes.ok) return [];
    const userJson = await userRes.json();
    const userId = userJson?.data?.id;
    if (!userId) return [];

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?` +
        new URLSearchParams({
          max_results: "20",
          "tweet.fields": "public_metrics,created_at",
          exclude: "retweets",
        }).toString(),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!tweetsRes.ok) return [];

    const tweetsJson = await tweetsRes.json();
    const tweets: any[] = tweetsJson.data ?? [];
    return tweets.map((t) => {
      const m = t.public_metrics ?? {};
      return {
        externalId: t.id,
        text: t.text ?? "",
        likes: m.like_count ?? 0,
        comments: m.reply_count ?? 0,
        shares: (m.retweet_count ?? 0) + (m.quote_count ?? 0),
        reach: 0, // Twitter v2 doesn't expose impression count without a paid tier
        postedAt: t.created_at,
      };
    });
  } catch (err) {
    console.warn(
      `[competitors/sync] Twitter posts fetch failed:`,
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}

/**
 * Fetch recent media (text + engagement) for a competitor from the IG Graph API.
 */
async function fetchInstagramPosts(
  handle: string,
  cred: CredentialLike
): Promise<FetchedPost[]> {
  const token = cred.accessToken;
  const igBusinessId = cred.pageId;
  if (!token || !igBusinessId) return [];

  try {
    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${igBusinessId}/media?` +
        new URLSearchParams({
          fields: "id,caption,like_count,comments_count,timestamp,media_url,permalink",
          limit: "20",
          access_token: token,
        }).toString()
    );
    if (!mediaRes.ok) return [];

    const mediaJson = await mediaRes.json();
    const media: any[] = mediaJson.data ?? [];
    return media.map((m) => ({
      externalId: m.id,
      text: m.caption ?? "",
      mediaUrl: m.media_url ?? m.permalink ?? null,
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      shares: 0,
      reach: 0,
      postedAt: m.timestamp,
    }));
  } catch (err) {
    console.warn(
      `[competitors/sync] Instagram posts fetch failed:`,
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}

/**
 * Fetch recent posts (text + engagement) for a competitor from the FB Graph API.
 */
async function fetchFacebookPosts(
  handle: string,
  cred: CredentialLike
): Promise<FetchedPost[]> {
  const token = cred.accessToken;
  const pageId = cred.pageId;
  if (!token || !pageId) return [];

  try {
    const postsRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/posts?` +
        new URLSearchParams({
          fields:
            "id,message,created_time,likes.limit(1).summary(true),comments.limit(1).summary(true),permalink",
          limit: "20",
          access_token: token,
        }).toString()
    );
    if (!postsRes.ok) return [];

    const postsJson = await postsRes.json();
    const posts: any[] = postsJson.data ?? [];
    return posts.map((p) => ({
      externalId: p.id,
      text: p.message ?? "",
      mediaUrl: p.permalink ?? null,
      likes: p.likes?.summary?.total_count ?? 0,
      comments: p.comments?.summary?.total_count ?? 0,
      shares: 0,
      reach: 0,
      postedAt: p.created_time,
    }));
  } catch (err) {
    console.warn(
      `[competitors/sync] Facebook posts fetch failed:`,
      err instanceof Error ? err.message : String(err)
    );
    return [];
  }
}
