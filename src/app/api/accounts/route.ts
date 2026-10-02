import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  // Super-admins see all accounts. Tenant users see only their client's accounts.
  // Within a tenant, managers see all tenant accounts; members see only their own.
  const isManager = user!.role === "admin" || user!.role === "manager";
  const extraWhere = scope.isSuperAdmin
    ? (isManager ? {} : { ownerId: user!.userId })
    : (isManager ? {} : { ownerId: user!.userId });
  const where = tenantWhere(scope, extraWhere);

  const accounts = await db.account.findMany({
    where,
    include: { owner: true, health: true, protection: true },
    orderBy: { followers: "desc" },
    take: 50,
  });

  const accountIds = new Set(accounts.map((a) => a.id));
  const analytics = await db.analyticsDaily.findMany({
    where: { accountId: { in: [...accountIds] } },
  });
  const variants = await db.postVariant.findMany({
    where: { accountId: { in: [...accountIds] } },
  });

  return NextResponse.json(
    accounts.map((a) => {
      const aAnalytics = analytics.filter((an) => an.accountId === a.id);
      const last = aAnalytics[aAnalytics.length - 1];
      const first = aAnalytics[0];
      const followerGrowth = last && first ? last.followers - first.followers : 0;
      const aVariants = variants.filter((v) => v.accountId === a.id);
      // Engagement = max of (SYNQUE variant engagement, analytics row engagement)
      // so real profile data entered at connect time isn't overwritten by 0
      // when no posts have been published through SYNQUE yet.
      const variantEng = aVariants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
      const analyticsEng = aAnalytics.reduce((s, x) => s + x.engagement, 0);
      const engagement = Math.max(variantEng, analyticsEng);
      const impressions = aAnalytics.reduce((s, x) => s + x.impressions, 0);

      const h = a.health;
      const pos = h?.positiveCount ?? 0;
      const neu = h?.neutralCount ?? 0;
      const neg = h?.negativeCount ?? 0;
      const totalComments = pos + neu + neg;

      return {
        id: a.id,
        platform: a.platform,
        handle: a.handle,
        displayName: a.displayName,
        avatar: a.avatar,
        followers: a.followers,
        verified: a.verified,
        ownerId: a.ownerId,
        ownerName: a.owner.name,
        ownerAvatar: a.owner.avatar,
        ownerColor: a.owner.color,
        createdAt: a.createdAt.toISOString(),
        postsCount: a.postsCount,
        followerGrowth,
        impressions,
        engagement,
        analytics: aAnalytics.map((an) => ({
          date: an.date.toISOString(),
          followers: an.followers,
        })),
        health: h
          ? {
              positiveCount: pos,
              neutralCount: neu,
              negativeCount: neg,
              totalComments,
              positiveRatio: totalComments ? Math.round((pos / totalComments) * 100) : 0,
              neutralRatio: totalComments ? Math.round((neu / totalComments) * 100) : 0,
              negativeRatio: totalComments ? Math.round((neg / totalComments) * 100) : 0,
              reportCount: h.reportCount,
              reportTrend: h.reportTrend,
              riskScore: h.riskScore,
              riskLevel: h.riskLevel,
              status: h.status,
              riskReasons: h.riskReasons ? JSON.parse(h.riskReasons) : [],
              lastUpdated: h.lastUpdated.toISOString(),
            }
          : null,
        protection: a.protection
          ? {
              enabled: a.protection.enabled,
              dailyPostLimit: a.protection.dailyPostLimit,
              hourlyPostLimit: a.protection.hourlyPostLimit,
              minMinutesBetweenPosts: a.protection.minMinutesBetweenPosts,
              autoFlagSensitiveContent: a.protection.autoFlagSensitiveContent,
              blockDuplicateContent: a.protection.blockDuplicateContent,
              blockBannedHashtags: a.protection.blockBannedHashtags,
              bannedHashtags: a.protection.bannedHashtags,
              enforceWarmupProfile: a.protection.enforceWarmupProfile,
              limitDMsPerHour: a.protection.limitDMsPerHour,
              limitFollowsPerHour: a.protection.limitFollowsPerHour,
              limitCommentsPerHour: a.protection.limitCommentsPerHour,
              pausePostingOnWarning: a.protection.pausePostingOnWarning,
              cooldownHoursOnFlag: a.protection.cooldownHoursOnFlag,
              requireTwoFactor: a.protection.requireTwoFactor,
              lastAudit: a.protection.lastAudit?.toISOString() ?? null,
            }
          : null,
      };
    })
  );
}

/** Connect a new account with credentials (credentials are NOT stored in plain text). */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { platform, handle, displayName, loginEmail, businessAccount, ownerId, followers, verified, postsCount, impressions, engagement, reach } = body as {
    platform: string;
    handle: string;
    displayName: string;
    loginEmail?: string;
    businessAccount?: boolean;
    ownerId?: string;
    followers?: number;
    verified?: boolean;
    postsCount?: number;
    impressions?: number;
    engagement?: number;
    reach?: number;
  };

  if (!platform || !handle || !displayName) {
    return NextResponse.json({ error: "platform, handle, displayName required" }, { status: 400 });
  }

  if (!ownerId) {
    return NextResponse.json({ error: "ownerId is required" }, { status: 400 });
  }

  // Check for duplicate handle on the same platform
  const existing = await db.account.findFirst({
    where: { platform, handle },
  }).catch((e) => console.error("[api]", e));
  if (existing) {
    return NextResponse.json({ error: "An account with this handle already exists" }, { status: 409 });
  }

  const realFollowers = typeof followers === "number" && followers >= 0 ? followers : 0;
  const realPosts = typeof postsCount === "number" && postsCount >= 0 ? postsCount : 0;
  const realImpressions = typeof impressions === "number" && impressions >= 0 ? impressions : 0;
  const realEngagement = typeof engagement === "number" && engagement >= 0 ? engagement : 0;
  const realReach = typeof reach === "number" && reach >= 0 ? reach : 0;

  // Create the account with real profile metrics from the platform.
  const account = await db.account.create({
    data: {
      platform,
      handle,
      displayName,
      avatar: null,
      followers: realFollowers,
      postsCount: realPosts,
      verified: verified === true,
      ownerId,
      health: { create: { riskScore: 5, riskLevel: "safe", status: "healthy", riskReasons: "[]" } },
      protection: { create: { enabled: true } },
    },
  });

  // Seed analytics with real data so the dashboard + account card show truth
  await db.analyticsDaily.create({
    data: {
      accountId: account.id,
      date: new Date(),
      followers: realFollowers,
      impressions: realImpressions,
      reach: realReach,
      engagement: realEngagement,
      posts: realPosts,
    },
  }).catch((e) => console.error("[api]", e));

  // Log the connection activity
  await db.activity.create({
    data: {
      userId: ownerId,
      type: "account_connected",
      description: `connected ${handle} on ${platform}`,
    },
  }).catch((e) => console.error("[api]", e));

  return NextResponse.json({ id: account.id, ok: true });
}
