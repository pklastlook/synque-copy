import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/workspace/share
 *   Returns all workspace shares for the current user:
 *   - Shares I've sent (my workspace shared with others)
 *   - Shares I've received (others' workspaces shared with me)
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const [sentShares, receivedShares, myWorkspace] = await Promise.all([
    db.workspaceShare.findMany({
      where: { sharedByUserId: user!.userId },
      include: {
        workspace: { select: { name: true } },
      },
    }),
    db.workspaceShare.findMany({
      where: { sharedWithUserId: user!.userId },
      include: {
        workspace: { select: { name: true, ownerId: true } },
      },
    }),
    db.workspace.findFirst({ where: { ownerId: user!.userId } }),
  ]);

  // Fetch user details separately (the WorkspaceShare model uses plain userId fields, not relations)
  const allUserIds = new Set<string>();
  for (const s of sentShares) allUserIds.add(s.sharedWithUserId);
  for (const s of receivedShares) allUserIds.add(s.sharedByUserId);
  const shareUsers = await db.user.findMany({
    where: { id: { in: [...allUserIds] } },
    select: { id: true, name: true, email: true, avatar: true, color: true },
  });
  const userMap = new Map(shareUsers.map((u) => [u.id, u]));

  return NextResponse.json({
    sent: sentShares.map((s) => {
      const u = userMap.get(s.sharedWithUserId);
      return {
        id: s.id,
        workspaceName: s.workspace.name,
        sharedWith: u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar, color: u.color } : null,
        permission: s.permission,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      };
    }),
    received: receivedShares.map((s) => {
      const u = userMap.get(s.sharedByUserId);
      return {
        id: s.id,
        workspaceName: s.workspace.name,
        sharedBy: u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar, color: u.color } : null,
        permission: s.permission,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      };
    }),
    myWorkspaceId: myWorkspace?.id ?? null,
    myWorkspaceName: myWorkspace?.name ?? null,
  });
}

/**
 * POST /api/workspace/share
 *   Share my workspace with another user.
 *   Body: { sharedWithUserId, permission }
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { sharedWithUserId, permission } = await req.json() as { sharedWithUserId: string; permission?: string };
  if (!sharedWithUserId) return NextResponse.json({ error: "sharedWithUserId required" }, { status: 400 });
  if (sharedWithUserId === user!.userId) return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });

  // Find my workspace
  const myWorkspace = await db.workspace.findFirst({ where: { ownerId: user!.userId } });
  if (!myWorkspace) return NextResponse.json({ error: "You don't have a workspace" }, { status: 404 });

  // Check if the target user exists + is in the same tenant (or super-admin)
  const scope = getTenantScope(user!);
  const targetUser = await db.user.findFirst({
    where: scope.isSuperAdmin ? { id: sharedWithUserId } : tenantWhere(scope, { id: sharedWithUserId }),
  });
  if (!targetUser) return NextResponse.json({ error: "User not found in your tenant" }, { status: 404 });

  // Create or update the share
  const share = await db.workspaceShare.upsert({
    where: { workspaceId_sharedWithUserId: { workspaceId: myWorkspace.id, sharedWithUserId } },
    update: { permission: permission ?? "view", status: "pending", sharedByUserId: user!.userId },
    create: {
      workspaceId: myWorkspace.id,
      sharedWithUserId,
      sharedByUserId: user!.userId,
      permission: permission ?? "view",
      status: "pending",
    },
  });

  return NextResponse.json({ id: share.id, ok: true, sharedWith: targetUser.name });
}

/**
 * PATCH /api/workspace/share
 *   Accept or revoke a workspace share.
 *   Body: { shareId, action: "accept" | "revoke" }
 */
export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { shareId, action } = await req.json() as { shareId: string; action: "accept" | "revoke" };

  if (action === "accept") {
    await db.workspaceShare.update({
      where: { id: shareId, sharedWithUserId: user!.userId },
      data: { status: "accepted", acceptedAt: new Date() },
    }).catch((e) => console.error("[api]", e));
    return NextResponse.json({ ok: true, accepted: true });
  }

  if (action === "revoke") {
    // Either the sharer or the receiver can revoke
    await db.workspaceShare.deleteMany({
      where: { id: shareId, OR: [{ sharedByUserId: user!.userId }, { sharedWithUserId: user!.userId }] },
    }).catch((e) => console.error("[api]", e));
    return NextResponse.json({ ok: true, revoked: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

/**
 * DELETE /api/workspace/share
 *   Stop ALL sharing for the current user.
 *   - If the user is the workspace owner: deletes all outgoing shares (stops sharing with everyone)
 *   - Also deletes all incoming shares (leaves all received workspaces)
 *
 *   Body: { scope: "all" | "sent" | "received" }
 */
export async function DELETE(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => ({}) as { scope?: string });
  const scope = body.scope ?? "all";

  const myWorkspace = await db.workspace.findFirst({ where: { ownerId: user!.userId } });
  let deletedCount = 0;

  if (scope === "all" || scope === "sent") {
    // Stop sharing MY workspace with everyone
    if (myWorkspace) {
      const res = await db.workspaceShare.deleteMany({
        where: { workspaceId: myWorkspace.id },
      }).catch(() => ({ count: 0 }));
      deletedCount += res.count;
    }
  }

  if (scope === "all" || scope === "received") {
    // Leave all workspaces shared WITH me
    const res = await db.workspaceShare.deleteMany({
      where: { sharedWithUserId: user!.userId },
    }).catch(() => ({ count: 0 }));
    deletedCount += res.count;
  }

  return NextResponse.json({ ok: true, deleted: deletedCount });
}
