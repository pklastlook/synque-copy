import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** PATCH /api/media/[id] — update asset metadata (name / tags / folder / url). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb, isTenantIsolated } = await getDbForUser(user!);

  const { id } = await params;

  // Verify the asset belongs to this tenant before editing.
  // For an isolated tenant DB, `targetDb` is already isolated (no extra filter
  // needed). For the shared central DB we MUST filter by customerId, otherwise
  // any logged-in user could mutate another tenant's asset by id.
  const tenantFilter = isTenantIsolated ? {} : tenantWhere(scope) as { customerId?: string };
  const existing = await targetDb.mediaAsset.findFirst({
    where: { id, ...tenantFilter },
    select: { id: true },
  }).catch((e) => console.error("[api]", e));
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ["name", "url", "thumbnail", "tags", "folder"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  await targetDb.mediaAsset.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/media/[id] — delete asset + its file from storage. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAuth(_req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb, isTenantIsolated } = await getDbForUser(user!);

  const { id } = await params;

  const tenantFilter = isTenantIsolated ? {} : tenantWhere(scope) as { customerId?: string };
  const existing = await targetDb.mediaAsset.findFirst({
    where: { id, ...tenantFilter },
    select: { url: true, thumbnail: true },
  }).catch((e) => console.error("[api]", e));
  if (!existing) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  // Delete the file from storage (best-effort — DB row is the source of truth)
  // Extract the storage key from the URL: "/uploads/<storageKey>"
  if (existing.url?.startsWith("/uploads/")) {
    const storageKey = existing.url.slice("/uploads/".length);
    await storage.delete(storageKey).catch(() => {});
  }
  if (existing.thumbnail?.startsWith("/uploads/") && existing.thumbnail !== existing.url) {
    const thumbKey = existing.thumbnail.slice("/uploads/".length);
    await storage.delete(thumbKey).catch(() => {});
  }

  await targetDb.mediaAsset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
