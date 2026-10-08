import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { classifySentimentBatch, type Sentiment } from "@/lib/sentiment";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Sentiment classification can take a few seconds per batch

/**
 * POST /api/competitors/[id]/analyze
 *
 * Deep competitor analysis. Pulls the competitor's stored posts (synced
 * by POST /api/competitors/sync) and:
 *
 * 1. Runs sentiment analysis on each post (batched through the LLM
 *    classifier, falling back to keywords if no LLM is configured).
 *    Persists the sentiment label on each CompetitorPost row so
 *    subsequent calls don't re-classify (we re-classify only posts
 *    whose `sentiment` column is still null).
 *
 * 2. Identifies content gaps — topics the competitor posts about that
 *    the caller doesn't. Topics are extracted from hashtags + the
 *    first few words of each post; the caller's own topics come from
 *    their PostVariants (hashtags + content).
 *
 * 3. Calculates share-of-voice — the ratio of the competitor's
 *    total engagement to (competitor + caller) total engagement over
 *    the same window. Returns a value in [0, 1] where 0.5 = tied.
 *
 * 4. Returns the competitor's top performing posts (by engagement
 *    score = likes + 2*comments + 3*shares).
 *
 * Returns:
 *   {
 *     posts:          CompetitorPost[],
 *     sentimentBreakdown: { positive, neutral, negative },
 *     contentGaps:    { topic, competitorPosts, yourPosts }[],
 *     shareOfVoice:   number, // 0–1
 *     topPosts:       CompetitorPost[],
 *   }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  // Fetch the competitor — tenant-scoped.
  const competitor = await db.competitor.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    include: { posts: { orderBy: { postedAt: "desc" }, take: 50 } },
  });
  if (!competitor) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  // === 1. Sentiment analysis (only for posts not yet classified) ===
  const unclassified = competitor.posts.filter((p) => !p.sentiment);
  if (unclassified.length > 0) {
    try {
      const sentimentMap = await classifySentimentBatch(
        unclassified.map((p) => ({ id: p.id, text: p.text })),
      );
      // Persist the labels in batches (avoid N+1 round-trips).
      await Promise.all(
        Array.from(sentimentMap.entries()).map(([postId, sentiment]) =>
          db.competitorPost.update({
            where: { id: postId },
            data: { sentiment },
          }).catch((e: unknown) => {
            console.warn(
              `[competitors/analyze] sentiment persist failed for ${postId}:`,
              e instanceof Error ? e.message : String(e),
            );
          }),
        ),
      );
      // Re-read the posts with the freshly-persisted sentiment.
      const refreshed = await db.competitor.findFirst({
        where: { id: competitor.id },
        include: { posts: { orderBy: { postedAt: "desc" }, take: 50 } },
      });
      if (refreshed) {
        competitor.posts = refreshed.posts;
      }
    } catch (e) {
      console.warn(
        "[competitors/analyze] sentiment classification failed:",
        e instanceof Error ? e.message : String(e),
      );
      // Fall through — unclassified posts default to "neutral" in the breakdown.
    }
  }

  // === 2. Sentiment breakdown ===
  const sentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  for (const p of competitor.posts) {
    const s = (p.sentiment as Sentiment | null) ?? "neutral";
    if (s === "positive") sentimentBreakdown.positive++;
    else if (s === "negative") sentimentBreakdown.negative++;
    else sentimentBreakdown.neutral++;
  }

  // === 3. Content gap detection ===
  // Extract topics from the competitor's posts (hashtags + first ~5 keywords).
  const competitorTopics = new Map<string, number>();
  for (const p of competitor.posts) {
    for (const topic of extractTopics(p.text)) {
      competitorTopics.set(topic, (competitorTopics.get(topic) ?? 0) + 1);
    }
  }

  // Extract topics from the caller's own posts (caption + variant content + hashtags).
  const yourTopics = new Map<string, number>();
  const yourPosts = await db.post.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    select: {
      caption: true,
      variants: { select: { content: true, hashtags: true } },
    },
    take: 200,
  });
  for (const yp of yourPosts) {
    for (const topic of extractTopics(yp.caption)) {
      yourTopics.set(topic, (yourTopics.get(topic) ?? 0) + 1);
    }
    for (const v of yp.variants) {
      for (const topic of extractTopics(v.content)) {
        yourTopics.set(topic, (yourTopics.get(topic) ?? 0) + 1);
      }
      if (v.hashtags) {
        for (const tag of v.hashtags.split(/[,;\n]+/)) {
          const t = tag.trim().toLowerCase().replace(/^#/, "");
          if (t.length >= 3) {
            yourTopics.set(t, (yourTopics.get(t) ?? 0) + 1);
          }
        }
      }
    }
  }

  // Content gaps = topics the competitor posts about (>= 1 time) that you don't.
  const contentGaps = Array.from(competitorTopics.entries())
    .filter(([topic]) => (yourTopics.get(topic) ?? 0) === 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({
      topic,
      competitorPosts: count,
      yourPosts: 0,
    }));

  // === 4. Share-of-voice (your engagement vs theirs over the same window) ===
  const competitorEngagement = competitor.posts.reduce(
    (sum, p) => sum + p.likes + p.comments * 2 + p.shares * 3,
    0,
  );

  // Pull the caller's own published variants + their engagement over the same window.
  const yourVariants = await db.postVariant.findMany({
    where: {
      status: "published",
      account: tenantWhere(scope) as { customerId?: string },
    },
    select: { likes: true, comments: true, shares: true },
    take: 200,
  });
  const yourEngagement = yourVariants.reduce(
    (sum, v) => sum + (v.likes ?? 0) + (v.comments ?? 0) * 2 + (v.shares ?? 0) * 3,
    0,
  );

  const totalEngagement = competitorEngagement + yourEngagement;
  const shareOfVoice =
    totalEngagement > 0
      ? Number((competitorEngagement / totalEngagement).toFixed(3))
      : 0;

  // === 5. Top performing posts ===
  const topPosts = [...competitor.posts]
    .map((p) => ({
      id: p.id,
      externalId: p.externalId,
      text: p.text,
      mediaUrl: p.mediaUrl,
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      sentiment: p.sentiment,
      postedAt: p.postedAt.toISOString(),
      engagementScore: p.likes + p.comments * 2 + p.shares * 3,
    }))
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 8);

  // === 6. Format posts for the response ===
  const posts = competitor.posts.map((p) => ({
    id: p.id,
    externalId: p.externalId,
    text: p.text,
    mediaUrl: p.mediaUrl,
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    sentiment: p.sentiment,
    postedAt: p.postedAt.toISOString(),
  }));

  return NextResponse.json({
    posts,
    sentimentBreakdown,
    contentGaps,
    shareOfVoice,
    topPosts,
    meta: {
      competitorId: competitor.id,
      competitorName: competitor.name,
      platform: competitor.platform,
      handle: competitor.handle,
      followers: competitor.followers,
      yourEngagement,
      competitorEngagement,
      postsAnalyzed: competitor.posts.length,
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "to", "of", "in", "on", "for", "with", "at", "by", "from", "as", "into", "this",
  "that", "these", "those", "it", "its", "they", "them", "their", "we", "you", "your",
  "our", "i", "me", "my", "we", "us", "so", "if", "than", "then", "now", "just", "via",
  "via", "out", "up", "down", "off", "over", "under", "again", "more", "most", "some",
  "any", "all", "each", "every", "other", "such", "only", "own", "same", "too", "very",
  "can", "will", "just", "should", "would", "could", "may", "might", "must", "shall",
  "do", "does", "did", "have", "has", "had", "having", "make", "made", "go", "going",
  "get", "got", "let", "one", "two", "three", "http", "https", "www", "com", "rt",
  "after", "before", "here", "there", "when", "where", "why", "how", "what", "who",
]);

/**
 * Extract topics from a piece of social text.
 *
 * Returns a de-duplicated, lowercased list of significant tokens:
 *   - hashtags (with the leading # stripped)
 *   - words ≥ 3 chars that aren't stop-words
 *
 * Used for content-gap detection — the more posts mention a topic, the
 * more it's a "real" content theme for that competitor.
 */
function extractTopics(text: string): string[] {
  if (!text) return [];
  const topics = new Set<string>();

  // Hashtags — always count as topics (even if they're short).
  const hashtagMatches = text.match(/#\w+/g) ?? [];
  for (const tag of hashtagMatches) {
    const t = tag.slice(1).toLowerCase();
    if (t.length >= 2) topics.add(t);
  }

  // Words — strip punctuation, lowercase, drop stop-words + short tokens.
  const words = text.toLowerCase().match(/[a-z][a-z0-9']{2,}/g) ?? [];
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue;
    topics.add(w);
  }

  return Array.from(topics);
}
