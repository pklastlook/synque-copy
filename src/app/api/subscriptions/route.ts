import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/subscriptions
 *
 * Auth required. Super-admins see all subscriptions; tenant users see only
 * subscriptions belonging to their customer.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const subs = await db.subscription.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(subs.map((s) => ({
    id: s.id, customerId: s.customerId, customerName: s.customer?.name ?? "Unknown",
    plan: s.plan, status: s.status, amount: s.amount, currency: s.currency,
    startDate: s.startDate.toISOString(), endDate: s.endDate?.toISOString() ?? null,
    trialEnds: s.trialEnds?.toISOString() ?? null, createdAt: s.createdAt.toISOString(),
  })));
}

/**
 * POST /api/subscriptions
 *
 * Auth required. The customerId is bound to the caller's tenant — the body
 * `customerId` is ignored unless the caller is a super-admin (who can mint
 * subscriptions for any customer).
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  // Bind customerId to the caller's tenant. Super-admins can pass a body
  // customerId (for cross-tenant billing); tenant users CANNOT.
  const customerId = scope.isSuperAdmin ? body.customerId : scope.customerId;
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });

  const plan: string = body.plan ?? "growth";
  // Default amount conditional on the plan (mirrors the Owner panel UI).
  const defaultAmount = plan === "starter" ? 29 : plan === "enterprise" ? 0 : 89;
  const amount: number = typeof body.amount === "number" ? body.amount : defaultAmount;
  const currency: string = body.currency ?? "USD";
  const status: string = body.status ?? "trial";
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const trialEnds = body.trialEnds
    ? new Date(body.trialEnds)
    : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
  const endDate = body.endDate ? new Date(body.endDate) : null;

  const sub = await db.subscription.create({
    data: {
      customerId,
      plan,
      status,
      amount,
      currency,
      startDate,
      trialEnds,
      endDate,
    },
  });
  return NextResponse.json({ id: sub.id, ok: true });
}
