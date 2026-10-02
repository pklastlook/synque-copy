import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const filter = req.nextUrl.searchParams.get("filter"); // unread | all
  const comments = await db.comment.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: { account: true, assignee: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const data = comments
    .filter((c) => (filter === "unread" ? !c.replied : true))
    .map((c) => ({
      id: c.id,
      accountId: c.accountId,
      platform: c.account.platform,
      handle: c.account.handle,
      author: c.author,
      authorAvatar: c.authorAvatar,
      text: c.text,
      type: c.type,
      sentiment: c.sentiment,
      replied: c.replied,
      assigneeName: c.assignee?.name ?? null,
      createdAt: c.createdAt.toISOString(),
    }));

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id, replied, replyText, assigneeId } = await req.json();
  // Ensure the caller can only touch comments in their own tenant.
  const existing = await db.comment.findFirst({
    where: { id, ...tenantWhere(scope) },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (replied !== undefined) {
    data.replied = replied;
    if (replied) data.repliedAt = new Date();
  }
  if (replyText !== undefined) data.replyText = replyText || null;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  await db.comment.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
