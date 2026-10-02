import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/vpn/verify
 * Re-checks the server's egress IP (via ipify) and compares it to the last
 * recorded IP. If the IP changed since the session was created, the tunnel is
 * likely active. Records the new IP on the session.
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth.user!;

  const session = await db.vPNSession.findFirst({
    where: { userId, status: "active" },
    include: { server: true },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return NextResponse.json(
      { error: "No active VPN session. Generate a config first." },
      { status: 404 }
    );
  }

  // Fetch current egress IP
  let currentIp: string | null = null;
  let source = "fallback";
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { ip?: string };
      if (data.ip) {
        currentIp = data.ip;
        source = "ipify";
      }
    }
  } catch {
    // fall through to header
  }

  if (!currentIp) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
      currentIp = xff.split(",")[0].trim();
      source = "header";
    }
  }

  // Record on the session
  const previousIp = session.lastVerifiedIp;
  const changed = previousIp !== null && previousIp !== currentIp;
  await db.vPNSession.update({
    where: { id: session.id },
    data: { lastVerifiedIp: currentIp, lastVerifiedAt: new Date() },
  });

  return NextResponse.json({
    currentIp,
    previousIp,
    changed,
    source,
    verifiedAt: new Date().toISOString(),
    server: session.server
      ? {
          countryCode: session.server.countryCode,
          countryName: session.server.countryName,
          city: session.server.city,
        }
      : null,
    note:
      "Connect the WireGuard tunnel at the OS level (import the .conf into the WireGuard app), then click Verify. If the egress IP changed, the tunnel is active.",
  });
}
