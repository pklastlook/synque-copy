import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Public click-tracking endpoint.
 *
 * Called by the public link-in-bio page (`/l/[slug]`) whenever a visitor
 * clicks one of the link buttons. The page's server component already
 * increments `visits` on render — this endpoint only handles `clicks`.
 *
 * No auth required — anyone with the bio slug can increment clicks.
 * Fire-and-forget on the client side; a 200 response simply confirms
 * the increment was accepted.
 */
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.linkInBio.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
  } catch {
    // Swallow errors silently — click tracking must never break the visitor's
    // navigation. A 404 from a stale link ID, for example, should still return
    // 200 so the client doesn't surface a confusing error.
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}
