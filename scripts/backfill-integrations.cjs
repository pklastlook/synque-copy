/**
 * SYNQUE — Backfill `Integration.credentials` to encrypted-at-rest + null `customerId`.
 *
 * Task ID: P2-2-b
 *
 * One-time data migration. Run ONCE after deploying the schema change that
 * adds `customerId String?` to `Integration` and the route change that
 * encrypts credentials with `encrypt(JSON.stringify(creds))`.
 *
 * What it does:
 *   1. Reads every row in the `Integration` table.
 *   2. For each row, attempts `decrypt(row.credentials)`.
 *      - If `decrypt` succeeds → the row is already encrypted. Skip.
 *      - If `decrypt` throws   → the row is plaintext JSON. Encrypt it
 *        with `encrypt()` and persist the ciphertext.
 *   3. Sets `customerId = NULL` on every row (existing rows are treated as
 *      global/shared until a tenant admin re-saves them through the UI,
 *      which will bind them to their tenant via `getTenantScope`).
 *
 * Idempotent: running it twice is safe — the second run sees only encrypted
 * rows and skips them.
 *
 * Usage:
 *   cd /home/z/my-project
 *   node scripts/backfill-integrations.cjs
 *
 * Requires:
 *   - DATABASE_URL    in .env  (Neon PostgreSQL — same as the app uses)
 *   - ENCRYPTION_KEY  in .env  (64-char hex string — same as the app uses)
 *
 * Notes:
 *   - Uses `@neondatabase/serverless` directly with tagged-template SQL so
 *     it doesn't depend on the generated Prisma client. This keeps the
 *     script runnable even if `prisma generate` hasn't been re-run yet.
 *   - The AES-256-GCM encrypt/decrypt mirrors `src/lib/crypto.ts`
 *     byte-for-byte (same key derivation, same `v1:<iv>:<ct+tag>` format).
 *     Any future change to that file MUST be mirrored here.
 */

"use strict";

const { neon } = require("@neondatabase/serverless");
const {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} = require("node:crypto");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");

// ---------------------------------------------------------------------------
// .env loader (manual — no dotenv dependency, same pattern as the TS scripts)
// ---------------------------------------------------------------------------
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    // Always overwrite — the .env file is authoritative for this script.
    process.env[key] = value;
  }
}

const projectRoot = resolve(__dirname, "..");
loadEnvFile(resolve(projectRoot, ".env"));
loadEnvFile(resolve(projectRoot, ".env.local"));

const DATABASE_URL = process.env.DATABASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!DATABASE_URL || !DATABASE_URL.startsWith("postgresql://")) {
  console.error("❌ DATABASE_URL not set or not a PostgreSQL URL. Check .env");
  console.error("    Resolved .env path:", resolve(projectRoot, ".env"));
  process.exit(1);
}
if (!ENCRYPTION_KEY) {
  console.error(
    "❌ ENCRYPTION_KEY environment variable must be set. Generate one with: openssl rand -hex 32"
  );
  process.exit(1);
}
if (ENCRYPTION_KEY.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
  console.error(
    "❌ ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: openssl rand -hex 32"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Crypto — mirrors src/lib/crypto.ts byte-for-byte
// ---------------------------------------------------------------------------
const KEY = Buffer.from(ENCRYPTION_KEY, "hex");
const IV_LENGTH = 12; // 96-bit IV — recommended for GCM
const VERSION_TAG = "v1";
const LEGACY_TAG = "enc:";

function encrypt(text) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack ciphertext + tag into a single blob — tag is always the last 16 bytes.
  const blob = Buffer.concat([ct, tag]);
  return `${VERSION_TAG}:${iv.toString("base64")}:${blob.toString("base64")}`;
}

function decrypt(encrypted) {
  if (typeof encrypted !== "string" || encrypted.length === 0) {
    throw new Error("decrypt(): empty input");
  }
  // Legacy format: `enc:<base64>` — plain base64, no real encryption.
  if (encrypted.startsWith(LEGACY_TAG)) {
    return Buffer.from(encrypted.slice(LEGACY_TAG.length), "base64").toString("utf-8");
  }
  // New format: `v1:<base64-iv>:<base64-ciphertext+authTag>`
  if (!encrypted.startsWith(`${VERSION_TAG}:`)) {
    throw new Error("decrypt(): unrecognized ciphertext format");
  }
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("decrypt(): malformed ciphertext (expected 3 parts)");
  }
  const iv = Buffer.from(parts[1], "base64");
  const blob = Buffer.from(parts[2], "base64");
  if (blob.length < 17) {
    // 1 byte ciphertext minimum + 16-byte GCM tag
    throw new Error("decrypt(): ciphertext too short");
  }
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(0, blob.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf-8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  // Neon adapter doesn't accept channel_binding in some configs — strip it.
  const cleanUrl = DATABASE_URL
    .replace(/&?channel_binding=require/g, "")
    .replace(/\?$/, "");
  const sql = neon(cleanUrl);

  console.log("▶ Fetching all Integration rows...");
  const rows = await sql`
    SELECT id, type, credentials, "customerId"
    FROM "Integration"
    ORDER BY "createdAt" ASC
  `;
  console.log(`  found ${rows.length} row(s)`);

  let encryptedCount = 0;
  let alreadyEncryptedCount = 0;
  let skippedCount = 0;
  let customerIdsNulled = 0;

  for (const row of rows) {
    const { id, type, credentials } = row;

    // Decide whether we need to re-write the credentials column.
    let newCredentials = credentials;
    let needsUpdate = false;

    if (!credentials) {
      // Defensive: credentials column is non-nullable per schema, but if a
      // pre-migration row has an empty string skip it.
      console.log(`  ⏭️  [${type}] empty credentials — skipping`);
      skippedCount++;
      continue;
    }

    // Try decrypt — if it works, the row is already encrypted.
    let alreadyEncrypted = false;
    try {
      // Verify it decrypts AND parses as JSON (a row could coincidentally
      // start with "v1:" but be garbage).
      const plain = decrypt(credentials);
      JSON.parse(plain);
      alreadyEncrypted = true;
    } catch {
      // Not encrypted (or garbage) — treat as plaintext, encrypt below.
    }

    if (alreadyEncrypted) {
      alreadyEncryptedCount++;
    } else {
      // Validate the plaintext actually parses as JSON before encrypting,
      // otherwise we'd encrypt corrupt data and silently break the reader.
      try {
        JSON.parse(credentials);
      } catch (err) {
        console.warn(
          `  ⚠️  [${type}] credentials are not valid JSON and not encrypted — leaving untouched:`,
          err instanceof Error ? err.message : String(err)
        );
        skippedCount++;
        continue;
      }
      newCredentials = encrypt(credentials);
      needsUpdate = true;
      encryptedCount++;
    }

    // Always set customerId to NULL for existing rows (global/shared).
    // The next tenant admin to re-save will bind it to their tenant via
    // getTenantScope(). Super-admin-configured rows stay null permanently.
    // We only issue an UPDATE if either the credentials changed OR the
    // customerId isn't already null — saves a write when nothing changed.
    if (row.customerId !== null && row.customerId !== undefined) {
      needsUpdate = true;
      customerIdsNulled++;
    }

    if (needsUpdate) {
      await sql`
        UPDATE "Integration"
        SET credentials = ${newCredentials},
            "customerId" = NULL
        WHERE id = ${id}
      `;
      console.log(
        `  🔒 [${type}] ${alreadyEncrypted ? "(already encrypted)" : "encrypted"} — customerId=NULL`
      );
    } else {
      console.log(`  ✓  [${type}] already encrypted + customerId already NULL — no change`);
    }
  }

  console.log("\n▶ Summary");
  console.log(`  total rows:               ${rows.length}`);
  console.log(`  encrypted this run:       ${encryptedCount}`);
  console.log(`  already encrypted:        ${alreadyEncryptedCount}`);
  console.log(`  customerId → NULL:        ${customerIdsNulled}`);
  console.log(`  skipped (empty / corrupt): ${skippedCount}`);
  console.log("\n✓ done");
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
