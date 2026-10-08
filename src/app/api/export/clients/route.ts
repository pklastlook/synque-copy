import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/export/clients
 *
 * Admin-only export of all customers (clients) as CSV.
 * Columns: name, email, company, plan, status, revenue (lifetime paid),
 *          trial days remaining, created date.
 *
 * Auth: requireRole(req, "admin"). JWT may be passed as ?token=xxx so the
 * route works with `window.open(...)` downloads.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, "admin");
  if (error) return error;

  const customers = await db.customer.findMany({
    include: {
      payments: { where: { status: "completed" }, select: { amount: true, currency: true } },
      subscriptions: { select: { plan: true, status: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Customer ID",
    "Name",
    "Email",
    "Company",
    "Plan",
    "Status",
    "Phone",
    "Country",
    "City",
    "Lifetime Revenue (USD)",
    "Latest Subscription Plan",
    "Latest Subscription Status",
    "Trial Days Remaining",
    "Created At",
  ];

  const rows: string[] = [headers.map(csvCell).join(",")];
  for (const c of customers) {
    const lifetimeRevenue = c.payments.reduce((s, p) => s + (p.amount ?? 0), 0);
    const latestSub = c.subscriptions[0];
    let trialDaysLeft = "";
    if (c.status === "trial") {
      const trialEnd = new Date(c.createdAt).getTime() + 18 * 24 * 60 * 60 * 1000;
      const left = Math.ceil((trialEnd - Date.now()) / (24 * 60 * 60 * 1000));
      trialDaysLeft = left >= 0 ? String(left) : "0";
    }
    rows.push(
      buildRow([
        c.id,
        c.name,
        c.email,
        c.company ?? "",
        c.plan,
        c.status,
        c.phone ?? "",
        c.country ?? "",
        c.city ?? "",
        lifetimeRevenue.toFixed(2),
        latestSub?.plan ?? "",
        latestSub?.status ?? "",
        trialDaysLeft,
        c.createdAt.toISOString(),
      ])
    );
  }

  const csv = rows.join("\n");
  const filename = `clients-${new Date().toISOString().split("T")[0]}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function csvCell(v: string | number): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function buildRow(cells: (string | number)[]): string {
  return cells.map(csvCell).join(",");
}
