/**
 * Symmetric encryption helpers for sensitive secrets at rest
 * (mail server / mailbox passwords, etc.).
 *
 * Uses AES-256-GCM with a 32-byte key derived from
 * `process.env.ENCRYPTION_KEY` (a 64-char hex string — generate with
 * `openssl rand -hex 32`).
 *
 * Storage format (string, safe to put in a DB column):
 *   `v1:<base64-iv>:<base64-ciphertext+authTag>`
 *
 * Backward compatibility: `decrypt()` also accepts the OLD insecure
 * `enc:<base64>` format that previous versions wrote (plain base64, no
 * real encryption). This lets us migrate existing rows without a data
 * migration script — old rows keep working and are silently upgraded
 * the next time the password is re-saved.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_HEX = process.env.ENCRYPTION_KEY;

if (!KEY_HEX) {
  throw new Error(
    "ENCRYPTION_KEY environment variable must be set. Generate one with: openssl rand -hex 32"
  );
}

// 32 bytes = 256 bits for AES-256. The env var MUST be a 64-char hex string.
if (KEY_HEX.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(KEY_HEX)) {
  throw new Error(
    "ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: openssl rand -hex 32"
  );
}

const KEY = Buffer.from(KEY_HEX, "hex");
const IV_LENGTH = 12; // 96-bit IV — recommended for GCM
const VERSION_TAG = "v1";
const LEGACY_TAG = "enc:";

/**
 * Encrypt a UTF-8 string and return a self-describing ciphertext string
 * suitable for storage in a DB column. Format:
 *   `v1:<base64-iv>:<base64-ciphertext+authTag>`
 */
export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Pack ciphertext + tag into a single blob — tag is always the last 16 bytes.
  const blob = Buffer.concat([ct, tag]);
  return `${VERSION_TAG}:${iv.toString("base64")}:${blob.toString("base64")}`;
}

/**
 * Decrypt a string produced by `encrypt()`.
 *
 * For backward compatibility, also accepts the OLD insecure
 * `enc:<base64>` format (plain base64) used by previous versions —
 * those rows will be transparently decoded until they get rewritten
 * via `encrypt()` on the next save.
 *
 * Throws if the value is tampered with (GCM auth tag mismatch) or if
 * the format is unrecognized.
 */
export function decrypt(encrypted: string): string {
  if (typeof encrypted !== "string" || encrypted.length === 0) {
    throw new Error("decrypt(): empty input");
  }

  // Legacy format: `enc:<base64>` — plain base64, no real encryption.
  // Keep working so existing rows don't break the mail sync flow.
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
