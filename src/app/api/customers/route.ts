import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";
import { encrypt } from "@/lib/crypto";
import { Client } from "pg";

export const dynamic = "force-dynamic";

/** The Neon connection base — same host as DATABASE_URL but connecting to the 'postgres' maintenance DB */
const NEON_HOST = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).host
  : new URL(process.env.DATABASE_URL || "").host;
const NEON_USER = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).username
  : new URL(process.env.DATABASE_URL || "").username;
const NEON_PASS = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).password
  : new URL(process.env.DATABASE_URL || "").password;

/** Create a dedicated database on Neon for a new client */
async function createTenantDatabase(dbName: string): Promise<string> {
  // Sanitize the database name (Neon requires lowercase, alphanumeric + underscore)
  const safeName = dbName.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "");

  // Connect to the maintenance database
  const maintUrl = `postgresql://${NEON_USER}:${encodeURIComponent(NEON_PASS)}@${NEON_HOST}/postgres?sslmode=require`;
  const client = new Client({ connectionString: maintUrl });

  try {
    await client.connect();

    // Check if database already exists
    const check = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [safeName]);
    if (check.rows.length === 0) {
      await client.query(`CREATE DATABASE "${safeName}"`);
    }

    // Build the connection URL for this database
    const dbUrl = `postgresql://${NEON_USER}:${encodeURIComponent(NEON_PASS)}@${NEON_HOST}/${safeName}?sslmode=require`;
    return dbUrl;
  } finally {
    await client.end();
  }
}

/** Push the Prisma schema to the newly created database.
 *  This makes sure the tenant DB has the Role, Department, Designation, User,
 *  Account, Post, etc. tables before any tenant user tries to query them. */
async function pushSchemaToTenantDb(dbUrl: string): Promise<void> {
  const { execSync } = await import("node:child_process");
  // Use prisma db push with the tenant's DATABASE_URL.
  // We pass through PATH so `node_modules/.bin/prisma` resolves.
  try {
    const nodeBin = process.cwd() + "/node_modules/.bin";
    execSync(`npx prisma db push --accept-data-loss`, {
      env: { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl, PATH: `${nodeBin}:${process.env.PATH ?? ""}` },
      stdio: "pipe",
      timeout: 90000,
    });
  } catch (e) {
    console.error("[tenant-db] Schema push failed:", e instanceof Error ? e.message : String(e));
    // Don't throw — the database is created, schema can be pushed later
  }
}

export async function GET(req: NextRequest) {
  // The customers list includes tenant DB metadata. The dbUrl column
  // contains a full Neon connection string WITH PASSWORD — leaking it
  // to non-admin users is a credential-disclosure vulnerability.
  // Restrict the entire GET to admins and NEVER return the dbUrl field.
  const { user, error } = requireRole(req, "admin");
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
  const { user, error } = requireRole(req, "admin");
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
      const dbName = rawName.length > 3 ? rawName : `client_${customer.id.slice(-8)}`;

      // 1. Create the database on Neon
      const dbUrl = await createTenantDatabase(dbName);

      // 2. Push the schema to the new database
      await pushSchemaToTenantDb(dbUrl);

      // 3. Register it in the TenantDatabase table
      // SECURITY (SECURITY-DATA Finding 3): encrypt the connection string
      // (which contains the Neon DB password) before persisting — never store
      // plaintext credentials at rest. Decryption happens lazily in
      // `src/lib/tenant-db.ts:getTenantDb()` right before opening the
      // PrismaClient. The GET endpoint above never returns dbUrl.
      await db.tenantDatabase.create({
        data: {
          customerId: customer.id,
          dbName,
          dbUrl: encrypt(dbUrl),
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
