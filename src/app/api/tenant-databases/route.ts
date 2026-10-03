import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { provisionTenantDatabase } from "@/lib/tenant-provision";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * /api/tenant-databases — registry of every dedicated Neon PostgreSQL
 * database provisioned for a Customer (tenant).
 *
 *   GET    → list every TenantDatabase row + customer info + live size
 *            (via `pg_database_size()` against the maintenance DB).
 *   POST   → provision a new database for an existing Customer that
 *            doesn't have one yet.
 *
 * All handlers are owner-only (`requireRole(req, "admin")`).
 */

const NEON_HOST = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).host
  : new URL(process.env.DATABASE_URL || "").host;
const NEON_USER = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).username
  : new URL(process.env.DATABASE_URL || "").username;
const NEON_PASS = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).password
  : new URL(process.env.DATABASE_URL || "").password;

/** Query the maintenance DB once for the on-disk size of every tenant DB.
 *  Returns a Map<dbName, sizeBytes>. Best-effort: returns an empty map
 *  if the maintenance connection can't be opened. */
async function getDatabaseSizes(dbNames: string[]): Promise<Map<string, number>> {
  if (dbNames.length === 0) return new Map();
  const maintUrl = `postgresql://${NEON_USER}:${encodeURIComponent(NEON_PASS)}@${NEON_HOST}/postgres?sslmode=require`;
  const client = new Client({ connectionString: maintUrl });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT datname, pg_database_size(datname) AS size FROM pg_database WHERE datname = ANY($1)",
      [dbNames],
    );
    return new Map(res.rows.map((r) => [r.datname, Number(r.size)]));
  } catch (e) {
    console.error(
      "[tenant-databases] size query failed:",
      e instanceof Error ? e.message : String(e),
    );
    return new Map();
  } finally {
    await client.end().catch(() => {});
  }
}

export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, "admin");
  if (error) return error;

  const [tenantDbs, customers] = await Promise.all([
    db.tenantDatabase.findMany({ orderBy: { createdAt: "desc" } }),
    db.customer.findMany({
      select: { id: true, name: true, email: true, status: true, plan: true },
    }),
  ]);
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // One round-trip to the maintenance DB for all sizes — much cheaper than
  // opening a connection per tenant.
  const sizes = await getDatabaseSizes(tenantDbs.map((t) => t.dbName));

  return NextResponse.json(
    tenantDbs.map((t) => {
      const customer = customerMap.get(t.customerId);
      const sizeBytes = sizes.get(t.dbName) ?? 0;
      return {
        id: t.id,
        dbName: t.dbName,
        status: t.status,
        customerId: t.customerId,
        customerName: customer?.name ?? "Unknown",
        customerEmail: customer?.email ?? "",
        customerStatus: customer?.status ?? "",
        customerPlan: customer?.plan ?? "",
        sizeBytes,
        sizeMb: Math.round((sizeBytes / (1024 * 1024)) * 10) / 10,
        healthy: t.status === "active" && sizeBytes > 0,
        createdAt: t.createdAt.toISOString(),
      };
    }),
  );
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { customerId } = body as { customerId?: string };
  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const existing = await db.tenantDatabase.findUnique({ where: { customerId } });
  if (existing) {
    return NextResponse.json(
      { error: "Customer already has a database", id: existing.id, dbName: existing.dbName },
      { status: 409 },
    );
  }

  try {
    const rawName = (customer.company || customer.name)
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const { dbName, encryptedDbUrl } = await provisionTenantDatabase(rawName);

    const td = await db.tenantDatabase.create({
      data: {
        customerId: customer.id,
        dbName,
        dbUrl: encryptedDbUrl,
        status: "active",
      },
    });

    await audit(req, user!.userId, "tenant_database.provisioned", {
      targetType: "tenant_database",
      targetId: td.id,
      metadata: { customerId: customer.id, dbName },
    });

    return NextResponse.json({ ok: true, id: td.id, dbName });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Provisioning failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
