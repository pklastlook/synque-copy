import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "manager", "editor", "member", "viewer"];

/** PATCH — update a teammate's role / title / status.
 *
 * Security (P1-2-b):
 * - Requires `manager` role (or above) — the read-only demo viewer can no longer
 *   call this route.
 * - Tenant-scoped: the target user must belong to the caller's tenant. Uses
 *   `findFirst({ where: { id, ...tenantWhere(scope) }})` instead of
 *   `update({ where: { id }})` so a cross-tenant attempt hits a 404, not a
 *   silent mutation.
 * - Role escalation is admin-only (mirrors the /api/users PATCH guard): a
 *   manager can update title/status but NOT role.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(req, "manager");
  if (error) return error;

  const { id } = await params;
  const scope = getTenantScope(user!);

  // Verify the target user exists AND belongs to the caller's tenant.
  const existing = await db.user.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  // role is admin-only — a manager must NOT be able to escalate anyone.
  if (typeof body.role === "string") {
    if (user!.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can change user roles" },
        { status: 403 }
      );
    }
    if (!ALLOWED_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
  }
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.color === "string") data.color = body.color;
  if (typeof body.status === "string") {
    if (!["active", "suspended", "invited"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  const updated = await db.user.update({ where: { id }, data });

  // Audit role changes (only when role was actually mutated).
  if (data.role) {
    await audit(req, user!.userId, "user.role_changed", {
      targetType: "user",
      targetId: id,
      metadata: { role: data.role },
    });
  }

  return NextResponse.json({ ok: true, id: updated.id });
}

/** DELETE — remove a teammate. Accounts owned by this user are reassigned to
 *  `newOwnerId` if provided (e.g. the admin who removes them); otherwise they
 *  are left intact and the FK constraint will fail, in which case we return 409.
 *
 * Security (P1-2-b):
 * - Requires `manager` role.
 * - Tenant-scoped: the target AND the reassign target must both belong to the
 *   caller's tenant.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireRole(req, "manager");
  if (error) return error;

  const { id } = await params;
  const scope = getTenantScope(user!);
  const newOwnerId = req.nextUrl.searchParams.get("reassignTo");

  // Verify the target user exists AND belongs to the caller's tenant.
  const existing = await db.user.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If the user owns accounts, reassign ownership before deletion (otherwise
  // the FK constraint on Account.ownerId will block the delete).
  const ownedAccounts = await db.account.findMany({
    where: { ownerId: id, ...tenantWhere(scope) as { customerId?: string } },
  });
  if (ownedAccounts.length > 0) {
    if (!newOwnerId) {
      return NextResponse.json(
        {
          error: "User owns accounts — reassign them first via ?reassignTo=<userId>",
        },
        { status: 409 }
      );
    }
    // Verify the reassign target also belongs to the caller's tenant.
    const newOwner = await db.user.findFirst({
      where: { id: newOwnerId, ...tenantWhere(scope) as { customerId?: string } },
      select: { id: true },
    });
    if (!newOwner) {
      return NextResponse.json({ error: "reassignTo user not found" }, { status: 404 });
    }
    await db.account.updateMany({ where: { ownerId: id }, data: { ownerId: newOwnerId } });
  }

  // Reassign authored posts as well.
  await db.post.updateMany({ where: { authorId: id }, data: { authorId: newOwnerId ?? id } }).catch(() => {});

  // Audit the user deletion BEFORE the row is removed (so we can still
  // resolve the targetId if needed). Best-effort — never blocks.
  await audit(req, user!.userId, "user.deleted", {
    targetType: "user",
    targetId: id,
  });

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
