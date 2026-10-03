import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { issueSession, setAuthCookie } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/** POST /api/webauthn/authenticate/verify
 * Verifies the authentication response and issues a session JWT.
 *
 * Body: { response: AuthenticatorAssertionResponseJSON, email?: string }
 *
 * The expected challenge is looked up from the server-side
 * `WebauthnChallenge` table (single-use, 5-min TTL) — it is NO LONGER read
 * from the request body. We first resolve the credential (and thus the
 * user), then look up the most-recent unused challenge for that user (or,
 * for discoverable-login flows, the most-recent unused challenge whose
 * `userId` is null).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { response: authResponse, email } = body;

  if (!authResponse?.id) {
    return NextResponse.json({ error: "Invalid authentication response" }, { status: 400 });
  }

  // Find the credential by ID — search ALL credentials (not just one user's)
  // because the browser may return any registered passkey on the device
  const credential = await db.webAuthnCredential.findFirst({
    where: { id: authResponse.id },
    include: { user: { select: { id: true, name: true, email: true, role: true, title: true, department: true, avatar: true, bio: true, timezone: true, language: true, customerId: true, emailVerified: true, twoFactorEnabled: true } } },
  });

  if (!credential) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  // If email was provided, verify it matches
  if (email && credential.user.email !== email) {
    return NextResponse.json({ error: "Credential does not match this email" }, { status: 403 });
  }

  // Look up the stored challenge for this user. Two scenarios:
  //   (a) the options endpoint was called WITH an email → challenge.userId
  //       matches the credential's user id.
  //   (b) the options endpoint was called WITHOUT an email (discoverable
  //       passkey login) → challenge.userId is null.
  // We query both: prefer a row whose userId matches the credential owner;
  // fall back to any unused, non-expired row with userId = null.
  // Order by createdAt desc so the most recent (most-likely-intended)
  // challenge wins.
  const now = new Date();
  const storedChallenge =
    (await db.webauthnChallenge.findFirst({
      where: {
        userId: credential.userId,
        used: false,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    })) ||
    (await db.webauthnChallenge.findFirst({
      where: {
        userId: null,
        used: false,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    }));

  if (!storedChallenge) {
    return NextResponse.json(
      { error: "Challenge expired or not found. Please restart biometric authentication." },
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
  const expectedOrigin = body.expectedOrigin || `https://${host}`;

  try {
    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: storedChallenge.challenge,
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
