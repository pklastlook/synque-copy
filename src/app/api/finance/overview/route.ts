import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const NEON_HOST = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).host
  : new URL(process.env.DATABASE_URL || "").host;
const NEON_USER = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).username
  : new URL(process.env.DATABASE_URL || "").username;
const NEON_PASS = process.env.DIRECT_URL
  ? new URL(process.env.DIRECT_URL).password
  : new URL(process.env.DATABASE_URL || "").password;

/** Sum the on-disk size of every tenant DB. Best-effort: returns 0 when the
 *  maintenance connection can't be opened (e.g. local PGlite dev). */
async function getTotalTenantStorage(dbNames: string[]): Promise<number> {
  if (dbNames.length === 0) return 0;
  const maintUrl = `postgresql://${NEON_USER}:${encodeURIComponent(NEON_PASS)}@${NEON_HOST}/postgres?sslmode=require`;
  const client = new Client({ connectionString: maintUrl });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT COALESCE(SUM(pg_database_size(datname)), 0) AS total FROM pg_database WHERE datname = ANY($1)",
      [dbNames],
    );
    return Number(res.rows[0]?.total ?? 0);
  } catch (e) {
    console.error(
      "[finance/overview] tenant storage query failed:",
      e instanceof Error ? e.message : String(e),
    );
    return 0;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function GET(_req: NextRequest) {
  const [
    customers,
    invoices,
    quotations,
    serialKeys,
    devices,
    apiKeys,
    subscriptions,
    bankAccounts,
    users,
    accounts,
    posts,
    tenantDbs,
    auditCount,
    recentLogs,
    churnUsers,
  ] = await Promise.all([
    db.customer.count(),
    db.invoice.findMany({ select: { status: true, total: true } }),
    db.quotation.count(),
    db.serialKey.findMany({ select: { status: true } }),
    db.device.count(),
    db.apiKey.count(),
    db.subscription.findMany({ select: { status: true, amount: true, plan: true, trialEnds: true } }),
    db.bankAccount.count(),
    db.user.count(),
    db.account.count(),
    db.post.count(),
    db.tenantDatabase.findMany({ select: { dbName: true, status: true } }),
    db.auditLog.count(),
    db.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        actorId: true,
        targetType: true,
        targetId: true,
        metadata: true,
        ip: true,
        createdAt: true,
      },
    }),
    // Users linked to a tenant whose lastActive is older than 30 days
    // (or null). We resolve customer names in JS after the query.
    db.user.findMany({
      where: {
        customerId: { not: null },
        OR: [
          { lastActive: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          { lastActive: null },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        customerId: true,
        lastActive: true,
      },
    }),
  ]);

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const pendingRevenue = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0);
  const overdueRevenue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const activatedKeys = serialKeys.filter((k) => k.status === "activated").length;
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const trialSubs = subscriptions.filter((s) => s.status === "trial").length;
  const monthlyRevenue = subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amount, 0);

  // Trial conversion rate: customers whose trial ended AND are now active,
  // divided by everyone who ever had a trial (trial + converted).
  const convertedFromTrial = subscriptions.filter(
    (s) => s.status === "active" && s.trialEnds !== null,
  ).length;
  const trialOrConverted = trialSubs + convertedFromTrial;
  const trialConversionRate =
    trialOrConverted > 0 ? Math.round((convertedFromTrial / trialOrConverted) * 100) : 0;

  const planDist: Record<string, number> = {};
  for (const s of subscriptions) {
    planDist[s.plan] = (planDist[s.plan] || 0) + 1;
  }

  // Tenant DB registry summary
  const tenantDatabases = tenantDbs.length;
  const activeDatabases = tenantDbs.filter((t) => t.status === "active").length;
  const suspendedDatabases = tenantDbs.filter((t) => t.status === "suspended").length;
  const totalStorageBytes = await getTotalTenantStorage(tenantDbs.map((t) => t.dbName));
  const totalStorageMb = Math.round((totalStorageBytes / (1024 * 1024)) * 10) / 10;

  // Resolve actor names for the recent-activity feed.
  const actorIds = [
    ...new Set(recentLogs.map((l) => l.actorId).filter(Boolean) as string[]),
  ];
  const actorUsers =
    actorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const actorMap = new Map(actorUsers.map((u) => [u.id, u]));
  const recentActivity = recentLogs.map((l) => {
    const actor = l.actorId ? actorMap.get(l.actorId) : null;
    return {
      id: l.id,
      action: l.action,
      actorId: l.actorId,
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    };
  });

  // Churn risk: collapse the per-user rows to one entry per customer.
  const churnMap = new Map<string, { name: string; lastActive: Date | null; users: number }>();
  // Customer-id → name lookup (we already have `customers` count only, so do
  // a lightweight findMany to resolve names — at most a handful of rows).
  const churnCustomerIds = [
    ...new Set(churnUsers.map((u) => u.customerId).filter(Boolean) as string[]),
  ];
  const churnCustomers =
    churnCustomerIds.length > 0
      ? await db.customer.findMany({
          where: { id: { in: churnCustomerIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const churnCustomerMap = new Map(churnCustomers.map((c) => [c.id, c]));
  for (const u of churnUsers) {
    if (!u.customerId) continue;
    const customer = churnCustomerMap.get(u.customerId);
    const existing = churnMap.get(u.customerId);
    if (existing) {
      existing.users += 1;
      // Track the most-recent activity across all users on this customer.
      if (u.lastActive) {
        if (!existing.lastActive || u.lastActive > existing.lastActive) {
          existing.lastActive = u.lastActive;
        }
      }
    } else {
      churnMap.set(u.customerId, {
        name: customer?.name ?? "Unknown",
        lastActive: u.lastActive ?? null,
        users: 1,
      });
    }
  }
  const churnRiskCustomers = [...churnMap.entries()].map(([customerId, v]) => ({
    customerId,
    customerName: v.name,
    lastActive: v.lastActive ? v.lastActive.toISOString() : null,
    inactiveUsers: v.users,
  }));

  return NextResponse.json({
    customers,
    invoices: invoices.length,
    paidInvoices: paidInvoices.length,
    quotations,
    serialKeys: serialKeys.length,
    activatedKeys,
    devices,
    apiKeys,
    subscriptions: subscriptions.length,
    activeSubs,
    trialSubs,
    bankAccounts,
    users,
    accounts,
    posts,
    totalRevenue,
    pendingRevenue,
    overdueRevenue,
    monthlyRevenue,
    planDistribution: Object.entries(planDist).map(([name, count]) => ({ name, count })),
    // ===== Owner module extras =====
    tenantDatabases,
    activeDatabases,
    suspendedDatabases,
    totalStorageMb,
    activityLogs: auditCount,
    trialConversionRate,
    recentActivity,
    churnRiskCustomers,
  });
}
