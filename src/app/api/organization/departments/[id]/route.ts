import { NextRequest, NextResponse } from "next/server";
import { requireRole, getTenantScope } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

/** PATCH /api/organization/departments/[id] */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);
  const { id } = await params;

  const existing = await targetDb.department.findUnique({ where: { id } }).catch((e) => console.error("[api]", e));
  if (!existing || existing.customerId !== scope.customerId) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description.trim() || null;
  if (typeof body.color === "string") data.color = body.color.trim() || null;
  if (typeof body.headUserId === "string") data.headUserId = body.headUserId || null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  try {
    const updated = await targetDb.department.update({ where: { id }, data });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update department";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** DELETE /api/organization/departments/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);
  const { id } = await params;

  const existing = await targetDb.department.findUnique({ where: { id } }).catch((e) => console.error("[api]", e));
  if (!existing || existing.customerId !== scope.customerId) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  // Refuse if users are still on this department.
  const usersInDept = await targetDb.user.count({
    where: { department: existing.name, ...(scope.customerId ? { customerId: scope.customerId } : {}) },
  });
  if (usersInDept > 0) {
    return NextResponse.json(
      { error: `${usersInDept} user(s) are still in this department. Reassign them first.` },
      { status: 409 },
    );
  }

  await targetDb.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
