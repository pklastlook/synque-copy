import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { classifySentimentBatch } from "@/lib/sentiment";
import { recalculateAccountHealth } from "@/lib/account-health";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/comments/classify
 *
 * Classifies sentiment for EXISTING comments in the database that have
 * the default "neutral" sentiment. Uses the LLM (with keyword fallback)
 * to assign real positive/neutral/negative labels.
 *
 * After classification, triggers account health recalculation so the
 * sentiment distribution reflects the actual comment data.
 *
 * Body: { accountId?: string }
 *   - If accountId provided, only classify comments for that account
 *   - If omitted, classify comments for all accounts
 *
 * This is a one-time migration endpoint — run it once to backfill
 * sentiment on existing comments. New comments (from sync/comments)
 * are classified at ingestion time.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { accountId } = (await req.json().catch(() => ({}))) as { accountId?: string };

  // Fetch comments — prioritize ones that might be unclassified.
  // We classify ALL comments (not just "neutral") to ensure accuracy.
  const where = accountId ? { accountId } : {};
  const comments = await db.comment.findMany({
    where,
    select: { id: true, text: true, sentiment: true, accountId: true },
    take: 500, // batch limit
  });

  if (comments.length === 0) {
    return NextResponse.json({ ok: true, classified: 0, message: "No comments to classify" });
  }

  // Classify all comments
  const sentimentMap = await classifySentimentBatch(
    comments.map(c => ({ id: c.id, text: c.text }))
  );

  // Update the database with real sentiments
  let updated = 0;
  const affectedAccountIds = new Set<string>();

  for (const c of comments) {
    const newSentiment = sentimentMap.get(c.id);
    if (newSentiment && newSentiment !== c.sentiment) {
      await db.comment.update({
        where: { id: c.id },
        data: { sentiment: newSentiment },
      });
      updated++;
      if (c.accountId) affectedAccountIds.add(c.accountId);
    }
  }

  // Recalculate health for all affected accounts
  for (const accId of affectedAccountIds) {
    await recalculateAccountHealth(accId).catch((e) => {
      console.warn(`[comments/classify] Health recalc failed for ${accId}:`, e instanceof Error ? e.message : String(e));
    });
  }

  return NextResponse.json({
    ok: true,
    total: comments.length,
    updated,
    accountsRecalculated: affectedAccountIds.size,
    message: `Classified ${updated} of ${comments.length} comments. Recalculated health for ${affectedAccountIds.size} account(s).`,
  });
}
