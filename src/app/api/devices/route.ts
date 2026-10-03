import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/devices
 *
 * Tenant scoping: super-admins see all devices. Tenant users see only
 * devices whose SerialKey belongs to their customer. Devices without a
 * SerialKey (serialKeyId = null) are visible only to super-admins.
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const where = scope.isSuperAdmin
    ? {}
    : { serialKey: { customerId: scope.customerId } };

  const devices = await db.device.findMany({
    where,
    include: { serialKey: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(devices.map((d) => ({
    id: d.id, deviceName: d.deviceName, fingerprint: d.fingerprint, ipAddress: d.ipAddress,
    location: d.location, status: d.status, lastSeen: d.lastSeen?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    serialKey: d.serialKey ? { key: d.serialKey.key, status: d.serialKey.status } : null,
    customerName: d.serialKey?.customer?.name ?? null,
  })));
}

/**
 * POST /api/devices
 *
 * Creates a device. If a serialKeyId is provided, the caller must own it
 * (its customer must match the caller's tenant) — otherwise a tenant user
 * could attach a foreign serial key to a device and pollute the foreign
 * tenant's data. Super-admins can attach any serial key (or none).
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { deviceName, serialKeyId, fingerprint, ipAddress, location } = body;
  if (!deviceName) return NextResponse.json({ error: "deviceName required" }, { status: 400 });

  // If a serialKeyId is provided, verify the caller is allowed to attach it.
  if (serialKeyId) {
    if (scope.isSuperAdmin) {
      // super-admin can attach any serial key (still verify it exists)
      const sk = await db.serialKey.findUnique({
        where: { id: serialKeyId },
        select: { id: true },
      });
      if (!sk) return NextResponse.json({ error: "Serial key not found" }, { status: 404 });
    } else {
      // tenant user: serial key must belong to their customer
      const sk = await db.serialKey.findFirst({
        where: { id: serialKeyId, customerId: scope.customerId },
        select: { id: true },
      });
      if (!sk) return NextResponse.json({ error: "Serial key not found" }, { status: 404 });
    }
  }

  const device = await db.device.create({ data: { deviceName, serialKeyId: serialKeyId ?? null, fingerprint, ipAddress, location } });
  return NextResponse.json({ id: device.id, ok: true });
}
