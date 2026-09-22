import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const accounts = await db.account.findMany({
    include: { owner: true },
    orderBy: { followers: "desc" },
  });

  const analytics = await db.analyticsDaily.findMany();
  const variants = await db.postVariant.findMany();

  return NextResponse.json(
    accounts.map((a) => {
      const aAnalytics = analytics.filter((an) => an.accountId === a.id);
      const last = aAnalytics[aAnalytics.length - 1];
      const first = aAnalytics[0];
      const followerGrowth = last && first ? last.followers - first.followers : 0;
      const aVariants = variants.filter((v) => v.accountId === a.id);
      const engagement = aVariants.reduce((s, v) => s + v.likes + v.comments + v.shares, 0);
      const impressions = aAnalytics.reduce((s, x) => s + x.impressions, 0);

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
        postsCount: aVariants.length,
        followerGrowth,
        impressions,
        engagement,
      };
    })
  );
}

/** Connect a new account with credentials (credentials are NOT stored in plain text). */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { platform, handle, displayName, loginEmail, businessAccount, ownerId } = body as {
    platform: string;
    handle: string;
    displayName: string;
    loginEmail?: string;
    businessAccount?: boolean;
    ownerId?: string;
  };

  if (!platform || !handle || !displayName) {
    return NextResponse.json({ error: "platform, handle, displayName required" }, { status: 400 });
  }

  // Check for duplicate handle on the same platform
  const existing = await db.account.findFirst({
    where: { platform, handle },
  }).catch(() => null);
  if (existing) {
    return NextResponse.json({ error: "An account with this handle already exists" }, { status: 409 });
  }

  // Create the account. Credentials (loginEmail/password/token) are intentionally
  // NOT persisted in the DB for this demo — we only store the public profile.
  // In production these would be encrypted at rest (AES-256) in a secrets vault.
  const account = await db.account.create({
    data: {
      platform,
      handle,
      displayName,
      avatar: null,
      followers: 0,
      verified: false,
      ownerId: ownerId || "u-admin",
    },
  });

  // Seed a single analytics row so the new account shows up cleanly
  await db.analyticsDaily.create({
    data: {
      accountId: account.id,
      date: new Date(),
      followers: 0,
      impressions: 0,
      reach: 0,
      engagement: 0,
      posts: 0,
    },
  }).catch(() => null);

  // Log the connection activity
  await db.activity.create({
    data: {
      userId: ownerId || "u-admin",
      type: "account_connected",
      description: `connected ${handle} on ${platform}`,
    },
  }).catch(() => null);

  return NextResponse.json({ id: account.id, ok: true });
}
