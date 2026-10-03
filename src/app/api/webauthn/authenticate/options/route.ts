import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** POST /api/webauthn/authenticate/options
 * Generates authentication options for signing in with Face ID / fingerprint.
 * Body: { email?: string } — if email is provided, looks up that user's credentials.
 * If no email, returns ALL registered credentials (for discoverable/passkey login).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = body.email?.trim();
  const rpID = (req.headers.get("host") || "").split(":")[0];

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
    return NextResponse.json(options);
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
    return NextResponse.json(options);
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

  return NextResponse.json(options);
}
