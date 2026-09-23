import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function genApiKey() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return "sf_" + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET() {
  const keys = await db.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(keys.map((k) => ({
    id: k.id, name: k.name, key: k.key, permissions: JSON.parse(k.permissions),
    status: k.status, lastUsed: k.lastUsed?.toISOString() ?? null, createdAt: k.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const { name, permissions } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  let key = genApiKey();
  let existing = await db.apiKey.findUnique({ where: { key } }).catch(() => null);
  while (existing) { key = genApiKey(); existing = await db.apiKey.findUnique({ where: { key } }).catch(() => null); }
  const apiKey = await db.apiKey.create({ data: { name, key, permissions: JSON.stringify(permissions || ["*"]) } });
  return NextResponse.json({ id: apiKey.id, key: apiKey.key, ok: true });
}
