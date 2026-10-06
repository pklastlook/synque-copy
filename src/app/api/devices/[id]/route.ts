import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * Verify the target device exists before any mutation. Admin-only routes
 * (see requireRole calls below), so we don't need tenant scoping here.
 */
async function getVisibleDevice(id: string) {
  return db.device.findUnique({
    where: { id },
    select: { id: true },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Issue OWNER-FIXES #3B: admin-only mutation (toggle active/blocked).
  const { error } = await requireRole(req, "admin");
  if (error) return error;

  const existing = await getVisibleDevice(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.deviceName) data.deviceName = body.deviceName;
  if (body.lastSeen) data.lastSeen = new Date(body.lastSeen);
  await db.device.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireRole(_req, "admin");
  if (error) return error;

  const existing = await getVisibleDevice(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.device.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
