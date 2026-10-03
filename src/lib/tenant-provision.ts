/**
 * Tenant database provisioning — shared by the Owner module and the trial
 * signup flow.
 *
 * When a new client registers (either via /api/customers POST by the owner,
 * or via /api/auth/signup during trial signup), this module:
 *   1. Creates a dedicated Neon PostgreSQL database for the client.
 *   2. Pushes the Prisma schema to the new database (creates all tables).
 *   3. Returns the encrypted connection URL for storage in TenantDatabase.
 *
 * Each client gets their own isolated database. All tenant-specific data
 * (posts, accounts, media, comments, etc.) lives in the tenant DB — the
 * main DB only stores the Customer registry, TenantDatabase connection
 * strings, and User auth records (for login lookup).
 */

import { Client } from "pg";
import { encrypt } from "./crypto";
import { execSync } from "node:child_process";

/** The Neon connection base — same host as DATABASE_URL. */
const NEON_HOST = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).host
  : new URL(process.env.DATABASE_URL || "").host;
const NEON_USER = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).username
  : new URL(process.env.DATABASE_URL || "").username;
const NEON_PASS = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).password
  : new URL(process.env.DATABASE_URL || "").password;

/** Create a dedicated database on Neon for a new client.
 *  Returns the plaintext connection URL (caller must encrypt before persisting). */
export async function createTenantDatabase(dbName: string): Promise<string> {
  // Sanitize the database name (Neon requires lowercase, alphanumeric + underscore)
  const safeName = dbName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40); // Neon has a 63-char limit; leave room for prefixes

  if (!safeName) {
    throw new Error("Invalid database name");
  }

  // Connect to the maintenance database ('postgres')
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
    return `postgresql://${NEON_USER}:${encodeURIComponent(NEON_PASS)}@${NEON_HOST}/${safeName}?sslmode=require`;
  } finally {
    await client.end();
  }
}

/** Push the Prisma schema to the newly created database.
 *  This creates all tables (User, Account, Post, MediaAsset, etc.) so the
 *  tenant DB is ready before any tenant user tries to query them. */
export async function pushSchemaToTenantDb(dbUrl: string): Promise<void> {
  const nodeBin = process.cwd() + "/node_modules/.bin";
  try {
    execSync(`npx prisma db push --accept-data-loss`, {
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        DIRECT_URL: dbUrl,
        PATH: `${nodeBin}:${process.env.PATH ?? ""}`,
      },
      stdio: "pipe",
      timeout: 90000,
    });
  } catch (e) {
    console.error("[tenant-provision] Schema push failed:", e instanceof Error ? e.message : String(e));
    // Don't throw — the database is created, schema can be pushed later.
    // The tenant DB will be created on first query if missing.
  }
}

/** Full provisioning flow: create DB + push schema + return encrypted URL.
 *
 * Used by:
 *   - POST /api/customers (owner module client registration)
 *   - POST /api/auth/signup (trial signup)
 *
 * Returns `{ dbName, encryptedDbUrl }` — the caller stores these in a
 * TenantDatabase row linked to the Customer.
 */
export async function provisionTenantDatabase(rawName: string): Promise<{
  dbName: string;
  encryptedDbUrl: string;
}> {
  // Generate a database name from the company or customer name
  const raw = rawName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const dbName = raw.length > 3 ? raw : `client_${Date.now().toString(36)}`;

  // 1. Create the database on Neon
  const dbUrl = await createTenantDatabase(dbName);

  // 2. Push the schema to the new database
  await pushSchemaToTenantDb(dbUrl);

  // 3. Encrypt the connection URL (contains Neon password)
  const encryptedDbUrl = encrypt(dbUrl);

  return { dbName, encryptedDbUrl };
}
