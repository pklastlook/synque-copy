/**
 * SYNQUE — Push .env variables to Vercel via REST API
 *
 * Usage:
 *   VERCEL_TOKEN=your_token VERCEL_PROJECT_ID=your_project_id bun run scripts/push-env-to-vercel.ts
 *
 * Get your token at: https://vercel.com/account/tokens
 * Get your project ID from: Vercel Dashboard → Project → Settings → General
 *
 * This script reads .env and pushes each variable to Vercel for ALL
 * environments (production, preview, development).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // optional — only if using a team account

if (!VERCEL_TOKEN) {
  console.error("❌ VERCEL_TOKEN is required. Get yours at: https://vercel.com/account/tokens");
  process.exit(1);
}
if (!VERCEL_PROJECT_ID) {
  console.error("❌ VERCEL_PROJECT_ID is required. Find it in: Vercel Dashboard → Project → Settings → General");
  process.exit(1);
}

const envPath = resolve(import.meta.dirname, "..", ".env");
if (!existsSync(envPath)) {
  console.error("❌ .env file not found at:", envPath);
  process.exit(1);
}

const envContent = readFileSync(envPath, "utf-8");

// Parse .env into key-value pairs (skip comments and empty lines)
const vars: { key: string; value: string }[] = [];
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.substring(0, eqIdx).trim();
  const value = trimmed.substring(eqIdx + 1).trim();
  if (key) vars.push({ key, value });
}

console.log(`📤 Found ${vars.length} environment variables in .env`);
console.log(`   Project: ${VERCEL_PROJECT_ID}`);
console.log(`   Team: ${VERCEL_TEAM_ID || "(personal account)"}`);
console.log("");

const baseUrl = "https://api.vercel.com";
const teamParam = VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : "";

// First, fetch existing env vars so we can update instead of duplicate
async function getExistingVars(): Promise<Map<string, string>> {
  const url = `${baseUrl}/v9/projects/${VERCEL_PROJECT_ID}/env${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  });
  if (!res.ok) {
    console.error(`❌ Failed to fetch existing vars: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const data = await res.json();
  const existing = new Map<string, string>();
  for (const env of data.envs || []) {
    existing.set(env.key, env.id);
  }
  return existing;
}

async function createOrUpdateVar(key: string, value: string, existingId?: string) {
  const body = {
    key,
    value,
    type: "encrypted",
    target: ["production", "preview", "development"],
  };

  const url = existingId
    ? `${baseUrl}/v9/projects/${VERCEL_PROJECT_ID}/env/${existingId}${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""}`
    : `${baseUrl}/v10/projects/${VERCEL_PROJECT_ID}/env${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ""}`;

  const method = existingId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    // If it's a "duplicate" error, that's fine
    if (errText.includes("already exists")) {
      console.log(`  ⏭️  ${key} (already exists, skipped)`);
      return;
    }
    console.error(`  ❌ ${key}: ${res.status} ${errText.substring(0, 100)}`);
    return;
  }

  console.log(`  ${existingId ? "🔄" : "✅"} ${key}`);
}

async function main() {
  console.log("📋 Fetching existing variables...");
  const existing = await getExistingVars();
  console.log(`   Found ${existing.size} existing variables in Vercel`);
  console.log("");

  console.log("📤 Pushing variables...");
  for (const { key, value } of vars) {
    const existingId = existing.get(key);
    await createOrUpdateVar(key, value, existingId);
  }

  console.log("");
  console.log("✅ Done! All environment variables are now on Vercel.");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Verify in Vercel dashboard: Settings → Environment Variables");
  console.log("  2. Redeploy your project for the variables to take effect.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
