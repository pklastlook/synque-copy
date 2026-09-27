import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function genKey() {
  const segments = ["SQ", "PRO", "2026"];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  segments.push(Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""));
  return segments.join("-");
}

export async function GET() {
  const keys = await db.serialKey.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(keys.map((k) => ({
    id: k.id, key: k.key, status: k.status, deviceName: k.deviceName,
    customerId: k.customerId, customerName: k.customer?.name ?? null,
    activatedAt: k.activatedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerId } = body;
  // Generate a unique key
  let key = genKey();
  let existing = await db.serialKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e));
  while (existing) { key = genKey(); existing = await db.serialKey.findUnique({ where: { key } }).catch((e) => console.error("[api]", e)); }
  const serialKey = await db.serialKey.create({ data: { key, customerId: customerId ?? null } });
  return NextResponse.json({ id: serialKey.id, key: serialKey.key, ok: true });
}
