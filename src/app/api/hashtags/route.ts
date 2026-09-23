import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const groups = await db.hashtagGroup.findMany({ orderBy: { usageCount: "desc" } });
  const totalUses = groups.reduce((s, g) => s + g.usageCount, 0);
  const totalReach = groups.reduce((s, g) => s + g.avgReach, 0);
  return NextResponse.json({
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      tags: g.tags,
      platform: g.platform,
      usageCount: g.usageCount,
      avgReach: g.avgReach,
      color: g.color,
      tagCount: g.tags.split(",").filter(Boolean).length,
      createdAt: g.createdAt.toISOString(),
    })),
    totalUses,
    totalReach,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, tags, platform, color } = body;
  if (!name || !tags) return NextResponse.json({ error: "name and tags required" }, { status: 400 });
  const g = await db.hashtagGroup.create({
    data: { name, tags, platform: platform ?? "all", color: color ?? "#E1306C", usageCount: 0, avgReach: 0 },
  });
  return NextResponse.json({ id: g.id, ok: true });
}
