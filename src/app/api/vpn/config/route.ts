import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { decrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

/** GET /api/vpn/config?sessionId=...
 * Returns the raw WireGuard .conf text as a downloadable file.
 * Content-Type: application/octet-stream → browser downloads it.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { userId } = auth.user!;

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const session = sessionId
    ? await db.vPNSession.findUnique({ where: { id: sessionId }, include: { server: true } })
    : await db.vPNSession.findFirst({
        where: { userId, status: "active" },
        include: { server: true },
        orderBy: { createdAt: "desc" },
      });

  if (!session || session.userId !== userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Decrypt the stored config. Pre-migration rows were stored as plaintext —
  // if decrypt() throws (unrecognized format / GCM tag mismatch), fall back
  // to the raw value so legacy sessions still download a valid .conf file.
  let configText = session.config;
  try {
    configText = decrypt(session.config);
  } catch {
    configText = session.config;
  }

  const filename = `synque-vpn-${session.server?.countryCode?.toLowerCase() ?? "session"}.conf`;
  return new NextResponse(configText, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
