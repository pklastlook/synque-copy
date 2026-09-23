import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const quotations = await db.quotation.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(quotations.map((q) => ({
    id: q.id, number: q.number, customerId: q.customerId, customerName: q.customer?.name ?? "Unknown",
    status: q.status, issueDate: q.issueDate.toISOString(), validUntil: q.validUntil?.toISOString() ?? null,
    subtotal: q.subtotal, taxRate: q.taxRate, taxAmount: q.taxAmount, total: q.total,
    notes: q.notes, items: JSON.parse(q.items), createdAt: q.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerId, items, taxRate, validUntil, notes } = body;
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const parsedItems = (items || []).map((i: { description?: string; qty?: number; price?: number; amount?: number }) => ({
    description: i.description ?? "",
    qty: i.qty ?? 1,
    price: i.price ?? 0,
    amount: i.amount ?? (i.qty ?? 1) * (i.price ?? 0),
  }));
  const subtotal = parsedItems.reduce((s: number, i: { amount: number }) => s + (i.amount || 0), 0);
  const tax = taxRate || 0;
  const taxAmount = Math.round(subtotal * tax) / 100;
  const total = subtotal + taxAmount;
  const count = await db.quotation.count();
  const number = `QUO-${String(count + 1).padStart(4, "0")}`;
  const quotation = await db.quotation.create({
    data: { number, customerId, items: JSON.stringify(parsedItems), subtotal, taxRate: tax, taxAmount, total, notes, validUntil: validUntil ? new Date(validUntil) : null },
  });
  return NextResponse.json({ id: quotation.id, number, ok: true });
}
