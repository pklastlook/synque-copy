import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/approvals/[id]
 *   Approve / reject / request changes on an approval request.
 *   Body: { status: "approved" | "rejected" | "changes_requested", comment?, approverId? }
 *   Sets resolvedAt = now() on any terminal status.
 *   Tenant-scoped via authorId → User.customerId (Approval has no customerId column).
 *
 * DELETE /api/approvals/[id] — permanently remove an approval request.
 */

// Verify the approval belongs to the caller's tenant by walking the
// authorId → User.customerId link (Approval itself has no customerId column).
// Returns { ok: true } for super-admins (no tenant filter).
async function assertApprovalInTenant(
  id: string,
  scope: { customerId: string | null; isSuperAdmin: boolean }
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const existing = await db.approval.findUnique({
    where: { id },
    select: { authorId: true },
  });
  if (!existing) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (scope.isSuperAdmin) return { ok: true };
  const author = await db.user.findUnique({
    where: { id: existing.authorId },
    select: { customerId: true },
  });
  if (!author || author.customerId !== scope.customerId) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { ok: true };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  const check = await assertApprovalInTenant(id, scope);
  if (!check.ok) return check.response;

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const { status, comment, approverId } = body as {
    status?: string;
    comment?: string;
    approverId?: string;
  };

  const allowed = ["approved", "rejected", "changes_requested", "pending"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  const isTerminal = status === "approved" || status === "rejected";
  const updated = await db.approval.update({
    where: { id },
    data: {
      status,
      comment: comment ?? undefined,
      approverId: approverId ?? undefined,
      resolvedAt: isTerminal ? new Date() : null,
    },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    comment: updated.comment,
    approverId: updated.approverId,
    resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    ok: true,
  });
}

/** DELETE /api/approvals/[id] — permanently remove an approval request. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  const check = await assertApprovalInTenant(id, scope);
  if (!check.ok) return check.response;

  await db.approval.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
