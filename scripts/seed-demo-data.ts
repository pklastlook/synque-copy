/**
 * SYNQUE — Comprehensive Demo Data Seed Script
 *
 * Creates rich, realistic dummy data across ALL modules of the SYNQUE
 * social-media management platform. Designed for client demos — every
 * module has plenty of realistic, varied data.
 *
 * Idempotent: safe to run multiple times. Uses upsert (where unique
 * constraints exist) and check-first (otherwise) patterns.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-data.ts
 *   npx tsx scripts/seed-demo-data.ts --force   # wipe demo data first, then re-seed
 *
 * Data created (approximately):
 *   - 1 demo admin user + 3 team members (manager, editor, viewer)
 *   - 11 social accounts across 7 platforms (Instagram, TikTok, LinkedIn, X, Facebook, YouTube, Threads)
 *   - AccountHealth + AccountProtection for each account
 *   - 11 posts (3 published, 2 scheduled, 2 draft, 2 failed, 1 pending-approval via Approval, 1 extra draft)
 *   - 2-3 PostVariants per published/scheduled post
 *   - 15 comments (positive / neutral / negative — replied + unreplied)
 *   - 30 days of AnalyticsDaily per account (~330 records)
 *   - 12 activity feed entries
 *   - 3 campaigns (active / completed / draft)
 *   - 10 tasks (3 pending, 2 in-progress, 3 completed, 2 overdue)
 *   - 5 approvals (2 pending, 1 approved, 1 rejected, 1 changes_requested)
 *   - 5 hashtag groups
 *   - 4 competitors with 2 snapshots each
 *   - 4 listening queries
 *   - 6 influencers
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "../generated/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

// ----------------------------------------------------------------------------
// .env loader (manual — no dotenv dependency)
// ----------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    // ALWAYS overwrite — the .env file is authoritative for this script.
    // (The parent shell may export a different DATABASE_URL — e.g. a local
    // PGlite file:// path used in dev — which we explicitly want to override
    // here so the seed writes to the Neon production database.)
    process.env[key] = value;
  }
}

loadEnvFile(resolve(projectRoot, ".env"));
loadEnvFile(resolve(projectRoot, ".env.local"));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || !DATABASE_URL.startsWith("postgresql://")) {
  console.error("❌ DATABASE_URL not set or not a PostgreSQL URL. Check .env");
  console.error("    Resolved .env path:", resolve(projectRoot, ".env"));
  process.exit(1);
}

// Neon adapter doesn't accept channel_binding in some configs — strip it.
const cleanUrl = DATABASE_URL.replace(/&?channel_binding=require/g, "").replace(/\?$/, "");

// ----------------------------------------------------------------------------
// Prisma client (Neon adapter)
// ----------------------------------------------------------------------------
const adapter = new PrismaNeon({ connectionString: cleanUrl });
const db = new PrismaClient({ adapter });

const FORCE = process.argv.includes("--force");

// ----------------------------------------------------------------------------
// Time helpers (timestamps spread across last 30 days)
// ----------------------------------------------------------------------------
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW - n * DAY_MS);
const hoursAgo = (n: number) => new Date(NOW - n * HOUR_MS);
const daysFromNow = (n: number) => new Date(NOW + n * DAY_MS);
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ----------------------------------------------------------------------------
// Safe wrapper — log + continue on individual record failures
// ----------------------------------------------------------------------------
async function safe<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ⚠️  ${label} failed: ${msg}`);
    return null;
  }
}

function section(name: string): void {
  console.log(`\n▶ ${name}`);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

// ----------------------------------------------------------------------------
// Helpers for IDs of team members (so we can refer to them later)
// ----------------------------------------------------------------------------
let demoUserId = "";
let managerId = "";
let editorId = "";
let viewerId = "";

// ----------------------------------------------------------------------------
// 1. Users — demo admin + 3 team members
// ----------------------------------------------------------------------------
async function seedUsers(): Promise<void> {
  section("1/13 — Users (demo admin + team members)");

  const hashedPassword = await bcrypt.hash("demo123456", 12);

  const demoUser = await db.user.upsert({
    where: { email: "demo@synque.app" },
    update: {
      role: "admin",
      title: "Head of Social",
      department: "Marketing",
      lastActive: new Date(),
      emailVerified: new Date(),
    },
    create: {
      name: "Alex Rivera",
      email: "demo@synque.app",
      password: hashedPassword,
      role: "admin",
      title: "Head of Social",
      department: "Marketing",
      color: "violet",
      avatar:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/avatars/alex-rivera.jpg",
      permissions: JSON.stringify(["*"]),
      status: "active",
      bio: "Building SYNQUE — the future of social media management. Coffee enthusiast ☕.",
      timezone: "America/New_York",
      language: "en-US",
      gender: "other",
      lastActive: new Date(),
      emailVerified: new Date(),
      createdAt: daysAgo(120),
    },
  });
  demoUserId = demoUser.id;
  ok(`Demo admin: ${demoUser.email} (${demoUser.role}) — password: demo123456`);

  const teamMembers = [
    {
      name: "Sarah Chen",
      email: "sarah@synque.app",
      role: "manager",
      title: "Social Media Manager",
      department: "Content",
      color: "pink",
      gender: "female",
    },
    {
      name: "Marcus Johnson",
      email: "marcus@synque.app",
      role: "editor",
      title: "Content Editor",
      department: "Content",
      color: "blue",
      gender: "male",
    },
    {
      name: "Priya Patel",
      email: "priya@synque.app",
      role: "viewer",
      title: "Analytics Viewer",
      department: "Analytics",
      color: "amber",
      gender: "female",
    },
  ];

  const created: string[] = [];
  for (const m of teamMembers) {
    const u = await db.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        name: m.name,
        email: m.email,
        password: hashedPassword,
        role: m.role,
        title: m.title,
        department: m.department,
        color: m.color,
        gender: m.gender,
        avatar: `https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/avatars/${m.name
          .toLowerCase()
          .replace(/\s+/g, "-")}.jpg`,
        permissions: JSON.stringify([]),
        status: "active",
        bio: `${m.title} at SYNQUE. Passionate about great content + great data.`,
        timezone: "America/New_York",
        language: "en-US",
        lastActive: daysAgo(randInt(1, 5)),
        emailVerified: daysAgo(randInt(50, 80)),
        createdAt: daysAgo(randInt(60, 90)),
      },
    });
    created.push(u.id);
  }
  managerId = created[0];
  editorId = created[1];
  viewerId = created[2];
  ok(`Team members: 3 (manager=${managerId.slice(-6)}, editor=${editorId.slice(-6)}, viewer=${viewerId.slice(-6)})`);
}

// ----------------------------------------------------------------------------
// 2. Accounts (11 across 7 platforms)
// ----------------------------------------------------------------------------
let accountIds: { [key: string]: string } = {};

async function seedAccounts(): Promise<void> {
  section("2/13 — Social Media Accounts");

  const existing = await db.account.findMany({ where: { ownerId: demoUserId } });
  if (existing.length > 0 && !FORCE) {
    for (const a of existing) accountIds[`${a.platform}:${a.handle}`] = a.id;
    ok(`Already have ${existing.length} accounts — reusing (use --force to re-seed)`);
    return;
  }

  if (FORCE) {
    // Cleanest re-seed: wipe demo-owned accounts (cascade takes care of health/protection).
    // For records that don't cascade (Comments, AnalyticsDaily, PostVariants), we delete them first.
    const ids = existing.map((a) => a.id);
    if (ids.length) {
      await db.comment.deleteMany({ where: { accountId: { in: ids } } }).catch(() => {});
      await db.analyticsDaily.deleteMany({ where: { accountId: { in: ids } } }).catch(() => {});
      await db.postVariant.deleteMany({ where: { accountId: { in: ids } } }).catch(() => {});
      await db.accountHealth.deleteMany({ where: { accountId: { in: ids } } }).catch(() => {});
      await db.accountProtection.deleteMany({ where: { accountId: { in: ids } } }).catch(() => {});
      await db.account.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
      ok(`Force mode — wiped ${ids.length} existing accounts`);
    }
  }

  const defs = [
    // Instagram — 2 healthy + 1 risky
    {
      key: "ig:lumen",
      platform: "instagram",
      handle: "lumen.studio",
      displayName: "Lumen Studio",
      followers: 24815,
      postsCount: 412,
      verified: true,
      risky: false,
    },
    {
      key: "ig:aurora",
      platform: "instagram",
      handle: "aurora.labs",
      displayName: "Aurora Labs",
      followers: 18542,
      postsCount: 287,
      verified: false,
      risky: false,
    },
    {
      key: "ig:flash",
      platform: "instagram",
      handle: "flash.trends",
      displayName: "Flash Trends",
      followers: 5418,
      postsCount: 156,
      verified: false,
      risky: true,
    },
    // TikTok — 1 healthy + 1 risky
    {
      key: "tt:lumen",
      platform: "tiktok",
      handle: "lumen.studio",
      displayName: "Lumen Studio",
      followers: 64230,
      postsCount: 89,
      verified: true,
      risky: false,
    },
    {
      key: "tt:viral",
      platform: "tiktok",
      handle: "viral.flash",
      displayName: "Viral Flash",
      followers: 12340,
      postsCount: 234,
      verified: false,
      risky: true,
    },
    // LinkedIn — 1 healthy company page
    {
      key: "li:lumen",
      platform: "linkedin",
      handle: "lumen-labs",
      displayName: "Lumen Labs",
      followers: 8920,
      postsCount: 124,
      verified: true,
      risky: false,
    },
    // X/Twitter — 1 healthy + 1 risky
    {
      key: "x:lumen",
      platform: "x",
      handle: "lumenstudio",
      displayName: "Lumen Studio",
      followers: 31204,
      postsCount: 1842,
      verified: true,
      risky: false,
    },
    {
      key: "x:flash",
      platform: "x",
      handle: "flash_news",
      displayName: "Flash News",
      followers: 8742,
      postsCount: 4220,
      verified: false,
      risky: true,
    },
    // Facebook — 1 healthy page
    {
      key: "fb:lumen",
      platform: "facebook",
      handle: "lumen.studio.fb",
      displayName: "Lumen Studio",
      followers: 15621,
      postsCount: 312,
      verified: true,
      risky: false,
    },
    // YouTube — 1 channel
    {
      key: "yt:lumen",
      platform: "youtube",
      handle: "lumenstudio",
      displayName: "Lumen Studio",
      followers: 42108,
      postsCount: 142,
      verified: true,
      risky: false,
    },
    // Threads — 1 account
    {
      key: "th:lumen",
      platform: "threads",
      handle: "lumen.studio",
      displayName: "Lumen Studio",
      followers: 9841,
      postsCount: 78,
      verified: false,
      risky: false,
    },
  ];

  let created = 0;
  for (const d of defs) {
    const existing = await db.account.findFirst({
      where: { ownerId: demoUserId, platform: d.platform, handle: d.handle },
    });
    if (existing) {
      accountIds[d.key] = existing.id;
      continue;
    }
    const acc = await safe(`Create ${d.platform}/${d.handle}`, () =>
      db.account.create({
        data: {
          platform: d.platform,
          handle: d.handle,
          displayName: d.displayName,
          avatar: `https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/avatars/${d.platform}-${d.handle.replace(
            /[^a-z0-9]/g,
            ""
          )}.jpg`,
          followers: d.followers,
          postsCount: d.postsCount,
          verified: d.verified,
          ownerId: demoUserId,
          customerId: null, // super-admin sees all tenants
          createdAt: daysAgo(randInt(40, 95)),
        },
      })
    );
    if (acc) {
      accountIds[d.key] = acc.id;
      created++;
    }
  }
  ok(`Created ${created} new accounts · ${defs.length} total in use across 7 platforms`);
}

// ----------------------------------------------------------------------------
// 3. AccountHealth + AccountProtection
// ----------------------------------------------------------------------------
async function seedAccountHealth(): Promise<void> {
  section("3/13 — Account Health & Protection");

  let processed = 0;
  for (const key of Object.keys(accountIds)) {
    const accId = accountIds[key];
    const risky = key.includes("flash") || key.includes("viral");

    const health = risky
      ? {
          riskScore: randInt(72, 92),
          riskLevel: pick(["elevated", "high", "critical"]) as string,
          status: pick(["warning", "restricted", "suspended"]) as string,
          positiveCount: randInt(15, 30),
          neutralCount: randInt(40, 60),
          negativeCount: randInt(20, 40),
          reportCount: randInt(15, 40),
          reportTrend: randInt(5, 20),
          riskReasons: JSON.stringify([
            "spam_flagged",
            "high_report_rate",
            "rapid_follow_unfollow",
            "duplicate_content",
          ]),
        }
      : {
          riskScore: randInt(5, 20),
          riskLevel: "safe" as string,
          status: "healthy" as string,
          positiveCount: randInt(55, 75),
          neutralCount: randInt(20, 35),
          negativeCount: randInt(5, 12),
          reportCount: randInt(0, 3),
          reportTrend: randInt(-2, 1),
          riskReasons: JSON.stringify([]),
        };

    await safe(`Health for ${key}`, () =>
      db.accountHealth.upsert({
        where: { accountId: accId },
        update: {
          riskScore: health.riskScore,
          riskLevel: health.riskLevel,
          status: health.status,
          positiveCount: health.positiveCount,
          neutralCount: health.neutralCount,
          negativeCount: health.negativeCount,
          reportCount: health.reportCount,
          reportTrend: health.reportTrend,
          riskReasons: health.riskReasons,
          lastUpdated: daysAgo(randInt(0, 3)),
        },
        create: {
          accountId: accId,
          riskScore: health.riskScore,
          riskLevel: health.riskLevel,
          status: health.status,
          positiveCount: health.positiveCount,
          neutralCount: health.neutralCount,
          negativeCount: health.negativeCount,
          reportCount: health.reportCount,
          reportTrend: health.reportTrend,
          riskReasons: health.riskReasons,
          lastUpdated: daysAgo(randInt(0, 3)),
        },
      })
    );

    await safe(`Protection for ${key}`, () =>
      db.accountProtection.upsert({
        where: { accountId: accId },
        update: {},
        create: {
          accountId: accId,
          dailyPostLimit: 4,
          hourlyPostLimit: 2,
          minMinutesBetweenPosts: 30,
          autoFlagSensitiveContent: true,
          blockDuplicateContent: true,
          blockBannedHashtags: true,
          bannedHashtags: "spam,scam,giveaway,follow4follow,like4like",
          enforceWarmupProfile: true,
          limitDMsPerHour: 20,
          limitFollowsPerHour: 15,
          limitCommentsPerHour: 30,
          pausePostingOnWarning: true,
          cooldownHoursOnFlag: 24,
          requireTwoFactor: true,
          enabled: true,
          lastAudit: daysAgo(randInt(1, 7)),
        },
      })
    );
    processed++;
  }
  ok(`Upserted health + protection for ${processed} accounts`);
}

// ----------------------------------------------------------------------------
// 4. Posts + PostVariants
// ----------------------------------------------------------------------------
let postIds: { [key: string]: string } = {};

async function seedPosts(): Promise<void> {
  section("4/13 — Posts + PostVariants");

  const existingCount = await db.post.count({ where: { authorId: demoUserId } });
  if (existingCount > 0 && !FORCE) {
    const existing = await db.post.findMany({
      where: { authorId: demoUserId },
      orderBy: { createdAt: "asc" },
    });
    existing.forEach((p, i) => (postIds[`p${i + 1}`] = p.id));
    ok(`Already have ${existingCount} posts — reusing (use --force to re-seed)`);
    return;
  }

  if (FORCE && existingCount > 0) {
    await db.postVariant.deleteMany({ where: { post: { authorId: demoUserId } } }).catch(() => {});
    await db.post.deleteMany({ where: { authorId: demoUserId } }).catch(() => {});
    ok(`Force mode — wiped ${existingCount} existing posts`);
  }

  // Post definitions — 11 posts (3 published, 2 scheduled, 2 draft, 2 failed, 1 pending-approval via Approval, 1 extra)
  type PostDef = {
    key: string;
    title: string;
    caption: string;
    mediaUrl: string;
    mediaType: "image" | "video" | "carousel" | "none";
    tone: string;
    status: "published" | "scheduled" | "draft" | "failed";
    scheduledAt: Date | null;
    publishedAgoDays: number | null;
  };

  const posts: PostDef[] = [
    {
      key: "p1",
      title: "Summer Collection Launch",
      caption:
        "Meet our new Summer Collection ☀️ Lightweight, breathable, and made for adventure. Tap to shop the full drop — link in bio. #LumenSummer #NewArrivals",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/summer-launch.jpg",
      mediaType: "image",
      tone: "confident",
      status: "published",
      scheduledAt: null,
      publishedAgoDays: 5,
    },
    {
      key: "p2",
      title: "Behind the Scenes — Studio Tour",
      caption:
        "Ever wonder how we make the magic happen? 👀 Take a peek inside our Brooklyn studio where every Lumen piece is designed + tested. Full video drops Friday.",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/studio-tour.mp4",
      mediaType: "video",
      tone: "playful",
      status: "published",
      scheduledAt: null,
      publishedAgoDays: 8,
    },
    {
      key: "p3",
      title: "Customer Spotlight — Maya's Story",
      caption:
        "Maya has been a Lumen customer since day one. Her favorite piece? The Aurora Jacket — 'it goes with everything and never wrinkles.' 💜 Thank you Maya for being part of our journey.",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/maya-story.jpg",
      mediaType: "image",
      tone: "warm",
      status: "published",
      scheduledAt: null,
      publishedAgoDays: 12,
    },
    {
      key: "p4",
      title: "Sustainability Report 2026",
      caption:
        "Our annual sustainability report is live. 78% of materials now recycled or organic. 42% reduction in water use. 12 factories audited. Read the full report at lumen.studio/sustainability",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/sustainability.jpg",
      mediaType: "image",
      tone: "professional",
      status: "scheduled",
      scheduledAt: daysFromNow(3),
      publishedAgoDays: null,
    },
    {
      key: "p5",
      title: "Weekend Giveaway 🎁",
      caption:
        "It's giveaway time! We're giving 5 lucky followers a free Aurora Jacket. To enter: follow @lumen.studio, like this post, and tag 2 friends in the comments. Winners announced Monday.",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/giveaway.jpg",
      mediaType: "image",
      tone: "playful",
      status: "scheduled",
      scheduledAt: daysFromNow(2),
      publishedAgoDays: null,
    },
    {
      key: "p6",
      title: "Fall Lookbook — Draft",
      caption:
        "Drafting the Fall lookbook. Colors are warming up — burnt sienna, deep olive, charcoal. Need to finalize styling before shoot next week.",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/fall-draft.jpg",
      mediaType: "image",
      tone: "professional",
      status: "draft",
      scheduledAt: null,
      publishedAgoDays: null,
    },
    {
      key: "p7",
      title: "Influencer Collab — Draft",
      caption:
        "Working on the @aurora.labs collab announcement. Need legal review on contract terms before posting.",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/collab-draft.jpg",
      mediaType: "image",
      tone: "professional",
      status: "draft",
      scheduledAt: null,
      publishedAgoDays: null,
    },
    {
      key: "p8",
      title: "Flash Sale Announcement",
      caption:
        "24-hour flash sale — 30% off everything. Code: FLASH30 at checkout. T&Cs apply.",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/flash-sale.jpg",
      mediaType: "image",
      tone: "urgent",
      status: "failed",
      scheduledAt: daysAgo(2),
      publishedAgoDays: null,
    },
    {
      key: "p9",
      title: "LinkedIn Thought Leadership",
      caption:
        "The future of remote-first culture isn't about being 'remote' — it's about being intentional. Here are 5 lessons from our first 3 years at Lumen Labs.",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/remote-culture.jpg",
      mediaType: "image",
      tone: "professional",
      status: "failed",
      scheduledAt: daysAgo(1),
      publishedAgoDays: null,
    },
    {
      key: "p10",
      title: "Black Friday Teaser — Pending Approval",
      caption:
        "Mark your calendars. Black Friday is coming — and we're bringing the heat. Stay tuned for our biggest drop of the year. 🔥",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/bf-teaser.jpg",
      mediaType: "image",
      tone: "playful",
      status: "draft", // pending approval = draft + linked Approval record
      scheduledAt: null,
      publishedAgoDays: null,
    },
    {
      key: "p11",
      title: "Brand Story Carousel",
      caption:
        "Three years ago, we started Lumen with $400 and a sewing machine. Today we ship to 32 countries. Here's how it happened — swipe to see the journey.",
      mediaUrl:
        "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/brand-story-carousel.jpg",
      mediaType: "carousel",
      tone: "warm",
      status: "draft",
      scheduledAt: null,
      publishedAgoDays: null,
    },
  ];

  let created = 0;
  for (const p of posts) {
    const existing = await db.post.findFirst({
      where: { authorId: demoUserId, title: p.title },
    });
    if (existing) {
      postIds[p.key] = existing.id;
      continue;
    }
    const post = await safe(`Create post "${p.title}"`, () =>
      db.post.create({
        data: {
          title: p.title,
          caption: p.caption,
          mediaUrl: p.mediaUrl,
          mediaType: p.mediaType,
          tone: p.tone,
          status: p.status,
          scheduledAt: p.scheduledAt,
          authorId: demoUserId,
          customerId: null,
          createdAt: p.publishedAgoDays
            ? daysAgo(p.publishedAgoDays + 1)
            : p.scheduledAt
            ? daysAgo(randInt(1, 5))
            : daysAgo(randInt(1, 14)),
        },
      })
    );
    if (post) {
      postIds[p.key] = post.id;
      created++;
    }
  }
  ok(`Created ${created} posts (3 published, 2 scheduled, 3 draft, 2 failed, 1 pending-approval)`);

  // === PostVariants ===
  // For each published/scheduled post, create 2-3 platform-specific variants
  const variantDefs: {
    postKey: string;
    accountKey: string;
    content: string;
    hashtags: string;
    status: "published" | "scheduled" | "draft";
    publishedAt: Date | null;
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
    saves: number;
  }[] = [];

  // P1 — Summer Launch (published) — 3 variants (IG, TikTok, FB)
  variantDefs.push(
    {
      postKey: "p1",
      accountKey: "ig:lumen",
      content:
        "☀️ Summer has arrived. Meet the Lumen Summer Collection — lightweight, breathable, made for adventure.\n\nTap to shop. Link in bio. 🛍️ #LumenSummer #NewArrivals",
      hashtags: "LumenSummer,NewArrivals,SummerStyle",
      status: "published",
      publishedAt: daysAgo(5),
      likes: 2841,
      comments: 142,
      shares: 87,
      reach: 18420,
      impressions: 24815,
      saves: 312,
    },
    {
      postKey: "p1",
      accountKey: "tt:lumen",
      content:
        "POV: you found the perfect summer drop ☀️🔥 #summer #fashion #lumenstudio",
      hashtags: "summer,fashion,lumenstudio",
      status: "published",
      publishedAt: daysAgo(5),
      likes: 12480,
      comments: 421,
      shares: 1842,
      reach: 48200,
      impressions: 64230,
      saves: 980,
    },
    {
      postKey: "p1",
      accountKey: "fb:lumen",
      content:
        "Our Summer Collection is live! ☀️ Lightweight, breathable, and ready for adventure. Shop the full drop now at lumen.studio/summer",
      hashtags: "LumenSummer,SummerCollection",
      status: "published",
      publishedAt: daysAgo(5),
      likes: 421,
      comments: 38,
      shares: 24,
      reach: 8420,
      impressions: 15621,
      saves: 18,
    }
  );

  // P2 — Studio Tour (published) — 2 variants (IG, TikTok)
  variantDefs.push(
    {
      postKey: "p2",
      accountKey: "ig:lumen",
      content:
        "Behind the scenes at our Brooklyn studio 👀 Every Lumen piece is designed and tested here. Full video drops Friday.",
      hashtags: "BehindTheScenes,Brooklyn,StudioLife",
      status: "published",
      publishedAt: daysAgo(8),
      likes: 1842,
      comments: 87,
      shares: 42,
      reach: 14200,
      impressions: 19842,
      saves: 142,
    },
    {
      postKey: "p2",
      accountKey: "tt:lumen",
      content:
        "Come with me to the Lumen studio 🎬 watch till the end for the blooper 😂 #studiotour #bts",
      hashtags: "studiotour,bts,lumenstudio",
      status: "published",
      publishedAt: daysAgo(8),
      likes: 9842,
      comments: 312,
      shares: 1240,
      reach: 38200,
      impressions: 51200,
      saves: 642,
    }
  );

  // P3 — Maya's Story (published) — 2 variants (IG, FB)
  variantDefs.push(
    {
      postKey: "p3",
      accountKey: "ig:lumen",
      content:
        "Maya has been with us since day one. Her favorite piece? The Aurora Jacket. Thank you Maya for being part of our journey 💜",
      hashtags: "CustomerLove,AuroraJacket,LumenFamily",
      status: "published",
      publishedAt: daysAgo(12),
      likes: 2148,
      comments: 98,
      shares: 54,
      reach: 12400,
      impressions: 16820,
      saves: 87,
    },
    {
      postKey: "p3",
      accountKey: "fb:lumen",
      content:
        "Customer spotlight: Maya has been with Lumen since day one. Watch her story below.",
      hashtags: "CustomerSpotlight,LumenFamily",
      status: "published",
      publishedAt: daysAgo(12),
      likes: 312,
      comments: 24,
      shares: 18,
      reach: 6420,
      impressions: 12400,
      saves: 9,
    }
  );

  // P4 — Sustainability Report (scheduled) — 3 variants (IG, LinkedIn, FB)
  variantDefs.push(
    {
      postKey: "p4",
      accountKey: "ig:lumen",
      content:
        "Our 2026 Sustainability Report is here. ♻️ 78% recycled materials. 42% less water. 12 audited factories. We're just getting started. Link in bio.",
      hashtags: "Sustainability,EcoFashion,Transparency",
      status: "scheduled",
      publishedAt: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      saves: 0,
    },
    {
      postKey: "p4",
      accountKey: "li:lumen",
      content:
        "We're proud to share our 2026 Sustainability Report. Key wins: 78% recycled or organic materials, 42% water-use reduction, 12 fully-audited factories. Read the full report — link in comments.",
      hashtags: "Sustainability,ESG,TransparentBusiness",
      status: "scheduled",
      publishedAt: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      saves: 0,
    },
    {
      postKey: "p4",
      accountKey: "fb:lumen",
      content:
        "Doing right by the planet. Our 2026 Sustainability Report shows real progress — and where we still need to do better. Read it at lumen.studio/sustainability",
      hashtags: "Sustainability,EcoFashion",
      status: "scheduled",
      publishedAt: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      saves: 0,
    }
  );

  // P5 — Giveaway (scheduled) — 2 variants (IG, X)
  variantDefs.push(
    {
      postKey: "p5",
      accountKey: "ig:lumen",
      content:
        "🎁 GIVEAWAY TIME! We're giving 5 lucky followers a free Aurora Jacket. To enter: follow @lumen.studio, like this post, tag 2 friends. Winners announced Monday.",
      hashtags: "Giveaway,LumenGiveaway,AuroraJacket",
      status: "scheduled",
      publishedAt: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      saves: 0,
    },
    {
      postKey: "p5",
      accountKey: "x:lumen",
      content:
        "🎁 GIVEAWAY — 5 Aurora Jackets up for grabs. Follow + like + tag 2 friends. Winners Monday. #LumenGiveaway",
      hashtags: "LumenGiveaway",
      status: "scheduled",
      publishedAt: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      impressions: 0,
      saves: 0,
    }
  );

  let variantsCreated = 0;
  for (const v of variantDefs) {
    const postId = postIds[v.postKey];
    const accountId = accountIds[v.accountKey];
    if (!postId || !accountId) continue;

    const existingVariant = await db.postVariant.findFirst({
      where: { postId, accountId },
    });
    if (existingVariant) continue;

    await safe(`Variant for ${v.postKey}→${v.accountKey}`, () =>
      db.postVariant.create({
        data: {
          postId,
          accountId,
          content: v.content,
          hashtags: v.hashtags,
          status: v.status,
          publishedAt: v.publishedAt,
          likes: v.likes,
          comments: v.comments,
          shares: v.shares,
          reach: v.reach,
          impressions: v.impressions,
          saves: v.saves,
          createdAt: v.publishedAt ?? daysAgo(randInt(1, 6)),
        },
      })
    );
    variantsCreated++;
  }
  ok(`Created ${variantsCreated} post variants (across 5 published/scheduled posts)`);
}

// ----------------------------------------------------------------------------
// 5. Comments (15 — positive/neutral/negative, replied/unreplied)
// ----------------------------------------------------------------------------
async function seedComments(): Promise<void> {
  section("5/13 — Comments");

  const existingCount = await db.comment.count({
    where: { account: { ownerId: demoUserId } },
  });
  if (existingCount > 0 && !FORCE) {
    ok(`Already have ${existingCount} comments — skipping (use --force to re-seed)`);
    return;
  }
  if (FORCE && existingCount > 0) {
    await db.comment.deleteMany({
      where: { account: { ownerId: demoUserId } },
    }).catch(() => {});
    ok(`Force mode — wiped ${existingCount} existing comments`);
  }

  const commentDefs: {
    accountKey: string;
    author: string;
    text: string;
    sentiment: "positive" | "neutral" | "negative";
    type: "comment" | "message" | "mention";
    replied: boolean;
    replyText?: string;
    assigneeId?: string;
    daysAgo: number;
  }[] = [
    // === Positive (6) ===
    {
      accountKey: "ig:lumen",
      author: "@sarah_designs",
      text: "Love this collection! When does it drop? 💕",
      sentiment: "positive",
      type: "comment",
      replied: true,
      replyText: "Hi Sarah! The full collection drops this Friday at 9am ET. Set your alarm! ⏰",
      daysAgo: 4,
    },
    {
      accountKey: "ig:lumen",
      author: "@mike_ventures",
      text: "The sustainable materials angle is 🔥 — exactly what the industry needs.",
      sentiment: "positive",
      type: "comment",
      replied: false,
      daysAgo: 3,
    },
    {
      accountKey: "tt:lumen",
      author: "@fan_2026",
      text: "Can't wait to order! The studio tour was amazing 😍",
      sentiment: "positive",
      type: "mention",
      replied: true,
      replyText: "Thank you so much for the love! 🙌 Stay tuned — big things coming.",
      daysAgo: 6,
    },
    {
      accountKey: "ig:lumen",
      author: "@design_enthusiast",
      text: "The minimal aesthetic is chef's kiss 👌✨",
      sentiment: "positive",
      type: "comment",
      replied: false,
      daysAgo: 2,
    },
    {
      accountKey: "x:lumen",
      author: "@mayacreates",
      text: "Just received my Aurora Jacket — obsessed is an understatement. Quality is unreal.",
      sentiment: "positive",
      type: "mention",
      replied: false,
      daysAgo: 5,
    },
    {
      accountKey: "fb:lumen",
      author: "Jennifer Walsh",
      text: "Ordered 3 pieces from the summer drop. All arrived in 2 days. Customer for life!",
      sentiment: "positive",
      type: "comment",
      replied: false,
      daysAgo: 7,
    },

    // === Neutral (5) ===
    {
      accountKey: "ig:lumen",
      author: "@dev_user",
      text: "Prices?",
      sentiment: "neutral",
      type: "message",
      replied: false,
      daysAgo: 4,
      assigneeId: editorId,
    },
    {
      accountKey: "ig:lumen",
      author: "@q_asker",
      text: "International shipping?",
      sentiment: "neutral",
      type: "message",
      replied: true,
      replyText: "Hi! Yes — we ship to 32 countries. Full list at lumen.studio/shipping",
      daysAgo: 5,
    },
    {
      accountKey: "x:lumen",
      author: "@techreviewer",
      text: "Interesting launch. Will review.",
      sentiment: "neutral",
      type: "comment",
      replied: false,
      daysAgo: 3,
    },
    {
      accountKey: "tt:lumen",
      author: "@curious_cat",
      text: "What fabric is the jacket made of?",
      sentiment: "neutral",
      type: "comment",
      replied: false,
      daysAgo: 2,
    },
    {
      accountKey: "li:lumen",
      author: "Robert Kim",
      text: "Thanks for sharing the report. Will share internally.",
      sentiment: "neutral",
      type: "comment",
      replied: false,
      daysAgo: 8,
    },

    // === Negative (4) ===
    {
      accountKey: "ig:lumen",
      author: "@critic_99",
      text: "Colors look washed out in the preview. Disappointing.",
      sentiment: "negative",
      type: "comment",
      replied: false,
      assigneeId: managerId,
      daysAgo: 3,
    },
    {
      accountKey: "ig:lumen",
      author: "@angry_customer",
      text: "Last order was delayed by 2 weeks. Not happy. Refund please.",
      sentiment: "negative",
      type: "comment",
      replied: false,
      assigneeId: managerId,
      daysAgo: 5,
    },
    {
      accountKey: "x:flash",
      author: "@ex_user",
      text: "Account got suspended after following you. Suspicious.",
      sentiment: "negative",
      type: "comment",
      replied: false,
      daysAgo: 1,
    },
    {
      accountKey: "tt:viral",
      author: "@spam_hater",
      text: "Stop posting the same content. Reported.",
      sentiment: "negative",
      type: "comment",
      replied: false,
      daysAgo: 2,
    },
  ];

  let created = 0;
  for (const c of commentDefs) {
    const accountId = accountIds[c.accountKey];
    if (!accountId) continue;
    const result = await safe(`Comment "${c.text.slice(0, 30)}…"`, () =>
      db.comment.create({
        data: {
          accountId,
          author: c.author,
          authorAvatar: `https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/avatars/${c.author
            .replace(/[^a-z0-9]/gi, "")
            .toLowerCase()}.jpg`,
          text: c.text,
          type: c.type,
          sentiment: c.sentiment,
          replied: c.replied,
          replyText: c.replyText ?? null,
          assigneeId: c.assigneeId ?? null,
          repliedAt: c.replied ? daysAgo(c.daysAgo - 1) : null,
          createdAt: daysAgo(c.daysAgo),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} comments (6 positive, 5 neutral, 4 negative; 2 replied)`);
}

// ----------------------------------------------------------------------------
// 6. AnalyticsDaily (30 days per account)
// ----------------------------------------------------------------------------
async function seedAnalyticsDaily(): Promise<void> {
  section("6/13 — AnalyticsDaily (30 days × all accounts)");

  const sampleAccountId = Object.values(accountIds)[0];
  if (sampleAccountId) {
    const existing = await db.analyticsDaily.findFirst({
      where: { accountId: sampleAccountId },
    });
    if (existing && !FORCE) {
      const total = await db.analyticsDaily.count();
      ok(`Analytics already exist (${total} rows) — skipping (use --force to re-seed)`);
      return;
    }
    if (FORCE && existing) {
      await db.analyticsDaily.deleteMany({
        where: { account: { ownerId: demoUserId } },
      }).catch(() => {});
      ok("Force mode — wiped existing analytics");
    }
  }

  const totalAccounts = Object.keys(accountIds).length;
  let totalRows = 0;
  const rows: {
    accountId: string;
    date: Date;
    followers: number;
    impressions: number;
    reach: number;
    engagement: number;
    posts: number;
  }[] = [];

  for (const key of Object.keys(accountIds)) {
    const accId = accountIds[key];
    // Find the account's current followers to anchor the trend
    const acc = await db.account.findUnique({ where: { id: accId } });
    if (!acc) continue;
    const currentFollowers = acc.followers;
    const risky = key.includes("flash") || key.includes("viral");
    const baseImpressions = risky ? 800 : 2500;
    const baseReach = risky ? 400 : 1500;

    for (let i = 30; i >= 1; i--) {
      // walk backward from 30 days ago to yesterday
      const date = daysAgo(i);
      // Followers grow backward — 30 days ago fewer followers
      const followerDelta = Math.floor(currentFollowers * 0.04 * (i / 30) * (risky ? -0.5 : 1));
      const followers = Math.max(0, currentFollowers - followerDelta + randInt(-50, 50));
      const impressions = baseImpressions + randInt(-300, 800) + (30 - i) * 20;
      const reach = baseReach + randInt(-200, 600) + (30 - i) * 15;
      const engagement = +(2.5 + Math.random() * 4 + (risky ? -1.2 : 0.5)).toFixed(2);
      const posts = randInt(0, 3);

      rows.push({
        accountId: accId,
        date,
        followers,
        impressions,
        reach,
        engagement,
        posts,
      });
    }
  }

  // Use createMany in batches of 100 for performance
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    await safe(`Analytics batch ${i / 100 + 1}`, () =>
      db.analyticsDaily.createMany({ data: batch, skipDuplicates: true })
    );
    totalRows += batch.length;
  }
  ok(`Created ~${totalRows} analytics rows (${totalAccounts} accounts × 30 days)`);
}

// ----------------------------------------------------------------------------
// 7. Activities
// ----------------------------------------------------------------------------
async function seedActivities(): Promise<void> {
  section("7/13 — Activities");

  const existing = await db.activity.count({ where: { userId: demoUserId } });
  if (existing > 0 && !FORCE) {
    ok(`Already have ${existing} activities — skipping (use --force to re-seed)`);
    return;
  }
  if (FORCE && existing > 0) {
    await db.activity.deleteMany({ where: { userId: demoUserId } }).catch(() => {});
    ok("Force mode — wiped existing activities");
  }

  const activities = [
    {
      type: "post_published",
      description: "Published 'Summer Collection Launch' to Instagram, TikTok, Facebook",
      meta: JSON.stringify({ postKey: "p1", platforms: ["instagram", "tiktok", "facebook"] }),
      hoursAgo: 120,
    },
    {
      type: "comment_replied",
      description: "Sarah replied to @sarah_designs on Instagram",
      meta: JSON.stringify({ userId: managerId, sentiment: "positive" }),
      hoursAgo: 96,
    },
    {
      type: "account_connected",
      description: "Connected TikTok account @lumen.studio (verified)",
      meta: JSON.stringify({ platform: "tiktok", handle: "lumen.studio" }),
      hoursAgo: 240,
    },
    {
      type: "ai_generated",
      description: "AI generated 3 caption variants for 'Studio Tour' post",
      meta: JSON.stringify({ tone: "playful", variants: 3 }),
      hoursAgo: 200,
    },
    {
      type: "post_scheduled",
      description: "Scheduled 'Sustainability Report 2026' for IG, LinkedIn, Facebook",
      meta: JSON.stringify({ postKey: "p4", scheduledFor: daysFromNow(3).toISOString() }),
      hoursAgo: 48,
    },
    {
      type: "comment_replied",
      description: "Sarah replied to @q_asker on Instagram",
      meta: JSON.stringify({ userId: managerId, sentiment: "neutral" }),
      hoursAgo: 116,
    },
    {
      type: "team_joined",
      description: "Marcus Johnson joined the team as Content Editor",
      meta: JSON.stringify({ role: "editor", department: "Content" }),
      hoursAgo: 1440,
    },
    {
      type: "post_published",
      description: "Published 'Behind the Scenes — Studio Tour' to Instagram + TikTok",
      meta: JSON.stringify({ postKey: "p2", platforms: ["instagram", "tiktok"] }),
      hoursAgo: 192,
    },
    {
      type: "ai_generated",
      description: "AI generated 5 caption ideas for the Fall Lookbook",
      meta: JSON.stringify({ count: 5, tone: "professional" }),
      hoursAgo: 36,
    },
    {
      type: "post_scheduled",
      description: "Scheduled 'Weekend Giveaway 🎁' for IG + X",
      meta: JSON.stringify({ postKey: "p5", scheduledFor: daysFromNow(2).toISOString() }),
      hoursAgo: 24,
    },
    {
      type: "account_connected",
      description: "Connected YouTube channel 'Lumen Studio' (42.1K subscribers)",
      meta: JSON.stringify({ platform: "youtube", handle: "lumenstudio" }),
      hoursAgo: 720,
    },
    {
      type: "comment_replied",
      description: "Sarah replied to @fan_2026 on TikTok",
      meta: JSON.stringify({ userId: managerId, sentiment: "positive" }),
      hoursAgo: 144,
    },
  ];

  let created = 0;
  for (const a of activities) {
    const result = await safe(`Activity: ${a.type}`, () =>
      db.activity.create({
        data: {
          userId: demoUserId,
          customerId: null,
          type: a.type,
          description: a.description,
          meta: a.meta,
          createdAt: hoursAgo(a.hoursAgo),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} activity feed entries`);
}

// ----------------------------------------------------------------------------
// 8. Campaigns (3)
// ----------------------------------------------------------------------------
async function seedCampaigns(): Promise<void> {
  section("8/13 — Campaigns");

  const existing = await db.campaign.count({ where: { ownerId: demoUserId } });
  if (existing > 0 && !FORCE) {
    ok(`Already have ${existing} campaigns — skipping (use --force to re-seed)`);
    return;
  }
  if (FORCE && existing > 0) {
    await db.campaign.deleteMany({ where: { ownerId: demoUserId } }).catch(() => {});
    ok("Force mode — wiped existing campaigns");
  }

  const campaigns = [
    {
      name: "Summer Launch 2026",
      description:
        "Multi-platform launch campaign for the Lumen Summer Collection. Awareness + engagement focus.",
      color: "#E1306C",
      status: "active",
      objective: "awareness",
      budget: 25000,
      startDate: daysAgo(7),
      endDate: daysFromNow(23),
    },
    {
      name: "Spring Collection",
      description:
        "Spring 2026 collection campaign — completed. Drove 4.2M impressions and 38K engagements.",
      color: "#22C55E",
      status: "completed",
      objective: "conversion",
      budget: 18000,
      startDate: daysAgo(75),
      endDate: daysAgo(14),
    },
    {
      name: "Holiday Special",
      description:
        "Draft campaign for Black Friday / Cyber Monday 2026. Awaiting budget approval.",
      color: "#F59E0B",
      status: "draft",
      objective: "engagement",
      budget: 35000,
      startDate: daysFromNow(45),
      endDate: daysFromNow(75),
    },
  ];

  let created = 0;
  for (const c of campaigns) {
    const existing = await db.campaign.findFirst({
      where: { ownerId: demoUserId, name: c.name },
    });
    if (existing) continue;
    const result = await safe(`Campaign: ${c.name}`, () =>
      db.campaign.create({
        data: {
          ...c,
          ownerId: demoUserId,
          customerId: null,
          createdAt: daysAgo(randInt(20, 80)),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} campaigns (1 active, 1 completed, 1 draft)`);
}

// ----------------------------------------------------------------------------
// 9. Tasks (10 — pending / in-progress / completed / overdue)
// ----------------------------------------------------------------------------
async function seedTasks(): Promise<void> {
  section("9/13 — Tasks");

  const existing = await db.task.count({ where: { creatorId: demoUserId } });
  if (existing > 0 && !FORCE) {
    ok(`Already have ${existing} tasks — skipping (use --force to re-seed)`);
    return;
  }
  if (FORCE && existing > 0) {
    await db.task.deleteMany({ where: { creatorId: demoUserId } }).catch(() => {});
    ok("Force mode — wiped existing tasks");
  }

  const tasks = [
    // 3 pending (todo)
    {
      title: "Draft Q3 content calendar",
      description: "Plan + draft the Q3 social content calendar across all platforms.",
      status: "todo",
      priority: "high",
      type: "content",
      assigneeId: editorId,
      dueAt: daysFromNow(7),
    },
    {
      title: "Review TikTok analytics",
      description: "Pull TikTok analytics for last 30 days. Identify top 3 performing posts.",
      status: "todo",
      priority: "normal",
      type: "analytics",
      assigneeId: viewerId,
      dueAt: daysFromNow(5),
    },
    {
      title: "Source influencer for sustainability post",
      description: "Find 3 micro-influencers (10K-100K) in the eco-fashion niche. Send outreach DMs.",
      status: "todo",
      priority: "normal",
      type: "campaign",
      assigneeId: managerId,
      dueAt: daysFromNow(10),
    },
    // 2 in-progress
    {
      title: "Shoot Fall lookbook",
      description: "Photograph the Fall lookbook. Coordinate with stylist + photographer.",
      status: "in_progress",
      priority: "high",
      type: "content",
      assigneeId: editorId,
      dueAt: daysFromNow(14),
    },
    {
      title: "Write Sustainability Report caption variants",
      description: "Draft 3 caption variants for the Sustainability Report scheduled post.",
      status: "in_progress",
      priority: "normal",
      type: "content",
      assigneeId: editorId,
      dueAt: daysFromNow(3),
    },
    // 3 completed
    {
      title: "Respond to negative Instagram comments",
      description: "Reply to all unhandled negative comments on the IG account from the last 7 days.",
      status: "done",
      priority: "urgent",
      type: "engagement",
      assigneeId: managerId,
      dueAt: daysAgo(2),
      completedAt: daysAgo(1),
    },
    {
      title: "Connect YouTube channel",
      description: "Connect the Lumen Studio YouTube channel to SYNQUE for analytics sync.",
      status: "done",
      priority: "normal",
      type: "content",
      assigneeId: demoUserId,
      dueAt: daysAgo(30),
      completedAt: daysAgo(28),
    },
    {
      title: "Approve Summer Launch captions",
      description: "Review + approve AI-generated caption variants for the Summer Launch post.",
      status: "done",
      priority: "high",
      type: "review",
      assigneeId: managerId,
      dueAt: daysAgo(8),
      completedAt: daysAgo(7),
    },
    // 2 overdue (todo status + dueAt in the past)
    {
      title: "Update brand voice guidelines",
      description: "Refresh the brand voice doc — add tone variations for TikTok vs LinkedIn.",
      status: "todo",
      priority: "normal",
      type: "content",
      assigneeId: managerId,
      dueAt: daysAgo(3),
    },
    {
      title: "Audit X/Twitter posting cadence",
      description: "Review X account posting frequency. Flag any violations of protection rules.",
      status: "todo",
      priority: "high",
      type: "analytics",
      assigneeId: viewerId,
      dueAt: daysAgo(1),
    },
  ];

  let created = 0;
  for (const t of tasks) {
    const existing = await db.task.findFirst({
      where: { creatorId: demoUserId, title: t.title },
    });
    if (existing) continue;
    const result = await safe(`Task: ${t.title}`, () =>
      db.task.create({
        data: {
          title: t.title,
          description: t.description,
          platforms: JSON.stringify(["instagram", "tiktok", "x", "linkedin"]),
          tags: "demo,content",
          assigneeId: t.assigneeId,
          creatorId: demoUserId,
          customerId: null,
          status: t.status,
          priority: t.priority,
          type: t.type,
          dueAt: t.dueAt,
          completedAt: (t as { completedAt?: Date }).completedAt ?? null,
          createdAt: daysAgo(randInt(5, 25)),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} tasks (3 pending, 2 in-progress, 3 completed, 2 overdue)`);
}

// ----------------------------------------------------------------------------
// 10. Approvals (5)
// ----------------------------------------------------------------------------
async function seedApprovals(): Promise<void> {
  section("10/13 — Approvals");

  const existing = await db.approval.count({ where: { authorId: demoUserId } });
  if (existing > 0 && !FORCE) {
    ok(`Already have ${existing} approvals — skipping (use --force to re-seed)`);
    return;
  }
  if (FORCE && existing > 0) {
    await db.approval.deleteMany({ where: { authorId: demoUserId } }).catch(() => {});
    ok("Force mode — wiped existing approvals");
  }

  const approvals = [
    // 2 pending
    {
      title: "Black Friday Teaser — Pending",
      postId: postIds["p10"] ?? null,
      status: "pending",
      comment: null,
      priority: "high",
      approverId: null,
      dueAt: daysFromNow(2),
      resolvedAt: null,
    },
    {
      title: "Fall Lookbook — Pending review",
      postId: null,
      status: "pending",
      comment: null,
      priority: "normal",
      approverId: null,
      dueAt: daysFromNow(5),
      resolvedAt: null,
    },
    // 1 approved
    {
      title: "Summer Launch captions — Approved",
      postId: postIds["p1"] ?? null,
      status: "approved",
      comment: "Looks great. Tone is on-brand. Ship it.",
      priority: "high",
      approverId: managerId,
      dueAt: daysAgo(7),
      resolvedAt: daysAgo(7),
    },
    // 1 rejected
    {
      title: "Flash Sale copy — Rejected",
      postId: postIds["p8"] ?? null,
      status: "rejected",
      comment: "Tone feels too aggressive. Soften the urgency and resubmit.",
      priority: "normal",
      approverId: managerId,
      dueAt: daysAgo(3),
      resolvedAt: daysAgo(3),
    },
    // 1 changes_requested
    {
      title: "Sustainability Report — Changes requested",
      postId: postIds["p4"] ?? null,
      status: "changes_requested",
      comment: "Add specific water-reduction metric. Also include a CTA to download the full PDF.",
      priority: "normal",
      approverId: managerId,
      dueAt: daysFromNow(1),
      resolvedAt: daysAgo(1),
    },
  ];

  let created = 0;
  for (const a of approvals) {
    const existing = await db.approval.findFirst({
      where: { authorId: demoUserId, title: a.title },
    });
    if (existing) continue;
    const result = await safe(`Approval: ${a.title}`, () =>
      db.approval.create({
        data: {
          postId: a.postId,
          title: a.title,
          authorId: demoUserId,
          approverId: a.approverId,
          status: a.status,
          comment: a.comment,
          priority: a.priority,
          dueAt: a.dueAt,
          resolvedAt: a.resolvedAt,
          createdAt: daysAgo(randInt(2, 10)),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} approvals (2 pending, 1 approved, 1 rejected, 1 changes_requested)`);
}

// ----------------------------------------------------------------------------
// 11. HashtagGroups (5)
// ----------------------------------------------------------------------------
async function seedHashtagGroups(): Promise<void> {
  section("11/13 — Hashtag Groups");

  const existing = await db.hashtagGroup.count();
  if (FORCE && existing > 0) {
    await db.hashtagGroup.deleteMany().catch(() => {});
    ok("Force mode — wiped existing hashtag groups");
  }

  const groups = [
    {
      name: "Summer Campaign",
      tags: "LumenSummer,SummerStyle,SummerFashion,BeachVibes,SunnyDays,SummerVibes,SummerDrop",
      platform: "instagram",
      usageCount: 42,
      avgReach: 18400,
      color: "#F59E0B",
    },
    {
      name: "Product Launch",
      tags: "NewArrivals,ProductLaunch,JustDropped,ShopNow,LimitedDrop,NewCollection",
      platform: "all",
      usageCount: 28,
      avgReach: 24800,
      color: "#3B82F6",
    },
    {
      name: "Brand General",
      tags: "LumenStudio,LumenFamily,DesignedInBrooklyn,MadeWithLove,SustainableFashion",
      platform: "all",
      usageCount: 184,
      avgReach: 12400,
      color: "#E1306C",
    },
    {
      name: "Industry Tags",
      tags: "SustainableFashion,EcoFashion,EthicalFashion,SlowFashion,ConsciousConsumer",
      platform: "linkedin",
      usageCount: 14,
      avgReach: 8200,
      color: "#22C55E",
    },
    {
      name: "Behind the Scenes",
      tags: "BehindTheScenes,BTS,StudioLife,StudioTour,Process,HowItsMade",
      platform: "tiktok",
      usageCount: 18,
      avgReach: 41200,
      color: "#A855F7",
    },
  ];

  let created = 0;
  for (const g of groups) {
    const existing = await db.hashtagGroup.findFirst({ where: { name: g.name } });
    if (existing) continue;
    const result = await safe(`Hashtag group: ${g.name}`, () =>
      db.hashtagGroup.create({
        data: {
          name: g.name,
          tags: g.tags,
          platform: g.platform,
          usageCount: g.usageCount,
          avgReach: g.avgReach,
          color: g.color,
          createdAt: daysAgo(randInt(15, 60)),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} hashtag groups`);
}

// ----------------------------------------------------------------------------
// 12. Competitors (4 with snapshots) + ListeningQueries (4) + Influencers (6)
// ----------------------------------------------------------------------------
async function seedCompetitorsListeningInfluencers(): Promise<void> {
  section("12/13 — Competitors + Listening Queries + Influencers");

  // === Competitors ===
  const existingCompetitors = await db.competitor.count();
  if (FORCE && existingCompetitors > 0) {
    await db.competitorSnapshot.deleteMany().catch(() => {});
    await db.competitor.deleteMany().catch(() => {});
    ok("Force mode — wiped existing competitors");
  }
  {
    const competitors = [
      {
        name: "Hue & Co.",
        handle: "hueandco",
        platform: "instagram",
        followers: 48200,
        engagementRate: 4.2,
        growthRate: 2.8,
        postingFreq: 5.5,
        status: "tracking",
        notes: "Direct competitor. Strong on Instagram Reels. Recently partnered with @aurora.labs.",
        snapshots: true,
      },
      {
        name: "Sustainable Threads",
        handle: "sustainablethreads",
        platform: "instagram",
        followers: 31400,
        engagementRate: 6.1,
        growthRate: 4.2,
        postingFreq: 4,
        status: "tracking",
        notes: "Eco-fashion niche leader. Higher engagement rate than us. Worth studying their caption style.",
        snapshots: true,
      },
      {
        name: "Vertex Apparel",
        handle: "vertexapparel",
        platform: "x",
        followers: 28900,
        engagementRate: 2.1,
        growthRate: 1.2,
        postingFreq: 12,
        status: "tracking",
        notes: "X/Twitter competitor. Heavy posting cadence. Lower engagement quality.",
        snapshots: false,
      },
      {
        name: "Northwind Studio",
        handle: "northwindstudio",
        platform: "tiktok",
        followers: 89400,
        engagementRate: 8.4,
        growthRate: 6.8,
        postingFreq: 7,
        status: "tracking",
        notes: "TikTok leader in our space. Viral content formula — need to reverse-engineer.",
        snapshots: false,
      },
    ];

    let competitorIds: { [key: string]: string } = {};
    let competitorsCreated = 0;
    for (const c of competitors) {
      const existing = await db.competitor.findFirst({
        where: { handle: c.handle, platform: c.platform },
      });
      if (existing) {
        competitorIds[c.handle] = existing.id;
        continue;
      }
      const result = await safe(`Competitor: ${c.name}`, () =>
        db.competitor.create({
          data: {
            name: c.name,
            handle: c.handle,
            platform: c.platform,
            avatar: `https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/competitors/${c.handle}.jpg`,
            followers: c.followers,
            engagementRate: c.engagementRate,
            growthRate: c.growthRate,
            postingFreq: c.postingFreq,
            status: c.status,
            notes: c.notes,
            createdAt: daysAgo(randInt(20, 60)),
          },
        })
      );
      if (result) {
        competitorIds[c.handle] = result.id;
        competitorsCreated++;
      }
    }
    ok(`Created ${competitorsCreated} competitors`);

    // Snapshots — 2 competitors × 4 snapshots each (one per week for past 28 days)
    let snapshotsCreated = 0;
    for (const c of competitors.filter((c) => c.snapshots)) {
      const compId = competitorIds[c.handle];
      if (!compId) continue;
      // Idempotency: skip if snapshots already exist for this competitor
      const existingCount = await db.competitorSnapshot.count({
        where: { competitorId: compId },
      });
      if (existingCount >= 4) continue;
      for (let i = 28; i >= 1; i -= 7) {
        const snapDate = daysAgo(i);
        await safe(`Snapshot for ${c.handle} -${i}d`, () =>
          db.competitorSnapshot.create({
            data: {
              competitorId: compId,
              date: snapDate,
              followers: c.followers - Math.floor(c.followers * 0.04 * (i / 28)),
              engagement: c.engagementRate,
              posts: Math.floor(c.postingFreq * (i === 28 ? 4 : 1)),
            },
          })
        );
        snapshotsCreated++;
      }
    }
    ok(`Created ${snapshotsCreated} competitor snapshots (idempotent — skip if competitor already has ≥4)`);
  }

  // === Listening Queries ===
  const existingListening = await db.listeningQuery.count();
  if (FORCE && existingListening > 0) {
    await db.mention.deleteMany().catch(() => {});
    await db.listeningQuery.deleteMany().catch(() => {});
    ok("Force mode — wiped existing listening queries");
  }
  {
    const queries = [
      {
        name: "Lumen Studio Brand",
        keywords: "lumen studio,lumen.studio,@lumenstudio,#LumenStudio",
        type: "brand",
        color: "#E1306C",
        status: "active",
      },
      {
        name: "Competitor Mentions",
        keywords: "hue and co,sustainable threads,vertex apparel,northwind studio",
        type: "competitor",
        color: "#3B82F6",
        status: "active",
      },
      {
        name: "Sustainable Fashion Industry",
        keywords: "sustainable fashion,eco fashion,ethical fashion,slow fashion,circular fashion",
        type: "keyword",
        color: "#22C55E",
        status: "active",
      },
      {
        name: "Summer Fashion Trend",
        keywords: "#summerfashion,#summerstyle,#summerdrop,#beachvibes,#summervibes",
        type: "hashtag",
        color: "#F59E0B",
        status: "active",
      },
    ];
    let created = 0;
    for (const q of queries) {
      const existing = await db.listeningQuery.findFirst({ where: { name: q.name } });
      if (existing) continue;
      const result = await safe(`Listening query: ${q.name}`, () =>
        db.listeningQuery.create({
          data: {
            name: q.name,
            keywords: q.keywords,
            type: q.type,
            color: q.color,
            status: q.status,
            createdAt: daysAgo(randInt(10, 40)),
          },
        })
      );
      if (result) created++;
    }
    ok(`Created ${created} listening queries (brand, competitor, industry, hashtag)`);
  }

  // === Influencers ===
  const existingInfluencers = await db.influencer.count();
  if (FORCE && existingInfluencers > 0) {
    await db.influencer.deleteMany().catch(() => {});
    ok("Force mode — wiped existing influencers");
  }
  {
    const influencers = [
      {
        name: "Olivia Martinez",
        handle: "@olivia.styles",
        platform: "instagram",
        followers: 184000,
        engagementRate: 4.8,
        cost: 3500,
        estimatedReach: 92000,
        estimatedEngagement: 4400,
        status: "active",
        notes: "Fashion niche. Previously collaborated on Spring campaign — great ROI.",
      },
      {
        name: "Jordan Lee",
        handle: "@jordancreates",
        platform: "tiktok",
        followers: 412000,
        engagementRate: 7.2,
        cost: 5200,
        estimatedReach: 248000,
        estimatedEngagement: 17800,
        status: "active",
        notes: "TikTok creator — fashion + lifestyle. High viral potential.",
      },
      {
        name: "Aisha Khan",
        handle: "@aishaeats",
        platform: "instagram",
        followers: 96000,
        engagementRate: 5.1,
        cost: 2200,
        estimatedReach: 48000,
        estimatedEngagement: 2400,
        status: "paused",
        notes: "Food + lifestyle niche. Tied up with another campaign until next month.",
      },
      {
        name: "Tom Walker",
        handle: "@tomtravels",
        platform: "youtube",
        followers: 248000,
        engagementRate: 3.8,
        cost: 4800,
        estimatedReach: 124000,
        estimatedEngagement: 4700,
        status: "completed",
        notes: "Travel vlogger. Completed Summer campaign — 3.2M views on sponsored video.",
      },
      {
        name: "Maya Singh",
        handle: "@mayacodes",
        platform: "linkedin",
        followers: 64200,
        engagementRate: 6.4,
        cost: 1800,
        estimatedReach: 32000,
        estimatedEngagement: 2050,
        status: "active",
        notes: "Tech + sustainability thought leader. Strong for LinkedIn thought leadership content.",
      },
      {
        name: "Chris Davies",
        handle: "@chrisdavies",
        platform: "x",
        followers: 89000,
        engagementRate: 2.9,
        cost: 1500,
        estimatedReach: 44000,
        estimatedEngagement: 1280,
        status: "draft",
        notes: "Tech commentator. Considering for Sustainability Report amplification.",
      },
    ];
    let created = 0;
    for (const inf of influencers) {
      const existing = await db.influencer.findFirst({
        where: { handle: inf.handle, platform: inf.platform },
      });
      if (existing) continue;
      const result = await safe(`Influencer: ${inf.name}`, () =>
        db.influencer.create({
          data: {
            name: inf.name,
            handle: inf.handle,
            platform: inf.platform,
            followers: inf.followers,
            engagementRate: inf.engagementRate,
            cost: inf.cost,
            estimatedReach: inf.estimatedReach,
            estimatedEngagement: inf.estimatedEngagement,
            status: inf.status,
            notes: inf.notes,
            createdAt: daysAgo(randInt(15, 60)),
          },
        })
      );
      if (result) created++;
    }
    ok(`Created ${created} influencers (fashion, tech, food, travel, LinkedIn niches)`);
  }
}

// ----------------------------------------------------------------------------
// 13. Final summary report
// ----------------------------------------------------------------------------
async function reportCounts(): Promise<void> {
  section("13/13 — Final counts");

  const counts = {
    users: await db.user.count(),
    accounts: await db.account.count({ where: { ownerId: demoUserId } }),
    accountHealth: await db.accountHealth.count(),
    accountProtection: await db.accountProtection.count(),
    posts: await db.post.count({ where: { authorId: demoUserId } }),
    postVariants: await db.postVariant.count({
      where: { post: { authorId: demoUserId } },
    }),
    comments: await db.comment.count({ where: { account: { ownerId: demoUserId } } }),
    analyticsDaily: await db.analyticsDaily.count({
      where: { account: { ownerId: demoUserId } },
    }),
    activities: await db.activity.count({ where: { userId: demoUserId } }),
    campaigns: await db.campaign.count({ where: { ownerId: demoUserId } }),
    tasks: await db.task.count({ where: { creatorId: demoUserId } }),
    approvals: await db.approval.count({ where: { authorId: demoUserId } }),
    hashtagGroups: await db.hashtagGroup.count(),
    competitors: await db.competitor.count(),
    competitorSnapshots: await db.competitorSnapshot.count(),
    listeningQueries: await db.listeningQuery.count(),
    influencers: await db.influencer.count(),
  };

  console.log("\n📊 Demo data counts:");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${k.padEnd(22)} ${v}`);
  }
}

// ----------------------------------------------------------------------------
// Main runner
// ----------------------------------------------------------------------------
async function main(): Promise<void> {
  console.log("================================================");
  console.log(" SYNQUE — Comprehensive Demo Data Seed Script");
  console.log("================================================");
  console.log(`DB host: ${cleanUrl.replace(/:[^:@]+@/, ":****@").split("@").pop()}`);
  console.log(`Mode:    ${FORCE ? "FORCE (wipe + reseed)" : "idempotent (skip existing)"}`);
  console.log(`Time:    ${new Date().toISOString()}`);

  try {
    await seedUsers();
    await seedAccounts();
    await seedAccountHealth();
    await seedPosts();
    await seedComments();
    await seedAnalyticsDaily();
    await seedActivities();
    await seedCampaigns();
    await seedTasks();
    await seedApprovals();
    await seedHashtagGroups();
    await seedCompetitorsListeningInfluencers();
    await reportCounts();

    console.log("\n✅ Seed script completed successfully!");
    console.log("\n   Demo login:");
    console.log("     Email:    demo@synque.app");
    console.log("     Password: demo123456");
    console.log("\n   Team members (same password):");
    console.log("     sarah@synque.app   (manager)");
    console.log("     marcus@synque.app  (editor)");
    console.log("     priya@synque.app   (viewer)");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("\n❌ Seed script failed:", msg);
    if (e instanceof Error && e.stack) console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main();
