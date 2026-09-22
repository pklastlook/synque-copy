import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const competitors = await db.competitor.findMany({
    include: { snapshots: { orderBy: { date: "asc" } } },
    orderBy: { followers: "desc" },
  });
  return NextResponse.json(
    competitors.map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
      platform: c.platform,
      avatar: c.avatar,
      followers: c.followers,
      engagementRate: c.engagementRate,
      growthRate: c.growthRate,
      postingFreq: c.postingFreq,
      status: c.status,
      notes: c.notes,
      series: c.snapshots.map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        followers: s.followers,
        engagement: s.engagement,
        posts: s.posts,
      })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, handle, platform, notes } = body;
  if (!name || !handle || !platform) return NextResponse.json({ error: "name, handle, platform required" }, { status: 400 });
  const c = await db.competitor.create({
    data: {
      name,
      handle,
      platform,
      notes,
      followers: 0,
      engagementRate: 0,
      growthRate: 0,
      postingFreq: 0,
    },
  });
  // seed a snapshot
  await db.competitorSnapshot.create({ data: { competitorId: c.id, date: new Date(), followers: 0, engagement: 0, posts: 0 } });
  return NextResponse.json({ id: c.id, ok: true });
}
