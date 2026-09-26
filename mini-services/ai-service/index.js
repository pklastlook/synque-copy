/**
 * AI Mini-Service
 * Wraps the ZAI SDK and exposes it as HTTP endpoints.
 * Deploy on Railway.
 */
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3004", 10);

let zaiClient = null;

async function getZaiClient() {
  if (zaiClient) return zaiClient;

  const ZAI = (await import("z-ai-web-dev-sdk")).default;

  // Write config from env vars first
  const apiKey = process.env.ZAI_API_KEY;
  const baseUrl = process.env.ZAI_BASE_URL;
  if (!apiKey || !baseUrl) {
    throw new Error("ZAI_API_KEY and ZAI_BASE_URL env vars are required");
  }
  const config = {
    apiKey,
    baseUrl,
    chatId: process.env.ZAI_CHAT_ID || "",
    token: process.env.ZAI_TOKEN || "",
    userId: process.env.ZAI_USER_ID || "",
  };
  console.log("[ai-service] Config:", JSON.stringify({ ...config, token: config.token ? "***" : "(empty)" }));
  
  const configPath = join(__dirname, ".z-ai-config");
  await writeFile(configPath, JSON.stringify(config), "utf-8");
  
  zaiClient = await ZAI.create();
  console.log("[ai-service] ZAI client created");
  return zaiClient;
}

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
    res.end(JSON.stringify({
      status: "running",
      service: "ai-service",
      provider: "zai",
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  if (req.url === "/chat" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { messages = [] } = JSON.parse(body);

      if (!Array.isArray(messages) || messages.length === 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "messages array required" }));
        return;
      }

      console.log("[ai-service] /chat — messages:", messages.length);
      const zai = await getZaiClient();
      
      const completion = await zai.chat.completions.create({
        messages: messages.map((m) => ({
          role: m.role === "system" ? "assistant" : m.role,
          content: m.content,
        })),
        thinking: { type: "disabled" },
      });
      const content = completion.choices[0]?.message?.content ?? "";
      console.log("[ai-service] /chat — response length:", content.length);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ content }));
    } catch (err) {
      console.error("[ai-service] /chat error:", err.message);
      console.error("[ai-service] stack:", err.stack);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message, stack: err.stack?.split("\n").slice(0, 5) }));
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
  console.log(`[ai-service] HTTP server on http://0.0.0.0:${PORT}`);
  // Pre-warm ZAI client
  getZaiClient().catch((err) => {
    console.error("[ai-service] ZAI client creation failed:", err.message);
  });
});
