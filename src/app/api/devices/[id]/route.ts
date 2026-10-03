import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * Verify the target device is visible to the caller before any mutation.
 * Super-admins can mutate any device. Tenant users can only mutate devices
 * whose SerialKey belongs to their customer.
 */
async function getVisibleDevice(id: string, scope: { customerId: string | null; isSuperAdmin: boolean }) {
  return db.device.findFirst({
    where: scope.isSuperAdmin
      ? { id }
      : { id, serialKey: { customerId: scope.customerId } },
    select: { id: true },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await getVisibleDevice(id, scope);
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
  const { user, error } = requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const existing = await getVisibleDevice(id, scope);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.device.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
