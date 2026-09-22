import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const servers = await db.mailServer.findMany({
    include: { mailboxes: { include: { owner: true } } },
    orderBy: { createdAt: "desc" },
  });
  const totalMessages = await db.mailMessage.count();

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

  const server = await db.mailServer.create({
    data: {
      name,
      provider: provider ?? "custom",
      domain,
      imapHost,
      imapPort: imapPort ?? 993,
      imapSecure: imapSecure ?? true,
      smtpHost,
      smtpPort: smtpPort ?? 465,
      smtpSecure: smtpSecure ?? true,
      username,
      passwordEnc: "enc:" + Buffer.from(password).toString("base64"),
      fromName: fromName ?? name,
      fromEmail: fromEmail ?? username,
      status: "pending",
    },
  });

  // Simulate a connection test (mock): mark connected after short delay
  setTimeout(async () => {
    try {
      await db.mailServer.update({
        where: { id: server.id },
        data: { status: "connected", lastCheck: new Date() },
      });
    } catch {
      /* ignore */
    }
  }, 1500);

  return NextResponse.json({ id: server.id, ok: true });
}
