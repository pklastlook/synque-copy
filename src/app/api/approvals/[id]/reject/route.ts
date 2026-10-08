import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/approvals/[id]/reject
 *
 * P2-CORE — Reject a pending post (or pending approval request).
 *
 * Body: `{ reason?: string }` — optional rejection reason shown to the
 * author as the comment on the Approval row.
 *
 * Flow:
 *   1. Resolve the Approval row + its linked Post (if any).
 *   2. Verify tenant scope (approval author must belong to caller's tenant).
 *   3. Verify role — only admin/manager can reject.
 *   4. Flip the Post + all its variants back to `draft` (so the author can
 *      edit + resubmit).
 *   5. Mark the Approval row as `rejected` + `resolvedAt = now()` + store
 *      the rejection reason as `comment`.
 *   6. Create a notification for the post author:
 *      "Your post '{title}' was rejected. Review and resubmit."
 *
 * Returns `{ ok: true, status: "rejected", reason }`.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  // Role gate — only admin/manager can reject.
  if (user!.role !== "admin" && user!.role !== "manager") {
    return NextResponse.json(
      { error: "Only managers and admins can reject posts." },
      { status: 403 }
    );
  }

  // Parse body — { reason?: string }
  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";

  const approval = await db.approval.findUnique({
    where: { id },
  });

  if (!approval) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
  }

  // The Approval model stores `postId` as a plain String (no relation to
  // Post — see prisma/schema.prisma). Fetch the linked post + variants
  // separately so we can flip them back to "draft".
  const post = approval.postId
    ? await db.post.findUnique({
        where: { id: approval.postId },
        include: { variants: true },
      })
    : null;

  // Tenant scope check — walk authorId → User.customerId.
  if (!scope.isSuperAdmin) {
    const author = await db.user.findUnique({
      where: { id: approval.authorId },
      select: { customerId: true },
    });
    if (!author || author.customerId !== scope.customerId) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }
  }

  const title = approval.title;
  const rejecterId = user!.userId;
  const now = new Date();

  // Update the Post + variants back to "draft" so the author can edit +
  // resubmit. The Approval row flips to "rejected" + stores the reason.
  await db.$transaction(async (tx) => {
    if (post) {
      await tx.post.update({
        where: { id: post.id },
        data: { status: "draft" },
      });
      await tx.postVariant.updateMany({
        where: { postId: post.id },
        data: { status: "draft" },
      });
    }
    await tx.approval.update({
      where: { id },
      data: {
        status: "rejected",
        approverId: rejecterId,
        resolvedAt: now,
        // Preserve an existing comment if the new one is empty (the
        // caller may have only wanted to reject without giving a reason).
        comment: reason || approval.comment,
      },
    });
  }).catch((e) => {
    console.error("[reject] transaction failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { error: "Failed to reject — database error." },
      { status: 500 }
    );
  });

  // Notification to the author. Best-effort.
  await createNotification({
    userId: approval.authorId,
    type: "post_failed",
    title: "Your post was rejected",
    message: `Your post “${title}” was rejected. Review and resubmit.${reason ? ` Reason: ${reason}` : ""}`,
    actionView: "composer",
    actionId: post?.id ?? null,
  }).catch((e) => {
    console.error("[reject] notification failed:", e instanceof Error ? e.message : String(e));
  });

  return NextResponse.json({
    ok: true,
    status: "rejected",
    reason: reason || null,
  });
}
