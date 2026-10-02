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
const ZAI_BASE_URL = "https://internal-api.z.ai/v1";
const API_KEY = "Z.ai";
const CHAT_ID = "chat-b8e092a6-6649-4a04-b709-d6b3d6038f56";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMjhmZWU5OTEtNjczYy00NDc2LWI0ZTYtZDljYWFhZGY5ZWQ1IiwiY2hhdF9pZCI6ImNoYXQtYjhlMDkyYTYtNjY0OS00YTA0LWI3MDktZDZiM2Q2MDM4ZjU2IiwicGxhdGZvcm0iOiJ6YWkifQ.rVhhVlYSk8zQsc2RF56Qri9vv8wtKsJd2UWyLJ1XBqE";
const USER_ID = "28fee991-673c-4476-b4e6-d9caaadf9ed5";

const server = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "running", service: "zai-proxy" }));
    return;
  }

  if (req.url === "/chat" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { messages = [] } = JSON.parse(body);

      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "X-Z-AI-From": "Z",
        "X-Chat-Id": CHAT_ID,
        "X-User-Id": USER_ID,
        "X-Token": TOKEN,
      };

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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[zai-proxy] Running on http://0.0.0.0:${PORT}`);
});
