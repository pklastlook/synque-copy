import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const status = req.nextUrl.searchParams.get("status");
  const authorId = req.nextUrl.searchParams.get("authorId");

  // Tenant-scoped list: tenant users only see posts in their own tenant;
  // super-admins see all. Existing status/authorId filters are merged in.
  const posts = await db.post.findMany({
    where: tenantWhere(scope, {
      ...(status ? { status } : {}),
      ...(authorId ? { authorId } : {}),
    }) as { customerId?: string; status?: string; authorId?: string },
    include: {
      author: true,
      variants: { include: { account: { include: { owner: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    posts.map((p) => ({
      id: p.id,
      title: p.title,
      caption: p.caption,
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      tone: p.tone,
      status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      authorId: p.authorId,
      authorName: p.author.name,
      createdAt: p.createdAt.toISOString(),
      variants: p.variants.map((v) => ({
        id: v.id,
        accountId: v.accountId,
        platform: v.account.platform,
        handle: v.account.handle,
        content: v.content,
        hashtags: v.hashtags,
        status: v.status,
        publishedAt: v.publishedAt?.toISOString() ?? null,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        reach: v.reach,
        impressions: v.impressions,
        saves: v.saves,
      })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { title, caption, mediaUrl, tone, scheduledAt, accountIds, variants, authorId } = body as {
    title: string;
    caption: string;
    mediaUrl?: string | null;
    tone?: string;
    scheduledAt?: string | null;
    accountIds: string[];
    variants: Record<string, { content: string; hashtags?: string }>;
    authorId: string;
  };

  // Bind customerId to the caller's tenant. A non-super-admin always stamps
  // their own tenant; a super-admin (no customerId) leaves it null (legacy /
  // cross-tenant bucket). Mirrors the P1-2-b pattern in /api/team POST.
  const postCustomerId = scope.isSuperAdmin ? null : scope.customerId;

  // P2-CORE — Approval workflow automation.
  // Editors and members can NOT publish directly — their posts are auto-
  // routed to "pending_approval" so a manager / admin must approve before
  // they go live. Admins and managers keep the existing behavior (publish
  // immediately or schedule).
  //
  // The `sendForApproval` flag from the Composer takes precedence — if the
  // user explicitly asked for approval (regardless of role), honor it.
  const isApproverRole =
    user!.role === "admin" || user!.role === "manager";
  const forcedApproval = body.sendForApproval === true;
  const requiresApproval = forcedApproval || !isApproverRole;

  // Status logic — three branches:
  //   1. requiresApproval  → "pending_approval" (regardless of schedule)
  //   2. scheduledAt set   → "scheduled" (approver roles only)
  //   3. else              → "published" (approver roles only)
  const postStatus = requiresApproval
    ? "pending_approval"
    : scheduledAt
    ? "scheduled"
    : "published";

  // Variants inherit the same status EXCEPT pending_approval ones — for
  // pending posts the variants stay "draft" until the approval flow
  // flips them to "published" (POST /api/approvals/[id]/approve).
  const variantStatus = requiresApproval ? "draft" : postStatus;

  const post = await db.post.create({
    data: {
      title,
      caption,
      mediaUrl: mediaUrl ?? null,
      mediaType: "image",
      tone: tone ?? "professional",
      status: postStatus,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      authorId,
      customerId: postCustomerId,
      variants: {
        create: accountIds.map((aid) => ({
          accountId: aid,
          content: variants[aid]?.content ?? caption,
          hashtags: variants[aid]?.hashtags ?? null,
          status: variantStatus,
          // Only set publishedAt for actually-published variants —
          // scheduled / pending variants leave it null.
          publishedAt:
            variantStatus === "published" ? new Date() : null,
        })),
      },
    },
    include: { variants: true },
  });

  await db.activity.create({
    data: {
      userId: authorId,
      type:
        postStatus === "pending_approval"
          ? "post_pending_approval"
          : scheduledAt
          ? "post_scheduled"
          : "post_published",
      description:
        postStatus === "pending_approval"
          ? `submitted “${title}” for approval to ${accountIds.length} accounts`
          : `${scheduledAt ? "scheduled" : "published"} “${title}” to ${accountIds.length} accounts`,
    },
  });

  return NextResponse.json({ id: post.id, ok: true, status: postStatus });
}
