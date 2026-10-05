/**
 * Per-platform "import existing posts" syncers.
 *
 * Each function takes a connected `Account` row (with its decrypted
 * `PlatformCredential`) and pulls the user's REAL historical posts/videos
 * from the platform's API, then upserts them into SYNQUE as Post +
 * PostVariant records (status="published", with real publishedAt +
 * metrics backfilled).
 *
 * Dedup strategy: a PostVariant is considered to be the SAME imported
 * post if it already exists with the same `accountId` + `content`
 * (text). Existing variants get their metrics (likes, comments, shares,
 * reach, impressions) refreshed; new ones get a fresh Post + PostVariant.
 *
 * Every function returns a `SyncResult` — `error` is populated on
 * per-account failure (e.g. token expired, API 4xx) WITHOUT throwing,
 * so the caller can continue syncing the rest of the user's accounts.
 */

import { db } from "@/lib/db";
import {
  decryptPlatformCredential,
  type PlatformCredentialRow,
} from "@/lib/platform-credential-crypto";

/** Decrypted credential row — has all sensitive fields (oauth2UserToken,
 *  profileId, accessToken, …) as plaintext. Always non-null at the
 *  per-platform syncer boundary; the dispatcher (`syncAccount`) handles
 *  the null case before delegating. */
type DecryptedCred = PlatformCredentialRow;

export interface SyncResult {
  accountId: string;
  platform: string;
  accountName: string;
  synced: number; // newly created posts
  updated: number; // existing posts whose metrics were refreshed
  total: number; // total posts the platform returned
  error?: string;
}

/** Minimal account shape used by syncers (avoids importing the full
 *  Prisma type into the call sites of this lib). */
export interface SyncAccount {
  id: string;
  platform: string;
  handle: string;
  displayName: string;
  ownerId: string;
  customerId: string | null;
  followers: number;
  postsCount: number;
}

/** Internal helper — upsert a single imported post for an account.
 *  Returns "created" | "updated" | "skipped". */
async function upsertImportedPost(args: {
  accountId: string;
  ownerId: string;
  content: string;
  title?: string;
  mediaUrl?: string | null;
  mediaType?: string;
  publishedAt: Date;
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  impressions?: number;
}): Promise<"created" | "updated"> {
  const {
    accountId,
    ownerId,
    content,
    title,
    mediaUrl,
    mediaType,
    publishedAt,
    likes = 0,
    comments = 0,
    shares = 0,
    reach = 0,
    impressions = 0,
  } = args;

  const safeContent = content || "";
  const safeTitle = (title ?? safeContent.slice(0, 60).trim()) || "Imported post";

  // Dedup: same account + same content = same imported post.
  const existingVariant = await db.postVariant.findFirst({
    where: { accountId, content: safeContent },
    include: { post: true },
  });

  if (existingVariant) {
    await db.postVariant.update({
      where: { id: existingVariant.id },
      data: {
        likes,
        comments,
        shares,
        reach,
        impressions,
        status: "published",
        publishedAt: existingVariant.publishedAt ?? publishedAt,
      },
    });
    return "updated";
  }

  await db.post.create({
    data: {
      title: safeTitle,
      caption: safeContent,
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? "none",
      tone: "professional",
      status: "published",
      authorId: ownerId,
      createdAt: publishedAt,
      variants: {
        create: {
          accountId,
          content: safeContent,
          status: "published",
          publishedAt,
          createdAt: publishedAt,
          likes,
          comments,
          shares,
          reach,
          impressions,
        },
      },
    },
  });

  // Log activity (best-effort — never fail the sync over an audit row).
  await db.activity
    .create({
      data: {
        userId: ownerId,
        type: "post_published",
        description: `imported a ${mediaType ?? "post"} from social platform: "${safeTitle.slice(0, 60)}…"`,
      },
    })
    .catch(() => void 0);

  return "created";
}

/** Decrypt the platform credential for an account, looking up by
 *  `userId + platform`. Tries the platform name as-is, then falls back
 *  to common aliases (x → twitter). Returns null if no connected cred
 *  with an `oauth2UserToken` is found. */
export async function getCredForAccount(account: SyncAccount): Promise<DecryptedCred> {
  const candidates = unique([account.platform, aliasFor(account.platform)]);
  for (const p of candidates) {
    const row = await db.platformCredential
      .findFirst({ where: { userId: account.ownerId, platform: p } })
      .catch(() => null);
    if (row) {
      const dec = decryptPlatformCredential(row as unknown as PlatformCredentialRow);
      if (dec?.oauth2UserToken) return dec;
    }
  }
  return null;
}

function aliasFor(platform: string): string {
  switch (platform) {
    case "x":
    case "twitter":
      return "twitter";
    case "youtube":
      return "youtube";
    case "instagram":
      return "instagram";
    case "facebook":
      return "facebook";
    case "linkedin":
      return "linkedin";
    case "tiktok":
      return "tiktok";
    default:
      return platform;
  }
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

/* ============================================================================
 * X / Twitter
 * --------------------------------------------------------------------------
 * Two-step flow (mirrors the existing /api/sync/twitter route):
 *   1. Resolve the user's Twitter numeric ID via /users/by/username/{handle}
 *      (the tweets endpoint requires a numeric ID).
 *   2. Fetch up to 100 most-recent original tweets (excluding retweets +
 *      replies) with public_metrics + created_at.
 * ========================================================================== */

export async function syncTwitterPosts(account: SyncAccount, cred: DecryptedCred): Promise<SyncResult> {
  const base: SyncResult = {
    accountId: account.id,
    platform: "x",
    accountName: account.displayName,
    synced: 0,
    updated: 0,
    total: 0,
  };

  const token = cred.oauth2UserToken;
  if (!token) return { ...base, error: "No OAuth 2.0 user token for this X account." };

  try {
    const handle = account.handle.replace("@", "");

    const userRes = await fetch(`https://api.twitter.com/2/users/by/username/${handle}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) {
      const err = await userRes.json().catch(() => ({}));
      return { ...base, error: `Twitter user lookup failed: ${err?.detail ?? err?.title ?? `HTTP ${userRes.status}`}` };
    }
    const twitterUserId = (await userRes.json()).data?.id;
    if (!twitterUserId) return { ...base, error: `Could not resolve Twitter user ID for @${handle}` };

    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${twitterUserId}/tweets?` +
        new URLSearchParams({
          max_results: "100",
          "tweet.fields": "created_at,public_metrics,text,attachments",
          exclude: "retweets,replies",
        }).toString(),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!tweetsRes.ok) {
      const err = await tweetsRes.json().catch(() => ({}));
      return { ...base, error: `Twitter tweets fetch failed: ${err?.detail ?? err?.title ?? `HTTP ${tweetsRes.status}`}` };
    }

    const tweets = (await tweetsRes.json()).data ?? [];
    base.total = tweets.length;

    for (const tweet of tweets) {
      const text = tweet.text ?? "";
      const date = new Date(tweet.created_at);
      const m = tweet.public_metrics ?? {};
      const hasMedia = Array.isArray(tweet.attachments?.media_keys) && tweet.attachments.media_keys.length > 0;
      const op = await upsertImportedPost({
        accountId: account.id,
        ownerId: account.ownerId,
        content: text,
        title: text.slice(0, 50).trim() || "Imported Tweet",
        mediaType: hasMedia ? "image" : "none",
        publishedAt: date,
        likes: m.like_count ?? 0,
        comments: m.reply_count ?? 0,
        shares: m.retweet_count ?? 0,
        reach: m.impression_count ?? 0,
        impressions: m.impression_count ?? 0,
      });
      if (op === "created") base.synced++;
      else base.updated++;
    }

    // Refresh account-level follower + tweet counts.
    const umRes = await fetch(
      `https://api.twitter.com/2/users/${twitterUserId}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (umRes.ok) {
      const um = (await umRes.json()).data?.public_metrics;
      if (um) {
        await db.account.update({
          where: { id: account.id },
          data: {
            followers: um.followers_count ?? account.followers,
            postsCount: um.tweet_count ?? account.postsCount,
          },
        });
      }
    }

    return base;
  } catch (err: unknown) {
    return { ...base, error: err instanceof Error ? err.message : "Twitter sync error" };
  }
}

/* ============================================================================
 * YouTube
 * --------------------------------------------------------------------------
 * Two-step flow:
 *   1. /search?forMine=true&type=video → list of the channel's recent videos
 *      (returns snippet: title, description, thumbnails, publishedAt).
 *   2. /videos?part=statistics&id=… → view_count, like_count, comment_count.
 * ========================================================================== */

export async function syncYouTubePosts(account: SyncAccount, cred: DecryptedCred): Promise<SyncResult> {
  const base: SyncResult = {
    accountId: account.id,
    platform: "youtube",
    accountName: account.displayName,
    synced: 0,
    updated: 0,
    total: 0,
  };

  const token = cred.oauth2UserToken;
  if (!token) return { ...base, error: "No OAuth 2.0 user token for this YouTube account." };

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
        new URLSearchParams({
          part: "snippet",
          forMine: "true",
          type: "video",
          maxResults: "50",
        }).toString(),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      return { ...base, error: `YouTube search failed: ${err?.error?.message ?? `HTTP ${searchRes.status}`}` };
    }

    const searchJson = await searchRes.json();
    const items: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
      };
    }> = searchJson.items ?? [];

    base.total = items.length;
    if (items.length === 0) return base;

    // Stats lookup — single batched call with comma-joined video IDs.
    const ids = items.map((i) => i.id?.videoId).filter(Boolean).join(",");
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
        new URLSearchParams({ part: "statistics", id: ids }).toString(),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const statsJson = statsRes.ok ? await statsRes.json() : { items: [] };
    const statsById = new Map<string, { viewCount?: number; likeCount?: number; commentCount?: number; shareCount?: number }>();
    for (const s of statsJson.items ?? []) {
      statsById.set(s.id, s.statistics ?? {});
    }

    for (const item of items) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;
      const snip = item.snippet ?? {};
      const title = snip.title ?? "Imported YouTube video";
      const description = snip.description ?? "";
      const date = snip.publishedAt ? new Date(snip.publishedAt) : new Date();
      const thumb = snip.thumbnails?.high?.url ?? snip.thumbnails?.medium?.url ?? snip.thumbnails?.default?.url ?? null;
      const stats = statsById.get(videoId) ?? {};

      const op = await upsertImportedPost({
        accountId: account.id,
        ownerId: account.ownerId,
        content: description || title,
        title,
        mediaUrl: thumb,
        mediaType: "video",
        publishedAt: date,
        likes: stats.likeCount ?? 0,
        comments: stats.commentCount ?? 0,
        shares: stats.shareCount ?? 0,
        reach: stats.viewCount ?? 0,
        impressions: stats.viewCount ?? 0,
      });
      if (op === "created") base.synced++;
      else base.updated++;
    }

    // Refresh account-level video count from search result (best-effort).
    await db.account.update({
      where: { id: account.id },
      data: { postsCount: items.length },
    }).catch(() => void 0);

    return base;
  } catch (err: unknown) {
    return { ...base, error: err instanceof Error ? err.message : "YouTube sync error" };
  }
}

/* ============================================================================
 * Instagram (Business account via Graph API)
 * --------------------------------------------------------------------------
 * Single call to /me/media returns up to 50 recent media with like_count,
 * comments_count, permalink, timestamp, media_url, thumbnail_url.
 * ========================================================================== */

export async function syncInstagramPosts(account: SyncAccount, cred: DecryptedCred): Promise<SyncResult> {
  const base: SyncResult = {
    accountId: account.id,
    platform: "instagram",
    accountName: account.displayName,
    synced: 0,
    updated: 0,
    total: 0,
  };

  const token = cred.oauth2UserToken;
  if (!token) return { ...base, error: "No OAuth 2.0 user token for this Instagram account." };

  try {
    const url =
      `https://graph.facebook.com/v19.0/me/media?` +
      new URLSearchParams({
        fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
        limit: "50",
      }).toString();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `Instagram media fetch failed: ${err?.error?.message ?? `HTTP ${res.status}`}` };
    }
    const media: Array<{
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    }> = (await res.json()).data ?? [];

    base.total = media.length;

    for (const m of media) {
      const content = m.caption ?? "";
      const date = m.timestamp ? new Date(m.timestamp) : new Date();
      const isVideo = m.media_type === "VIDEO" || m.media_type === "REEL";
      const mediaUrl = m.thumbnail_url ?? m.media_url ?? null;
      const op = await upsertImportedPost({
        accountId: account.id,
        ownerId: account.ownerId,
        content,
        title: content.slice(0, 60).trim() || "Imported Instagram post",
        mediaUrl,
        mediaType: isVideo ? "video" : "image",
        publishedAt: date,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
      });
      if (op === "created") base.synced++;
      else base.updated++;
    }

    return base;
  } catch (err: unknown) {
    return { ...base, error: err instanceof Error ? err.message : "Instagram sync error" };
  }
}

/* ============================================================================
 * Facebook (Page posts via Graph API)
 * --------------------------------------------------------------------------
 * /me/posts returns up to 50 page posts with message, created_time,
 * permalink_url, likes.summary(true), comments.summary(true), shares.
 * ========================================================================== */

export async function syncFacebookPosts(account: SyncAccount, cred: DecryptedCred): Promise<SyncResult> {
  const base: SyncResult = {
    accountId: account.id,
    platform: "facebook",
    accountName: account.displayName,
    synced: 0,
    updated: 0,
    total: 0,
  };

  const token = cred.oauth2UserToken;
  if (!token) return { ...base, error: "No OAuth 2.0 user token for this Facebook account." };

  try {
    const url =
      `https://graph.facebook.com/v19.0/me/posts?` +
      new URLSearchParams({
        fields: "message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares",
        limit: "50",
      }).toString();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `Facebook posts fetch failed: ${err?.error?.message ?? `HTTP ${res.status}`}` };
    }

    const posts: Array<{
      id: string;
      message?: string;
      created_time?: string;
      permalink_url?: string;
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    }> = (await res.json()).data ?? [];

    base.total = posts.length;

    for (const p of posts) {
      const content = p.message ?? "";
      const date = p.created_time ? new Date(p.created_time) : new Date();
      const op = await upsertImportedPost({
        accountId: account.id,
        ownerId: account.ownerId,
        content,
        title: content.slice(0, 60).trim() || "Imported Facebook post",
        mediaUrl: p.permalink_url ?? null,
        mediaType: "none",
        publishedAt: date,
        likes: p.likes?.summary?.total_count ?? 0,
        comments: p.comments?.summary?.total_count ?? 0,
        shares: p.shares?.count ?? 0,
      });
      if (op === "created") base.synced++;
      else base.updated++;
    }

    return base;
  } catch (err: unknown) {
    return { ...base, error: err instanceof Error ? err.message : "Facebook sync error" };
  }
}

/* ============================================================================
 * LinkedIn (Shares via /v2/shares)
 * --------------------------------------------------------------------------
 * /v2/shares?q=owners&owners=urn:li:person:{personId} returns up to 50
 * shares with text.content, shareThumbnail, totalShareCount, etc.
 * ========================================================================== */

export async function syncLinkedInPosts(account: SyncAccount, cred: DecryptedCred): Promise<SyncResult> {
  const base: SyncResult = {
    accountId: account.id,
    platform: "linkedin",
    accountName: account.displayName,
    synced: 0,
    updated: 0,
    total: 0,
  };

  const token = cred.oauth2UserToken;
  if (!token) return { ...base, error: "No OAuth 2.0 user token for this LinkedIn account." };

  // personId is stored on the cred row (LinkedIn URN: urn:li:person:XXX).
  // Strip the urn prefix so we can rebuild it in the format the API expects.
  const rawPersonId = (cred as { profileId?: string }).profileId ?? "";
  const personId = rawPersonId.replace(/^urn:li:person:/, "").trim();

  if (!personId) {
    return { ...base, error: "LinkedIn profileId is missing on the credential row. Reconnect LinkedIn to backfill." };
  }

  try {
    const url =
      `https://api.linkedin.com/v2/shares?` +
      new URLSearchParams({
        q: "owners",
        owners: `urn:li:person:${personId}`,
        count: "50",
      }).toString();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `LinkedIn shares fetch failed: ${err?.message ?? `HTTP ${res.status}`}` };
    }

    const json = await res.json();
    const shares: Array<{
      text?: { text?: string };
      content?: { contentTitle?: string; description?: string; thumbnailUrl?: string };
      created?: { time?: number }; // ms epoch
      totalShareCount?: number;
      numComments?: number;
      numLikes?: number;
    }> = json?.elements ?? [];

    base.total = shares.length;

    for (const s of shares) {
      const text = s.text?.text ?? s.content?.description ?? "";
      const title = s.content?.contentTitle ?? text.slice(0, 60).trim() ?? "Imported LinkedIn share";
      const date = s.created?.time ? new Date(s.created.time) : new Date();
      const op = await upsertImportedPost({
        accountId: account.id,
        ownerId: account.ownerId,
        content: text || title,
        title,
        mediaUrl: s.content?.thumbnailUrl ?? null,
        mediaType: s.content?.thumbnailUrl ? "image" : "none",
        publishedAt: date,
        likes: s.numLikes ?? 0,
        comments: s.numComments ?? 0,
        shares: s.totalShareCount ?? 0,
      });
      if (op === "created") base.synced++;
      else base.updated++;
    }

    return base;
  } catch (err: unknown) {
    return { ...base, error: err instanceof Error ? err.message : "LinkedIn sync error" };
  }
}

/* ============================================================================
 * TikTok (Video list via /v2/video/list/)
 * --------------------------------------------------------------------------
 * POST request (note: video list is a POST, not GET, per TikTok API v2)
 * with a JSON body { max_count: 50 } and the user access_token in the
 * Authorization header. Returns cover_image_url, create_time (unix sec),
 * view_count, like_count, comment_count, share_count, title.
 * ========================================================================== */

export async function syncTikTokPosts(account: SyncAccount, cred: DecryptedCred): Promise<SyncResult> {
  const base: SyncResult = {
    accountId: account.id,
    platform: "tiktok",
    accountName: account.displayName,
    synced: 0,
    updated: 0,
    total: 0,
  };

  const token = cred.oauth2UserToken;
  if (!token) return { ...base, error: "No OAuth 2.0 user token for this TikTok account." };

  try {
    const res = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=cover_image_url,create_time,share_count,view_count,like_count,comment_count,title`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 50 }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ...base, error: `TikTok video list failed: ${err?.error?.message ?? err?.error?.code ?? `HTTP ${res.status}`}` };
    }

    const json = await res.json();
    const videos: Array<{
      cover_image_url?: string;
      create_time?: number; // unix seconds
      share_count?: number;
      view_count?: number;
      like_count?: number;
      comment_count?: number;
      title?: string;
      video_description?: string;
    }> = json?.data?.videos ?? [];

    base.total = videos.length;

    for (const v of videos) {
      const content = v.title ?? v.video_description ?? "";
      const date = v.create_time ? new Date(v.create_time * 1000) : new Date();
      const op = await upsertImportedPost({
        accountId: account.id,
        ownerId: account.ownerId,
        content,
        title: content.slice(0, 60).trim() || "Imported TikTok video",
        mediaUrl: v.cover_image_url ?? null,
        mediaType: "video",
        publishedAt: date,
        likes: v.like_count ?? 0,
        comments: v.comment_count ?? 0,
        shares: v.share_count ?? 0,
        reach: v.view_count ?? 0,
        impressions: v.view_count ?? 0,
      });
      if (op === "created") base.synced++;
      else base.updated++;
    }

    return base;
  } catch (err: unknown) {
    return { ...base, error: err instanceof Error ? err.message : "TikTok sync error" };
  }
}

/** Dispatch a single account to the right per-platform syncer. */
export async function syncAccount(account: SyncAccount, cred: DecryptedCred): Promise<SyncResult> {
  switch (account.platform) {
    case "x":
    case "twitter":
      return syncTwitterPosts(account, cred);
    case "youtube":
      return syncYouTubePosts(account, cred);
    case "instagram":
      return syncInstagramPosts(account, cred);
    case "facebook":
      return syncFacebookPosts(account, cred);
    case "linkedin":
      return syncLinkedInPosts(account, cred);
    case "tiktok":
      return syncTikTokPosts(account, cred);
    default:
      return {
        accountId: account.id,
        platform: account.platform,
        accountName: account.displayName,
        synced: 0,
        updated: 0,
        total: 0,
        error: `Post import sync is not implemented for platform "${account.platform}".`,
      };
  }
}
