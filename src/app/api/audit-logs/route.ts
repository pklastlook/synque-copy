import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * /api/audit-logs — security-event stream.
 *
 * Returns AuditLog rows joined with the acting User (name + email) so the
 * Owner can see WHO did WHAT, from WHERE, WHEN. Supports filtering by
 * action, actor (name/email substring), and a date range.
 *
 * Owner-only (`requireRole(req, "admin")`).
 */
export async function GET(req: NextRequest) {
  const { error } = await requireRole(req, "admin");
  if (error) return error;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const actor = url.searchParams.get("actor");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "100"), 500);
  const offset = Number(url.searchParams.get("offset") ?? "0");

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (from || to) {
    const createdAt: Record<string, Date> = {};
    if (from) createdAt.gte = new Date(from);
    if (to) {
      // `to` is inclusive: extend to end-of-day so a "to=2024-09-20" filter
      // captures events logged any time on the 20th.
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  // If actor search is provided, find matching users first, then scope
  // the audit-log query by their IDs. If no users match, short-circuit
  // to an empty result rather than running a no-op query.
  if (actor) {
    const users = await db.user.findMany({
      where: {
        OR: [
          { name: { contains: actor, mode: "insensitive" } },
          { email: { contains: actor, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (users.length === 0) return NextResponse.json([]);
    where.actorId = { in: users.map((u) => u.id) };
  }

  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  // Resolve actor names in a single round-trip.
  const uniqueActorIds = [
    ...new Set(logs.map((l) => l.actorId).filter(Boolean) as string[]),
  ];
  const users =
    uniqueActorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: uniqueActorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json(
    logs.map((l) => {
      const actorUser = l.actorId ? userMap.get(l.actorId) : null;
      return {
        id: l.id,
        action: l.action,
        actorId: l.actorId,
        actorName: actorUser?.name ?? null,
        actorEmail: actorUser?.email ?? null,
        targetType: l.targetType,
        targetId: l.targetId,
        metadata: l.metadata,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
      };
    }),
  );
}
