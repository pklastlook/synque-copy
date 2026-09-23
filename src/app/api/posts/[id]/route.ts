import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const allowed = ["title", "caption", "mediaUrl", "mediaType", "tone", "status", "scheduledAt"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) {
      data[k] = k === "scheduledAt" && body[k] ? new Date(body[k]) : body[k];
    }
  }

  // If `variants` is supplied, sync the per-account variant content.
  // Shape: { [accountId]: { content, hashtags, status? } } OR an array
  // of { id?, accountId, content, hashtags? } objects.
  // For each provided variant:
  //   - if it has an existing id → UPDATE it
  //   - else if accountId matches an existing variant on this post → UPDATE it
  //   - else → CREATE a new variant
  // Variants not present in the payload are left untouched (so a "republish"
  // doesn't wipe analytics for accounts the user didn't re-edit).
  if (body.variants !== undefined) {
    const incoming = normalizeVariants(body.variants);

    if (incoming.length > 0) {
      const existing = await db.postVariant.findMany({ where: { postId: id } });
      const byId = new Map(existing.map((v) => [v.id, v]));
      const byAccount = new Map(existing.map((v) => [v.accountId, v]));

      for (const inc of incoming) {
        const match = (inc.id && byId.get(inc.id)) || (inc.accountId && byAccount.get(inc.accountId));
        const variantData: Record<string, unknown> = {};
        if (inc.content !== undefined) variantData.content = inc.content;
        if (inc.hashtags !== undefined) variantData.hashtags = inc.hashtags ?? null;
        if (inc.status !== undefined) variantData.status = inc.status;
        if (body.status === "published" && inc.status === undefined) {
          variantData.status = "published";
          variantData.publishedAt = new Date();
        }

        if (match) {
          if (Object.keys(variantData).length > 0) {
            await db.postVariant.update({ where: { id: match.id }, data: variantData });
          }
        } else if (inc.accountId) {
          await db.postVariant.create({
            data: {
              postId: id,
              accountId: inc.accountId,
              content: inc.content ?? "",
              hashtags: inc.hashtags ?? null,
              status: (inc.status as string) ?? (body.status as string) ?? "draft",
              ...(body.status === "published" ? { publishedAt: new Date() } : {}),
            },
          });
        }
      }
    }
  }

  await db.post.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

interface NormalizedVariant {
  id?: string;
  accountId?: string;
  content?: string;
  hashtags?: string | null;
  status?: string;
}

function normalizeVariants(v: unknown): NormalizedVariant[] {
  if (Array.isArray(v)) {
    return v as NormalizedVariant[];
  }
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).map(([accountId, val]) => ({
      accountId,
      ...(val as Record<string, unknown>),
    }));
  }
  return [];
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.postVariant.deleteMany({ where: { postId: id } }).catch(() => {});
  await db.post.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
