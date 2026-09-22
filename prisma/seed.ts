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
  { id: "u-admin", name: "Maya Reyes", email: "maya@prism.co", role: "admin", title: "Head of Social", color: "rose" },
  { id: "u-1", name: "Daniel Cho", email: "daniel@prism.co", role: "member", title: "Content Strategist", color: "amber" },
  { id: "u-2", name: "Priya Nair", email: "priya@prism.co", role: "member", title: "Community Lead", color: "teal" },
  { id: "u-3", name: "Leo Marchetti", email: "leo@prism.co", role: "member", title: "Video Producer", color: "magenta" },
  { id: "u-4", name: "Sara Okafor", email: "sara@prism.co", role: "member", title: "Paid Social Manager", color: "green" },
  { id: "u-5", name: "Tom Becker", email: "tom@prism.co", role: "member", title: "Copywriter", color: "rose" },
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

  // wipe
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
        color: u.color,
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

  // posts + variants
  const now = Date.now();
  const day = 86400000;
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

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
