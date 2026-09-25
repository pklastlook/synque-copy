import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { db } from "./db";

/**
 * Pluggable storage abstraction.
 *
 * Storage adapters implement a common interface so the media upload route
 * can swap between providers without touching business logic.
 *
 * Currently implemented:
 *   - LocalFilesystemAdapter  — writes to public/uploads/<customerId>/<folder>/
 *                               served statically by Next.js at /uploads/...
 *
 * Future adapters (when deploying to Vercel / production):
 *   - UploadThingAdapter     — presigned URL flow, files go browser → UploadThing
 *   - CloudinaryAdapter      — auto image optimization + transform API
 *   - CloudflareR2Adapter    — S3-compatible, zero egress fees
 *   - S3Adapter              — generic AWS S3 / MinIO / Backblaze B2
 *
 * To switch adapters, set STORAGE_PROVIDER=<adapter-name> in .env and
 * implement the adapter below.
 */

export interface UploadResult {
  /** Public URL the browser can fetch the asset from. */
  url: string;
  /** Public URL of a smaller thumbnail (images only). null if N/A. */
  thumbnailUrl: string | null;
  /** Width in pixels (images + videos). */
  width?: number | null;
  /** Height in pixels (images + videos). */
  height?: number | null;
  /** Final size in bytes (after any compression/transcoding). */
  size: number;
  /** Storage key / path within the bucket (for later deletion). */
  storageKey: string;
}

export interface StorageAdapter {
  /** Persist a single file + return its public URL + metadata. */
  upload(params: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    /** Tenant scoping — usually the user's customerId. null = super-admin. */
    customerId: string | null;
    /** Logical folder inside the tenant's media library. */
    folder: string;
    /** Generate a thumbnail for images. Default true. */
    generateThumbnail?: boolean;
  }): Promise<UploadResult>;

  /** Delete a previously-uploaded file by its storage key. */
  delete(storageKey: string): Promise<void>;
}

// ============================================================================
// LocalFilesystemAdapter
// ============================================================================

const PUBLIC_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

class LocalFilesystemAdapter implements StorageAdapter {
  /** Public URL prefix that maps to PUBLIC_UPLOADS_DIR. */
  private readonly publicPrefix = "/uploads";

  async upload(params: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    customerId: string | null;
    folder: string;
    generateThumbnail?: boolean;
  }): Promise<UploadResult> {
    const { buffer, fileName, contentType, customerId, folder } = params;

    if (buffer.byteLength > MAX_FILE_SIZE) {
      throw new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);
    }

    // Build the per-tenant subpath: <tenant>/<folder>/<random>-<safeName>
    // Super-admin uploads (customerId=null) go to a shared "_admin" folder.
    const tenantSegment = customerId ? `tenant_${customerId}` : "_admin";
    const safeFolder = sanitizePathSegment(folder || "root");
    const safeName = sanitizeFileName(fileName);
    const uniquePrefix = randomBytes(6).toString("hex");
    const storageKey = `${tenantSegment}/${safeFolder}/${uniquePrefix}-${safeName}`;

    const absPath = path.join(PUBLIC_UPLOADS_DIR, storageKey);
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, buffer);

    const url = `${this.publicPrefix}/${storageKey}`;

    // Generate thumbnail for images (best-effort — fails open if sharp can't process)
    let thumbnailUrl: string | null = null;
    let width: number | null = null;
    let height: number | null = null;

    if (contentType.startsWith("image/")) {
      try {
        const dims = await getImageDimensions(buffer);
        width = dims?.width ?? null;
        height = dims?.height ?? null;

        if (params.generateThumbnail !== false && dims) {
          const thumbBuffer = await generateThumbnail(buffer, contentType);
          if (thumbBuffer) {
            const thumbName = `${uniquePrefix}-thumb-${safeName.replace(/\.[^.]+$/, ".webp")}`;
            const thumbStorageKey = `${tenantSegment}/${safeFolder}/${thumbName}`;
            const thumbAbsPath = path.join(PUBLIC_UPLOADS_DIR, thumbStorageKey);
            await fs.writeFile(thumbAbsPath, thumbBuffer);
            thumbnailUrl = `${this.publicPrefix}/${thumbStorageKey}`;
          }
        }
      } catch (err) {
        console.warn("[storage] thumbnail generation failed:", err instanceof Error ? err.message : String(err));
        // Non-fatal — the original is still uploaded
        thumbnailUrl = url; // fall back to the original as its own thumbnail
      }
    }

    return {
      url,
      thumbnailUrl,
      width,
      height,
      size: buffer.byteLength,
      storageKey,
    };
  }

  async delete(storageKey: string): Promise<void> {
    if (!storageKey) return;
    const absPath = path.join(PUBLIC_UPLOADS_DIR, storageKey);
    try {
      await fs.unlink(absPath);
      // Also try to delete the matching thumbnail if it exists
      const dir = path.dirname(absPath);
      const base = path.basename(absPath);
      const thumbBase = base.replace(/^([a-f0-9]+)-/, "$1-thumb-").replace(/\.[^.]+$/, ".webp");
      const thumbPath = path.join(dir, thumbBase);
      await fs.unlink(thumbPath).catch(() => {});
    } catch {
      // Already deleted / never existed — silent
    }
  }
}

// ============================================================================
// CloudinaryAdapter — CDN-backed storage with auto image optimization
// ============================================================================

/**
 * Cloudinary-backed storage adapter.
 *
 * Files are uploaded to Cloudinary's servers (not the local FS), so this
 * works on Vercel/serverless where the filesystem is read-only.
 *
 * Cloudinary gives us for free:
 *   - Global CDN delivery (res.cloudinary.com)
 *   - On-the-fly image transformations (resize/crop/format/quality)
 *   - Auto format negotiation (serves WebP/AVIF to compatible browsers)
 *   - Video transcoding
 *
 * Required env vars (set in .env):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   CLOUDINARY_FOLDER  (optional, default "socialflow")
 *
 * Enable by setting STORAGE_PROVIDER=cloudinary in .env.
 */
class CloudinaryAdapter implements StorageAdapter {
  private cloudName: string = "";
  private apiKey: string = "";
  private apiSecret: string = "";
  private topFolder: string = "socialflow";
  private _client: any = null;
  private _initialized: boolean = false;

  /**
   * Load credentials. Priority:
   *   1. DB (Integration table where type='cloudinary') — set via Settings UI
   *   2. Process env vars (CLOUDINARY_*) — set in .env
   *
   * This lets admins configure Cloudinary from the Settings → Integrations
   * screen without needing to edit .env + restart the server.
   */
  private async loadCredentials(): Promise<void> {
    if (this._initialized) return;

    // Try DB first
    try {
      const row = await db.integration.findUnique({ where: { type: "cloudinary" } });
      if (row?.enabled && row.credentials) {
        const creds = JSON.parse(row.credentials) as Record<string, string>;
        if (creds.cloudName && creds.apiKey && creds.apiSecret) {
          this.cloudName = creds.cloudName;
          this.apiKey = creds.apiKey;
          this.apiSecret = creds.apiSecret;
          this.topFolder = (creds.folder || "socialflow")
            .replace(/[^a-zA-Z0-9/_-]/g, "_")
            .replace(/^\/+|\/+$/g, "");
          this._initialized = true;
          return;
        }
      }
    } catch (err) {
      console.warn("[storage/cloudinary] Failed to read credentials from DB:", err instanceof Error ? err.message : String(err));
    }

    // Fall back to env vars
    this.cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
    this.apiKey = process.env.CLOUDINARY_API_KEY ?? "";
    this.apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
    this.topFolder = (process.env.CLOUDINARY_FOLDER ?? "socialflow")
      .replace(/[^a-zA-Z0-9/_-]/g, "_")
      .replace(/^\/+|\/+$/g, "");
    this._initialized = true;

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.warn(
        "[storage/cloudinary] Missing credentials. Configure in Settings → Integrations, " +
        "or set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env."
      );
    }
  }

  /** Lazily import + configure the cloudinary SDK so the local adapter path
   *  doesn't pay the import cost. */
  private async getClient(): Promise<any> {
    if (this._client) return this._client;
    await this.loadCredentials();
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error(
        "Cloudinary credentials not configured. Add them in Settings → Integrations → Cloudinary, " +
        "or set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
      );
    }
    const cloudinary = await import("cloudinary");
    const v2 = cloudinary.v2 ?? cloudinary.default?.v2 ?? cloudinary.default;
    v2.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
    this._client = v2;
    return v2;
  }

  async upload(params: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
    customerId: string | null;
    folder: string;
    generateThumbnail?: boolean;
  }): Promise<UploadResult> {
    const { buffer, fileName, contentType, customerId, folder } = params;

    if (buffer.byteLength > MAX_FILE_SIZE) {
      throw new Error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);
    }
    // getClient() calls loadCredentials() so this throws a clear error
    // if credentials aren't configured in either the DB or .env.
    const client = await this.getClient();

    // Build the per-tenant Cloudinary public_id path:
    //   socialflow/tenant_<customerId>/<folder>/<random>-<safeName>
    // Super-admin uploads go to socialflow/_admin/<folder>/...
    const tenantSegment = customerId ? `tenant_${customerId}` : "_admin";
    const safeFolder = sanitizePathSegment(folder || "root");
    const safeName = sanitizeFileName(fileName);
    const uniquePrefix = randomBytes(6).toString("hex");
    const publicIdBase = [
      this.topFolder,
      tenantSegment,
      safeFolder,
      `${uniquePrefix}-${safeName.replace(/\.[^.]+$/, "")}`,
    ].join("/");

    // Decide resource_type — Cloudinary needs this to know how to handle the upload.
    let resourceType: "image" | "video" | "raw" = "image";
    if (contentType.startsWith("video/")) resourceType = "video";
    else if (contentType.startsWith("audio/")) resourceType = "video"; // Cloudinary treats audio as video
    else if (!contentType.startsWith("image/")) resourceType = "raw";

    try {
      // Cloudinary v2's uploader.upload() expects a string (file path or DataURI),
      // NOT a raw Buffer. We use upload_stream() instead, which accepts a Buffer
      // via Node's stream.Writable interface.
      //
      // NOTE: We pass `public_id` with the FULL path (topFolder/tenant/folder/name)
      // but do NOT pass the `folder` option — that would double-prefix the path.
      const result = await new Promise<any>((resolve, reject) => {
        const stream = client.uploader.upload_stream(
          {
            public_id: publicIdBase,
            resource_type: resourceType,
            // Strip metadata + apply quality auto for images (Cloudinary picks best format)
            // Videos get a thumbnail auto-generated by Cloudinary's sprite + transform API
            quality_analysis: false,
          },
          (err: any, res: any) => {
            if (err) reject(err);
            else resolve(res);
          }
        );
        // Write the buffer to the stream + signal end-of-input
        stream.end(buffer);
      });

      const url: string = result.secure_url;
      const publicId: string = result.public_id;
      const width: number | null = result.width ?? null;
      const height: number | null = result.height ?? null;
      const size: number = result.bytes ?? buffer.byteLength;

      // Build a thumbnail URL via Cloudinary's on-the-fly transform API.
      // For images: 400×400 limit-cropped, auto format/quality.
      // For videos: use the auto-generated sprite/poster frame.
      // For raw: no thumbnail.
      let thumbnailUrl: string | null = null;
      if (resourceType === "image") {
        try {
          thumbnailUrl = client.url(publicId, {
            transformation: [
              { width: 400, height: 400, crop: "limit" },
              { fetch_format: "auto", quality: "auto" },
            ],
          });
        } catch {
          thumbnailUrl = url;
        }
      } else if (resourceType === "video") {
        // Cloudinary auto-generates a poster frame for videos. Use it as thumbnail.
        try {
          thumbnailUrl = client.url(publicId, {
            resource_type: "video",
            format: "jpg",
            transformation: [
              { width: 400, height: 400, crop: "limit" },
              { fetch_format: "auto", quality: "auto" },
              { start_offset: "0" },
            ],
          });
        } catch {
          thumbnailUrl = null;
        }
      }

      // storageKey is the Cloudinary public_id — used by delete() later.
      // We store it as the public_id, but persist it without the topFolder
      // prefix since Cloudinary returns the full path.
      return {
        url,
        thumbnailUrl,
        width,
        height,
        size,
        storageKey: publicId,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[storage/cloudinary] upload failed:", msg);
      throw new Error(`Cloudinary upload failed: ${msg}`);
    }
  }

  async delete(storageKey: string): Promise<void> {
    if (!storageKey) return;
    await this.loadCredentials();
    if (!this.cloudName || !this.apiKey || !this.apiSecret) return;

    try {
      const client = await this.getClient();
      // storageKey is the Cloudinary public_id.
      // We need to figure out the resource_type — try image first, fall back to video, then raw.
      // Cloudinary's destroy only accepts one resource_type at a time.
      for (const resourceType of ["image", "video", "raw"] as const) {
        try {
          const result = await client.uploader.destroy(storageKey, {
            resource_type: resourceType,
            invalidate: true,
          });
          // result === { result: "ok" } on success, { result: "not found" } if wrong type
          if (result?.result === "ok") return;
        } catch {
          // Try next resource_type
        }
      }
    } catch (err) {
      console.warn(
        "[storage/cloudinary] delete failed:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function sanitizePathSegment(segment: string): string {
  // Strip path separators, keep alphanumerics + dash + underscore
  const cleaned = segment.replace(/[^a-zA-Z0-9-_]/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "root";
}

function sanitizeFileName(name: string): string {
  // Keep the extension + alphanumerics, replace spaces with underscores
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60);
  return `${base || "file"}${ext}`;
}

async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    if (meta.width && meta.height) {
      return { width: meta.width, height: meta.height };
    }
  } catch {
    // sharp not installed or unsupported format
  }
  return null;
}

async function generateThumbnail(buffer: Buffer, contentType: string): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    // Skip GIFs (sharp doesn't handle animated GIFs well) and SVGs (vector)
    if (contentType === "image/gif" || contentType === "image/svg+xml") return null;
    return await sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}

// ============================================================================
// Factory: pick the active adapter based on STORAGE_PROVIDER env var
// ============================================================================

let _adapter: StorageAdapter | null = null;

function getAdapter(): StorageAdapter {
  if (_adapter) return _adapter;
  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  switch (provider) {
    case "local":
    case "filesystem":
      _adapter = new LocalFilesystemAdapter();
      return _adapter;
    case "cloudinary":
      _adapter = new CloudinaryAdapter();
      return _adapter;
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
  }
}

export interface StorageStatus {
  /** Active adapter name. */
  provider: string;
  /** True when the adapter has all required credentials configured. */
  configured: boolean;
  /** Human-readable status message. */
  message: string;
  /** Cloudinary-specific info (only when provider === "cloudinary"). */
  cloudName?: string;
  /** Top-level folder inside Cloudinary where uploads are organised. */
  folder?: string;
  /** Source of the credentials — "db" (Settings UI) or "env" (.env file) or "none". */
  credentialSource?: "db" | "env" | "none";
}

/**
 * Returns the active provider + whether credentials are configured.
 * Used by the /api/storage/status endpoint + the Settings → Integrations UI.
 *
 * For Cloudinary, checks DB first (Settings UI config), then env vars.
 */
export async function getStatus(): Promise<StorageStatus> {
  const provider = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase();
  if (provider === "cloudinary") {
    // Check DB first
    try {
      const row = await db.integration.findUnique({ where: { type: "cloudinary" } });
      if (row?.enabled && row.credentials) {
        const creds = JSON.parse(row.credentials) as Record<string, string>;
        if (creds.cloudName && creds.apiKey && creds.apiSecret) {
          return {
            provider: "cloudinary",
            configured: true,
            message: "Cloudinary credentials configured via Settings — uploads go to your Cloudinary CDN.",
            cloudName: creds.cloudName,
            folder: creds.folder || "socialflow",
            credentialSource: "db",
          };
        }
      }
    } catch (err) {
      console.warn("[storage] Failed to read Cloudinary credentials from DB:", err instanceof Error ? err.message : String(err));
    }
    // Fall back to env vars
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
    const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
    const configured = !!(cloudName && apiKey && apiSecret);
    return {
      provider: "cloudinary",
      configured,
      message: configured
        ? "Cloudinary credentials configured via .env — uploads go to your Cloudinary CDN."
        : "Cloudinary credentials not configured. Add them via Settings → Integrations → Cloudinary, or set CLOUDINARY_* env vars.",
      cloudName: cloudName || undefined,
      folder: (process.env.CLOUDINARY_FOLDER ?? "socialflow"),
      credentialSource: configured ? "env" : "none",
    };
  }
  if (provider === "local" || provider === "filesystem") {
    return {
      provider: "local",
      configured: true,
      message: "Files stored on the local filesystem at public/uploads/. Use STORAGE_PROVIDER=cloudinary for production.",
      credentialSource: "none",
    };
  }
  return {
    provider,
    configured: false,
    message: `Unknown STORAGE_PROVIDER: ${provider}`,
    credentialSource: "none",
  };
}

/** Invalidate the cached storage adapter so the next call re-reads credentials
 *  from the DB. Called by /api/integrations when Cloudinary credentials are
 *  saved or cleared. */
export function invalidateStorageAdapter(): void {
  _adapter = null;
}

/** Public API — used by /api/media/upload route */
export const storage = {
  upload: (params: Parameters<StorageAdapter["upload"]>[0]) => getAdapter().upload(params),
  delete: (storageKey: string) => getAdapter().delete(storageKey),
};

export const MAX_UPLOAD_SIZE = MAX_FILE_SIZE;
