import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { isSafeUrl } from "@/lib/url-safety";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat
 *   ?receiverId=xxx → direct messages with a specific user
 *   (no param) → group chat (receiverId = null)
 *
 * Returns messages + team members list for the sidebar.
 * Tenant-scoped: members see only users in their own tenant.
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const receiverId = req.nextUrl.searchParams.get("receiverId");

  // Fetch messages: either DM with a specific user, or group chat (null receiver)
  const messages = await db.chatMessage.findMany({
    where: receiverId
      ? {
          OR: [
            { senderId: user!.userId, receiverId },
            { senderId: receiverId, receiverId: user!.userId },
          ],
        }
      : { receiverId: null },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Fetch team members for the sidebar — tenant-scoped (same client only)
  const members = await db.user.findMany({
    where: tenantWhere(scope, { status: "active", id: { not: user!.userId } }),
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      color: true,
      role: true,
      title: true,
      lastActive: true,
    },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      text: m.text,
      fileUrl: m.fileUrl,
      fileName: m.fileName,
      fileType: m.fileType,
      isRead: m.isRead,
      isMine: m.senderId === user!.userId,
      createdAt: m.createdAt.toISOString(),
    })),
    members: members.map((m) => ({
      ...m,
      lastActive: m.lastActive?.toISOString() ?? null,
    })),
    currentUserId: user!.userId,
  });
}

/**
 * POST /api/chat
 *
 * Sends a message (text + optional file).
 * Body: { receiverId?, text, fileUrl?, fileName?, fileType? }
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { receiverId, text, fileUrl, fileName, fileType } = (await req.json()) as {
    receiverId?: string | null;
    text?: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string | null;
  };

  if (!text?.trim() && !fileUrl) {
    return NextResponse.json({ error: "Message text or file is required" }, { status: 400 });
  }

  // SECURITY: validate `fileUrl` is http(s) before storing.
  // `fileUrl` is later rendered as a clickable link / image src in the chat
  // UI — a `javascript:` URL would be a stored XSS that runs when a
  // recipient opens the message. (See SECURITY-INPUT Finding 3.)
  if (fileUrl && typeof fileUrl === "string" && !isSafeUrl(fileUrl)) {
    return NextResponse.json(
      { error: `Unsafe file URL scheme: ${fileUrl}` },
      { status: 400 }
    );
  }

  const msg = await db.chatMessage.create({
    data: {
      senderId: user!.userId,
      receiverId: receiverId ?? null,
      text: text?.trim() || "",
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
    },
  });

  return NextResponse.json({ id: msg.id, ok: true });
}

/**
 * PATCH /api/chat
 *
 * Marks messages as read.
 * Body: { receiverId? } — marks all messages from this receiver (or group) as read
 */
export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { receiverId } = (await req.json()) as { receiverId?: string | null };

  await db.chatMessage.updateMany({
    where: {
      receiverId: user!.userId,
      ...(receiverId ? { senderId: receiverId } : {}),
      isRead: false,
    },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
