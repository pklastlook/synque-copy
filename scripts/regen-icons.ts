/**
 * Regenerate ALL PNG icons from public/icon.svg
 * Produces: icon-192, icon-512, apple-touch-icon (180), favicon-32, favicon-16
 * Also produces favicon.ico (PNG-wrapped, supported by all modern browsers).
 *
 * Run: bun run scripts/regen-icons.ts
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const svgPath = resolve(ROOT, "public/icon.svg");
const svgBuffer = readFileSync(svgPath);

interface IconJob {
  out: string;
  size: number;
}

const jobs: IconJob[] = [
  { out: "public/icon-512.png", size: 512 },
  { out: "public/icon-192.png", size: 192 },
  { out: "public/apple-touch-icon.png", size: 180 },
  { out: "public/favicon-32.png", size: 32 },
  { out: "public/favicon-16.png", size: 16 },
  { out: "src/app/favicon.ico", size: 32 }, // browsers accept PNG as .ico
];

async function regen() {
  console.log("Regenerating icons from", svgPath);
  for (const job of jobs) {
    const dest = resolve(ROOT, job.out);
    await sharp(svgBuffer, { density: 384 })
      .resize(job.size, job.size, { fit: "cover" })
      .png()
      .toFile(dest);
    console.log(`  ✓ ${job.out} (${job.size}×${job.size})`);
  }
  console.log("Done. All icons regenerated.");
}

regen().catch((e) => {
  console.error(e);
  process.exit(1);
});
