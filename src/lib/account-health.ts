/**
 * Account Health Recalculation Engine
 *
 * Computes REAL risk scores based on actual platform data:
 * - Posting cadence (vs protection limits)
 * - Comment sentiment ratio (positive vs negative)
 * - Banned hashtag usage in published posts
 * - Failed post rate
 * - Account age (warm-up detection)
 *
 * Updates the AccountHealth record with real values.
 */

import { db } from "./db";

export interface HealthSnapshot {
  riskScore: number;        // 0-100, higher = more at risk
  riskLevel: string;       // safe | moderate | elevated | high | critical
  status: string;          // healthy | warning | restricted | suspended
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  reportCount: number;
  riskReasons: string[];
}

/**
 * Recalculate health for a single account.
 *
 * Pulls REAL data from:
 * - PostVariant records (publishing cadence, failed posts)
 * - Comment records (sentiment distribution)
 * - AccountProtection settings (limits to check against)
 * - Account creation date (warm-up period detection)
 */
export async function recalculateAccountHealth(accountId: string): Promise<HealthSnapshot> {
  const now = new Date();
  const day = 86400000; // 1 day in ms
  const hour = 3600000; // 1 hour in ms

  // Fetch all data in parallel
  const [account, protection, variants, comments, existingHealth] = await Promise.all([
    db.account.findUnique({ where: { id: accountId } }),
    db.accountProtection.findUnique({ where: { accountId } }),
    db.postVariant.findMany({
      where: { accountId },
      include: { post: true },
      orderBy: { createdAt: "desc" },
      take: 200, // last 200 variants for cadence analysis
    }),
    db.comment.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 500, // last 500 comments for sentiment
    }),
    db.accountHealth.findUnique({ where: { accountId } }),
  ]);

  if (!account) throw new Error(`Account ${accountId} not found`);

  const reasons: string[] = [];
  let riskScore = 0;

  // ================================================================
  // 1. POSTING CADENCE — check against protection limits
  // ================================================================
  const dailyLimit = protection?.dailyPostLimit ?? 4;
  const hourlyLimit = protection?.hourlyPostLimit ?? 2;
  const minMinutesBetween = protection?.minMinutesBetweenPosts ?? 30;

  const publishedVariants = variants.filter(v => v.status === "published");
  const postsToday = publishedVariants.filter(v => v.publishedAt && (now.getTime() - v.publishedAt.getTime()) < day);
  const postsLastHour = publishedVariants.filter(v => v.publishedAt && (now.getTime() - v.publishedAt.getTime()) < hour);

  // Check daily limit
  if (postsToday.length >= dailyLimit) {
    riskScore += 20;
    reasons.push(`daily_post_limit_reached (${postsToday.length}/${dailyLimit})`);
  } else if (postsToday.length >= dailyLimit * 0.8) {
    riskScore += 10;
    reasons.push(`daily_post_limit_approaching (${postsToday.length}/${dailyLimit})`);
  }

  // Check hourly limit
  if (postsLastHour.length >= hourlyLimit) {
    riskScore += 15;
    reasons.push(`hourly_post_limit_reached (${postsLastHour.length}/${hourlyLimit})`);
  }

  // Check minimum minutes between posts
  if (publishedVariants.length >= 2) {
    const lastTwo = publishedVariants.slice(0, 2);
    const gap = lastTwo[0].publishedAt!.getTime() - lastTwo[1].publishedAt!.getTime();
    const gapMinutes = gap / 60000;
    if (gapMinutes < minMinutesBetween) {
      riskScore += 10;
      reasons.push(`posts_too_close (${Math.round(gapMinutes)}min < ${minMinutesBetween}min min)`);
    }
  }

  // ================================================================
  // 2. COMMENT SENTIMENT — negative ratio contributes to risk
  // ================================================================
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const c of comments) {
    const s = c.sentiment as keyof typeof sentimentCounts;
    if (sentimentCounts[s] !== undefined) sentimentCounts[s]++;
  }

  const totalComments = comments.length;
  const negativeRatio = totalComments > 0 ? sentimentCounts.negative / totalComments : 0;

  if (totalComments > 5) {
    if (negativeRatio > 0.4) {
      riskScore += 25;
      reasons.push(`high_negative_comment_ratio (${Math.round(negativeRatio * 100)}%)`);
    } else if (negativeRatio > 0.25) {
      riskScore += 12;
      reasons.push(`elevated_negative_comment_ratio (${Math.round(negativeRatio * 100)}%)`);
    }
  }

  // ================================================================
  // 3. BANNED HASHTAGS — check published post variants
  // ================================================================
  if (protection?.blockBannedHashtags && protection.bannedHashtags) {
    const bannedTags = protection.bannedHashtags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    if (bannedTags.length > 0) {
      const violations = publishedVariants.filter(v => {
        const tags = (v.hashtags ?? "").toLowerCase();
        return bannedTags.some(b => tags.includes(b));
      });
      if (violations.length > 0) {
        riskScore += 15 * Math.min(violations.length, 3); // cap at 45
        reasons.push(`banned_hashtag_violations (${violations.length} posts)`);
      }
    }
  }

  // ================================================================
  // 4. FAILED POST RATE — high failure rate indicates issues
  // ================================================================
  const failedVariants = variants.filter(v => v.status === "failed");
  const failedRate = variants.length > 0 ? failedVariants.length / variants.length : 0;
  if (variants.length > 3 && failedRate > 0.3) {
    riskScore += 15;
    reasons.push(`high_failed_post_rate (${Math.round(failedRate * 100)}%)`);
  }

  // ================================================================
  // 5. ACCOUNT AGE — new accounts are higher risk (warm-up needed)
  // ================================================================
  const accountAgeDays = (now.getTime() - account.createdAt.getTime()) / day;
  if (accountAgeDays < 7) {
    riskScore += 15;
    reasons.push(`account_too_new (${Math.round(accountAgeDays)}d old)`);
  } else if (accountAgeDays < 30 && protection?.enforceWarmupProfile) {
    riskScore += 5;
    reasons.push(`warmup_period (${Math.round(accountAgeDays)}d old)`);
  }

  // ================================================================
  // 6. REPORTS — from existing health record (platform-reported flags)
  // ================================================================
  const reportCount = existingHealth?.reportCount ?? 0;
  if (reportCount > 0) {
    riskScore += Math.min(reportCount * 10, 30);
    reasons.push(`platform_reports (${reportCount})`);
  }

  // Cap risk score at 100
  riskScore = Math.min(Math.round(riskScore), 100);

  // Determine risk level
  let riskLevel = "safe";
  if (riskScore >= 80) riskLevel = "critical";
  else if (riskScore >= 60) riskLevel = "high";
  else if (riskScore >= 40) riskLevel = "elevated";
  else if (riskScore >= 20) riskLevel = "moderate";

  // Determine status
  let status = "healthy";
  if (riskScore >= 80) status = "suspended";
  else if (riskScore >= 60) status = "restricted";
  else if (riskScore >= 40) status = "warning";
  else if (riskScore >= 20) status = "warning";

  const snapshot: HealthSnapshot = {
    riskScore,
    riskLevel,
    status,
    positiveCount: sentimentCounts.positive,
    neutralCount: sentimentCounts.neutral,
    negativeCount: sentimentCounts.negative,
    reportCount,
    riskReasons: reasons,
  };

  // ================================================================
  // PERSIST — update the AccountHealth record
  // ================================================================
  await db.accountHealth.upsert({
    where: { accountId },
    update: {
      positiveCount: snapshot.positiveCount,
      neutralCount: snapshot.neutralCount,
      negativeCount: snapshot.negativeCount,
      riskScore: snapshot.riskScore,
      riskLevel: snapshot.riskLevel,
      status: snapshot.status,
      riskReasons: JSON.stringify(reasons),
      reportCount: snapshot.reportCount,
      lastUpdated: now,
    },
    create: {
      accountId,
      positiveCount: snapshot.positiveCount,
      neutralCount: snapshot.neutralCount,
      negativeCount: snapshot.negativeCount,
      riskScore: snapshot.riskScore,
      riskLevel: snapshot.riskLevel,
      status: snapshot.status,
      riskReasons: JSON.stringify(reasons),
      reportCount: snapshot.reportCount,
      lastUpdated: now,
    },
  });

  // Also update the protection audit timestamp
  if (protection) {
    await db.accountProtection.update({
      where: { accountId },
      data: { lastAudit: now },
    }).catch(() => {});
  }

  console.log(`[account-health] ${account.handle} (${account.platform}): risk=${riskScore} level=${riskLevel} status=${status} reasons=[${reasons.join(", ")}]`);

  return snapshot;
}

/**
 * Recalculate health for ALL accounts.
 * Used by the batch endpoint / scheduled job.
 */
export async function recalculateAllAccountHealth(): Promise<{ total: number; updated: number; errors: string[] }> {
  const accounts = await db.account.findMany({ select: { id: true, handle: true, platform: true } });
  const errors: string[] = [];
  let updated = 0;

  for (const account of accounts) {
    try {
      await recalculateAccountHealth(account.id);
      updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${account.handle} (${account.platform}): ${msg}`);
      console.error(`[account-health] Failed for ${account.handle}:`, msg);
    }
  }

  console.log(`[account-health] Batch complete: ${updated}/${accounts.length} updated, ${errors.length} errors`);
  return { total: accounts.length, updated, errors };
}
