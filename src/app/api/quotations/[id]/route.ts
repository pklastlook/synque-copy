import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["status", "notes", "validUntil"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (k === "validUntil") data[k] = body[k] ? new Date(body[k]) : null;
      else data[k] = body[k];
    }
  }
  await db.quotation.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.quotation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
