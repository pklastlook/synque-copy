import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/export
 *
 * Exports all invoices as a CSV file. Used by the Owner Panel → Invoices tab.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const invoices = await db.invoice.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });

  // Build CSV
  const headers = [
    "Invoice Number",
    "Client Name",
    "Client Email",
    "Status",
    "Issue Date",
    "Due Date",
    "Subtotal",
    "Discount Type",
    "Discount Value",
    "Discount Amount",
    "Tax Rate (%)",
    "Tax Amount",
    "Total",
    "Currency",
    "Items",
    "Notes",
  ];

  const rows = invoices.map((inv) => {
    const items = JSON.parse(inv.items);
    const itemsStr = items.map((i: { description: string; qty: number; price: number; amount: number }) =>
      `${i.description} x${i.qty} @ $${i.price} = $${i.amount}`
    ).join("; ");
    return [
      inv.number,
      inv.customer?.name ?? "Unknown",
      inv.customer?.email ?? "",
      inv.status,
      inv.issueDate.toISOString().split("T")[0],
      inv.dueDate?.toISOString().split("T")[0] ?? "",
      inv.subtotal.toFixed(2),
      inv.discountType ?? "none",
      (inv.discountValue ?? 0).toString(),
      inv.discountAmount.toFixed(2),
      `${inv.taxRate}%`,
      inv.taxAmount.toFixed(2),
      inv.total.toFixed(2),
      "USD",
      `"${itemsStr}"`,
      `"${inv.notes ?? ""}"`,
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="invoices-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
