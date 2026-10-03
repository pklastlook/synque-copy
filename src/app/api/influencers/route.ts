import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * Influencer Tracker — list + create.
 *
 * GET /api/influencers?status=active
 *   Returns influencers filtered by status (default: all), scoped to the
 *   caller's tenant (super-admins see all).
 *
 * POST /api/influencers
 *   Body: { name, handle, platform, followers?, engagementRate?, cost?,
 *           estimatedReach?, estimatedEngagement?, status?, campaignId?, notes? }
 *   The new row is stamped with the caller's customerId.
 */

type InfluencerRow = NonNullable<Awaited<ReturnType<typeof db.influencer.findFirst>>>;

function serialize(i: InfluencerRow) {
  return {
    id: i.id,
    name: i.name,
    handle: i.handle,
    platform: i.platform,
    followers: i.followers,
    engagementRate: i.engagementRate,
    cost: i.cost,
    estimatedReach: i.estimatedReach,
    estimatedEngagement: i.estimatedEngagement,
    status: i.status,
    campaignId: i.campaignId,
    notes: i.notes,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const status = req.nextUrl.searchParams.get("status"); // active | paused | completed | draft
  const rows = await db.influencer.findMany({
    where: { ...(status ? { status } : {}), ...tenantWhere(scope) as { customerId?: string } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows.map(serialize));
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const {
    name, handle, platform,
    followers, engagementRate, cost,
    estimatedReach, estimatedEngagement,
    status, campaignId, notes,
  } = body as {
    name?: string;
    handle?: string;
    platform?: string;
    followers?: number;
    engagementRate?: number;
    cost?: number;
    estimatedReach?: number;
    estimatedEngagement?: number;
    status?: string;
    campaignId?: string;
    notes?: string;
  };

  if (!name || !handle || !platform) {
    return NextResponse.json(
      { error: "name, handle, and platform are required" },
      { status: 400 }
    );
  }

  const i = await db.influencer.create({
    data: {
      name,
      handle,
      platform,
      followers: followers ? Number(followers) : 0,
      engagementRate: engagementRate ? Number(engagementRate) : 0,
      cost: cost ? Number(cost) : 0,
      estimatedReach: estimatedReach ? Number(estimatedReach) : 0,
      estimatedEngagement: estimatedEngagement ? Number(estimatedEngagement) : 0,
      status: status ?? "active",
      campaignId: campaignId ?? null,
      notes: notes ?? null,
      customerId: scope.customerId,
    },
  });
  return NextResponse.json(serialize(i));
}
