import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/check?platform=facebook
 *
 * Checks if the calling user has configured OAuth App credentials for the
 * given platform. Used by the connect dialog to decide: OAuth redirect or
 * manual entry.
 *
 * Auth required. The userId is ALWAYS the authenticated caller — the
 * `userId` query param is ignored (binding it to the caller prevents
 * an attacker from probing whether another user/tenant has configured
 * their OAuth app).
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const platform = req.nextUrl.searchParams.get("platform");

  if (!platform) {
    return NextResponse.json({ error: "platform required" }, { status: 400 });
  }

  // Bind userId to the caller — never trust the query string.
  const userId = user.userId;

  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  return NextResponse.json({
    configured: !!(cred?.clientId && cred?.clientSecret),
    platform,
  });
}
