import { PrismaClient } from "../../generated/client";
import { createPgliteAdapter } from "prisma-pglite";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

async function createPrismaClient() {
  const adapter = await createPgliteAdapter();
  return new PrismaClient({ adapter });
}

// PGlite is async to initialize, so we use a top-level await pattern.
// In production (Neon/Postgres), this would be synchronous.
export const db = globalForPrisma.prisma ?? (await createPrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
