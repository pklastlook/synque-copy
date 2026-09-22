import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const IMG = (h: string) => `https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/${h}`;
const MEDIA = [
  IMG("90d070238cd1.jpg"),
  IMG("3c1a14f7bc03.jpg"),
  IMG("499f6186a75b.jpg"),
  IMG("a82a8ad54efc.png"),
  IMG("3d5f9bc2b845.png"),
  IMG("fbd604a0edb6.png"),
  IMG("72adecde4e2f.jpg"),
  IMG("2d3143f20927.jpg"),
  IMG("26cfb8da4289.jpg"),
  IMG("0d38ffbc8924.jpg"),
  IMG("6b87e35b4fd7.jpg"),
  IMG("3a28c48b52ec.jpg"),
  IMG("d5a2b9f5b9fa.jpg"),
  IMG("5abcc0d268d9.jpg"),
  IMG("82df782b5ca8.jpg"),
  IMG("b92fb4efc248.png"),
  IMG("59081f9405e0.jpg"),
  IMG("9cf76bddc28d.jpg"),
  IMG("ce2787a3d7aa.png"),
  IMG("1584466162da.jpg"),
  IMG("0dad1278a197.jpg"),
  IMG("4e90e5d2ef95.jpg"),
  IMG("c09991c40748.jpg"),
  IMG("5a341f7f9723.jpg"),
];

const TEAM = [
  { id: "u-admin", name: "Maya Reyes", email: "maya@prism.co", role: "admin", title: "Head of Social", department: "Leadership", color: "rose", permissions: ["*"], status: "active" },
  { id: "u-1", name: "Daniel Cho", email: "daniel@prism.co", role: "manager", title: "Content Strategist", department: "Content", color: "amber", permissions: ["posts:create","posts:publish","approvals:review","media:*","campaigns:*"], status: "active" },
  { id: "u-2", name: "Priya Nair", email: "priya@prism.co", role: "manager", title: "Community Lead", department: "Community", color: "teal", permissions: ["inbox:*","comments:reply","listening:*","approvals:review"], status: "active" },
  { id: "u-3", name: "Leo Marchetti", email: "leo@prism.co", role: "editor", title: "Video Producer", department: "Content", color: "magenta", permissions: ["posts:create","media:upload","media:*"], status: "active" },
  { id: "u-4", name: "Sara Okafor", email: "sara@prism.co", role: "manager", title: "Paid Social Manager", department: "Paid Social", color: "green", permissions: ["posts:publish","analytics:*","reports:*","competitors:*"], status: "active" },
  { id: "u-5", name: "Tom Becker", email: "tom@prism.co", role: "editor", title: "Copywriter", department: "Content", color: "blue", permissions: ["posts:create","media:read"], status: "invited" },
];

const ACCOUNTS = [
  { id: "ac-ig-1", platform: "instagram", handle: "@prism.studio", displayName: "Prism Studio", followers: 184300, verified: true, owner: "u-1" },
  { id: "ac-ig-2", platform: "instagram", handle: "@prism.cafe", displayName: "Prism Café", followers: 62400, verified: false, owner: "u-5" },
  { id: "ac-fb-1", platform: "facebook", handle: "/prismstudio", displayName: "Prism Studio", followers: 92100, verified: true, owner: "u-1" },
  { id: "ac-fb-2", platform: "facebook", handle: "/prismcafe", displayName: "Prism Café", followers: 38900, verified: false, owner: "u-5" },
  { id: "ac-x-1", platform: "x", handle: "@prismhq", displayName: "Prism", followers: 147200, verified: true, owner: "u-2" },
  { id: "ac-li-1", platform: "linkedin", handle: "/prism-studio", displayName: "Prism Studio", followers: 211500, verified: true, owner: "u-4" },
  { id: "ac-tt-1", platform: "tiktok", handle: "@prism", displayName: "Prism", followers: 412800, verified: true, owner: "u-3" },
  { id: "ac-yt-1", platform: "youtube", handle: "@PrismStudio", displayName: "Prism Studio", followers: 268900, verified: true, owner: "u-3" },
  { id: "ac-th-1", platform: "threads", handle: "@prism", displayName: "Prism", followers: 53700, verified: false, owner: "u-2" },
  { id: "ac-ig-3", platform: "instagram", handle: "@prism.fit", displayName: "Prism Fit", followers: 88600, verified: false, owner: "u-4" },
];

const POSTS = [
  { title: "New Year Product Drop", caption: "Introducing our refreshed product line — designed for creators who move fast. Sleek, durable, and built to last.", tone: "energetic", media: 12, status: "published", author: "u-1" },
  { title: "Behind the Studio", caption: "A look inside our design studio where every detail is considered before it ships.", tone: "inspirational", media: 0, status: "published", author: "u-3" },
  { title: "Morning Ritual Recipe", caption: "Three ingredients, two minutes, one perfect morning. Save this for tomorrow.", tone: "friendly", media: 4, status: "published", author: "u-5" },
  { title: "Weekend Getaway Guide", caption: "Five underrated destinations worth the detour this season.", tone: "adventurous", media: 8, status: "published", author: "u-2" },
  { title: "Customer Spotlight", caption: "Meet the creators using Prism to build their audience from scratch.", tone: "grateful", media: 16, status: "published", author: "u-2" },
  { title: "Fit in 15 Minutes", caption: "A quick mobility routine you can do anywhere. No equipment needed.", tone: "motivational", media: 20, status: "published", author: "u-4" },
  { title: "Color Theory 101", caption: "How we choose the palette for every campaign — a peek at our process.", tone: "educational", media: 1, status: "published", author: "u-1" },
  { title: "Launch Teaser", caption: "Something new is coming. Stay close.", tone: "mysterious", media: 13, status: "scheduled", author: "u-1" },
  { title: "Community AMA Recap", caption: "Thank you for the questions — here are the highlights from this week's AMA.", tone: "warm", media: 17, status: "published", author: "u-2" },
  { title: "Street Style Edit", caption: "Five looks that transition from desk to dinner without missing a beat.", tone: "trendy", media: 18, status: "published", author: "u-5" },
  { title: "Productivity Hack", caption: "The two-minute rule that changed how our team ships work.", tone: "practical", media: 2, status: "scheduled", author: "u-1" },
  { title: "Sunset Series", caption: "Golden hour, captured by our community. Tag us to be featured.", tone: "serene", media: 9, status: "published", author: "u-3" },
];

const COMMENTS_BANK = [
  "This is exactly what I needed today, thank you!",
  "How did you get that shot? Looks incredible.",
  "Where can I get the one in the second slide?",
  "Your content keeps getting better 🔥",
  "Is this available internationally?",
  "Tried this yesterday and it worked perfectly.",
  "Could you do a longer tutorial version?",
  "The colors on this are unreal 😍",
  "Just ordered mine, can't wait!",
  "This deserves way more reach.",
  "Saved for later, thanks team!",
  "What camera did you use?",
  "Following for more like this.",
  "The editing on this is next level.",
  "Any plans for a dark mode version?",
  "This is my favorite post this week.",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}
function rand(seed: number, max: number) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * max);
}

async function main() {
  console.log("Seeding Prism Social...");
  const now = Date.now();
  const day = 86400000;

  // wipe
  await db.task.deleteMany();
  await db.accountProtection.deleteMany();
  await db.accountHealth.deleteMany();
  await db.mailMessage.deleteMany();
  await db.mailbox.deleteMany();
  await db.mailServer.deleteMany();
  await db.linkInBio.deleteMany();
  await db.report.deleteMany();
  await db.competitorSnapshot.deleteMany();
  await db.competitor.deleteMany();
  await db.hashtagGroup.deleteMany();
  await db.approval.deleteMany();
  await db.mention.deleteMany();
  await db.listeningQuery.deleteMany();
  await db.mediaAsset.deleteMany();
  await db.campaign.deleteMany();
  await db.activity.deleteMany();
  await db.analyticsDaily.deleteMany();
  await db.comment.deleteMany();
  await db.postVariant.deleteMany();
  await db.post.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();

  // users
  for (const u of TEAM) {
    await db.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        title: u.title,
        department: u.department,
        color: u.color,
        permissions: JSON.stringify(u.permissions),
        status: u.status,
        lastActive: u.status === "active" ? new Date(now - (TEAM.indexOf(u) + 1) * 3600 * 1000 * 4) : null,
        avatar: null,
      },
    });
  }

  // accounts
  for (const a of ACCOUNTS) {
    await db.account.create({
      data: {
        id: a.id,
        platform: a.platform,
        handle: a.handle,
        displayName: a.displayName,
        avatar: null,
        followers: a.followers,
        verified: a.verified,
        ownerId: a.owner,
      },
    });
  }

  // ===== Account Health (suspension risk + sentiment ratio) =====
  // Deterministic health profile per account, with a couple flagged as elevated risk.
  const HEALTH_PROFILES: Record<string, { pos: number; neu: number; neg: number; reports: number; trend: number; risk: number; level: string; status: string; reasons: string[] }> = {
    "ac-ig-1": { pos: 1820, neu: 410, neg: 78, reports: 3, trend: 0, risk: 12, level: "safe", status: "healthy", reasons: [] },
    "ac-ig-2": { pos: 540, neu: 180, neg: 42, reports: 1, trend: 0, risk: 18, level: "safe", status: "healthy", reasons: [] },
    "ac-fb-1": { pos: 980, neu: 320, neg: 65, reports: 2, trend: 0, risk: 15, level: "safe", status: "healthy", reasons: [] },
    "ac-fb-2": { pos: 310, neu: 120, neg: 88, reports: 5, trend: +2, risk: 38, level: "moderate", status: "warning", reasons: ["rising_negative_ratio", "report_rate_increasing"] },
    "ac-x-1": { pos: 1240, neu: 480, neg: 210, reports: 8, trend: +3, risk: 52, level: "elevated", status: "warning", reasons: ["high_negative_ratio", "report_rate_increasing", "aggressive_engagement_detected"] },
    "ac-li-1": { pos: 1520, neu: 540, neg: 36, reports: 1, trend: 0, risk: 9, level: "safe", status: "healthy", reasons: [] },
    "ac-tt-1": { pos: 2100, neu: 620, neg: 96, reports: 4, trend: -1, risk: 22, level: "safe", status: "healthy", reasons: [] },
    "ac-yt-1": { pos: 1680, neu: 460, neg: 58, reports: 2, trend: 0, risk: 14, level: "safe", status: "healthy", reasons: [] },
    "ac-th-1": { pos: 420, neu: 150, neg: 72, reports: 6, trend: +4, risk: 61, level: "high", status: "restricted", reasons: ["high_report_rate", "spam_flagged", "rapid_posting_detected"] },
    "ac-ig-3": { pos: 620, neu: 210, neg: 44, reports: 1, trend: 0, risk: 16, level: "safe", status: "healthy", reasons: [] },
  };
  for (const a of ACCOUNTS) {
    const h = HEALTH_PROFILES[a.id] ?? { pos: 100, neu: 50, neg: 10, reports: 0, trend: 0, risk: 10, level: "safe", status: "healthy", reasons: [] };
    await db.accountHealth.create({
      data: {
        accountId: a.id,
        positiveCount: h.pos,
        neutralCount: h.neu,
        negativeCount: h.neg,
        reportCount: h.reports,
        reportTrend: h.trend,
        riskScore: h.risk,
        riskLevel: h.level,
        status: h.status,
        riskReasons: JSON.stringify(h.reasons),
        lastUpdated: new Date(now - 3600 * 1000),
      },
    });
    // default protection settings for every account
    await db.accountProtection.create({
      data: {
        accountId: a.id,
        enabled: true,
        dailyPostLimit: a.platform === "x" || a.platform === "threads" ? 8 : 4,
        hourlyPostLimit: 2,
        minMinutesBetweenPosts: a.platform === "tiktok" ? 45 : 30,
        autoFlagSensitiveContent: true,
        blockDuplicateContent: true,
        blockBannedHashtags: true,
        bannedHashtags: "follow4follow, like4like, fyp, viralbait, giveawayspam",
        enforceWarmupProfile: true,
        limitDMsPerHour: 20,
        limitFollowsPerHour: 15,
        limitCommentsPerHour: 30,
        pausePostingOnWarning: true,
        cooldownHoursOnFlag: 24,
        requireTwoFactor: true,
        lastAudit: new Date(now - 3600 * 1000 * 6),
      },
    });
  }

  // posts + variants
  for (let i = 0; i < POSTS.length; i++) {
    const p = POSTS[i];
    const createdAt = new Date(now - (POSTS.length - i) * day * 1.4);
    const isScheduled = p.status === "scheduled";
    const scheduledAt = isScheduled
      ? new Date(now + (i + 2) * day)
      : new Date(now - (POSTS.length - i - 1) * day * 1.4);

    // pick 3-6 accounts to publish to
    const accountIds = ACCOUNTS.filter((_, idx) => (idx + i) % 2 === 0 || i % 3 === 0)
      .slice(0, 5 + (i % 3))
      .map((a) => a.id);

    const post = await db.post.create({
      data: {
        title: p.title,
        caption: p.caption,
        mediaUrl: MEDIA[p.media],
        mediaType: "image",
        tone: p.tone,
        status: p.status,
        scheduledAt,
        authorId: p.author,
      },
    });

    for (let j = 0; j < accountIds.length; j++) {
      const acc = ACCOUNTS.find((a) => a.id === accountIds[j])!;
      const baseLikes = rand(i * 7 + j, 4000) + 120;
      const reach = rand(i * 13 + j, 80000) + 5000;
      await db.postVariant.create({
        data: {
          postId: post.id,
          accountId: acc.id,
          content: p.caption,
          hashtags: "#prism #design #creators",
          status: p.status,
          publishedAt: isScheduled ? null : scheduledAt,
          likes: baseLikes,
          comments: rand(i * 5 + j, 600) + 10,
          shares: rand(i * 9 + j, 900) + 5,
          reach,
          impressions: Math.floor(reach * 1.6),
          saves: rand(i * 11 + j, 800) + 20,
        },
      });
    }
  }

  // analytics — 30 days per account
  for (const a of ACCOUNTS) {
    const baseFollowers = a.followers;
    for (let d = 29; d >= 0; d--) {
      const date = new Date(now - d * day);
      const growth = rand(a.followers + d, 400) - 80;
      const impr = rand(a.followers + d * 3, 12000) + 2000;
      await db.analyticsDaily.create({
        data: {
          accountId: a.id,
          date,
          followers: baseFollowers + growth * (30 - d),
          impressions: impr,
          reach: Math.floor(impr * 0.62),
          engagement: Math.round((rand(a.followers + d, 50) + 30)) / 10,
          posts: rand(a.followers + d, 3),
        },
      });
    }
  }

  // comments
  for (let i = 0; i < 28; i++) {
    const acc = pick(ACCOUNTS, i);
    const c = pick(COMMENTS_BANK, i * 3);
    const sentiments = ["positive", "neutral", "negative"] as const;
    const sentiment = sentiments[rand(i, 3)];
    const assignee = rand(i, 4) === 0 ? pick(TEAM, i).id : null;
    await db.comment.create({
      data: {
        accountId: acc.id,
        author: `User ${i + 1}`,
        authorAvatar: null,
        text: c,
        type: i % 5 === 0 ? "message" : i % 7 === 0 ? "mention" : "comment",
        sentiment,
        replied: rand(i, 3) === 0,
        assigneeId: assignee,
        createdAt: new Date(now - i * 3600 * 1000 * 6),
      },
    });
  }

  // activities
  const ACTS = [
    { type: "post_published", desc: "published “New Year Product Drop” to 5 accounts" },
    { type: "ai_generated", desc: "generated 5 platform-specific captions" },
    { type: "comment_replied", desc: "replied to 12 community comments" },
    { type: "post_scheduled", desc: "scheduled “Launch Teaser” for tomorrow 9:00 AM" },
    { type: "account_connected", desc: "connected @prism.fit on Instagram" },
    { type: "team_joined", desc: "welcomed a new team member" },
  ];
  for (let i = 0; i < ACTS.length; i++) {
    const a = ACTS[i];
    const u = pick(TEAM, i + 1);
    await db.activity.create({
      data: {
        userId: u.id,
        type: a.type,
        description: `${u.name} ${a.desc}`,
        createdAt: new Date(now - i * 3600 * 1000 * 3),
      },
    });
  }

  // ===== Campaigns =====
  await db.campaign.createMany({
    data: [
      { name: "Spring Launch 2026", description: "Announce the new product line across all channels", color: "#E1306C", status: "active", objective: "awareness", budget: 25000, startDate: new Date(now - 12 * day), endDate: new Date(now + 18 * day), ownerId: "u-1" },
      { name: "Creator Spotlight", description: "UGC series featuring community creators", color: "#9b51e0", status: "active", objective: "engagement", budget: 8000, startDate: new Date(now - 5 * day), ownerId: "u-2" },
      { name: "Q2 Conversion Push", description: "Performance-driven promo campaign", color: "#2d9cdb", status: "active", objective: "conversion", budget: 15000, startDate: new Date(now - 2 * day), endDate: new Date(now + 30 * day), ownerId: "u-4" },
      { name: "Brand Refresh", description: "Visual identity rollout", color: "#27ae60", status: "draft", objective: "awareness", budget: 40000, ownerId: "u-admin" },
      { name: "Holiday Series", description: "Festive content calendar", color: "#f2994a", status: "paused", objective: "engagement", ownerId: "u-3" },
      { name: "Community AMA", description: "Weekly live Q&A", color: "#eb5757", status: "completed", startDate: new Date(now - 40 * day), endDate: new Date(now - 10 * day), ownerId: "u-2" },
    ],
  });

  // ===== Media Library =====
  const MEDIA_ASSETS = [
    { name: "Hero Banner — Spring", url: MEDIA[0], type: "image", tags: "hero, spring, banner", folder: "Campaigns" },
    { name: "Product Shot — Rose", url: MEDIA[12], type: "image", tags: "product, studio", folder: "Products" },
    { name: "Lifestyle Flatlay", url: MEDIA[1], type: "image", tags: "lifestyle, flatlay", folder: "Lifestyle" },
    { name: "Food Bowl Top View", url: MEDIA[4], type: "image", tags: "food, top-view", folder: "Café" },
    { name: "Mountain Aerial", url: MEDIA[8], type: "image", tags: "travel, aerial, nature", folder: "Travel" },
    { name: "Tech Gadget Studio", url: MEDIA[13], type: "image", tags: "tech, product", folder: "Products" },
    { name: "Fashion Street Style", url: MEDIA[16], type: "image", tags: "fashion, street", folder: "Fashion" },
    { name: "Fitness Training", url: MEDIA[20], type: "image", tags: "fitness, workout", folder: "Fitness" },
    { name: "Coffee & Notebook", url: MEDIA[2], type: "image", tags: "lifestyle, coffee", folder: "Lifestyle" },
    { name: "Ocean Coast", url: MEDIA[9], type: "image", tags: "travel, ocean", folder: "Travel" },
    { name: "Headphones Shot", url: MEDIA[14], type: "image", tags: "tech, product", folder: "Products" },
    { name: "Editorial Look", url: MEDIA[17], type: "image", tags: "fashion, editorial", folder: "Fashion" },
    { name: "Mobility Routine", url: MEDIA[21], type: "image", tags: "fitness, mobility", folder: "Fitness" },
    { name: "Color Palette", url: MEDIA[3], type: "image", tags: "design, palette", folder: "Design" },
    { name: "Smoothie Bowl", url: MEDIA[5], type: "image", tags: "food, healthy", folder: "Café" },
    { name: "Sunset Mountains", url: MEDIA[10], type: "image", tags: "travel, sunset", folder: "Travel" },
  ];
  await db.mediaAsset.createMany({
    data: MEDIA_ASSETS.map((m, i) => ({
      name: m.name,
      type: m.type,
      url: m.url,
      thumbnail: m.url,
      size: 400000 + rand(i, 2000000),
      width: 1200,
      height: 800,
      tags: m.tags,
      folder: m.folder,
      uploadedById: pick(TEAM, i).id,
    })),
  });

  // ===== Social Listening =====
  const QUERIES = [
    { name: "Prism Brand", keywords: "prism social, prism studio, @prism", type: "brand", color: "#E1306C" },
    { name: "Competitor: Later", keywords: "later social, later.com", type: "competitor", color: "#9b51e0" },
    { name: "Competitor: Hootsuite", keywords: "hootsuite", type: "competitor", color: "#2d9cdb" },
    { name: "#CreatorEconomy", keywords: "#creatoreconomy, creator economy", type: "hashtag", color: "#27ae60" },
    { name: "Social Scheduling", keywords: "social media scheduling tool, content calendar", type: "keyword", color: "#f2994a" },
  ];
  for (const q of QUERIES) {
    const created = await db.listeningQuery.create({ data: q });
    const MENTIONS = [
      "Just switched to @PrismSocial and the AI composer is unreal — saved me 2 hours today",
      "Loving the new liquid glass UI on Prism, feels so polished 🔥",
      "Prism Studio's latest drop is exactly what creators needed. Take my money.",
      "Anyone tried the new multi-account publishing on Prism? Thoughts?",
      "Not impressed with the analytics on Prism tbh, needs more depth",
      "The competitor analysis feature on Prism is genuinely useful for benchmarking",
      "Prism vs Hootsuite — honestly Prism wins on UX alone",
      "Just saw a Prism ad and the design is *chef's kiss*",
      "Why is everyone switching to Prism all of a sudden?",
      "Prism's approval workflow finally fixed our team's chaos",
    ];
    const sources = ["instagram", "x", "facebook", "web", "reddit", "news"];
    const sentiments = ["positive", "neutral", "negative"] as const;
    for (let i = 0; i < 8; i++) {
      await db.mention.create({
        data: {
          queryId: created.id,
          source: pick(sources, i + q.name.length),
          author: `@${["creator_jen", "marketer_tom", "designs_by_ana", "growthlead", "techreviewer", "socialsam", "lilycreates", "founderdesk"][i % 8]}`,
          authorAvatar: null,
          text: pick(MENTIONS, i + q.name.length),
          url: `https://example.com/mention/${i}`,
          sentiment: pick(sentiments, i + q.name.length),
          reach: rand(i + q.name.length, 50000) + 500,
          engagement: rand(i + q.name.length, 3000) + 20,
          date: new Date(now - i * 3600 * 1000 * 5),
        },
      });
    }
  }

  // ===== Approval Workflows =====
  await db.approval.createMany({
    data: [
      { title: "Holiday Series — Post #4", authorId: "u-5", approverId: "u-admin", status: "pending", priority: "high", dueAt: new Date(now + day), comment: null },
      { title: "Brand Refresh — Logo Reveal", authorId: "u-1", approverId: "u-admin", status: "pending", priority: "urgent", dueAt: new Date(now + 2 * day) },
      { title: "Spring Launch — Carousel", authorId: "u-3", approverId: "u-admin", status: "pending", priority: "normal" },
      { title: "Creator Spotlight — Interview", authorId: "u-2", approverId: "u-1", status: "approved", comment: "Looks great, ship it!", resolvedAt: new Date(now - 3600 * 1000 * 6) },
      { title: "Q2 Promo — Discount Code", authorId: "u-4", approverId: "u-admin", status: "changes_requested", comment: "Please change the CTA to be clearer", resolvedAt: new Date(now - 3600 * 1000 * 12) },
      { title: "Community AMA — Recap", authorId: "u-2", approverId: "u-admin", status: "rejected", comment: "Wrong tone for LinkedIn, redo", resolvedAt: new Date(now - 3600 * 1000 * 24) },
    ],
  });

  // ===== Hashtag Groups =====
  await db.hashtagGroup.createMany({
    data: [
      { name: "Instagram — Growth Set", tags: "creatoreconomy, contentcreator, socialmediatips, growoninstagram, instagrowth, contentstrategy, digitallmarketing", platform: "instagram", usageCount: 24, avgReach: 84000, color: "#E1306C" },
      { name: "TikTok — Trending", tags: "fyp, foryou, viral, tiktoktrends, smallbusiness, createtok, contentcreator", platform: "tiktok", usageCount: 31, avgReach: 156000, color: "#2d9cdb" },
      { name: "LinkedIn — Professional", tags: "b2bmarketing, marketingstrategy, brandgrowth, socialmediamarketing, thoughtleadership", platform: "linkedin", usageCount: 12, avgReach: 22000, color: "#9b51e0" },
      { name: "X — Conversation", tags: "marketingtwitter, growth, buildinpublic, startup", platform: "x", usageCount: 18, avgReach: 41000, color: "#eb5757" },
      { name: "Brand — Evergreen", tags: "prism, prismstudio, createtoday, designforward", platform: "all", usageCount: 45, avgReach: 98000, color: "#27ae60" },
      { name: "Launch — Spring Drop", tags: "newdrop, springsale, limitededition, shopnow", platform: "instagram", usageCount: 8, avgReach: 67000, color: "#f2994a" },
      { name: "Community — UGC", tags: "community, usergenerated, spotlight, featuredcreator", platform: "all", usageCount: 15, avgReach: 52000, color: "#2d9cdb" },
    ],
  });

  // ===== Competitor Tracking =====
  const COMPETITORS = [
    { name: "Hootsuite", handle: "@hootsuite", platform: "instagram", followers: 1280000, engagementRate: 1.8, growthRate: 0.4, postingFreq: 7.2 },
    { name: "Sprout Social", handle: "@sproutsocial", platform: "instagram", followers: 184000, engagementRate: 2.4, growthRate: 1.1, postingFreq: 5.5 },
    { name: "Buffer", handle: "@buffer", platform: "instagram", followers: 312000, engagementRate: 3.1, growthRate: 0.8, postingFreq: 9.1 },
    { name: "Later", handle: "@latermedia", platform: "instagram", followers: 96000, engagementRate: 2.0, growthRate: 0.6, postingFreq: 6.0 },
    { name: "Sprinklr", handle: "@sprinklr", platform: "linkedin", followers: 210000, engagementRate: 1.2, growthRate: 0.5, postingFreq: 4.0 },
    { name: "SocialPilot", handle: "@socialpilot", platform: "x", followers: 54000, engagementRate: 1.5, growthRate: 0.9, postingFreq: 8.3 },
  ];
  for (const c of COMPETITORS) {
    const comp = await db.competitor.create({
      data: {
        ...c,
        avatar: null,
        status: "tracking",
        notes: c.name === "Hootsuite" ? "Market leader, benchmark for feature parity" : c.name === "Sprout Social" ? "Strong in enterprise reporting" : "Watch for content strategy",
      },
    });
    for (let d = 13; d >= 0; d--) {
      await db.competitorSnapshot.create({
        data: {
          competitorId: comp.id,
          date: new Date(now - d * day),
          followers: c.followers + Math.round(c.followers * c.growthRate * 0.01 * (14 - d)),
          engagement: c.engagementRate + rand(d, 10) / 10,
          posts: Math.round(c.postingFreq * 2),
        },
      });
    }
  }

  // ===== Custom Reports =====
  await db.report.createMany({
    data: [
      { name: "Monthly Performance Summary", type: "performance", description: "All accounts, last 30 days", config: JSON.stringify({ metrics: ["impressions", "engagement", "reach"], dateRange: "30d", accounts: "all" }), schedule: "monthly", createdBy: "u-admin", lastGenerated: new Date(now - day * 3) },
      { name: "Q2 Competitor Benchmark", type: "competitor", description: "Compare against top 6 competitors", config: JSON.stringify({ metrics: ["followers", "engagement"], dateRange: "90d" }), schedule: "weekly", createdBy: "u-1", lastGenerated: new Date(now - day * 2) },
      { name: "Audience Growth — Instagram", type: "audience", description: "Follower growth on IG accounts", config: JSON.stringify({ metrics: ["followers", "reach"], accounts: "instagram" }), createdBy: "u-2" },
      { name: "Spring Launch Campaign Report", type: "campaign", description: "Campaign-level performance", config: JSON.stringify({ campaignId: "1", metrics: ["engagement", "conversions"] }), createdBy: "u-1", lastGenerated: new Date(now - day) },
      { name: "Team Productivity Weekly", type: "custom", description: "Posts published per team member", config: JSON.stringify({ metrics: ["posts", "engagement"], groupBy: "author" }), schedule: "weekly", createdBy: "u-admin" },
    ],
  });

  // ===== Link in Bio =====
  await db.linkInBio.create({
    data: {
      slug: "prism",
      title: "Prism Studio",
      subtitle: "Tools for creators who move fast",
      avatar: MEDIA[0],
      theme: "rose",
      visits: 48230,
      clicks: 12940,
      accountId: "ac-ig-1",
      active: true,
      links: JSON.stringify([
        { title: "Shop the new collection", url: "https://example.com/shop", icon: "shopping-bag" },
        { title: "Read our blog", url: "https://example.com/blog", icon: "book-open" },
        { title: "Watch on YouTube", url: "https://example.com/yt", icon: "play" },
        { title: "Follow on TikTok", url: "https://example.com/tt", icon: "music" },
        { title: "Join our newsletter", url: "https://example.com/news", icon: "mail" },
        { title: "Contact us", url: "https://example.com/contact", icon: "message-circle" },
      ]),
    },
  });

  // ===== Mail Server =====
  const server = await db.mailServer.create({
    data: {
      name: "Prism Primary Mail",
      provider: "hostinger",
      domain: "prism.co",
      imapHost: "imap.hostinger.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.hostinger.com",
      smtpPort: 465,
      smtpSecure: true,
      username: "admin@prism.co",
      passwordEnc: "enc:mockpasswordhash",
      fromName: "Prism Team",
      fromEmail: "hello@prism.co",
      status: "connected",
      lastCheck: new Date(now - 3600 * 1000),
    },
  });

  // Mailboxes for the team
  const MAILBOXES = TEAM.map((m, i) => ({
    serverId: server.id,
    email: `${m.name.toLowerCase().split(" ")[0]}@prism.co`,
    displayName: m.name,
    passwordEnc: "enc:mockhash" + i,
    quotaMb: 5120,
    usedMb: Math.round((800 + rand(i, 3500)) * 10) / 10,
    ownerId: m.id,
    status: "active",
    role: m.role,
  }));
  const createdBoxes = [];
  for (const mb of MAILBOXES) {
    createdBoxes.push(await db.mailbox.create({ data: mb }));
  }

  // Mail messages
  const SUBJECTS = [
    "Your weekly Prism performance digest",
    "New comment on your latest post",
    "Approval needed: Brand Refresh — Logo Reveal",
    "Campaign 'Spring Launch 2026' milestone reached 🎉",
    "Scheduled post published successfully",
    "Welcome to Prism — your mailbox is ready",
    "AI caption suggestions for your next post",
    "Weekly team activity summary",
    "Competitor alert: Hootsuite posted a new campaign",
    "Your mailbox is 80% full — consider archiving",
  ];
  const BODIES = [
    "Hi Maya,\n\nHere's your weekly performance digest. Total impressions: 2.4M (up 18%), engagement: 166K (up 12%). Top post: 'New Year Product Drop'.\n\nKeep up the great work,\nPrism",
    "A new comment was posted on 'Behind the Studio'. Author: @creator_jen — 'This is exactly what I needed today, thank you!'\n\nReply from your Inbox to keep the conversation going.",
    "Hi Maya,\n\nDaniel has requested approval for 'Brand Refresh — Logo Reveal' (urgent). Please review and approve before the scheduled publish time tomorrow at 9:00 AM.\n\nOpen Approvals →",
    "Congratulations! Your campaign 'Spring Launch 2026' just crossed 100K total engagement across all platforms. The top performing variant was on TikTok with 42K likes.\n\nView campaign →",
    "Your scheduled post 'Launch Teaser' was published successfully to 5 accounts (Instagram, X, LinkedIn, TikTok, Threads). Initial reach: 8.4K in the first hour.",
    "Welcome to the Prism team!\n\nYour mailbox is now active. You can send and receive mail from this address. Configure your mail client with:\nIMAP: imap.hostinger.com:993 (SSL)\nSMTP: smtp.hostinger.com:465 (SSL)\n\n— Prism IT",
    "We've prepared 4 AI caption suggestions tailored for your TikTok account based on your recent posting style. Want to use them in your next post?\n\nOpen Composer →",
    "Team activity this week: 12 posts published, 5 scheduled, 28 comments replied, 4 new AI generations. Most active: Maya Reyes.\n\nView full report →",
    "Competitor alert: Hootsuite just published a campaign about 'AI-powered social'. Engagement so far: 2.1K likes. You may want to respond with your own angle.\n\nView competitors →",
    "Your mailbox is 80% full. Consider archiving old messages or increasing your quota. Current usage: 4.1 GB of 5 GB.",
  ];
  for (let i = 0; i < 14; i++) {
    const box = pick(createdBoxes, i);
    await db.mailMessage.create({
      data: {
        mailboxId: box.id,
        fromAddr: i % 3 === 0 ? "notifications@prism.co" : i % 5 === 0 ? "noreply@hostinger.com" : "team@prism.co",
        toAddr: box.email,
        subject: pick(SUBJECTS, i),
        body: pick(BODIES, i),
        direction: i % 4 === 0 ? "out" : "in",
        folder: i % 4 === 0 ? "sent" : i % 7 === 0 ? "starred" : "inbox",
        isRead: rand(i, 3) === 0,
        isStarred: i % 7 === 0,
        date: new Date(now - i * 3600 * 1000 * 5),
      },
    });
  }

  // ===== Tasks (admin workflow) =====
  const TASKS = [
    { title: "Draft Q3 launch announcement", assigneeId: "u-5", creatorId: "u-admin", status: "in_progress", priority: "high", type: "content", dueAt: new Date(now + day * 2) },
    { title: "Review TikTok video batch", assigneeId: "u-3", creatorId: "u-1", status: "review", priority: "normal", type: "content", dueAt: new Date(now + day) },
    { title: "Reply to 50 inbox comments", assigneeId: "u-2", creatorId: "u-admin", status: "in_progress", priority: "urgent", type: "engagement", dueAt: new Date(now + 3600 * 1000 * 8) },
    { title: "Generate weekly analytics report", assigneeId: "u-4", creatorId: "u-admin", status: "todo", priority: "normal", type: "analytics", dueAt: new Date(now + day * 3) },
    { title: "Approve Spring Launch carousel", assigneeId: "u-admin", creatorId: "u-1", status: "review", priority: "high", type: "review", dueAt: new Date(now + 3600 * 1000 * 12) },
    { title: "Research competitor hashtags", assigneeId: "u-2", creatorId: "u-1", status: "done", priority: "low", type: "analytics", completedAt: new Date(now - 3600 * 1000 * 10) },
    { title: "Update media library tags", assigneeId: "u-3", creatorId: "u-1", status: "todo", priority: "low", type: "content", dueAt: new Date(now + day * 5) },
    { title: "Monitor brand mentions (24h)", assigneeId: "u-2", creatorId: "u-admin", status: "done", priority: "normal", type: "engagement", completedAt: new Date(now - 3600 * 1000 * 6) },
    { title: "Schedule Threads posts for Friday", assigneeId: "u-5", creatorId: "u-1", status: "blocked", priority: "normal", type: "content", dueAt: new Date(now + day * 4) },
    { title: "Audit at-risk accounts", assigneeId: "u-4", creatorId: "u-admin", status: "in_progress", priority: "urgent", type: "analytics", dueAt: new Date(now + 3600 * 1000 * 24) },
    { title: "Campaign brief: Summer collection", assigneeId: "u-1", creatorId: "u-admin", status: "review", priority: "high", type: "campaign", dueAt: new Date(now + day * 2) },
    { title: "Set up LinkedIn posting cadence", assigneeId: "u-4", creatorId: "u-admin", status: "todo", priority: "normal", type: "content", dueAt: new Date(now + day * 7) },
  ];
  for (const t of TASKS) {
    await db.task.create({ data: t });
  }

  console.log("Seed complete (with all new modules).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
