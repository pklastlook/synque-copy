import { db } from "@/lib/db";
async function main() {
  const p = await db.post.findUnique({
    where: { id: "cmue36gqx000004jsp8pqsbpl" },
    include: { variants: true },
  });
  if (!p) { console.log("NOT FOUND"); process.exit(1); }
  console.log("post:", {
    id: p.id,
    title: p.title,
    caption: p.caption.slice(0, 60) + (p.caption.length > 60 ? "…" : ""),
    status: p.status,
    tone: p.tone,
    updatedAt: p.updatedAt.toISOString(),
    variants: p.variants.length,
  });
  for (const v of p.variants) {
    console.log("  variant:", { id: v.id.slice(-6), accountId: v.accountId, status: v.status, content: v.content.slice(0, 50) });
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
