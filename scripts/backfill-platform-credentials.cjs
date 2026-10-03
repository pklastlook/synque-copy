/**
 * One-time backfill: encrypt all sensitive PlatformCredential fields at rest.
 *
 * SECURITY-DATA Finding 1 remediation (Task P2-2-a).
 *
 * Sensitive fields stored as AES-256-GCM ciphertexts (format
 * `v1:<base64-iv>:<base64-ciphertext+authTag>` — see `src/lib/crypto.ts`):
 *   clientSecret, accessSecret, accessToken, bearerToken,
 *   oauth2UserToken, apiKey, apiSecret
 *
 * For every row in `PlatformCredential`, for each sensitive field:
 *   - null / empty string → leave alone (already "no value")
 *   - Already a recognisable ciphertext (decrypt succeeds) → skip (idempotent)
 *   - Recognisable legacy `enc:<base64>` format (old insecure format) →
 *     re-encrypt with the new AES-256-GCM scheme (silent upgrade)
 *   - Anything else (pre-migration plaintext) → encrypt + UPDATE the row
 *
 * Idempotent: safe to run multiple times. Already-encrypted rows are skipped
 * on subsequent runs.
 *
 * Usage:
 *   node scripts/backfill-platform-credentials.cjs
 *   # or
 *   bun scripts/backfill-platform-credentials.cjs
 *
 * Env vars (loaded from .env if not already in process.env):
 *   - DATABASE_URL   (Neon connection string with ?sslmode=require)
 *   - ENCRYPTION_KEY  (64-char hex string — 32 bytes — generate with
 *                      `openssl rand -hex 32`)
 *
 * NOTE: this script does NOT use Prisma — it uses the `pg` driver directly
 * so we can issue a single bulk UPDATE per row without going through the
 * Prisma client (which would re-decrypt/re-encrypt on every read/write).
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Client } = require("pg");

// ---------------------------------------------------------------------------
// .env loader (avoids a `dotenv` dependency — keeps this script standalone).
// Reads KEY=VALUE lines from the project root .env, ignoring comments and
// blank lines. Does NOT override values already present in process.env.
// ---------------------------------------------------------------------------
function loadDotEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes (single or double) if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

// ---------------------------------------------------------------------------
// Crypto helpers — mirror `src/lib/crypto.ts` exactly (AES-256-GCM).
// ---------------------------------------------------------------------------
const KEY_HEX = process.env.ENCRYPTION_KEY;
if (!KEY_HEX) {
  console.error(
    "ENCRYPTION_KEY environment variable must be set. Generate one with: openssl rand -hex 32"
  );
  process.exit(1);
}
if (KEY_HEX.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(KEY_HEX)) {
  console.error(
    "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: openssl rand -hex 32"
  );
  process.exit(1);
}

const KEY = Buffer.from(KEY_HEX, "hex");
const IV_LENGTH = 12; // 96-bit IV — recommended for GCM
const VERSION_TAG = "v1";
const LEGACY_TAG = "enc:";

/** Encrypt a UTF-8 string → `v1:<base64-iv>:<base64-ciphertext+authTag>`. */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([ct, tag]); // tag is the last 16 bytes
  return `${VERSION_TAG}:${iv.toString("base64")}:${blob.toString("base64")}`;
}

/**
 * Decrypt a string produced by `encrypt()`. Also accepts the legacy
 * `enc:<base64>` plain-base64 format (silent upgrade on next save).
 *
 * Returns `null` for null/empty input. Throws on tampered or unrecognised
 * input — callers should catch and treat a throw as "this is plaintext".
 */
function decrypt(encrypted) {
  if (encrypted === null || encrypted === undefined || encrypted === "") {
    return null;
  }
  if (typeof encrypted !== "string") {
    throw new Error("decrypt(): non-string input");
  }

  // Legacy `enc:<base64>` format — plain base64, no real encryption.
  if (encrypted.startsWith(LEGACY_TAG)) {
    return Buffer.from(encrypted.slice(LEGACY_TAG.length), "base64").toString("utf-8");
  }

  // New `v1:<base64-iv>:<base64-ciphertext+authTag>` format.
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

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf-8");
}

/**
 * Try to decrypt. Returns:
 *   - { ok: true, plaintext }  — value was a recognisable ciphertext
 *   - { ok: false }            — value is plaintext (or null/empty)
 *
 * null/empty values are treated as "plaintext" (i.e. "needs no encryption"),
 * so callers should also check `value === null || value === ""` and skip
 * them entirely rather than re-encrypting empty strings.
 */
function tryDecrypt(value) {
  if (value === null || value === undefined || value === "") {
    return { ok: false };
  }
  try {
    const plaintext = decrypt(value);
    return { ok: true, plaintext };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Sensitive fields on PlatformCredential. MUST match the list in
// src/lib/platform-credential-crypto.ts.
// ---------------------------------------------------------------------------
const SENSITIVE_FIELDS = [
  "clientSecret",
  "accessSecret",
  "accessToken",
  "bearerToken",
  "oauth2UserToken",
  "apiKey",
  "apiSecret",
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL (or DIRECT_URL) must be set in the environment or .env file."
    );
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    // Neon requires SSL. The connection string already has ?sslmode=require,
    // but we also enable it here explicitly to be safe across drivers.
    ssl: { rejectUnauthorized: true },
  });

  await client.connect();
  console.log("[backfill] Connected to database.");

  // Read every PlatformCredential row.
  const { rows } = await client.query(
    `SELECT id, "userId", platform,
            "clientSecret", "accessSecret", "accessToken", "bearerToken",
            "oauth2UserToken", "apiKey", "apiSecret"
       FROM "PlatformCredential"`
  );
  console.log(`[backfill] Found ${rows.length} PlatformCredential row(s).`);

  let rowsUpdated = 0;
  let fieldsEncrypted = 0;
  let fieldsAlreadyEncrypted = 0;
  let fieldsEmpty = 0;
  let errors = 0;

  for (const row of rows) {
    const updates = {};
    let needsUpdate = false;

    for (const field of SENSITIVE_FIELDS) {
      const value = row[field];

      // Skip null / empty values — nothing to encrypt.
      if (value === null || value === undefined || value === "") {
        fieldsEmpty++;
        continue;
      }

      const probe = tryDecrypt(value);

      if (probe.ok) {
        // Already a recognisable ciphertext (new v1 format OR legacy enc:
        // format). The legacy format decrypts successfully but is insecure —
        // re-encrypt with the new AES-256-GCM scheme so old rows are silently
        // upgraded when this backfill runs.
        const isLegacy = typeof value === "string" && value.startsWith(LEGACY_TAG);
        if (isLegacy) {
          // Re-encrypt the decrypted plaintext with the new scheme.
          updates[field] = encrypt(probe.plaintext);
          needsUpdate = true;
          fieldsEncrypted++;
        } else {
          fieldsAlreadyEncrypted++;
        }
        continue;
      }

      // Decryption failed → this is plaintext (pre-migration). Encrypt it.
      // `value` is guaranteed to be a non-empty string here (we filtered null
      // / empty above and tryDecrypt only fails on non-ciphertext strings).
      updates[field] = encrypt(value);
      needsUpdate = true;
      fieldsEncrypted++;
    }

    if (!needsUpdate) {
      // Row is already fully encrypted (or all-null). Nothing to do.
      continue;
    }

    try {
      const setClauses = Object.keys(updates).map(
        (_, i) => `"${Object.keys(updates)[i]}" = $${i + 1}`
      );
      const params = Object.values(updates);
      const sql = `UPDATE "PlatformCredential"
                      SET ${setClauses.join(", ")}
                    WHERE id = $${params.length + 1}`;
      await client.query(sql, [...params, row.id]);
      rowsUpdated++;
      console.log(
        `[backfill] ✓ ${row.platform}/${row.userId} — encrypted ${Object.keys(updates).length} field(s): ${Object.keys(updates).join(", ")}`
      );
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[backfill] ✗ ${row.platform}/${row.userId} — UPDATE failed: ${msg}`
      );
    }
  }

  console.log("");
  console.log("=== Backfill summary ===");
  console.log(`  Total rows scanned            : ${rows.length}`);
  console.log(`  Rows updated (re-encrypted)   : ${rowsUpdated}`);
  console.log(`  Fields encrypted (new+legacy) : ${fieldsEncrypted}`);
  console.log(`  Fields already encrypted (v1) : ${fieldsAlreadyEncrypted}`);
  console.log(`  Fields null/empty (skipped)   : ${fieldsEmpty}`);
  console.log(`  Errors                        : ${errors}`);

  await client.end();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[backfill] Fatal error:", err instanceof Error ? err.message : String(err));
  console.error(err instanceof Error ? err.stack : "");
  process.exit(1);
});
