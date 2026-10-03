import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { demoServerPublicKey } from "@/lib/wireguard";

export const dynamic = "force-dynamic";

/**
 * Default server catalogue — seeded into the DB on first access.
 * These are REAL locations with REAL region-appropriate endpoint hostnames,
 * but the `serverPubKey` is a deterministic demo placeholder. For a tunnel to
 * actually form, an admin must replace the placeholder with the real server's
 * Curve25519 public key (and ensure the endpoint host:port points to a running
 * WireGuard server).
 */
const DEFAULT_SERVERS = [
  { countryCode: "US", countryName: "United States", city: "New York", flag: "🇺🇸", endpoint: "us-east.synque-vpn.example:51820", ping: 45, premium: false },
  { countryCode: "US", countryName: "United States", city: "Los Angeles", flag: "🇺🇸", endpoint: "us-west.synque-vpn.example:51820", ping: 52, premium: false },
  { countryCode: "UK", countryName: "United Kingdom", city: "London", flag: "🇬🇧", endpoint: "uk-lon.synque-vpn.example:51820", ping: 62, premium: false },
  { countryCode: "DE", countryName: "Germany", city: "Frankfurt", flag: "🇩🇪", endpoint: "de-fra.synque-vpn.example:51820", ping: 58, premium: false },
  { countryCode: "NL", countryName: "Netherlands", city: "Amsterdam", flag: "🇳🇱", endpoint: "nl-ams.synque-vpn.example:51820", ping: 55, premium: false },
  { countryCode: "FR", countryName: "France", city: "Paris", flag: "🇫🇷", endpoint: "fr-par.synque-vpn.example:51820", ping: 65, premium: false },
  { countryCode: "CA", countryName: "Canada", city: "Toronto", flag: "🇨🇦", endpoint: "ca-tor.synque-vpn.example:51820", ping: 48, premium: false },
  { countryCode: "JP", countryName: "Japan", city: "Tokyo", flag: "🇯🇵", endpoint: "jp-tyo.synque-vpn.example:51820", ping: 120, premium: true },
  { countryCode: "SG", countryName: "Singapore", city: "Singapore", flag: "🇸🇬", endpoint: "sg-sin.synque-vpn.example:51820", ping: 110, premium: true },
  { countryCode: "AE", countryName: "UAE", city: "Dubai", flag: "🇦🇪", endpoint: "ae-dxb.synque-vpn.example:51820", ping: 95, premium: true },
  { countryCode: "PK", countryName: "Pakistan", city: "Karachi", flag: "🇵🇰", endpoint: "pk-khi.synque-vpn.example:51820", ping: 15, premium: false },
  { countryCode: "IN", countryName: "India", city: "Mumbai", flag: "🇮🇳", endpoint: "in-bom.synque-vpn.example:51820", ping: 25, premium: false },
];

async function ensureSeeded() {
  const count = await db.vPNServer.count();
  if (count > 0) return;
  await db.vPNServer.createMany({
    data: DEFAULT_SERVERS.map((s) => ({
      ...s,
      serverPubKey: demoServerPublicKey(s.endpoint),
      load: Math.floor(Math.random() * 40) + 15,
    })),
  });
}

/** GET /api/vpn/servers — list all available VPN servers */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  await ensureSeeded();

  const servers = await db.vPNServer.findMany({
    orderBy: [{ countryCode: "asc" }, { city: "asc" }],
  });

  return NextResponse.json({
    servers: servers.map((s) => ({
      id: s.id,
      countryCode: s.countryCode,
      countryName: s.countryName,
      city: s.city,
      flag: s.flag,
      endpoint: s.endpoint,
      serverPubKey: s.serverPubKey,
      allowedIps: s.allowedIps,
      dns: s.dns,
      addressPool: s.addressPool,
      ping: s.ping,
      load: s.load,
      premium: s.premium,
      status: s.status,
      // demo flag = server pub key is the deterministic placeholder
      isDemo: s.serverPubKey === demoServerPublicKey(s.endpoint),
    })),
  });
}
