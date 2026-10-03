import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, getTenantScope, tenantWhere } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const queries = await db.listeningQuery.findMany({
    where: tenantWhere(scope) as { customerId?: string },
    include: { mentions: { orderBy: { date: "desc" }, take: 50 } },
    orderBy: { createdAt: "desc" },
  });

  // Scope mentions through the owning ListeningQuery so super-admins see all
  // and tenant users see only their own queries' mentions.
  const mentionWhere = tenantWhere(scope);
  const allMentions = await db.mention.findMany({
    where: mentionWhere.customerId
      ? { query: { customerId: mentionWhere.customerId } }
      : undefined,
    orderBy: { date: "desc" },
    take: 60,
    include: { query: true },
  });

  // sentiment distribution
  const sentiments = { positive: 0, neutral: 0, negative: 0 };
  for (const m of allMentions) sentiments[m.sentiment as keyof typeof sentiments]++;

  // mentions per day (last 14)
  const now = Date.now();
  const day = 86400000;
  const byDay: Record<string, { date: string; count: number; sentiment: number }> = {};
  for (let d = 13; d >= 0; d--) {
    const k = new Date(now - d * day).toISOString().slice(0, 10);
    byDay[k] = { date: k, count: 0, sentiment: 0 };
  }
  for (const m of allMentions) {
    const k = m.date.toISOString().slice(0, 10);
    if (byDay[k]) {
      byDay[k].count++;
      byDay[k].sentiment += m.sentiment === "positive" ? 1 : m.sentiment === "negative" ? -1 : 0;
    }
  }

  return NextResponse.json({
    queries: queries.map((q) => ({
      id: q.id,
      name: q.name,
      keywords: q.keywords,
      type: q.type,
      color: q.color,
      status: q.status,
      mentionCount: q.mentions.length,
      reach: q.mentions.reduce((s, m) => s + m.reach, 0),
      engagement: q.mentions.reduce((s, m) => s + m.engagement, 0),
      mentions: q.mentions.map((m) => ({
        id: m.id,
        source: m.source,
        author: m.author,
        authorAvatar: m.authorAvatar,
        text: m.text,
        url: m.url,
        sentiment: m.sentiment,
        reach: m.reach,
        engagement: m.engagement,
        date: m.date.toISOString(),
      })),
    })),
    recent: allMentions.slice(0, 20).map((m) => ({
      id: m.id,
      queryName: m.query.name,
      queryColor: m.query.color,
      source: m.source,
      author: m.author,
      authorAvatar: m.authorAvatar,
      text: m.text,
      url: m.url,
      sentiment: m.sentiment,
      reach: m.reach,
      engagement: m.engagement,
      date: m.date.toISOString(),
    })),
    sentiments,
    series: Object.values(byDay),
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;
  const scope = getTenantScope(user!);

  const body = await req.json();
  const { name, keywords, type, color } = body;
  if (!name || !keywords) return NextResponse.json({ error: "name and keywords required" }, { status: 400 });
  const q = await db.listeningQuery.create({
    data: { name, keywords, type: type ?? "keyword", color: color ?? "#E1306C", customerId: scope.customerId },
  });
  return NextResponse.json({ id: q.id, ok: true });
}
