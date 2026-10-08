import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/notifications/[id]
 *
 * Permanently deletes a notification owned by the caller. The `userId`
 * check prevents a user from deleting another user's notifications by
 * guessing IDs.
 *
 * Returns: { ok: true }
 *   - 404 if the notification doesn't exist OR doesn't belong to the caller.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const result = await db.notification.deleteMany({
      where: { id, userId: user!.userId },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/notifications DELETE] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/[id]
 *
 * Marks a single notification as read (or as unread if `read: false` is
 * explicitly passed — supports the "mark as unread" UX pattern).
 *
 * Body: { read?: boolean }  (default: true)
 *
 * Returns: { ok: true, notification: {...} }
 *   - 404 if the notification doesn't exist OR doesn't belong to the caller.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  let body: { read?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body → default to mark-as-read.
  }
  const read = body.read ?? true;

  try {
    // updateMany + ownership check so the API doesn't leak existence of
    // other users' notifications via 404 vs 200.
    const result = await db.notification.updateMany({
      where: { id, userId: user!.userId },
      data: { read },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/notifications/[id] PATCH] failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
