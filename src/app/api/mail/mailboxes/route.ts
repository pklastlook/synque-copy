import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    serverId,
    localPart, // e.g. "daniel" of daniel@prism.co
    displayName,
    password,
    quotaMb,
    ownerId,
    role,
  } = body;

  if (!serverId || !localPart || !password) {
    return NextResponse.json({ error: "serverId, localPart, password required" }, { status: 400 });
  }

  const server = await db.mailServer.findUnique({ where: { id: serverId } });
  if (!server) return NextResponse.json({ error: "Server not found" }, { status: 404 });

  const email = `${localPart}@${server.domain}`;

  const existing = await db.mailbox.findUnique({ where: { email } }).catch(() => null);
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const mailbox = await db.mailbox.create({
    data: {
      serverId,
      email,
      displayName: displayName ?? localPart,
      passwordEnc: "enc:" + Buffer.from(password).toString("base64"),
      quotaMb: quotaMb ?? 2048,
      ownerId: ownerId ?? null,
      role: role ?? "member",
      status: "active",
    },
  });

  // NOTE: Real mailbox provisioning on the mail server (cPanel API, Dovecot
  // userdb, etc.) is not done here — this SYNQUE app stores the mailbox
  // record so the team can assign it + read mail. The actual IMAP account
  // must exist on the mail server already. The "creating" status is no
  // longer used because there's no async provisioning step.

  return NextResponse.json({ id: mailbox.id, email, ok: true });
}

export async function PATCH(req: NextRequest) {
  const { id, status, ownerId, quotaMb, password } = await req.json();
  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (ownerId !== undefined) data.ownerId = ownerId || null;
  if (quotaMb) data.quotaMb = quotaMb;
  if (password) data.passwordEnc = "enc:" + Buffer.from(password).toString("base64");
  const m = await db.mailbox.update({ where: { id }, data });
  return NextResponse.json({ ok: true, id: m.id });
}
