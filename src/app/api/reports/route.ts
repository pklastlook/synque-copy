import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const reports = await db.report.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  // Resolve author names — but only for users within the caller's tenant
  // (super-admins see everyone). This prevents leaking user identities across
  // tenants via the createdBy join.
  const users = await db.user.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    select: { id: true, name: true },
  });
  const byId: Record<string, string> = {};
  for (const u of users) byId[u.id] = u.name;
  return NextResponse.json(
    reports.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      description: r.description,
      config: r.config,
      schedule: r.schedule,
      createdByName: r.createdBy ? byId[r.createdBy] ?? "—" : "—",
      lastGenerated: r.lastGenerated?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { name, type, description, config, schedule } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const r = await db.report.create({
    data: {
      name,
      type: type ?? "custom",
      description,
      config: config ?? JSON.stringify({ metrics: [] }),
      schedule: schedule ?? null,
      createdBy: body.createdBy ?? user!.userId,
      // Stamp the new report with the caller's tenant so GET scoping works.
      customerId: scope.customerId,
    },
  });
  return NextResponse.json({ id: r.id, ok: true });
}
