import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "node:crypto";

export const dynamic = "force-dynamic";

function genApiKey() {
  // Use cryptographic randomness instead of Math.random() for security-sensitive tokens.
  return "sf_" + randomBytes(20).toString("hex");
}

export async function GET() {
  const keys = await db.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(keys.map((k) => ({
    id: k.id, name: k.name,
    // Mask the key in GET responses — only show prefix + last 4 chars.
    key: k.key.length > 12 ? k.key.slice(0, 8) + "…" + k.key.slice(-4) : k.key,
    permissions: JSON.parse(k.permissions),
    status: k.status, lastUsed: k.lastUsed?.toISOString() ?? null, createdAt: k.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const { name, permissions } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  let key = genApiKey();
  let existing = await db.apiKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e));
  while (existing) { key = genApiKey(); existing = await db.apiKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e)); }
  const apiKey = await db.apiKey.create({ data: { name, key, permissions: JSON.stringify(permissions || ["*"]) } });
  return NextResponse.json({ id: apiKey.id, key: apiKey.key, ok: true });
}
