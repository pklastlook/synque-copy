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
  const allowed = ["name", "handle", "platform", "notes", "status"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  const existing = await db.competitor.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  await db.competitor.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id } = await params;

  const existing = await db.competitor.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  await db.competitorSnapshot.deleteMany({ where: { competitorId: id } }).catch(() => {});
  await db.competitor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
