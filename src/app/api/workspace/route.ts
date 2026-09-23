import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/workspace?ownerId=xxx — returns the workspace settings for a user. */
export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "ownerId required" }, { status: 400 });
  }

  let ws = await db.workspace.findUnique({ where: { ownerId } });
  if (!ws) {
    // Create with defaults on first access
    ws = await db.workspace.create({ data: { ownerId } }).catch(() => null);
  }

  if (!ws) {
    return NextResponse.json({ error: "Failed to load workspace" }, { status: 500 });
  }

  return NextResponse.json({
    id: ws.id,
    name: ws.name,
    timezone: ws.timezone,
    cadence: ws.cadence,
    startTime: ws.startTime,
    endTime: ws.endTime,
    autoVariants: ws.autoVariants,
    tone: ws.tone,
    brandVoice: ws.brandVoice ?? "",
    colors: ws.colors ? JSON.parse(ws.colors) : ["#1B2A57", "#D4A24E", "#5BC0BE"],
    ownerId: ws.ownerId,
  });
}

/** PUT /api/workspace — upserts the workspace settings. */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const {
    ownerId,
    name,
    timezone,
    cadence,
    startTime,
    endTime,
    autoVariants,
    tone,
    brandVoice,
    colors,
  } = body as {
    ownerId?: string;
    name?: string;
    timezone?: string;
    cadence?: string;
    startTime?: string;
    endTime?: string;
    autoVariants?: boolean;
    tone?: string;
    brandVoice?: string;
    colors?: string[];
  };

  if (!ownerId) {
    return NextResponse.json({ error: "ownerId required" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (timezone !== undefined) data.timezone = timezone;
  if (cadence !== undefined) data.cadence = cadence;
  if (startTime !== undefined) data.startTime = startTime;
  if (endTime !== undefined) data.endTime = endTime;
  if (autoVariants !== undefined) data.autoVariants = autoVariants;
  if (tone !== undefined) data.tone = tone;
  if (brandVoice !== undefined) data.brandVoice = brandVoice;
  if (colors !== undefined) data.colors = JSON.stringify(colors);

  const ws = await db.workspace.upsert({
    where: { ownerId },
    create: { ownerId, ...data },
    update: data,
  });

  return NextResponse.json({ id: ws.id, ok: true });
}
