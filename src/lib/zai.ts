import ZAI from "z-ai-web-dev-sdk";
import { promises as fs } from "fs";
import path from "path";

/**
 * Creates a ZAI client. Tries the standard ZAI.create() first
 * (reads .z-ai-config from cwd, home dir, or /etc).
 *
 * If that fails (e.g. on Vercel), it writes a config file from env vars
 * and retries.
 *
 * Environment variables needed on Vercel:
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
    // Method 2: Write config from env vars, then retry
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

      // Write to a temp config file that ZAI.create() can find
      const configPath = path.join(process.cwd(), ".z-ai-config");
      try {
        await fs.writeFile(configPath, JSON.stringify(config), "utf-8");
        // Retry create() now that the file exists
        return await ZAI.create();
      } catch {
        throw new Error("Failed to write ZAI config from env vars");
      }
    }

    throw new Error("ZAI SDK not configured — need .z-ai-config file or ZAI_* env vars");
  }
}
