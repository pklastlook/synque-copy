import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/[id]
 *
 * Auth required. Target invoice must belong to the caller's tenant
 * (super-admins can read any invoice).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const inv = await db.invoice.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    include: { customer: true },
  });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: inv.id, number: inv.number, customerId: inv.customerId, customerName: inv.customer?.name ?? "Unknown",
    status: inv.status, issueDate: inv.issueDate.toISOString(), dueDate: inv.dueDate?.toISOString() ?? null,
    subtotal: inv.subtotal, taxRate: inv.taxRate, taxAmount: inv.taxAmount, total: inv.total,
    notes: inv.notes, items: JSON.parse(inv.items), createdAt: inv.createdAt.toISOString(),
  });
}

/**
 * PATCH /api/invoices/[id]
 *
 * Auth required. Target invoice must belong to the caller's tenant
 * (super-admins can mutate any invoice).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.invoice.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

/**
 * DELETE /api/invoices/[id]
 *
 * Auth required. Target invoice must belong to the caller's tenant.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await db.invoice.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
