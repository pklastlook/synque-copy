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
// Uses multiple methods: store, messaging-history event, and direct fetch
async function syncChatHistory(sock) {
  try {
    console.log("[whatsapp-service] Syncing chat history...");

    // Wait for history to arrive
    await new Promise(r => setTimeout(r, 2000));

    // Method 1: Try the store (if available — requires makeInMemoryStore)
    const store = sock.store;
    if (store && store.chats) {
      const chats = store.chats.all ? store.chats.all() : Object.values(store.chats);
      if (chats.length > 0) {
        console.log(`[whatsapp-service] Store has ${chats.length} chats`);
        let synced = await forwardMessagesFromStore(store, chats);
        if (synced > 0) {
          console.log(`[whatsapp-service] Synced ${synced} messages from store`);
          return;
        }
      }
    }

    // Method 2: Try fetching chats directly from WhatsApp
    console.log("[whatsapp-service] Trying direct chat fetch...");
    const chats = await sock.getChats?.() ?? [];
    if (chats.length > 0) {
      console.log(`[whatsapp-service] Found ${chats.length} chats via getChats()`);
      let synced = 0;
      for (const chat of chats.slice(0, 20)) {
        try {
          const messages = await chat.fetchMessages?.({ limit: 10 }) ?? [];
          for (const msg of messages) {
            if (!msg?.message || msg?.key?.fromMe) continue;
            const content = extractContent(msg);
            if (!content) continue;
            await forwardMessage(msg, chat);
            synced++;
            await new Promise(r => setTimeout(r, 50));
          }
        } catch (e) {
          console.error(`[whatsapp-service] Chat fetch failed: ${e?.message}`);
        }
      }
      console.log(`[whatsapp-service] Synced ${synced} messages from getChats()`);
      return;
    }

    // Method 3: Try using sock.fetchMessagesFromWA (Baileys internal)
    console.log("[whatsapp-service] Trying fetchMessagesFromWA...");
    // Get the user's chats by listing conversations
    const conversationJids = await sock.fetchBlocklist?.() ?? []; // fallback
    console.log("[whatsapp-service] Could not fetch chat history — waiting for messaging-history event");
    // The messaging-history.set event handler (above) will catch history sync automatically
  } catch (e) {
    console.error("[whatsapp-service] Chat history sync failed:", e?.message || String(e));
  }
}

function extractContent(msg) {
  if (!msg?.message) return null;
  if (msg.message.conversation) return msg.message.conversation;
  if (msg.message.extendedTextMessage?.text) return msg.message.extendedTextMessage.text;
  if (msg.message.imageMessage?.caption) return msg.message.imageMessage.caption;
  if (msg.message.videoMessage?.caption) return msg.message.videoMessage.caption;
  return null;
}

async function forwardMessage(msg, chat) {
  const content = extractContent(msg);
  if (!content || !state.webhookTarget) return false;
  const jid = msg.key?.remoteJid || chat?.id || "";
  const isGroup = jid.endsWith("@g.us");
  try {
    await fetch(state.webhookTarget, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: isGroup ? "group" : "chat",
        senderName: msg.pushName || chat?.name || "Unknown",
        groupName: isGroup ? (chat?.name || jid) : null,
        content,
        senderPhone: msg.key?.participant || jid,
      }),
    });
    return true;
  } catch { return false; }
}

async function forwardMessagesFromStore(store, chats) {
  let synced = 0;
  for (const chat of chats.slice(0, 30)) {
    try {
      const jid = chat.id || chat.jid;
      if (!jid) continue;
      const isGroup = jid.endsWith("@g.us");
      const messages = store.messages?.[jid]?.array ?? store.messages?.[jid] ?? [];
      const recent = Array.isArray(messages) ? messages.slice(-10) : [];
      for (const msg of recent) {
        if (!msg?.message || msg?.key?.fromMe) continue;
        const content = extractContent(msg);
        if (!content) continue;
        if (state.webhookTarget) {
          try {
            await fetch(state.webhookTarget, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                source: isGroup ? "group" : "chat",
                senderName: msg.pushName || chat.name || "Unknown",
                groupName: isGroup ? (chat.name || jid) : null,
                content,
                senderPhone: msg.key?.participant || jid,
              }),
            });
            synced++;
          } catch {}
        }
      }
      await new Promise(r => setTimeout(r, 100));
    } catch {}
  }
  return synced;
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
    const makeInMemoryStore = mod.makeInMemoryStore || baileys.makeInMemoryStore;

    const QRCode = (await import("qrcode")).default;
    const pino = (await import("pino")).pino;
    const logger = pino({ level: "silent" });

    await mkdir(SESSIONS_DIR, { recursive: true });
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`[whatsapp-service] Using WA v${version.join(".")} (latest: ${isLatest})`);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { state: authState, saveCreds } = await useMultiFileAuthState(join(SESSIONS_DIR, "auth"));

    // In-memory store for chat history (needed for getChats/fetchMessages)
    const store = makeInMemoryStore ? makeInMemoryStore({ logger }) : null;
    if (store) {
      store.readFromFile(join(SESSIONS_DIR, "store.json"));
      // Save store periodically
      setInterval(() => {
        store.writeToFile(join(SESSIONS_DIR, "store.json"));
      }, 30000);
    }

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

      // Bind store to socket events (captures chat history)
      if (store) store.bind(sock.ev);

      sock.ev.on("creds.update", saveCreds);

      // Listen for history sync events (Baileys sends chat history after connection)
      sock.ev.on("messaging-history.set", async ({ chats, contacts, messages, isLatest }) => {
        console.log(`[whatsapp-service] History sync: ${chats?.length || 0} chats, ${messages?.length || 0} messages`);
        if (messages && messages.length > 0 && state.webhookTarget) {
          let synced = 0;
          for (const msg of messages.slice(0, 200)) {
            try {
              if (!msg?.message || msg?.key?.fromMe) continue;
              let content = "";
              if (msg.message.conversation) content = msg.message.conversation;
              else if (msg.message.extendedTextMessage?.text) content = msg.message.extendedTextMessage.text;
              else if (msg.message.imageMessage?.caption) content = msg.message.imageMessage.caption;
              else if (msg.message.videoMessage?.caption) content = msg.message.videoMessage.caption;
              else continue;

              const jid = msg.key?.remoteJid || "";
              const isGroup = jid.endsWith("@g.us");
              const chatInfo = chats?.find(c => c.id === jid);

              await fetch(state.webhookTarget, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  source: isGroup ? "group" : "chat",
                  senderName: msg.pushName || chatInfo?.name || "Unknown",
                  groupName: isGroup ? (chatInfo?.name || jid) : null,
                  content,
                  senderPhone: msg.key?.participant || jid,
                }),
              }).catch(() => {});
              synced++;
              await new Promise(r => setTimeout(r, 50));
            } catch {}
          }
          console.log(`[whatsapp-service] History sync forwarded ${synced} messages`);
        }
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
          state.sock = sock; // Save for /sync endpoint
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
        // Save sock reference for /sync endpoint
        state.sock = sock;
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

  // POST /sync — manually trigger chat history sync
  if (req.method === "POST" && url.pathname === "/sync") {
    if (state.sock && state.connected) {
      // Run sync in background — respond immediately
      syncChatHistory(state.sock).catch(() => {});
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, message: "Sync started" }));
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not connected", connected: state.connected }));
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
