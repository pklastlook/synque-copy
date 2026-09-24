import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const subs = await db.subscription.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(subs.map((s) => ({
    id: s.id, customerId: s.customerId, customerName: s.customer?.name ?? "Unknown",
    plan: s.plan, status: s.status, amount: s.amount, currency: s.currency,
    startDate: s.startDate.toISOString(), endDate: s.endDate?.toISOString() ?? null,
    trialEnds: s.trialEnds?.toISOString() ?? null, createdAt: s.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const { customerId, plan, amount, trialEnds } = await req.json();
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const sub = await db.subscription.create({
    data: {
      customerId, plan: plan ?? "growth", amount: amount ?? 89,
      trialEnds: trialEnds ? new Date(trialEnds) : new Date(Date.now() + 15 * 86400000),
      status: "trial",
    },
  });
  return NextResponse.json({ id: sub.id, ok: true });
}
