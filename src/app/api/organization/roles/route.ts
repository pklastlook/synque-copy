import { NextRequest, NextResponse } from "next/server";
import { requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { getDbForUser, type TenantPrismaClient } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

// These 5 role names are reserved — they're the actual role strings used by
// the auth-guard's ROLE_HIERARCHY (see src/lib/auth-guard.ts). We refuse to
// let users create Role rows with these names to avoid confusing the auth
// system with duplicate / shadow role names.
// The Role table itself starts EMPTY — the admin adds whatever roles they
// want via the management UI.
const RESERVED_ROLE_NAMES = ["admin", "manager", "editor", "member", "viewer"];

/** GET /api/organization/roles — list all roles for this tenant (from tenant DB if provisioned). */
export async function GET(req: NextRequest) {
  const { user, error } = await requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb, isTenantIsolated } = await getDbForUser(user!);

  // For tenant-isolated DBs we don't filter by customerId (the DB is already isolated).
  // For the main DB (super-admin or legacy tenant) we filter rows by customerId.
  const where = isTenantIsolated ? {} : tenantWhere(scope);

  const roles = await targetDb.role.findMany({
    where,
    orderBy: [{ level: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(roles);
}

/** POST /api/organization/roles — create a custom role in the tenant DB. */
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);

  const body = await req.json();
  const { name, description, level } = body as {
    name: string;
    description?: string;
    level?: number;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Reserved role names — prevent collision with the auth system's role hierarchy.
  if (RESERVED_ROLE_NAMES.includes(name.trim().toLowerCase())) {
    return NextResponse.json(
      { error: "This role name is reserved by the auth system — choose a different name" },
      { status: 400 },
    );
  }

  try {
    const role = await targetDb.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        level: typeof level === "number" ? level : 2,
        isSystem: false,
        customerId: scope.customerId,
      },
    });
    return NextResponse.json({ ok: true, id: role.id, role });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create role";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
