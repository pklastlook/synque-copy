import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/whatsapp/[id]
 *   Body: { status?, postId? }
 *   Updates a WhatsApp message's status (new → used | archived) or links it to a published post.
 *
 * DELETE /api/whatsapp/[id]
 *   Removes a pasted message.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    data.status = body.status;
  }
  if (typeof body.postId === "string") {
    data.postId = body.postId;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await db.whatsAppMessage.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = requireAuth(req);
  if (error) return error;

  const { id } = await params;
  await db.whatsAppMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
