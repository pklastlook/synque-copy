import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/** GET /api/proxies — list all proxies + their assigned accounts */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const proxies = await db.proxy.findMany({
    include: {
      accounts: { include: { account: { select: { id: true, platform: true, handle: true, displayName: true } } } },
      _count: { select: { rotations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ proxies });
}

/** POST /api/proxies — create a new proxy */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { name, host, port, username, password, protocol, country, city } = body;

  if (!name || !host || !port) {
    return NextResponse.json({ error: "name, host, and port are required" }, { status: 400 });
  }

  const proxy = await db.proxy.create({
    data: {
      name,
      host: String(host),
      port: Number(port),
      username: username || null,
      password: password || null,
      protocol: protocol || "http",
      country: country || null,
      city: city || null,
    },
  });

  return NextResponse.json({ proxy });
}

/** DELETE /api/proxies — delete a proxy by id */
export async function DELETE(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { id } = req.nextUrl.searchParams;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.proxy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
