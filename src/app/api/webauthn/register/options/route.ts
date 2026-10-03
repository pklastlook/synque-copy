import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// TTL for a stored WebAuthn challenge (5 minutes).
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// RP (Relying Party) config — the origin must match what the browser sees
function getRpConfig(req: NextRequest) {
  const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
  const url = new URL(origin);
  return {
    rpID: url.hostname,
    rpName: "SYNQUE",
    origin,
  };
}

/** POST /api/webauthn/register/options
 * Generates registration options for adding a new biometric credential.
 *
 * The challenge is persisted server-side (single-use, 5-min TTL) so the
 * client cannot influence the `expectedChallenge` at verify time. The
 * challenge string is still returned in the JSON response so the browser
 * can sign it with the authenticator — but the client is no longer the
 * source of truth for the expected value.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const { rpID, rpName } = getRpConfig(req);

  // Fetch existing credentials so we can exclude them
  const existingCreds = await db.webAuthnCredential.findMany({
    where: { userId: user!.userId },
    select: { id: true },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user!.email,
    userDisplayName: user!.email,
    // Don't re-register existing authenticators
    excludeCredentials: existingCreds.map((c) => ({
      id: c.id,
      type: "public-key" as const,
    })),
    authenticatorSelection: {
      // Platform authenticators = Face ID, Touch ID, Windows Hello
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  });

  // Persist the challenge server-side so the client cannot influence the
  // expected value at verify time. Single-use; expires in 5 minutes.
  const now = Date.now();
  await db.webauthnChallenge.create({
    data: {
      userId: user!.userId,
      challenge: options.challenge,
      used: false,
      createdAt: new Date(now),
      expiresAt: new Date(now + CHALLENGE_TTL_MS),
    },
  });

  return NextResponse.json({
    ...options,
    rpId: rpID,
  });
}
