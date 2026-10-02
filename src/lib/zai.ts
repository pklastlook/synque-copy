import ZAI from "z-ai-web-dev-sdk";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

/**
 * Creates a ZAI client. Tries multiple methods in order:
 *
 * 1. Standard ZAI.create() — reads .z-ai-config from cwd, home dir, or /etc
 * 2. If that fails, write config from env vars to /tmp (writable on Vercel)
 *    and retry. Also sets ZAI_CONFIG_PATH env var so the SDK knows where to look.
 * 3. If no env vars, try reading .z-ai-config from the repo root.
 *
 * Environment variables (for Vercel/production):
 *   ZAI_API_KEY
 *   ZAI_BASE_URL
 *   ZAI_CHAT_ID
 *   ZAI_TOKEN
 *   ZAI_USER_ID
 *
 * On Vercel serverless:
 *   - cwd is NOT writable
 *   - home dir is NOT writable
 *   - /tmp IS writable (the only writable directory)
 *   So we try /tmp FIRST.
 */
export async function createZaiClient(): Promise<ZAI> {
  // Method 1: Try standard create (reads config file from known paths)
  try {
    return await ZAI.create();
  } catch {
    // Continue to fallback methods
  }

  // Method 2: Write config from env vars to a writable temp file, then retry.
  // On Vercel, /tmp is the ONLY writable directory — try it FIRST.
  const apiKey = process.env.ZAI_API_KEY;
  const baseUrl = process.env.ZAI_BASE_URL;

  if (apiKey && baseUrl) {
    const config = {
      apiKey,
      baseUrl,
      chatId: process.env.ZAI_CHAT_ID ?? "",
      token: process.env.ZAI_TOKEN ?? "",
      userId: process.env.ZAI_USER_ID ?? "",
    };

    // Try /tmp FIRST (Vercel-writable), then cwd, then home dir
    const configPaths = [
      path.join(os.tmpdir(), ".z-ai-config"),
      path.join(process.cwd(), ".z-ai-config"),
      path.join(os.homedir(), ".z-ai-config"),
    ];

    for (const configPath of configPaths) {
      try {
        await fs.writeFile(configPath, JSON.stringify(config), "utf-8");
        // Also set the env var so the ZAI SDK knows where to find the config
        // (some SDK versions check ZAI_CONFIG_PATH first)
        process.env.ZAI_CONFIG_PATH = configPath;
        return await ZAI.create();
      } catch {
        // Try next path
      }
    }
  }

  // Method 3: The .z-ai-config file is shipped with the repo (in cwd).
  // On Vercel, read it and copy to /tmp (writable) so ZAI.create() can find it.
  try {
    const repoConfigPath = path.join(process.cwd(), ".z-ai-config");
    const configContent = await fs.readFile(repoConfigPath, "utf-8");
    const config = JSON.parse(configContent);

    // Write to /tmp (writable on Vercel) — NOT home dir
    const tmpConfigPath = path.join(os.tmpdir(), ".z-ai-config");
    await fs.writeFile(tmpConfigPath, JSON.stringify(config), "utf-8");
    process.env.ZAI_CONFIG_PATH = tmpConfigPath;
    return await ZAI.create();
  } catch {}

  throw new Error(
    "ZAI SDK not configured — need .z-ai-config file or ZAI_* env vars " +
    "(ZAI_API_KEY, ZAI_BASE_URL, ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID)"
  );
}
