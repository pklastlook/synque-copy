import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { key, deviceName } = await req.json();
  if (!key) return NextResponse.json({ error: "Serial key required" }, { status: 400 });

  const serialKey = await db.serialKey.findUnique({ where: { key } }).catch(() => null);
  if (!serialKey) return NextResponse.json({ error: "Invalid serial key" }, { status: 404 });
  if (serialKey.status === "activated") return NextResponse.json({ error: "This key is already activated on another device" }, { status: 409 });
  if (serialKey.status === "revoked") return NextResponse.json({ error: "This key has been revoked" }, { status: 403 });

  // Activate the key
  await db.serialKey.update({
    where: { id: serialKey.id },
    data: { status: "activated", deviceName: deviceName ?? "Unknown Device", activatedAt: new Date() },
  });

  // Update customer status if linked
  if (serialKey.customerId) {
    await db.customer.update({ where: { id: serialKey.customerId }, data: { status: "active" } }).catch(() => {});
  }

  return NextResponse.json({ ok: true, message: "Device activated successfully" });
}
