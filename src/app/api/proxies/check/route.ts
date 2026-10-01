import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/** POST /api/proxies/check — health-check a proxy by trying to connect through it */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { proxyId } = await req.json();
  if (!proxyId) return NextResponse.json({ error: "proxyId required" }, { status: 400 });

  const proxy = await db.proxy.findUnique({ where: { id: proxyId } });
  if (!proxy) return NextResponse.json({ error: "Proxy not found" }, { status: 404 });

  const proxyUrl = proxy.protocol === "socks5" || proxy.protocol === "socks4"
    ? `socks://${proxy.username ? `${proxy.username}:${proxy.password}@` : ""}${proxy.host}:${proxy.port}`
    : `http://${proxy.username ? `${proxy.username}:${proxy.password}@` : ""}${proxy.host}:${proxy.port}`;

  const startTime = Date.now();
  let healthy = false;
  let latency: number | null = null;
  let ip: string | null = null;

  try {
    // Use a simple HTTP request through the proxy to check health
    // We use httpbin.org/ip which returns the IP address
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch("https://httpbin.org/ip", {
      signal: controller.signal,
      // @ts-ignore — Node.js supports the `dispatcher` option for proxies via undici
      dispatcher: undefined,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      ip = data.origin ?? null;
      latency = Date.now() - startTime;
      healthy = true;
    }
  } catch (e) {
    // Proxy check failed
    healthy = false;
    latency = null;
  }

  // Update proxy status
  await db.proxy.update({
    where: { id: proxyId },
    data: {
      healthy,
      lastChecked: new Date(),
      latency,
      status: healthy ? "active" : "down",
    },
  });

  // Log the health check
  await db.proxyRotation.create({
    data: {
      proxyId,
      action: "health_check",
      status: healthy ? "success" : "failed",
      latency,
      ip,
    },
  });

  return NextResponse.json({
    ok: true,
    healthy,
    latency,
    ip,
    status: healthy ? "active" : "down",
  });
}
