/**
 * Signed OAuth state parameter helpers.
 *
 * OAuth 2.0 `state` is meant to bind the callback to the user that initiated
 * the flow, preventing CSRF attacks. An unsigned (just-base64url) state can
 * be forged by an attacker, so we sign it with HMAC-SHA256 using JWT_SECRET.
 *
 * Wire format:  `<base64url(payload)>.<base64url(hmac-sha256(payload_b64, SECRET))>`
 *
 * - `signOAuthState(payload)` returns the signed token to put in the state query param.
 * - `verifyOAuthState(state)` returns the decoded payload if the HMAC matches,
 *    or `null` if the state is tampered with / malformed.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET_RAW = process.env.JWT_SECRET;
if (!SECRET_RAW) {
  throw new Error(
    "JWT_SECRET environment variable must be set. Generate one with: openssl rand -hex 32"
  );
}
// Assert non-null after the runtime check above — TypeScript strict mode
// (P3-9: ignoreBuildErrors=false) does not carry this narrowing across module
// boundaries to the createHmac call site below.
const SECRET: string = SECRET_RAW;

export interface OAuthStatePayload {
  userId: string;
  platform: string;
  /** Optional PKCE code_verifier (Twitter / TikTok). */
  cv?: string;
}

/** base64url-encode a string without padding. */
function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

/** Compute HMAC-SHA256(secret, message) and return as base64url. */
function hmac(message: string): string {
  return createHmac("sha256", SECRET).update(message).digest("base64url");
}

/**
 * Sign an OAuth state payload.
 *
 * Returns `<base64url(JSON(payload))>.<base64url(hmac(payload_b64, JWT_SECRET))>`.
 */
export function signOAuthState(payload: OAuthStatePayload): string {
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${hmac(payloadB64)}`;
}

/**
 * Verify a signed OAuth state and return the decoded payload.
 *
 * Returns `null` if the state is malformed, the HMAC doesn't match, or the
 * payload isn't valid JSON with the expected shape.
 */
export function verifyOAuthState(state: string): OAuthStatePayload | null {
  // Expected format: "<b64url-payload>.<b64url-hmac>" — exactly one '.' separator.
  const parts = state.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  const [payloadB64, signature] = parts;
  const expected = hmac(payloadB64);

  // constant-time compare (lengths must match first; otherwise timingSafeEqual throws)
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return null;
  }
  if (!timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (
      decoded &&
      typeof decoded === "object" &&
      typeof decoded.userId === "string" &&
      typeof decoded.platform === "string"
    ) {
      return {
        userId: decoded.userId,
        platform: decoded.platform,
        cv: typeof decoded.cv === "string" ? decoded.cv : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
