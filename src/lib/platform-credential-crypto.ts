/**
 * Encryption / decryption helpers for the `PlatformCredential` model.
 *
 * Sensitive fields (`clientSecret`, `accessSecret`, `accessToken`,
 * `bearerToken`, `oauth2UserToken`, `apiKey`, `apiSecret`, `refreshToken`)
 * are stored as AES-256-GCM ciphertexts at rest (format `v1:<iv>:<ct+tag>`,
 * see `src/lib/crypto.ts`).
 *
 * Read path: callers must `decryptPlatformCredential(cred)` before using any
 * sensitive field, otherwise they will be working with the ciphertext blob.
 * Pre-migration plaintext rows are handled gracefully — if `decrypt()` throws
 * (value isn't a recognisable ciphertext), the raw value is returned so the
 * app keeps working until the next save encrypts it.
 *
 * Write path: callers must `encryptPlatformCredentialWrite(data)` (or use the
 * field-level `encryptIfPresent`) before passing to Prisma's `create` / `update`
 * / `upsert`, otherwise plaintext would be persisted.
 */

import { encrypt, decrypt } from "@/lib/crypto";

/**
 * The full set of sensitive fields on `PlatformCredential` that are stored
 * encrypted at rest. Listed explicitly so this file is the single source of
 * truth — if a new sensitive field is added to the schema, add it here too.
 */
export const SENSITIVE_PLATFORM_CRED_FIELDS = [
  "clientSecret",
  "accessSecret",
  "accessToken",
  "bearerToken",
  "oauth2UserToken",
  "apiKey",
  "apiSecret",
  "refreshToken",
] as const;

type SensitiveField = (typeof SENSITIVE_PLATFORM_CRED_FIELDS)[number];

/**
 * Loose row shape accepted by `decryptPlatformCredential`. Any object that has
 * some of the sensitive fields as `string | null` is accepted — the rest of
 * the row is passed through untouched.
 */
export type PlatformCredentialRow = {
  [K in SensitiveField]?: string | null;
} & { [k: string]: unknown };

/**
 * Decrypt a single sensitive field.
 *
 * - `null` / `undefined` → `null` (no value to decrypt).
 * - Recognisable ciphertext (`v1:` or legacy `enc:` prefix) → plaintext.
 * - Unrecognised value (pre-migration plaintext) → returned AS-IS so the app
 *   keeps working; the next save will encrypt it (see `encryptIfPresent`).
 */
export function decryptField(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return value ?? null;
  try {
    return decrypt(value);
  } catch {
    // Pre-migration plaintext — return as-is. The next write will encrypt it.
    return value;
  }
}

/**
 * Encrypt a single sensitive field for storage.
 *
 * - `null` / `undefined` → `null` (so callers can still "clear" a field by
 *   sending `null`).
 * - empty string `""` → `null` (empty plaintext cannot round-trip through
 *   AES-256-GCM because the ciphertext+tag blob is shorter than the 17-byte
 *   minimum the `decrypt()` helper enforces — so we coerce to `null`).
 * - non-empty string → AES-256-GCM ciphertext (`v1:<iv>:<ct+tag>`).
 */
export function encryptIfPresent(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value === "") return null;
  return encrypt(value);
}

/**
 * Return a NEW object with all sensitive PlatformCredential fields decrypted.
 * The input object is NOT mutated. Non-sensitive fields are passed through
 * untouched. Sensitive fields that are absent from the row (`undefined`)
 * remain `undefined`; `null` stays `null`; ciphertexts become plaintext.
 *
 * Pre-migration plaintext values are returned as-is (see `decryptField`).
 */
export function decryptPlatformCredential<T extends PlatformCredentialRow>(cred: T): T {
  const out: T = { ...cred };
  for (const f of SENSITIVE_PLATFORM_CRED_FIELDS) {
    const v = cred[f];
    if (v === undefined) continue; // field not on the row — leave undefined
    (out as Record<string, unknown>)[f] = decryptField(v);
  }
  return out;
}

/**
 * Return a NEW write-payload object with all sensitive fields encrypted.
 * The input object is NOT mutated.
 *
 * - For each sensitive field present on `data`:
 *   - `null`         → stored as `null` (caller is clearing the field).
 *   - `""`           → stored as `null` (empty plaintext cannot round-trip).
 *   - non-empty str  → stored as AES-256-GCM ciphertext.
 *   - `undefined`    → left as `undefined` (Prisma will not update the column).
 * - Non-sensitive fields are passed through untouched.
 */
export function encryptPlatformCredentialWrite<T extends Record<string, unknown>>(data: T): T {
  const out: T = { ...data };
  for (const f of SENSITIVE_PLATFORM_CRED_FIELDS) {
    if (!(f in data)) continue; // caller did not intend to update this field
    const v = data[f];
    if (v === undefined) {
      // leave undefined — Prisma skips undefined fields on update
      continue;
    }
    (out as Record<string, unknown>)[f] = encryptIfPresent(v as string | null | undefined);
  }
  return out;
}
