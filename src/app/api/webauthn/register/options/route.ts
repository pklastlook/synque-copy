import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
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

  // Store the challenge temporarily (60s expiry via a simple in-memory store)
  // In production, use Redis or DB — for now we return it and verify in the next step
  return NextResponse.json({
    ...options,
    rpId: rpID,
  });
}
