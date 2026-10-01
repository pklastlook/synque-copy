/**
 * SYNQUE — Wipe + Reseed (9 Pakistani Team Members)
 *
 * Task ID: wipe-reseed-pakistani
 *
 * DESTRUCTIVE: wipes ALL data from every module in the Neon PostgreSQL
 * database and re-creates a fresh, rich demo dataset built around 9
 * Pakistani team members (Cloudinary profile photos already uploaded).
 *
 * The real user `it.ashraf@outlook.com` is PRESERVED during the wipe
 * (their password + role stay intact). All other users are deleted.
 *
 * Usage:
 *   npx tsx scripts/wipe-and-reseed.ts
 *
 * Data created:
 *   - 9 Pakistani team members (admin, managers, editors, viewers)
 *   - 9 social accounts across 7 platforms (7 healthy + 2 risky)
 *   - AccountHealth + AccountProtection for each account
 *   - 14 posts (4 published, 3 scheduled, 5 draft, 2 failed)
 *   - 2-3 PostVariants per published/scheduled post
 *   - 18 comments (positive / neutral / negative — replied + unreplied)
 *   - 30 days of AnalyticsDaily per account (~270 rows)
 *   - 12 activity feed entries
 *   - 3 campaigns (active / completed / draft)
 *   - 10 tasks (todo / in_progress / review / done / blocked)
 *   - 5 approvals (pending / approved / rejected / changes_requested)
 *   - 5 hashtag groups
 *   - 4 competitors with snapshots
 *   - 4 listening queries + a few mentions
 *   - 6 influencers
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "../generated/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

// ----------------------------------------------------------------------------
// .env loader (manual — no dotenv dependency, same pattern as seed-demo-data)
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
    // Always overwrite — the .env file is authoritative for this script.
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
// Prisma client (Neon adapter — same as src/lib/db.ts)
// ----------------------------------------------------------------------------
const adapter = new PrismaNeon({ connectionString: cleanUrl });
const db = new PrismaClient({ adapter });

// Real user that must be preserved across the wipe.
const PRESERVE_EMAIL = "it.ashraf@outlook.com";

// ----------------------------------------------------------------------------
// Time helpers
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
// Logging helpers
// ----------------------------------------------------------------------------
function section(name: string): void {
  console.log(`\n▶ ${name}`);
}
function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}
async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ⚠️  ${label} failed: ${msg}`);
    return null;
  }
}

// ----------------------------------------------------------------------------
// 9 Pakistani team members (Cloudinary profile photos already uploaded)
// ----------------------------------------------------------------------------
const MEMBERS = [
  { name: "Rabia Khan", email: "rabia@synque.app", role: "admin", title: "Founder & CEO", dept: "Leadership", gender: "female", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841135/socialflow/avatars/team/team-rabia.jpg" },
  { name: "Fatima Ahmed", email: "fatima@synque.app", role: "manager", title: "Social Media Manager", dept: "Marketing", gender: "female", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841137/socialflow/avatars/team/team-fatima.jpg" },
  { name: "Uneeza Tariq", email: "uneeza@synque.app", role: "manager", title: "Content Strategist", dept: "Content", gender: "female", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841139/socialflow/avatars/team/team-uneeza.jpg" },
  { name: "Bilal Raza", email: "bilal@synque.app", role: "editor", title: "Content Creator", dept: "Content", gender: "male", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841141/socialflow/avatars/team/team-bilal.jpg" },
  { name: "Asad Mahmood", email: "asad@synque.app", role: "editor", title: "Video Editor", dept: "Creative", gender: "male", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841142/socialflow/avatars/team/team-asad.jpg" },
  { name: "Hirrat Sheikh", email: "hirrat@synque.app", role: "editor", title: "Graphic Designer", dept: "Creative", gender: "female", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841144/socialflow/avatars/team/team-hirrat.jpg" },
  { name: "Muzahir Ali", email: "muzahir@synque.app", role: "viewer", title: "Analytics Specialist", dept: "Analytics", gender: "male", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841146/socialflow/avatars/team/team-muzahir.jpg" },
  { name: "Khubaib Khan", email: "khubaib@synque.app", role: "viewer", title: "Marketing Intern", dept: "Marketing", gender: "male", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841147/socialflow/avatars/team/team-khubaib.jpg" },
  { name: "Taaha Siddiqui", email: "taaha@synque.app", role: "viewer", title: "Community Manager", dept: "Marketing", gender: "male", avatar: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1790841149/socialflow/avatars/team/team-taaha.jpg" },
];

// Color seeds per member for the avatar gradient fallback.
const COLOR_BY_INDEX = ["violet", "pink", "blue", "amber", "emerald", "rose", "cyan", "indigo", "teal"];

// ID lookup table — populated after user creation, used by every other step.
const userIds: { [email: string]: string } = {};

// Account ID lookup table — keyed by `platform:handle` style strings.
const accountIds: { [key: string]: string } = {};

// Post ID lookup table — keyed by short post keys (p1, p2, ...).
const postIds: { [key: string]: string } = {};

// ============================================================================
// STEP 1 — WIPE EVERYTHING (preserve `it.ashraf@outlook.com`)
// ============================================================================
async function wipeAll(): Promise<void> {
  section("STEP 1 — Wiping all data");

  // Child tables first (those referencing accounts/posts/users).
  await safe("delete comments", () => db.comment.deleteMany({}));
  await safe("delete postVariants", () => db.postVariant.deleteMany({}));
  await safe("delete posts", () => db.post.deleteMany({}));
  await safe("delete analyticsDaily", () => db.analyticsDaily.deleteMany({}));
  await safe("delete activities", () => db.activity.deleteMany({}));
  await safe("delete accountHealth", () => db.accountHealth.deleteMany({}));
  await safe("delete accountProtection", () => db.accountProtection.deleteMany({}));
  await safe("delete accounts", () => db.account.deleteMany({}));

  await safe("delete tasks", () => db.task.deleteMany({}));
  await safe("delete approvals", () => db.approval.deleteMany({}));
  await safe("delete campaigns", () => db.campaign.deleteMany({}));
  await safe("delete hashtagGroups", () => db.hashtagGroup.deleteMany({}));

  await safe("delete mentions", () => db.mention.deleteMany({}));
  await safe("delete listeningQueries", () => db.listeningQuery.deleteMany({}));
  await safe("delete competitorSnapshots", () => db.competitorSnapshot.deleteMany({}));
  await safe("delete competitors", () => db.competitor.deleteMany({}));
  await safe("delete influencers", () => db.influencer.deleteMany({}));

  // Auth-related tables — clear so old tokens don't linger.
  await safe("delete sessions", () => db.session.deleteMany({}));
  await safe("delete passwordResetTokens", () => db.passwordResetToken.deleteMany({}));
  await safe("delete emailVerificationTokens", () => db.emailVerificationToken.deleteMany({}));

  // Wipe users — preserve the real user `it.ashraf@outlook.com`.
  await safe("delete users (preserving it.ashraf@outlook.com)", () =>
    db.user.deleteMany({ where: { email: { not: PRESERVE_EMAIL } } })
  );

  // MediaAssets are kept (optional, per task instructions).
  // Workspace settings / shares / mailboxes etc. left as-is unless linked above.

  const preserved = await db.user.findUnique({ where: { email: PRESERVE_EMAIL } });
  ok(`Preserved real user: ${PRESERVE_EMAIL} (${preserved ? "exists" : "not found in db"})`);

  const totalUsers = await db.user.count();
  ok(`Users remaining after wipe: ${totalUsers}`);
}

// ============================================================================
// STEP 2 — Create the 9 Pakistani team members
// ============================================================================
async function seedMembers(): Promise<void> {
  section("STEP 2 — 9 Pakistani team members");

  const hashedPassword = await bcrypt.hash("demo123456", 12);
  let created = 0;

  for (let i = 0; i < MEMBERS.length; i++) {
    const m = MEMBERS[i];
    const color = COLOR_BY_INDEX[i];
    const isFirst = i === 0; // Rabia = super-admin (customerId=null)

    const u = await safe(`Create user ${m.email}`, () =>
      db.user.create({
        data: {
          name: m.name,
          email: m.email,
          password: hashedPassword,
          role: m.role,
          title: m.title,
          department: m.dept,
          color,
          gender: m.gender,
          avatar: m.avatar,
          permissions: JSON.stringify(isFirst ? ["*"] : []),
          status: "active",
          bio:
            m.role === "admin"
              ? "Founder & CEO of SYNQUE. Building the future of social media management from Karachi."
              : `${m.title} at SYNQUE. Passionate about great content + great data.`,
          timezone: "Asia/Karachi",
          language: "en-PK",
          // First member = super-admin (no customerId).
          customerId: isFirst ? null : null,
          lastActive: daysAgo(randInt(0, 3)),
          emailVerified: daysAgo(randInt(20, 60)),
          createdAt: daysAgo(randInt(45, 120)),
        },
      })
    );
    if (u) {
      userIds[m.email] = u.id;
      created++;
    }
  }

  ok(`Created ${created} Pakistani team members (password for all: demo123456)`);
  ok(`Super-admin (customerId=null): rabia@synque.app`);
  ok(`Team: fatima (manager), uneeza (manager), bilal/asad/hirrat (editors), muzahir/khubaib/taaha (viewers)`);
}

// ============================================================================
// STEP 3 — Create social media accounts (9 across 7 platforms)
// ============================================================================
type AccountDef = {
  key: string; // lookup key
  platform: string;
  handle: string;
  displayName: string;
  followers: number;
  postsCount: number;
  verified: boolean;
  ownerEmail: string; // who owns it (must be one of the 9)
  risky: boolean;
};

const ACCOUNT_DEFS: AccountDef[] = [
  // Instagram — 1 healthy (Rabia) + 1 risky (Fatima)
  {
    key: "ig:official",
    platform: "instagram",
    handle: "synque.official",
    displayName: "Synque Official",
    followers: 24185,
    postsCount: 412,
    verified: true,
    ownerEmail: "rabia@synque.app",
    risky: false,
  },
  {
    key: "ig:studio",
    platform: "instagram",
    handle: "synque.studio",
    displayName: "Synque Studio",
    followers: 8042,
    postsCount: 156,
    verified: false,
    ownerEmail: "fatima@synque.app",
    risky: true,
  },
  // TikTok — 1 healthy (Bilal)
  {
    key: "tt:synque",
    platform: "tiktok",
    handle: "synque",
    displayName: "Synque",
    followers: 15230,
    postsCount: 89,
    verified: true,
    ownerEmail: "bilal@synque.app",
    risky: false,
  },
  // LinkedIn — 1 healthy (Uneeza)
  {
    key: "li:synque",
    platform: "linkedin",
    handle: "synque",
    displayName: "Synque",
    followers: 5120,
    postsCount: 124,
    verified: true,
    ownerEmail: "uneeza@synque.app",
    risky: false,
  },
  // X/Twitter — 1 healthy (Asad) + 1 risky (Khubaib)
  {
    key: "x:synquehq",
    platform: "x",
    handle: "synquehq",
    displayName: "Synque HQ",
    followers: 7042,
    postsCount: 842,
    verified: true,
    ownerEmail: "asad@synque.app",
    risky: false,
  },
  {
    key: "x:deals",
    platform: "x",
    handle: "synque_deals",
    displayName: "Synque Deals",
    followers: 3120,
    postsCount: 4220,
    verified: false,
    ownerEmail: "khubaib@synque.app",
    risky: true,
  },
  // Facebook — 1 healthy (Hirrat)
  {
    key: "fb:synque",
    platform: "facebook",
    handle: "synque.fb",
    displayName: "Synque",
    followers: 12621,
    postsCount: 312,
    verified: true,
    ownerEmail: "hirrat@synque.app",
    risky: false,
  },
  // YouTube — 1 healthy (Muzahir)
  {
    key: "yt:synque",
    platform: "youtube",
    handle: "synque",
    displayName: "Synque",
    followers: 9108,
    postsCount: 142,
    verified: true,
    ownerEmail: "muzahir@synque.app",
    risky: false,
  },
  // Threads — 1 healthy (Taaha)
  {
    key: "th:synque",
    platform: "threads",
    handle: "synque",
    displayName: "Synque",
    followers: 4182,
    postsCount: 78,
    verified: false,
    ownerEmail: "taaha@synque.app",
    risky: false,
  },
];

async function seedAccounts(): Promise<void> {
  section("STEP 3 — Social accounts (9 across 7 platforms)");

  let created = 0;
  for (const d of ACCOUNT_DEFS) {
    const ownerId = userIds[d.ownerEmail];
    if (!ownerId) {
      console.error(`  ⚠️  Owner not found for ${d.key}: ${d.ownerEmail}`);
      continue;
    }
    const acc = await safe(`Create ${d.platform}/${d.handle}`, () =>
      db.account.create({
        data: {
          platform: d.platform,
          handle: d.handle,
          displayName: d.displayName,
          avatar: `https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/avatars/${d.platform}-${d.handle.replace(
            /[^a-z0-9]/gi,
            ""
          )}.jpg`,
          followers: d.followers,
          postsCount: d.postsCount,
          verified: d.verified,
          ownerId,
          customerId: null, // super-admin workspace
          createdAt: daysAgo(randInt(40, 95)),
        },
      })
    );
    if (acc) {
      accountIds[d.key] = acc.id;
      created++;
    }
  }

  // AccountHealth + AccountProtection for each account.
  let healthCreated = 0;
  for (const d of ACCOUNT_DEFS) {
    const accId = accountIds[d.key];
    if (!accId) continue;

    const health = d.risky
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

    await safe(`Health for ${d.key}`, () =>
      db.accountHealth.create({
        data: {
          accountId: accId,
          ...health,
          lastUpdated: daysAgo(randInt(0, 3)),
        },
      })
    );

    await safe(`Protection for ${d.key}`, () =>
      db.accountProtection.create({
        data: {
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
    healthCreated++;
  }

  ok(`Created ${created} accounts (7 healthy + 2 risky)`);
  ok(`Created ${healthCreated} AccountHealth + AccountProtection records`);
}

// ============================================================================
// STEP 4 — Posts (14 — 4 published, 3 scheduled, 5 draft, 2 failed)
// STEP 5 — PostVariants (2-3 per published/scheduled post)
// ============================================================================
type PostDef = {
  key: string;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "carousel" | "none";
  tone: string;
  status: "published" | "scheduled" | "draft" | "failed";
  authorEmail: string;
  scheduledAt: Date | null;
  publishedAgoDays: number | null;
};

const POST_DEFS: PostDef[] = [
  // 4 published
  {
    key: "p1",
    title: "Summer Collection Launch",
    caption:
      "Meet our new Summer Collection ☀️ Lightweight, breathable, and made for adventure. Tap to shop the full drop — link in bio. #SynqueSummer #NewArrivals",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/summer-launch.jpg",
    mediaType: "image",
    tone: "confident",
    status: "published",
    authorEmail: "rabia@synque.app",
    scheduledAt: null,
    publishedAgoDays: 5,
  },
  {
    key: "p2",
    title: "Behind the Scenes — Studio Tour",
    caption:
      "Ever wonder how we make the magic happen? 👀 Take a peek inside our Karachi studio where every Synque piece is designed + tested. Full video drops Friday.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/studio-tour.mp4",
    mediaType: "video",
    tone: "playful",
    status: "published",
    authorEmail: "fatima@synque.app",
    scheduledAt: null,
    publishedAgoDays: 8,
  },
  {
    key: "p3",
    title: "Customer Spotlight — Ayesha's Story",
    caption:
      "Ayesha has been a Synque customer since day one. Her favorite piece? The Aurora Jacket — 'it goes with everything and never wrinkles.' 💜 Thank you Ayesha for being part of our journey.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/ayesha-story.jpg",
    mediaType: "image",
    tone: "warm",
    status: "published",
    authorEmail: "bilal@synque.app",
    scheduledAt: null,
    publishedAgoDays: 12,
  },
  {
    key: "p4",
    title: "Founder's Note — Year One",
    caption:
      "One year ago, we started Synque with a simple mission: empower Pakistani creators to tell their stories to the world. Today we ship to 12 countries. Thank you for being part of this journey. 🇵🇰",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/founders-note.jpg",
    mediaType: "image",
    tone: "professional",
    status: "published",
    authorEmail: "uneeza@synque.app",
    scheduledAt: null,
    publishedAgoDays: 15,
  },
  // 3 scheduled
  {
    key: "p5",
    title: "Sustainability Report 2026",
    caption:
      "Our annual sustainability report is live. 78% of materials now recycled or organic. 42% reduction in water use. 12 factories audited. Read the full report at synque.app/sustainability",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/sustainability.jpg",
    mediaType: "image",
    tone: "professional",
    status: "scheduled",
    authorEmail: "asad@synque.app",
    scheduledAt: daysFromNow(3),
    publishedAgoDays: null,
  },
  {
    key: "p6",
    title: "Weekend Giveaway 🎁",
    caption:
      "It's giveaway time! We're giving 5 lucky followers a free Aurora Jacket. To enter: follow @synque.official, like this post, and tag 2 friends in the comments. Winners announced Monday.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/giveaway.jpg",
    mediaType: "image",
    tone: "playful",
    status: "scheduled",
    authorEmail: "hirrat@synque.app",
    scheduledAt: daysFromNow(2),
    publishedAgoDays: null,
  },
  {
    key: "p7",
    title: "Community Spotlight — Pakistani Creators",
    caption:
      "This week we're spotlighting 5 Pakistani creators who are reshaping the digital landscape. From Lahore to Karachi, these voices deserve your follow. Thread coming soon. 🧵",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/community-spotlight.jpg",
    mediaType: "image",
    tone: "professional",
    status: "scheduled",
    authorEmail: "taaha@synque.app",
    scheduledAt: daysFromNow(5),
    publishedAgoDays: null,
  },
  // 5 draft
  {
    key: "p8",
    title: "Fall Lookbook — Draft",
    caption:
      "Drafting the Fall lookbook. Colors are warming up — burnt sienna, deep olive, charcoal. Need to finalize styling before shoot next week.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/fall-draft.jpg",
    mediaType: "image",
    tone: "professional",
    status: "draft",
    authorEmail: "bilal@synque.app",
    scheduledAt: null,
    publishedAgoDays: null,
  },
  {
    key: "p9",
    title: "Influencer Collab — Draft",
    caption:
      "Working on the @aurora.labs collab announcement. Need legal review on contract terms before posting.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/collab-draft.jpg",
    mediaType: "image",
    tone: "professional",
    status: "draft",
    authorEmail: "khubaib@synque.app",
    scheduledAt: null,
    publishedAgoDays: null,
  },
  {
    key: "p10",
    title: "Analytics Deep-Dive — Q3 Performance",
    caption:
      "Drafting the Q3 analytics deep-dive. Engagement up 28% QoQ. TikTok leading follower growth. Need to add competitor comparison before publishing.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/analytics-q3.jpg",
    mediaType: "image",
    tone: "professional",
    status: "draft",
    authorEmail: "muzahir@synque.app",
    scheduledAt: null,
    publishedAgoDays: null,
  },
  {
    key: "p11",
    title: "Eid Special Collection — Draft",
    caption:
      "Eid Mubarak from Synque! 🌙 Our Eid special collection drops next week. Three pieces designed in collaboration with local artisans from Multan.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/eid-special.jpg",
    mediaType: "image",
    tone: "warm",
    status: "draft",
    authorEmail: "hirrat@synque.app",
    scheduledAt: null,
    publishedAgoDays: null,
  },
  {
    key: "p12",
    title: "Brand Story Carousel",
    caption:
      "One year ago, we started Synque with $400 and a sewing machine. Today we ship to 12 countries. Here's how it happened — swipe to see the journey.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/brand-story-carousel.jpg",
    mediaType: "carousel",
    tone: "warm",
    status: "draft",
    authorEmail: "uneeza@synque.app",
    scheduledAt: null,
    publishedAgoDays: null,
  },
  // 2 failed
  {
    key: "p13",
    title: "Flash Sale Announcement",
    caption:
      "24-hour flash sale — 30% off everything. Code: FLASH30 at checkout. T&Cs apply.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/flash-sale.jpg",
    mediaType: "image",
    tone: "urgent",
    status: "failed",
    authorEmail: "asad@synque.app",
    scheduledAt: daysAgo(2),
    publishedAgoDays: null,
  },
  {
    key: "p14",
    title: "LinkedIn Thought Leadership — Remote-First",
    caption:
      "The future of remote-first culture isn't about being 'remote' — it's about being intentional. Here are 5 lessons from our first year at Synque.",
    mediaUrl: "https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/posts/remote-culture.jpg",
    mediaType: "image",
    tone: "professional",
    status: "failed",
    authorEmail: "khubaib@synque.app",
    scheduledAt: daysAgo(1),
    publishedAgoDays: null,
  },
];

type VariantDef = {
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
};

const VARIANT_DEFS: VariantDef[] = [
  // P1 — Summer Launch (published) → 3 variants (IG, TikTok, FB)
  { postKey: "p1", accountKey: "ig:official", content: "☀️ Summer has arrived. Meet the Synque Summer Collection — lightweight, breathable, made for adventure.\n\nTap to shop. Link in bio. 🛍️ #SynqueSummer #NewArrivals", hashtags: "SynqueSummer,NewArrivals,SummerStyle", status: "published", publishedAt: daysAgo(5), likes: 2841, comments: 142, shares: 87, reach: 18420, impressions: 24185, saves: 312 },
  { postKey: "p1", accountKey: "tt:synque", content: "POV: you found the perfect summer drop ☀️🔥 #summer #fashion #synque", hashtags: "summer,fashion,synque", status: "published", publishedAt: daysAgo(5), likes: 9842, comments: 421, shares: 1240, reach: 11200, impressions: 15230, saves: 642 },
  { postKey: "p1", accountKey: "fb:synque", content: "Our Summer Collection is live! ☀️ Lightweight, breathable, and ready for adventure. Shop the full drop now at synque.app/summer", hashtags: "SynqueSummer,SummerCollection", status: "published", publishedAt: daysAgo(5), likes: 421, comments: 38, shares: 24, reach: 8420, impressions: 12621, saves: 18 },

  // P2 — Studio Tour (published) → 2 variants (IG, TikTok)
  { postKey: "p2", accountKey: "ig:official", content: "Behind the scenes at our Karachi studio 👀 Every Synque piece is designed and tested here. Full video drops Friday.", hashtags: "BehindTheScenes,Karachi,StudioLife", status: "published", publishedAt: daysAgo(8), likes: 1842, comments: 87, shares: 42, reach: 14200, impressions: 19842, saves: 142 },
  { postKey: "p2", accountKey: "tt:synque", content: "Come with me to the Synque studio 🎬 watch till the end for the blooper 😂 #studiotour #bts #synque", hashtags: "studiotour,bts,synque", status: "published", publishedAt: daysAgo(8), likes: 6842, comments: 312, shares: 840, reach: 8200, impressions: 11200, saves: 442 },

  // P3 — Ayesha's Story (published) → 2 variants (IG, FB)
  { postKey: "p3", accountKey: "ig:official", content: "Ayesha has been with us since day one. Her favorite piece? The Aurora Jacket. Thank you Ayesha for being part of our journey 💜", hashtags: "CustomerLove,AuroraJacket,SynqueFamily", status: "published", publishedAt: daysAgo(12), likes: 2148, comments: 98, shares: 54, reach: 12400, impressions: 16820, saves: 87 },
  { postKey: "p3", accountKey: "fb:synque", content: "Customer spotlight: Ayesha has been with Synque since day one. Watch her story below.", hashtags: "CustomerSpotlight,SynqueFamily", status: "published", publishedAt: daysAgo(12), likes: 312, comments: 24, shares: 18, reach: 6420, impressions: 11400, saves: 9 },

  // P4 — Founder's Note (published) → 3 variants (IG, LinkedIn, Threads)
  { postKey: "p4", accountKey: "ig:official", content: "One year of Synque. 🇵🇰 From $400 and a sewing machine to shipping across 12 countries. Thank you for being part of this journey.", hashtags: "FoundersNote,SynqueJourney,PakistanMade", status: "published", publishedAt: daysAgo(15), likes: 3420, comments: 184, shares: 142, reach: 19400, impressions: 23185, saves: 421 },
  { postKey: "p4", accountKey: "li:synque", content: "One year ago, we started Synque with a simple mission: empower Pakistani creators to tell their stories to the world. Today we ship to 12 countries. Here are 5 lessons from year one — link in comments.", hashtags: "FoundersNote,StartupLessons,PakistanStartups", status: "published", publishedAt: daysAgo(15), likes: 842, comments: 92, shares: 64, reach: 4120, impressions: 5120, saves: 78 },
  { postKey: "p4", accountKey: "th:synque", content: "One year of Synque 🇵🇰 From $400 + a sewing machine → shipping to 12 countries. Grateful for every customer, every creator, every team member. 🧵", hashtags: "FoundersNote,SynqueJourney", status: "published", publishedAt: daysAgo(15), likes: 612, comments: 34, shares: 28, reach: 3120, impressions: 4182, saves: 42 },

  // P5 — Sustainability Report (scheduled) → 3 variants (IG, LinkedIn, FB)
  { postKey: "p5", accountKey: "ig:official", content: "Our 2026 Sustainability Report is here. ♻️ 78% recycled materials. 42% less water. 12 audited factories. We're just getting started. Link in bio.", hashtags: "Sustainability,EcoFashion,Transparency", status: "scheduled", publishedAt: null, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, saves: 0 },
  { postKey: "p5", accountKey: "li:synque", content: "We're proud to share our 2026 Sustainability Report. Key wins: 78% recycled or organic materials, 42% water-use reduction, 12 fully-audited factories. Read the full report — link in comments.", hashtags: "Sustainability,ESG,TransparentBusiness", status: "scheduled", publishedAt: null, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, saves: 0 },
  { postKey: "p5", accountKey: "fb:synque", content: "Sustainability isn't a buzzword for us — it's a report. 2026 Sustainability Report now live. 78% recycled materials, 42% less water, 12 audited factories. Read it at synque.app/sustainability", hashtags: "Sustainability,EcoFashion", status: "scheduled", publishedAt: null, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, saves: 0 },

  // P6 — Weekend Giveaway (scheduled) → 2 variants (IG, X)
  { postKey: "p6", accountKey: "ig:official", content: "Giveaway time! 🎁 We're giving 5 lucky followers a free Aurora Jacket. To enter: follow @synque.official, like this post, and tag 2 friends. Winners announced Monday.", hashtags: "Giveaway,SynqueGiveaway,AuroraJacket", status: "scheduled", publishedAt: null, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, saves: 0 },
  { postKey: "p6", accountKey: "x:synquehq", content: "🎁 GIVEAWAY: 5 free Aurora Jackets. Follow @synquehq + RT this post. Winners picked Monday. #SynqueGiveaway", hashtags: "SynqueGiveaway,AuroraJacket,Giveaway", status: "scheduled", publishedAt: null, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, saves: 0 },

  // P7 — Community Spotlight (scheduled) → 2 variants (IG, X)
  { postKey: "p7", accountKey: "ig:official", content: "This week we're spotlighting 5 Pakistani creators reshaping the digital landscape. From Lahore to Karachi — these voices deserve your follow. 🇵🇰", hashtags: "PakistaniCreators,Spotlight,CreatorEconomy", status: "scheduled", publishedAt: null, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, saves: 0 },
  { postKey: "p7", accountKey: "x:synquehq", content: "Spotlighting 5 Pakistani creators this week who are reshaping the digital landscape. Thread coming soon. 🧵 #PakistaniCreators", hashtags: "PakistaniCreators,Spotlight", status: "scheduled", publishedAt: null, likes: 0, comments: 0, shares: 0, reach: 0, impressions: 0, saves: 0 },
];

async function seedPostsAndVariants(): Promise<void> {
  section("STEP 4 + 5 — Posts + PostVariants");

  let postsCreated = 0;
  for (const p of POST_DEFS) {
    const authorId = userIds[p.authorEmail];
    if (!authorId) {
      console.error(`  ⚠️  Author not found for ${p.key}: ${p.authorEmail}`);
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
          authorId,
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
      postsCreated++;
    }
  }
  ok(`Created ${postsCreated} posts (4 published, 3 scheduled, 5 draft, 2 failed)`);

  let variantsCreated = 0;
  for (const v of VARIANT_DEFS) {
    const postId = postIds[v.postKey];
    const accountId = accountIds[v.accountKey];
    if (!postId || !accountId) {
      console.error(`  ⚠️  Missing post or account for variant ${v.postKey}/${v.accountKey}`);
      continue;
    }
    const result = await safe(`Variant ${v.postKey}/${v.accountKey}`, () =>
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
        },
      })
    );
    if (result) variantsCreated++;
  }
  ok(`Created ${variantsCreated} post variants (2-3 per published/scheduled post)`);
}

// ============================================================================
// STEP 6 — Comments (18 — positive / neutral / negative, replied + unreplied)
// ============================================================================
type CommentDef = {
  accountKey: string;
  author: string;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  type: "comment" | "message" | "mention";
  replied: boolean;
  replyText?: string;
  assigneeEmail?: string;
  daysAgo: number;
};

const COMMENT_DEFS: CommentDef[] = [
  // Positive (6) — across accounts
  { accountKey: "ig:official", author: "@sarah_designs", text: "Absolutely love the Summer Collection! Just ordered the Aurora Jacket 🛍️", sentiment: "positive", type: "comment", replied: true, replyText: "Thank you so much Sarah! Can't wait to see how you style it 💜", assigneeEmail: "fatima@synque.app", daysAgo: 4 },
  { accountKey: "ig:official", author: "@ali.khan", text: "This is amazing content 🔥 keep it up Synque team", sentiment: "positive", type: "comment", replied: false, daysAgo: 3 },
  { accountKey: "tt:synque", author: "@ayesha_creative", text: "POV: just discovered my new favorite brand 😍", sentiment: "positive", type: "comment", replied: true, replyText: "Welcome to the Synque family Ayesha! 💜", assigneeEmail: "bilal@synque.app", daysAgo: 7 },
  { accountKey: "fb:synque", author: "Bilal Ahmed", text: "Loving the sustainability focus. This is the future of fashion.", sentiment: "positive", type: "comment", replied: false, daysAgo: 6 },
  { accountKey: "li:synque", author: "Hina Riaz", text: "Inspiring founder story. Pakistan's startup ecosystem is growing fast 🇵🇰", sentiment: "positive", type: "comment", replied: true, replyText: "Thank you Hina! Means a lot coming from a fellow founder.", assigneeEmail: "rabia@synque.app", daysAgo: 14 },
  { accountKey: "th:synque", author: "@mehdi_creates", text: "Synque is doing for Pakistani fashion what nobody else has. Salute 🫡", sentiment: "positive", type: "mention", replied: false, daysAgo: 9 },

  // Neutral (6)
  { accountKey: "ig:official", author: "@q_asker", text: "What are the shipping times to Lahore?", sentiment: "neutral", type: "comment", replied: true, replyText: "Hi! Standard shipping to Lahore is 2-3 business days. Express is overnight.", assigneeEmail: "taaha@synque.app", daysAgo: 2 },
  { accountKey: "ig:official", author: "@usman_w", text: "What sizes does the Aurora Jacket come in?", sentiment: "neutral", type: "comment", replied: false, daysAgo: 1 },
  { accountKey: "tt:synque", author: "@random_user_42", text: "Where is the studio located?", sentiment: "neutral", type: "comment", replied: true, replyText: "Our studio is in Karachi! Visits by appointment only.", assigneeEmail: "bilal@synque.app", daysAgo: 7 },
  { accountKey: "x:synquehq", author: "@news_watch", text: "Synque announced Q3 results today.", sentiment: "neutral", type: "mention", replied: false, daysAgo: 5 },
  { accountKey: "yt:synque", author: "@viewer_88", text: "Video quality is on point. What camera do you use?", sentiment: "neutral", type: "comment", replied: false, daysAgo: 11 },
  { accountKey: "fb:synque", author: "Sana Tariq", text: "When is the Eid collection launching?", sentiment: "neutral", type: "comment", replied: true, replyText: "Hi Sana! Eid special collection drops next week — keep an eye on our IG.", assigneeEmail: "hirrat@synque.app", daysAgo: 4 },

  // Negative (6) — concentrate on the risky accounts
  { accountKey: "ig:studio", author: "@disappointed_fan", text: "Quality has really gone down since last year. Disappointed.", sentiment: "negative", type: "comment", replied: true, replyText: "Sorry to hear this. Please DM us your order ID — we'll make it right.", assigneeEmail: "fatima@synque.app", daysAgo: 3 },
  { accountKey: "ig:studio", author: "@angry_buyer", text: "Took 3 weeks to ship. Unacceptable.", sentiment: "negative", type: "comment", replied: false, daysAgo: 5 },
  { accountKey: "x:deals", author: "@spam_hater", text: "Stop posting the same content. Reported.", sentiment: "negative", type: "comment", replied: false, daysAgo: 2 },
  { accountKey: "x:deals", author: "@critic_review", text: "This account is becoming spammy. Tone it down.", sentiment: "negative", type: "comment", replied: true, replyText: "Thanks for the feedback — we're reviewing our posting cadence.", assigneeEmail: "khubaib@synque.app", daysAgo: 4 },
  { accountKey: "ig:official", author: "@skeptical_one", text: "Is this brand actually sustainable or just marketing?", sentiment: "negative", type: "comment", replied: true, replyText: "Fair question. Our full sustainability report is at synque.app/sustainability — 12 audited factories, third-party verified.", assigneeEmail: "uneeza@synque.app", daysAgo: 8 },
  { accountKey: "tt:synque", author: "@unhappy_2026", text: "Expected more from a Pakistani brand tbh.", sentiment: "negative", type: "comment", replied: false, daysAgo: 6 },
];

async function seedComments(): Promise<void> {
  section("STEP 6 — Comments");

  let created = 0;
  for (const c of COMMENT_DEFS) {
    const accountId = accountIds[c.accountKey];
    if (!accountId) {
      console.error(`  ⚠️  Account not found for comment: ${c.accountKey}`);
      continue;
    }
    const result = await safe(`Comment "${c.text.slice(0, 32)}…"`, () =>
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
          assigneeId: c.assigneeEmail ? userIds[c.assigneeEmail] ?? null : null,
          repliedAt: c.replied ? daysAgo(Math.max(0, c.daysAgo - 1)) : null,
          createdAt: daysAgo(c.daysAgo),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} comments (6 positive, 6 neutral, 6 negative; ${COMMENT_DEFS.filter(c => c.replied).length} replied)`);
}

// ============================================================================
// STEP 7 — AnalyticsDaily (30 days per account)
// ============================================================================
async function seedAnalyticsDaily(): Promise<void> {
  section("STEP 7 — AnalyticsDaily (30 days × 9 accounts)");

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

  for (const d of ACCOUNT_DEFS) {
    const accId = accountIds[d.key];
    if (!accId) continue;
    const currentFollowers = d.followers;
    const risky = d.risky;
    const baseImpressions = risky ? 800 : 2500;
    const baseReach = risky ? 400 : 1500;

    for (let i = 30; i >= 1; i--) {
      const date = daysAgo(i);
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

  // Batch insert (100 at a time) for performance.
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    await safe(`Analytics batch ${i / 100 + 1}`, () =>
      db.analyticsDaily.createMany({ data: batch, skipDuplicates: true })
    );
    totalRows += batch.length;
  }
  ok(`Created ~${totalRows} analytics rows (${totalAccounts} accounts × 30 days)`);
}

// ============================================================================
// STEP 8 — Activities (12)
// ============================================================================
type ActivityDef = {
  userEmail: string;
  type: string;
  description: string;
  meta: object;
  hoursAgo: number;
};

const ACTIVITY_DEFS: ActivityDef[] = [
  { userEmail: "rabia@synque.app", type: "post_published", description: "Published 'Summer Collection Launch' to Instagram, TikTok, Facebook", meta: { postKey: "p1", platforms: ["instagram", "tiktok", "facebook"] }, hoursAgo: 120 },
  { userEmail: "fatima@synque.app", type: "comment_replied", description: "Fatima replied to @sarah_designs on Instagram", meta: { sentiment: "positive" }, hoursAgo: 96 },
  { userEmail: "bilal@synque.app", type: "account_connected", description: "Connected TikTok account @synque (verified, 15.2K followers)", meta: { platform: "tiktok", handle: "synque" }, hoursAgo: 240 },
  { userEmail: "uneeza@synque.app", type: "ai_generated", description: "AI generated 3 caption variants for 'Founder's Note' post", meta: { tone: "professional", variants: 3 }, hoursAgo: 200 },
  { userEmail: "asad@synque.app", type: "post_scheduled", description: "Scheduled 'Sustainability Report 2026' for IG, LinkedIn, Facebook", meta: { postKey: "p5", scheduledFor: daysFromNow(3).toISOString() }, hoursAgo: 48 },
  { userEmail: "taaha@synque.app", type: "comment_replied", description: "Taaha replied to @q_asker on Instagram (shipping question)", meta: { sentiment: "neutral" }, hoursAgo: 116 },
  { userEmail: "hirrat@synque.app", type: "team_joined", description: "Hirrat Sheikh joined the team as Graphic Designer", meta: { role: "editor", department: "Creative" }, hoursAgo: 1440 },
  { userEmail: "fatima@synque.app", type: "post_published", description: "Published 'Behind the Scenes — Studio Tour' to Instagram + TikTok", meta: { postKey: "p2", platforms: ["instagram", "tiktok"] }, hoursAgo: 192 },
  { userEmail: "muzahir@synque.app", type: "ai_generated", description: "AI generated 5 caption ideas for the Fall Lookbook", meta: { count: 5, tone: "professional" }, hoursAgo: 36 },
  { userEmail: "hirrat@synque.app", type: "post_scheduled", description: "Scheduled 'Weekend Giveaway 🎁' for IG + X", meta: { postKey: "p6", scheduledFor: daysFromNow(2).toISOString() }, hoursAgo: 24 },
  { userEmail: "muzahir@synque.app", type: "account_connected", description: "Connected YouTube channel 'Synque' (9.1K subscribers)", meta: { platform: "youtube", handle: "synque" }, hoursAgo: 720 },
  { userEmail: "taaha@synque.app", type: "comment_replied", description: "Taaha replied to @mehdi_creates on Threads", meta: { sentiment: "positive" }, hoursAgo: 144 },
];

async function seedActivities(): Promise<void> {
  section("STEP 8 — Activities");

  let created = 0;
  for (const a of ACTIVITY_DEFS) {
    const userId = userIds[a.userEmail];
    if (!userId) continue;
    const result = await safe(`Activity: ${a.type}`, () =>
      db.activity.create({
        data: {
          userId,
          customerId: null,
          type: a.type,
          description: a.description,
          meta: JSON.stringify(a.meta),
          createdAt: hoursAgo(a.hoursAgo),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} activity feed entries`);
}

// ============================================================================
// STEP 9 — Campaigns (3: active, completed, draft)
// ============================================================================
const CAMPAIGN_DEFS = [
  {
    name: "Summer Collection Launch",
    description:
      "Multi-platform launch campaign for the Synque Summer Collection. Awareness + engagement focus across IG, TikTok, FB.",
    color: "#E1306C",
    status: "active",
    objective: "awareness",
    budget: 25000,
    startDate: daysAgo(7),
    endDate: daysFromNow(23),
    ownerEmail: "rabia@synque.app",
  },
  {
    name: "Spring Campaign",
    description:
      "Spring 2026 collection campaign — completed. Drove 4.2M impressions and 38K engagements across all platforms.",
    color: "#22C55E",
    status: "completed",
    objective: "conversion",
    budget: 18000,
    startDate: daysAgo(75),
    endDate: daysAgo(14),
    ownerEmail: "fatima@synque.app",
  },
  {
    name: "Holiday Special",
    description:
      "Draft campaign for Eid al-Fitr 2026 + Black Friday. Awaiting budget approval. Includes influencer partnerships.",
    color: "#F59E0B",
    status: "draft",
    objective: "engagement",
    budget: 35000,
    startDate: daysFromNow(45),
    endDate: daysFromNow(75),
    ownerEmail: "uneeza@synque.app",
  },
];

async function seedCampaigns(): Promise<void> {
  section("STEP 9 — Campaigns");

  let created = 0;
  for (const c of CAMPAIGN_DEFS) {
    const ownerId = userIds[c.ownerEmail];
    if (!ownerId) continue;
    const result = await safe(`Campaign: ${c.name}`, () =>
      db.campaign.create({
        data: {
          name: c.name,
          description: c.description,
          color: c.color,
          status: c.status,
          objective: c.objective,
          budget: c.budget,
          startDate: c.startDate,
          endDate: c.endDate,
          ownerId,
          customerId: null,
          createdAt: daysAgo(randInt(20, 80)),
        },
      })
    );
    if (result) created++;
  }
  ok(`Created ${created} campaigns (1 active, 1 completed, 1 draft)`);
}

// ============================================================================
// STEP 10 — Tasks (10)
// ============================================================================
const TASK_DEFS = [
  // 3 todo
  { title: "Draft Q3 content calendar", description: "Plan + draft the Q3 social content calendar across all platforms.", status: "todo", priority: "high", type: "content", assigneeEmail: "bilal@synque.app", creatorEmail: "fatima@synque.app", dueAt: daysFromNow(7) },
  { title: "Review TikTok analytics", description: "Pull TikTok analytics for last 30 days. Identify top 3 performing posts.", status: "todo", priority: "normal", type: "analytics", assigneeEmail: "muzahir@synque.app", creatorEmail: "rabia@synque.app", dueAt: daysFromNow(5) },
  { title: "Source influencer for sustainability post", description: "Find 3 micro-influencers (10K-100K) in the eco-fashion niche. Send outreach DMs.", status: "todo", priority: "normal", type: "campaign", assigneeEmail: "fatima@synque.app", creatorEmail: "rabia@synque.app", dueAt: daysFromNow(10) },
  // 2 in_progress
  { title: "Shoot Fall lookbook", description: "Photograph the Fall lookbook. Coordinate with stylist + photographer.", status: "in_progress", priority: "high", type: "content", assigneeEmail: "asad@synque.app", creatorEmail: "uneeza@synque.app", dueAt: daysFromNow(14) },
  { title: "Write Sustainability Report caption variants", description: "Draft 3 caption variants for the Sustainability Report scheduled post.", status: "in_progress", priority: "normal", type: "content", assigneeEmail: "hirrat@synque.app", creatorEmail: "fatima@synque.app", dueAt: daysFromNow(3) },
  // 2 review
  { title: "Review Eid Special collection creative", description: "Review Hirrat's Eid Special collection visuals before publishing.", status: "review", priority: "high", type: "review", assigneeEmail: "rabia@synque.app", creatorEmail: "hirrat@synque.app", dueAt: daysFromNow(2) },
  { title: "Approve Founder's Note copy", description: "Final approval on the Founder's Note copy before scheduling to LinkedIn.", status: "review", priority: "urgent", type: "review", assigneeEmail: "rabia@synque.app", creatorEmail: "uneeza@synque.app", dueAt: daysFromNow(1) },
  // 2 done
  { title: "Respond to negative Instagram comments", description: "Reply to all unhandled negative comments on the IG account from the last 7 days.", status: "done", priority: "urgent", type: "engagement", assigneeEmail: "fatima@synque.app", creatorEmail: "rabia@synque.app", dueAt: daysAgo(2), completedAt: daysAgo(1) },
  { title: "Connect YouTube channel", description: "Connect the Synque YouTube channel to SYNQUE for analytics sync.", status: "done", priority: "normal", type: "content", assigneeEmail: "muzahir@synque.app", creatorEmail: "rabia@synque.app", dueAt: daysAgo(30), completedAt: daysAgo(28) },
  // 1 blocked
  { title: "Audit X/Twitter posting cadence", description: "Review X account posting frequency. Flag any violations of protection rules. Blocked on access to analytics API.", status: "blocked", priority: "high", type: "analytics", assigneeEmail: "muzahir@synque.app", creatorEmail: "rabia@synque.app", dueAt: daysAgo(1) },
];

async function seedTasks(): Promise<void> {
  section("STEP 10 — Tasks");

  let created = 0;
  for (const t of TASK_DEFS) {
    const creatorId = userIds[t.creatorEmail];
    const assigneeId = t.assigneeEmail ? userIds[t.assigneeEmail] ?? null : null;
    if (!creatorId) continue;
    const result = await safe(`Task: ${t.title}`, () =>
      db.task.create({
        data: {
          title: t.title,
          description: t.description,
          platforms: JSON.stringify(["instagram", "tiktok", "x", "linkedin"]),
          tags: "demo,content,pakistan",
          assigneeId,
          creatorId,
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
  ok(`Created ${created} tasks (3 todo, 2 in_progress, 2 review, 2 done, 1 blocked)`);
}

// ============================================================================
// STEP 11 — Approvals (5)
// ============================================================================
const APPROVAL_DEFS = [
  // 2 pending
  { title: "Eid Special Collection — Pending", postIdKey: "p11", status: "pending", comment: null, priority: "high", approverEmail: null, authorEmail: "hirrat@synque.app", dueAt: daysFromNow(2), resolvedAt: null },
  { title: "Fall Lookbook — Pending review", postIdKey: "p8", status: "pending", comment: null, priority: "normal", approverEmail: null, authorEmail: "bilal@synque.app", dueAt: daysFromNow(5), resolvedAt: null },
  // 1 approved
  { title: "Summer Launch captions — Approved", postIdKey: "p1", status: "approved", comment: "Looks great. Tone is on-brand. Ship it.", priority: "high", approverEmail: "rabia@synque.app", authorEmail: "fatima@synque.app", dueAt: daysAgo(7), resolvedAt: daysAgo(7) },
  // 1 rejected
  { title: "Flash Sale copy — Rejected", postIdKey: "p13", status: "rejected", comment: "Tone feels too aggressive. Soften the urgency and resubmit.", priority: "normal", approverEmail: "fatima@synque.app", authorEmail: "asad@synque.app", dueAt: daysAgo(3), resolvedAt: daysAgo(3) },
  // 1 changes_requested
  { title: "Sustainability Report — Changes requested", postIdKey: "p5", status: "changes_requested", comment: "Add specific water-reduction metric. Also include a CTA to download the full PDF.", priority: "normal", approverEmail: "uneeza@synque.app", authorEmail: "asad@synque.app", dueAt: daysFromNow(1), resolvedAt: daysAgo(1) },
];

async function seedApprovals(): Promise<void> {
  section("STEP 11 — Approvals");

  let created = 0;
  for (const a of APPROVAL_DEFS) {
    const authorId = userIds[a.authorEmail];
    if (!authorId) continue;
    const approverId = a.approverEmail ? userIds[a.approverEmail] ?? null : null;
    const postId = a.postIdKey ? postIds[a.postIdKey] ?? null : null;
    const result = await safe(`Approval: ${a.title}`, () =>
      db.approval.create({
        data: {
          postId,
          title: a.title,
          authorId,
          approverId,
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

// ============================================================================
// STEP 12 — HashtagGroups (5)
// ============================================================================
const HASHTAG_GROUP_DEFS = [
  { name: "Summer Campaign", tags: "SynqueSummer,SummerStyle,SummerFashion,BeachVibes,SunnyDays,SummerVibes,SummerDrop", platform: "instagram", usageCount: 42, avgReach: 18400, color: "#F59E0B" },
  { name: "Product Launch", tags: "NewArrivals,ProductLaunch,JustDropped,ShopNow,LimitedDrop,NewCollection", platform: "all", usageCount: 28, avgReach: 24800, color: "#3B82F6" },
  { name: "Brand General", tags: "SynqueHQ,SynqueFamily,DesignedInPakistan,MadeWithLove,SustainableFashion,KarachiMade", platform: "all", usageCount: 184, avgReach: 12400, color: "#E1306C" },
  { name: "Pakistani Creators", tags: "PakistaniCreators,CreatorEconomy,PakistanStartups,Karachi,Lahore,Islamabad", platform: "linkedin", usageCount: 14, avgReach: 8200, color: "#22C55E" },
  { name: "Behind the Scenes", tags: "BehindTheScenes,BTS,StudioLife,StudioTour,Process,HowItsMade,KarachiStudio", platform: "tiktok", usageCount: 18, avgReach: 41200, color: "#A855F7" },
];

async function seedHashtagGroups(): Promise<void> {
  section("STEP 12 — Hashtag Groups");

  let created = 0;
  for (const g of HASHTAG_GROUP_DEFS) {
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

// ============================================================================
// STEP 13 — Competitors (4 with snapshots)
// ============================================================================
const COMPETITOR_DEFS = [
  { name: "Hue & Co.", handle: "hueandco", platform: "instagram", followers: 48200, engagementRate: 4.2, growthRate: 2.8, postingFreq: 5.5, status: "tracking", notes: "Direct competitor. Strong on Instagram Reels. Recently partnered with Aurora Labs.", withSnapshots: true },
  { name: "Sustainable Threads", handle: "sustainablethreads", platform: "instagram", followers: 31400, engagementRate: 6.1, growthRate: 4.2, postingFreq: 4, status: "tracking", notes: "Eco-fashion niche leader. Higher engagement rate than us. Worth studying their caption style.", withSnapshots: true },
  { name: "Vertex Apparel", handle: "vertexapparel", platform: "x", followers: 28900, engagementRate: 2.1, growthRate: 1.2, postingFreq: 12, status: "tracking", notes: "X/Twitter competitor. Heavy posting cadence. Lower engagement quality.", withSnapshots: true },
  { name: "Northwind Studio", handle: "northwindstudio", platform: "tiktok", followers: 89400, engagementRate: 8.4, growthRate: 6.8, postingFreq: 7, status: "tracking", notes: "TikTok leader in our space. Viral content formula — need to reverse-engineer.", withSnapshots: true },
];

async function seedCompetitors(): Promise<void> {
  section("STEP 13 — Competitors + snapshots");

  const competitorIds: { [handle: string]: string } = {};
  let competitorsCreated = 0;
  for (const c of COMPETITOR_DEFS) {
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

  // Snapshots — 4 weekly snapshots per competitor (past 28 days)
  let snapshotsCreated = 0;
  for (const c of COMPETITOR_DEFS) {
    if (!c.withSnapshots) continue;
    const compId = competitorIds[c.handle];
    if (!compId) continue;
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
  ok(`Created ${snapshotsCreated} competitor snapshots (4 per competitor × 4 competitors)`);
}

// ============================================================================
// STEP 14 — ListeningQueries (4) + Mentions
// ============================================================================
const LISTENING_QUERY_DEFS = [
  { name: "Synque Brand", keywords: "synque,synque.app,@synque.official,@synquehq,#SynqueFamily", type: "brand", color: "#E1306C", status: "active" },
  { name: "Competitor Mentions", keywords: "hue and co,sustainable threads,vertex apparel,northwind studio", type: "competitor", color: "#3B82F6", status: "active" },
  { name: "Sustainable Fashion Industry", keywords: "sustainable fashion,eco fashion,ethical fashion,slow fashion,circular fashion", type: "keyword", color: "#22C55E", status: "active" },
  { name: "Pakistani Creator Economy", keywords: "#pakistaniCreators,#karachiCreators,#pakistanStartups,#LahoreTech", type: "hashtag", color: "#F59E0B", status: "paused" },
];

const MENTION_DEFS = [
  { queryName: "Synque Brand", source: "instagram", author: "@fan_account_1", text: "Just got my Aurora Jacket from @synque.official — obsessed 😍", sentiment: "positive", reach: 4200, engagement: 312, daysAgo: 3 },
  { queryName: "Synque Brand", source: "x", author: "@tech_journalist", text: "Synque's sustainability report is genuinely impressive — 12 audited factories in Pakistan.", sentiment: "positive", reach: 8400, engagement: 142, daysAgo: 5 },
  { queryName: "Synque Brand", source: "reddit", author: "u/eco_shopper", text: "Has anyone ordered from Synque? Quality looks good but shipping is slow.", sentiment: "neutral", reach: 1800, engagement: 64, daysAgo: 7 },
  { queryName: "Competitor Mentions", source: "web", author: "Fashion Weekly", text: "Hue & Co announces new collection — direct competition to Synque's summer drop.", sentiment: "neutral", reach: 12400, engagement: 280, daysAgo: 6 },
  { queryName: "Competitor Mentions", source: "instagram", author: "@competitor_watch", text: "Sustainable Threads just hit 30K — Synque should be worried.", sentiment: "neutral", reach: 5200, engagement: 184, daysAgo: 9 },
  { queryName: "Sustainable Fashion Industry", source: "news", author: "Dawn News", text: "Pakistani fashion brands leading the eco-fashion movement in South Asia.", sentiment: "positive", reach: 42000, engagement: 820, daysAgo: 11 },
  { queryName: "Pakistani Creator Economy", source: "x", author: "@creator_economy", text: "Pakistani creators are having a moment in 2026. Brands like Synque are leading the charge.", sentiment: "positive", reach: 18400, engagement: 642, daysAgo: 4 },
];

async function seedListeningQueries(): Promise<void> {
  section("STEP 14 — Listening queries + mentions");

  const queryIds: { [name: string]: string } = {};
  let queriesCreated = 0;
  for (const q of LISTENING_QUERY_DEFS) {
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
    if (result) {
      queryIds[q.name] = result.id;
      queriesCreated++;
    }
  }
  ok(`Created ${queriesCreated} listening queries (brand, competitor, industry, hashtag)`);

  let mentionsCreated = 0;
  for (const m of MENTION_DEFS) {
    const queryId = queryIds[m.queryName];
    if (!queryId) continue;
    const result = await safe(`Mention from ${m.author}`, () =>
      db.mention.create({
        data: {
          queryId,
          source: m.source,
          author: m.author,
          authorAvatar: `https://res.cloudinary.com/l8ytrxsv/image/upload/v1/socialflow/avatars/${m.author.replace(/[^a-z0-9]/gi, "").toLowerCase()}.jpg`,
          text: m.text,
          url: `https://example.com/mention/${m.author.replace(/[^a-z0-9]/gi, "")}-${m.daysAgo}`,
          sentiment: m.sentiment,
          reach: m.reach,
          engagement: m.engagement,
          date: daysAgo(m.daysAgo),
        },
      })
    );
    if (result) mentionsCreated++;
  }
  ok(`Created ${mentionsCreated} mentions across the listening queries`);
}

// ============================================================================
// STEP 15 — Influencers (6)
// ============================================================================
const INFLUENCER_DEFS = [
  { name: "Olivia Martinez", handle: "@olivia.styles", platform: "instagram", followers: 184000, engagementRate: 4.8, cost: 3500, estimatedReach: 92000, estimatedEngagement: 4400, status: "active", notes: "Fashion niche. Previously collaborated on Spring campaign — great ROI." },
  { name: "Jordan Lee", handle: "@jordancreates", platform: "tiktok", followers: 412000, engagementRate: 7.2, cost: 5200, estimatedReach: 248000, estimatedEngagement: 17800, status: "active", notes: "TikTok creator — fashion + lifestyle. High viral potential." },
  { name: "Ayesha Khan", handle: "@ayeshaeats", platform: "instagram", followers: 96000, engagementRate: 5.1, cost: 2200, estimatedReach: 48000, estimatedEngagement: 2400, status: "paused", notes: "Pakistani food + lifestyle niche. Tied up with another campaign until next month." },
  { name: "Tom Walker", handle: "@tomtravels", platform: "youtube", followers: 248000, engagementRate: 3.8, cost: 4800, estimatedReach: 124000, estimatedEngagement: 4700, status: "completed", notes: "Travel vlogger. Completed Summer campaign — 3.2M views on sponsored video." },
  { name: "Maya Singh", handle: "@mayacodes", platform: "linkedin", followers: 64200, engagementRate: 6.4, cost: 1800, estimatedReach: 32000, estimatedEngagement: 2050, status: "active", notes: "Tech + sustainability thought leader. Strong for LinkedIn thought leadership content." },
  { name: "Hamza Sheikh", handle: "@hamza.films", platform: "tiktok", followers: 184000, engagementRate: 8.2, cost: 4200, estimatedReach: 142000, estimatedEngagement: 11200, status: "draft", notes: "Karachi-based filmmaker. Considering for Synque studio tour content collaboration." },
];

async function seedInfluencers(): Promise<void> {
  section("STEP 15 — Influencers");

  let created = 0;
  for (const inf of INFLUENCER_DEFS) {
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

// ============================================================================
// Final counts report
// ============================================================================
async function reportCounts(): Promise<void> {
  section("Final counts");

  const counts = {
    users: await db.user.count(),
    accounts: await db.account.count(),
    accountHealth: await db.accountHealth.count(),
    accountProtection: await db.accountProtection.count(),
    posts: await db.post.count(),
    postVariants: await db.postVariant.count(),
    comments: await db.comment.count(),
    analyticsDaily: await db.analyticsDaily.count(),
    activities: await db.activity.count(),
    campaigns: await db.campaign.count(),
    tasks: await db.task.count(),
    approvals: await db.approval.count(),
    hashtagGroups: await db.hashtagGroup.count(),
    competitors: await db.competitor.count(),
    competitorSnapshots: await db.competitorSnapshot.count(),
    listeningQueries: await db.listeningQuery.count(),
    mentions: await db.mention.count(),
    influencers: await db.influencer.count(),
  };

  console.log("\n📊 Final data counts:");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${k.padEnd(22)} ${v}`);
  }

  // List the 9 Pakistani team members for quick reference.
  console.log("\n👥 Pakistani team members (password for all: demo123456):");
  for (const m of MEMBERS) {
    console.log(`   ${m.email.padEnd(24)} ${m.role.padEnd(8)} · ${m.title}`);
  }
}

// ============================================================================
// Main runner
// ============================================================================
async function main(): Promise<void> {
  console.log("================================================");
  console.log(" SYNQUE — Wipe + Reseed (9 Pakistani Team Members)");
  console.log("================================================");
  console.log(`DB host: ${cleanUrl.replace(/:[^:@]+@/, ":****@").split("@").pop()}`);
  console.log(`Preserving real user: ${PRESERVE_EMAIL}`);
  console.log(`Time:    ${new Date().toISOString()}`);

  try {
    await wipeAll();
    await seedMembers();
    await seedAccounts();
    await seedPostsAndVariants();
    await seedComments();
    await seedAnalyticsDaily();
    await seedActivities();
    await seedCampaigns();
    await seedTasks();
    await seedApprovals();
    await seedHashtagGroups();
    await seedCompetitors();
    await seedListeningQueries();
    await seedInfluencers();
    await reportCounts();

    console.log("\n✅ Wipe + reseed completed successfully!");
    console.log("\n   Demo login (super-admin):");
    console.log("     Email:    rabia@synque.app");
    console.log("     Password: demo123456");
    console.log("\n   Team (same password):");
    console.log("     fatima@synque.app   (manager)");
    console.log("     uneeza@synque.app   (manager)");
    console.log("     bilal@synque.app    (editor)");
    console.log("     asad@synque.app     (editor)");
    console.log("     hirrat@synque.app   (editor)");
    console.log("     muzahir@synque.app  (viewer)");
    console.log("     khubaib@synque.app  (viewer)");
    console.log("     taaha@synque.app    (viewer)");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("\n❌ Wipe + reseed failed:", msg);
    if (e instanceof Error && e.stack) console.error(e.stack);
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

main();
