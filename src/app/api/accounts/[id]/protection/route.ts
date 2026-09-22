import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET protection settings for an account */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const protection = await db.accountProtection.findUnique({ where: { accountId: id } });
  if (!protection) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    enabled: protection.enabled,
    dailyPostLimit: protection.dailyPostLimit,
    hourlyPostLimit: protection.hourlyPostLimit,
    minMinutesBetweenPosts: protection.minMinutesBetweenPosts,
    autoFlagSensitiveContent: protection.autoFlagSensitiveContent,
    blockDuplicateContent: protection.blockDuplicateContent,
    blockBannedHashtags: protection.blockBannedHashtags,
    bannedHashtags: protection.bannedHashtags,
    enforceWarmupProfile: protection.enforceWarmupProfile,
    limitDMsPerHour: protection.limitDMsPerHour,
    limitFollowsPerHour: protection.limitFollowsPerHour,
    limitCommentsPerHour: protection.limitCommentsPerHour,
    pausePostingOnWarning: protection.pausePostingOnWarning,
    cooldownHoursOnFlag: protection.cooldownHoursOnFlag,
    requireTwoFactor: protection.requireTwoFactor,
    lastAudit: protection.lastAudit?.toISOString() ?? null,
  });
}

/** PATCH (update) protection settings */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  // Find or create the protection row
  let protection = await db.accountProtection.findUnique({ where: { accountId: id } });
  if (!protection) {
    protection = await db.accountProtection.create({ data: { accountId: id } });
  }

  const allowed: (keyof typeof protection)[] = [
    "enabled",
    "dailyPostLimit",
    "hourlyPostLimit",
    "minMinutesBetweenPosts",
    "autoFlagSensitiveContent",
    "blockDuplicateContent",
    "blockBannedHashtags",
    "bannedHashtags",
    "enforceWarmupProfile",
    "limitDMsPerHour",
    "limitFollowsPerHour",
    "limitCommentsPerHour",
    "pausePostingOnWarning",
    "cooldownHoursOnFlag",
    "requireTwoFactor",
  ];

  const data: Record<string, unknown> = { lastAudit: new Date() };
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const updated = await db.accountProtection.update({ where: { accountId: id }, data });
  return NextResponse.json({ ok: true, lastAudit: updated.lastAudit?.toISOString() });
}
