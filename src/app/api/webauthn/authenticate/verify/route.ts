import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { issueSession, setAuthCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/** POST /api/webauthn/authenticate/verify
 * Verifies the authentication response and issues a session JWT.
 * Body: { response: AuthenticatorAssertionResponseJSON, email?: string }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { response: authResponse, email } = body;

  if (!authResponse?.id) {
    return NextResponse.json({ error: "Invalid authentication response" }, { status: 400 });
  }

  // Find the credential by ID
  const credential = await db.webAuthnCredential.findUnique({
    where: { id: authResponse.id },
    include: { user: { select: { id: true, name: true, email: true, role: true, customerId: true } } },
  });

  if (!credential) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  // If email was provided, verify it matches
  if (email && credential.user.email !== email) {
    return NextResponse.json({ error: "Credential does not match this email" }, { status: 403 });
  }

  const host = req.headers.get("host") || "";
  const rpID = host.split(":")[0];
  const expectedOrigin = `https://${host}`;

  try {
    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: authResponse.response?.challenge || "",
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64url")),
        counter: credential.counter,
        transports: (() => {
          try { return JSON.parse(credential.transports || "[]"); } catch { return []; }
        })(),
      },
      requireUserVerification: false,
    });

    if (verification.verified) {
      // Update the credential counter
      await db.webAuthnCredential.update({
        where: { id: credential.id },
        data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
      });

      // Issue a session JWT (same as password login)
      const { token, userPublic } = await issueSession({
        user: credential.user as any,
        req,
      });

      const response = NextResponse.json({ verified: true, token, user: userPublic });
      setAuthCookie(response, token);
      return response;
    }

    return NextResponse.json({ verified: false, error: "Authentication failed" }, { status: 401 });
  } catch (err) {
    console.error("[webauthn/authenticate/verify] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Authentication verification failed" },
      { status: 500 }
    );
  }
}
