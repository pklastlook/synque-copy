import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { classifySentimentBatch } from "@/lib/sentiment";
import { recalculateAccountHealth } from "@/lib/account-health";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for batch processing

/**
 * POST /api/sync/comments
 *
 * Fetches REAL comments/replies from social platforms and stores them
 * with AI-classified sentiment (positive/neutral/negative).
 *
 * Body: { accountId?: string }
 *   - If accountId is provided, sync only that account
 *   - If omitted, sync all connected accounts (batch)
 *
 * Supported platforms:
 *   - X/Twitter: fetches replies to the user's tweets via API v2
 *   - Instagram: fetches comments on media via Graph API
 *   - Facebook: fetches comments on posts via Graph API
 *   - LinkedIn: fetches comments on posts via API
 *
 * For each fetched comment:
 *   1. Check if it already exists (by platform comment ID + accountId)
 *   2. If new, classify sentiment via LLM (with keyword fallback)
 *   3. Store in the Comment table with the real sentiment
 *
 * After syncing, triggers account health recalculation so risk scores
 * reflect the latest sentiment data.
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { accountId } = (await req.json().catch(() => ({}))) as { accountId?: string };

  // Get the platform credentials for the account(s)
  const where = accountId
    ? { id: accountId }
    : {};

  const accounts = await db.account.findMany({
    where,
    include: { owner: true },
  });

  if (accounts.length === 0) {
    return NextResponse.json({ error: "No accounts found to sync" }, { status: 404 });
  }

  const results: { account: string; platform: string; fetched: number; newComments: number; classified: number; errors: string[] }[] = [];

  for (const account of accounts) {
    const result = { account: account.handle, platform: account.platform, fetched: 0, newComments: 0, classified: 0, errors: [] as string[] };

    try {
      // Get the platform credentials
      const cred = await db.platformCredential.findFirst({
        where: { userId: account.ownerId, platform: account.platform, connected: true },
      });

      if (!cred || !cred.accessToken) {
        result.errors.push("No connected credentials for this platform");
        results.push(result);
        continue;
      }

      // Fetch comments based on platform
      let rawComments: { id: string; author: string; text: string; authorAvatar?: string | null }[] = [];

      switch (account.platform) {
        case "x":
        case "twitter":
          rawComments = await fetchTwitterComments(account, cred);
          break;
        case "instagram":
          rawComments = await fetchInstagramComments(account, cred);
          break;
        case "facebook":
          rawComments = await fetchFacebookComments(account, cred);
          break;
        case "linkedin":
          rawComments = await fetchLinkedInComments(account, cred);
          break;
        default:
          result.errors.push(`Comment sync not implemented for platform: ${account.platform}`);
          results.push(result);
          continue;
      }

      result.fetched = rawComments.length;

      if (rawComments.length === 0) {
        results.push(result);
        continue;
      }

      // Filter out comments that already exist (by platform comment ID)
      const existingIds = new Set(
        (await db.comment.findMany({
          where: { accountId: account.id },
          select: { id: true },
        })).map(c => c.id)
      );

      const newComments = rawComments.filter(c => !existingIds.has(c.id));
      result.newComments = newComments.length;

      if (newComments.length === 0) {
        results.push(result);
        continue;
      }

      // Classify sentiment for all new comments
      const sentimentMap = await classifySentimentBatch(
        newComments.map(c => ({ id: c.id, text: c.text }))
      );
      result.classified = sentimentMap.size;

      // Store comments with real sentiment
      for (const c of newComments) {
        const sentiment = sentimentMap.get(c.id) ?? "neutral";
        await db.comment.create({
          data: {
            id: c.id,
            accountId: account.id,
            author: c.author,
            authorAvatar: c.authorAvatar ?? null,
            text: c.text,
            type: "comment",
            sentiment,
            replied: false,
          },
        }).catch(() => {
          // Skip duplicates (race condition)
        });
      }

      // Recalculate account health with the new comment data
      await recalculateAccountHealth(account.id).catch((e) => {
        result.errors.push(`Health recalc failed: ${e instanceof Error ? e.message : String(e)}`);
      });

    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }

    results.push(result);
  }

  const totalFetched = results.reduce((s, r) => s + r.fetched, 0);
  const totalNew = results.reduce((s, r) => s + r.newComments, 0);
  const totalClassified = results.reduce((s, r) => s + r.classified, 0);

  return NextResponse.json({
    ok: true,
    synced: results,
    totals: { fetched: totalFetched, new: totalNew, classified: totalClassified },
  });
}

// ============================================================================
// Platform-specific comment fetchers
// ============================================================================

/**
 * Fetch replies/comments to the user's tweets via X/Twitter API v2.
 * Uses the stored OAuth 2.0 user token.
 */
async function fetchTwitterComments(
  account: { id: string; handle: string },
  cred: { accessToken?: string | null; bearerToken?: string | null }
): Promise<{ id: string; author: string; text: string; authorAvatar?: string | null }[]> {
  const token = cred.accessToken ?? cred.bearerToken;
  if (!token) return [];

  const handle = account.handle.replace("@", "");
  const comments: { id: string; author: string; text: string; authorAvatar?: string | null }[] = [];

  try {
    // Step 1: Get the Twitter user ID
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!userRes.ok) {
      console.warn(`[sync/comments] Twitter: failed to fetch user @${handle}: ${userRes.status}`);
      return [];
    }
    const twitterUserId = (await userRes.json()).data?.id;
    if (!twitterUserId) return [];

    // Step 2: Fetch the user's recent tweets (to get tweet IDs)
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${twitterUserId}/tweets?` +
        new URLSearchParams({
          max_results: "20",
          "tweet.fields": "created_at",
          exclude: "retweets",
        }).toString(),
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!tweetsRes.ok) return [];

    const tweets = (await tweetsRes.json()).data ?? [];
    if (tweets.length === 0) return [];

    // Step 3: For each tweet, fetch replies (conversation search)
    for (const tweet of tweets.slice(0, 10)) { // last 10 tweets
      const replyRes = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?` +
          new URLSearchParams({
            query: `conversation_id:${tweet.id} -from:${handle}`,
            max_results: "30",
            "tweet.fields": "author_id,created_at",
            expansions: "author_id",
            "user.fields": "username,profile_image_url",
          }).toString(),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!replyRes.ok) continue;

      const replyJson = await replyRes.json();
      const replies = replyJson.data ?? [];
      const users = (replyJson.includes?.users ?? []) as { id: string; username: string; profile_image_url?: string }[];
      const userMap = new Map(users.map(u => [u.id, u]));

      for (const reply of replies) {
        const author = userMap.get(reply.author_id);
        comments.push({
          id: reply.id,
          author: author?.username ?? "unknown",
          text: reply.text ?? "",
          authorAvatar: author?.profile_image_url ?? null,
        });
      }
    }

  } catch (err) {
    console.error(`[sync/comments] Twitter @${handle} error:`, err instanceof Error ? err.message : String(err));
  }

  return comments;
}

/**
 * Fetch comments on Instagram media via the Graph API.
 * Requires an Instagram Business Account connected to a Facebook Page.
 */
async function fetchInstagramComments(
  account: { id: string; handle: string },
  cred: { accessToken?: string | null; pageId?: string | null }
): Promise<{ id: string; author: string; text: string; authorAvatar?: string | null }[]> {
  const token = cred.accessToken;
  const igBusinessId = cred.pageId;
  if (!token || !igBusinessId) return [];

  const comments: { id: string; author: string; text: string; authorAvatar?: string | null }[] = [];

  try {
    // Step 1: Fetch recent media
    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${igBusinessId}/media?` +
        new URLSearchParams({
          fields: "id,comments{from,text,timestamp}",
          limit: "25",
          access_token: token,
        }).toString()
    );
    if (!mediaRes.ok) {
      console.warn(`[sync/comments] Instagram: failed to fetch media: ${mediaRes.status}`);
      return [];
    }

    const mediaJson = await mediaRes.json();
    const media = mediaJson.data ?? [];

    for (const m of media) {
      const mediaComments = m.comments?.data ?? [];
      for (const c of mediaComments) {
        comments.push({
          id: c.id,
          author: c.from?.username ?? "unknown",
          text: c.text ?? "",
          authorAvatar: null,
        });
      }
    }

  } catch (err) {
    console.error(`[sync/comments] Instagram @${account.handle} error:`, err instanceof Error ? err.message : String(err));
  }

  return comments;
}

/**
 * Fetch comments on Facebook posts via the Graph API.
 */
async function fetchFacebookComments(
  account: { id: string; handle: string },
  cred: { accessToken?: string | null; pageId?: string | null }
): Promise<{ id: string; author: string; text: string; authorAvatar?: string | null }[]> {
  const token = cred.accessToken;
  const pageId = cred.pageId;
  if (!token || !pageId) return [];

  const comments: { id: string; author: string; text: string; authorAvatar?: string | null }[] = [];

  try {
    // Fetch posts, then comments on each post
    const postsRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/posts?` +
        new URLSearchParams({
          fields: "id,comments{from,message,created_time}",
          limit: "25",
          access_token: token,
        }).toString()
    );
    if (!postsRes.ok) return [];

    const postsJson = await postsRes.json();
    const posts = postsJson.data ?? [];

    for (const p of posts) {
      const postComments = p.comments?.data ?? [];
      for (const c of postComments) {
        comments.push({
          id: c.id,
          author: c.from?.name ?? "unknown",
          text: c.message ?? "",
          authorAvatar: null,
        });
      }
    }

  } catch (err) {
    console.error(`[sync/comments] Facebook @${account.handle} error:`, err instanceof Error ? err.message : String(err));
  }

  return comments;
}

/**
 * Fetch comments on LinkedIn posts via the API.
 */
async function fetchLinkedInComments(
  account: { id: string; handle: string },
  cred: { accessToken?: string | null; profileId?: string | null }
): Promise<{ id: string; author: string; text: string; authorAvatar?: string | null }[]> {
  const token = cred.accessToken;
  const profileId = cred.profileId;
  if (!token || !profileId) return [];

  const comments: { id: string; author: string; text: string; authorAvatar?: string | null }[] = [];

  try {
    // Fetch recent posts by the user
    const postsRes = await fetch(
      `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(urn:li:person:${profileId})&count=10`,
      { headers: { Authorization: `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" } }
    );
    if (!postsRes.ok) return [];

    const postsJson = await postsRes.json();
    const posts = postsJson.elements ?? [];

    for (const post of posts) {
      const postUrn = post.id;
      if (!postUrn) continue;

      // Fetch comments on this post
      const commentsRes = await fetch(
        `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments?count=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!commentsRes.ok) continue;

      const commentsJson = await commentsRes.json();
      const postComments = commentsJson.elements ?? [];

      for (const c of postComments) {
        comments.push({
          id: c.id ?? `${postUrn}-${c.$created_at}`,
          author: c.actor ?? "unknown",
          text: c.message?.text ?? "",
          authorAvatar: null,
        });
      }
    }

  } catch (err) {
    console.error(`[sync/comments] LinkedIn @${account.handle} error:`, err instanceof Error ? err.message : String(err));
  }

  return comments;
}
