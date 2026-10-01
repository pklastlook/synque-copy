import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/** GET /api/vpn/session — current user's active VPN session (if any) */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth.user!;

  const session = await db.vPNSession.findFirst({
    where: { userId, status: "active" },
    include: { server: true },
    orderBy: { createdAt: "desc" },
  });

  if (!session) {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      connectedAt: session.connectedAt?.toISOString() ?? null,
      lastVerifiedIp: session.lastVerifiedIp,
      lastVerifiedAt: session.lastVerifiedAt?.toISOString() ?? null,
      clientAddress: session.clientAddress,
      publicKey: session.publicKey,
      createdAt: session.createdAt.toISOString(),
      server: session.server
        ? {
            id: session.server.id,
            countryCode: session.server.countryCode,
            countryName: session.server.countryName,
            city: session.server.city,
            flag: session.server.flag,
            endpoint: session.server.endpoint,
            ping: session.server.ping,
          }
        : null,
      // NEVER expose the private key in this endpoint (it's shown only at
      // creation time + in the downloadable .conf).
      hasPrivateKey: Boolean(session.privateKey),
    },
  });
}
