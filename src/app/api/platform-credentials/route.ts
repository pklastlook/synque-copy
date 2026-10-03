import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";
import {
  decryptPlatformCredential,
  encryptPlatformCredentialWrite,
} from "@/lib/platform-credential-crypto";

export const dynamic = "force-dynamic";

/**
 * Resolve the userId a caller is allowed to act on.
 *
 * - Non-admin users can ONLY read/write their OWN credentials (body/query
 *   `userId` is overridden with `req.user.userId`).
 * - Tenant admins can act on any user INSIDE their tenant (body `userId`
 *   must belong to a user whose customerId matches the admin's scope).
 * - Super-admins can act on any userId (no constraint).
 *
 * Returns the resolved userId, or `{ error }` if the body requested a
 * userId the caller is not allowed to act on.
 */
async function resolveTargetUserId(
  callerUserId: string,
  scope: { customerId: string | null; isSuperAdmin: boolean },
  requestedUserId: string | null | undefined,
): Promise<{ userId: string } | { error: NextResponse }> {
  // Super-admin: honour the requested userId (default to self if missing)
  if (scope.isSuperAdmin) {
    return { userId: requestedUserId ?? callerUserId };
  }
  // Non-admin (member/editor/viewer): only own credentials
  const role = (await db.user.findUnique({
    where: { id: callerUserId },
    select: { role: true },
  }))?.role;
  const isAdmin = role === "admin" || role === "manager";
  if (!isAdmin) {
    return { userId: callerUserId };
  }
  // Tenant admin: requested userId must belong to their tenant
  if (!requestedUserId || requestedUserId === callerUserId) {
    return { userId: callerUserId };
  }
  const target = await db.user.findFirst({
    where: { id: requestedUserId, customerId: scope.customerId },
    select: { id: true },
  });
  if (!target) {
    return {
      error: NextResponse.json(
        { error: "Not allowed — target user is not in your tenant" },
        { status: 403 },
      ),
    };
  }
  return { userId: requestedUserId };
}

/**
 * GET /api/platform-credentials?userId=xxx
 *
 * Auth required. Users can only read their OWN credentials. Tenant admins
 * can read any user's credentials within their tenant. Super-admins can
 * read any user's credentials.
 */
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const requestedUserId = req.nextUrl.searchParams.get("userId");
  const resolved = await resolveTargetUserId(user.userId, scope, requestedUserId);
  if ("error" in resolved) return resolved.error;
  const userId = resolved.userId;

  const rows = await db.platformCredential.findMany({ where: { userId } });
  // Sensitive fields are stored AES-256-GCM-encrypted at rest. Decrypt them
  // (with try/catch fallback to raw plaintext for pre-migration rows) before
  // masking so the masked preview shows the REAL last-4 chars of the secret,
  // not the last-4 chars of the ciphertext blob.
  const creds = rows.map(decryptPlatformCredential);
  return NextResponse.json(
    creds.map((c) => ({
      id: c.id,
      platform: c.platform,
      connected: c.connected,
      clientId: c.clientId ? c.clientId.slice(0, 4) + "••••" + c.clientId.slice(-4) : null,
      apiKey: c.apiKey ? c.apiKey.slice(0, 4) + "••••" + c.apiKey.slice(-4) : null,
      accessToken: c.accessToken ? "••••" + c.accessToken.slice(-4) : null,
      bearerToken: c.bearerToken ? "••••" + c.bearerToken.slice(-4) : null,
      pageId: c.pageId,
      profileId: c.profileId,
      hasClientSecret: !!c.clientSecret,
      hasApiSecret: !!c.apiSecret,
      hasAccessSecret: !!c.accessSecret,
      updatedAt: c.updatedAt.toISOString(),
    }))
  );
}

/** PUT /api/platform-credentials — save or update platform credentials */
export async function PUT(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { userId: requestedUserId, platform, clientId, clientSecret, apiKey, apiSecret, accessToken, accessSecret, bearerToken, pageId, profileId } = body as {
    userId?: string;
    platform: string;
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    apiSecret?: string;
    accessToken?: string;
    accessSecret?: string;
    bearerToken?: string;
    pageId?: string;
    profileId?: string;
  };

  if (!platform) {
    return NextResponse.json({ error: "platform required" }, { status: 400 });
  }

  // Bind userId to the caller (or, for admins, verify the target is in their tenant)
  const resolved = await resolveTargetUserId(user.userId, scope, requestedUserId);
  if ("error" in resolved) return resolved.error;
  const userId = resolved.userId;

  // Build the write payload. Sensitive fields (clientSecret, apiSecret,
  // accessToken, accessSecret, bearerToken, etc.) are AES-256-GCM-encrypted
  // before persistence so a DB backup leak / SQL injection / prisma-studio
  // glance does NOT expose live OAuth tokens. `undefined` fields are left
  // untouched (Prisma skips them on update); `null` clears the column;
  // non-empty strings become ciphertexts; empty strings become `null`.
  const data: Record<string, unknown> = { connected: true };
  if (clientId !== undefined) data.clientId = clientId;
  if (clientSecret !== undefined) data.clientSecret = clientSecret;
  if (apiKey !== undefined) data.apiKey = apiKey;
  if (apiSecret !== undefined) data.apiSecret = apiSecret;
  if (accessToken !== undefined) data.accessToken = accessToken;
  if (accessSecret !== undefined) data.accessSecret = accessSecret;
  if (bearerToken !== undefined) data.bearerToken = bearerToken;
  if (pageId !== undefined) data.pageId = pageId;
  if (profileId !== undefined) data.profileId = profileId;
  const encryptedData = encryptPlatformCredentialWrite(data);

  const cred = await db.platformCredential.upsert({
    where: { userId_platform: { userId, platform } },
    create: { userId, platform, ...encryptedData },
    update: encryptedData,
  });

  return NextResponse.json({ id: cred.id, ok: true });
}

/** DELETE /api/platform-credentials?userId=xxx&platform=yyy — remove credentials */
export async function DELETE(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const requestedUserId = req.nextUrl.searchParams.get("userId");
  const platform = req.nextUrl.searchParams.get("platform");
  if (!platform) {
    return NextResponse.json({ error: "platform required" }, { status: 400 });
  }

  const resolved = await resolveTargetUserId(user.userId, scope, requestedUserId);
  if ("error" in resolved) return resolved.error;
  const userId = resolved.userId;

  await db.platformCredential.deleteMany({ where: { userId, platform } }).catch((e) => console.error("[api]", e));
  return NextResponse.json({ ok: true });
}
