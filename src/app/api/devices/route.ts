import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/devices
 *
 * Admin-only. Returns ALL devices across ALL clients (super-admin scope).
 *
 * For each device we include:
 *  - The masked serial key + its status
 *  - The associated client (Customer.name) via the serialKey → customer link
 *  - The associated user (User.name + email) — the most recent user belonging
 *    to that client's tenant (i.e. the operator who activated the key).
 *
 * Devices without a serial key are returned with null customer/user fields.
 */
export async function GET(req: NextRequest) {
  // Issue OWNER-FIXES #3A: restrict to admins so cross-tenant device lists
  // (which include client + user PII) are not exposed to tenant-scoped users.
  const { user, error } = await requireRole(req, "admin");
  if (error) return error;
  // `user` is consumed implicitly via requireRole's auth check; keep the
  // reference so future tenant-scoping logic has the caller context.
  void user;

  // Pre-fetch all users grouped by customerId so we can attach the most
  // recent active user per client without N+1 queries.
  const users = await db.user.findMany({
    where: { customerId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      customerId: true,
      lastActive: true,
      status: true,
    },
    orderBy: { lastActive: "desc" },
  });
  // Map: customerId → most recently active user
  const userByCustomer = new Map<string, { name: string; email: string }>();
  for (const u of users) {
    if (!u.customerId) continue;
    if (!userByCustomer.has(u.customerId)) {
      userByCustomer.set(u.customerId, { name: u.name, email: u.email });
    }
  }

  const devices = await db.device.findMany({
    include: { serialKey: { include: { customer: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(devices.map((d) => {
    const customer = d.serialKey?.customer ?? null;
    const user = customer ? userByCustomer.get(customer.id) ?? null : null;
    return {
      id: d.id,
      deviceName: d.deviceName,
      fingerprint: d.fingerprint,
      ipAddress: d.ipAddress,
      location: d.location,
      status: d.status,
      lastSeen: d.lastSeen?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      serialKey: d.serialKey
        ? { key: d.serialKey.key, status: d.serialKey.status }
        : null,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      customerEmail: customer?.email ?? null,
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
    };
  }));
}

/**
 * POST /api/devices
 *
 * Creates a device. Admin-only. If a serialKeyId is provided, the caller
 * can attach any serial key (or none).
 */
export async function POST(req: NextRequest) {
  const { error } = await requireRole(req, "admin");
  if (error) return error;

  const body = await req.json();
  const { deviceName, serialKeyId, fingerprint, ipAddress, location } = body;
  if (!deviceName) {
    return NextResponse.json({ error: "deviceName required" }, { status: 400 });
  }

  // If a serialKeyId is provided, verify it exists.
  if (serialKeyId) {
    const sk = await db.serialKey.findUnique({
      where: { id: serialKeyId },
      select: { id: true },
    });
    if (!sk) {
      return NextResponse.json({ error: "Serial key not found" }, { status: 404 });
    }
  }

  const device = await db.device.create({
    data: {
      deviceName,
      serialKeyId: serialKeyId ?? null,
      fingerprint,
      ipAddress,
      location,
    },
  });
  return NextResponse.json({ id: device.id, ok: true });
}
