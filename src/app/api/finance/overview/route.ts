import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [customers, invoices, quotations, serialKeys, devices, apiKeys, subscriptions, bankAccounts, users, accounts, posts] = await Promise.all([
    db.customer.count(),
    db.invoice.findMany({ select: { status: true, total: true } }),
    db.quotation.count(),
    db.serialKey.findMany({ select: { status: true } }),
    db.device.count(),
    db.apiKey.count(),
    db.subscription.findMany({ select: { status: true, amount: true, plan: true } }),
    db.bankAccount.count(),
    db.user.count(),
    db.account.count(),
    db.post.count(),
  ]);

  const paidInvoices = invoices.filter((i) => i.status === "paid");
  const totalRevenue = paidInvoices.reduce((s, i) => s + i.total, 0);
  const pendingRevenue = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.total, 0);
  const overdueRevenue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const activatedKeys = serialKeys.filter((k) => k.status === "activated").length;
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const trialSubs = subscriptions.filter((s) => s.status === "trial").length;
  const monthlyRevenue = subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amount, 0);

  const planDist: Record<string, number> = {};
  for (const s of subscriptions) {
    planDist[s.plan] = (planDist[s.plan] || 0) + 1;
  }

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
  });
}
