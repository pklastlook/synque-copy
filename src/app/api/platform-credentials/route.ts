import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/platform-credentials?userId=xxx — list all platform credentials for a user */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const creds = await db.platformCredential.findMany({ where: { userId } });
  return NextResponse.json(
    creds.map((c) => ({
      id: c.id,
      platform: c.platform,
      connected: c.connected,
      apiKey: c.apiKey ? c.apiKey.slice(0, 4) + "••••" + c.apiKey.slice(-4) : null,
      accessToken: c.accessToken ? "••••" + c.accessToken.slice(-4) : null,
      bearerToken: c.bearerToken ? "••••" + c.bearerToken.slice(-4) : null,
      pageId: c.pageId,
      profileId: c.profileId,
      hasApiSecret: !!c.apiSecret,
      hasAccessSecret: !!c.accessSecret,
      updatedAt: c.updatedAt.toISOString(),
    }))
  );
}

/** PUT /api/platform-credentials — save or update platform credentials */
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { userId, platform, apiKey, apiSecret, accessToken, accessSecret, bearerToken, pageId, profileId } = body as {
    userId: string;
    platform: string;
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    accessSecret?: string;
    bearerToken?: string;
    pageId?: string;
    profileId?: string;
  };

  if (!userId || !platform) {
    return NextResponse.json({ error: "userId and platform required" }, { status: 400 });
  }

  const data: Record<string, unknown> = { connected: true };
  if (apiKey !== undefined) data.apiKey = apiKey;
  if (apiSecret !== undefined) data.apiSecret = apiSecret;
  if (accessToken !== undefined) data.accessToken = accessToken;
  if (accessSecret !== undefined) data.accessSecret = accessSecret;
  if (bearerToken !== undefined) data.bearerToken = bearerToken;
  if (pageId !== undefined) data.pageId = pageId;
  if (profileId !== undefined) data.profileId = profileId;

  const cred = await db.platformCredential.upsert({
    where: { userId_platform: { userId, platform } },
    create: { userId, platform, ...data },
    update: data,
  });

  return NextResponse.json({ id: cred.id, ok: true });
}

/** DELETE /api/platform-credentials?userId=xxx&platform=yyy — remove credentials */
export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const platform = req.nextUrl.searchParams.get("platform");
  if (!userId || !platform) {
    return NextResponse.json({ error: "userId and platform required" }, { status: 400 });
  }

  await db.platformCredential.deleteMany({ where: { userId, platform } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
