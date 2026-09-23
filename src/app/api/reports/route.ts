import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const reports = await db.report.findMany({ orderBy: { createdAt: "desc" } });
  const users = await db.user.findMany();
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
      createdBy: body.createdBy ?? null,
    },
  });
  return NextResponse.json({ id: r.id, ok: true });
}
