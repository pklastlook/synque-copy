import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const filter = req.nextUrl.searchParams.get("filter"); // unread | all
  const comments = await db.comment.findMany({
    include: { account: true, assignee: true },
    orderBy: { createdAt: "desc" },
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
  const { id, replied, assigneeName } = await req.json();
  if (replied !== undefined) {
    await db.comment.update({ where: { id }, data: { replied } });
  }
  return NextResponse.json({ ok: true });
}
