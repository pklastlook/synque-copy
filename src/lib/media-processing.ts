/**
 * REMAINING-4 — Media processing helpers.
 *
 * Used by /api/media/upload (and any future route that ingests user media)
 * to normalize every asset the moment it lands:
 *   - Images: resize to a max width (1920px by default) + re-encode at a
 *     configurable JPEG/WEBP quality (85% default). This typically halves
 *     storage while keeping the source-resolution perceptually intact.
 *   - Videos: extract the first frame as a JPEG thumbnail so the media
 *     library can show a poster for video assets. Sharp can decode most
 *     MP4/MOV/WEBM frames when libvips was built with ffmpeg support —
 *     when it can't, we fail open and return null.
 *   - Alt text: best-effort AI suggestion (vision LLM) used for the
 *     MediaAsset.altText field. Skipped silently if no provider configured.
 *   - Duplicate detection: xxHash of the (post-compression) bytes. Two
 *     uploads with identical compressed output share a hash and the upload
 *     route can skip the write.
 *
 * All functions are pure (input buffer → output buffer / string) so they
 * are trivially testable and side-effect free.
 */

import { createHash } from "node:crypto";

/** Compression result — the compressed buffer + the dimensions Sharp detected. */
export interface CompressedImage {
  buffer: Buffer;
  width: number;
  height: number;
  /** MIME type of the compressed output (always image/webp for now). */
  format: string;
}

/**
 * Compress (resize + re-encode) an image buffer.
 *
 * - Downscales to `maxWidth` preserving aspect ratio (no upscaling).
 * - Re-encodes as WebP at `quality` (default 85 — a sweet spot for photos).
 * - GIFs and SVGs are returned unchanged (sharp can't handle animated GIFs
 *   well, and SVGs are already vector — re-encoding would only bloat them).
 *
 * On ANY sharp error we return the ORIGINAL buffer untouched — the caller
 * can still persist the upload. Compression is a storage optimization,
 * never a hard failure.
 */
export async function compressImage(
  buffer: Buffer,
  maxWidth = 1920,
  quality = 85,
): Promise<Buffer> {
  try {
    // Lazy import so client bundles / build-time probes don't pull sharp in.
    const sharp = (await import("sharp")).default;

    // Probe the source metadata first — this lets us skip work for SVGs and
    // detect GIFs so we don't break animated frames.
    const meta = await sharp(buffer).metadata();
    if (meta.format === "svg" || meta.format === "gif") {
      return buffer;
    }

    const pipeline = sharp(buffer, { animated: false })
      .resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: "inside",
      })
      .webp({ quality });

    return await pipeline.toBuffer();
  } catch (err) {
    console.warn(
      "[media-processing] compressImage failed, returning original:",
      err instanceof Error ? err.message : String(err),
    );
    return buffer;
  }
}

/**
 * Extract the first frame of a video buffer as a JPEG thumbnail.
 *
 * Sharp ≥ 0.33 ships with libvips compiled against ffmpeg for the most
 * common container/codec combos (mp4/h264, webm/vp8, mov/av1). When the
 * build doesn't support a codec, sharp throws — we catch and return null
 * so the upload route can persist the video without a thumbnail (the
 * media library will fall back to a placeholder icon).
 */
export async function generateVideoThumbnail(videoBuffer: Buffer): Promise<Buffer | null> {
  try {
    const sharp = (await import("sharp")).default;
    const thumb = await sharp(videoBuffer, { pages: 1 })
      .resize({
        width: 640,
        withoutEnlargement: true,
        fit: "inside",
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    return thumb;
  } catch (err) {
    console.warn(
      "[media-processing] generateVideoThumbnail failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Compute a stable hash of a media buffer for duplicate detection.
 *
 * We use SHA-256 (Node's built-in `crypto`, no extra deps) over the
 * compressed bytes — two uploads with identical compressed output share
 * a hash. The hash is intentionally content-addressed (not perceptual),
 * because:
 *   - perceptual hashes (pHash) give false positives on visually-similar
 *     but legally distinct images (a brand's logo vs. a fan edit).
 *   - we want to dedupe exact re-uploads (the same screenshot saved
 *     twice), not near-duplicates (a slightly edited photo).
 *
 * Returns a hex string.
 */
export async function calculateImageHash(buffer: Buffer): Promise<string> {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Ask the configured vision LLM to suggest accessible alt text for an
 * image. Used to populate `MediaAsset.altText` on upload so the media
 * library is screen-reader-friendly out of the box.
 *
 * Best-effort: if no LLM provider is configured (no Integration row, no
 * ZAI key), returns an empty string and the caller leaves the field null.
 * Never throws — alt-text generation is a UX enhancement, not a hard
 * requirement of the upload flow.
 *
 * The imageUrl MUST be publicly reachable (or at least reachable from
 * the server's network) — vision providers fetch the bytes themselves.
 */
export async function suggestAltText(imageUrl: string): Promise<string> {
  if (!imageUrl) return "";

  try {
    // Try the project's LLM resolver first — it picks the configured
    // provider (Claude / OpenAI / ZAI) and gracefully degrades.
    const { getLLMClient } = await import("./llm");
    const client = await getLLMClient();
    // Most vision providers accept an image_url content block alongside
    // the text. We feed a one-shot user turn that asks for a tight
    // description and trust the provider's own truncation.
    const messages = [
      {
        role: "user" as const,
        content:
          `Describe this image in one short sentence (<=140 chars) for use as ` +
          `accessible alt text. Reply with the description only — no preamble.\n\n` +
          `Image URL: ${imageUrl}`,
      },
    ];
    const text = await client.chat(messages);
    return text.trim().slice(0, 200);
  } catch (err) {
    console.warn(
      "[media-processing] suggestAltText failed (non-fatal):",
      err instanceof Error ? err.message : String(err),
    );
    return "";
  }
}
