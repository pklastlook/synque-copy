import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// TTL for a stored WebAuthn challenge (5 minutes).
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** POST /api/webauthn/authenticate/options
 * Generates authentication options for signing in with Face ID / fingerprint.
 *
 * Body: { email?: string } — if email is provided, looks up that user's credentials.
 * If no email, returns ALL registered credentials (for discoverable/passkey login).
 *
 * The challenge is persisted server-side (single-use, 5-min TTL) so the
 * client cannot influence the `expectedChallenge` at verify time. `userId`
 * is null on the stored row when the caller has not identified themselves
 * (passkey discoverable login); otherwise it is the looked-up user's id.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = body.email?.trim();
  const rpID = (req.headers.get("host") || "").split(":")[0];

  // Helper: persist the generated challenge server-side, return JSON as before.
  const buildOptions = async (
    optionsAwaited: Awaited<ReturnType<typeof generateAuthenticationOptions>>,
    userId: string | null
  ) => {
    const now = Date.now();
    await db.webauthnChallenge.create({
      data: {
        userId,
        challenge: optionsAwaited.challenge,
        used: false,
        createdAt: new Date(now),
        expiresAt: new Date(now + CHALLENGE_TTL_MS),
      },
    });
    return NextResponse.json(optionsAwaited);
  };

  if (!email) {
    // No email provided — return ALL registered credentials across all users.
    // This allows the browser to find any matching passkey on the device.
    const allCredentials = await db.webAuthnCredential.findMany({
      select: { id: true, transports: true },
    });

    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: allCredentials.map((c) => ({
        id: c.id,
        type: "public-key" as const,
        transports: (() => {
          try { return JSON.parse(c.transports || "[]"); } catch { return []; }
        })(),
      })),
    });
    // userId unknown — store with null so verify can match by it.
    return buildOptions(options, null);
  }

  // Find the user by email
  const userRecord = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!userRecord) {
    // Don't reveal whether the email exists — return empty options
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: [],
    });
    return buildOptions(options, null);
  }

  // Fetch the user's registered credentials
  const credentials = await db.webAuthnCredential.findMany({
    where: { userId: userRecord.id },
    select: { id: true, transports: true },
  });

  if (credentials.length === 0) {
    return NextResponse.json(
      { error: "No biometric credentials registered. Please sign in with your password first, then enable Face ID in Settings." },
      { status: 404 }
    );
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: credentials.map((c) => ({
      id: c.id,
      type: "public-key" as const,
      transports: (() => {
        try { return JSON.parse(c.transports || "[]"); } catch { return []; }
      })(),
    })),
  });

  return buildOptions(options, userRecord.id);
}
