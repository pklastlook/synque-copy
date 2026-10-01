/**
 * Proxy helper — fetches the proxy URL for a given account.
 * Used by the publish route to route API calls through the account's
 * assigned VPN/proxy.
 *
 * Returns null if no proxy is assigned (direct connection).
 */
import { db } from "./db";

export async function getProxyForAccount(accountId: string): Promise<string | null> {
  const assignment = await db.accountProxy.findFirst({
    where: { accountId, active: true },
    include: { proxy: true },
    orderBy: { assignedAt: "desc" },
  });

  if (!assignment || !assignment.proxy || !assignment.proxy.healthy) {
    return null;
  }

  const p = assignment.proxy;
  const auth = p.username ? `${p.username}:${p.password}@` : "";

  if (p.protocol === "socks5" || p.protocol === "socks4") {
    return `socks://${auth}${p.host}:${p.port}`;
  }
  return `http://${auth}${p.host}:${p.port}`;
}

/**
 * Get proxy info for display (no credentials).
 */
export async function getProxyInfoForAccount(accountId: string) {
  const assignment = await db.accountProxy.findFirst({
    where: { accountId, active: true },
    include: { proxy: true },
    orderBy: { assignedAt: "desc" },
  });

  if (!assignment) return null;

  return {
    id: assignment.proxy.id,
    name: assignment.proxy.name,
    host: assignment.proxy.host,
    port: assignment.proxy.port,
    country: assignment.proxy.country,
    city: assignment.proxy.city,
    healthy: assignment.proxy.healthy,
    latency: assignment.proxy.latency,
    lastChecked: assignment.proxy.lastChecked,
    protocol: assignment.proxy.protocol,
  };
}
