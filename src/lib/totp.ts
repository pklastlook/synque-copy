/**
 * TOTP (Time-based One-Time Password) — RFC 6238 implementation.
 *
 * Used for 2FA. We implement TOTP manually with Node.js `crypto` (no
 * external dependency — `otplib` is not installed).
 *
 * Algorithm summary:
 *   1. secret is a base32 string (RFC 4648)
 *   2. take Unix time / 30 → counter (8-byte big-endian buffer)
 *   3. HMAC-SHA1(secret, counter) → 20-byte digest
 *   4. dynamic truncation (offset = last nibble of digest) → 4-byte int
 *   5. mod 10^6 → 6-digit code (zero-padded)
 *
 * We also accept codes from the previous 30s window to absorb clock skew.
 */

import { createHmac, randomBytes } from "node:crypto";

// RFC 4648 base32 alphabet
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Encode a buffer as a base32 string (RFC 4648). */
export function base32Encode(buf: Buffer): string {
  let output = "";
  let bits = 0;
  let value = 0;
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return output;
}

/** Decode a base32 string to a buffer (RFC 4648). Tolerates lowercase + spaces. */
export function base32Decode(input: string): Buffer {
  const clean = input.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error(`Invalid base32 character: ${ch}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generate a fresh random base32 TOTP secret (160 bits = 32 base32 chars). */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20); // 160 bits — recommended length per RFC 4226
  return base32Encode(bytes);
}

/** Compute the TOTP code for a given counter value. */
function computeTotp(secretBuffer: Buffer, counter: number): string {
  // 8-byte big-endian counter buffer
  const counterBuffer = Buffer.alloc(8);
  // Write high 32 bits then low 32 bits (counter is at most 2^53 in JS)
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", secretBuffer).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  // Dynamic truncation: take 4 bytes starting at offset, mask the high bit
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = binary % 1_000_000;
  return code.toString().padStart(6, "0");
}

const STEP_SECONDS = 30;

/**
 * Verify a user-supplied 6-digit TOTP code against a base32 secret.
 *
 * Accepts the current window plus/minus 1 step (±30s) to absorb minor
 * clock drift between the user's authenticator and the server.
 *
 * Returns true if the code matches any of those 3 windows.
 */
export function verifyTotp(
  token: string,
  secretBase32: string,
  now: number = Date.now()
): boolean {
  // Strict 6-digit numeric input only — defends against weird authenticators
  // that pad with spaces or strip leading zeros.
  const normalized = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  let secretBuffer: Buffer;
  try {
    secretBuffer = base32Decode(secretBase32);
  } catch {
    return false;
  }

  const currentCounter = Math.floor(now / 1000 / STEP_SECONDS);
  // Check current, previous, and next windows (±30s)
  for (const offset of [-1, 0, 1]) {
    const candidate = computeTotp(secretBuffer, currentCounter + offset);
    // Use a constant-time-ish comparison to avoid timing attacks
    if (constantTimeEquals(normalized, candidate)) {
      return true;
    }
  }
  return false;
}

/** Constant-time string equality (defends against timing attacks). */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Build the otpauth:// URI that authenticator apps scan via QR code.
 *
 * Format: otpauth://totp/LABEL?secret=SECRET&issuer=ISSUER
 *   LABEL = "ISSUER:EMAIL" (URL-encoded)
 */
export function buildOtpAuthUri(opts: {
  secret: string;
  email: string;
  issuer?: string;
  accountName?: string;
}): string {
  const issuer = opts.issuer ?? "SYNQUE";
  // Prefer email as the account name, fall back to a generic label
  const account = opts.accountName || opts.email;
  const label = `${issuer}:${account}`;
  const params = new URLSearchParams({
    secret: opts.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
