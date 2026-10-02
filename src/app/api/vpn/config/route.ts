import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/** GET /api/vpn/config?sessionId=...
 * Returns the raw WireGuard .conf text as a downloadable file.
 * Content-Type: application/octet-stream → browser downloads it.
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
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

  const filename = `synque-vpn-${session.server?.countryCode?.toLowerCase() ?? "session"}.conf`;
  return new NextResponse(session.config, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
