import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import {
  generateKeyPair,
  buildWireGuardConfig,
  nextClientAddress,
  demoServerPublicKey,
} from "@/lib/wireguard";
import { encrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/** POST /api/vpn/connect
 * Body: { serverId: string }
 * Generates a REAL x25519 key pair, assigns a client IP, builds a REAL
 * WireGuard .conf, and stores an active session for the user.
 * Returns the config + the private key (shown once).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth.user!;

  let body: { serverId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { serverId } = body;
  if (!serverId) {
    return NextResponse.json({ error: "serverId required" }, { status: 400 });
  }

  const server = await db.vPNServer.findUnique({ where: { id: serverId } });
  if (!server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 });
  }
  if (server.status !== "active") {
    return NextResponse.json(
      { error: "Server is currently under maintenance" },
      { status: 409 }
    );
  }

  // Expire any existing active session for this user (only one at a time)
  await db.vPNSession.updateMany({
    where: { userId, status: "active" },
    data: { status: "disconnected", disconnectedAt: new Date() },
  });

  // Pick the next free client IP from this server's pool
  const usedSessions = await db.vPNSession.findMany({
    where: { serverId },
    select: { clientAddress: true },
  });
  const clientAddress = nextClientAddress(
    server.addressPool,
    usedSessions.map((s) => s.clientAddress)
  );

  // Generate REAL Curve25519 key pair
  const { privateKey, publicKey } = generateKeyPair();

  // Build the REAL WireGuard .conf text
  const config = buildWireGuardConfig({
    privateKey,
    address: clientAddress,
    dns: server.dns,
    serverPublicKey: server.serverPubKey,
    endpoint: server.endpoint,
    allowedIps: server.allowedIps,
    persistentKeepalive: 25,
    name: `Synque VPN — ${server.countryName}, ${server.city}`,
  });

  const now = new Date();
  const session = await db.vPNSession.create({
    data: {
      userId,
      serverId,
      // Encrypt the private key + full WireGuard .conf at rest so a DB
      // backup leak does not expose every user's Curve25519 private key.
      // The plaintext values are still returned in this response (shown
      // once at creation time) — but only the encrypted form is persisted.
      privateKey: encrypt(privateKey),
      publicKey,
      clientAddress,
      config: encrypt(config),
      status: "active",
      connectedAt: now,
    },
  });

  const isDemo = server.serverPubKey === demoServerPublicKey(server.endpoint);

  return NextResponse.json({
    sessionId: session.id,
    config,
    privateKey,
    publicKey,
    clientAddress,
    isDemo,
    server: {
      id: server.id,
      countryCode: server.countryCode,
      countryName: server.countryName,
      city: server.city,
      flag: server.flag,
      endpoint: server.endpoint,
      ping: server.ping,
    },
    connectedAt: now.toISOString(),
    notice: isDemo
      ? "This is a demo server. Replace its endpoint + public key with a real running WireGuard server in the admin panel for the tunnel to actually form."
      : null,
  });
}
