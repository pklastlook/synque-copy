import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/tasks
 *   ?assigneeId=xxx  → tasks assigned to a specific user
 *   ?creatorId=xxx   → tasks created by a specific user
 *   ?status=todo     → filter by status
 *   ?mine=1          → tasks where I'm the assignee OR the creator
 *
 * Returns tasks with creator + assignee names resolved.
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const assigneeId = sp.get("assigneeId");
  const creatorId = sp.get("creatorId");
  const status = sp.get("status");
  const mine = sp.get("mine");

  const where: Record<string, unknown> = {};
  if (assigneeId) where.assigneeId = assigneeId;
  if (creatorId) where.creatorId = creatorId;
  if (status) where.status = status;
  if (mine) {
    where.OR = [{ assigneeId: user!.userId }, { creatorId: user!.userId }];
  }

  const [tasks, users] = await Promise.all([
    db.task.findMany({ where, orderBy: { createdAt: "desc" } }),
    db.user.findMany({ select: { id: true, name: true, color: true, avatar: true } }),
  ]);
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json(
    tasks.map((t) => {
      const creator = userMap.get(t.creatorId);
      const assignee = t.assigneeId ? userMap.get(t.assigneeId) : null;
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        content: t.content,
        mediaUrl: t.mediaUrl,
        mediaType: t.mediaType,
        platforms: t.platforms ? JSON.parse(t.platforms) : [],
        tags: t.tags,
        assigneeId: t.assigneeId,
        assigneeName: assignee?.name ?? null,
        assigneeColor: assignee?.color ?? null,
        assigneeAvatar: assignee?.avatar ?? null,
        creatorId: t.creatorId,
        creatorName: creator?.name ?? "Unknown",
        creatorColor: creator?.color ?? null,
        status: t.status,
        priority: t.priority,
        type: t.type,
        relatedPostId: t.relatedPostId,
        dueAt: t.dueAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt?.toISOString() ?? null,
      };
    })
  );
}

/**
 * POST /api/tasks — create a new task
 * Body: { title, description?, content?, mediaUrl?, mediaType?, platforms?, tags?,
 *         assigneeId?, creatorId, status?, priority?, type?, dueAt? }
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const {
    title, description, content, mediaUrl, mediaType, platforms, tags,
    assigneeId, creatorId, status, priority, type, dueAt,
  } = body;

  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  // creatorId defaults to the authenticated user
  const finalCreatorId = creatorId || user!.userId;

  const task = await db.task.create({
    data: {
      title,
      description: description ?? null,
      content: content ?? null,
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
      platforms: platforms ? JSON.stringify(platforms) : null,
      tags: tags ?? null,
      assigneeId: assigneeId ?? null,
      creatorId: finalCreatorId,
      status: status ?? "todo",
      priority: priority ?? "normal",
      type: type ?? "content",
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });

  return NextResponse.json({ id: task.id, ok: true });
}
