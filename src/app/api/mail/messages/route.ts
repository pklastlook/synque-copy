import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const mailboxId = req.nextUrl.searchParams.get("mailboxId");
  const folder = req.nextUrl.searchParams.get("folder");

  const where: Record<string, unknown> = {};
  if (mailboxId) where.mailboxId = mailboxId;
  if (folder) where.folder = folder;

  const messages = await db.mailMessage.findMany({
    where,
    orderBy: { date: "desc" },
    take: 100,
  });

  const mailboxes = await db.mailbox.findMany();
  const mailboxesById: Record<string, { email: string; displayName: string }> = {};
  for (const m of mailboxes) mailboxesById[m.id] = { email: m.email, displayName: m.displayName };

  const data = messages.map((m) => ({
    id: m.id,
    mailboxId: m.mailboxId,
    mailboxEmail: mailboxesById[m.mailboxId]?.email ?? "",
    fromAddr: m.fromAddr,
    toAddr: m.toAddr,
    subject: m.subject,
    body: m.body,
    direction: m.direction,
    folder: m.folder,
    isRead: m.isRead,
    isStarred: m.isStarred,
    date: m.date.toISOString(),
  }));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { mailboxId, toAddr, subject, body } = await req.json();
  if (!mailboxId || !toAddr || !subject) {
    return NextResponse.json({ error: "mailboxId, toAddr, subject required" }, { status: 400 });
  }
  const mailbox = await db.mailbox.findUnique({ where: { id: mailboxId } });
  if (!mailbox) return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });

  // Get the mail server config for SMTP credentials
  const server = await db.mailServer.findUnique({ where: { id: mailbox.serverId } });
  if (!server) {
    return NextResponse.json({ error: "Mail server not found" }, { status: 404 });
  }

  // Store the message in the DB first (so we have a record even if SMTP fails)
  const msg = await db.mailMessage.create({
    data: {
      mailboxId,
      fromAddr: mailbox.email,
      toAddr,
      subject,
      body: body ?? "",
      direction: "out",
      folder: "sent",
      isRead: true,
      date: new Date(),
    },
  });

  // Real SMTP sending via nodemailer
  try {
    const nodemailer = await import("nodemailer");

    // Decrypt the mailbox password (stored as base64 — not real encryption,
    // but we need to decode it to use for SMTP auth)
    const decodedPassword = Buffer.from(
      mailbox.passwordEnc.replace("enc:", ""),
      "base64"
    ).toString("utf-8");

    const transporter = nodemailer.createTransport({
      host: server.smtpHost,
      port: server.smtpPort,
      secure: server.smtpSecure,
      auth: {
        user: server.username,
        pass: decodedPassword,
      },
    });

    const info = await transporter.sendMail({
      from: `"${server.fromName}" <${server.fromEmail}>`,
      to: toAddr,
      subject,
      text: body ?? "",
    });

    console.log(`[mail/messages] ✓ Email sent: ${info.messageId}`);

    return NextResponse.json({
      id: msg.id,
      ok: true,
      messageId: info.messageId,
      sent: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "SMTP error";
    console.error("[mail/messages] SMTP failed:", message);

    // The message is already saved in the "sent" folder — mark it so
    // the user knows it wasn't actually delivered
    return NextResponse.json({
      id: msg.id,
      ok: true,
      sent: false,
      error: `Email saved but not delivered — SMTP error: ${message}`,
    }, { status: 201 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, isRead, isStarred, folder } = await req.json();
  const data: Record<string, unknown> = {};
  if (isRead !== undefined) data.isRead = isRead;
  if (isStarred !== undefined) data.isStarred = isStarred;
  if (folder) data.folder = folder;
  await db.mailMessage.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
