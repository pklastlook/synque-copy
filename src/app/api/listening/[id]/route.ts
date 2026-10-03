import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "keywords", "type", "color", "status"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  // Tenant scope: ensure the listening query belongs to the caller's customer
  // (super-admins bypass). Returns 404 if the row exists but is in another
  // tenant — prevents both IDOR and existence leak.
  const existing = await db.listeningQuery.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Listening query not found" }, { status: 404 });
  }

  await db.listeningQuery.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id } = await params;

  const existing = await db.listeningQuery.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Listening query not found" }, { status: 404 });
  }

  await db.mention.deleteMany({ where: { queryId: id } }).catch(() => {});
  await db.listeningQuery.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
