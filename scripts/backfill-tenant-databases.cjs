/**
 * One-time backfill: encrypt plaintext `dbUrl` values in `TenantDatabase` rows.
 *
 * Background — see `worklog.md` Task ID `SECURITY-DATA` Finding 3:
 *   Until P2-2-c, `TenantDatabase.dbUrl` was stored as a plaintext Neon
 *   connection string (`postgresql://user:pass@host/db?sslmode=require`).
 *   `src/app/api/customers/route.ts` now encrypts on write and
 *   `src/lib/tenant-db.ts` decrypts lazily before opening the PrismaClient —
 *   but rows written before the fix are still plaintext on disk.
 *
 * What this script does:
 *   - Reads every TenantDatabase row.
 *   - Tries to `decrypt()` each row's `dbUrl`.
 *   - If `decrypt()` succeeds → the value is already encrypted (v1: or enc:
 *     format), nothing to do.
 *   - If `decrypt()` throws `unrecognized ciphertext format` → the value is
 *     plaintext (a raw `postgresql://...` string). Re-encrypt it and UPDATE.
 *   - If `decrypt()` throws anything else (GCM auth-tag mismatch / malformed
 *     ciphertext) → the value is corrupted or tampered; DO NOT overwrite.
 *     Surface the error so a human can investigate before rotating the
 *     tenant's Neon password.
 *
 * Run with:
 *   bun run scripts/backfill-tenant-databases.cjs
 *
 * Prereqs:
 *   - `ENCRYPTION_KEY` env var must be set (same one used by the app).
 *   - `DATABASE_URL` (or `DIRECT_URL`) must point at the main Neon DB
 *     where `TenantDatabase` rows live.
 *
 * Safety:
 *   - Dry-run-friendly: prints what it would change. Performs updates one
 *     row at a time inside a per-row try/catch so a single failure doesn't
 *     abort the whole run.
 *   - Idempotent: re-running on an already-encrypted DB is a no-op.
 *   - Does NOT rotate the Neon password. If you suspect the plaintext value
 *     was leaked (e.g. via a DB backup), rotate the password in Neon first,
 *     update the row to the new connection string, THEN run this script.
 *
 * NOTE: never run this in production without a fresh DB backup.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS backfill script must use require() */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("node:crypto");
const { neon } = require("@neondatabase/serverless");

// ---------------------------------------------------------------------------
// .env loader — same minimal pattern as scripts/backfill-vpn-sessions.cjs.
// We don't pull in `dotenv` to keep this script dependency-light; if the
// runtime has already loaded .env, the manual parse below is a harmless no-op.
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
// Encrypt / decrypt — MUST EXACTLY match src/lib/crypto.ts (same format, same
// key derivation, same GCM tag packing). Inlined here so the .cjs script does
// not depend on TypeScript compilation. Format: `v1:<base64-iv>:<base64-ciphertext+authTag>`.
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
 * Distinguish "this is plaintext" failures (which we can safely fix) from
 * "this is corrupted ciphertext" failures (which need a human).
 *
 * crypto.ts `decrypt()` throws `unrecognized ciphertext format` for anything
 * that doesn't start with `v1:` or `enc:`. That's our plaintext signal.
 */
function isPlaintextError(err) {
  const msg = err && err.message ? err.message : String(err);
  return msg.includes("unrecognized ciphertext format");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const connStr = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connStr || !connStr.startsWith("postgresql://")) {
    throw new Error(
      "No Neon DATABASE_URL / DIRECT_URL set — cannot connect. " +
        "(PGlite is not supported by this backfill script; run against Neon.)"
    );
  }
  const sql = neon(connStr);

  // Prisma's default table name is the model name verbatim ("TenantDatabase"),
  // and Postgres folds unquoted identifiers to lowercase — so the table is
  // created with a quoted, case-sensitive "TenantDatabase". Always quote it.
  const rows = await sql`
    SELECT id, "dbName", "dbUrl" FROM "TenantDatabase"
    ORDER BY "createdAt" ASC
  `;
  console.log(`[backfill] Found ${rows.length} TenantDatabase row(s).`);

  let alreadyEncrypted = 0;
  let newlyEncrypted = 0;
  let plaintextFailed = 0;
  let suspicious = 0;
  let empty = 0;

  for (const row of rows) {
    const tag = `row ${row.id} (${row.dbName})`;

    if (!row.dbUrl) {
      console.log(`  → ${tag}: empty dbUrl, skipping.`);
      empty++;
      continue;
    }

    // Try to decrypt. Three outcomes:
    //   1. succeeds            → already encrypted, no-op
    //   2. throws "unrecognized ciphertext format" → plaintext, encrypt it
    //   3. throws anything else → suspicious, surface and DO NOT overwrite
    let decrypted;
    try {
      decrypted = decrypt(row.dbUrl);
    } catch (err) {
      if (isPlaintextError(err)) {
        // Plaintext connection string — encrypt it now.
        try {
          const ciphertext = encrypt(row.dbUrl);
          // Round-trip sanity check before we persist.
          const roundtrip = decrypt(ciphertext);
          if (roundtrip !== row.dbUrl) {
            throw new Error("round-trip mismatch — refusing to persist");
          }
          await sql`
            UPDATE "TenantDatabase"
            SET "dbUrl" = ${ciphertext}
            WHERE id = ${row.id}
          `;
          console.log(
            `  + ${tag}: encrypted (plaintext len=${row.dbUrl.length} → ciphertext len=${ciphertext.length}).`
          );
          newlyEncrypted++;
        } catch (encErr) {
          console.error(
            `  x ${tag}: FAILED to encrypt — ${encErr && encErr.message ? encErr.message : String(encErr)}`
          );
          plaintextFailed++;
        }
        continue;
      }
      // Suspicious: looks like ciphertext (starts with v1: or enc:) but
      // decryption failed — possible corruption / tamper / wrong key.
      console.error(
        `  ! ${tag}: ciphertext present but decryption failed — ${err && err.message ? err.message : String(err)}. ` +
          `Leaving row untouched. Investigate manually (possible key mismatch or tamper).`
      );
      suspicious++;
      continue;
    }

    // Decryption succeeded — already encrypted. Sanity-check it looks like
    // a connection string, just for nicer logging.
    const preview = decrypted.startsWith("postgresql://") ? "postgresql://…" : "(unexpected format)";
    console.log(`  = ${tag}: already encrypted (${preview}). Skipping.`);
    alreadyEncrypted++;
  }

  console.log(
    `\n[backfill] Done.\n` +
      `  already encrypted:  ${alreadyEncrypted}\n` +
      `  newly encrypted:    ${newlyEncrypted}\n` +
      `  empty (skipped):    ${empty}\n` +
      `  suspicious (left):  ${suspicious}\n` +
      `  failed to encrypt:  ${plaintextFailed}`
  );

  if (suspicious > 0 || plaintextFailed > 0) {
    process.exitCode = 2; // non-zero but distinct from a hard crash
  }
}

main().catch((err) => {
  console.error("[backfill] Fatal error:", err);
  process.exit(1);
});

