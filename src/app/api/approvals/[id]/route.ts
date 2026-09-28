import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/approvals/[id]
 *   Approve / reject / request changes on an approval request.
 *   Body: { status: "approved" | "rejected" | "changes_requested", comment?, approverId? }
 *   Sets resolvedAt = now() on any terminal status.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const { id } = await params;
  await db.approval.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
