import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
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
      permissions: u.permissions ? JSON.parse(u.permissions) : [],
      status: u.status,
      lastActive: u.lastActive?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    }))
  );
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, role, title, department, permissions, status } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (title !== undefined) data.title = title;
  if (department !== undefined) data.department = department;
  if (permissions !== undefined) data.permissions = JSON.stringify(permissions);
  if (status !== undefined) data.status = status;
  await db.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
