import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.plan) data.plan = body.plan;
  if (body.amount !== undefined) data.amount = body.amount;
  if (body.endDate) data.endDate = new Date(body.endDate);
  await db.subscription.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.subscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
