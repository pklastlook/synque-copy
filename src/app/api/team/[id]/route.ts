import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "manager", "editor", "member", "viewer"];

/** PATCH — update a teammate's role / title / status. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.role === "string") {
    if (!ALLOWED_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
  }
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.color === "string") data.color = body.color;
  if (typeof body.status === "string") {
    if (!["active", "suspended", "invited"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields supplied" }, { status: 400 });
  }

  const updated = await db.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true, id: updated.id });
}

/** DELETE — remove a teammate. Accounts owned by this user are reassigned to
 *  `newOwnerId` if provided (e.g. the admin who removes them); otherwise they
 *  are left intact and the FK constraint will fail, in which case we return 409. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const newOwnerId = req.nextUrl.searchParams.get("reassignTo");

  // Prevent self-deletion safety check is left to the client; here we just
  // enforce that the user exists.
  const existing = await db.user.findUnique({ where: { id } }).catch((e) => console.error("[api]", e));
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If the user owns accounts, reassign ownership before deletion (otherwise
  // the FK constraint on Account.ownerId will block the delete).
  const ownedAccounts = await db.account.findMany({ where: { ownerId: id } });
  if (ownedAccounts.length > 0) {
    if (!newOwnerId) {
      return NextResponse.json(
        {
          error: "User owns accounts — reassign them first via ?reassignTo=<userId>",
        },
        { status: 409 }
      );
    }
    const newOwner = await db.user.findUnique({ where: { id: newOwnerId } }).catch((e) => console.error("[api]", e));
    if (!newOwner) {
      return NextResponse.json({ error: "reassignTo user not found" }, { status: 404 });
    }
    await db.account.updateMany({ where: { ownerId: id }, data: { ownerId: newOwnerId } });
  }

  // Reassign authored posts as well.
  await db.post.updateMany({ where: { authorId: id }, data: { authorId: newOwnerId ?? id } }).catch(() => {});

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
