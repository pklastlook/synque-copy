import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * SSRF guard for user-supplied IMAP/SMTP hostnames.
 *
 * `POST /api/mail` opens a real IMAP connection to the host the caller
 * supplies. Without validation, an attacker could point it at internal
 * addresses (e.g. 169.254.169.254 = AWS metadata, 127.0.0.1, 10.x, etc.)
 * to scan/probe the internal network.
 *
 * This rejects:
 *   - bare IPv4 addresses in private/reserved ranges
 *     (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x, 0.x)
 *   - IPv6 loopback (::1) + ULA/local (fc00::/7, fe80::/10)
 *   - hostnames that END with ".localhost" or ".internal"
 *
 * Hostnames are otherwise passed through; DNS resolution + connection
 * happens in the IMAP client. We do NOT attempt to resolve the hostname
 * here (would block the event loop), but rejecting the obvious internal
 * literal addresses is enough to defeat the most common SSRF payloads.
 */
function isPrivateOrReservedHost(rawHost: string): boolean {
  const host = rawHost.trim().toLowerCase();
  if (!host) return true;

  // Reject .localhost / .internal TLDs
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return true;
  }

  // IPv4 literal? (no brackets, all digits + dots, 4 octets)
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [parseInt(v4[1], 10), parseInt(v4[2], 10)];
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (AWS metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a >= 224) return true; // multicast 224.0.0.0/4 + reserved 240.0.0.0/4
  }

  // IPv6 literal (with or without brackets)
  const v6 = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (v6 === "::1" || v6 === "0:0:0:0:0:0:0:1") return true; // loopback
  if (v6.startsWith("fc") || v6.startsWith("fd")) return true; // fc00::/7 ULA
  if (v6.startsWith("fe80")) return true; // link-local
  if (v6 === "::" || v6 === "::ffff:0:0") return true; // unspecified
  // IPv4-mapped (::ffff:a.b.c.d) — re-check the embedded v4
  const mapped = v6.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateOrReservedHost(mapped[1]);

  return false;
}

/**
 * Validate + clamp a TCP port supplied by the caller.
 * Returns null if invalid.
 */
function validatePort(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  if (value < 1 || value > 65535) return null;
  return value;
}

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const servers = await db.mailServer.findMany({
    where: tenantWhere(scope) as Record<string, never>,
    include: { mailboxes: { include: { owner: true } } },
    orderBy: { createdAt: "desc" },
  });
  const totalMessages = await db.mailMessage.count({
    where: {
      mailbox: { server: tenantWhere(scope) as Record<string, never> },
    },
  });

  const result = servers.map((s) => {
    const totalQuotaMb = s.mailboxes.reduce((sum, m) => sum + m.quotaMb, 0);
    const usedMb = s.mailboxes.reduce((sum, m) => sum + m.usedMb, 0);
    return {
      id: s.id,
      name: s.name,
      provider: s.provider,
      domain: s.domain,
      imapHost: s.imapHost,
      imapPort: s.imapPort,
      imapSecure: s.imapSecure,
      smtpHost: s.smtpHost,
      smtpPort: s.smtpPort,
      smtpSecure: s.smtpSecure,
      username: s.username,
      fromName: s.fromName,
      fromEmail: s.fromEmail,
      status: s.status,
      lastCheck: s.lastCheck?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      mailboxCount: s.mailboxes.length,
      usedMb: Math.round(usedMb * 10) / 10,
      totalQuotaMb,
      mailboxes: s.mailboxes.map((m) => ({
        id: m.id,
        email: m.email,
        displayName: m.displayName,
        quotaMb: m.quotaMb,
        usedMb: m.usedMb,
        ownerId: m.ownerId,
        ownerName: m.owner?.name ?? null,
        ownerColor: m.owner?.color ?? null,
        status: m.status,
        role: m.role,
        unread: 0,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  });

  return NextResponse.json({ servers: result, totalMessages });
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const {
    name,
    provider,
    domain,
    imapHost,
    imapPort,
    imapSecure,
    smtpHost,
    smtpPort,
    smtpSecure,
    username,
    password,
    fromName,
    fromEmail,
  } = body;

  if (!name || !domain || !imapHost || !smtpHost || !username || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ---- SSRF validation on imapHost/imapPort (and smtp, defensively) ----
  if (typeof imapHost !== "string" || isPrivateOrReservedHost(imapHost)) {
    return NextResponse.json({ error: "imapHost is not allowed" }, { status: 400 });
  }
  const safeImapPort = validatePort(imapPort);
  if (safeImapPort === null) {
    return NextResponse.json({ error: "imapPort must be a number in 1-65535" }, { status: 400 });
  }
  if (typeof smtpHost !== "string" || isPrivateOrReservedHost(smtpHost)) {
    return NextResponse.json({ error: "smtpHost is not allowed" }, { status: 400 });
  }
  const safeSmtpPort = validatePort(smtpPort);
  if (safeSmtpPort === null) {
    return NextResponse.json({ error: "smtpPort must be a number in 1-65535" }, { status: 400 });
  }

  const server = await db.mailServer.create({
    data: {
      name,
      provider: provider ?? "custom",
      domain,
      imapHost,
      imapPort: safeImapPort,
      imapSecure: imapSecure ?? true,
      smtpHost,
      smtpPort: safeSmtpPort,
      smtpSecure: smtpSecure ?? true,
      username,
      passwordEnc: encrypt(password),
      fromName: fromName ?? name,
      fromEmail: fromEmail ?? username,
      status: "pending",
      customerId: scope.customerId,
    },
  });

  // Real IMAP connection test — try to connect to the mail server and list
  // the INBOX. If it succeeds, mark as "connected"; if not, mark "error".
  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: imapHost,
      port: safeImapPort,
      secure: imapSecure ?? true,
      auth: { user: username, pass: password },
      logger: false,
    });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    lock.release();
    await client.logout();
    await db.mailServer.update({
      where: { id: server.id },
      data: { status: "connected", lastCheck: new Date() },
    });
  } catch (err: unknown) {
    // SSRF-safe: do NOT echo the raw IMAP error message — it can leak
    // internal network topology (e.g. "ECONNREFUSED 10.0.0.5:993").
    // Log the raw error server-side only, return a generic message.
    console.error("[mail/route] IMAP connection test failed:", err instanceof Error ? err.message : String(err));
    await db.mailServer.update({
      where: { id: server.id },
      data: { status: "error", lastCheck: new Date() },
    });
    return NextResponse.json({
      id: server.id,
      ok: false,
      error: "Connection failed — mail server saved, but connection test failed.",
    }, { status: 201 });
  }

  return NextResponse.json({ id: server.id, ok: true });
}
