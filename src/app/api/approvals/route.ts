import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Content Approval Workflow — list + create.
 *
 * GET /api/approvals?status=pending
 *   Returns approvals filtered by status (default: all).
 *
 * POST /api/approvals
 *   Creates a new approval request (status: pending).
 *   Body: { title, postId?, authorId, approverId?, priority?, dueAt? }
 */

type ApprovalRow = NonNullable<Awaited<ReturnType<typeof db.approval.findFirst>>>;

function serialize(a: ApprovalRow) {
  return {
    id: a.id,
    postId: a.postId,
    title: a.title,
    authorId: a.authorId,
    approverId: a.approverId,
    status: a.status,
    comment: a.comment,
    priority: a.priority,
    dueAt: a.dueAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status"); // pending | approved | rejected | changes_requested
  const rows = await db.approval.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows.map(serialize));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const { title, postId, authorId, approverId, priority, dueAt, comment } = body as {
    title?: string;
    postId?: string;
    authorId?: string;
    approverId?: string;
    priority?: string;
    dueAt?: string;
    comment?: string;
  };

  if (!title || !authorId) {
    return NextResponse.json({ error: "title and authorId are required" }, { status: 400 });
  }

  const a = await db.approval.create({
    data: {
      title,
      postId: postId ?? null,
      authorId,
      approverId: approverId ?? null,
      status: "pending",
      comment: comment ?? null,
      priority: priority ?? "normal",
      dueAt: dueAt ? new Date(dueAt) : null,
    },
  });
  return NextResponse.json(serialize(a));
}
