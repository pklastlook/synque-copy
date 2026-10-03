import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { classifySentimentBatch } from "@/lib/sentiment";
import { decryptPlatformCredential } from "@/lib/platform-credential-crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // multi-platform ingestion can be slow

/**
 * POST /api/listening/sync
 *
 * Searches social platforms + the web for mentions matching the user's saved
 * ListeningQuery records, classifies sentiment, and stores them as Mention rows.
 *
 * Body: { queryId?: string }
 *   - If queryId is provided, sync only that query
 *   - If omitted, sync ALL queries with status="active"
 *
 * For each query, the following sources are searched:
 *   - X / Twitter     → api.twitter.com/2/tweets/search/recent (uses stored
 *                       PlatformCredential for the bearer/user token)
 *   - Instagram       → graph.facebook.com/v19.0/ig_hashtag_search + /recent_media
 *                       (limited to IG Business accounts — skipped if no cred)
 *   - Facebook        → SKIPPED (Graph API does not support keyword search)
 *   - Reddit          → reddit.com/search.json (public, no auth needed)
 *   - Web / News      → news.google.com/rss/search?q=... (RSS, parse XML)
 *
 * Mentions are deduplicated by URL (if a Mention with the same URL already
 * exists, the new one is skipped). Each surviving mention has its sentiment
 * classified via `classifySentimentBatch` (LLM with keyword fallback) and is
 * then inserted into the Mention table.
 *
 * Returns:
 *   { ok, totalQueries, totalFound, newMentions, classified, errors }
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { queryId } = (await req.json().catch(() => ({}))) as { queryId?: string };

  // Build the where clause — single query, or all "active" queries.
  // Always AND with the tenant scope so a tenant user can only sync their own
  // listening queries (super-admins bypass via empty tenantWhere).
  const baseWhere = queryId ? { id: queryId } : { status: "active" as const };
  const where = { ...baseWhere, ...tenantWhere(scope) as { customerId?: string } };
  const queries = await db.listeningQuery.findMany({ where });

  if (queries.length === 0) {
    return NextResponse.json({
      ok: true,
      totalQueries: 0,
      totalFound: 0,
      newMentions: 0,
      classified: 0,
      errors: queryId
        ? [`No listening query found with id "${queryId}"`]
        : ["No active listening queries found"],
    });
  }

  // Pre-fetch Twitter + Instagram credentials ONCE (any connected one — the
  // first available credential across all team members is used, matching the
  // competitors/sync pattern). Sensitive fields (accessToken, bearerToken,
  // oauth2UserToken, ...) are stored AES-256-GCM-encrypted at rest — decrypt
  // before passing them to the platform search helpers.
  const twitterCredRow = await db.platformCredential.findFirst({
    where: { platform: { in: ["twitter", "x"] }, connected: true },
  });
  const twitterCred = twitterCredRow ? decryptPlatformCredential(twitterCredRow) : null;

  const igCredRow = await db.platformCredential.findFirst({
    where: { platform: "instagram", connected: true },
  });
  const igCred = igCredRow ? decryptPlatformCredential(igCredRow) : null;

  const errors: string[] = [];
  const allRaw: { queryId: string; raw: RawMention }[] = [];

  for (const q of queries) {
    const keywordsList = (q.keywords ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywordsList.length === 0) {
      errors.push(`Query "${q.name}": no keywords defined`);
      continue;
    }

    // Twitter accepts OR/AND syntax — comma-separated keywords become OR.
    // Reddit + Google News just use space-separated keyword lists.
    const twitterQuery = keywordsList.join(" OR ");
    const redditQuery = keywordsList.join(" ");
    const newsQuery = keywordsList.join(" ");

    // === Twitter / X ===
    if (twitterCred) {
      try {
        const tweets = await searchTwitter(twitterQuery, twitterCred);
        for (const t of tweets) allRaw.push({ queryId: q.id, raw: t });
      } catch (e) {
        errors.push(`Query "${q.name}" [twitter]: ${errMsg(e)}`);
      }
    }

    // === Instagram (hashtag search — requires IG Business account) ===
    if (igCred?.accessToken && igCred?.pageId) {
      // IG hashtag search only supports a single tag at a time. Use the first
      // keyword, stripped of any leading # and any trailing words.
      const tag = keywordsList[0].replace(/^#/, "").split(/\s+/)[0];
      if (tag) {
        try {
          const posts = await searchInstagramHashtag(tag, igCred);
          for (const p of posts) allRaw.push({ queryId: q.id, raw: p });
        } catch (e) {
          errors.push(`Query "${q.name}" [instagram]: ${errMsg(e)}`);
        }
      }
    }

    // === Facebook (SKIPPED — Graph API does not support keyword search) ===
    // Logged once after the loop to avoid spamming errors[].

    // === Reddit (public JSON API, no auth) ===
    try {
      const posts = await searchReddit(redditQuery);
      for (const p of posts) allRaw.push({ queryId: q.id, raw: p });
    } catch (e) {
      errors.push(`Query "${q.name}" [reddit]: ${errMsg(e)}`);
    }

    // === Google News RSS (web/news — no auth, parse XML) ===
    try {
      const articles = await searchGoogleNews(newsQuery);
      for (const a of articles) allRaw.push({ queryId: q.id, raw: a });
    } catch (e) {
      errors.push(`Query "${q.name}" [news]: ${errMsg(e)}`);
    }
  }

  // One-time notes about skipped sources (kept outside the per-query loop
  // so they don't get duplicated across N queries).
  errors.push("Facebook: skipped — Graph API does not support keyword search");
  if (!twitterCred) {
    errors.push("Twitter: skipped — no connected PlatformCredential for platform 'twitter' or 'x'");
  }
  if (!igCred || !igCred.accessToken || !igCred.pageId) {
    errors.push("Instagram: skipped — no connected IG Business account (requires accessToken + pageId)");
  }

  // === Deduplicate by URL ===
  const urls = Array.from(
    new Set(
      allRaw
        .map((r) => r.raw.url)
        .filter((u): u is string => Boolean(u))
    )
  );

  let existingUrls = new Set<string>();
  if (urls.length > 0) {
    const existing = await db.mention.findMany({
      where: { url: { in: urls } },
      select: { url: true },
    });
    existingUrls = new Set(
      existing.map((m) => m.url).filter((u): u is string => Boolean(u))
    );
  }

  const newCandidates = allRaw.filter(
    (r) => !r.raw.url || !existingUrls.has(r.raw.url)
  );

  // === Classify sentiment (batch — LLM with keyword fallback) ===
  const batchItems = newCandidates.map((r, i) => ({
    id: String(i),
    text: r.raw.text,
  }));
  const sentiments = await classifySentimentBatch(batchItems);

  // === Insert mentions ===
  let inserted = 0;
  for (let i = 0; i < newCandidates.length; i++) {
    const { queryId, raw } = newCandidates[i];
    const sentiment = sentiments.get(String(i)) ?? "neutral";
    try {
      await db.mention.create({
        data: {
          queryId,
          source: raw.source,
          author: raw.author,
          authorAvatar: raw.authorAvatar,
          text: raw.text,
          url: raw.url,
          sentiment,
          reach: raw.reach,
          engagement: raw.engagement,
          date: raw.date,
        },
      });
      inserted++;
    } catch (e) {
      errors.push(`Insert failed for ${raw.url ?? raw.author}: ${errMsg(e)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    totalQueries: queries.length,
    totalFound: allRaw.length,
    newMentions: inserted,
    classified: newCandidates.length,
    errors,
  });
}

// ============================================================================
// Types
// ============================================================================

interface RawMention {
  source: string; // "x" | "instagram" | "reddit" | "news"
  author: string;
  authorAvatar: string | null;
  text: string;
  url: string | null;
  reach: number;
  engagement: number;
  date: Date;
}

interface CredLike {
  accessToken?: string | null;
  bearerToken?: string | null;
  oauth2UserToken?: string | null;
  pageId?: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ============================================================================
// X / Twitter — recent search API
// ============================================================================

interface TwitterTweet {
  id: string;
  text?: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    like_count?: number;
    reply_count?: number;
    retweet_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
}

interface TwitterUser {
  id: string;
  name?: string;
  username?: string;
  profile_image_url?: string;
}

/**
 * GET https://api.twitter.com/2/tweets/search/recent
 *   ?query={keywords}&max_results=30
 *   &tweet.fields=created_at,public_metrics,author_id
 *   &expansions=author_id
 *   &user.fields=name,username,profile_image_url
 *
 * Token priority: oauth2UserToken (OAuth 2.0 user-context, from "Login with
 * X" flow) → accessToken (OAuth 1.0a) → bearerToken (app-only Bearer Token).
 * The recent search endpoint accepts any of these.
 */
async function searchTwitter(
  query: string,
  cred: CredLike
): Promise<RawMention[]> {
  const token = cred.oauth2UserToken ?? cred.accessToken ?? cred.bearerToken;
  if (!token || !query) return [];

  const url =
    "https://api.twitter.com/2/tweets/search/recent?" +
    new URLSearchParams({
      query,
      max_results: "30",
      "tweet.fields": "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "name,username,profile_image_url",
    }).toString();

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const detail =
      (errBody as { detail?: string; title?: string })?.detail ??
      (errBody as { title?: string })?.title ??
      `HTTP ${res.status}`;
    throw new Error(`Twitter API ${res.status}: ${detail}`);
  }

  const json = await res.json();
  const tweets: TwitterTweet[] = json?.data ?? [];
  const users: TwitterUser[] = json?.includes?.users ?? [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return tweets.map((t) => {
    const author = t.author_id ? userMap.get(t.author_id) : undefined;
    const metrics = t.public_metrics ?? {};
    return {
      source: "x",
      author: author?.username ? `@${author.username}` : (t.author_id ?? "unknown"),
      authorAvatar: author?.profile_image_url ?? null,
      text: (t.text ?? "").slice(0, 500),
      url: t.id ? `https://twitter.com/i/web/status/${t.id}` : null,
      reach: metrics.impression_count ?? 0,
      engagement:
        (metrics.like_count ?? 0) +
        (metrics.reply_count ?? 0) +
        (metrics.retweet_count ?? 0) +
        (metrics.quote_count ?? 0),
      date: t.created_at ? new Date(t.created_at) : new Date(),
    };
  });
}

// ============================================================================
// Instagram — hashtag search (IG Business accounts only)
// ============================================================================

interface IgMedia {
  id?: string;
  caption?: string;
  permalink?: string;
  like_count?: number;
  comments_count?: number;
  timestamp?: string;
  username?: string;
}

/**
 * Two-step IG hashtag search:
 *   1. GET /ig_hashtag_search?user_id={ig_user_id}&q={keyword}
 *      → returns [{ id: "<hashtag_id>" }]
 *   2. GET /{hashtag_id}/recent_media?user_id={ig_user_id}
 *      &fields=id,caption,permalink,like_count,comments_count,timestamp,username
 *
 * Requires an Instagram Business account + `instagram_basic` + `pages_show_list`
 * (and ideally `instagram_manage_insights`) scopes. The IG Business Account ID
 * is stored on PlatformCredential.pageId.
 */
async function searchInstagramHashtag(
  keyword: string,
  cred: CredLike
): Promise<RawMention[]> {
  const token = cred.accessToken;
  const igUserId = cred.pageId;
  if (!token || !igUserId || !keyword) return [];

  // Step 1: resolve hashtag ID
  const searchUrl =
    "https://graph.facebook.com/v19.0/ig_hashtag_search?" +
    new URLSearchParams({
      user_id: igUserId,
      q: keyword,
    }).toString();

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    const errBody = await searchRes.json().catch(() => ({}));
    const msg =
      (errBody as { error?: { message?: string } })?.error?.message ??
      `HTTP ${searchRes.status}`;
    throw new Error(`IG hashtag search ${searchRes.status}: ${msg}`);
  }

  const searchJson = await searchRes.json();
  const hashtagId = searchJson?.data?.[0]?.id;
  if (!hashtagId) return [];

  // Step 2: fetch recent media for that hashtag
  const mediaUrl =
    `https://graph.facebook.com/v19.0/${hashtagId}/recent_media?` +
    new URLSearchParams({
      user_id: igUserId,
      fields:
        "id,caption,permalink,like_count,comments_count,timestamp,username",
      limit: "25",
    }).toString();

  const mediaRes = await fetch(mediaUrl);
  if (!mediaRes.ok) {
    const errBody = await mediaRes.json().catch(() => ({}));
    const msg =
      (errBody as { error?: { message?: string } })?.error?.message ??
      `HTTP ${mediaRes.status}`;
    throw new Error(`IG recent_media ${mediaRes.status}: ${msg}`);
  }

  const mediaJson = await mediaRes.json();
  const media: IgMedia[] = mediaJson?.data ?? [];

  return media.map((m) => ({
    source: "instagram",
    author: m.username ?? "instagram_user",
    authorAvatar: null,
    text: (m.caption ?? "").slice(0, 500),
    url: m.permalink ?? null,
    reach: 0,
    engagement: (m.like_count ?? 0) + (m.comments_count ?? 0),
    date: m.timestamp ? new Date(m.timestamp) : new Date(),
  }));
}

// ============================================================================
// Reddit — public JSON search (no auth)
// ============================================================================

interface RedditPostData {
  id?: string;
  title?: string;
  selftext?: string;
  author?: string;
  url?: string;
  permalink?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  subreddit?: string;
}

/**
 * GET https://www.reddit.com/search.json?q={query}&sort=new&limit=25
 *
 * Public endpoint — no auth required. A descriptive User-Agent is required by
 * Reddit's API policy. Each result's `permalink` is converted to a full URL
 * (https://www.reddit.com{permalink}) for dedup + linking.
 */
async function searchReddit(query: string): Promise<RawMention[]> {
  if (!query) return [];

  const url =
    "https://www.reddit.com/search.json?" +
    new URLSearchParams({
      q: query,
      sort: "new",
      limit: "25",
    }).toString();

  const res = await fetch(url, {
    headers: { "User-Agent": "SYNQUE-listening/1.0 (social media monitoring)" },
  });

  if (!res.ok) {
    throw new Error(`Reddit API ${res.status}`);
  }

  const json = await res.json();
  const children: { data: RedditPostData }[] = json?.data?.children ?? [];

  return children
    .map((c) => c.data)
    .filter((d): d is RedditPostData & { id: string; title: string } =>
      Boolean(d && d.id && d.title)
    )
    .map((d) => {
      const permalink = d.permalink
        ? `https://www.reddit.com${d.permalink}`
        : null;
      const text = [d.title ?? "", d.selftext ?? ""]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 500);
      const authorRaw =
        d.author && d.author !== "[deleted]" ? d.author : "unknown";
      return {
        source: "reddit",
        author: `u/${authorRaw}`,
        authorAvatar: null,
        text,
        url: permalink ?? d.url ?? null,
        reach: d.score ?? 0,
        engagement: d.num_comments ?? 0,
        date: d.created_utc ? new Date(d.created_utc * 1000) : new Date(),
      };
    });
}

// ============================================================================
// Google News RSS — web/news search (no auth)
// ============================================================================

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  source?: string;
  description?: string;
}

/**
 * GET https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en
 *
 * Returns RSS XML — no auth needed. We parse the <item> blocks with a regex
 * (no XML library dependency). Each item becomes a Mention with source="news".
 */
async function searchGoogleNews(query: string): Promise<RawMention[]> {
  if (!query) return [];

  const url =
    "https://news.google.com/rss/search?" +
    new URLSearchParams({
      q: query,
      hl: "en-US",
      gl: "US",
      ceid: "US:en",
    }).toString();

  const res = await fetch(url, {
    headers: { "User-Agent": "SYNQUE-listening/1.0 (social media monitoring)" },
  });

  if (!res.ok) {
    throw new Error(`Google News RSS ${res.status}`);
  }

  const xml = await res.text();
  const items = parseRssItems(xml);

  return items.map((it) => {
    const title = decodeEntities(it.title ?? "");
    const desc = stripHtml(decodeEntities(it.description ?? ""));
    const source = it.source ? decodeEntities(it.source) : "Google News";
    return {
      source: "news",
      author: source ?? "Google News",
      authorAvatar: null,
      text: (title ? title + (desc ? " — " + desc : "") : desc).slice(0, 500),
      url: it.link ?? null,
      reach: 0,
      engagement: 0,
      date: it.pubDate ? new Date(it.pubDate) : new Date(),
    };
  });
}

/** Parse <item>...</item> blocks from an RSS feed string. */
function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title: extractTag(block, "title"),
      link: extractLink(block),
      pubDate: extractTag(block, "pubDate"),
      source: extractTag(block, "source"),
      description: extractTag(block, "description"),
    });
  }
  return items;
}

/** Extract the inner text of <tag>...</tag> (handles CDATA). */
function extractTag(block: string, tag: string): string | undefined {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`
  );
  const m = block.match(re);
  return m?.[1]?.trim() || undefined;
}

/**
 * Extract the URL from a <link>...</link> element. Google News RSS sometimes
 * uses the bare <link>url</link> form, sometimes a self-closing tag — handle
 * both.
 */
function extractLink(block: string): string | undefined {
  // Standard <link>url</link>
  const m1 = block.match(/<link[^>]*>([\s\S]*?)<\/link>/);
  if (m1?.[1]?.trim()) return m1[1].trim();
  // Self-closing <link href="url" />
  const m2 = block.match(/<link[^>]*href=["']([^"']+)["']/);
  if (m2?.[1]) return m2[1];
  return undefined;
}

/** Decode the 5 core XML entities (&amp; &lt; &gt; &quot; &apos;). */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Strip HTML tags from a string. */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}
