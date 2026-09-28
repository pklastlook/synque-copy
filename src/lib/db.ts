import { PrismaClient } from "../../generated/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaInitPromise: Promise<PrismaClient> | undefined;
};

/**
 * Database client — supports Neon (production) + PGlite (local dev).
 *
 * Initialization is async (PGlite requires async import). We use a pattern
 * where `db` is a Proxy that forwards all calls to the real client once
 * initialization completes. During build, a dummy client is returned.
 */

function cleanUrl(url: string): string {
  return url.replace(/&?channel_binding=require/g, "").replace(/\?$/, "");
}

function getNeonUrl(): string | null {
  const direct = process.env.DIRECT_URL;
  if (direct && direct.startsWith("postgresql://")) return cleanUrl(direct);
  const db = process.env.DATABASE_URL;
  if (db && db.startsWith("postgresql://")) return cleanUrl(db);
  return null;
}

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function isPgliteMode(): boolean {
  return !getNeonUrl() && !isBuildPhase();
}

async function createPrismaClientAsync(): Promise<PrismaClient> {
  // Build phase — return dummy
  if (isBuildPhase()) {
    return createDummyClient();
  }

  // Neon (production)
  const neonUrl = getNeonUrl();
  if (neonUrl) {
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    const adapter = new PrismaNeon({ connectionString: neonUrl });
    return new PrismaClient({ adapter });
  }

  // PGlite (local dev)
  const { createPgliteAdapter } = await import("prisma-pglite");
  const dbUrl = process.env.DATABASE_URL;
  const dbDirPath = dbUrl?.startsWith("file:")
    ? dbUrl.replace("file:", "")
    : undefined;
  const adapter = await createPgliteAdapter(
    dbDirPath ? { directDatabaseDirPath: dbDirPath } : {}
  );
  return new PrismaClient({ adapter });
}

function createDummyClient(): PrismaClient {
  const dummy = () => Promise.resolve(undefined);
  const proxy: any = new Proxy(dummy, {
    get() {
      return proxy;
    },
    apply() {
      return Promise.resolve(undefined);
    },
  });
  return proxy as unknown as PrismaClient;
}

/**
 * Get the real PrismaClient, initializing if needed.
 * All db operations should use this.
 */
export async function getDb(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  if (!globalForPrisma.prismaInitPromise) {
    globalForPrisma.prismaInitPromise = createPrismaClientAsync().then((client) => {
      globalForPrisma.prisma = client;
      // Warm up
      client.user.count().then((n) => {
        if (process.env.NODE_ENV !== "production") {
          console.log(`[db] Warm-up OK — ${n} users`);
        }
      }).catch(() => {});
      return client;
    });
  }
  return globalForPrisma.prismaInitPromise;
}

/**
 * The `db` export. During build, this is a dummy. At runtime, it's a Proxy
 * that forwards to the real client (initialized on first access).
 *
 * Usage in API routes:
 *   import { db } from "@/lib/db"
 *   const users = await db.user.findMany()
 *
 * The Proxy intercepts `db.user` → returns a sub-proxy → `db.user.findMany()`
 * → calls the real client's `user.findMany()` once initialized.
 */
export const db: PrismaClient = isBuildPhase()
  ? createDummyClient()
  : createDbProxy();

function createDbProxy(): PrismaClient {
  // Create a function that, when called or property-accessed, delegates
  // to the real client (once initialized)
  const realGetter = () => globalForPrisma.prisma;

  const makeProxy = (path: string[]): any => {
    const fn = (...args: any[]) => {
      const real = realGetter();
      if (real) {
        // Navigate the path on the real client
        let target: any = real;
        for (const p of path) target = target[p];
        return target(...args);
      }
      // Not initialized yet — wait then call
      return getDb().then((client) => {
        let target: any = client;
        for (const p of path) target = target[p];
        return target(...args);
      });
    };

    return new Proxy(fn, {
      get(_, prop: string) {
        // Return a deeper proxy
        return makeProxy([...path, prop]);
      },
    });
  };

  return makeProxy([]) as unknown as PrismaClient;
}
