import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["title", "caption", "mediaUrl", "mediaType", "tone", "status", "scheduledAt"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      data[k] = k === "scheduledAt" && body[k] ? new Date(body[k]) : body[k];
    }
  }
  await db.post.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.postVariant.deleteMany({ where: { postId: id } }).catch(() => {});
  await db.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
