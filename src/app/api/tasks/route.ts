import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const tasks = await db.task.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assigneeId: t.assigneeId,
      creatorId: t.creatorId,
      status: t.status,
      priority: t.priority,
      type: t.type,
      relatedPostId: t.relatedPostId,
      dueAt: t.dueAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, assigneeId, creatorId, status, priority, type, dueAt } = body;
  if (!title || !creatorId) return NextResponse.json({ error: "title and creatorId required" }, { status: 400 });
  const task = await db.task.create({
    data: {
      title,
      description: description ?? null,
      assigneeId: assigneeId ?? null,
      creatorId,
      status: status ?? "todo",
      priority: priority ?? "normal",
      type: type ?? "content",
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });
  return NextResponse.json({ id: task.id, ok: true });
}
