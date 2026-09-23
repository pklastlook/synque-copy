import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    data.resolvedAt = body.status !== "pending" ? new Date() : null;
  }
  if (body.comment !== undefined) data.comment = body.comment;
  await db.approval.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.approval.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
