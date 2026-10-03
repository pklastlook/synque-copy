import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/api-keys/[id]
 *
 * Admin-only. Verifies the target key exists before mutating (defensive
 * 404 instead of leaking presence via Prisma's "record not found" error).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireRole(req, "admin");
  if (error) return error;

  const existing = await db.apiKey.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.name) data.name = body.name;
  if (body.permissions) data.permissions = JSON.stringify(body.permissions);
  await db.apiKey.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/api-keys/[id]
 *
 * Admin-only. Verifies the target key exists before deleting.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireRole(_req, "admin");
  if (error) return error;

  const existing = await db.apiKey.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.apiKey.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
