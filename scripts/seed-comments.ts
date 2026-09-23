import { db } from "@/lib/db";

async function main() {
  // Find the X account
  const account = await db.account.findFirst({ where: { platform: "x" } });
  if (!account) { console.log("No X account found"); process.exit(1); }
  console.log("Seeding comments for account:", account.handle);

  const comments = [
    { author: "@sarah_designs", text: "Love this collection! When does it drop?", type: "comment", sentiment: "positive", replied: true },
    { author: "@mike_ventures", text: "The sustainable materials angle is great", type: "comment", sentiment: "positive", replied: false },
    { author: "@dev_user", text: "Prices?", type: "message", sentiment: "neutral", replied: false },
    { author: "@critic_99", text: "Colors look washed out in the preview", type: "comment", sentiment: "negative", replied: false },
    { author: "@fan_2026", text: "Can't wait to order! 🔥", type: "mention", sentiment: "positive", replied: true },
    { author: "@q_asker", text: "International shipping?", type: "message", sentiment: "neutral", replied: true },
    { author: "@angry_customer", text: "Last order was delayed, not happy", type: "comment", sentiment: "negative", replied: false },
    { author: "@design_enthusiast", text: "The minimal aesthetic is chefs kiss", type: "comment", sentiment: "positive", replied: false },
  ];

  for (const c of comments) {
    await db.comment.create({
      data: {
        accountId: account.id,
        author: c.author,
        text: c.text,
        type: c.type,
        sentiment: c.sentiment,
        replied: c.replied,
      },
    });
  }
  console.log(`✓ Seeded ${comments.length} comments`);
  const total = await db.comment.count();
  const replied = await db.comment.count({ where: { replied: true } });
  console.log(`Total comments now: ${total} · Replied: ${replied} · Reply rate: ${Math.round((replied/total)*100)}%`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
