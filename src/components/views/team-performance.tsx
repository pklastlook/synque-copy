"use client";

import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  PolarAngleAxis, PolarGrid, Radar, RadarChart, Scatter, ScatterChart,
  ZAxis, XAxis, YAxis, Legend,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Users, Eye, Heart, TrendingUp, TrendingDown, BarChart3, MessageCircle,
  Share2, Bookmark, CheckCircle2, Clock, FileText, Send,
  Sparkles, Trophy, Crown, Award, Activity, Layers, Zap, Target,
  Flame, Radio, Gauge, Calendar, ArrowUpRight, ArrowDownRight, Plane,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";

// ============ Types ============

interface MemberMetrics {
  accounts: number; posts: number; publishedPosts: number; scheduledPosts: number;
  draftPosts: number; followers: number; impressions: number; reach: number;
  engagement: number; likes: number; comments: number; shares: number; saves: number;
  engagementRate: number; tasks: number; completedTasks: number; taskCompletionRate: number;
  commentsReceived: number; recentActivity: number;
}
interface Member {
  id: string; name: string; email: string; avatar: string | null; role: string;
  title: string | null; department: string | null; color: string | null;
  status: string; metrics: MemberMetrics;
  platforms: { platform: string; accounts: number; followers: number; engagement: number }[];
}
interface TeamTotals {
  members: number; activeMembers: number; accounts: number; posts: number;
  publishedPosts: number; scheduledPosts: number; draftPosts: number;
  totalFollowers: number; totalImpressions: number; totalReach: number;
  totalEngagement: number; totalLikes: number; totalComments: number;
  totalShares: number; totalSaves: number; totalTasks: number;
  completedTasks: number; pendingTasks: number; campaigns: number;
  avgEngagementRate: number; avgTaskCompletion: number;
}
interface PlatformSummary {
  platform: string; accounts: number; followers: number; posts: number;
  engagement: number; impressions: number; reach: number;
  followerSparkline: number[]; engagementSparkline: number[];
  growth7d: number; growth30d: number; topProfileId: string | null;
  engagementRate: number; avgFollowersPerAccount: number;
}
interface Profile {
  id: string; platform: PlatformId; handle: string; displayName: string;
  avatar: string | null; followers: number; postsCount: number; verified: boolean;
  ownerName: string; ownerColor: string | null;
  engagement: number; reach: number; impressions: number;
  engagementRate: number; growth7d: number; growth30d: number;
  sparkline: number[]; postingCadencePerWeek: number; postingCadencePerMonth: number;
  healthStatus: string; riskLevel: string; lastActiveAt: string | null;
}
interface PageProgress {
  id: string; platform: PlatformId; handle: string; displayName: string;
  followersProgress: number; postsProgress: number; engagementProgress: number;
  overall: number; status: "on_track" | "needs_attention" | "at_risk";
  followersTarget: number; postsTarget: number; engagementTarget: number;
  followersCurrent: number; postsCurrent: number; engagementCurrent: number;
}
interface HeatmapPoint { date: string; count: number; platforms: string[] }
interface MatrixPoint {
  name: string; color: string; followers: number; engagementRate: number;
  posts: number; department: string; role: string;
}
interface TeamPerformanceData {
  members: Member[]; teamTotals: TeamTotals;
  leaderboard: {
    mostFollowers: Member[]; mostPosts: Member[]; mostEngagement: Member[];
    bestEngagementRate: Member[]; mostTasksCompleted: Member[];
  };
  platformDistribution: { platform: string; accounts: number; followers: number; engagement: number }[];
  trend: { date: string; engagement: number; posts: number; impressions: number }[];
  recentActivities: {
    id: string; userId: string; userName: string; userAvatar: string | null;
    userColor: string | null; type: string; description: string; createdAt: string;
  }[];
  // New:
  platforms: PlatformSummary[];
  profiles: Profile[];
  pagesProgress: PageProgress[];
  activityHeatmap: HeatmapPoint[];
  performanceMatrix: MatrixPoint[];
  engagementBuckets: { range: string; min: number; max: number; count: number; color: string }[];
  targets: { postsPerWeek: number; followersPerAccount: number; engagementRate: number };
}

const TOOLTIP_STYLE = {
  background: "var(--popover)", border: "1px solid var(--border)",
  borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
};

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  post_published: Send, post_scheduled: Clock, comment_replied: MessageCircle,
  account_connected: Users, ai_generated: Sparkles, team_joined: CheckCircle2,
  task_completed: CheckCircle2,
};
const RANK_ICONS = [Crown, Award, Trophy];
const RANK_COLORS = ["text-amber-500", "text-slate-400", "text-orange-600"];

const STATUS_META: Record<PageProgress["status"], { label: string; color: string; bg: string; icon: LucideIcon }> = {
  on_track: { label: "On track", color: "text-emerald-500", bg: "bg-emerald-500/15", icon: CheckCircle2 },
  needs_attention: { label: "Needs attention", color: "text-amber-500", bg: "bg-amber-500/15", icon: Clock },
  at_risk: { label: "At risk", color: "text-rose-500", bg: "bg-rose-500/15", icon: AlertCircle },
};
import { AlertCircle } from "lucide-react";

// ============ Main view ============

export function TeamPerformanceView() {
  const { data, loading } = useApi<TeamPerformanceData>("/api/team-performance");

  if (loading || !data) return <TeamPerformanceSkeleton />;

  const t = data.teamTotals;
  const engagementRadarData = [
    { type: "Likes", value: t.totalLikes },
    { type: "Comments", value: t.totalComments },
    { type: "Shares", value: t.totalShares },
    { type: "Saves", value: t.totalSaves },
  ];
  const maxRadar = Math.max(1, ...engagementRadarData.map(d => d.value));

  return (
    <div className="space-y-5">
      <HelpText module="team-performance">
        <strong className="text-foreground">Performance</strong> is your admin command center — track every
        account, profile, and team activity in real time. Animated cards, live sparklines, progress bars,
        and the 90-day activity heatmap show you exactly where momentum is building.
      </HelpText>

      {/* === HERO: Team Overview (animated pulse ring) === */}
      <TeamHero totalFollowers={t.totalFollowers} activeMembers={t.activeMembers} accounts={t.accounts} posts={t.posts} members={data.members} />

      {/* === KPI GRID (animated count-up) === */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Followers" value={t.totalFollowers} icon={<Users className="h-5 w-5" />} accent="oklch(0.55 0.2 255)" hint={`across ${t.accounts} accounts`} delay={50} series={data.trend.map(d => d.engagement)} />
        <KpiCard label="Total Impressions" value={t.totalImpressions} icon={<Eye className="h-5 w-5" />} accent="oklch(0.62 0.22 300)" hint="all time" delay={120} series={data.trend.map(d => d.impressions)} />
        <KpiCard label="Total Engagement" value={t.totalEngagement} icon={<Heart className="h-5 w-5" />} accent="oklch(0.7 0.2 25)" hint="likes + comments + shares + saves" delay={190} series={data.trend.map(d => d.engagement)} />
        <KpiCard label="Avg Engagement Rate" value={t.avgEngagementRate} icon={<TrendingUp className="h-5 w-5" />} accent="oklch(0.72 0.18 75)" hint="team average" delay={260} />
      </div>

      {/* === SECTION 1: Social Platforms (NEW) === */}
      <SectionShell
        icon={<Plane className="h-4 w-4" />}
        title="Social platforms"
        desc="Per-platform performance breakdown — followers, growth, engagement, and top profile."
        delay={300}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.platforms.length === 0 ? (
            <EmptyState icon={<Plane className="h-6 w-6" />} title="No platforms connected" desc="Connect your first social account to see platform analytics." />
          ) : (
            data.platforms.map((p, i) => (
              <PlatformCard key={p.platform} platform={p} delay={i * 0.04} topProfile={data.profiles.find(x => x.id === p.topProfileId)} />
            ))
          )}
        </div>
      </SectionShell>

      {/* === SECTION 2: Profiles & Pages (NEW) === */}
      <SectionShell
        icon={<Radio className="h-4 w-4" />}
        title="Profiles & pages"
        desc="Every connected account — followers, growth, engagement, and live sparkline."
        delay={380}
        action={
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {data.profiles.length} connected
          </span>
        }
      >
        {data.profiles.length === 0 ? (
          <EmptyState icon={<Radio className="h-6 w-6" />} title="No profiles yet" desc="Connect social accounts to track them here." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.profiles.slice(0, 12).map((p, i) => (
              <ProfileCard key={p.id} profile={p} delay={i * 0.03} />
            ))}
          </div>
        )}
      </SectionShell>

      {/* === SECTION 3: Pages Progress (NEW) — progress bars vs targets === */}
      <SectionShell
        icon={<Target className="h-4 w-4" />}
        title="Pages progress"
        desc={`Workspace targets: ${data.targets.followersPerAccount.toLocaleString()} followers · ${data.targets.postsPerWeek} posts/week · ${data.targets.engagementRate}% engagement.`}
        delay={460}
      >
        {data.pagesProgress.length === 0 ? (
          <EmptyState icon={<Target className="h-6 w-6" />} title="No progress to track yet" desc="Once you connect accounts, progress bars will appear here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.pagesProgress.slice(0, 10).map((pg, i) => (
              <ProgressCard key={pg.id} progress={pg} delay={i * 0.03} />
            ))}
          </div>
        )}
      </SectionShell>

      {/* === Engagement Trend + Platform Pie === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.54s" }}>
          <SectionTitle title="Engagement trend" desc="Team-wide performance over the last 14 days" />
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="tpEng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tpImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 75)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 75)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} formatter={(v: number, n) => [fmt(v), n === "engagement" ? "Engagement" : "Impressions"]} />
                <Area type="monotone" dataKey="impressions" stroke="oklch(0.72 0.18 75)" strokeWidth={2} fill="url(#tpImp)" isAnimationActive animationBegin={200} />
                <Area type="monotone" dataKey="engagement" stroke="var(--primary)" strokeWidth={2.5} fill="url(#tpEng)" isAnimationActive animationBegin={450} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.62s" }}>
          <SectionTitle title="Platform distribution" desc="Followers by platform" />
          <div className="relative mx-auto h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.platformDistribution} dataKey="followers" nameKey="platform" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="none">
                  {data.platformDistribution.map((p) => (
                    <Cell key={p.platform} fill={PLATFORMS[p.platform as PlatformId]?.color ?? "#888"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n) => [fmt(v), PLATFORMS[n as PlatformId]?.name ?? n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="num-display text-2xl font-bold">{fmt(t.totalFollowers)}</span>
              <span className="text-[10px] text-muted-foreground">followers</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {data.platformDistribution.map((p) => (
              <div key={p.platform} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: PLATFORMS[p.platform as PlatformId]?.color ?? "#888" }} />
                <span className="truncate text-muted-foreground">{PLATFORMS[p.platform as PlatformId]?.name ?? p.platform}</span>
                <span className="ml-auto font-medium">{fmt(p.followers)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* === SECTION 4: Performance Matrix (NEW) — bubble scatter === */}
      <SectionShell
        icon={<Gauge className="h-4 w-4" />}
        title="Performance matrix"
        desc="Each bubble is a team member — X = followers, Y = engagement rate, size = posts published."
        delay={620}
      >
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: -8, right: 16, top: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis
                type="number"
                dataKey="followers"
                name="Followers"
                tickFormatter={(v) => fmt(v)}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="engagementRate"
                name="Engagement Rate"
                unit="%"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <ZAxis type="number" dataKey="posts" range={[40, 400]} name="Posts" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }}
                formatter={(v: number, n: string) => n === "engagementRate" ? [`${v}%`, "Engagement rate"] : n === "followers" ? [fmt(v), "Followers"] : [v, "Posts"]}
                labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ""}
              />
              <Scatter data={data.performanceMatrix} isAnimationActive animationBegin={400} fill="var(--primary)" fillOpacity={0.6}>
                {data.performanceMatrix.map((p, i) => (
                  <Cell
                    key={i}
                    fill={p.color === "blue" ? "oklch(0.55 0.2 255)" :
                          p.color === "purple" ? "oklch(0.6 0.2 300)" :
                          p.color === "pink" ? "oklch(0.65 0.22 350)" :
                          p.color === "green" ? "oklch(0.7 0.2 145)" :
                          p.color === "orange" ? "oklch(0.7 0.2 55)" :
                          "oklch(0.55 0.2 255)"}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </SectionShell>

      {/* === SECTION 5: Activity Heatmap (NEW) — 90-day posting cadence === */}
      <SectionShell
        icon={<Calendar className="h-4 w-4" />}
        title="Activity heatmap"
        desc="Posting cadence over the last 90 days — darker cells = more posts published that day."
        delay={700}
        action={
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              {[0.1, 0.3, 0.5, 0.7, 1].map(o => (
                <span key={o} className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--primary)`, opacity: o }} />
              ))}
            </div>
            <span>More</span>
          </div>
        }
      >
        <ActivityHeatmap data={data.activityHeatmap} />
      </SectionShell>

      {/* === Engagement Breakdown + Engagement Buckets === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.78s" }}>
          <SectionTitle title="Engagement breakdown" desc="Likes, comments, shares & saves by team member" />
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.members.map(m => ({
                  name: m.name.split(" ")[0],
                  Likes: m.metrics.likes,
                  Comments: m.metrics.comments,
                  Shares: m.metrics.shares,
                  Saves: m.metrics.saves,
                }))}
                margin={{ left: -16, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={44} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Likes" stackId="a" fill="var(--primary)" />
                <Bar dataKey="Comments" stackId="a" fill="oklch(0.74 0.18 165)" />
                <Bar dataKey="Shares" stackId="a" fill="oklch(0.66 0.22 305)" />
                <Bar dataKey="Saves" stackId="a" fill="oklch(0.78 0.18 75)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.86s" }}>
          <SectionTitle title="Engagement rate distribution" desc="How many profiles fall into each band" />
          <div className="relative mx-auto h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.engagementBuckets} dataKey="count" nameKey="range" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="none">
                  {data.engagementBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n) => [`${v} profile${v !== 1 ? "s" : ""}`, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="num-display text-2xl font-bold">{data.profiles.length}</span>
              <span className="text-[10px] text-muted-foreground">profiles</span>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {data.engagementBuckets.map((b) => (
              <div key={b.range} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                <span className="text-muted-foreground">{b.range}</span>
                <span className="ml-auto font-medium">{b.count}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* === Leaderboard === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.94s" }}>
        <SectionTitle title="Top performers" desc="Leaderboard across key metrics" action={<Trophy className="h-5 w-5 text-amber-500" />} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <LeaderboardCard title="Most Followers" members={data.leaderboard.mostFollowers} getValue={(m) => fmt(m.metrics.followers)} />
          <LeaderboardCard title="Most Posts" members={data.leaderboard.mostPosts} getValue={(m) => m.metrics.posts.toString()} />
          <LeaderboardCard title="Most Engagement" members={data.leaderboard.mostEngagement} getValue={(m) => fmt(m.metrics.engagement)} />
          <LeaderboardCard title="Best Eng. Rate" members={data.leaderboard.bestEngagementRate} getValue={(m) => `${m.metrics.engagementRate}%`} />
          <LeaderboardCard title="Most Tasks Done" members={data.leaderboard.mostTasksCompleted} getValue={(m) => m.metrics.completedTasks.toString()} />
        </div>
      </GlassCard>

      {/* === Task Completion Radar === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "1.02s" }}>
          <SectionTitle title="Engagement radar" desc="Total engagement split" />
          <div className="relative mx-auto h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={engagementRadarData.map(d => ({ ...d, value: Math.round((d.value / maxRadar) * 100) }))} outerRadius={75}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="type" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Radar name="Score" dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} strokeWidth={2} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, "Relative"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Completed</div>
              <span className="font-bold">{t.completedTasks}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-amber-500" />Pending</div>
              <span className="font-bold">{t.pendingTasks}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2"><Layers className="h-3.5 w-3.5 text-primary" />Completion rate</div>
              <span className="font-bold">{t.avgTaskCompletion}%</span>
            </div>
          </div>
        </GlassCard>

        {/* === Team members === */}
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "1.10s" }}>
          <SectionTitle title="Team members" desc="Individual performance breakdown" />
          <div className="grid gap-3 sm:grid-cols-2">
            {data.members.map((m, i) => (
              <MemberCard key={m.id} member={m} delay={i * 0.04} />
            ))}
          </div>
        </GlassCard>
      </div>

      {/* === Recent Activity === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "1.18s" }}>
        <SectionTitle title="Recent activity" desc="Latest actions across the team" action={<Activity className="h-4 w-4 text-primary" />} />
        <div className="scroll-liquid max-h-96 space-y-1 overflow-y-auto pr-1">
          {data.recentActivities.map((a) => {
            const Icon = ACTIVITY_ICON[a.type] ?? Activity;
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-muted/50">
                <NameAvatar name={a.userName} color={a.userColor ?? "blue"} className="h-8 w-8 text-[11px]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">
                    <span className="font-semibold">{a.userName}</span>{" "}
                    <span className="text-muted-foreground">{a.description.replace(a.userName + " ", "")}</span>
                  </div>
                </div>
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="hidden w-16 text-right text-[11px] text-muted-foreground sm:block">
                  {timeAgo(a.createdAt)}
                </span>
              </div>
            );
          })}
          {data.recentActivities.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No recent activity</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ Team Hero with animated pulse ring ============
function TeamHero({ totalFollowers, activeMembers, accounts, posts, members }: {
  totalFollowers: number; activeMembers: number; accounts: number; posts: number; members: Member[];
}) {
  return (
    <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Animated pulse rings */}
          <div className="relative grid h-14 w-14 place-items-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "2.5s" }} />
            <div className="absolute inset-1 rounded-full bg-primary/10" />
            <div className="relative grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              <Activity className="h-3.5 w-3.5" />
              Live performance
            </div>
            <h2 className="mt-2 text-[28px] font-bold tracking-tight">
              {activeMembers} active members
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {fmt(totalFollowers)} followers · {posts} posts · {accounts} accounts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((m) => (
              <NameAvatar key={m.id} name={m.name} color={m.color ?? "blue"} className="h-9 w-9 text-xs ring-2 ring-background" />
            ))}
            {members.length > 5 && (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-background">
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ============ Section shell wrapper ============
function SectionShell({ icon, title, desc, delay, action, children }: {
  icon: React.ReactNode; title: string; desc?: string; delay?: number; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <GlassCard className="crystal-in p-5" style={{ animationDelay: `${(delay ?? 300) / 1000}s` }}>
      <SectionTitle title={title} desc={desc} action={action ?? <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>} />
      <div className="mt-3">{children}</div>
    </GlassCard>
  );
}

// ============ Empty state ============
function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">{icon}</div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </div>
  );
}

// ============ Platform Card (NEW) ============
function PlatformCard({ platform, delay, topProfile }: { platform: PlatformSummary; delay: number; topProfile?: Profile }) {
  const config = PLATFORMS[platform.platform as PlatformId];
  const [expanded, setExpanded] = React.useState(false);
  const sparkData = platform.followerSparkline.map((v, i) => ({ i, v }));
  const growth = platform.growth7d;
  const growthUp = growth >= 0;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className="crystal-in glass rounded-2xl p-4 text-left transition hover:lift-hover"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Header: platform badge + growth */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={platform.platform as PlatformId} size={24} />
          <div>
            <div className="text-sm font-bold">{config?.name ?? platform.platform}</div>
            <div className="text-[10px] text-muted-foreground">{platform.accounts} account{platform.accounts !== 1 ? "s" : ""}</div>
          </div>
        </div>
        {growth !== 0 && (
          <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            growthUp ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
          )}>
            {growthUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {Math.abs(growth)}%
          </span>
        )}
      </div>

      {/* Big number */}
      <div className="mt-3 flex items-end gap-2">
        <span className="num-display text-2xl font-bold">{fmt(platform.followers)}</span>
        <span className="mb-1 text-[10px] text-muted-foreground">followers</span>
      </div>

      {/* Sparkline */}
      <div className="mt-2 h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${platform.platform}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config?.color ?? "var(--primary)"} stopOpacity={0.4} />
                <stop offset="100%" stopColor={config?.color ?? "var(--primary)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={config?.color ?? "var(--primary)"} strokeWidth={2} fill={`url(#spark-${platform.platform})`} isAnimationActive animationBegin={200} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg bg-muted/30 py-1.5">
          <div className="num-display text-[13px] font-bold">{fmt(platform.engagement)}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Eng</div>
        </div>
        <div className="rounded-lg bg-muted/30 py-1.5">
          <div className="num-display text-[13px] font-bold">{platform.posts}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Posts</div>
        </div>
        <div className="rounded-lg bg-muted/30 py-1.5">
          <div className="num-display text-[13px] font-bold">{platform.engagementRate}%</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Rate</div>
        </div>
      </div>

      {/* Expanded: top profile */}
      {expanded && topProfile && (
        <div className="mt-3 border-t border-border/40 pt-3">
          <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Top profile</div>
          <div className="flex items-center gap-2">
            <PlatformBadge platform={topProfile.platform} size={20} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{topProfile.displayName}</div>
              <div className="truncate text-[10px] text-muted-foreground">{topProfile.handle}</div>
            </div>
            <span className="text-xs font-bold">{fmt(topProfile.followers)}</span>
          </div>
        </div>
      )}

      {/* 30d growth footer */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>30-day growth</span>
        <span className={cn("font-semibold", platform.growth30d >= 0 ? "text-emerald-500" : "text-rose-500")}>
          {platform.growth30d >= 0 ? "+" : ""}{platform.growth30d}%
        </span>
      </div>
    </button>
  );
}

// ============ Profile Card (NEW) ============
function ProfileCard({ profile, delay }: { profile: Profile; delay: number }) {
  const sparkData = profile.sparkline.map((v, i) => ({ i, v }));
  const growthUp = profile.growth7d >= 0;
  const healthColor =
    profile.healthStatus === "healthy" ? "text-emerald-500" :
    profile.healthStatus === "warning" ? "text-amber-500" :
    profile.healthStatus === "restricted" ? "text-orange-500" :
    "text-rose-500";

  return (
    <div className="crystal-in glass rounded-2xl p-4 transition hover:lift-hover" style={{ animationDelay: `${delay}s` }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={profile.platform} size={22} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{profile.displayName}</div>
            <div className="truncate text-[10px] text-muted-foreground">{profile.handle}</div>
          </div>
        </div>
        <span className={cn("h-2 w-2 rounded-full", profile.healthStatus === "healthy" ? "bg-emerald-500" : profile.healthStatus === "warning" ? "bg-amber-500" : "bg-rose-500")} />
      </div>

      {/* Owner */}
      <div className="mt-2 flex items-center gap-1.5">
        <NameAvatar name={profile.ownerName} color={profile.ownerColor ?? "blue"} className="h-5 w-5 text-[8px]" />
        <span className="text-[10px] text-muted-foreground">{profile.ownerName}</span>
      </div>

      {/* Big number */}
      <div className="mt-3 flex items-end gap-2">
        <span className="num-display text-2xl font-bold">{fmt(profile.followers)}</span>
        <span className="mb-1 text-[10px] text-muted-foreground">followers</span>
        {profile.growth7d !== 0 && (
          <span className={cn("mb-1 ml-auto flex items-center gap-0.5 text-[10px] font-bold",
            growthUp ? "text-emerald-500" : "text-rose-500")}>
            {growthUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
            {Math.abs(profile.growth7d)}%
          </span>
        )}
      </div>

      {/* Sparkline */}
      <div className="mt-1 h-9 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={`prof-${profile.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PLATFORMS[profile.platform]?.color ?? "var(--primary)"} stopOpacity={0.4} />
                <stop offset="100%" stopColor={PLATFORMS[profile.platform]?.color ?? "var(--primary)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={PLATFORMS[profile.platform]?.color ?? "var(--primary)"} strokeWidth={1.8} fill={`url(#prof-${profile.id})`} isAnimationActive animationBegin={300} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-lg bg-muted/30 py-1.5">
          <div className="num-display text-[12px] font-bold">{profile.postsCount}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Posts</div>
        </div>
        <div className="rounded-lg bg-muted/30 py-1.5">
          <div className="num-display text-[12px] font-bold">{fmt(profile.engagement)}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Eng</div>
        </div>
        <div className="rounded-lg bg-muted/30 py-1.5">
          <div className={cn("num-display text-[12px] font-bold", healthColor)}>{profile.engagementRate}%</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Rate</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{profile.postingCadencePerWeek} posts/week</span>
        <span className={cn("font-semibold capitalize", healthColor)}>{profile.healthStatus}</span>
      </div>
    </div>
  );
}

// ============ Progress Card (NEW) ============
function ProgressCard({ progress, delay }: { progress: PageProgress; delay: number }) {
  const meta = STATUS_META[progress.status];
  const StatusIcon = meta.icon;

  return (
    <div className="crystal-in glass rounded-2xl p-4 transition hover:lift-hover" style={{ animationDelay: `${delay}s` }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PlatformBadge platform={progress.platform} size={20} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold">{progress.displayName}</div>
            <div className="truncate text-[10px] text-muted-foreground">{progress.handle}</div>
          </div>
        </div>
        <span className={cn("flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold", meta.bg, meta.color)}>
          <StatusIcon className="h-2.5 w-2.5" />
          {meta.label}
        </span>
      </div>

      {/* Overall progress ring */}
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={progress.overall} />
        <div>
          <div className="num-display text-xl font-bold">{progress.overall}%</div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Overall</div>
        </div>
      </div>

      {/* Per-metric breakdown */}
      <div className="mt-3 space-y-1.5">
        <ProgressRow
          label="Followers"
          current={fmt(progress.followersCurrent)}
          target={fmt(progress.followersTarget)}
          percent={progress.followersProgress}
          color="oklch(0.55 0.2 255)"
        />
        <ProgressRow
          label="Posts / week"
          current={`${progress.postsCurrent}`}
          target={`${progress.postsTarget}`}
          percent={progress.postsProgress}
          color="oklch(0.78 0.18 75)"
        />
        <ProgressRow
          label="Engagement"
          current={`${progress.engagementCurrent}%`}
          target={`${progress.engagementTarget}%`}
          percent={progress.engagementProgress}
          color="oklch(0.74 0.18 165)"
        />
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const r = 24;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 66 ? "oklch(0.74 0.18 165)" : value >= 33 ? "oklch(0.78 0.18 75)" : "oklch(0.65 0.22 25)";
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--muted)" strokeWidth="4" opacity={0.3} />
        <circle
          cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
    </div>
  );
}

function ProgressRow({ label, current, target, percent, color }: {
  label: string; current: string; target: string; percent: number; color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current} <span className="text-muted-foreground">/ {target}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ============ Activity Heatmap (NEW) ============
function ActivityHeatmap({ data }: { data: HeatmapPoint[] }) {
  // Group into weeks (columns). 90 days = ~13 weeks.
  const weeks: HeatmapPoint[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }
  const maxCount = Math.max(1, ...data.map(d => d.count));

  return (
    <div className="overflow-x-auto scroll-liquid pb-2">
      <div className="flex min-w-[560px] gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const intensity = day.count === 0 ? 0 : Math.min(1, day.count / Math.max(maxCount, 1));
              const opacity = day.count === 0 ? 0.08 : 0.2 + intensity * 0.8;
              const dateLabel = new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
              return (
                <div
                  key={day.date}
                  className="group relative h-3.5 w-3.5 rounded-sm transition hover:scale-125"
                  style={{
                    background: day.count === 0 ? "var(--muted)" : "var(--primary)",
                    opacity: day.count === 0 ? 0.25 : opacity,
                  }}
                  title={`${dateLabel}: ${day.count} post${day.count !== 1 ? "s" : ""}${day.platforms.length > 0 ? ` on ${day.platforms.join(", ")}` : ""}`}
                >
                  {day.count > 0 && day.platforms.length > 0 && (
                    <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] shadow-lg group-hover:block">
                      {day.count} on {day.platforms.slice(0, 3).join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{new Date(data[0]?.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        <span>{data.filter(d => d.count > 0).length} active days · {data.reduce((s, d) => s + d.count, 0)} total posts</span>
        <span>{new Date(data[data.length - 1]?.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

// ============ Leaderboard Card ============
function LeaderboardCard({ title, members, getValue }: { title: string; members: Member[]; getValue: (m: Member) => string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-2">
        {members.map((m, i) => {
          const RankIcon = RANK_ICONS[i];
          return (
            <div key={m.id} className="flex items-center gap-2">
              <RankIcon className={cn("h-4 w-4 shrink-0", RANK_COLORS[i])} />
              <NameAvatar name={m.name} color={m.color ?? "blue"} className="h-7 w-7 text-[10px]" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{m.name}</span>
              <span className="num-display text-xs font-bold">{getValue(m)}</span>
            </div>
          );
        })}
        {members.length === 0 && (
          <div className="py-2 text-center text-[11px] text-muted-foreground">No data</div>
        )}
      </div>
    </div>
  );
}

// ============ Member Card (detailed individual stats) ============
function MemberCard({ member, delay }: { member: Member; delay: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const m = member.metrics;

  return (
    <div className="crystal-in glass rounded-2xl p-4 transition hover:lift-hover" style={{ animationDelay: `${delay}s` }}>
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-3 text-left">
        <NameAvatar name={member.name} color={member.color ?? "blue"} className="h-10 w-10 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold">{member.name}</span>
            {member.role === "admin" && (
              <span className="rounded-md bg-primary/15 px-1 py-0.5 text-[8px] font-bold uppercase text-primary">Admin</span>
            )}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            {member.title ?? member.role}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {member.platforms.slice(0, 3).map((p) => (
            <PlatformBadge key={p.platform} platform={p.platform as PlatformId} size={16} />
          ))}
        </div>
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-base font-bold">{fmt(m.followers)}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Followers</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-base font-bold">{fmt(m.engagement)}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Eng</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-base font-bold">{m.posts}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Posts</div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <StatRow icon={<Eye className="h-3 w-3" />} label="Impressions" value={fmt(m.impressions)} />
            <StatRow icon={<TrendingUp className="h-3 w-3" />} label="Eng. Rate" value={`${m.engagementRate}%`} />
            <StatRow icon={<Heart className="h-3 w-3" />} label="Likes" value={fmt(m.likes)} />
            <StatRow icon={<MessageCircle className="h-3 w-3" />} label="Comments" value={fmt(m.comments)} />
            <StatRow icon={<Share2 className="h-3 w-3" />} label="Shares" value={fmt(m.shares)} />
            <StatRow icon={<Bookmark className="h-3 w-3" />} label="Saves" value={fmt(m.saves)} />
            <StatRow icon={<CheckCircle2 className="h-3 w-3" />} label="Tasks done" value={`${m.completedTasks}/${m.tasks}`} />
            <StatRow icon={<Clock className="h-3 w-3" />} label="Task rate" value={`${m.taskCompletionRate}%`} />
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2 text-[11px]">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Posts:</span>
            <span className="font-medium text-emerald-500">{m.publishedPosts} published</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-amber-500">{m.scheduledPosts} scheduled</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-muted-foreground">{m.draftPosts} drafts</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-semibold">{value}</span>
    </div>
  );
}

// ============ Skeleton ============
function TeamPerformanceSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-32 rounded-3xl" />)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-48 rounded-3xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shimmer h-[340px] rounded-3xl lg:col-span-2" />
        <div className="shimmer h-[340px] rounded-3xl" />
      </div>
      <div className="shimmer h-64 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="shimmer h-48 rounded-3xl" />)}
      </div>
    </div>
  );
}
