import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/check?platform=facebook&userId=xxx
 *
 * Checks if the platform owner has configured OAuth App credentials.
 * Used by the connect dialog to decide: OAuth redirect or manual entry.
 */
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  const userId = req.nextUrl.searchParams.get("userId");

  if (!platform || !userId) {
    return NextResponse.json({ error: "platform and userId required" }, { status: 400 });
  }

  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  return NextResponse.json({
    configured: !!(cred?.clientId && cred?.clientSecret),
    platform,
  });
}
