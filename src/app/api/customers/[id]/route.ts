import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "email", "phone", "company", "address", "city", "country", "status", "plan"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  await db.customer.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.invoice.deleteMany({ where: { customerId: id } }).catch(() => {});
  await db.quotation.deleteMany({ where: { customerId: id } }).catch(() => {});
  await db.serialKey.deleteMany({ where: { customerId: id } }).catch(() => {});
  await db.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
