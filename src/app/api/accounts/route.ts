import { NextResponse } from "next/server";
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
