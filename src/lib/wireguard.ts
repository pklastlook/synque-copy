/**
 * WireGuard utility — REAL cryptographic key generation + config builder.
 *
 * WireGuard uses Curve25519 (RFC 7748) for key exchange. Keys are 32 raw bytes
 * base64-encoded (44 chars incl. padding). We use Node's built-in
 * `crypto.generateKeyPairSync('x25519')` to produce genuinely valid keys.
 *
 * The .conf files produced here follow the official WireGuard config format
 * and will import cleanly into the official WireGuard clients (Windows, macOS,
 * Linux, iOS, Android). When the `VPNServer.endpoint` + `serverPubKey` point to
 * a real running WireGuard server, importing this config creates an actual
 * encrypted tunnel.
 */

import crypto from "node:crypto";

export interface WireGuardKeyPair {
  privateKey: string; // base64 (44 chars)
  publicKey: string;  // base64 (44 chars)
}

/**
 * Generate a REAL Curve25519 key pair for WireGuard.
 * These are cryptographically valid — importable by any WireGuard client.
 */
export function generateKeyPair(): WireGuardKeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("x25519", {
    privateKeyEncoding: { type: "pkcs8", format: "der" },
    publicKeyEncoding: { type: "spki", format: "der" },
  });
  // PKCS8/SPKI DER for x25519 is a fixed 48-byte wrapper around the 32-byte
  // raw key. Extract the last 32 bytes and base64-encode (WireGuard format).
  const privRaw = privateKey.subarray(privateKey.length - 32);
  const pubRaw = publicKey.subarray(publicKey.length - 32);
  return {
    privateKey: privRaw.toString("base64"),
    publicKey: pubRaw.toString("base64"),
  };
}

export interface WireGuardConfigParams {
  /** client private key (base64) */
  privateKey: string;
  /** client IP + CIDR e.g. "10.66.0.5/32" */
  address: string;
  /** DNS servers, comma-separated */
  dns: string;
  /** server public key (base64) */
  serverPublicKey: string;
  /** server endpoint host:port */
  endpoint: string;
  /** allowed IPs (traffic to route through tunnel) */
  allowedIps: string;
  /** keepalive interval (seconds). 0 = disabled */
  persistentKeepalive?: number;
  /** human-friendly name for the [Interface] comment */
  name?: string;
}

/**
 * Build a REAL WireGuard .conf file from the given parameters.
 * Output is the exact text to write to a `.conf` file.
 */
export function buildWireGuardConfig(p: WireGuardConfigParams): string {
  const keepalive =
    p.persistentKeepalive && p.persistentKeepalive > 0
      ? `\nPersistentKeepalive = ${p.persistentKeepalive}`
      : "";
  const nameComment = p.name ? `# ${p.name}\n` : "";
  return (
    `${nameComment}` +
    `[Interface]\n` +
    `PrivateKey = ${p.privateKey}\n` +
    `Address = ${p.address}\n` +
    `DNS = ${p.dns}\n` +
    `\n` +
    `[Peer]\n` +
    `PublicKey = ${p.serverPublicKey}\n` +
    `Endpoint = ${p.endpoint}\n` +
    `AllowedIPs = ${p.allowedIps}${keepalive}\n`
  );
}

/**
 * Assign the next free client IP from a pool.
 * Simple round-robin: pool base "10.66.0.0/24" → pick the lowest unused
 * address in the range 10.66.0.2 .. 10.66.0.254.
 * (We avoid .0 network, .1 usually the server, .255 broadcast.)
 */
export function nextClientAddress(
  poolCidr: string,
  usedAddresses: string[]
): string {
  const match = poolCidr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
  if (!match) return "10.66.0.2/32";
  const [, a, b, c] = match.map(Number);
  const used = new Set(usedAddresses.map((s) => s.split("/")[0]));
  // Start at .2 (server is typically .1), go up to .254
  for (let host = 2; host <= 254; host++) {
    const ip = `${a}.${b}.${c}.${host}`;
    if (!used.has(ip)) return `${ip}/32`;
  }
  // Fallback — pool exhausted; cycle back
  return `${a}.${b}.${c}.${(Math.floor(Math.random() * 250) + 2)}/32`;
}

/**
 * Generate a stable psuedo-random server public key placeholder when no real
 * server is configured yet. NOTE: a placeholder key will NOT form a working
 * tunnel — the admin must replace it with the real server's public key.
 * (Used only for demo server seeding so the UI is populated.)
 */
export function demoServerPublicKey(seed: string): string {
  return crypto.createHash("sha256").update("wg-demo-" + seed).digest().subarray(0, 32).toString("base64");
}

/**
 * Validate a base64 WireGuard key (32 bytes → 44 base64 chars ending in '=').
 */
export function isValidWireGuardKey(key: string): boolean {
  if (typeof key !== "string") return false;
  // base64 of 32 bytes = 44 chars, last char is '=' padding
  if (key.length !== 44) return false;
  if (!/^[A-Za-z0-9+/]+=$/.test(key)) return false;
  try {
    const buf = Buffer.from(key, "base64");
    return buf.length === 32;
  } catch {
    return false;
  }
}
