import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id } = await params;
  const body = await req.json();
  const allowed = ["displayName", "ownerId", "status", "role", "quotaMb"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Verify the mailbox belongs to the caller's tenant before updating.
  const existing = await db.mailbox.findFirst({
    where: { id, ...tenantWhere(scope) as Record<string, unknown> },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

  await db.mailbox.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id } = await params;

  // Verify the mailbox belongs to the caller's tenant before deleting.
  const existing = await db.mailbox.findFirst({
    where: { id, ...tenantWhere(scope) as Record<string, unknown> },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

  await db.mailMessage.deleteMany({ where: { mailboxId: id } }).catch(() => {});
  await db.mailbox.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
