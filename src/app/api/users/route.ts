import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      title: u.title,
      department: u.department,
      color: u.color,
      avatar: u.avatar,
      permissions: u.permissions ? JSON.parse(u.permissions) : [],
      status: u.status,
      lastActive: u.lastActive?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    }))
  );
}

export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { id, name, email, role, title, department, color, avatar, permissions, status, password } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Only admins/managers can change someone else's role/status
  // Users can edit their own profile (name, email, title, etc.)
  const isSelf = user!.userId === id;
  const canManageOthers = user!.role === "admin" || user!.role === "manager";

  if (!isSelf && !canManageOthers) {
    return NextResponse.json({ error: "You can only edit your own profile" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (title !== undefined) data.title = title;
  if (department !== undefined) data.department = department;
  if (color !== undefined) data.color = color;
  if (avatar !== undefined) data.avatar = avatar;

  // Role/status changes require manager+ (even for self — can't promote yourself)
  if (role !== undefined && canManageOthers) data.role = role;
  if (status !== undefined && canManageOthers) data.status = status;
  if (permissions !== undefined && canManageOthers) data.permissions = JSON.stringify(permissions);

  // Optional password change
  if (typeof password === "string" && password.length >= 8) {
    data.password = await bcrypt.hash(password, 12);
  }

  await db.user.update({ where: { id }, data });

  // Return the updated user so the client can refresh state without a re-fetch
  const updated = await db.user.findUnique({ where: { id } });
  return NextResponse.json({
    ok: true,
    user: updated ? {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      title: updated.title,
      color: updated.color,
      avatar: updated.avatar,
    } : null,
  });
}

export async function DELETE(req: NextRequest) {
  const { user, error } = requireRole(req, "admin");
  if (error) return error;

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Prevent deleting the last admin
  const adminCount = await db.user.count({ where: { role: "admin" } });
  const target = await db.user.findUnique({ where: { id } });
  if (target?.role === "admin" && adminCount <= 1) {
    return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
  }

  await db.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
