/**
 * Short-lived "temp token" for the 2FA login flow.
 *
 * When a user with 2FA enabled logs in, instead of returning a full JWT
 * we return a signed tempToken that encodes their userId. The frontend then
 * POSTs the tempToken + TOTP code to /api/auth/2fa/login to complete the
 * login and get a real session JWT.
 *
 * Temp tokens expire after 5 minutes.
 */

import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET environment variable must be set. Generate one with: openssl rand -hex 32");
}
const TEMP_TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes

const TEMP_TOKEN_TYPE = "2fa-pending";

export function sign2faTempToken(userId: string): string {
  return jwt.sign(
    { type: TEMP_TOKEN_TYPE, userId },
    SECRET,
    { expiresIn: TEMP_TOKEN_TTL_SECONDS }
  );
}

/**
 * Verify a 2FA temp token. Returns the userId, or null if invalid/expired
 * or if the token is not a 2FA temp token (defends against JWT reuse).
 */
export function verify2faTempToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, SECRET) as { type?: string; userId?: string };
    if (decoded.type !== TEMP_TOKEN_TYPE || !decoded.userId) {
      return null;
    }
    return decoded.userId;
  } catch {
    return null;
  }
}
