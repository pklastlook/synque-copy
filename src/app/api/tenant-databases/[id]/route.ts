import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { pushSchemaToTenantDb } from "@/lib/tenant-provision";
import { invalidateTenantDb } from "@/lib/tenant-db";

export const dynamic = "force-dynamic";

/**
 * /api/tenant-databases/[id] — manage a single tenant database.
 *
 *   PATCH  → update status (active | suspended).
 *   POST   → re-push the Prisma schema to the tenant DB.
 *
 * All handlers are owner-only (`requireRole(req, "admin")`).
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: string };
  if (!status || !["active", "suspended"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'active' or 'suspended'" },
      { status: 400 },
    );
  }

  const existing = await db.tenantDatabase.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
  }

  await db.tenantDatabase.update({ where: { id }, data: { status } });

  // Drop the cached PrismaClient so the next request for this tenant
  // re-reads the (possibly suspended) row from the registry.
  await invalidateTenantDb(existing.customerId);

  await audit(req, user!.userId, "tenant_database.status_changed", {
    targetType: "tenant_database",
    targetId: id,
    metadata: { from: existing.status, to: status, dbName: existing.dbName },
  });

  return NextResponse.json({ ok: true, id, status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;
  const { id } = await params;

  const td = await db.tenantDatabase.findUnique({ where: { id } });
  if (!td) {
    return NextResponse.json({ error: "Tenant database not found" }, { status: 404 });
  }

  try {
    // dbUrl is AES-256-GCM encrypted at rest — decrypt right before use.
    const dbUrl = decrypt(td.dbUrl);
    await pushSchemaToTenantDb(dbUrl);

    await audit(req, user!.userId, "tenant_database.schema_pushed", {
      targetType: "tenant_database",
      targetId: id,
      metadata: { dbName: td.dbName, customerId: td.customerId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Schema push failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
