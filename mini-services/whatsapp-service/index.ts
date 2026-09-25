/**
 * WhatsApp Mini-Service
 *
 * Real WhatsApp Web connection via the Baileys library.
 * Users scan a QR code (just like WhatsApp Web) to link their phone,
 * and incoming group/chat messages are forwarded to the main app.
 *
 * Port: 3002
 *
 * Endpoints:
 *   GET  /status         → { connected, hasQr, qr?, phone? }
 *   GET  /qr             → { qr } | { connected: true }
 *   POST /logout         → disconnects + clears session
 *   POST /webhook-target → set the URL to forward incoming messages to
 *
 * Incoming messages are POSTed to the configured webhook target:
 *   POST <webhookTarget>  body: { source, senderName, groupName, content, mediaUrl?, mediaType? }
 */
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

import makeWASocketExport, {
  useMultiFileAuthState as loadAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  proto,
  Browsers,
} from "@whiskeysockets/baileys";
import { pino } from "pino";

// Baileys exports makeWASocket as a named export (not on the default object
// in CommonJS-interop mode). Handle both shapes.
const makeWASocket: typeof makeWASocketExport.makeWASocket =
  (makeWASocketExport as any).makeWASocket ?? (makeWASocketExport as any);

// Baileys requires a pino logger — silence most of its chatty output
const logger = pino({ level: "silent" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3002", 10);
const SESSIONS_DIR = join(__dirname, "sessions");
const STATE_FILE = join(__dirname, "state.json");

interface ServiceState {
  connected: boolean;
  qr: string | null;
  phone: string | null;
  webhookTarget: string | null;
}

let state: ServiceState = {
  connected: false,
  qr: null,
  phone: null,
  webhookTarget: null,
};

// Persist webhook target across restarts
async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    state.webhookTarget = parsed.webhookTarget ?? null;
    console.log("[whatsapp-service] Loaded webhook target:", state.webhookTarget);
  } catch {
    // no state file — first run
  }
}

async function saveState() {
  try {
    await writeFile(STATE_FILE, JSON.stringify({ webhookTarget: state.webhookTarget }), "utf-8");
  } catch (e) {
    console.error("[whatsapp-service] Failed to save state:", e);
  }
}

// ─── HTTP body parser ─────────────────────────────────────────────────────
async function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJSON(res: ServerResponse, code: number, data: any) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

// ─── Forward incoming WhatsApp message to the main app ────────────────────
async function forwardMessage(payload: {
  source: string;
  senderName: string;
  groupName: string | null;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}) {
  if (!state.webhookTarget) {
    console.log("[whatsapp-service] No webhook target — message dropped:", payload.content?.slice(0, 50));
    return;
  }
  try {
    await fetch(state.webhookTarget, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("[whatsapp-service] Forwarded message to", state.webhookTarget);
  } catch (e) {
    console.error("[whatsapp-service] Failed to forward message:", e);
  }
}

// ─── Baileys WhatsApp socket ──────────────────────────────────────────────
let sock: ReturnType<typeof makeWASocket> | null = null;
let store: ReturnType<typeof makeInMemoryStore> | null = null;

async function startWhatsApp() {
  console.log("[whatsapp-service] Starting WhatsApp connection...");
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[whatsapp-service] Using WA v${version.join(".")} (latest: ${isLatest})`);

  const { state: authState, saveCreds } = await loadAuthState(
    join(SESSIONS_DIR, "auth")
  );

  store = makeInMemoryStore({ logger });
  try {
    store.readFromFile(join(SESSIONS_DIR, "store.json"));
  } catch {}

  sock = makeWASocket({
    version,
    auth: authState,
    printQRInTerminal: false, // we expose via HTTP instead
    logger,
    browser: Browsers.ubuntu("SocialFlow"),
  });

  // Bind store
  store?.bind(sock.ev);

  // Save credentials whenever they update
  sock.ev.on("creds.update", saveCreds);

  // Handle connection state changes
  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Generate a data URL QR code that the frontend can render
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 256 });
        state.qr = qrDataUrl;
        state.connected = false;
        console.log("[whatsapp-service] QR code generated — scan with your phone");
      } catch (e) {
        console.error("[whatsapp-service] Failed to generate QR:", e);
      }
    }

    if (connection === "close") {
      state.connected = false;
      state.qr = null;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`[whatsapp-service] Connection closed. Status: ${statusCode}`);
      // Reconnect unless logged out
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log("[whatsapp-service] Reconnecting in 3s...");
        setTimeout(() => startWhatsApp(), 3000);
      } else {
        console.log("[whatsapp-service] Device logged out. Session cleared.");
      }
    } else if (connection === "open") {
      state.connected = true;
      state.qr = null;
      const phoneNumber = sock?.user?.id?.split(":")[0] ?? null;
      state.phone = phoneNumber;
      console.log(`[whatsapp-service] ✓ Connected as ${phoneNumber}`);
    }
  });

  // Handle incoming messages
  sock.ev.on("messages.upsert", async ({ messages }: { messages: proto.IWebMessageInfo[] }) => {
    for (const msg of messages) {
      try {
        // Skip messages sent by us
        if (msg.key.fromMe) continue;

        const jid = msg.key.remoteJid ?? "";
        const isGroup = jid.endsWith("@g.us");
        const senderId = msg.key.participant ?? msg.key.remoteJid ?? "";
        const senderPhone = senderId.split("@")[0].split(":")[0];

        // Try to resolve sender name from store
        let senderName = senderPhone;
        try {
          if (isGroup) {
            const participant = await sock?.onWhatsApp(senderId);
            if (participant && participant[0]?.name) {
              senderName = participant[0].name;
            }
          } else {
            const contact = await sock?.onWhatsApp(jid);
            if (contact && contact[0]?.name) {
              senderName = contact[0].name;
            }
          }
        } catch {}

        // Group name
        let groupName: string | null = null;
        if (isGroup) {
          try {
            const groupMeta = await sock?.groupMetadata(jid);
            groupName = groupMeta?.subject ?? null;
          } catch {}
        }

        // Extract text content
        const message = msg.message;
        let content = "";
        let mediaUrl: string | null = null;
        let mediaType: string | null = null;

        if (message?.conversation) {
          content = message.conversation;
        } else if (message?.extendedTextMessage?.text) {
          content = message.extendedTextMessage.text;
        } else if (message?.imageMessage) {
          content = message.imageMessage.caption ?? "";
          mediaType = "image";
          // Download the image via baileys' downloadMediaMessage
          try {
            const stream = await (sock as any)?.downloadMediaMessage(msg);
            if (stream) {
              const mimeType = message.imageMessage.mimetype ?? "image/jpeg";
              mediaUrl = `data:${mimeType};base64,${Buffer.from(stream).toString("base64")}`;
            }
          } catch (e) {
            console.error("[whatsapp-service] Failed to download image:", e);
          }
        } else if (message?.videoMessage) {
          content = message.videoMessage.caption ?? "";
          mediaType = "video";
          // Download the video (note: videos can be large — consider storing on disk)
          try {
            const stream = await (sock as any)?.downloadMediaMessage(msg);
            if (stream) {
              const mimeType = message.videoMessage.mimetype ?? "video/mp4";
              mediaUrl = `data:${mimeType};base64,${Buffer.from(stream).toString("base64")}`;
            }
          } catch (e) {
            console.error("[whatsapp-service] Failed to download video:", e);
          }
        } else if (message?.audioMessage) {
          mediaType = "audio";
          try {
            const stream = await (sock as any)?.downloadMediaMessage(msg);
            if (stream) {
              const mimeType = message.audioMessage.mimetype ?? "audio/mpeg";
              mediaUrl = `data:${mimeType};base64,${Buffer.from(stream).toString("base64")}`;
            }
          } catch (e) {
            console.error("[whatsapp-service] Failed to download audio:", e);
          }
        } else if (message?.documentMessage) {
          content = message.documentMessage.caption ?? "";
          mediaType = "document";
          try {
            const stream = await (sock as any)?.downloadMediaMessage(msg);
            if (stream) {
              const mimeType = message.documentMessage.mimetype ?? "application/octet-stream";
              mediaUrl = `data:${mimeType};base64,${Buffer.from(stream).toString("base64")}`;
            }
          } catch (e) {
            console.error("[whatsapp-service] Failed to download document:", e);
          }
        }

        if (!content && !mediaType) continue;
        if (content.length < 2 && !mediaType) continue; // skip tiny/empty

        await forwardMessage({
          source: isGroup ? "group" : "chat",
          senderName: senderName || "Unknown",
          groupName,
          content: content || (mediaType ? `[${mediaType}]` : ""),
          mediaUrl,
          mediaType,
        });
      } catch (e) {
        console.error("[whatsapp-service] Failed to process message:", e);
      }
    }
  });
}

// ─── HTTP server ──────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    sendJSON(res, 204, {});
    return;
  }

  // GET /status — current connection state
  if (req.method === "GET" && url.pathname === "/status") {
    sendJSON(res, 200, {
      connected: state.connected,
      hasQr: !!state.qr,
      qr: state.qr,
      phone: state.phone,
      webhookTarget: state.webhookTarget,
    });
    return;
  }

  // GET /qr — returns the QR data URL (or connected: true)
  if (req.method === "GET" && url.pathname === "/qr") {
    if (state.connected) {
      sendJSON(res, 200, { connected: true, qr: null });
    } else if (state.qr) {
      sendJSON(res, 200, { connected: false, qr: state.qr });
    } else {
      sendJSON(res, 200, { connected: false, qr: null, message: "Generating QR..." });
    }
    return;
  }

  // POST /webhook-target — set where incoming messages should be forwarded
  if (req.method === "POST" && url.pathname === "/webhook-target") {
    const body = await readBody(req);
    state.webhookTarget = body.target ?? null;
    await saveState();
    sendJSON(res, 200, { ok: true, target: state.webhookTarget });
    return;
  }

  // POST /logout — disconnect + delete session
  if (req.method === "POST" && url.pathname === "/logout") {
    try {
      await sock?.logout();
    } catch {}
    state.connected = false;
    state.qr = null;
    state.phone = null;
    sendJSON(res, 200, { ok: true });
    // Restart to generate a new QR
    setTimeout(() => startWhatsApp(), 1500);
    return;
  }

  // POST /restart — force a fresh QR
  if (req.method === "POST" && url.pathname === "/restart") {
    try {
      await sock?.end(undefined);
    } catch {}
    state.connected = false;
    state.qr = null;
    setTimeout(() => startWhatsApp(), 1500);
    sendJSON(res, 200, { ok: true });
    return;
  }

  // POST /send — send a text message to a WhatsApp number or group
  if (req.method === "POST" && url.pathname === "/send") {
    if (!state.connected || !sock) {
      sendJSON(res, 503, { error: "WhatsApp not connected. Scan QR first." });
      return;
    }
    const body = await readBody(req);
    const { to, text } = body as { to: string; text: string };

    if (!to || !text) {
      sendJSON(res, 400, { error: "to and text are required" });
      return;
    }

    // Format the JID: phone number → xxx@s.whatsapp.net, or group → xxx@g.us
    let jid = to.trim();
    if (!jid.includes("@")) {
      // Assume it's a phone number — strip non-digits
      jid = jid.replace(/\D/g, "") + "@s.whatsapp.net";
    }

    try {
      const result = await sock.sendMessage(jid, { text });
      sendJSON(res, 200, {
        ok: true,
        messageId: result?.key?.id ?? null,
        to: jid,
      });
    } catch (e: any) {
      console.error("[whatsapp-service] Send failed:", e);
      sendJSON(res, 500, { error: e?.message ?? "Failed to send message" });
    }
    return;
  }

  sendJSON(res, 404, { error: "Not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────
async function main() {
  // Catch unhandled errors so the process doesn't silently exit
  process.on("unhandledRejection", (err) => {
    console.error("[whatsapp-service] Unhandled rejection:", err);
  });
  process.on("uncaughtException", (err) => {
    console.error("[whatsapp-service] Uncaught exception:", err);
  });

  await mkdir(SESSIONS_DIR, { recursive: true });
  await loadState();

  server.listen(PORT, () => {
    console.log(`[whatsapp-service] HTTP server on http://localhost:${PORT}`);
  });

  // Start WhatsApp connection (will generate QR if not authenticated)
  await startWhatsApp();

  // Keep the process alive
  console.log("[whatsapp-service] Service running. Press Ctrl+C to stop.");
  setInterval(() => {
    // Heartbeat — log status every 60s
    if (state.connected) {
      console.log(`[whatsapp-service] ♥ Connected as ${state.phone}`);
    } else if (state.qr) {
      console.log("[whatsapp-service] ♥ Waiting for QR scan...");
    } else {
      console.log("[whatsapp-service] ♥ Disconnected — generating new QR...");
    }
  }, 60000);
}

main().catch((e) => {
  console.error("[whatsapp-service] Fatal:", e);
  process.exit(1);
});
