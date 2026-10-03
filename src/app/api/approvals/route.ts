import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * Content Approval Workflow — list + create.
 *
 * GET /api/approvals?status=pending
 *   Returns approvals filtered by status (default: all).
 *   Tenant-scoped via authorId → User.customerId (Approval has no customerId column).
 *
 * POST /api/approvals
 *   Creates a new approval request (status: pending).
 *   Body: { title, postId?, authorId, approverId?, priority?, dueAt? }
 *   authorId must belong to the caller's tenant.
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
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const status = req.nextUrl.searchParams.get("status"); // pending | approved | rejected | changes_requested

  // Approval has no customerId column — scope via the author's User.customerId.
  // Super-admins (no customerId) see all approvals.
  let where: Record<string, unknown> = {};
  if (!scope.isSuperAdmin) {
    const tenantUsers = await db.user.findMany({
      where: { customerId: scope.customerId },
      select: { id: true },
    });
    where = { authorId: { in: tenantUsers.map((u) => u.id) } };
  }
  if (status) where.status = status;

  const rows = await db.approval.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows.map(serialize));
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

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

  // Validate the author belongs to the caller's tenant (prevents creating an
  // approval attributed to another tenant's user).
  if (!scope.isSuperAdmin) {
    const author = await db.user.findUnique({
      where: { id: authorId },
      select: { customerId: true },
    });
    if (!author || author.customerId !== scope.customerId) {
      return NextResponse.json({ error: "Author not found" }, { status: 404 });
    }
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
