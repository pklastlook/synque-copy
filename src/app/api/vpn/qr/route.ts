import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/**
 * GET /api/vpn/qr?sessionId=...
 * Renders the WireGuard config as a QR code (PNG) for mobile import.
 * The official WireGuard iOS/Android apps can scan this QR to import the
 * tunnel directly.
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth.user!;

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const session = sessionId
    ? await db.vPNSession.findUnique({ where: { id: sessionId } })
    : await db.vPNSession.findFirst({
        where: { userId, status: "active" },
        orderBy: { createdAt: "desc" },
      });

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Generate QR PNG buffer from the raw config text
  const pngBuffer = await QRCode.toBuffer(session.config, {
    type: "png",
    margin: 2,
    width: 480,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });

  return new NextResponse(pngBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
