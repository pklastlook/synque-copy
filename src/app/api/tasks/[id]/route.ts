import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/** PATCH /api/tasks/[id] — update task fields */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const allowed = [
    "title", "description", "content", "mediaUrl", "mediaType",
    "platforms", "tags", "assigneeId", "status", "priority", "type", "dueAt",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (k === "dueAt") {
        data[k] = body[k] ? new Date(body[k]) : null;
      } else if (k === "platforms") {
        data[k] = body[k] ? JSON.stringify(body[k]) : null;
      } else if (k === "status" && body[k] === "done") {
        data[k] = "done";
        data.completedAt = new Date();
      } else if (k === "status" && body[k] !== "done") {
        data[k] = body[k];
        data.completedAt = null; // un-complete when moved out of done
      } else {
        data[k] = body[k];
      }
    }
  }

  try {
    await db.task.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/tasks/[id] */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { id } = await params;
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
