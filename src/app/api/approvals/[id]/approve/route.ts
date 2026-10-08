import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/approvals/[id]/approve
 *
 * P2-CORE — Approve a pending post (or pending approval request).
 *
 * Flow:
 *   1. Resolve the Approval row + its linked Post (if any).
 *   2. Verify tenant scope (approval author must belong to caller's tenant).
 *   3. Verify role — only admin/manager can approve.
 *   4. Flip the Post + all its variants to `published`.
 *   5. Trigger the publish flow — POST /api/publish/[platform] for each variant.
 *      (Best-effort: a failed publish doesn't undo the approval.)
 *   6. Mark the Approval row as `approved` + `resolvedAt = now()`.
 *   7. Create notifications:
 *      - To the post author: "Your post '{title}' was approved and published"
 *      - To the approver: "You approved '{title}'"
 *
 * Returns `{ ok: true, postStatus, publishedVariants }`.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { id } = await params;

  // Role gate — only admin/manager can approve.
  if (user!.role !== "admin" && user!.role !== "manager") {
    return NextResponse.json(
      { error: "Only managers and admins can approve posts." },
      { status: 403 }
    );
  }

  const approval = await db.approval.findUnique({
    where: { id },
  });

  if (!approval) {
    return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
  }

  // The Approval model stores `postId` as a plain String (no relation to
  // Post — see prisma/schema.prisma). Fetch the linked post + variants
  // separately so we can flip them to "published" + trigger the publish flow.
  const post = approval.postId
    ? await db.post.findUnique({
        where: { id: approval.postId },
        include: { variants: true },
      })
    : null;

  // Tenant scope check — walk authorId → User.customerId (Approval has no
  // customerId column of its own). Super-admins bypass.
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
  const approverId = user!.userId;
  const now = new Date();

  // Update the Post + its variants to "published" in one transaction.
  // We also flip the Approval row to "approved" so the kanban moves.
  await db.$transaction(async (tx) => {
    if (post) {
      await tx.post.update({
        where: { id: post.id },
        data: { status: "published" },
      });
      await tx.postVariant.updateMany({
        where: { postId: post.id },
        data: { status: "published", publishedAt: now },
      });
    }
    await tx.approval.update({
      where: { id },
      data: {
        status: "approved",
        approverId,
        resolvedAt: now,
      },
    });
  }).catch((e) => {
    console.error("[approve] transaction failed:", e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { error: "Failed to approve — database error." },
      { status: 500 }
    );
  });

  // Trigger the publish flow — fire-and-forget POST /api/publish/[platform]
  // for each variant. Failures don't undo the approval (the post is already
  // marked "published"); they're logged for follow-up.
  let publishedVariants = 0;
  if (post && post.variants.length > 0) {
    const results = await Promise.allSettled(
      post.variants.map(async (v) => {
        // Look up the account's platform for the URL.
        const account = await db.account.findUnique({
          where: { id: v.accountId },
          select: { platform: true },
        });
        if (!account) return { ok: false, reason: "account_missing" };

        try {
          const res = await fetch(
            `${req.nextUrl.origin}/api/publish/${account.platform}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // Forward the caller's JWT so /api/publish can authenticate.
                // The scheduler key path is not used here — this is a
                // user-initiated approve, not an automated scheduler call.
                ...(req.headers.get("authorization")
                  ? { authorization: req.headers.get("authorization") as string }
                  : {}),
                // Forward cookies too (cookie-based sessions).
                ...(req.headers.get("cookie")
                  ? { cookie: req.headers.get("cookie") as string }
                  : {}),
              },
              body: JSON.stringify({
                userId: approval.authorId,
                accountId: v.accountId,
                content: v.content + (v.hashtags ? `\n\n${v.hashtags}` : ""),
              }),
            }
          );
          return { ok: res.ok, status: res.status };
        } catch (e) {
          return {
            ok: false,
            reason: "network",
            message: e instanceof Error ? e.message : String(e),
          };
        }
      })
    );
    publishedVariants = results.filter((r) => r.status === "fulfilled" && (r.value as { ok: boolean }).ok).length;
  }

  // Notifications — author + approver. Both are best-effort.
  await Promise.all([
    createNotification({
      userId: approval.authorId,
      type: "post_published",
      title: "Your post was approved",
      message: `Your post “${title}” was approved and published${publishedVariants > 0 ? ` to ${publishedVariants} account${publishedVariants === 1 ? "" : "s"}` : ""}.`,
      actionView: "calendar",
      actionId: post?.id ?? null,
    }),
    createNotification({
      userId: approverId,
      type: "post_published",
      title: "You approved a post",
      message: `You approved “${title}”${publishedVariants > 0 ? ` — published to ${publishedVariants} account${publishedVariants === 1 ? "" : "s"}` : ""}.`,
      actionView: "approvals",
      actionId: id,
    }),
  ]).catch((e) => {
    console.error("[approve] notification failed:", e instanceof Error ? e.message : String(e));
  });

  return NextResponse.json({
    ok: true,
    status: "approved",
    postStatus: post ? "published" : null,
    publishedVariants,
  });
}
