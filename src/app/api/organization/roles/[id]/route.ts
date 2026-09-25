import { NextRequest, NextResponse } from "next/server";
import { requireRole, getTenantScope } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

/** PATCH /api/organization/roles/[id] — update a role. System roles cannot be renamed. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);
  const { id } = await params;

  const existing = await targetDb.role.findUnique({ where: { id } }).catch(() => null);
  if (!existing || existing.customerId !== scope.customerId) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    if (existing.isSystem) {
      return NextResponse.json(
        { error: "Built-in role names cannot be changed" },
        { status: 400 },
      );
    }
    data.name = body.name.trim();
  }
  if (typeof body.description === "string") {
    data.description = body.description.trim() || null;
  }
  if (typeof body.level === "number") {
    data.level = body.level;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  try {
    const updated = await targetDb.role.update({ where: { id }, data });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update role";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/** DELETE /api/organization/roles/[id] — delete a custom role. System roles are protected. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);
  const { id } = await params;

  const existing = await targetDb.role.findUnique({ where: { id } }).catch(() => null);
  if (!existing || existing.customerId !== scope.customerId) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (existing.isSystem) {
    return NextResponse.json(
      { error: "Built-in roles cannot be deleted" },
      { status: 400 },
    );
  }

  // Count users currently using this role name — refuse if any are still on it.
  const usersWithRole = await targetDb.user.count({
    where: { role: existing.name, ...(scope.customerId ? { customerId: scope.customerId } : {}) },
  });
  if (usersWithRole > 0) {
    return NextResponse.json(
      { error: `${usersWithRole} user(s) still have this role. Reassign them first.` },
      { status: 409 },
    );
  }

  await targetDb.role.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
