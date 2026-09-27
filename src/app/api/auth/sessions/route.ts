import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getRawToken } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/sessions
 *
 * Lists all active sessions for the current user, newest first, plus a
 * `currentSessionId` so the UI can mark "this device".
 *
 * Active = revokedAt is null AND expiresAt is in the future.
 *
 * Requires authentication.
 */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const now = new Date();
    const sessions = await db.session.findMany({
      where: {
        userId: auth.user!.userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
        token: true, // needed to identify the current session
      },
    });

    const currentToken = getRawToken(req);

    // Map to public shape — never expose the raw token to the client.
    const publicSessions = sessions.map((s) => {
      const isCurrent = currentToken === s.token;
      // Parse a friendly device label from the UA string for the UI.
      const device = parseUserAgent(s.userAgent);
      return {
        id: s.id,
        current: isCurrent,
        userAgent: s.userAgent,
        device,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        lastActive: s.createdAt, // sessions don't have a separate lastActive column yet
      };
    });

    return NextResponse.json({ sessions: publicSessions });
  } catch (e) {
    console.error("[sessions/list] error:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

/**
 * Parse a friendly { device, browser, os } object from a raw User-Agent
 * string. Returns "Unknown" for each if parsing fails.
 *
 * This is intentionally minimal — full UA parsing requires a library
 * (ua-parser-js), but a best-effort label is enough for the UI.
 */
function parseUserAgent(ua: string | null): { device: string; browser: string; os: string } {
  if (!ua) return { device: "Unknown", browser: "Unknown", os: "Unknown" };

  let os = "Unknown";
  if (/Windows NT 10/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "Unknown";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  let device = "Desktop";
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(ua)) {
    device = /iPad|Tablet/i.test(ua) ? "Tablet" : "Mobile";
  }

  return { device, browser, os };
}
