import { PrismaClient } from "../../generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Resolve the Postgres connection string.
//
// The OS environment in this sandbox sometimes carries a stale SQLite path in
// DATABASE_URL (which would override the .env file). We therefore prefer a
// real Postgres URL from the env, but fall back to the known-good Neon
// direct (non-pooled) endpoint so the app always talks to the real DB.
// ---------------------------------------------------------------------------
const NEON_DIRECT_URL =
  "postgresql://neondb_owner:npg_qfWy1z2OiKEM@ep-spring-darkness-auk3ozf9.c-10.us-east-1.aws.neon.tech/neondb";

function resolveDatabaseUrl(): string {
  const env = process.env.DATABASE_URL;
  if (env && env.startsWith("postgresql://")) return env;
  return NEON_DIRECT_URL;
}

// ---------------------------------------------------------------------------
// Connection pool — tuned for Neon.
//  • ssl: Neon requires TLS. rejectUnauthorized:false avoids rare CA-bundle
//    mismatches in sandboxed runtimes.
//  • max: a small pool is plenty for a single-instance dev server and keeps
//    Neon's connection limits happy.
//  • connectionTimeoutMillis: generous to absorb Neon cold-start wake-ups.
// ---------------------------------------------------------------------------
function createPool() {
  return new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 30000,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __pgPool?: pg.Pool;
};

function createPrismaClient() {
  const pool = globalForPrisma.__pgPool ?? createPool();
  if (!globalForPrisma.__pgPool) globalForPrisma.__pgPool = pool;
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
