import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireAuth, requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

// Hierarchy used to guard against self-escalation in PATCH.
// Mirrors the ROLE_HIERARCHY kept inside src/lib/auth-guard.ts.
const ROLE_LEVELS: Record<string, number> = {
  admin: 5,
  manager: 4,
  editor: 3,
  member: 2,
  viewer: 1,
};

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  // Super-admins see every user across tenants. Everyone else only sees
  // users that belong to their own customer (tenant).
  const users = await db.user.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    orderBy: { createdAt: "asc" },
  });
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
      gender: u.gender,
      birthDate: u.birthDate?.toISOString() ?? null,
      phone: u.phone,
      bio: u.bio,
      timezone: u.timezone,
      language: u.language,
      customerId: u.customerId,
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
  const { id, name, email, role, title, department, color, avatar, gender, birthDate, phone, bio, timezone, language, permissions, status, password } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Only admins/managers can change someone else's profile fields beyond
  // their own. Users can always edit their own profile (name, email, etc.).
  const isSelf = user!.userId === id;
  const isAdmin = user!.role === "admin";
  const canManageOthers = isAdmin || user!.role === "manager";

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
  if (gender !== undefined) data.gender = gender;
  if (birthDate !== undefined) data.birthDate = birthDate ? new Date(birthDate) : null;
  if (phone !== undefined) data.phone = phone;
  if (bio !== undefined) data.bio = bio;
  if (timezone !== undefined) data.timezone = timezone;
  if (language !== undefined) data.language = language;

  // ---- Privilege assignments (SEC-6 fix) ----
  // role & permissions are admin-only — managers MUST NOT be able to set
  // these on other users (prevents privilege escalation via the API).
  if (role !== undefined) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can change user roles" },
        { status: 403 }
      );
    }
    // Prevent self-escalation: even an admin cannot raise their own role
    // above its current level (e.g. cannot set themselves to a hypothetical
    // higher tier). Admin is the ceiling, so in practice this blocks
    // tampering attempts and any future role above admin.
    if (isSelf) {
      const currentLevel = ROLE_LEVELS[user!.role] ?? 0;
      const newLevel = ROLE_LEVELS[String(role)] ?? 0;
      if (newLevel > currentLevel) {
        return NextResponse.json(
          { error: "You cannot escalate your own role" },
          { status: 403 }
        );
      }
    }
    data.role = role;
  }

  if (permissions !== undefined) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can change user permissions" },
        { status: 403 }
      );
    }
    data.permissions = JSON.stringify(permissions);
  }

  // status can be changed by admins or managers (managers can suspend/reactivate
  // a teammate, but cannot change roles/permissions).
  if (status !== undefined) {
    if (!canManageOthers) {
      return NextResponse.json(
        { error: "Only admins or managers can change user status" },
        { status: 403 }
      );
    }
    data.status = status;
  }

  // Optional password change
  if (typeof password === "string" && password.length >= 8) {
    data.password = await bcrypt.hash(password, 12);
  }

  try {
    await db.user.update({ where: { id }, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

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
      gender: updated.gender,
      birthDate: updated.birthDate?.toISOString() ?? null,
      phone: updated.phone,
      bio: updated.bio,
      timezone: updated.timezone,
      language: updated.language,
      department: updated.department,
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
