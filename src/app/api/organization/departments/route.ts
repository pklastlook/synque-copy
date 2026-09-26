import { NextRequest, NextResponse } from "next/server";
import { requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

/** GET /api/organization/departments — list departments for this tenant (from tenant DB if provisioned). */
export async function GET(req: NextRequest) {
  const { user, error } = requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb, isTenantIsolated } = await getDbForUser(user!);
  const where = isTenantIsolated ? {} : tenantWhere(scope);

  const departments = await targetDb.department.findMany({
    where,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(departments);
}

/** POST /api/organization/departments — create a new department in the tenant DB. */
export async function POST(req: NextRequest) {
  const { user, error } = requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);

  const body = await req.json();
  const { name, description, color, headUserId } = body as {
    name: string;
    description?: string;
    color?: string;
    headUserId?: string;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const dept = await targetDb.department.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color?.trim() || null,
        headUserId: headUserId?.trim() || null,
        customerId: scope.customerId,
      },
    });
    return NextResponse.json({ ok: true, id: dept.id, department: dept });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create department";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
