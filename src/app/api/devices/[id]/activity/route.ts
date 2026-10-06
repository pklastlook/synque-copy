import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/devices/[id]/activity
 *
 * Auth required. Returns the activity log for a single device — a
 * synthesized timeline of the last N sessions/events derived from the
 * AuditLog table (filtered by `targetId = device.id` or by metadata that
 * mentions the device's serialKeyId), plus the device's own metadata
 * (lastSeen, ipAddress, location) as the "current session" entry.
 *
 * The frontend renders this as a vertical timeline.
 *
 * Visibility: super-admins see any device; tenant users only see devices
 * whose SerialKey belongs to their customer (matches the DevicesTab GET).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const where = scope.isSuperAdmin
    ? { id }
    : { id, serialKey: { customerId: scope.customerId } };

  const device = await db.device.findFirst({
    where,
    include: { serialKey: { include: { customer: true } } },
  });
  if (!device) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Pull the last 20 audit log entries that mention this device id (as
  // targetId) OR a metadata blob containing the device's serialKeyId.
  const serialKeyId = device.serialKeyId ?? null;
  const auditEntries = await db.auditLog.findMany({
    where: {
      OR: [
        { targetId: device.id },
        { targetType: "device" },
        ...(serialKeyId
          ? [{ metadata: { contains: serialKeyId } }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Resolve actor names in one round-trip.
  const actorIds = [...new Set(auditEntries.map((l) => l.actorId).filter(Boolean) as string[])];
  const users =
    actorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  type Entry = {
    id: string;
    type: "session" | "blocked" | "unblocked" | "revoked" | "registered" | "verified";
    label: string;
    at: string;
    ip: string | null;
    actor: string | null;
  };

  const entries: Entry[] = [];

  // Synthetic "current session" entry from the device row itself.
  if (device.lastSeen) {
    entries.push({
      id: `current-${device.id}`,
      type: "session",
      label: `Active session from ${device.ipAddress ?? "unknown IP"}${
        device.location ? ` · ${device.location}` : ""
      }`,
      at: device.lastSeen.toISOString(),
      ip: device.ipAddress ?? null,
      actor: device.serialKey?.customer?.name ?? null,
    });
  }

  // Registered timestamp (always present — device.createdAt).
  entries.push({
    id: `created-${device.id}`,
    type: "registered",
    label: `Device registered${device.serialKey?.customer ? ` · ${device.serialKey.customer.name}` : ""}`,
    at: device.createdAt.toISOString(),
    ip: null,
    actor: device.serialKey?.customer?.name ?? null,
  });

  // Map audit logs → timeline entries.
  for (const log of auditEntries) {
    const actor = log.actorId ? userMap.get(log.actorId)?.name ?? null : null;
    let type: Entry["type"] = "verified";
    if (log.action.includes("blocked")) type = "blocked";
    else if (log.action.includes("unblocked") || log.action.includes("reactivated")) type = "unblocked";
    else if (log.action.includes("revoked")) type = "revoked";
    else if (log.action.includes("registered") || log.action.includes("created")) type = "registered";
    else if (log.action.includes("verified") || log.action.includes("login")) type = "verified";
    else type = "session";

    entries.push({
      id: log.id,
      type,
      label: prettyAction(log.action),
      at: log.createdAt.toISOString(),
      ip: log.ip,
      actor,
    });
  }

  // De-dupe by id, sort by date desc, cap at 10.
  const seen = new Set<string>();
  const dedup = entries
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  return NextResponse.json({
    device: {
      id: device.id,
      deviceName: device.deviceName,
      status: device.status,
      ipAddress: device.ipAddress,
      location: device.location,
      lastSeen: device.lastSeen?.toISOString() ?? null,
      createdAt: device.createdAt.toISOString(),
      customerName: device.serialKey?.customer?.name ?? null,
      serialKey: device.serialKey
        ? { key: device.serialKey.key, status: device.serialKey.status }
        : null,
    },
    activity: dedup,
  });
}

function prettyAction(action: string): string {
  const last = action.split(".").pop() ?? action;
  return last
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
