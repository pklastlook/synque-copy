import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 *
 * Returns the current user's notifications, newest first, with unread items
 * pinned above read ones. Also returns `unreadCount` so the bell can show
 * the red badge without a second round-trip.
 *
 * Query params:
 *   - ?unread=true  → return ONLY the unread count (lightweight, for polling).
 *                     Shape: { unreadCount: N }
 *   - ?limit=N      → cap the number of items returned (default 30, max 100).
 *
 * Auth required. The caller only sees their own notifications — `userId`
 * is taken from the JWT, never from the request body.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const url = new URL(req.url);
  const onlyCount = url.searchParams.get("unread") === "true";
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitRaw) || 30, 1), 100);

  try {
    // Unread count is always returned — the bell uses it for the red badge.
    const unreadCount = await db.notification.count({
      where: { userId: user!.userId, read: false },
    });

    // Lightweight mode — just the count. Used by the bell's 60s polling
    // tick so we don't pull the full notification list every minute.
    if (onlyCount) {
      return NextResponse.json({ unreadCount });
    }

    // Full mode — unread first, then read, both newest-first within their
    // bucket. Two ordered queries combined so the bell shows unread at top.
    const [unread, read] = await Promise.all([
      db.notification.findMany({
        where: { userId: user!.userId, read: false },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.notification.findMany({
        where: { userId: user!.userId, read: true },
        orderBy: { createdAt: "desc" },
        take: Math.max(limit - 0, 0),
      }),
    ]);

    // Concatenate, capping total at `limit`.
    const notifications = [...unread, ...read].slice(0, limit).map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      actionView: n.actionView,
      actionId: n.actionId,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ notifications, unreadCount });
  } catch (e) {
    console.error("[api/notifications GET] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 *
 * Marks notification(s) as read.
 *
 * Body (one of):
 *   - { all: true }   → mark every unread notification for this user as read
 *   - { id: "xxx" }   → mark that one notification as read
 *
 * Returns: { ok: true, updated: N }
 *
 * Auth required. The notification's `userId` must match the caller — users
 * cannot mark another user's notifications as read.
 */
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  let body: { id?: string; all?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.id && !body.all) {
    return NextResponse.json(
      { error: "Provide { id } or { all: true }" },
      { status: 400 }
    );
  }

  try {
    if (body.all) {
      const result = await db.notification.updateMany({
        where: { userId: user!.userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ ok: true, updated: result.count });
    }

    // Single — verify ownership before flipping read=true so a user can't
    // mark someone else's notification as read by guessing IDs.
    const updated = await db.notification.updateMany({
      where: { id: body.id, userId: user!.userId },
      data: { read: true },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, updated: updated.count });
  } catch (e) {
    console.error("[api/notifications PATCH] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
