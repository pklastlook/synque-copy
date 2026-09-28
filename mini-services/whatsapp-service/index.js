/**
 * WhatsApp Mini-Service
 * Lazy-loads Baileys so the HTTP server starts immediately.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3002;
const SESSIONS_DIR = join(__dirname, "sessions");

// Global state — survives HTTP requests, persists to file
const state = {
  connected: false,
  qr: null,
  phone: null,
  webhookTarget: null,
  sock: null,
};
let baileysStarted = false;

// Load persisted state
async function loadState() {
  try {
    const raw = await readFile(join(SESSIONS_DIR, "state.json"), "utf-8");
    const saved = JSON.parse(raw);
    state.webhookTarget = saved.webhookTarget || null;
  } catch {}
}
async function saveState() {
  try {
    await mkdir(SESSIONS_DIR, { recursive: true });
    await writeFile(
      join(SESSIONS_DIR, "state.json"),
      JSON.stringify({ webhookTarget: state.webhookTarget })
    );
  } catch {}
}

// Extract text content from a Baileys message
function extractContent(msg) {
  if (!msg?.message) return null;
  if (msg.message.conversation) return msg.message.conversation;
  if (msg.message.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
  if (msg.message.imageMessage?.caption) return msg.message.imageMessage.caption;
  if (msg.message.videoMessage?.caption) return msg.message.videoMessage.caption;
  return null;
}

// Forward a message to the webhook (stored in DB by the app)
async function forwardToWebhook(payload) {
  if (!state.webhookTarget) return false;
  try {
    await fetch(state.webhookTarget, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (e) {
    console.error("[whatsapp-service] Webhook failed:", e?.message || String(e));
    return false;
  }
}

// Process a single message → forward to webhook
async function processMessage(msg, chatName) {
  if (!msg?.message || msg?.key?.fromMe) return false;
  const content = extractContent(msg);
  if (!content) return false;

  const jid = msg.key?.remoteJid || "";
  const isGroup = jid.endsWith("@g.us");

  return forwardToWebhook({
    source: isGroup ? "group" : "chat",
    senderName: msg.pushName || chatName || "Unknown",
    groupName: isGroup ? (chatName || jid) : null,
    content,
    senderPhone: msg.key?.participant || jid,
  });
}

// Sync chat history using the messaging-history.set event
// This event fires automatically after a fresh QR scan connection
// Baileys v7 does NOT have getChats() or fetchMessages() — the event is the ONLY way
async function syncChatHistory(sock) {
  console.log("[whatsapp-service] Manual sync requested — waiting for history data...");

  // In Baileys v7, there's no getChats() or fetchMessages() method.
  // The only way to get history is through the messaging-history.set event
  // which fires automatically after a fresh QR scan.
  //
  // For an already-connected session, history sync doesn't re-fire.
  // The options are:
  // 1. Delete the session and re-scan QR (forces fresh history sync)
  // 2. Wait for new messages (real-time only)
  //
  // We check if the sock has any cached chats from the initial sync

  // Try to access the internal chat map (Baileys stores chats internally)
  const chats = sock.chats || sock.chatMap || {};
  const chatIds = Object.keys(chats);
  console.log(`[whatsapp-service] Found ${chatIds.length} internal chats`);

  if (chatIds.length > 0) {
    let synced = 0;
    for (const jid of chatIds.slice(0, 30)) {
      const chat = chats[jid];
      const messages = chat?.messages || chat?.msgs || [];
      const recent = Array.isArray(messages) ? messages.slice(-10) : [];

      for (const msg of recent) {
        const ok = await processMessage(msg, chat?.name);
        if (ok) synced++;
        await new Promise(r => setTimeout(r, 50));
      }
    }
    console.log(`[whatsapp-service] Synced ${synced} messages from internal chats`);
    return synced;
  }

  console.log("[whatsapp-service] No internal chats found. History sync requires a fresh QR scan.");
  console.log("[whatsapp-service] To sync old messages: Disconnect → Reconnect → Scan new QR");
  return 0;
}

// ─── Lazy-loaded Baileys ────────────────────────────────────
async function startBaileys() {
  if (baileysStarted) return;
  baileysStarted = true;

  try {
    console.log("[whatsapp-service] Loading Baileys...");
    const baileys = await import("@whiskeysockets/baileys");
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
        // Request full history sync on connection
        syncHistory: true,
        // Increase message history limit
        defaultQueryTimeoutMs: 120000,
      });

      sock.ev.on("creds.update", saveCreds);

      // === HISTORY SYNC EVENT ===
      // This fires when Baileys receives history sync from WhatsApp servers
      // It provides: chats[], contacts[], messages[]
      // This is the ONLY way to get old chat history in Baileys v7
      sock.ev.on("messaging-history.set", async ({ chats, contacts, messages, isLatest, progress }) => {
        console.log(`[whatsapp-service] History sync: ${chats?.length || 0} chats, ${messages?.length || 0} messages, progress: ${progress}`);

        if (messages && messages.length > 0) {
          let synced = 0;
          // Process up to 500 messages from history sync
          for (const msg of messages.slice(0, 500)) {
            try {
              // Find chat name for this message
              const jid = msg.key?.remoteJid || "";
              const chatInfo = chats?.find(c => c.id === jid);
              const chatName = chatInfo?.name || chatInfo?.subject;

              const ok = await processMessage(msg, chatName);
              if (ok) synced++;
              await new Promise(r => setTimeout(r, 30)); // Rate limit
            } catch (e) {
              console.error("[whatsapp-service] History msg failed:", e?.message);
            }
          }
          console.log(`[whatsapp-service] History sync: forwarded ${synced} messages to webhook`);
        }
      });

      // Also listen for history status updates
      sock.ev.on("messaging-history.status", ({ syncType, status, explicit }) => {
        console.log(`[whatsapp-service] History status: ${syncType} — ${status}${explicit ? " (explicit)" : ""}`);
      });

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
          state.sock = sock;
          console.log(`[whatsapp-service] Connected as ${state.phone}`);
          console.log("[whatsapp-service] Waiting for history sync (messaging-history.set event)...");
        }
        if (connection === "close") {
          state.connected = false;
          state.qr = null;
          state.sock = null;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          console.log(`[whatsapp-service] Connection closed. Status: ${statusCode}`);
          if (statusCode !== (DisconnectReason?.loggedOut ?? 401)) {
            console.log("[whatsapp-service] Reconnecting in 3s...");
            setTimeout(connect, 3000);
          } else {
            console.log("[whatsapp-service] Logged out. Need fresh QR scan.");
          }
        }
      });

      // === NEW MESSAGES (real-time) ===
      sock.ev.on("messages.upsert", async ({ messages }) => {
        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;

          const content = extractContent(msg);
          if (!content) continue;

          const jid = msg.key.remoteJid || "";
          const isGroup = jid.endsWith("@g.us");

          console.log(`[whatsapp-service] New message from ${msg.pushName || "Unknown"}: ${content.slice(0, 50)}`);

          await forwardToWebhook({
            source: isGroup ? "group" : "chat",
            senderName: msg.pushName ?? "Unknown",
            groupName: isGroup ? jid : null,
            content,
            senderPhone: msg.key.participant ?? msg.key.remoteJid,
          });
        }
      });

      // === CHAT UPSERT (when new chats are discovered) ===
      sock.ev.on("chats.upsert", async (chats) => {
        for (const chat of chats) {
          console.log(`[whatsapp-service] Chat discovered: ${chat.name || chat.id}`);
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
    baileysStarted = false;
    setTimeout(() => startBaileys(), 15000);
  }
}

// ─── HTTP server ────────────────────────────────────────────
const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // GET /status — returns connection status + QR
  if (req.method === "GET" && (url.pathname === "/status" || url.pathname === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "running",
      connected: state.connected,
      hasQr: !!state.qr,
      qr: state.qr,
      phone: state.phone,
      hasWebhook: !!state.webhookTarget,
    }));
    return;
  }

  // POST /webhook-target — set the webhook URL
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
      console.log(`[whatsapp-service] Webhook target set: ${target}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
    return;
  }

  // POST /sync — manually trigger chat history sync
  if (req.method === "POST" && url.pathname === "/sync") {
    if (state.sock && state.connected) {
      syncChatHistory(state.sock).catch(() => {});
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "Sync started" }));
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not connected", connected: state.connected }));
    }
    return;
  }

  // POST /restart — restart Baileys connection
  if (req.method === "POST" && url.pathname === "/restart") {
    baileysStarted = false;
    startBaileys();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // POST /logout — disconnect + delete session
  if (req.method === "POST" && url.pathname === "/logout") {
    state.connected = false;
    state.qr = null;
    state.sock = null;
    try {
      if (sock?.logout) await sock.logout();
    } catch {}
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

// Load state + start Baileys after 3s
loadState().then(() => {
  setTimeout(() => startBaileys(), 3000);
});

// Heartbeat
setInterval(() => {
  if (state.connected) console.log(`[whatsapp-service] Connected as ${state.phone}`);
  else if (state.qr) console.log("[whatsapp-service] Waiting for QR scan...");
  else console.log("[whatsapp-service] Starting...");
}, 60000);
