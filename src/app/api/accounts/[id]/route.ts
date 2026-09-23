import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["handle", "displayName", "avatar", "verified", "ownerId"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  await db.account.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Delete related records first to avoid foreign key constraint violations
  await db.analyticsDaily.deleteMany({ where: { accountId: id } }).catch(() => {});
  await db.comment.deleteMany({ where: { accountId: id } }).catch(() => {});
  await db.postVariant.deleteMany({ where: { accountId: id } }).catch(() => {});
  await db.accountHealth.deleteMany({ where: { accountId: id } }).catch(() => {});
  await db.accountProtection.deleteMany({ where: { accountId: id } }).catch(() => {});
  await db.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
