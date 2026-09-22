import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const invoices = await db.invoice.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(invoices.map((inv) => ({
    id: inv.id, number: inv.number, customerId: inv.customerId, customerName: inv.customer?.name ?? "Unknown",
    status: inv.status, issueDate: inv.issueDate.toISOString(), dueDate: inv.dueDate?.toISOString() ?? null,
    subtotal: inv.subtotal, taxRate: inv.taxRate, taxAmount: inv.taxAmount, total: inv.total,
    notes: inv.notes, items: JSON.parse(inv.items), createdAt: inv.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerId, items, taxRate, dueDate, notes } = body;
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const parsedItems = items || [];
  const subtotal = parsedItems.reduce((s: number, i: { amount: number }) => s + (i.amount || 0), 0);
  const tax = taxRate || 0;
  const taxAmount = Math.round(subtotal * tax) / 100;
  const total = subtotal + taxAmount;
  const count = await db.invoice.count();
  const number = `INV-${String(count + 1).padStart(4, "0")}`;
  const invoice = await db.invoice.create({
    data: { number, customerId, items: JSON.stringify(parsedItems), subtotal, taxRate: tax, taxAmount, total, notes, dueDate: dueDate ? new Date(dueDate) : null },
  });
  return NextResponse.json({ id: invoice.id, number, ok: true });
}
