import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/media/upload — multipart/form-data file upload.
 *
 * On Vercel, the filesystem is read-only (can't write to public/uploads).
 * So we convert the file to a base64 data URL and store that in the DB.
 * This works everywhere — localhost and Vercel — without external storage.
 *
 * For large files (>1MB), we recommend using a URL paste instead.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string | null) || "";
    const tags = formData.get("tags") as string | null;
    const folder = (formData.get("folder") as string | null) || "root";
    const uploadedById = formData.get("uploadedById") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!uploadedById) {
      return NextResponse.json({ error: "uploadedById required" }, { status: 400 });
    }

    // Limit file size (1MB for base64 data URL approach)
    const maxSize = 1.5 * 1024 * 1024; // 1.5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "File too large (max 1.5MB for direct upload). For larger files, paste a URL instead.",
      }, { status: 400 });
    }

    // Determine media type from mime
    const mime = file.type.toLowerCase();
    let type: "image" | "video" | "audio";
    if (mime.startsWith("image/")) type = "image";
    else if (mime.startsWith("video/")) type = "video";
    else if (mime.startsWith("audio/")) type = "audio";
    else {
      return NextResponse.json({ error: "Unsupported file type. Use image, video, or audio." }, { status: 400 });
    }

    // Convert file to base64 data URL (works on Vercel's read-only filesystem)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    // Create the MediaAsset record
    const displayName = name.trim() || file.name.replace(/\.[^/.]+$/, "");
    const asset = await db.mediaAsset.create({
      data: {
        name: displayName,
        type,
        url: dataUrl,
        thumbnail: dataUrl,
        size: file.size,
        tags: tags ?? null,
        folder,
        uploadedById,
      },
    });

    return NextResponse.json({
      id: asset.id,
      url: dataUrl,
      ok: true,
      copyUrl: dataUrl.slice(0, 80) + "...", // Short preview for copy
      message: "Upload successful! URL copied to clipboard.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[/api/media/upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
