import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const campaigns = await db.campaign.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      status: c.status,
      objective: c.objective,
      budget: c.budget,
      startDate: c.startDate?.toISOString() ?? null,
      endDate: c.endDate?.toISOString() ?? null,
      ownerId: c.ownerId,
      customerId: c.customerId,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { name, description, color, objective, budget, startDate, endDate, ownerId } = body;
  if (!name || !ownerId) return NextResponse.json({ error: "name and ownerId required" }, { status: 400 });
  const c = await db.campaign.create({
    data: {
      name,
      description,
      color: color ?? "#E1306C",
      objective,
      budget: budget ? Number(budget) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      ownerId,
      // Stamp the new campaign with the caller's tenant so GET scoping works.
      // Super-admin (customerId=null) creates a globally-visible campaign.
      customerId: scope.customerId,
    },
  });
  return NextResponse.json({ id: c.id, ok: true });
}
