import { PrismaClient } from "../../generated/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Resolve the database URL for the Neon WebSocket adapter.
 *
 * During `next build`, the database isn't available. We return a dummy URL
 * so the Prisma client can be instantiated without crashing the build.
 * The real URL is used at runtime (dev or production server).
 */
function resolveDatabaseUrl(): string {
  // Try DIRECT_URL first (not overridden by OS env)
  const direct = process.env.DIRECT_URL;
  if (direct && direct.startsWith("postgresql://")) return cleanUrl(direct);

  // Fall back to DATABASE_URL
  const db = process.env.DATABASE_URL;
  if (db && db.startsWith("postgresql://")) return cleanUrl(db);

  // During build (next build), return a dummy URL so Prisma client
  // can be instantiated without crashing. The real URL will be available
  // at runtime when the server starts.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "postgresql://dummy:dummy@dummy.neon.tech/dummy?sslmode=require";
  }

  throw new Error(
    "No PostgreSQL connection URL found. Set DATABASE_URL or DIRECT_URL in .env"
  );
}

function cleanUrl(url: string): string {
  // Strip channel_binding=require — the Neon WebSocket driver doesn't support it
  return url.replace(/&?channel_binding=require/g, "").replace(/\?$/, "");
}

function createPrismaClient() {
  const connectionString = resolveDatabaseUrl();
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Warm up the Neon connection on module load (prevents cold-start timeout
// on the first login attempt). This runs once when the server starts.
// Skip during build (no real database connection available).
if (!globalForPrisma.prisma && process.env.NEXT_PHASE !== "phase-production-build") {
  db.user.count().then((n) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[db] Neon warm-up OK — ${n} users`);
    }
  }).catch(() => {
    // Silent fail — the first real query will retry
  });
  globalForPrisma.prisma = db;
}
