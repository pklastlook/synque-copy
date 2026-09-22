import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Delete related mailboxes and messages first
  const mailboxes = await db.mailbox.findMany({ where: { serverId: id } });
  for (const mb of mailboxes) {
    await db.mailMessage.deleteMany({ where: { mailboxId: mb.id } }).catch(() => {});
  }
  await db.mailbox.deleteMany({ where: { serverId: id } }).catch(() => {});
  await db.mailServer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
