import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/whatsapp
 *   ?status=new|used|archived|all (default: all)
 *   Returns pasted WhatsApp messages for the team to publish.
 *
 * Scoping:
 *   - Super-admins see all messages.
 *   - Tenant-scoped users see only messages savedBy users in their tenant
 *     (via `savedBy.customerId`). This is enforced via the relation.
 *
 * POST /api/whatsapp
 *   Body: { source, senderName, senderPhone?, groupName?, content, mediaUrl?, mediaType?, savedById }
 *   Saves a new pasted message. `savedById` is forced to the caller's userId
 *   — callers can no longer spoof attribution to another user.
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const status = req.nextUrl.searchParams.get("status") ?? "all";
  const statusFilter = status === "all" ? {} : { status };

  // WhatsAppMessage has no direct customerId column — scope via the
  // savedBy relation. Super-admins get no filter.
  const where = scope.isSuperAdmin
    ? statusFilter
    : { ...statusFilter, savedBy: { customerId: scope.customerId } };

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
  const scope = getTenantScope(user!);

  const body = await req.json();
  const {
    source,
    senderName,
    senderPhone,
    groupName,
    content,
    mediaUrl,
    mediaType,
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

  // Ignore any client-supplied `savedById` — always attribute to the caller.
  // This closes the mass-assignment / spoofed-attribution vector where a
  // user could paste a message "as" another user.
  const msg = await db.whatsAppMessage.create({
    data: {
      source: source ?? "group",
      senderName: senderName.trim(),
      senderPhone: senderPhone?.trim() || null,
      groupName: groupName?.trim() || null,
      content: content.trim(),
      mediaUrl: mediaUrl?.trim() || null,
      mediaType: mediaType ?? null,
      savedById: user!.userId,
    },
  });

  // Note: `scope` is intentionally unused beyond the requireAuth check —
  // WhatsApp messages are attributed by savedById (per-user), not by
  // tenant. The tenant scope above is enforced on the GET path via the
  // savedBy relation.
  void scope;

  return NextResponse.json({ id: msg.id, ok: true });
}
