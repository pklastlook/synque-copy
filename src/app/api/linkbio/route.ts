import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/linkbio
 *
 * PUBLIC — listed in middleware PUBLIC_ROUTES so visitors can resolve link-in-bio
 * slugs from the public `/l/[slug]` page. The actual `/l/[slug]` server
 * component queries the DB directly (not via this API), but the route is kept
 * public for backwards compatibility with external embeds.
 *
 * NOTE: This returns ALL link-in-bio pages across tenants. The create/update/
 * delete handlers below ARE tenant-scoped (see PATCH / POST). If you need
 * tenant-scoped listing in the future, require auth here too.
 */
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

/**
 * PATCH /api/linkbio
 *
 * Update a link-in-bio page by id (passed in the body). Tenant-scoped — returns
 * 404 if the page belongs to another tenant.
 *
 * NOTE: This is a backwards-compatible API shape (id in body). The preferred
 * pattern is PATCH /api/linkbio/[id] (see sibling [id]/route.ts).
 */
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const { id, links, title, subtitle, theme, active } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await db.linkInBio.findFirst({
    where: { id, ...tenantWhere(scope) as { customerId?: string } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Link-in-bio page not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (links !== undefined) data.links = JSON.stringify(links);
  if (title !== undefined) data.title = title;
  if (subtitle !== undefined) data.subtitle = subtitle;
  if (theme !== undefined) data.theme = theme;
  if (active !== undefined) data.active = active;
  await db.linkInBio.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/** POST — create a new link-in-bio page with a unique slug. Tenant-scoped. */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json().catch(() => ({}));
  const { title, subtitle, theme, slug, accountId, avatar } = body as {
    title?: string;
    subtitle?: string;
    theme?: string;
    slug?: string;
    accountId?: string;
    avatar?: string;
  };

  const finalTitle = (title ?? "My link-in-bio").trim() || "My link-in-bio";

  // Generate a unique slug. If provided, sanitize; otherwise derive from title.
  const baseSlugRaw = (slug ?? finalTitle)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "page";
  const baseSlug = baseSlugRaw.slice(0, 40);
  let uniqueSlug = baseSlug;
  let suffix = 1;
  while (await db.linkInBio.findUnique({ where: { slug: uniqueSlug } }).catch((e) => console.error("[api]", e))) {
    suffix += 1;
    uniqueSlug = `${baseSlug}-${suffix}`;
    if (suffix > 999) break;
  }

  const page = await db.linkInBio.create({
    data: {
      slug: uniqueSlug,
      title: finalTitle,
      subtitle: subtitle ?? null,
      avatar: avatar ?? null,
      theme: theme ?? "rose",
      links: JSON.stringify([]),
      visits: 0,
      clicks: 0,
      accountId: accountId ?? null,
      active: true,
      customerId: scope.customerId,
    },
  });

  return NextResponse.json({ id: page.id, slug: page.slug, ok: true });
}
