import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const devices = await db.device.findMany({ include: { serialKey: { include: { customer: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(devices.map((d) => ({
    id: d.id, deviceName: d.deviceName, fingerprint: d.fingerprint, ipAddress: d.ipAddress,
    location: d.location, status: d.status, lastSeen: d.lastSeen?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    serialKey: d.serialKey ? { key: d.serialKey.key, status: d.serialKey.status } : null,
    customerName: d.serialKey?.customer?.name ?? null,
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { deviceName, serialKeyId, fingerprint, ipAddress, location } = body;
  if (!deviceName) return NextResponse.json({ error: "deviceName required" }, { status: 400 });
  const device = await db.device.create({ data: { deviceName, serialKeyId: serialKeyId ?? null, fingerprint, ipAddress, location } });
  return NextResponse.json({ id: device.id, ok: true });
}
