import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/webauthn/register/verify
 * Verifies the registration response and stores the credential in the DB.
 *
 * Body: { response: RegistrationResponseJSON, expectedOrigin?: string }
 *
 * The expected challenge is looked up from the server-side `WebauthnChallenge`
 * table (single-use, 5-min TTL) — it is NO LONGER read from the request body,
 * which prevented replay attacks where a client could re-submit a stale or
 * attacker-crafted challenge.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { response, expectedOrigin } = body;

  if (!response?.id) {
    return NextResponse.json({ error: "Invalid registration response" }, { status: 400 });
  }

  // Look up the stored challenge for this user (most recent unused,
  // non-expired one). We do NOT trust any challenge value sent in the body.
  const storedChallenge = await db.webauthnChallenge.findFirst({
    where: {
      userId: user!.userId,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!storedChallenge) {
    return NextResponse.json(
      { error: "Challenge expired or not found. Please restart biometric registration." },
      { status: 400 }
    );
  }

  // Mark the challenge as used IMMEDIATELY (before verification) so a
  // concurrent replay attempt cannot reuse the same row.
  await db.webauthnChallenge.update({
    where: { id: storedChallenge.id },
    data: { used: true },
  });

  const host = req.headers.get("host") || "";
  const rpID = host.split(":")[0];
  // Use the origin from the request body (sent by the client) or derive from host
  const origin = expectedOrigin || `https://${host}`;

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: storedChallenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // Store the credential
      await db.webAuthnCredential.create({
        data: {
          id: credential.id,
          userId: user!.userId,
          publicKey: Buffer.from(credential.publicKey).toString("base64url"),
          counter: credential.counter,
          transports: JSON.stringify(credential.transports || []),
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
        },
      });

      return NextResponse.json({
        verified: true,
        credentialId: credential.id,
        message: "Biometric credential registered successfully",
      });
    }

    return NextResponse.json({ verified: false, error: "Verification failed" }, { status: 400 });
  } catch (err) {
    console.error("[webauthn/register/verify] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration verification failed" },
      { status: 500 }
    );
  }
}
