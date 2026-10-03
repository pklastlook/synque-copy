import { NextRequest, NextResponse } from "next/server";
import { requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

/** GET /api/organization/designations — list designations for this tenant (from tenant DB if provisioned). */
export async function GET(req: NextRequest) {
  const { user, error } = await requireRole(req, "manager");
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb, isTenantIsolated } = await getDbForUser(user!);
  const where = isTenantIsolated ? {} : tenantWhere(scope);

  const designations = await targetDb.designation.findMany({
    where,
    orderBy: [{ level: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(designations);
}

/** POST /api/organization/designations — create a designation in the tenant DB. */
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

  try {
    const des = await targetDb.designation.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        level: typeof level === "number" ? level : 1,
        customerId: scope.customerId,
      },
    });
    return NextResponse.json({ ok: true, id: des.id, designation: des });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create designation";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
