import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { provisionTenantDatabase } from "@/lib/tenant-provision";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // The customers list includes tenant DB metadata. The dbUrl column
  // contains a full Neon connection string WITH PASSWORD — leaking it
  // to non-admin users is a credential-disclosure vulnerability.
  // Restrict the entire GET to admins and NEVER return the dbUrl field.
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;

  const customers = await db.customer.findMany({
    include: { serialKey: true, invoices: true, quotations: true },
    orderBy: { createdAt: "desc" },
  });

  // Fetch tenant database statuses
  const tenantDbs = await db.tenantDatabase.findMany();
  const dbMap = new Map(tenantDbs.map((t) => [t.customerId, t]));

  return NextResponse.json(customers.map((c) => ({
    id: c.id, name: c.name, email: c.email, phone: c.phone, company: c.company,
    address: c.address, city: c.city, country: c.country, status: c.status, plan: c.plan,
    serialKey: c.serialKey ? { id: c.serialKey.id, key: c.serialKey.key, status: c.serialKey.status, activatedAt: c.serialKey.activatedAt?.toISOString() ?? null } : null,
    invoicesCount: c.invoices.length, quotationsCount: c.quotations.length,
    // SECURITY: only return safe metadata (id + name + status + dbName).
    // NEVER include dbUrl — it contains the full Neon password.
    database: dbMap.get(c.id) ? {
      id: dbMap.get(c.id)!.id,
      dbName: dbMap.get(c.id)!.dbName,
      status: dbMap.get(c.id)!.status,
      createdAt: dbMap.get(c.id)!.createdAt.toISOString(),
    } : null,
    createdAt: c.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;

  const body = await req.json();
  const { name, email, phone, company, address, city, country, plan, createDatabase } = body;
  if (!name || !email) return NextResponse.json({ error: "name and email required" }, { status: 400 });
  const existing = await db.customer.findUnique({ where: { email } }).catch((e) => console.error("[api]", e));
  if (existing) return NextResponse.json({ error: "Customer with this email exists" }, { status: 409 });

  const customer = await db.customer.create({
    data: { name, email, phone, company, address, city, country, plan: plan ?? "starter" },
  });

  // If the owner chose to create a database for this client
  if (createDatabase) {
    try {
      // Generate a database name from the company or customer name
      const rawName = (company || name).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const { dbName, encryptedDbUrl } = await provisionTenantDatabase(rawName);

      // Register it in the TenantDatabase table
      await db.tenantDatabase.create({
        data: {
          customerId: customer.id,
          dbName,
          dbUrl: encryptedDbUrl,
          status: "active",
        },
      });

      return NextResponse.json({
        id: customer.id,
        ok: true,
        databaseCreated: true,
        dbName,
      });
    } catch (e) {
      console.error("[customer] Database creation failed:", e);
      // The customer was created, but the database wasn't — return partial success
      return NextResponse.json({
        id: customer.id,
        ok: true,
        databaseCreated: false,
        dbError: e instanceof Error ? e.message : "Database creation failed",
      });
    }
  }

  return NextResponse.json({ id: customer.id, ok: true, databaseCreated: false });
}
