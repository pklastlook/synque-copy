import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const groups = await db.hashtagGroup.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    orderBy: { usageCount: "desc" },
  });
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
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { name, tags, platform, color } = body;
  if (!name || !tags) return NextResponse.json({ error: "name and tags required" }, { status: 400 });
  const g = await db.hashtagGroup.create({
    data: {
      name,
      tags,
      platform: platform ?? "all",
      color: color ?? "#E1306C",
      usageCount: 0,
      avgReach: 0,
      customerId: scope.customerId,
    },
  });
  return NextResponse.json({ id: g.id, ok: true });
}
