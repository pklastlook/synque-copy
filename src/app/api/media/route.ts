import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** GET /api/media — list assets for this tenant (from tenant DB if provisioned). */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
  const scope = getTenantScope(user!);
  const { db: targetDb, isTenantIsolated } = await getDbForUser(user!);
  const where = isTenantIsolated ? {} : tenantWhere(scope);

  const assets = await targetDb.mediaAsset.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const folders = await targetDb.mediaAsset.groupBy({
    by: ["folder"],
    where,
    _count: { id: true },
    _sum: { size: true },
  });

  return NextResponse.json({
    assets: assets.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      url: a.url,
      thumbnail: a.thumbnail,
      size: a.size,
      width: a.width,
      height: a.height,
      tags: a.tags,
      folder: a.folder,
      uploadedById: a.uploadedById,
      customerId: a.customerId,
      createdAt: a.createdAt.toISOString(),
    })),
    folders: folders.map((f) => ({
      name: f.folder,
      count: f._count.id,
      size: f._sum.size ?? 0,
    })),
  });
  } catch (err) {
    console.error("[api/media] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load media assets" },
      { status: 500 }
    );
  }
}

/** POST /api/media — add a media asset by URL (existing external URL or uploaded elsewhere). */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);

  const body = await req.json();
  const { name, url, type, tags, folder, uploadedById } = body;
  if (!name || !url) {
    return NextResponse.json({ error: "name and url required" }, { status: 400 });
  }

  const a = await targetDb.mediaAsset.create({
    data: {
      name,
      url,
      type: type ?? "image",
      thumbnail: url,
      tags: tags ?? null,
      folder: folder ?? "root",
      uploadedById: uploadedById ?? null,
      customerId: scope.customerId,
    },
  });
  return NextResponse.json({ id: a.id, ok: true });
  } catch (err) {
    console.error("[api/media] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create media asset" },
      { status: 500 }
    );
  }
}
