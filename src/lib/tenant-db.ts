import { PrismaClient } from "../../generated/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { db } from "./db";

const globalForTenant = globalThis as unknown as {
  __tenantDbs: Map<string, PrismaClient> | undefined;
};

const tenantCache: Map<string, PrismaClient> = globalForTenant.__tenantDbs ?? new Map();
globalForTenant.__tenantDbs = tenantCache;

function cleanUrl(url: string): string {
  return url.replace(/&?channel_binding=require/g, "").replace(/\?$/, "");
}

function makeClient(connectionString: string): PrismaClient {
  const cleaned = cleanUrl(connectionString);
  const adapter = new PrismaNeon({ connectionString: cleaned });
  return new PrismaClient({ adapter });
}

export type TenantPrismaClient = PrismaClient;

export async function getTenantDb(customerId: string | null | undefined): Promise<PrismaClient | null> {
  if (!customerId) return null;
  const cached = tenantCache.get(customerId);
  if (cached) return cached;
  const tenantRow = await db.tenantDatabase.findUnique({ where: { customerId } }).catch(() => null);
  if (!tenantRow || tenantRow.status !== "active" || !tenantRow.dbUrl) return null;
  const client = makeClient(tenantRow.dbUrl);
  tenantCache.set(customerId, client);
  return client;
}

export async function getDbForUser(user: { role: string; customerId: string | null }): Promise<{ db: PrismaClient; isTenantIsolated: boolean }> {
  const tenant = await getTenantDb(user.customerId);
  if (tenant) return { db: tenant, isTenantIsolated: true };
  return { db, isTenantIsolated: false };
}

export async function invalidateTenantDb(customerId: string): Promise<void> {
  const cached = tenantCache.get(customerId);
  if (cached) {
    await cached.$disconnect().catch(() => {});
    tenantCache.delete(customerId);
  }
}
