import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const approvals = await db.approval.findMany({ orderBy: { createdAt: "desc" } });
  const users = await db.user.findMany();
  const byId: Record<string, { name: string; color: string | null }> = {};
  for (const u of users) byId[u.id] = { name: u.name, color: u.color };

  return NextResponse.json(
    approvals.map((a) => ({
      id: a.id,
      postId: a.postId,
      title: a.title,
      authorId: a.authorId,
      authorName: byId[a.authorId]?.name ?? "Unknown",
      authorColor: byId[a.authorId]?.color ?? null,
      approverId: a.approverId,
      approverName: a.approverId ? byId[a.approverId]?.name ?? null : null,
      status: a.status,
      comment: a.comment,
      priority: a.priority,
      dueAt: a.dueAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
    }))
  );
}

export async function PATCH(req: NextRequest) {
  const { id, status, comment } = await req.json();
  const data: Record<string, unknown> = { status };
  if (comment !== undefined) data.comment = comment;
  if (status !== "pending") data.resolvedAt = new Date();
  else data.resolvedAt = null;
  await db.approval.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, authorId, approverId, priority, dueAt } = body;
  if (!title || !authorId) {
    return NextResponse.json(
      { error: "title and authorId required" },
      { status: 400 },
    );
  }
  const a = await db.approval.create({
    data: {
      title: String(title),
      authorId: String(authorId),
      approverId: approverId ? String(approverId) : null,
      priority: priority ?? "normal",
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });
  return NextResponse.json({ id: a.id, ok: true });
}
