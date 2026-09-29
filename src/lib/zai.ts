import ZAI from "z-ai-web-dev-sdk";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

/**
 * Creates a ZAI client. Tries multiple methods in order:
 *
 * 1. Standard ZAI.create() — reads .z-ai-config from cwd, home dir, or /etc
 * 2. If that fails, write config from env vars to a temp file and retry
 * 3. If no env vars, try reading .z-ai-config from the user's home directory
 *
 * Environment variables (for Vercel/production):
 *   ZAI_API_KEY
 *   ZAI_BASE_URL
 *   ZAI_CHAT_ID
 *   ZAI_TOKEN
 *   ZAI_USER_ID
 */
export async function createZaiClient(): Promise<ZAI> {
  // Method 1: Try standard create (reads config file from known paths)
  try {
    return await ZAI.create();
  } catch {
    // Continue to fallback methods
  }

  // Method 2: Write config from env vars to a temp file, then retry
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

    // Try writing to cwd first, then home dir, then /tmp
    const configPaths = [
      path.join(process.cwd(), ".z-ai-config"),
      path.join(os.homedir(), ".z-ai-config"),
      path.join(os.tmpdir(), ".z-ai-config"),
    ];

    for (const configPath of configPaths) {
      try {
        await fs.writeFile(configPath, JSON.stringify(config), "utf-8");
        return await ZAI.create();
      } catch {
        // Try next path
      }
    }
  }

  // Method 3: The .z-ai-config file is shipped with the repo (in cwd).
  // On Vercel, cwd might be different — try reading from the repo root.
  try {
    const repoConfigPath = path.join(process.cwd(), ".z-ai-config");
    const configContent = await fs.readFile(repoConfigPath, "utf-8");
    const config = JSON.parse(configContent);

    // Write to a location ZAI.create() can find
    const homeConfigPath = path.join(os.homedir(), ".z-ai-config");
    await fs.writeFile(homeConfigPath, JSON.stringify(config), "utf-8");
    return await ZAI.create();
  } catch {}

  throw new Error(
    "ZAI SDK not configured — need .z-ai-config file or ZAI_* env vars " +
    "(ZAI_API_KEY, ZAI_BASE_URL, ZAI_CHAT_ID, ZAI_TOKEN, ZAI_USER_ID)"
  );
}
