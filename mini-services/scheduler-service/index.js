/**
 * Scheduler Mini-Service
 *
 * Periodically checks for posts with status="scheduled" whose scheduledAt
 * time has passed and publishes them to their target platforms by calling
 * the main app's /api/publish/[platform] endpoint.
 *
 * Port: 3003 (HTTP health check only — the actual work is a polling loop)
 *
 * Environment:
 *   DATABASE_URL or DIRECT_URL — Neon PostgreSQL connection
 *   APP_URL — base URL of the main app (default: http://localhost:3000)
 */
import { createServer } from "node:http";
import { config } from "dotenv";
config({ override: true });
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const PORT = 3003;
const POLL_INTERVAL_MS = 60 * 1000; // Check every 60 seconds
// Clean the DB URL (strip channel_binding=require)
function cleanDbUrl(url) {
    return url.replace(/&?channel_binding=require/g, "").replace(/\?$/, "");
}
async function getDbUrl() {
    const direct = process.env.DIRECT_URL;
    if (direct && direct.startsWith("postgresql://"))
        return cleanDbUrl(direct);
    const db = process.env.DATABASE_URL;
    if (db && db.startsWith("postgresql://"))
        return cleanDbUrl(db);
    throw new Error("No PostgreSQL URL found");
}
async function publishScheduledPosts() {
    let dbUrl;
    try {
        dbUrl = await getDbUrl();
    }
    catch (e) {
        console.error("[scheduler] No DB URL — skipping");
        return;
    }
    // We query the DB directly to find due scheduled posts
    const { PrismaClient } = await import("../../generated/client");
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    const adapter = new PrismaNeon({ connectionString: dbUrl });
    const db = new PrismaClient({ adapter });
    try {
        const now = new Date();
        // Find all scheduled posts whose time has come
        const duePosts = await db.post.findMany({
            where: {
                status: "scheduled",
                scheduledAt: { lte: now },
            },
            include: {
                variants: { include: { account: true } },
                author: true,
            },
        });
        if (duePosts.length === 0) {
            console.log(`[scheduler] ${now.toISOString()} — No scheduled posts due`);
            return;
        }
        console.log(`[scheduler] ${now.toISOString()} — Found ${duePosts.length} scheduled post(s) to publish`);
        for (const post of duePosts) {
            console.log(`[scheduler] Publishing post "${post.title}" (${post.id})`);
            for (const variant of post.variants) {
                if (variant.status !== "scheduled")
                    continue;
                const platform = variant.account.platform === "x" ? "twitter" : variant.account.platform;
                const content = variant.hashtags
                    ? `${variant.content}\n\n${variant.hashtags.split(",").map(t => `#${t.trim()}`).join(" ")}`
                    : variant.content;
                try {
                    const res = await fetch(`${APP_URL}/api/publish/${platform}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userId: post.authorId,
                            accountId: variant.accountId,
                            content,
                        }),
                    });
                    const json = await res.json();
                    if (res.ok && json.ok) {
                        // Mark variant as published
                        await db.postVariant.update({
                            where: { id: variant.id },
                            data: {
                                status: "published",
                                publishedAt: new Date(),
                            },
                        });
                        console.log(`[scheduler] ✓ Published to ${variant.account.handle} on ${platform}`);
                    }
                    else {
                        // Mark variant as failed
                        await db.postVariant.update({
                            where: { id: variant.id },
                            data: { status: "failed" },
                        });
                        console.error(`[scheduler] ✗ Failed to publish to ${variant.account.handle}: ${json.error ?? "Unknown"}`);
                    }
                }
                catch (e) {
                    console.error(`[scheduler] ✗ Network error publishing to ${variant.account.handle}:`, e);
                    await db.postVariant.update({
                        where: { id: variant.id },
                        data: { status: "failed" },
                    }).catch(() => { });
                }
            }
            // Update post status
            const allVariants = post.variants;
            const allPublished = allVariants.every(v => v.status === "published");
            const anyFailed = allVariants.some(v => v.status === "failed");
            await db.post.update({
                where: { id: post.id },
                data: {
                    status: allPublished ? "published" : anyFailed ? "failed" : "scheduled",
                },
            });
            // Log activity
            await db.activity.create({
                data: {
                    userId: post.authorId,
                    type: allPublished ? "post_published" : "post_scheduled",
                    description: allPublished
                        ? `auto-published "${post.title}" to ${allVariants.length} account(s)`
                        : `partially published "${post.title}" — some accounts failed`,
                },
            }).catch(() => { });
        }
    }
    catch (e) {
        console.error("[scheduler] Error during publish loop:", e);
    }
    finally {
        await db.$disconnect();
    }
}
// HTTP health check server
const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "running",
        service: "scheduler",
        pollInterval: POLL_INTERVAL_MS,
        appUrl: APP_URL,
        timestamp: new Date().toISOString(),
    }));
});
async function main() {
    process.on("unhandledRejection", (err) => console.error("[scheduler] Unhandled:", err));
    process.on("uncaughtException", (err) => console.error("[scheduler] Uncaught:", err));
    server.listen(PORT, () => {
        console.log(`[scheduler] Health check on http://localhost:${PORT}`);
        console.log(`[scheduler] Polling every ${POLL_INTERVAL_MS / 1000}s for scheduled posts`);
        console.log(`[scheduler] App URL: ${APP_URL}`);
    });
    // Run immediately, then on interval
    await publishScheduledPosts();
    setInterval(publishScheduledPosts, POLL_INTERVAL_MS);
    console.log("[scheduler] Running. Press Ctrl+C to stop.");
}
main().catch(console.error);
