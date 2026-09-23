import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const authorId = req.nextUrl.searchParams.get("authorId");

  const posts = await db.post.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(authorId ? { authorId } : {}),
    },
    include: {
      author: true,
      variants: { include: { account: { include: { owner: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    posts.map((p) => ({
      id: p.id,
      title: p.title,
      caption: p.caption,
      mediaUrl: p.mediaUrl,
      mediaType: p.mediaType,
      tone: p.tone,
      status: p.status,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      authorId: p.authorId,
      authorName: p.author.name,
      createdAt: p.createdAt.toISOString(),
      variants: p.variants.map((v) => ({
        id: v.id,
        accountId: v.accountId,
        platform: v.account.platform,
        handle: v.account.handle,
        content: v.content,
        hashtags: v.hashtags,
        status: v.status,
        publishedAt: v.publishedAt?.toISOString() ?? null,
        likes: v.likes,
        comments: v.comments,
        shares: v.shares,
        reach: v.reach,
        impressions: v.impressions,
        saves: v.saves,
      })),
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, caption, mediaUrl, tone, scheduledAt, accountIds, variants, authorId } = body as {
    title: string;
    caption: string;
    mediaUrl?: string | null;
    tone?: string;
    scheduledAt?: string | null;
    accountIds: string[];
    variants: Record<string, { content: string; hashtags?: string }>;
    authorId: string;
  };

  const post = await db.post.create({
    data: {
      title,
      caption,
      mediaUrl: mediaUrl ?? null,
      mediaType: "image",
      tone: tone ?? "professional",
      status: scheduledAt ? "scheduled" : "published",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      authorId,
      variants: {
        create: accountIds.map((aid) => ({
          accountId: aid,
          content: variants[aid]?.content ?? caption,
          hashtags: variants[aid]?.hashtags ?? null,
          status: scheduledAt ? "scheduled" : "published",
          publishedAt: scheduledAt ? null : new Date(),
        })),
      },
    },
    include: { variants: true },
  });

  await db.activity.create({
    data: {
      userId: authorId,
      type: scheduledAt ? "post_scheduled" : "post_published",
      description: `${scheduledAt ? "scheduled" : "published"} “${title}” to ${accountIds.length} accounts`,
    },
  });

  return NextResponse.json({ id: post.id, ok: true });
}
