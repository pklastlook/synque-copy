import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/vpn/ip
 * Detects the caller's REAL public IP by querying ipify.org server-side
 * (so it reflects the server's egress IP from this Next.js process, NOT the
 * browser's IP — which is what we want: the IP that social platforms see when
 * Synque's backend posts on the user's behalf).
 *
 * In a real deployment where Synque publishes posts server-side, the publishing
 * traffic egresses from this server. Wrapping it in a WireGuard tunnel (set up
 * at the OS level using the .conf this app generates) changes THIS egress IP.
 * That's the genuine, verifiable signal that the VPN is working.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  let ip: string | null = null;
  let source: "ipify" | "fallback" | "header" = "fallback";
  let error: string | null = null;

  // 1) Try ipify (most reliable — returns the egress IP of the calling server)
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { ip?: string };
      if (data.ip) {
        ip = data.ip;
        source = "ipify";
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  // 2) Fallback: x-forwarded-for header (the browser's apparent IP through any proxy)
  if (!ip) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
      ip = xff.split(",")[0].trim();
      source = "header";
    }
  }

  return NextResponse.json({
    ip,
    source,
    error,
    checkedAt: new Date().toISOString(),
    note:
      "This is the egress IP of Synque's server (what social platforms see when Synque publishes on your behalf). To change it, install the generated WireGuard config at the OS level — then this IP will reflect the tunnel's exit node.",
  });
}
