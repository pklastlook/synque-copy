import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  // Verify the bank account belongs to this tenant before editing.
  // BankAccount has a customerId column — super-admin (customerId=null) sees all.
  const existing = await db.bankAccount.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ["accountName", "bankName", "accountNumber", "iban", "swift", "currency", "isDefault"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  // CRITICAL FIX: previously this was `updateMany({ data: { isDefault: false } })`
  // with NO `where` clause — un-defaulting EVERY bank account across ALL tenants
  // globally on every "set as default" PATCH. Now scoped to the caller's tenant.
  if (body.isDefault) {
    await db.bankAccount.updateMany({
      where: tenantWhere(scope) as { customerId?: string },
      data: { isDefault: false },
    });
  }
  await db.bankAccount.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  const existing = await db.bankAccount.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.bankAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
