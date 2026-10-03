import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { decrypt } from "@/lib/crypto";
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

  // Decrypt the stored config. Pre-migration rows were stored as plaintext —
  // if decrypt() throws (unrecognized format / GCM tag mismatch), fall back
  // to the raw value so legacy sessions still render their QR code.
  let configText = session.config;
  try {
    configText = decrypt(session.config);
  } catch {
    configText = session.config;
  }

  // Generate QR PNG buffer from the raw config text
  const pngBuffer = await QRCode.toBuffer(configText, {
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
