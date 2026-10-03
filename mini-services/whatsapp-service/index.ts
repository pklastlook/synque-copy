/**
 * WhatsApp Mini-Service — Multi-Session (per-user)
 *
 * Each user gets their own WhatsApp session managed by ownerId.
 * Sessions are isolated: separate auth state, QR codes, and webhook targets.
 *
 * Port: 3002
 *
 * Endpoints (all accept ?ownerId=xxx or X-Owner-Id header):
 *   GET  /status?ownerId=xxx         → { connected, hasQr, qr?, phone? }
 *   GET  /qr?ownerId=xxx             → { qr } | { connected: true }
 *   POST /logout?ownerId=xxx         → disconnect + clear session for this owner
 *   POST /restart?ownerId=xxx        → force fresh QR for this owner
 *   POST /webhook-target?ownerId=xxx → set webhook URL for this owner
 *   POST /send?ownerId=xxx           → send a message via this owner's session
 *
 * Incoming messages are POSTed to the owner's webhook target:
 *   POST <webhookTarget>&ownerId=xxx  body: { source, senderName, groupName, content, ... }
 */
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
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

const makeWASocket: typeof makeWASocketExport.makeWASocket =
  (makeWASocketExport as any).makeWASocket ?? (makeWASocketExport as any);

const logger = pino({ level: "silent" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3002", 10);
const SESSIONS_DIR = join(__dirname, "sessions");

// ─── Security config ───────────────────────────────────────────────────────
// Shared-secret bearer auth — every route except /health requires
// `Authorization: Bearer <MINI_SERVICE_KEY>`.
const SERVICE_KEY = process.env.MINI_SERVICE_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

if (!SERVICE_KEY) {
  console.error("[whatsapp-service] FATAL: MINI_SERVICE_KEY env var is required");
  process.exit(1);
}

// ─── Per-session state ───────────────────────────────────────────────────
interface SessionState {
  ownerId: string;
  connected: boolean;
  qr: string | null;
  phone: string | null;
  webhookTarget: string | null;
  sock: ReturnType<typeof makeWASocket> | null;
  store: ReturnType<typeof makeInMemoryStore> | null;
  reconnectTimer: NodeJS.Timeout | null;
}

// Map of ownerId → SessionState
const sessions = new Map<string, SessionState>();

// ─── HTTP helpers ────────────────────────────────────────────────────────
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
    "Access-Control-Allow-Origin": APP_URL,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Owner-Id, Authorization",
  });
  res.end(JSON.stringify(data));
}

function getOwnerId(req: IncomingMessage, url: URL): string | null {
  return url.searchParams.get("ownerId") || req.headers["x-owner-id"] as string || null;
}

function getOrCreateSession(ownerId: string): SessionState {
  if (!sessions.has(ownerId)) {
    sessions.set(ownerId, {
      ownerId,
      connected: false,
      qr: null,
      phone: null,
      webhookTarget: null,
      sock: null,
      store: null,
      reconnectTimer: null,
    });
  }
  return sessions.get(ownerId)!;
}

// ─── Forward incoming WhatsApp message to the main app ────────────────────
async function forwardMessage(ownerId: string, payload: {
  source: string;
  senderName: string;
  groupName: string | null;
  content: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
}) {
  const session = sessions.get(ownerId);
  if (!session?.webhookTarget) {
    console.log(`[whatsapp:${ownerId}] No webhook target — message dropped`);
    return;
  }
  try {
    const url = new URL(session.webhookTarget);
    url.searchParams.set("ownerId", ownerId);
    await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`[whatsapp:${ownerId}] Forwarded message to webhook`);
  } catch (e) {
    console.error(`[whatsapp:${ownerId}] Failed to forward message:`, e);
  }
}

// ─── Start a WhatsApp session for a specific owner ───────────────────────
async function startWhatsAppSession(ownerId: string) {
  const session = getOrCreateSession(ownerId);
  const sessionDir = join(SESSIONS_DIR, ownerId);

  console.log(`[whatsapp:${ownerId}] Starting WhatsApp session...`);

  try {
    await mkdir(sessionDir, { recursive: true });
  } catch {}

  const { version } = await fetchLatestBaileysVersion();
  const { state: authState, saveCreds } = await loadAuthState(join(sessionDir, "auth"));

  const store = makeInMemoryStore({ logger });
  try {
    store.readFromFile(join(sessionDir, "store.json"));
  } catch {}

  const sock = makeWASocket({
    version,
    auth: authState,
    printQRInTerminal: false,
    logger,
    browser: Browsers.ubuntu("SYNQUE"),
  });

  session.sock = sock;
  session.store = store;
  store.bind(sock.ev);

  // Save credentials whenever they update
  sock.ev.on("creds.update", saveCreds);

  // Save store periodically
  const storeInterval = setInterval(() => {
    try {
      store.writeFromFile(join(sessionDir, "store.json"));
    } catch {}
  }, 10000);

  // Handle connection state changes
  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 256 });
        session.qr = qrDataUrl;
        session.connected = false;
        console.log(`[whatsapp:${ownerId}] QR code generated`);
      } catch (e) {
        console.error(`[whatsapp:${ownerId}] Failed to generate QR:`, e);
      }
    }

    if (connection === "close") {
      session.connected = false;
      session.qr = null;
      clearInterval(storeInterval);
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`[whatsapp:${ownerId}] Connection closed. Status: ${statusCode}`);

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log(`[whatsapp:${ownerId}] Reconnecting in 3s...`);
        if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
        session.reconnectTimer = setTimeout(() => startWhatsAppSession(ownerId), 3000);
      } else {
        console.log(`[whatsapp:${ownerId}] Device logged out. Session cleared.`);
        sessions.delete(ownerId);
      }
    } else if (connection === "open") {
      session.connected = true;
      session.qr = null;
      session.phone = sock?.user?.id?.split(":")[0] ?? null;
      console.log(`[whatsapp:${ownerId}] ✓ Connected as ${session.phone}`);
    }
  });

  // Handle incoming messages
  sock.ev.on("messages.upsert", async ({ messages }: { messages: proto.IWebMessageInfo[] }) => {
    for (const msg of messages) {
      try {
        if (msg.key.fromMe) continue;

        const jid = msg.key.remoteJid ?? "";
        const isGroup = jid.endsWith("@g.us");
        const senderId = msg.key.participant ?? msg.key.remoteJid ?? "";
        const senderPhone = senderId.split("@")[0].split(":")[0];

        let senderName = senderPhone;
        try {
          if (isGroup) {
            const participant = await sock?.onWhatsApp(senderId);
            if (participant && participant[0]?.name) senderName = participant[0].name;
          } else {
            const contact = await sock?.onWhatsApp(jid);
            if (contact && contact[0]?.name) senderName = contact[0].name;
          }
        } catch {}

        let groupName: string | null = null;
        if (isGroup) {
          try {
            const groupMeta = await sock?.groupMetadata(jid);
            groupName = groupMeta?.subject ?? null;
          } catch {}
        }

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
          try {
            const stream = await (sock as any)?.downloadMediaMessage(msg);
            if (stream) {
              const mimeType = message.imageMessage.mimetype ?? "image/jpeg";
              mediaUrl = `data:${mimeType};base64,${Buffer.from(stream).toString("base64")}`;
            }
          } catch {}
        } else if (message?.videoMessage) {
          content = message.videoMessage.caption ?? "";
          mediaType = "video";
          try {
            const stream = await (sock as any)?.downloadMediaMessage(msg);
            if (stream) {
              const mimeType = message.videoMessage.mimetype ?? "video/mp4";
              mediaUrl = `data:${mimeType};base64,${Buffer.from(stream).toString("base64")}`;
            }
          } catch {}
        } else if (message?.audioMessage) {
          mediaType = "audio";
          try {
            const stream = await (sock as any)?.downloadMediaMessage(msg);
            if (stream) {
              const mimeType = message.audioMessage.mimetype ?? "audio/mpeg";
              mediaUrl = `data:${mimeType};base64,${Buffer.from(stream).toString("base64")}`;
            }
          } catch {}
        } else if (message?.documentMessage) {
          content = message.documentMessage.caption ?? "";
          mediaType = "document";
          try {
            const stream = await (sock as any)?.downloadMediaMessage(msg);
            if (stream) {
              const mimeType = message.documentMessage.mimetype ?? "application/octet-stream";
              mediaUrl = `data:${mimeType};base64,${Buffer.from(stream).toString("base64")}`;
            }
          } catch {}
        }

        if (!content && !mediaType) continue;
        if (content.length < 2 && !mediaType) continue;

        await forwardMessage(ownerId, {
          source: isGroup ? "group" : "chat",
          senderName: senderName || "Unknown",
          groupName,
          content: content || (mediaType ? `[${mediaType}]` : ""),
          mediaUrl,
          mediaType,
        });
      } catch (e) {
        console.error(`[whatsapp:${ownerId}] Failed to process message:`, e);
      }
    }
  });
}

// ─── HTTP server ──────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") {
    sendJSON(res, 204, {});
    return;
  }

  // ─── Auth middleware — every route except /health requires a bearer token ───
  if (url.pathname !== "/health") {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${SERVICE_KEY}`) {
      sendJSON(res, 401, { error: "Unauthorized" });
      return;
    }
  }

  // ─── Session-list endpoint (debug) ───
  if (req.method === "GET" && url.pathname === "/sessions") {
    const list = Array.from(sessions.entries()).map(([id, s]) => ({
      ownerId: id,
      connected: s.connected,
      hasQr: !!s.qr,
      phone: s.phone,
    }));
    sendJSON(res, 200, { sessions: list, total: list.length });
    return;
  }

  const ownerId = getOwnerId(req, url);
  if (!ownerId) {
    sendJSON(res, 400, { error: "ownerId query param or X-Owner-Id header required" });
    return;
  }

  const session = getOrCreateSession(ownerId);

  // GET /status — current connection state for this owner
  if (req.method === "GET" && url.pathname === "/status") {
    sendJSON(res, 200, {
      connected: session.connected,
      hasQr: !!session.qr,
      qr: session.qr,
      phone: session.phone,
      webhookTarget: session.webhookTarget,
    });
    return;
  }

  // GET /qr — returns the QR data URL for this owner
  if (req.method === "GET" && url.pathname === "/qr") {
    if (session.connected) {
      sendJSON(res, 200, { connected: true, qr: null });
    } else if (session.qr) {
      sendJSON(res, 200, { connected: false, qr: session.qr });
    } else {
      sendJSON(res, 200, { connected: false, qr: null, message: "Generating QR..." });
    }
    return;
  }

  // POST /webhook-target — set webhook URL for this owner
  if (req.method === "POST" && url.pathname === "/webhook-target") {
    const body = await readBody(req);
    session.webhookTarget = body.target ?? null;
    sendJSON(res, 200, { ok: true, target: session.webhookTarget });
    return;
  }

  // POST /logout — disconnect + delete session for this owner
  if (req.method === "POST" && url.pathname === "/logout") {
    try {
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      await session.sock?.logout();
    } catch {}
    // Delete the session files
    try {
      await rm(join(SESSIONS_DIR, ownerId), { recursive: true, force: true });
    } catch {}
    sessions.delete(ownerId);
    sendJSON(res, 200, { ok: true, disconnected: true });
    return;
  }

  // POST /restart — force fresh QR for this owner
  if (req.method === "POST" && url.pathname === "/restart") {
    try {
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      await session.sock?.end(undefined);
    } catch {}
    session.connected = false;
    session.qr = null;
    session.sock = null;
    sendJSON(res, 200, { ok: true });
    setTimeout(() => startWhatsAppSession(ownerId), 1500);
    return;
  }

  // POST /send — send a message via this owner's session
  if (req.method === "POST" && url.pathname === "/send") {
    if (!session.connected || !session.sock) {
      sendJSON(res, 503, { error: "WhatsApp not connected for this owner. Scan QR first." });
      return;
    }
    const body = await readBody(req);
    const { to, text } = body as { to: string; text: string };

    if (!to || !text) {
      sendJSON(res, 400, { error: "to and text are required" });
      return;
    }

    let jid = to.trim();
    if (!jid.includes("@")) {
      jid = jid.replace(/\D/g, "") + "@s.whatsapp.net";
    }

    try {
      const result = await session.sock.sendMessage(jid, { text });
      sendJSON(res, 200, {
        ok: true,
        messageId: result?.key?.id ?? null,
        to: jid,
      });
    } catch (e: any) {
      console.error(`[whatsapp:${ownerId}] Send failed:`, e);
      sendJSON(res, 500, { error: e?.message ?? "Failed to send message" });
    }
    return;
  }

  sendJSON(res, 404, { error: "Not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────
async function main() {
  process.on("unhandledRejection", (err) => {
    console.error("[whatsapp-service] Unhandled rejection:", err);
  });
  process.on("uncaughtException", (err) => {
    console.error("[whatsapp-service] Uncaught exception:", err);
  });

  await mkdir(SESSIONS_DIR, { recursive: true });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`[whatsapp-service] Multi-session HTTP server on http://127.0.0.1:${PORT}`);
    console.log("[whatsapp-service] Sessions are created on-demand when a user requests /status or /qr");
  });

  console.log("[whatsapp-service] Service running. Sessions start on-demand.");
  setInterval(() => {
    const active = Array.from(sessions.values()).filter(s => s.connected).length;
    const waiting = Array.from(sessions.values()).filter(s => s.qr && !s.connected).length;
    console.log(`[whatsapp-service] ♥ ${active} connected, ${waiting} waiting for QR scan, ${sessions.size} total sessions`);
  }, 60000);
}

main().catch((e) => {
  console.error("[whatsapp-service] Fatal:", e);
  process.exit(1);
});
