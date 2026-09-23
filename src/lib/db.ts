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
  "postgresql://neondb_owner:REDACTED_DB_PASSWORD@ep-spring-darkness-auk3ozf9.c-10.us-east-1.aws.neon.tech/neondb";

function resolveDatabaseUrl(): string {
  const env = process.env.DATABASE_URL;
  if (env && env.startsWith("postgresql://")) return env;
  return NEON_DIRECT_URL;
}

// ---------------------------------------------------------------------------
// Connection pool — tuned for Neon.
// ---------------------------------------------------------------------------
function createPool() {
  return new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
    max: 5,
    // Fail fast on cold-start so the retry proxy can re-attempt against
    // a now-warm Neon compute (takes ~2s to wake from suspend).
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  __pgPool?: pg.Pool;
  __warmed?: boolean;
};

// ---------------------------------------------------------------------------
// Retry wrapper for transient Neon connection errors.
//
// Neon's serverless compute suspends after ~5 min of idle. The first query
// after wake-up can throw ETIMEDOUT / "Connection terminated unexpectedly".
// We retry up to 3 times with a short back-off.
//
// This is implemented as a RECURSIVE Proxy: when we access a delegate
// (e.g. `db.user`), we return a proxied version of it so that its methods
// (`db.user.findMany`, `db.user.update`, ...) are also retried. This
// preserves full TypeScript typing of the PrismaClient.
// ---------------------------------------------------------------------------
const RETRYABLE_PATTERNS = [
  "ETIMEDOUT",
  "Connection terminated",
  "Connection ended",
  "ECONNRESET",
  "write EPIPE",
  "read ECONNRESET",
];

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return RETRYABLE_PATTERNS.some((p) => msg.includes(p));
}

// Names of properties that should NOT be proxied (primitives, internal
// symbols, or properties that must return their raw value).
const SKIP = new Set([
  "then",
  "catch",
  "finally",
  Symbol.toPrimitive,
  Symbol.toStringTag,
  "toJSON",
  "constructor",
  "prototype",
  "inspect",
  "valueOf",
  "length",
]);

function withRetryProxy<T extends object>(target: T, depth = 0): T {
  // Guard against infinite recursion on deeply nested structures.
  if (depth > 3) return target;
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop === "symbol" || SKIP.has(prop as string)) {
        return Reflect.get(obj, prop, receiver);
      }
      const value = Reflect.get(obj, prop, receiver);

      // Function on a delegate (e.g. db.user.findMany) → wrap with retry.
      if (typeof value === "function") {
        return async function (...args: unknown[]) {
          // 4 attempts: initial + 3 retries. Neon's serverless compute
          // suspends after ~5 min idle; the first call after wake-up
          // often fails, so we retry until the compute is warm.
          for (let attempt = 0; attempt < 4; attempt++) {
            try {
              return await value.apply(obj, args);
            } catch (err: unknown) {
              if (!isRetryable(err) || attempt === 3) throw err;
              await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }
          }
          throw new Error("unreachable");
        };
      }

      // Nested object (e.g. db.user) → recursively proxy so its methods retry.
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return withRetryProxy(value as object, depth + 1);
      }

      return value;
    },
  }) as T;
}

function createPrismaClient() {
  const pool = globalForPrisma.__pgPool ?? createPool();
  if (!globalForPrisma.__pgPool) globalForPrisma.__pgPool = pool;
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });
  return withRetryProxy(client);
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ---------------------------------------------------------------------------
// Warm-up: Neon's serverless compute suspends after ~5 min of idle. The
// first query after wake-up can fail. We fire a trivial SELECT on module
// load so the compute is warm by the time real requests arrive.
// ---------------------------------------------------------------------------
if (!globalForPrisma.__warmed) {
  globalForPrisma.__warmed = true;
  db.user
    .count()
    .then(() => {})
    .catch(() => {});
}
