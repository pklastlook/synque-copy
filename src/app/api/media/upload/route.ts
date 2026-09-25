import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getTenantScope } from "@/lib/auth-guard";
import { getDbForUser } from "@/lib/tenant-db";
import { storage, MAX_UPLOAD_SIZE } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/upload — multipart/form-data file upload.
 *
 * Form fields:
 *   - file          : the File to upload (required)
 *   - uploadedById  : User.id of the uploader (required)
 *   - folder        : logical folder name (optional, defaults to "root")
 *   - name          : override display name (optional, defaults to file.name)
 *   - tags          : comma-separated tag list (optional)
 *
 * Flow:
 *   1. Auth: requires sign-in
 *   2. Read file into buffer
 *   3. Pass to storage adapter (writes to tenant-scoped path, generates thumbnail)
 *   4. Persist MediaAsset row in the tenant's DB (or main DB for super-admin)
 *
 * Returns: { ok, id, url, thumbnail, size, width, height, type }
 */
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);
  const { db: targetDb } = await getDbForUser(user!);

  const formData = await req.formData();
  const file = formData.get("file");
  const uploadedById = (formData.get("uploadedById") as string | null) ?? null;
  const folder = (formData.get("folder") as string | null) ?? "root";
  const overrideName = (formData.get("name") as string | null) ?? null;
  const tags = (formData.get("tags") as string | null) ?? null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json(
      { error: `File too large — max ${MAX_UPLOAD_SIZE / 1024 / 1024} MB` },
      { status: 413 },
    );
  }

  // Detect asset type from MIME
  const contentType = file.type || "application/octet-stream";
  let type: "image" | "video" | "audio" = "image";
  if (contentType.startsWith("video/")) type = "video";
  else if (contentType.startsWith("audio/")) type = "audio";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload({
      buffer,
      fileName: overrideName ?? file.name,
      contentType,
      customerId: scope.customerId,
      folder,
      generateThumbnail: type === "image",
    });

    const asset = await targetDb.mediaAsset.create({
      data: {
        name: overrideName ?? file.name,
        type,
        url: result.url,
        thumbnail: result.thumbnailUrl,
        size: result.size,
        width: result.width ?? null,
        height: result.height ?? null,
        tags: tags ?? null,
        folder: folder || "root",
        uploadedById: uploadedById ?? user!.userId,
        customerId: scope.customerId,
      },
    });

    return NextResponse.json({
      ok: true,
      id: asset.id,
      url: result.url,
      thumbnail: result.thumbnailUrl,
      size: result.size,
      width: result.width ?? null,
      height: result.height ?? null,
      type,
      storageKey: result.storageKey,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    console.error("[media/upload] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
