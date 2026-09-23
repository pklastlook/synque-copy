import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * POST /api/media/upload — multipart/form-data file upload.
 * Saves the file to public/uploads/ and creates a MediaAsset record.
 *
 * Form fields:
 *   - file: the uploaded File (image/video/audio)
 *   - name: display name
 *   - tags: optional comma-separated tags
 *   - folder: optional folder (default "root")
 *   - uploadedById: required user id
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

    // Determine media type from mime
    const mime = file.type.toLowerCase();
    let type: "image" | "video" | "audio";
    if (mime.startsWith("image/")) type = "image";
    else if (mime.startsWith("video/")) type = "video";
    else if (mime.startsWith("audio/")) type = "audio";
    else {
      return NextResponse.json({ error: "Unsupported file type. Use image, video, or audio." }, { status: 400 });
    }

    // Ensure the upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate a unique filename
    const ext = path.extname(file.name) || `.${mime.split("/")[1]}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const filepath = path.join(uploadDir, filename);

    // Write the file to disk
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // The public URL path
    const url = `/uploads/${filename}`;

    // Create the MediaAsset record
    const displayName = name.trim() || file.name.replace(/\.[^/.]+$/, "");
    const asset = await db.mediaAsset.create({
      data: {
        name: displayName,
        type,
        url,
        thumbnail: url,
        size: file.size,
        tags: tags ?? null,
        folder,
        uploadedById,
      },
    });

    return NextResponse.json({ id: asset.id, url, ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[/api/media/upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
