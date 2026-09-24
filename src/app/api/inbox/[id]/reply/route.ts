import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/inbox/[id]/reply
 *
 * Posts a reply to a comment on the actual social platform (Twitter/X,
 * Instagram, Facebook) using stored credentials. Falls back to storing
 * the reply text locally if the platform API call fails.
 *
 * Body: { replyText }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  const { id } = await params;
  const { replyText } = (await req.json()) as { replyText?: string };

  if (!replyText?.trim()) {
    return NextResponse.json({ error: "replyText is required" }, { status: 400 });
  }

  // Get the comment + account
  const comment = await db.comment.findUnique({
    where: { id },
    include: { account: { include: { owner: true } } },
  });

  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const platform = comment.account.platform;
  const ownerId = comment.account.ownerId;

  // Get stored credentials
  const credPlatform = platform === "x" ? "twitter" : platform;
  const cred = await db.platformCredential.findUnique({
    where: { userId_platform: { userId: ownerId, platform: credPlatform } },
  }).catch(() => null);

  let postedToPlatform = false;
  let platformError: string | null = null;

  // === Twitter/X reply ===
  if ((platform === "x" || platform === "twitter") && cred?.oauth2UserToken) {
    try {
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cred.oauth2UserToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: replyText.trim(),
          reply: { in_reply_to_tweet_id: comment.id },
        }),
      });
      const json = await res.json();
      if (res.ok && json.data?.id) {
        postedToPlatform = true;
      } else {
        platformError = json.detail || json.title || `Twitter API ${res.status}`;
      }
    } catch (e: unknown) {
      platformError = e instanceof Error ? e.message : "Network error";
    }
  }

  // === Instagram/Facebook reply (Graph API) ===
  if ((platform === "instagram" || platform === "facebook") && cred?.accessToken && cred?.pageId) {
    try {
      const endpoint = platform === "instagram"
        ? `https://graph.facebook.com/v19.0/${comment.id}/replies`
        : `https://graph.facebook.com/v19.0/${comment.id}/comments`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyText.trim(),
          access_token: cred.accessToken,
        }),
      });
      const json = await res.json();
      if (res.ok && json.id) {
        postedToPlatform = true;
      } else {
        platformError = json.error?.message || `Graph API ${res.status}`;
      }
    } catch (e: unknown) {
      platformError = e instanceof Error ? e.message : "Network error";
    }
  }

  // === LinkedIn — API doesn't support comment replies ===
  if (platform === "linkedin") {
    platformError = "LinkedIn API doesn't support comment replies. Open the post on LinkedIn to reply manually.";
  }

  // Store the reply text regardless of whether the platform call succeeded
  await db.comment.update({
    where: { id },
    data: {
      replied: true,
      replyText: replyText.trim(),
      repliedAt: new Date(),
    },
  });

  // Log activity
  await db.activity.create({
    data: {
      userId: user!.userId,
      type: "comment_replied",
      description: `replied to ${comment.author} on ${platform}${postedToPlatform ? "" : " (saved locally)"}`,
    },
  }).catch(() => null);

  if (postedToPlatform) {
    return NextResponse.json({
      ok: true,
      postedToPlatform: true,
      message: "Reply posted to platform successfully",
    });
  }

  return NextResponse.json({
    ok: true,
    postedToPlatform: false,
    message: "Reply saved locally — couldn't post to platform",
    error: platformError ?? `No API credentials configured for ${platform}. Set up OAuth in Settings → Platform API Keys.`,
  });
}
