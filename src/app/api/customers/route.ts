import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const customers = await db.customer.findMany({ include: { serialKey: true, invoices: true, quotations: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(customers.map((c) => ({
    id: c.id, name: c.name, email: c.email, phone: c.phone, company: c.company,
    address: c.address, city: c.city, country: c.country, status: c.status, plan: c.plan,
    serialKey: c.serialKey ? { id: c.serialKey.id, key: c.serialKey.key, status: c.serialKey.status, activatedAt: c.serialKey.activatedAt?.toISOString() ?? null } : null,
    invoicesCount: c.invoices.length, quotationsCount: c.quotations.length,
    createdAt: c.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, company, address, city, country, plan } = body;
  if (!name || !email) return NextResponse.json({ error: "name and email required" }, { status: 400 });
  const existing = await db.customer.findUnique({ where: { email } }).catch(() => null);
  if (existing) return NextResponse.json({ error: "Customer with this email exists" }, { status: 409 });
  const customer = await db.customer.create({ data: { name, email, phone, company, address, city, country, plan: plan ?? "starter" } });
  return NextResponse.json({ id: customer.id, ok: true });
}
