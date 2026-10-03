import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";

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
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

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

  // Verify the message is in the caller's tenant before updating.
  const existing = await db.whatsAppMessage.findFirst({
    where: scope.isSuperAdmin
      ? { id }
      : { id, savedBy: { customerId: scope.customerId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  await db.whatsAppMessage.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id } = await params;

  // Verify the message is in the caller's tenant before deleting.
  const existing = await db.whatsAppMessage.findFirst({
    where: scope.isSuperAdmin
      ? { id }
      : { id, savedBy: { customerId: scope.customerId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  await db.whatsAppMessage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
