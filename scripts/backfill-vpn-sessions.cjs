/**
 * Backfill: encrypt VPNSession.privateKey + VPNSession.config at rest.
 *
 * SECURITY-DATA Finding 8 — these two columns were previously stored as
 * plaintext. After P2-2-d, new sessions are encrypted with AES-256-GCM via
 * `src/lib/crypto.ts`. This script migrates any pre-existing rows: for each
 * VPNSession, it tries to `decrypt()` the value; if decrypt fails (i.e. the
 * stored value is still plaintext or in a legacy format), it re-encrypts the
 * value and persists it.
 *
 * Idempotent: rows that are already encrypted (decrypt succeeds) are left
 * alone. Safe to re-run.
 *
 * Usage:
 *   node scripts/backfill-vpn-sessions.cjs
 *
 * Env (read from .env automatically):
 *   - DATABASE_URL or DIRECT_URL   (Neon postgres connection string)
 *   - ENCRYPTION_KEY               (64-char hex — same as the app uses)
 */

"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");
const path = require("path");
const crypto = require("node:crypto");
const { neon } = require("@neondatabase/serverless");

// ---------------------------------------------------------------------------
// .env loader — minimal, just enough to read DATABASE_URL + ENCRYPTION_KEY.
// (We don't pull in `dotenv` to keep this script dependency-light; if it's
// already loaded by the runtime, the manual parse below is a harmless no-op.)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ---------------------------------------------------------------------------
// Encrypt / decrypt — must EXACTLY match src/lib/crypto.ts (same format, same
// key derivation, same GCM tag packing). Inlined here so the cjs script does
// not depend on TypeScript compilation.
// Format: `v1:<base64-iv>:<base64-ciphertext+authTag>`
// ---------------------------------------------------------------------------
const IV_LENGTH = 12;
const VERSION_TAG = "v1";
const LEGACY_TAG = "enc:";

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

function encrypt(text) {
  const KEY = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([ct, tag]);
  return `${VERSION_TAG}:${iv.toString("base64")}:${blob.toString("base64")}`;
}

function decrypt(encrypted) {
  if (typeof encrypted !== "string" || encrypted.length === 0) {
    throw new Error("decrypt(): empty input");
  }
  // Legacy `enc:<base64>` format (plain base64, no real encryption).
  if (encrypted.startsWith(LEGACY_TAG)) {
    return Buffer.from(encrypted.slice(LEGACY_TAG.length), "base64").toString("utf-8");
  }
  if (!encrypted.startsWith(`${VERSION_TAG}:`)) {
    throw new Error("decrypt(): unrecognized ciphertext format");
  }
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("decrypt(): malformed ciphertext (expected 3 parts)");
  }
  const KEY = getKey();
  const iv = Buffer.from(parts[1], "base64");
  const blob = Buffer.from(parts[2], "base64");
  if (blob.length < 17) {
    throw new Error("decrypt(): ciphertext too short");
  }
  const tag = blob.subarray(blob.length - 16);
  const ct = blob.subarray(0, blob.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf-8");
}

function isLikelyEncrypted(value) {
  if (!value) return false;
  return value.startsWith(`${VERSION_TAG}:`) || value.startsWith(LEGACY_TAG);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const connStr =
    process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connStr || !connStr.startsWith("postgresql://")) {
    throw new Error(
      "No Neon DATABASE_URL / DIRECT_URL set — cannot connect. (PGlite is not supported by this backfill script; run against Neon.)"
    );
  }

  const sql = neon(connStr);

  // Prisma's default table name is the model name verbatim ("VPNSession"),
  // and Postgres folds unquoted identifiers to lowercase — so the table is
  // created with a quoted, case-sensitive "VPNSession". Always quote it.
  const rows = await sql`
    SELECT id, "privateKey", config FROM "VPNSession"
  `;
  console.log(`[backfill] Found ${rows.length} VPNSession row(s).`);

  let encryptedPk = 0;
  let encryptedCfg = 0;
  let skipped = 0;

  for (const row of rows) {
    let pkChanged = false;
    let cfgChanged = false;
    let newPk = row.privateKey;
    let newCfg = row.config;

    // --- privateKey ---
    if (row.privateKey) {
      if (isLikelyEncrypted(row.privateKey)) {
        // Verify it actually decrypts — a tampered or wrongly-tagged value
        // should not be silently re-encrypted over.
        try {
          decrypt(row.privateKey);
        } catch (e) {
          console.warn(
            `  [warn] row ${row.id}: privateKey looks encrypted but failed to decrypt (${e.message}). Re-encrypting raw value.`
          );
          newPk = encrypt(row.privateKey);
          pkChanged = true;
        }
      } else {
        // Plaintext — encrypt in place.
        newPk = encrypt(row.privateKey);
        pkChanged = true;
      }
    }

    // --- config ---
    if (row.config) {
      if (isLikelyEncrypted(row.config)) {
        try {
          decrypt(row.config);
        } catch (e) {
          console.warn(
            `  [warn] row ${row.id}: config looks encrypted but failed to decrypt (${e.message}). Re-encrypting raw value.`
          );
          newCfg = encrypt(row.config);
          cfgChanged = true;
        }
      } else {
        newCfg = encrypt(row.config);
        cfgChanged = true;
      }
    }

    if (!pkChanged && !cfgChanged) {
      skipped++;
      continue;
    }

    await sql`
      UPDATE "VPNSession"
      SET "privateKey" = ${newPk}, config = ${newCfg}
      WHERE id = ${row.id}
    `;
    if (pkChanged) encryptedPk++;
    if (cfgChanged) encryptedCfg++;
    console.log(
      `  ✓ row ${row.id}: ${pkChanged ? "privateKey " : ""}${cfgChanged ? "config" : ""} encrypted`
    );
  }

  console.log(
    `\n[backfill] Done. Encrypted ${encryptedPk} privateKey(s), ${encryptedCfg} config(s); ${skipped} row(s) already encrypted — skipped.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("[backfill] FATAL:", e);
    process.exit(1);
  });
