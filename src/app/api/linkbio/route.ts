import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const pages = await db.linkInBio.findMany({ orderBy: { visits: "desc" } });
  return NextResponse.json(
    pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      avatar: p.avatar,
      theme: p.theme,
      visits: p.visits,
      clicks: p.clicks,
      accountId: p.accountId,
      active: p.active,
      links: JSON.parse(p.links) as { title: string; url: string; icon: string }[],
      createdAt: p.createdAt.toISOString(),
    }))
  );
}

export async function PATCH(req: NextRequest) {
  const { id, links, title, subtitle, theme, active } = await req.json();
  const data: Record<string, unknown> = {};
  if (links !== undefined) data.links = JSON.stringify(links);
  if (title !== undefined) data.title = title;
  if (subtitle !== undefined) data.subtitle = subtitle;
  if (theme !== undefined) data.theme = theme;
  if (active !== undefined) data.active = active;
  await db.linkInBio.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
