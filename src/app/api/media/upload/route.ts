import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { storage, MAX_UPLOAD_SIZE } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/upload
 *
 * Multipart form-data:
 *   file          — the file to upload (required)
 *   uploadedById  — user ID of the uploader (required)
 *   name          — display name for the asset (optional)
 *   folder        — logical folder inside the media library (optional, default "general")
 *
 * Returns:
 *   { url, thumbnail, width, height, size, storageKey, assetId }
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uploadedById = (formData.get("uploadedById") as string) || user!.userId;
    const name = (formData.get("name") as string) || file?.name || "Untitled";
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Size check
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `File too large — max ${Math.round(MAX_UPLOAD_SIZE / 1024 / 1024)}MB` },
        { status: 413 },
      );
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload via storage adapter (local filesystem or Cloudinary)
    const result = await storage.upload({
      buffer,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      customerId: user!.customerId ?? null,
      folder,
      generateThumbnail: true,
    });

    // Save a MediaAsset record in the DB
    let assetId: string | undefined;
    try {
      const asset = await db.mediaAsset.create({
        data: {
          name,
          url: result.url,
          type: file.type || "application/octet-stream",
          size: result.size,
          width: result.width ?? null,
          height: result.height ?? null,
          thumbnail: result.thumbnailUrl,
          folder,
          uploadedById,
          customerId: user!.customerId ?? null,
        },
      });
      assetId = asset.id;
    } catch (dbErr) {
      // Non-fatal — the file is uploaded, just the DB record failed
      console.warn("[media/upload] DB record failed:", dbErr instanceof Error ? dbErr.message : dbErr);
    }

    return NextResponse.json({
      url: result.url,
      thumbnail: result.thumbnailUrl,
      width: result.width,
      height: result.height,
      size: result.size,
      storageKey: result.storageKey,
      assetId,
    });
  } catch (err) {
    console.error("[media/upload] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
