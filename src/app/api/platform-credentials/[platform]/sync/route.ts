import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TwitterApi } from "twitter-api-v2";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { decryptPlatformCredential } from "@/lib/platform-credential-crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/platform-credentials/twitter/sync
 *
 * Uses stored Twitter API credentials to fetch the REAL profile data
 * (followers, following, posts count, verified status) and update
 * the matching Account record in the database.
 *
 * Auth required. The body `userId` MUST match the caller (or, for tenant
 * admins, the target user must be in the caller's tenant). The target
 * Account must belong to the caller's tenant.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { platform: rawPlatform } = await params;
  const body = (await req.json()) as { userId?: string; accountId: string };
  const requestedUserId = body.userId;
  const { accountId } = body;

  if (!accountId) {
    return NextResponse.json({ error: "accountId required" }, { status: 400 });
  }

  // Resolve the userId we are allowed to act on. Non-admins can only act on
  // themselves. Tenant admins can act on any user in their tenant. Super-admins
  // can act on anyone. (Defensive: ignore the body userId for non-admins.)
  let userId = user.userId;
  if (scope.isSuperAdmin) {
    userId = requestedUserId ?? user.userId;
  } else {
    // Look up the caller's role once.
    const caller = await db.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    });
    const isAdmin = caller?.role === "admin" || caller?.role === "manager";
    if (isAdmin && requestedUserId && requestedUserId !== user.userId) {
      const target = await db.user.findFirst({
        where: { id: requestedUserId, customerId: scope.customerId },
        select: { id: true },
      });
      if (!target) {
        return NextResponse.json(
          { error: "Not allowed — target user is not in your tenant" },
          { status: 403 },
        );
      }
      userId = requestedUserId;
    }
  }

  // Normalize platform name
  const platform = rawPlatform === "x" ? "twitter" : rawPlatform;

  // Get stored credentials for this platform. Sensitive fields
  // (apiKey, apiSecret, accessToken, accessSecret, bearerToken, ...) are
  // stored AES-256-GCM-encrypted at rest — decrypt before handing them to
  // the platform SDK / fetch calls.
  const credRow = await db.platformCredential.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!credRow || !credRow.connected) {
    return NextResponse.json(
      { error: `${platform.charAt(0).toUpperCase() + platform.slice(1)} API credentials not configured. Add them in Settings → Platform API Keys.` },
      { status: 400 }
    );
  }
  const cred = decryptPlatformCredential(credRow);

  // Get the account record — tenant-scoped (super-admin sees any)
  const account = await db.account.findFirst({
    where: { id: accountId, ...tenantWhere(scope) as { customerId?: string } },
  });
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  // === TWITTER sync ===
  if (platform === "twitter") {
    let twitterClient: TwitterApi;

    try {
      if (cred.accessToken && cred.accessSecret && cred.apiKey && cred.apiSecret) {
        twitterClient = new TwitterApi({
          appKey: cred.apiKey,
          appSecret: cred.apiSecret,
          accessToken: cred.accessToken,
          accessSecret: cred.accessSecret,
        });
      } else if (cred.accessToken) {
        twitterClient = new TwitterApi(cred.accessToken);
      } else if (cred.bearerToken) {
        twitterClient = new TwitterApi(cred.bearerToken);
      } else {
        return NextResponse.json({ error: "Insufficient Twitter credentials" }, { status: 400 });
      }

      const me = await twitterClient.v2.me({
        "user.fields": ["public_metrics", "verified", "name", "username", "profile_image_url"],
      });

      const user = me.data;
      const metrics = user.public_metrics;

      await db.account.update({
        where: { id: accountId },
        data: {
          followers: metrics?.followers_count ?? account.followers,
          postsCount: metrics?.tweet_count ?? account.postsCount,
          verified: user.verified ?? false,
          displayName: user.name ?? account.displayName,
          handle: user.username ? `@${user.username}` : account.handle,
          avatar: user.profile_image_url ?? null,
        },
      });

      await db.analyticsDaily.create({
        data: {
          accountId,
          date: new Date(),
          followers: metrics?.followers_count ?? 0,
          impressions: 0,
          reach: 0,
          engagement: 0,
          posts: metrics?.tweet_count ?? 0,
        },
      }).catch((e) => console.error("[api]", e));

      return NextResponse.json({
        ok: true,
        synced: {
          followers: metrics?.followers_count ?? 0,
          postsCount: metrics?.tweet_count ?? 0,
          verified: user.verified ?? false,
          name: user.name,
          username: user.username,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Twitter API error";
      console.error("[twitter/sync]", message);
      return NextResponse.json(
        { error: `Twitter sync failed: ${message}. Check your API credentials in Settings.` },
        { status: 500 }
      );
    }
  }

  // === INSTAGRAM sync ===
  if (platform === "instagram") {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}?fields=followers_count,media_count,username,name,profile_picture_url,biography&access_token=${cred.accessToken}`
      );
      const json = await res.json();

      if (res.ok) {
        await db.account.update({
          where: { id: accountId },
          data: {
            followers: json.followers_count ?? account.followers,
            postsCount: json.media_count ?? account.postsCount,
            displayName: json.name ?? json.username ?? account.displayName,
            handle: json.username ? `@${json.username}` : account.handle,
            avatar: json.profile_picture_url ?? null,
          },
        });

        // Create/update AnalyticsDaily row for today with real data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingAnalytics = await db.analyticsDaily.findFirst({
          where: { accountId, date: today },
        });
        if (existingAnalytics) {
          await db.analyticsDaily.update({
            where: { id: existingAnalytics.id },
            data: { followers: json.followers_count ?? 0 },
          });
        } else {
          await db.analyticsDaily.create({
            data: {
              accountId,
              date: today,
              followers: json.followers_count ?? 0,
              impressions: 0, reach: 0, engagement: 0,
              posts: 0,
            },
          });
        }

        return NextResponse.json({
          ok: true,
          synced: {
            followers: json.followers_count ?? 0,
            postsCount: json.media_count ?? 0,
            name: json.name ?? json.username,
            username: json.username,
          },
        });
      }

      return NextResponse.json(
        { error: `Instagram sync failed: ${json.error?.message ?? "Unknown error"}` },
        { status: 500 }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Instagram API error";
      return NextResponse.json({ error: `Instagram sync failed: ${message}` }, { status: 500 });
    }
  }

  // === LINKEDIN sync ===
  if (platform === "linkedin") {
    try {
      const res = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${cred.accessToken}` },
      });
      const json = await res.json();

      if (res.ok) {
        // Fetch follower count from LinkedIn API
        const followerRes = await fetch(
          `https://api.linkedin.com/v2/networkSizes/urn:li:person:${cred.profileId}?fields=elementCount`,
          { headers: { Authorization: `Bearer ${cred.accessToken}` } }
        );
        const followerJson = await followerRes.json().catch(() => ({}));
        const followers = followerJson.elementCount ?? account.followers;

        await db.account.update({
          where: { id: accountId },
          data: {
            displayName: json.localizedFirstName + " " + json.localizedLastName,
            followers,
          },
        });

        // Create/update AnalyticsDaily row for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingAnalytics = await db.analyticsDaily.findFirst({
          where: { accountId, date: today },
        });
        if (existingAnalytics) {
          await db.analyticsDaily.update({
            where: { id: existingAnalytics.id },
            data: { followers },
          });
        } else {
          await db.analyticsDaily.create({
            data: {
              accountId, date: today, followers,
              impressions: 0, reach: 0, engagement: 0,
              posts: 0,
            },
          });
        }

        return NextResponse.json({
          ok: true,
          synced: { name: json.localizedFirstName + " " + json.localizedLastName, followers },
        });
      }

      return NextResponse.json(
        { error: `LinkedIn sync failed: ${json.message ?? "Unknown error"}` },
        { status: 500 }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "LinkedIn API error";
      return NextResponse.json({ error: `LinkedIn sync failed: ${message}` }, { status: 500 });
    }
  }

  // === FACEBOOK sync ===
  if (platform === "facebook") {
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${cred.pageId}?fields=fan_count,posts,name,picture&access_token=${cred.accessToken}`
      );
      const json = await res.json();

      if (res.ok) {
        await db.account.update({
          where: { id: accountId },
          data: {
            followers: json.fan_count ?? account.followers,
            postsCount: json.posts?.data?.length ?? account.postsCount,
            displayName: json.name ?? account.displayName,
            avatar: json.picture?.data?.url ?? null,
          },
        });

        // Create/update AnalyticsDaily row for today with real data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const existingAnalytics = await db.analyticsDaily.findFirst({
          where: { accountId, date: today },
        });
        if (existingAnalytics) {
          await db.analyticsDaily.update({
            where: { id: existingAnalytics.id },
            data: { followers: json.fan_count ?? 0 },
          });
        } else {
          await db.analyticsDaily.create({
            data: {
              accountId, date: today, followers: json.fan_count ?? 0,
              impressions: 0, reach: 0, engagement: 0,
              posts: 0,
            },
          });
        }

        return NextResponse.json({
          ok: true,
          synced: {
            followers: json.fan_count ?? 0,
            name: json.name,
          },
        });
      }

      return NextResponse.json(
        { error: `Facebook sync failed: ${json.error?.message ?? "Unknown error"}` },
        { status: 500 }
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Facebook API error";
      return NextResponse.json({ error: `Facebook sync failed: ${message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    error: `Platform '${platform}' sync not yet supported. Supported: twitter, instagram, linkedin, facebook.`,
  }, { status: 501 });
}
