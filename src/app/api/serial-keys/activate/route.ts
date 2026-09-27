import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Compute a device fingerprint from request headers.
 * This creates a unique hash based on user-agent, accept-language,
 * and IP address — enough to identify a device without cookies.
 */
function computeFingerprint(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "";
  const lang = req.headers.get("accept-language") ?? "";
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";
  const accept = req.headers.get("accept") ?? "";
  const encoding = req.headers.get("accept-encoding") ?? "";
  return crypto.createHash("sha256").update(`${ua}|${lang}|${ip}|${accept}|${encoding}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const { key, deviceName } = await req.json();
  if (!key) return NextResponse.json({ error: "Serial key required" }, { status: 400 });

  const serialKey = await db.serialKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e));
  if (!serialKey) return NextResponse.json({ error: "Invalid serial key" }, { status: 404 });
  if (serialKey.status === "activated") {
    // Check if this is the SAME device trying to re-activate
    const fingerprint = computeFingerprint(req);
    if (serialKey.deviceFingerprint === fingerprint) {
      return NextResponse.json({ ok: true, message: "Device already activated" });
    }
    return NextResponse.json({ error: "This key is already activated on another device" }, { status: 409 });
  }
  if (serialKey.status === "revoked") return NextResponse.json({ error: "This key has been revoked" }, { status: 403 });

  // Compute real device fingerprint
  const fingerprint = computeFingerprint(req);
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "";

  // Activate the key with fingerprint
  await db.serialKey.update({
    where: { id: serialKey.id },
    data: {
      status: "activated",
      deviceName: deviceName ?? "Unknown Device",
      deviceFingerprint: fingerprint,
      activatedAt: new Date(),
    },
  });

  // Create a Device record for tracking
  await db.device.create({
    data: {
      serialKeyId: serialKey.id,
      deviceName: deviceName ?? "Unknown Device",
      fingerprint,
      ipAddress: ip || null,
      status: "active",
      lastSeen: new Date(),
    },
  }).catch(() => {
    // Device record already exists (shouldn't happen with new key, but handle gracefully)
  });

  // Update customer status if linked
  if (serialKey.customerId) {
    await db.customer.update({ where: { id: serialKey.customerId }, data: { status: "active" } }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    message: "Device activated successfully",
    fingerprint: fingerprint.substring(0, 16) + "…",
  });
}
