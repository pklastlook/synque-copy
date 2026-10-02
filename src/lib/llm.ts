import { db } from "./db";

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<string>;
  provider: string;
}

// ============================================================================
// Claude Client (Anthropic API) — primary provider
// ============================================================================

class ClaudeClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private workspaceId: string | undefined;
  get provider() { return "claude"; }

  constructor(creds: Record<string, string>) {
    this.apiKey = creds.apiKey;
    this.model = creds.model || "claude-sonnet-4-20250514";
    this.workspaceId = creds.workspaceId || undefined;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    // Anthropic API separates system messages from the conversation
    const systemParts: string[] = [];
    const conversationMsgs: { role: "user" | "assistant"; content: string }[] = [];

    for (const m of messages) {
      if (m.role === "system") {
        systemParts.push(m.content);
      } else {
        conversationMsgs.push({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        });
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: conversationMsgs,
    };
    if (systemParts.length > 0) {
      body.system = systemParts.join("\n\n");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
    };
    // If the API key is not workspace-scoped, include the workspace ID header
    if (this.workspaceId) {
      headers["anthropic-workspace-id"] = this.workspaceId;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Claude API error: ${errBody.error?.message ?? res.status}`);
    }

    const json = await res.json() as {
      content?: { type: string; text?: string }[];
    };
    // Anthropic returns content as an array of blocks
    const textBlocks = json.content?.filter((b) => b.type === "text") ?? [];
    return textBlocks.map((b) => b.text ?? "").join("") ?? "";
  }
}

// ============================================================================
// OpenAI Client
// ============================================================================

class OpenAIClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  get provider() { return "openai"; }

  constructor(creds: Record<string, string>) {
    this.apiKey = creds.apiKey;
    this.model = creds.model || "gpt-4o-mini";
    this.baseUrl = (creds.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.8,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`OpenAI API error: ${errBody.error?.message ?? res.status}`);
    }

    const json = await res.json() as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content ?? "";
  }
}

// ============================================================================
// Gemini Client
// ============================================================================

class GeminiClient implements LLMClient {
  private apiKey: string;
  private model: string;
  get provider() { return "gemini"; }

  constructor(creds: Record<string, string>) {
    this.apiKey = creds.apiKey;
    // Default to gemini-2.5-flash (latest available as of Sep 2025).
    // Auto-upgrade deprecated models: gemini-1.5-* and gemini-2.0-* are no longer available.
    const stored = creds.model || "gemini-2.5-flash";
    if (stored.includes("1.5") || stored.includes("2.0-flash")) {
      this.model = "gemini-2.5-flash";
    } else {
      this.model = stored;
    }
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const systemParts: string[] = [];
    const contents: { role: string; parts: { text: string }[] }[] = [];

    for (const m of messages) {
      if (m.role === "system") {
        systemParts.push(m.content);
      } else {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
      }
    }

    const body: Record<string, unknown> = { contents };
    if (systemParts.length > 0) {
      body.systemInstruction = { parts: [{ text: systemParts.join("\n\n") }] };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Gemini API error: ${errBody.error?.message ?? res.status}`);
    }

    const json = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}

// ============================================================================
// ZAI Client (legacy fallback — uses ZAI SDK)
// ============================================================================

class ZAIClient implements LLMClient {
  private zai: any;
  get provider() { return "zai"; }

  constructor(zai: any) {
    this.zai = zai;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    // ZAI SDK supports system/user/assistant roles. Pass them through directly.
    const completion = await this.zai.chat.completions.create({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      thinking: { type: "disabled" },
    });
    return completion.choices[0]?.message?.content ?? "";
  }
}

// ============================================================================
// ZAI Direct Client — calls the ZAI API directly via fetch (no SDK needed).
// Tries the Railway AI service as a proxy first (if AI_SERVICE_URL is set),
// then falls back to calling the ZAI API directly.
// ============================================================================

class ZAIDirectClient implements LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private token: string;
  private proxyUrl: string | null;
  get provider() { return "zai-direct"; }

  constructor() {
    this.apiKey = process.env.ZAI_API_KEY || "Z.ai";
    this.baseUrl = (process.env.ZAI_BASE_URL || "https://internal-api.z.ai/v1").replace(/\/+$/, "");
    this.token = process.env.ZAI_TOKEN || "";
    this.proxyUrl = process.env.AI_SERVICE_URL || null;
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    // Strategy 1: Try the Railway AI service as a proxy (it has the ZAI
    // credentials and may have better network connectivity)
    if (this.proxyUrl) {
      try {
        const proxyRes = await fetch(`${this.proxyUrl}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        if (proxyRes.ok) {
          const data = await proxyRes.json();
          if (data.content) return data.content;
        }
      } catch (proxyErr) {
        console.error("[llm:zai-direct] proxy fetch failed:", proxyErr instanceof Error ? proxyErr.message : String(proxyErr));
      }
    }

    // Strategy 2: Call the ZAI API directly with the correct SDK headers
    const chatId = process.env.ZAI_CHAT_ID || "";
    const userId = process.env.ZAI_USER_ID || "";
    const token = this.token;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`,
      "X-Z-AI-From": "Z",
    };
    if (chatId) headers["X-Chat-Id"] = chatId;
    if (userId) headers["X-User-Id"] = userId;
    if (token) headers["X-Token"] = token;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          thinking: { type: "disabled" },
        }),
      });
    } catch (fetchErr) {
      console.error("[llm:zai-direct] direct fetch failed:", fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
      throw new Error(`ZAI fetch failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[llm:zai-direct] API error ${res.status}:`, errText.substring(0, 200));
      throw new Error(`ZAI API error ${res.status}: ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
}

// ============================================================================
// Factory + fallback
// ============================================================================

let _cachedClient: LLMClient | null = null;
let _cachedKey: string = "";

export async function getLLMClient(): Promise<LLMClient> {
  const bucket = Math.floor(Date.now() / 60000);
  if (_cachedClient && _cachedKey === bucket.toString()) return _cachedClient;

  // 0. Try ZAI Direct fetch first — most reliable on Vercel serverless.
  //    Calls the ZAI API directly via fetch (no SDK, no config file needed).
  //    Only requires ZAI_API_KEY + ZAI_BASE_URL env vars.
  if (process.env.ZAI_API_KEY && process.env.ZAI_BASE_URL) {
    try {
      _cachedClient = new ZAIDirectClient();
      _cachedKey = bucket.toString();
      console.log("[llm] Using ZAI Direct provider (fetch-based, Vercel-safe)");
      return _cachedClient;
    } catch {}
  }

  // 0b. Try ZAI SDK (works locally where .z-ai-config file exists)
  try {
    const { createZaiClient } = await import("./zai");
    const zai = await createZaiClient();
    _cachedClient = new ZAIClient(zai);
    _cachedKey = bucket.toString();
    console.log("[llm] Using ZAI SDK provider (config-file-based)");
    return _cachedClient;
  } catch {}

  // 1. Try Claude (Anthropic) from DB
  try {
    const row = await db.integration.findUnique({ where: { type: "claude" } });
    if (row?.enabled && row.credentials) {
      const creds = JSON.parse(row.credentials) as Record<string, string>;
      if (creds.apiKey && creds.model) {
        _cachedClient = new ClaudeClient(creds);
        _cachedKey = bucket.toString();
        console.log("[llm] Using Claude provider from DB (model:", creds.model + ")");
        return _cachedClient;
      }
    }
  } catch {}

  // 2. Try OpenAI from DB
  try {
    const row = await db.integration.findUnique({ where: { type: "openai" } });
    if (row?.enabled && row.credentials) {
      const creds = JSON.parse(row.credentials) as Record<string, string>;
      if (creds.apiKey && creds.model) {
        _cachedClient = new OpenAIClient(creds);
        _cachedKey = bucket.toString();
        return _cachedClient;
      }
    }
  } catch {}

  // 3. Try Gemini from DB (may fail due to geo-restrictions)
  try {
    const row = await db.integration.findUnique({ where: { type: "gemini" } });
    if (row?.enabled && row.credentials) {
      const creds = JSON.parse(row.credentials) as Record<string, string>;
      if (creds.apiKey && creds.model) {
        _cachedClient = new GeminiClient(creds);
        _cachedKey = bucket.toString();
        return _cachedClient;
      }
    }
  } catch {}

  // 4. Try ANTHROPIC_API_KEY env var
  if (process.env.ANTHROPIC_API_KEY) {
    _cachedClient = new ClaudeClient({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    });
    _cachedKey = bucket.toString();
    return _cachedClient;
  }

  // 5. Fall back to ZAI SDK
  try {
    const { createZaiClient } = await import("./zai");
    const zai = await createZaiClient();
    _cachedClient = new ZAIClient(zai);
    _cachedKey = bucket.toString();
    return _cachedClient;
  } catch {}

  throw new Error("No LLM provider configured.");
}

export async function chatWithFallback(messages: LLMMessage[]): Promise<{ content: string; provider: string }> {
  const providers: { client: LLMClient; name: string }[] = [];

  // 1. Primary provider
  try {
    const client = await getLLMClient();
    providers.push({ client, name: client.provider });
  } catch {}

  // 2. ZAI fallback (if not already the primary)
  const hasZai = providers.some((p) => p.name === "zai");
  if (!hasZai) {
    try {
      const { createZaiClient } = await import("./zai");
      const zai = await createZaiClient();
      providers.push({ client: new ZAIClient(zai), name: "zai-fallback" });
    } catch {}
  }

  if (providers.length === 0) {
    throw new Error("No LLM provider available.");
  }

  let lastError: Error | null = null;
  for (const { client, name } of providers) {
    try {
      console.log(`[llm] Trying provider: ${name}`);
      const content = await client.chat(messages);
      if (content && content.trim().length > 0) {
        console.log(`[llm] Success with provider: ${name} (${content.length} chars)`);
        return { content, provider: name };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[llm] Provider ${name} failed: ${lastError.message}`);
    }
  }

  throw new Error(`All LLM providers failed. Last error: ${lastError?.message ?? "unknown"}`);
}

export function invalidateLLMClient(): void {
  _cachedClient = null;
  _cachedKey = "";
}

export interface LLMStatus {
  configured: boolean;
  provider: string;
  model?: string;
  message: string;
  credentialSource?: "db" | "env" | "none";
}

export async function getLLMStatus(): Promise<LLMStatus> {
  // Check Claude from DB first
  try {
    const row = await db.integration.findUnique({ where: { type: "claude" } });
    if (row?.enabled && row.credentials) {
      const creds = JSON.parse(row.credentials) as Record<string, string>;
      if (creds.apiKey && creds.model) {
        return {
          configured: true,
          provider: "claude",
          model: creds.model,
          message: `Claude (${creds.model}) configured via Settings — AI assistant is live.`,
          credentialSource: "db",
        };
      }
    }
  } catch {}

  // Check OpenAI from DB
  try {
    const row = await db.integration.findUnique({ where: { type: "openai" } });
    if (row?.enabled && row.credentials) {
      const creds = JSON.parse(row.credentials) as Record<string, string>;
      if (creds.apiKey && creds.model) {
        return { configured: true, provider: "openai", model: creds.model, message: `OpenAI (${creds.model}) configured.`, credentialSource: "db" };
      }
    }
  } catch {}

  // Check Gemini from DB
  try {
    const row = await db.integration.findUnique({ where: { type: "gemini" } });
    if (row?.enabled && row.credentials) {
      const creds = JSON.parse(row.credentials) as Record<string, string>;
      if (creds.apiKey && creds.model) {
        return { configured: true, provider: "gemini", model: creds.model, message: `Gemini (${creds.model}) configured.`, credentialSource: "db" };
      }
    }
  } catch {}

  // Check ANTHROPIC_API_KEY env var
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      configured: true,
      provider: "claude",
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      message: "Claude configured via .env (ANTHROPIC_API_KEY).",
      credentialSource: "env",
    };
  }

  // Check ZAI SDK env vars
  if (process.env.ZAI_API_KEY && process.env.ZAI_BASE_URL) {
    return { configured: true, provider: "zai", model: "zai-default", message: "ZAI SDK configured via .env.", credentialSource: "env" };
  }

  return { configured: false, provider: "none", message: "No LLM provider configured.", credentialSource: "none" };
}
