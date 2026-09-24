import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createZaiClient } from "@/lib/zai";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/insights?accountId=xxx&days=30
 *
 * Generates AI-powered insights from real analytics data:
 * - Performance summary
 * - Best posting time
 * - Growth opportunities
 * - Content recommendations
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId") ?? "all";
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  try {
    const accounts = await db.account.findMany({
      include: { analytics: { orderBy: { date: "desc" }, take: days } },
    });

    const filtered = accountId === "all" ? accounts : accounts.filter((a) => a.id === accountId);

    if (filtered.length === 0) {
      return NextResponse.json({
        insights: "No accounts connected yet. Connect a social account to generate AI insights.",
        summary: { accounts: 0, totalFollowers: 0, totalImpressions: 0, totalEngagement: 0 },
      });
    }

    const totalFollowers = filtered.reduce((s, a) => s + a.followers, 0);
    const totalImpressions = filtered.reduce(
      (s, a) => s + a.analytics.reduce((s2, d) => s2 + d.impressions, 0),
      0
    );
    const totalEngagement = filtered.reduce(
      (s, a) => s + a.analytics.reduce((s2, d) => s2 + d.engagement, 0),
      0
    );
    const totalPosts = filtered.reduce(
      (s, a) => s + a.analytics.reduce((s2, d) => s2 + d.posts, 0),
      0
    );

    const platformBreakdown = filtered.reduce<Record<string, { followers: number; impressions: number; engagement: number }>>(
      (acc, a) => {
        if (!acc[a.platform]) acc[a.platform] = { followers: 0, impressions: 0, engagement: 0 };
        acc[a.platform].followers += a.followers;
        acc[a.platform].impressions += a.analytics.reduce((s, d) => s + d.impressions, 0);
        acc[a.platform].engagement += a.analytics.reduce((s, d) => s + d.engagement, 0);
        return acc;
      },
      {}
    );

    const dataContext = `
Account analytics for the last ${days} days:
- Total accounts: ${filtered.length}
- Total followers: ${totalFollowers.toLocaleString()}
- Total impressions: ${totalImpressions.toLocaleString()}
- Total engagement: ${totalEngagement.toLocaleString()}
- Total posts: ${totalPosts}
- Engagement rate: ${totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(1) : 0}%
- Platforms: ${Object.entries(platformBreakdown).map(([p, v]) => `${p} (${v.followers} followers, ${v.impressions} impressions, ${v.engagement} engagement)`).join(", ")}
`;

    const system = `You are an expert social media analytics advisor. Analyze the provided data and give actionable, specific insights. Be concise but impactful. Format with clear sections using emojis. Keep it under 300 words.`;

    const user = `Analyze this social media performance data and provide insights:

${dataContext}

Provide:
1. 📊 Performance Summary (2-3 sentences)
2. 🚀 Growth Opportunities (2 specific recommendations)
3. ⏰ Best Practices (1-2 actionable tips)
4. 💡 Content Strategy (1-2 suggestions based on the data)

Be specific and data-driven. If data is sparse, note that and suggest what to track.`;

    let insights = "";
    try {
      const zai = await createZaiClient();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: system },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      });
      insights = completion.choices[0]?.message?.content ?? "";
    } catch {
      insights = `📊 **Performance Summary**
You have ${filtered.length} account(s) with ${totalFollowers.toLocaleString()} total followers. Over the last ${days} days, you generated ${totalImpressions.toLocaleString()} impressions and ${totalEngagement.toLocaleString()} engagement (${totalImpressions > 0 ? ((totalEngagement / totalImpressions) * 100).toFixed(1) : 0}% engagement rate).

🚀 **Growth Opportunities**
- ${totalPosts === 0 ? "Start posting regularly to build momentum — your accounts have no posts tracked yet." : "Maintain your posting cadence and experiment with different content formats."}
- ${totalImpressions < 10000 ? "Focus on increasing reach by posting at peak hours and using relevant hashtags." : "Your reach is solid — double down on what's working by analyzing your top posts."}

⏰ **Best Practices**
- Post consistently (3-5x per week per platform)
- Engage with your audience within the first hour of posting

💡 **Content Strategy**
- Use a mix of content types (educational, entertaining, promotional)
- Test different posting times and track which gets the best engagement`;
    }

    return NextResponse.json({
      insights,
      summary: {
        accounts: filtered.length,
        totalFollowers,
        totalImpressions,
        totalEngagement,
        totalPosts,
        engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
