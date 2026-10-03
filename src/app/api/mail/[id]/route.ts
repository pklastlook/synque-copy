import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id } = await params;

  // Verify the mail server belongs to the caller's tenant before deleting.
  const server = await db.mailServer.findFirst({
    where: { id, ...tenantWhere(scope) as Record<string, unknown> },
    select: { id: true },
  });
  if (!server) {
    return NextResponse.json({ error: "Mail server not found" }, { status: 404 });
  }

  // Delete related mailboxes and messages first
  const mailboxes = await db.mailbox.findMany({ where: { serverId: id } });
  for (const mb of mailboxes) {
    await db.mailMessage.deleteMany({ where: { mailboxId: mb.id } }).catch(() => {});
  }
  await db.mailbox.deleteMany({ where: { serverId: id } }).catch(() => {});
  await db.mailServer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
