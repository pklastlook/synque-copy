import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/influencers/[id]
 *   Update any field. Body: partial influencer payload.
 *   Numerics are coerced to Number() to handle JSON-form submissions.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const {
    name, handle, platform,
    followers, engagementRate, cost,
    estimatedReach, estimatedEngagement,
    status, campaignId, notes,
  } = body as Record<string, string | number | null | undefined>;

  const data: Record<string, unknown> = {};
  if (typeof name === "string") data.name = name;
  if (typeof handle === "string") data.handle = handle;
  if (typeof platform === "string") data.platform = platform;
  if (followers !== undefined) data.followers = Number(followers);
  if (engagementRate !== undefined) data.engagementRate = Number(engagementRate);
  if (cost !== undefined) data.cost = Number(cost);
  if (estimatedReach !== undefined) data.estimatedReach = Number(estimatedReach);
  if (estimatedEngagement !== undefined) data.estimatedEngagement = Number(estimatedEngagement);
  if (typeof status === "string") data.status = status;
  if (campaignId !== undefined) data.campaignId = campaignId;
  if (notes !== undefined) data.notes = notes;

  const updated = await db.influencer.update({ where: { id }, data });
  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    handle: updated.handle,
    platform: updated.platform,
    followers: updated.followers,
    engagementRate: updated.engagementRate,
    cost: updated.cost,
    estimatedReach: updated.estimatedReach,
    estimatedEngagement: updated.estimatedEngagement,
    status: updated.status,
    campaignId: updated.campaignId,
    notes: updated.notes,
    ok: true,
  });
}

/** DELETE /api/influencers/[id] — permanently remove an influencer. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.influencer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
