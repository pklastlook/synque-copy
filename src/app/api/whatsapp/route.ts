import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp
 *   ?status=new|used|archived|all (default: all)
 *   Returns pasted WhatsApp messages for the team to publish.
 *
 * POST /api/whatsapp
 *   Body: { source, senderName, senderPhone?, groupName?, content, mediaUrl?, mediaType?, savedById }
 *   Saves a new pasted message.
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const where = status === "all" ? {} : { status };

  const messages = await db.whatsAppMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { savedBy: true },
    take: 50,
  });

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      source: m.source,
      senderName: m.senderName,
      senderPhone: m.senderPhone,
      groupName: m.groupName,
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      status: m.status,
      postId: m.postId,
      savedByName: m.savedBy?.name ?? null,
      savedByColor: m.savedBy?.color ?? null,
      isLive: m.isLive,
      createdAt: m.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const {
    source,
    senderName,
    senderPhone,
    groupName,
    content,
    mediaUrl,
    mediaType,
    savedById,
  } = body as {
    source?: string;
    senderName?: string;
    senderPhone?: string;
    groupName?: string;
    content?: string;
    mediaUrl?: string;
    mediaType?: string;
    savedById?: string;
  };

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (!senderName || !senderName.trim()) {
    return NextResponse.json({ error: "Sender name is required" }, { status: 400 });
  }

  const msg = await db.whatsAppMessage.create({
    data: {
      source: source ?? "group",
      senderName: senderName.trim(),
      senderPhone: senderPhone?.trim() || null,
      groupName: groupName?.trim() || null,
      content: content.trim(),
      mediaUrl: mediaUrl?.trim() || null,
      mediaType: mediaType ?? null,
      savedById: savedById || user!.userId,
    },
  });

  return NextResponse.json({ id: msg.id, ok: true });
}
