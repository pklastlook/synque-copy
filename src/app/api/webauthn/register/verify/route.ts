import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/webauthn/register/verify
 * Verifies the registration response and stores the credential in the DB.
 * Body: { response: RegistrationResponseJSON, expectedChallenge: string, expectedOrigin?: string }
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { response, expectedOrigin } = body;

  if (!response?.id) {
    return NextResponse.json({ error: "Invalid registration response" }, { status: 400 });
  }

  const host = req.headers.get("host") || "";
  const rpID = host.split(":")[0];
  // Use the origin from the request body (sent by the client) or derive from host
  const origin = expectedOrigin || `https://${host}`;

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: body.expectedChallenge || "",
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
