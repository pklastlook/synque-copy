"use client";

import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  Users, Eye, Heart, TrendingUp, BarChart3, MessageCircle,
  Share2, Bookmark, CheckCircle2, Clock, FileText, Send,
  Sparkles, Trophy, Crown, Award, Activity, Layers,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";

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

interface TeamPerformanceData {
  members: Member[];
  teamTotals: TeamTotals;
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
}

const TOOLTIP_STYLE = {
  background: "var(--popover)", border: "1px solid var(--border)",
  borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
};

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  post_published: Send,
  post_scheduled: Clock,
  comment_replied: MessageCircle,
  account_connected: Users,
  ai_generated: Sparkles,
  team_joined: CheckCircle2,
  task_completed: CheckCircle2,
};

const RANK_ICONS = [Crown, Award, Trophy];
const RANK_COLORS = ["text-amber-500", "text-slate-400", "text-orange-600"];

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
        <strong className="text-foreground">Team Performance</strong> shows real-time analytics for your entire team —
        individual and collective metrics, leaderboards, platform breakdowns, and engagement trends.
        Click any team member card to see their detailed stats.
      </HelpText>

      {/* === HERO: Team Overview === */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              <Activity className="h-3.5 w-3.5" />
              Team Performance
            </div>
            <h2 className="mt-2 text-[28px] font-bold tracking-tight">
              {t.activeMembers} active members
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {fmt(t.totalFollowers)} followers · {t.posts} posts · {fmt(t.totalEngagement)} engagement across {t.accounts} accounts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {data.members.slice(0, 5).map((m) => (
                <NameAvatar key={m.id} name={m.name} color={m.color ?? "blue"} className="h-9 w-9 text-xs ring-2 ring-background" />
              ))}
              {data.members.length > 5 && (
                <div className="grid h-9 w-9 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-background">
                  +{data.members.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* === KPI GRID === */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Followers" value={fmt(t.totalFollowers)} icon={<Users className="h-5 w-5" />} accent="oklch(0.55 0.2 255)" hint={`across ${t.accounts} accounts`} delay={50} />
        <KpiCard label="Total Impressions" value={fmt(t.totalImpressions)} icon={<Eye className="h-5 w-5" />} accent="oklch(0.62 0.22 300)" hint="all time" delay={120} />
        <KpiCard label="Total Engagement" value={fmt(t.totalEngagement)} icon={<Heart className="h-5 w-5" />} accent="oklch(0.7 0.2 25)" hint="likes + comments + shares + saves" delay={190} />
        <KpiCard label="Avg Engagement Rate" value={`${t.avgEngagementRate}%`} icon={<TrendingUp className="h-5 w-5" />} accent="oklch(0.72 0.18 75)" hint="team average" delay={260} />
      </div>

      {/* === ENGAGEMENT TREND + PLATFORM PIE === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.3s" }}>
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

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.38s" }}>
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

      {/* === LEADERBOARD === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.46s" }}>
        <SectionTitle title="Top performers" desc="Leaderboard across key metrics" action={<Trophy className="h-5 w-5 text-amber-500" />} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <LeaderboardCard title="Most Followers" members={data.leaderboard.mostFollowers} getValue={(m) => fmt(m.metrics.followers)} />
          <LeaderboardCard title="Most Posts" members={data.leaderboard.mostPosts} getValue={(m) => m.metrics.posts.toString()} />
          <LeaderboardCard title="Most Engagement" members={data.leaderboard.mostEngagement} getValue={(m) => fmt(m.metrics.engagement)} />
          <LeaderboardCard title="Best Eng. Rate" members={data.leaderboard.bestEngagementRate} getValue={(m) => `${m.metrics.engagementRate}%`} />
          <LeaderboardCard title="Most Tasks Done" members={data.leaderboard.mostTasksCompleted} getValue={(m) => m.metrics.completedTasks.toString()} />
        </div>
      </GlassCard>

      {/* === ENGAGEMENT BREAKDOWN + TASK STATUS === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.54s" }}>
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
                <Bar dataKey="Likes" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Comments" stackId="a" fill="oklch(0.74 0.18 165)" />
                <Bar dataKey="Shares" stackId="a" fill="oklch(0.66 0.22 305)" />
                <Bar dataKey="Saves" stackId="a" fill="oklch(0.78 0.18 75)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.62s" }}>
          <SectionTitle title="Task completion" desc="Team-wide task progress" />
          <div className="relative mx-auto h-[180px] w-full">
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
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Completed
              </div>
              <span className="font-bold">{t.completedTasks}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                Pending
              </div>
              <span className="font-bold">{t.pendingTasks}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <Layers className="h-3.5 w-3.5 text-primary" />
                Completion rate
              </div>
              <span className="font-bold">{t.avgTaskCompletion}%</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* === TEAM MEMBER CARDS === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.70s" }}>
        <SectionTitle title="Team members" desc="Individual performance breakdown" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.members.map((m, i) => (
            <MemberCard key={m.id} member={m} delay={i * 0.05} />
          ))}
        </div>
      </GlassCard>

      {/* === RECENT ACTIVITY === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.78s" }}>
        <SectionTitle title="Recent activity" desc="Latest actions across the team" />
        <div className="space-y-1">
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

// === Leaderboard Card ===
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

// === Member Card (detailed individual stats) ===
function MemberCard({ member, delay }: { member: Member; delay: number }) {
  const [expanded, setExpanded] = React.useState(false);
  const m = member.metrics;

  return (
    <div
      className="crystal-in glass rounded-2xl p-4 lift-hover"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 text-left"
      >
        <NameAvatar name={member.name} color={member.color ?? "blue"} className="h-12 w-12 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold">{member.name}</span>
            {member.role === "admin" && (
              <span className="rounded-md bg-primary/15 px-1 py-0.5 text-[8px] font-bold uppercase text-primary">Admin</span>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {member.title ?? member.role} · {member.department ?? "General"}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {member.platforms.slice(0, 3).map((p) => (
            <PlatformBadge key={p.platform} platform={p.platform as PlatformId} size={18} />
          ))}
        </div>
      </button>

      {/* Quick stats grid */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-lg font-bold">{fmt(m.followers)}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Followers</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-lg font-bold">{fmt(m.engagement)}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Engagement</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-lg font-bold">{m.posts}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Posts</div>
        </div>
      </div>

      {/* Expanded details */}
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

          {/* Post status breakdown */}
          <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2 text-[11px]">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Posts:</span>
            <span className="font-medium text-emerald-500">{m.publishedPosts} published</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-amber-500">{m.scheduledPosts} scheduled</span>
            <span className="text-muted-foreground">·</span>
            <span className="font-medium text-muted-foreground">{m.draftPosts} drafts</span>
          </div>

          {/* Platform breakdown */}
          {member.platforms.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Platforms</div>
              {member.platforms.map((p) => (
                <div key={p.platform} className="flex items-center gap-2 text-[11px]">
                  <PlatformBadge platform={p.platform as PlatformId} size={16} />
                  <span className="text-muted-foreground">{p.accounts} account(s)</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium">{fmt(p.followers)} followers</span>
                  <span className="ml-auto font-bold text-primary">{fmt(p.engagement)} eng.</span>
                </div>
              ))}
            </div>
          )}
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

function TeamPerformanceSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-32 rounded-3xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shimmer h-[340px] rounded-3xl lg:col-span-2" />
        <div className="shimmer h-[340px] rounded-3xl" />
      </div>
      <div className="shimmer h-64 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-48 rounded-3xl" />)}
      </div>
    </div>
  );
}
