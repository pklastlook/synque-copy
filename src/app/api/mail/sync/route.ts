import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/mail/sync
 *
 * Syncs incoming emails from the mail server via IMAP. Fetches all
 * mailboxes, connects to each, downloads new messages, and stores them
 * in the MailMessage table.
 *
 * This can be called manually (Sync button in the Mail view) or by a
 * periodic cron job (the scheduler mini-service).
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const servers = await db.mailServer.findMany({
    where: { status: "connected" },
    include: { mailboxes: true },
  });

  if (servers.length === 0) {
    return NextResponse.json({
      ok: true,
      synced: 0,
      message: "No connected mail servers — configure one in Settings → Mail Server first.",
    });
  }

  let totalSynced = 0;
  const results: { server: string; synced: number; error?: string }[] = [];

  for (const server of servers) {
    try {
      const { ImapFlow } = await import("imapflow");

      const client = new ImapFlow({
        host: server.imapHost,
        port: server.imapPort,
        secure: server.imapSecure,
        auth: { user: server.username, pass: Buffer.from(server.passwordEnc.replace("enc:", ""), "base64").toString("utf-8") },
        logger: false,
      });

      await client.connect();

      // Sync each mailbox
      for (const mailbox of server.mailboxes) {
        try {
          const lock = await client.getMailboxLock("INBOX");

          try {
            // Fetch last 20 messages (or since last sync)
            const messages = [];
            for await (const msg of client.fetch("1:*", {
              envelope: true,
              source: true,
              internalDate: true,
              uid: true,
            }, { uid: true })) {
              // Check if this message is already in the DB (by date + subject)
              const existing = await db.mailMessage.findFirst({
                where: {
                  mailboxId: mailbox.id,
                  subject: msg.envelope?.subject ?? "(no subject)",
                  date: msg.internalDate ?? new Date(),
                },
              });

              if (existing) continue; // Skip duplicates

              // Parse the message body from the raw source
              const source = msg.source instanceof Buffer
                ? msg.source.toString("utf-8")
                : String(msg.source ?? "");
              // Extract plain text body (simple regex — not a full MIME parser)
              const bodyMatch = source.match(/Content-Type: text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\.)/i);
              const body = bodyMatch?.[1]?.trim() ?? source.slice(0, 500);

              const fromAddr = msg.envelope?.from?.[0]
                ? `${msg.envelope.from[0].name ?? ""} <${msg.envelope.from[0].address}>`.trim()
                : "unknown@unknown.com";
              const toAddr = msg.envelope?.to?.[0]?.address ?? mailbox.email;

              await db.mailMessage.create({
                data: {
                  mailboxId: mailbox.id,
                  fromAddr,
                  toAddr,
                  subject: msg.envelope?.subject ?? "(no subject)",
                  body,
                  direction: "in",
                  folder: "inbox",
                  isRead: false,
                  date: msg.internalDate ?? new Date(),
                },
              });
              totalSynced++;
            }
          } finally {
            lock.release();
          }
        } catch (e: unknown) {
          console.error(`[mail/sync] Error syncing mailbox ${mailbox.email}:`, e);
        }
      }

      await client.logout();
      results.push({ server: server.name, synced: totalSynced });

      // Update lastCheck timestamp
      await db.mailServer.update({
        where: { id: server.id },
        data: { lastCheck: new Date() },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "IMAP connection error";
      results.push({ server: server.name, synced: 0, error: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    synced: totalSynced,
    servers: results,
  });
}
