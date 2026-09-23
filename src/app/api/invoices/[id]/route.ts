import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["status", "notes", "dueDate", "taxRate"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (k === "dueDate") data[k] = body[k] ? new Date(body[k]) : null;
      else data[k] = body[k];
    }
  }
  if (body.items) {
    const parsedItems = body.items;
    const subtotal = parsedItems.reduce((s: number, i: { amount: number }) => s + (i.amount || 0), 0);
    const tax = body.taxRate ?? 0;
    data.items = JSON.stringify(parsedItems);
    data.subtotal = subtotal;
    data.taxAmount = Math.round(subtotal * tax) / 100;
    data.total = subtotal + (data.taxAmount as number);
  }
  await db.invoice.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
