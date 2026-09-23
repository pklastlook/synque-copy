import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const assets = await db.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
  const folders = await db.mediaAsset.groupBy({
    by: ["folder"],
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
      createdAt: a.createdAt.toISOString(),
    })),
    folders: folders.map((f) => ({
      name: f.folder,
      count: f._count.id,
      size: f._sum.size ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, url, type, tags, folder, uploadedById } = body;
  if (!name || !url) return NextResponse.json({ error: "name and url required" }, { status: 400 });
  const a = await db.mediaAsset.create({
    data: {
      name,
      url,
      type: type ?? "image",
      thumbnail: url,
      tags: tags ?? null,
      folder: folder ?? "root",
      uploadedById: uploadedById ?? null,
    },
  });
  return NextResponse.json({ id: a.id, ok: true });
}
