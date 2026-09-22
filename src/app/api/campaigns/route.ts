import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const campaigns = await db.campaign.findMany({ orderBy: { createdAt: "desc" } });
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
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
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
    },
  });
  return NextResponse.json({ id: c.id, ok: true });
}
