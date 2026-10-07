import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/analytics
 *
 * Auth required. Returns aggregated time-series + cohort data for the
 * finance + reports dashboards:
 *
 *   - monthlyRevenue: [{ month: 'MMM yyyy', revenue: number, invoices: number }]  // last 12 months
 *   - clientGrowth:   [{ month: 'MMM yyyy', newClients: number, total: number }] // last 12 months
 *   - planRevenue:    [{ plan, revenue, count }]
 *   - invoiceBreakdown: [{ status, count, total }]
 *   - topClients:     [{ customerId, name, totalRevenue, invoices, lastInvoice }]  // top 10 by revenue
 *   - subscriptionMetrics: { mrr, arr, activeSubs, trialSubs, cancelledSubs, churnRate, trialConversionRate }
 *   - paymentHistory: [{ id, number, customerName, total, status, paidAt }]  // last 20 paid invoices
 *   - outstanding:    [{ id, number, customerName, total, dueDate, daysOverdue }]
 *
 * All totals are computed in JS to avoid DB-specific window functions.
 * Tenant-scoped: tenant users see only their customer's data.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  // Tenant scope filter for tables that have a `customerId` FK (Invoice,
  // Subscription, BankAccount). Customer itself is scoped differently —
  // tenant users see ONLY their own customer row.
  const tenantFilter = tenantWhere(scope) as { customerId?: string };
  const customerFilter = scope.isSuperAdmin
    ? {}
    : { id: scope.customerId ?? "" };

  const [customers, invoices, subs, banks] = await Promise.all([
    db.customer.findMany({
      where: customerFilter,
      select: {
        id: true, name: true, email: true, plan: true, status: true, createdAt: true,
      },
    }),
    db.invoice.findMany({
      where: tenantFilter,
      select: {
        id: true, number: true, customerId: true, status: true, total: true,
        issueDate: true, dueDate: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.subscription.findMany({
      where: tenantFilter,
      select: {
        id: true, customerId: true, plan: true, status: true, amount: true,
        startDate: true, trialEnds: true, endDate: true, createdAt: true,
        totalAmount: true, billingCycle: true,
      },
    }),
    db.bankAccount.findMany({
      where: tenantFilter,
      select: { id: true, accountName: true, bankName: true, accountNumber: true, currency: true, isDefault: true },
    }),
  ]);

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  // ===== Monthly revenue (last 12 months) =====
  const now = new Date();
  const months: { month: string; revenue: number; invoices: number; key: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const monthInvs = invoices.filter((inv) => {
      const t = new Date(inv.issueDate).getTime();
      return t >= start && t < end;
    });
    const revenue = monthInvs.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
    months.push({
      month: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      revenue: Math.round(revenue),
      invoices: monthInvs.length,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }

  // ===== Client growth (last 12 months, cumulative) =====
  const clientGrowth: { month: string; newClients: number; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const newClients = customers.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= start && t < end;
    }).length;
    const total = customers.filter((c) => new Date(c.createdAt).getTime() < end).length;
    clientGrowth.push({
      month: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
      newClients,
      total,
    });
  }

  // ===== Plan revenue (paid invoices grouped by customer.plan) =====
  const planAgg: Record<string, { revenue: number; count: number }> = {};
  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    const customer = customerMap.get(inv.customerId);
    const plan = customer?.plan ?? "unknown";
    if (!planAgg[plan]) planAgg[plan] = { revenue: 0, count: 0 };
    planAgg[plan].revenue += inv.total;
    planAgg[plan].count += 1;
  }
  const planRevenue = Object.entries(planAgg).map(([plan, v]) => ({
    plan, revenue: Math.round(v.revenue), count: v.count,
  })).sort((a, b) => b.revenue - a.revenue);

  // ===== Invoice status breakdown =====
  const statusAgg: Record<string, { count: number; total: number }> = {};
  for (const inv of invoices) {
    if (!statusAgg[inv.status]) statusAgg[inv.status] = { count: 0, total: 0 };
    statusAgg[inv.status].count += 1;
    statusAgg[inv.status].total += inv.total;
  }
  const invoiceBreakdown = Object.entries(statusAgg).map(([status, v]) => ({
    status, count: v.count, total: Math.round(v.total),
  }));

  // ===== Top 10 clients by paid revenue =====
  const clientAgg: Record<string, { revenue: number; invoices: number; lastInvoice: string | null; name: string }> = {};
  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    const customer = customerMap.get(inv.customerId);
    if (!clientAgg[inv.customerId]) {
      clientAgg[inv.customerId] = {
        revenue: 0, invoices: 0, lastInvoice: null,
        name: customer?.name ?? "Unknown",
      };
    }
    clientAgg[inv.customerId].revenue += inv.total;
    clientAgg[inv.customerId].invoices += 1;
    if (!clientAgg[inv.customerId].lastInvoice || new Date(inv.issueDate) > new Date(clientAgg[inv.customerId].lastInvoice!)) {
      clientAgg[inv.customerId].lastInvoice = inv.issueDate.toISOString();
    }
  }
  const topClients = Object.entries(clientAgg)
    .map(([customerId, v]) => ({
      customerId, name: v.name, totalRevenue: Math.round(v.revenue),
      invoices: v.invoices, lastInvoice: v.lastInvoice,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // ===== Subscription metrics =====
  const activeSubs = subs.filter((s) => s.status === "active");
  const trialSubs = subs.filter((s) => s.status === "trial");
  const cancelledSubs = subs.filter((s) => s.status === "cancelled");
  // MRR: sum of active subs' amount, normalized to monthly (cycle multiplier).
  const CYCLE_MULT: Record<string, number> = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
  const mrr = activeSubs.reduce((sum, s) => {
    const mult = CYCLE_MULT[s.billingCycle ?? "monthly"] ?? 1;
    return sum + s.amount * mult;
  }, 0);
  const arr = mrr * 12;

  // Churn rate: cancelled / (active + cancelled) over the lifetime.
  const churnRate = activeSubs.length + cancelledSubs.length > 0
    ? Math.round((cancelledSubs.length / (activeSubs.length + cancelledSubs.length)) * 100)
    : 0;
  // Trial conversion: trial ended AND became active / (trial + converted).
  const convertedFromTrial = subs.filter((s) => s.status === "active" && s.trialEnds !== null).length;
  const trialOrConverted = trialSubs.length + convertedFromTrial;
  const trialConversionRate = trialOrConverted > 0
    ? Math.round((convertedFromTrial / trialOrConverted) * 100)
    : 0;

  // ===== Payment history (last 20 paid invoices) =====
  const paymentHistory = invoices
    .filter((i) => i.status === "paid")
    .slice(0, 20)
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      customerId: inv.customerId,
      customerName: customerMap.get(inv.customerId)?.name ?? "Unknown",
      total: inv.total,
      status: inv.status,
      paidAt: inv.issueDate.toISOString(),
    }));

  // ===== Outstanding invoices (sent / overdue, with daysOverdue) =====
  const outstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue" || i.status === "draft")
    .map((inv) => {
      const due = inv.dueDate ? new Date(inv.dueDate).getTime() : null;
      const daysOverdue = due && due < Date.now() ? Math.floor((Date.now() - due) / (24 * 60 * 60 * 1000)) : 0;
      return {
        id: inv.id,
        number: inv.number,
        customerId: inv.customerId,
        customerName: customerMap.get(inv.customerId)?.name ?? "Unknown",
        total: inv.total,
        status: inv.status,
        dueDate: inv.dueDate?.toISOString() ?? null,
        issueDate: inv.issueDate.toISOString(),
        daysOverdue,
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // ===== Bank account balances — synthesized (no real ledger): =====
  // We don't track real balances, so we compute "received into" by summing
  // paid invoices (informational only).
  const totalReceived = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const bankAccounts = banks.map((b) => ({
    id: b.id,
    accountName: b.accountName,
    bankName: b.bankName,
    accountNumber: b.accountNumber,
    currency: b.currency,
    isDefault: b.isDefault,
    balance: b.isDefault ? totalReceived : 0, // attributed to default account
  }));

  return NextResponse.json({
    monthlyRevenue: months,
    clientGrowth,
    planRevenue,
    invoiceBreakdown,
    topClients,
    paymentHistory,
    outstanding,
    bankAccounts,
    subscriptionMetrics: {
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      activeSubs: activeSubs.length,
      trialSubs: trialSubs.length,
      cancelledSubs: cancelledSubs.length,
      totalSubs: subs.length,
      churnRate,
      trialConversionRate,
    },
    totals: {
      customers: customers.length,
      invoices: invoices.length,
      paidInvoices: invoices.filter((i) => i.status === "paid").length,
      totalRevenue: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0),
      pendingRevenue: invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0),
      overdueRevenue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0),
    },
  });
}
