import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["title", "description", "assigneeId", "status", "priority", "type", "dueAt"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      if (k === "dueAt") data[k] = body[k] ? new Date(body[k]) : null;
      else if (k === "status" && body[k] === "done") {
        data[k] = body[k];
        data.completedAt = new Date();
      } else {
        data[k] = body[k];
      }
    }
  }
  await db.task.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
