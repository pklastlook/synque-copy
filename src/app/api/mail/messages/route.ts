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

  // Simulate a reply arriving after a short delay (demo)
  setTimeout(async () => {
    try {
      await db.mailMessage.create({
        data: {
          mailboxId,
          fromAddr: toAddr,
          toAddr: mailbox.email,
          subject: "Re: " + subject,
          body: "Thanks for your message! This is an automated demo reply confirming your email was received.\n\n— Demo Responder",
          direction: "in",
          folder: "inbox",
          isRead: false,
          date: new Date(),
        },
      });
    } catch {
      /* ignore */
    }
  }, 4000);

  return NextResponse.json({ id: msg.id, ok: true });
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
