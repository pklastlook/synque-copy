import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const accounts = await db.bankAccount.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(accounts.map((a) => ({
    id: a.id, accountName: a.accountName, bankName: a.bankName,
    accountNumber: a.accountNumber, iban: a.iban, swift: a.swift,
    currency: a.currency, isDefault: a.isDefault, createdAt: a.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const body = await req.json();
  const { accountName, bankName, accountNumber, iban, swift, currency, isDefault } = body;
  if (!accountName || !bankName || !accountNumber) return NextResponse.json({ error: "accountName, bankName, accountNumber required" }, { status: 400 });
  // Only reset isDefault flags within the caller's tenant (super-admin scope
  // leaves all rows untouched because they own the global pool).
  if (isDefault) {
    await db.bankAccount.updateMany({
      where: tenantWhere(scope) as { customerId?: string },
      data: { isDefault: false },
    });
  }
  const account = await db.bankAccount.create({
    data: {
      accountName,
      bankName,
      accountNumber,
      iban,
      swift,
      currency: currency ?? "USD",
      isDefault: isDefault ?? false,
      // Stamp the new bank account with the caller's tenant so GET scoping works.
      customerId: scope.customerId,
    },
  });
  return NextResponse.json({ id: account.id, ok: true });
}
