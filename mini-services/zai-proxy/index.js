/**
 * ZAI API Proxy — runs on the sandbox, proxies requests to internal-api.z.ai
 * which is only reachable from this network.
 *
 * The Vercel app calls this proxy instead of internal-api.z.ai directly.
 *
 * Port: 3005
 */
import { createServer } from "node:http";

const PORT = 3005;
const ZAI_BASE_URL = process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1";
const API_KEY = process.env.ZAI_API_KEY;
const CHAT_ID = process.env.ZAI_CHAT_ID;
const TOKEN = process.env.ZAI_TOKEN;
const USER_ID = process.env.ZAI_USER_ID;

// ─── Security config ──────────────────────────────────────────────────────
// Shared-secret bearer auth — every route except /health requires
// `Authorization: Bearer <MINI_SERVICE_KEY>`.
const SERVICE_KEY = process.env.MINI_SERVICE_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

if (!SERVICE_KEY) {
  console.error("[zai-proxy] FATAL: MINI_SERVICE_KEY env var is required");
  process.exit(1);
}

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", APP_URL);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  // ─── Auth middleware — every route except /health requires a bearer token ───
  if (url.pathname !== "/health") {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${SERVICE_KEY}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
  }

  if (url.pathname === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "running", service: "zai-proxy" }));
    return;
  }

  if (url.pathname === "/chat" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { messages = [] } = JSON.parse(body);

      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "X-Z-AI-From": "Z",
      };
      if (CHAT_ID) headers["X-Chat-Id"] = CHAT_ID;
      if (USER_ID) headers["X-User-Id"] = USER_ID;
      if (TOKEN) headers["X-Token"] = TOKEN;

      const zaiRes = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          thinking: { type: "disabled" },
        }),
      });

      if (!zaiRes.ok) {
        const errText = await zaiRes.text().catch(() => "");
        res.writeHead(zaiRes.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `ZAI API ${zaiRes.status}: ${errText.substring(0, 100)}` }));
        return;
      }

      const data = await zaiRes.json();
      const content = data.choices?.[0]?.message?.content ?? "";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ content }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[zai-proxy] Running on http://127.0.0.1:${PORT}`);
});
