import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";
import { chatWithFallback, type LLMMessage } from "@/lib/llm";

export const dynamic = "force-dynamic";

interface AutoFillBody {
  /** Number of days to scan starting from "tomorrow". Defaults to 7. */
  days?: number;
  /** Platform id to scope the AI generation. Defaults to "instagram"
   *  if no platform hint is given. The first connected account on that
   *  platform is used as the variant target. */
  platform?: string;
}

/**
 * POST /api/posts/auto-fill
 *
 * Auto-creates draft posts for empty days in the next `days` days.
 * For each day with zero scheduled / published posts, an AI-generated
 * content suggestion is created as a draft (so the user can review +
 * publish when ready).
 *
 * Returns:
 *   { ok: true, created: 5, postIds: [...], skippedDays: [...] }
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const scope = getTenantScope(user!);
  const postCustomerId = scope.isSuperAdmin ? null : scope.customerId;

  const body = (await req.json().catch(() => ({}))) as AutoFillBody;
  const days = Math.min(30, Math.max(1, body.days ?? 7));
  const platformHint = (body.platform ?? "instagram").toLowerCase();

  // Find a connected account on the requested platform for the variant.
  const account = await db.account.findFirst({
    where: {
      platform: platformHint,
      ...(scope.isSuperAdmin ? {} : { customerId: scope.customerId }),
    },
    select: { id: true, handle: true, platform: true },
  });

  if (!account) {
    return NextResponse.json(
      { error: `No connected ${platformHint} account in your tenant — connect one first` },
      { status: 404 }
    );
  }

  // Build the list of empty days to fill (next N days, excluding today).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidateDays: Date[] = [];
  for (let i = 1; i <= days; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    candidateDays.push(d);
  }

  // Find which days already have a scheduled or published post for this
  // account. We query both Post.scheduledAt and PostVariant.publishedAt
  // to be thorough.
  const since = new Date(today.getTime());
  const until = new Date(today.getTime() + (days + 1) * 86400000);
  const existing = await db.post.findMany({
    where: {
      OR: [
        { scheduledAt: { gte: since, lt: until } },
        { variants: { some: { publishedAt: { gte: since, lt: until } } } },
      ],
      ...(scope.isSuperAdmin ? {} : { customerId: scope.customerId }),
    },
    select: { scheduledAt: true, variants: { select: { publishedAt: true } },
  } });

  const occupiedDayKeys = new Set<string>();
  for (const p of existing) {
    if (p.scheduledAt) {
      occupiedDayKeys.add(p.scheduledAt.toISOString().slice(0, 10));
    }
    for (const v of p.variants) {
      if (v.publishedAt) {
        occupiedDayKeys.add(v.publishedAt.toISOString().slice(0, 10));
      }
    }
  }

  const emptyDays = candidateDays.filter(
    (d) => !occupiedDayKeys.has(d.toISOString().slice(0, 10))
  );

  if (emptyDays.length === 0) {
    return NextResponse.json({
      ok: true,
      created: 0,
      postIds: [],
      skippedDays: [],
      message: `All ${days} days already have scheduled or published posts`,
    });
  }

  // AI-generate one content suggestion per empty day. We ask for N
  // distinct ideas in a single batched request.
  let ideas: { title: string; caption: string }[] = [];
  try {
    const llmMessages: LLMMessage[] = [
      {
        role: "system",
        content:
          "You are a social media content strategist. Generate distinct content ideas for a recurring posting schedule. Each idea must have a short title (max 60 chars) and a caption (max 220 chars). Respond with ONLY a JSON array — no markdown, no prose.",
      },
      {
        role: "user",
        content: `Platform: ${account.platform}
Account handle: ${account.handle}

Generate exactly ${emptyDays.length} distinct content ideas for an upcoming posting schedule. Vary topics, hooks, and angles (educational, behind-the-scenes, engagement-bait, timely, evergreen). Each idea must feel genuinely different.

Respond with ONLY a JSON array of objects, e.g.:
[{"title": "...", "caption": "..."}, ...]`,
      },
    ];
    const result = await chatWithFallback(llmMessages);
    const cleaned = result.content.replace(/```json/gi, "").replace(/```/g, "").trim();
    const startBrace = cleaned.indexOf("[");
    const endBrace = cleaned.lastIndexOf("]");
    if (startBrace >= 0 && endBrace > startBrace) {
      const parsed = JSON.parse(cleaned.slice(startBrace, endBrace + 1));
      if (Array.isArray(parsed)) {
        ideas = parsed
          .filter(
            (x) => x && typeof x === "object" && typeof (x as { title?: unknown }).title === "string"
          )
          .map((x) => ({
            title: String((x as { title: string }).title).slice(0, 80),
            caption: String((x as { caption?: string }).caption ?? "").slice(0, 500),
          }))
          .slice(0, emptyDays.length);
      }
    }
  } catch (e) {
    console.error("[auto-fill] AI generation failed:", e instanceof Error ? e.message : String(e));
  }

  // Fill any missing ideas with a sensible fallback so the operation
  // still produces drafts even if AI under-delivers.
  while (ideas.length < emptyDays.length) {
    const fallbackDate = emptyDays[ideas.length];
    ideas.push({
      title: `Draft — ${fallbackDate.toISOString().slice(0, 10)}`,
      caption: "Auto-generated draft — edit this caption before publishing.",
    });
  }

  const postIds: string[] = [];
  for (let i = 0; i < emptyDays.length; i++) {
    const day = emptyDays[i];
    const idea = ideas[i];
    // Schedule at 10am local server time — drafts are NOT auto-published,
    // but setting a scheduledAt gives the user a visual anchor on the
    // calendar. The status stays "draft" so the user must explicitly
    // publish.
    const scheduledAt = new Date(day);
    scheduledAt.setHours(10, 0, 0, 0);

    const post = await db.post.create({
      data: {
        title: idea.title,
        caption: idea.caption,
        mediaType: "image",
        tone: "professional",
        status: "draft",
        scheduledAt,
        authorId: user!.userId,
        customerId: postCustomerId,
        variants: {
          create: {
            accountId: account.id,
            content: idea.caption,
            hashtags: null,
            status: "draft",
            publishedAt: null,
          },
        },
      },
    });
    postIds.push(post.id);
  }

  try {
    await db.activity.create({
      data: {
        userId: user!.userId,
        type: "ai_generated",
        description: `auto-filled ${postIds.length} empty calendar slot${postIds.length === 1 ? "" : "s"}`,
      },
    });
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    ok: true,
    created: postIds.length,
    postIds,
    skippedDays: occupiedDayKeys.size,
  });
}
