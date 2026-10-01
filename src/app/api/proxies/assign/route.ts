import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/** POST /api/proxies/assign — assign a proxy to an account */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { accountId, proxyId } = await req.json();
  if (!accountId || !proxyId) {
    return NextResponse.json({ error: "accountId and proxyId required" }, { status: 400 });
  }

  // Deactivate any existing proxy assignment for this account
  await db.accountProxy.updateMany({
    where: { accountId, active: true },
    data: { active: false },
  });

  // Create new assignment
  const assignment = await db.accountProxy.upsert({
    where: { accountId_proxyId: { accountId, proxyId } },
    update: { active: true, assignedAt: new Date() },
    create: { accountId, proxyId, active: true },
  });

  // Log the rotation
  await db.proxyRotation.create({
    data: {
      proxyId,
      accountId,
      action: "assigned",
      status: "success",
    },
  });

  return NextResponse.json({ ok: true, assignment });
}

/** DELETE /api/proxies/assign — remove proxy from account */
export async function DELETE(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const accountId = req.nextUrl.searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

  await db.accountProxy.updateMany({
    where: { accountId, active: true },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
