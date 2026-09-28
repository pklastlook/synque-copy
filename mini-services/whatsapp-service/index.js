/**
 * WhatsApp Mini-Service
 * Lazy-loads Baileys so the HTTP server starts immediately.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3002", 10);
const SESSIONS_DIR = join(__dirname, "sessions");
const STATE_FILE = join(__dirname, "state.json");

let state = { connected: false, qr: null, phone: null, webhookTarget: null };

// Load state
try {
  const raw = await readFile(STATE_FILE, "utf-8");
  state.webhookTarget = JSON.parse(raw).webhookTarget ?? null;
} catch {}

async function saveState() {
  try { await writeFile(STATE_FILE, JSON.stringify({ webhookTarget: state.webhookTarget }), "utf-8"); } catch {}
}

// ─── Lazy-loaded Baileys ────────────────────────────────────
let baileysStarted = false;

// Sync recent chat history after QR scan connection
async function syncChatHistory(sock) {
  try {
    console.log("[whatsapp-service] Syncing chat history...");
    // Get all chats (conversations)
    const chats = await sock.getChats?.() ?? [];
    console.log(`[whatsapp-service] Found ${chats.length} chats`);

    let syncedCount = 0;
    for (const chat of chats.slice(0, 20)) { // Limit to 20 most recent chats
      try {
        // Fetch last 10 messages from each chat
        const messages = await chat.fetchMessages?.({ limit: 10 }) ?? [];
        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;
          let content = "";
          if (msg.message.conversation) content = msg.message.conversation;
          else if (msg.message.extendedTextMessage?.text) content = msg.message.extendedTextMessage.text;
          else if (msg.message.imageMessage?.caption) content = msg.message.imageMessage.caption;
          else if (msg.message.videoMessage?.caption) content = msg.message.videoMessage.caption;
          else continue;

          const isGroup = msg.key.remoteJid?.endsWith("@g.us");
          const payload = {
            source: isGroup ? "group" : "chat",
            senderName: msg.pushName ?? chat.name ?? "Unknown",
            groupName: isGroup ? chat.name : null,
            content,
            senderPhone: msg.key.participant ?? msg.key.remoteJid,
          };

          if (state.webhookTarget) {
            try {
              await fetch(state.webhookTarget, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              syncedCount++;
            } catch {}
          }
        }
        // Small delay between chats to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.error(`[whatsapp-service] Failed to sync chat ${chat?.name}:`, e?.message);
      }
    }
    console.log(`[whatsapp-service] Synced ${syncedCount} messages from ${chats.length} chats`);
  } catch (e) {
    console.error("[whatsapp-service] Chat history sync failed:", e?.message || String(e));
    // Fallback: try using store if available
    try {
      console.log("[whatsapp-service] Trying store-based history fetch...");
      const allMsgs = sock.store?.messages ?? {};
      let count = 0;
      for (const [jid, msgs] of Object.entries(allMsgs)) {
        if (count > 200) break;
        const recent = (Array.isArray(msgs) ? msgs : msgs?.array ?? []).slice(-10);
        for (const msg of recent) {
          if (!msg?.message || msg?.key?.fromMe) continue;
          let content = "";
          if (msg.message.conversation) content = msg.message.conversation;
          else if (msg.message.extendedTextMessage?.text) content = msg.message.extendedTextMessage.text;
          else continue;

          const isGroup = jid.endsWith("@g.us");
          if (state.webhookTarget && content) {
            try {
              await fetch(state.webhookTarget, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  source: isGroup ? "group" : "chat",
                  senderName: msg.pushName ?? "Unknown",
                  groupName: isGroup ? jid : null,
                  content,
                  senderPhone: msg.key?.participant ?? jid,
                }),
              });
              count++;
            } catch {}
          }
        }
      }
      console.log(`[whatsapp-service] Store-based sync: ${count} messages`);
    } catch (e2) {
      console.error("[whatsapp-service] Store sync also failed:", e2?.message);
    }
  }
}

async function startBaileys() {
  if (baileysStarted) return;
  baileysStarted = true;

  try {
    console.log("[whatsapp-service] Loading Baileys...");
    const baileys = await import("@whiskeysockets/baileys");
    // Access everything from the module — don't destructure (avoids export issues)
    const mod = baileys.default || baileys;
    const makeWASocket = mod.makeWASocket || baileys.makeWASocket;
    const useMultiFileAuthState = mod.useMultiFileAuthState || baileys.useMultiFileAuthState;
    const fetchLatestBaileysVersion = mod.fetchLatestBaileysVersion || baileys.fetchLatestBaileysVersion;
    const Browsers = mod.Browsers || baileys.Browsers;
    const DisconnectReason = mod.DisconnectReason || baileys.DisconnectReason;

    const QRCode = (await import("qrcode")).default;
    const pino = (await import("pino")).pino;
    const logger = pino({ level: "silent" });

    await mkdir(SESSIONS_DIR, { recursive: true });
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[whatsapp-service] Using WA v${version.join(".")} (latest: ${isLatest})`);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { state: authState, saveCreds } = await useMultiFileAuthState(join(SESSIONS_DIR, "auth"));

    let sock = null;

    async function connect() {
      console.log("[whatsapp-service] Starting WhatsApp connection...");
      sock = makeWASocket({
        version,
        auth: authState,
        printQRInTerminal: false,
        logger,
        browser: Browsers.ubuntu("SocialFlow"),
      });

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          state.qr = await QRCode.toDataURL(qr);
          console.log("[whatsapp-service] QR code generated — scan with your phone");
        }
        if (connection === "open") {
          state.connected = true;
          state.qr = null;
          state.phone = sock.user?.id?.split(":")[0] ?? null;
          console.log(`[whatsapp-service] Connected as ${state.phone}`);

          // Sync recent chat history after connection
          await syncChatHistory(sock);
        }
        if (connection === "close") {
          state.connected = false;
          state.qr = null;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          console.log(`[whatsapp-service] Connection closed. Status: ${statusCode}`);
          if (statusCode !== (DisconnectReason?.loggedOut ?? 401)) {
            console.log("[whatsapp-service] Reconnecting in 3s...");
            setTimeout(connect, 3000);
          }
        }
      });

      sock.ev.on("messages.upsert", async ({ messages }) => {
        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;
          let content = "";
          if (msg.message.conversation) content = msg.message.conversation;
          else if (msg.message.extendedTextMessage?.text) content = msg.message.extendedTextMessage.text;
          else if (msg.message.imageMessage?.caption) content = msg.message.imageMessage.caption;
          else if (msg.message.videoMessage?.caption) content = msg.message.videoMessage.caption;
          else continue;

          // Detect if it's a group or direct chat
          const isGroup = msg.key.remoteJid?.endsWith("@g.us");
          const source = isGroup ? "group" : "chat";
          const groupName = isGroup ? null : null; // Group name not available in message

          const payload = {
            source,
            senderName: msg.pushName ?? "Unknown",
            groupName: isGroup ? msg.key.remoteJid : null,
            content,
            senderPhone: msg.key.participant ?? msg.key.remoteJid,
          };
          if (state.webhookTarget) {
            try {
              await fetch(state.webhookTarget, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              console.log(`[whatsapp-service] Forwarded message from ${payload.senderName}`);
            } catch (e) {
              console.error("[whatsapp-service] Webhook failed:", e?.message || String(e));
            }
          }
        }
      });
    }

    connect().catch((e) => {
      console.error("[whatsapp-service] Connection failed:", e?.message || String(e));
      console.log("[whatsapp-service] Retrying in 10s...");
      setTimeout(() => connect().catch(console.error), 10000);
    });
  } catch (e) {
    console.error("[whatsapp-service] Failed to load Baileys:", e?.message || String(e));
    baileysStarted = false; // allow retry
  }
}

// ─── HTTP server ────────────────────────────────────────────
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // /status — returns immediately, does NOT trigger Baileys
  if (req.method === "GET" && url.pathname === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      connected: state.connected,
      hasQr: !!state.qr,
      qr: state.qr,
      phone: state.phone,
    }));
    return;
  }

  // /health — alias for /status (Railway health check)
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "running" }));
    return;
  }

  // POST /webhook-target
  if (req.method === "POST" && url.pathname === "/webhook-target") {
    const body = await new Promise((resolve) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data));
    });
    try {
      const { target } = JSON.parse(body);
      state.webhookTarget = target;
      await saveState();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    return;
  }

  // POST /restart
  if (req.method === "POST" && url.pathname === "/restart") {
    baileysStarted = false;
    startBaileys();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // POST /logout
  if (req.method === "POST" && url.pathname === "/logout") {
    state.connected = false;
    state.qr = null;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// Start HTTP server FIRST — health check passes immediately
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[whatsapp-service] HTTP server on http://0.0.0.0:${PORT}`);
  console.log("[whatsapp-service] Service running. Health check ready.");
});

// Load Baileys after 3s (non-blocking)
setTimeout(() => startBaileys(), 3000);

// Heartbeat
setInterval(() => {
  if (state.connected) console.log(`[whatsapp-service] Connected as ${state.phone}`);
  else if (state.qr) console.log("[whatsapp-service] Waiting for QR scan...");
  else console.log("[whatsapp-service] Starting...");
}, 60000);
