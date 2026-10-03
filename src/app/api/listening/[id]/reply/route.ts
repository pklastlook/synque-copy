import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/listening/[id]/reply
 *
 * Posts a reply to a social mention on the platform where it was found.
 * Uses the same credentials as the inbox reply flow.
 *
 * Body: { replyText }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id } = await params;
  const { replyText } = (await req.json()) as { replyText?: string };

  if (!replyText?.trim()) {
    return NextResponse.json({ error: "replyText is required" }, { status: 400 });
  }

  // Tenant scope: load the mention only if its parent ListeningQuery belongs
  // to the caller's customer (super-admins bypass). Use findFirst with a
  // compound where to avoid cross-tenant IDOR.
  const mention = await db.mention.findFirst({
    where: { id, query: tenantWhere(scope) as { customerId?: string } },
    include: { query: true },
  });

  if (!mention) {
    return NextResponse.json({ error: "Mention not found" }, { status: 404 });
  }

  // Try to find a matching account + credentials for the mention's platform.
  // Tenant-scope the account lookup so a user in tenant A cannot reply using
  // tenant B's stored OAuth tokens.
  const account = await db.account.findFirst({
    where: {
      platform: mention.source as string,
      ...tenantWhere(scope) as { customerId?: string },
    },
  }).catch((e) => console.error("[api]", e));

  if (!account) {
    // Store the reply text as a comment if no matching account exists
    await db.comment.create({
      data: {
        accountId: mention.queryId, // associate with the listening query
        author: "SYNQUE Team",
        text: replyText.trim(),
        type: "mention",
        sentiment: "neutral",
        replied: true,
        replyText: replyText.trim(),
        repliedAt: new Date(),
      },
    }).catch((e) => console.error("[api]", e));

    return NextResponse.json({
      ok: true,
      postedToPlatform: false,
      message: "Reply saved — no matching social account found to post on the platform.",
    });
  }

  const credPlatform = mention.source === "x" || mention.source === "twitter" ? "twitter" : mention.source;
  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId: account.ownerId, platform: credPlatform } },
  }).catch((e) => console.error("[api]", e));

  let postedToPlatform = false;
  let platformError: string | null = null;

  // Twitter/X reply
  if ((mention.source === "x" || mention.source === "twitter") && cred?.oauth2UserToken) {
    try {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cred.oauth2UserToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `@${mention.author} ${replyText.trim()}`,
        }),
      });
      const json = await res.json();
      if (res.ok && json.data?.id) postedToPlatform = true;
      else platformError = json.detail ?? `Twitter API ${res.status}`;
    } catch (e: unknown) {
      platformError = e instanceof Error ? e.message : "Network error";
    }
  }

  // Facebook/Instagram reply
  if ((mention.source === "facebook" || mention.source === "instagram") && cred?.accessToken && mention.url) {
    try {
      // Extract the post/comment ID from the mention URL (simplified)
      const postIdMatch = mention.url.match(/\/(\d+)\/?(?:\?.*)?$/);
      const postId = postIdMatch?.[1];
      if (postId) {
        const endpoint = mention.source === "instagram"
          ? `https://graph.facebook.com/v19.0/${postId}/replies`
          : `https://graph.facebook.com/v19.0/${postId}/comments`;
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: replyText.trim(), access_token: cred.accessToken }),
        });
        const json = await res.json();
        if (res.ok && json.id) postedToPlatform = true;
        else platformError = json.error?.message ?? `Graph API ${res.status}`;
      }
    } catch (e: unknown) {
      platformError = e instanceof Error ? e.message : "Network error";
    }
  }

  // Store the reply as a comment regardless
  await db.comment.create({
    data: {
      accountId: account.id,
      author: mention.author,
      text: mention.text,
      type: "mention",
      sentiment: mention.sentiment as string,
      replied: true,
      replyText: replyText.trim(),
      repliedAt: new Date(),
    },
  }).catch((e) => console.error("[api]", e));

  await db.activity.create({
    data: {
      userId: user!.userId,
      type: "comment_replied",
      description: `replied to mention from ${mention.author} on ${mention.source}${postedToPlatform ? "" : " (saved locally)"}`,
    },
  }).catch((e) => console.error("[api]", e));

  return NextResponse.json({
    ok: true,
    postedToPlatform,
    message: postedToPlatform ? "Reply posted to platform" : "Reply saved locally",
    error: platformError,
  });
}
