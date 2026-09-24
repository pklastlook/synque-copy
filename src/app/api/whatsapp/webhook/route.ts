import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp/webhook?ownerId=xxx
 *
 * Receives incoming WhatsApp messages from the mini-service (baileys) and
 * stores them in the WhatsAppMessage table. The user sees them appear in
 * the WhatsApp Inbox in real-time.
 *
 * Body (from mini-service):
 *   { source, senderName, groupName?, content, mediaUrl?, mediaType? }
 */
export async function POST(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get("ownerId");
  if (!ownerId) {
    return NextResponse.json({ error: "ownerId required" }, { status: 400 });
  }

  const body = (await req.json()) as {
    source: string;
    senderName: string;
    groupName?: string | null;
    content: string;
    mediaUrl?: string | null;
    mediaType?: string | null;
  };

  if (!body.content || body.content.length < 2) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // De-dupe: skip if an identical message arrived in the last 30s
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  const existing = await db.whatsAppMessage.findFirst({
    where: {
      content: body.content,
      senderName: body.senderName,
      isLive: true,
      createdAt: { gte: thirtySecondsAgo },
    },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const msg = await db.whatsAppMessage.create({
    data: {
      source: body.source ?? "chat",
      senderName: body.senderName ?? "Unknown",
      senderPhone: null,
      groupName: body.groupName ?? null,
      content: body.content,
      mediaUrl: body.mediaUrl ?? null,
      mediaType: body.mediaType ?? null,
      status: "new",
      isLive: true,
      // No savedById — this is an auto-received message, not pasted by a user
    },
  });

  console.log(`[whatsapp/webhook] Saved live message from ${body.senderName}: "${body.content.slice(0, 50)}..."`);

  return NextResponse.json({ ok: true, id: msg.id });
}
