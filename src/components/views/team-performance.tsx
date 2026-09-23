"use client";

import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  FileText, Send, Clock, MessageCircle, CheckCircle2,
  Sparkles, Trophy, Crown, Award, Activity, Layers,
  PenLine, Reply, Inbox, TrendingUp,
  Hash, FileEdit, XCircle, Zap, Flame,
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
  accounts: number; postsCreated: number; publishedPosts: number;
  scheduledPosts: number; draftPosts: number; failedPosts: number;
  variantsPublished: number; commentsReceived: number; commentsReplied: number;
  replyRate: number; positiveComments: number; neutralComments: number; negativeComments: number;
  weeklyCadence: number; monthlyCadence: number;
  tasksAssigned: number; completedTasks: number; taskCompletionRate: number; recentActivity: number;
}
interface Member {
  id: string; name: string; email: string; avatar: string | null; role: string;
  title: string | null; department: string | null; color: string | null;
  status: string; metrics: MemberMetrics;
  platforms: { platform: string; published: number; total: number }[];
}
interface TeamTotals {
  members: number; activeMembers: number; accounts: number;
  postsCreated: number; publishedPosts: number; scheduledPosts: number; draftPosts: number; failedPosts: number;
  variantsPublished: number; commentsReceived: number; commentsReplied: number; replyRate: number;
  postsLast7d: number; postsLast30d: number; weeklyCadence: number;
  totalTasks: number; completedTasks: number; pendingTasks: number; campaigns: number;
  avgReplyRate: number; avgTaskCompletion: number;
}
interface TeamPerformanceData {
  members: Member[];
  teamTotals: TeamTotals;
  leaderboard: {
    mostPostsCreated: Member[]; mostPublished: Member[]; mostCommentsReplied: Member[];
    bestReplyRate: Member[]; mostActive: Member[];
  };
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  postsByPlatform: { platform: string; published: number; total: number; comments: number }[];
  commentsByType: Record<string, number>;
  commentsBySentiment: { positive: number; neutral: number; negative: number };
  accountCommentLoad: {
    id: string; platform: PlatformId; handle: string; displayName: string;
    ownerName: string; ownerColor: string | null;
    total: number; unread: number; replied: number; replyRate: number;
  }[];
  trend: { date: string; postsCreated: number; published: number; comments: number }[];
  activityHeatmap: { date: string; count: number; platforms: string[] }[];
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
  post_published: Send, post_scheduled: Clock, comment_replied: Reply,
  account_connected: Layers, ai_generated: Sparkles, team_joined: CheckCircle2,
  task_completed: CheckCircle2,
};
const RANK_ICONS = [Crown, Award, Trophy];
const RANK_COLORS = ["text-amber-500", "text-slate-400", "text-orange-600"];

const PIPELINE_META = [
  { key: "draft", label: "Drafts", icon: FileEdit, color: "oklch(0.66 0.22 305)", desc: "Work in progress" },
  { key: "scheduled", label: "Scheduled", icon: Clock, color: "oklch(0.62 0.22 255)", desc: "Queued for publish" },
  { key: "published", label: "Published", icon: CheckCircle2, color: "oklch(0.74 0.18 165)", desc: "Live on platforms" },
  { key: "failed", label: "Failed", icon: XCircle, color: "oklch(0.65 0.22 25)", desc: "Needs attention" },
] as const;

// ============ Main view ============

export function TeamPerformanceView() {
  const { data, loading } = useApi<TeamPerformanceData>("/api/team-performance");

  if (loading || !data) return <TeamPerformanceSkeleton />;

  const t = data.teamTotals;

  return (
    <div className="space-y-5">
      <HelpText module="team-performance">
        <strong className="text-foreground">Performance</strong> tracks every piece of content your team creates —
        posts drafted, tweets published, comments received & replied. This is the command center for
        monitoring content activity, not vanity follower counts.
      </HelpText>

      {/* === HERO: Content Activity === */}
      <ContentHero
        postsCreated={t.postsCreated}
        published={t.publishedPosts}
        commentsReceived={t.commentsReceived}
        weeklyCadence={t.weeklyCadence}
        members={data.members}
      />

      {/* === KPI GRID — content activity focused === */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Posts Created"
          value={t.postsCreated}
          icon={<FileText className="h-5 w-5" />}
          accent="oklch(0.62 0.22 255)"
          hint={`${t.draftPosts} drafts · ${t.scheduledPosts} scheduled`}
          delay={50}
        />
        <KpiCard
          label="Published"
          value={t.publishedPosts}
          icon={<Send className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint={`${t.variantsPublished} platform posts · ${t.failedPosts} failed`}
          delay={120}
        />
        <KpiCard
          label="Comments Received"
          value={t.commentsReceived}
          icon={<MessageCircle className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          hint={`${t.commentsReplied} replied · ${t.commentsReceived - t.commentsReplied} pending`}
          delay={190}
        />
        <KpiCard
          label="Reply Rate"
          value={`${t.replyRate}%`}
          icon={<Reply className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint={`team avg ${t.avgReplyRate}%`}
          delay={260}
        />
      </div>

      {/* === CONTENT PIPELINE (NEW) — draft → scheduled → published → failed === */}
      <SectionShell
        icon={<Layers className="h-4 w-4" />}
        title="Content pipeline"
        desc="Every post your team has touched, by lifecycle stage."
        delay={300}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINE_META.map((stage, i) => {
            const count = data.pipeline[stage.key];
            const pct = t.postsCreated > 0 ? Math.round((count / t.postsCreated) * 100) : 0;
            return (
              <div
                key={stage.key}
                className="crystal-in glass rounded-2xl p-4 transition hover:lift-hover"
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="grid h-9 w-9 place-items-center rounded-xl"
                    style={{ background: `${stage.color}14`, color: stage.color }}
                  >
                    <stage.icon className="h-4 w-4" />
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: `${stage.color}14`, color: stage.color }}
                  >
                    {pct}%
                  </span>
                </div>
                <div className="mt-3 num-display text-2xl font-bold">{count}</div>
                <div className="text-xs font-semibold">{stage.label}</div>
                <div className="text-[10px] text-muted-foreground">{stage.desc}</div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(pct, 2)}%`, background: stage.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionShell>

      {/* === POSTS CREATED TREND + POSTS BY PLATFORM === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.38s" }}>
          <SectionTitle
            title="Content creation trend"
            desc="Posts created, published & comments received (last 14 days)"
          />
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="postsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pubGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.74 0.18 165)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.74 0.18 165)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cmtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.2 25)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.7 0.2 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false} tickLine={false} interval={2}
                />
                <YAxis
                  tickFormatter={(v) => fmt(v)}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false} tickLine={false} width={32}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                />
                <Area type="monotone" dataKey="postsCreated" name="Posts created" stroke="var(--primary)" strokeWidth={2.5} fill="url(#postsGrad)" isAnimationActive animationBegin={200} />
                <Area type="monotone" dataKey="published" name="Published" stroke="oklch(0.74 0.18 165)" strokeWidth={2} fill="url(#pubGrad)" isAnimationActive animationBegin={350} />
                <Area type="monotone" dataKey="comments" name="Comments" stroke="oklch(0.7 0.2 25)" strokeWidth={2} fill="url(#cmtGrad)" isAnimationActive animationBegin={500} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Posts by platform (tweets/posts/IG posts/etc.) */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.46s" }}>
          <SectionTitle title="Posts by platform" desc="Content published per platform" />
          <div className="space-y-3">
            {data.postsByPlatform.length === 0 ? (
              <EmptyInline icon={<Send className="h-5 w-5" />} text="No content published yet" />
            ) : (
              data.postsByPlatform.map((p, i) => {
                const config = PLATFORMS[p.platform as PlatformId];
                const pct = p.total > 0 ? Math.round((p.published / p.total) * 100) : 0;
                return (
                  <div key={p.platform} className="rounded-xl border border-border/40 bg-muted/20 p-3" style={{ animationDelay: `${0.05 * i}s` }}>
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={p.platform as PlatformId} size={22} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{config?.name ?? p.platform}</div>
                        <div className="text-[10px] text-muted-foreground">{p.comments} comments received</div>
                      </div>
                      <div className="text-right">
                        <div className="num-display text-base font-bold">{p.published}</div>
                        <div className="text-[9px] text-muted-foreground">/ {p.total}</div>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(pct, 2)}%`, background: config?.color ?? "var(--primary)" }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>

      {/* === COMMENTS TRACKING (NEW) === */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Reply rate radial */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.54s" }}>
          <SectionTitle title="Reply rate" desc="Comments received vs replied" />
          <div className="relative mx-auto h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="65%"
                outerRadius="100%"
                data={[{ name: "Reply rate", value: t.replyRate, fill: "var(--primary)" }]}
                startAngle={90}
                endAngle={90 - (360 * t.replyRate) / 100}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "var(--muted)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="num-display text-3xl font-bold">{t.replyRate}%</span>
              <span className="text-[10px] text-muted-foreground">replied</span>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Replied</div>
              <span className="font-bold">{t.commentsReplied}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2"><Inbox className="h-3.5 w-3.5 text-amber-500" />Pending</div>
              <span className="font-bold">{t.commentsReceived - t.commentsReplied}</span>
            </div>
          </div>
        </GlassCard>

        {/* Sentiment breakdown */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.62s" }}>
          <SectionTitle title="Comment sentiment" desc="Tone of incoming comments" />
          <div className="relative mx-auto h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Positive", value: data.commentsBySentiment.positive, color: "oklch(0.74 0.18 165)" },
                    { name: "Neutral", value: data.commentsBySentiment.neutral, color: "oklch(0.7 0.04 250)" },
                    { name: "Negative", value: data.commentsBySentiment.negative, color: "oklch(0.65 0.22 25)" },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="none"
                >
                  {["positive", "neutral", "negative"].map((s, i) => (
                    <Cell
                      key={i}
                      fill={
                        s === "positive" ? "oklch(0.74 0.18 165)" :
                        s === "negative" ? "oklch(0.65 0.22 25)" :
                        "oklch(0.7 0.04 250)"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="num-display text-2xl font-bold">{t.commentsReceived}</span>
              <span className="text-[10px] text-muted-foreground">comments</span>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <SentimentRow label="Positive" value={data.commentsBySentiment.positive} total={t.commentsReceived} color="oklch(0.74 0.18 165)" />
            <SentimentRow label="Neutral" value={data.commentsBySentiment.neutral} total={t.commentsReceived} color="oklch(0.7 0.04 250)" />
            <SentimentRow label="Negative" value={data.commentsBySentiment.negative} total={t.commentsReceived} color="oklch(0.65 0.22 25)" />
          </div>
        </GlassCard>

        {/* Comment types */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.70s" }}>
          <SectionTitle title="Comment types" desc="Where comments come from" />
          <div className="space-y-3 pt-2">
            {Object.entries(data.commentsByType).length === 0 ? (
              <EmptyInline icon={<MessageCircle className="h-5 w-5" />} text="No comments yet" />
            ) : (
              Object.entries(data.commentsByType).map(([type, count]) => {
                const pct = t.commentsReceived > 0 ? Math.round((count / t.commentsReceived) * 100) : 0;
                const Icon = type === "message" ? MessageCircle : type === "mention" ? Hash : MessageCircle;
                const color = type === "message" ? "oklch(0.62 0.22 255)" : type === "mention" ? "oklch(0.66 0.22 305)" : "oklch(0.7 0.2 25)";
                return (
                  <div key={type} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${color}14`, color }}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-semibold capitalize">{type}s</span>
                      <span className="num-display ml-auto text-sm font-bold">{count}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>

      {/* === ACCOUNT COMMENT LOAD (NEW) — which accounts need attention === */}
      <SectionShell
        icon={<Inbox className="h-4 w-4" />}
        title="Account comment load"
        desc="Which accounts have the most unread comments — needs attention."
        delay={780}
        action={
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
            {data.accountCommentLoad.reduce((s, a) => s + a.unread, 0)} unread
          </span>
        }
      >
        {data.accountCommentLoad.length === 0 ? (
          <EmptyInline icon={<Inbox className="h-6 w-6" />} text="No comments received yet — connect accounts and start posting!" />
        ) : (
          <div className="scroll-liquid max-h-[400px] space-y-2 overflow-y-auto pr-1">
            {data.accountCommentLoad.map((a, i) => (
              <div
                key={a.id}
                className="crystal-in glass flex items-center gap-3 rounded-xl p-3 transition hover:lift-hover"
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <PlatformBadge platform={a.platform} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{a.displayName}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{a.handle}</div>
                </div>
                <div className="flex items-center gap-1">
                  <NameAvatar name={a.ownerName} color={a.ownerColor ?? "blue"} className="h-5 w-5 text-[8px]" />
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="num-display text-sm font-bold">{a.total}</div>
                    <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="num-display text-sm font-bold text-amber-500">{a.unread}</div>
                    <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Unread</div>
                  </div>
                  <div>
                    <div className={cn("num-display text-sm font-bold", a.replyRate >= 66 ? "text-emerald-500" : a.replyRate >= 33 ? "text-amber-500" : "text-rose-500")}>{a.replyRate}%</div>
                    <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Replied</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      {/* === POSTING CADENCE BY MEMBER (NEW) === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.86s" }}>
        <SectionTitle title="Posting cadence by member" desc="Posts created per member (last 7 days vs last 30 days)" />
        {data.members.length === 0 ? (
          <EmptyInline icon={<TrendingUp className="h-6 w-6" />} text="No team members yet" />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.members.map((m) => ({
                  name: m.name.split(" ")[0],
                  "Last 7 days": m.metrics.weeklyCadence,
                  "Last 30 days": m.metrics.monthlyCadence,
                  color: m.color,
                }))}
                margin={{ left: -16, right: 8, top: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Last 7 days" fill="var(--primary)" radius={[6, 6, 0, 0]} isAnimationActive animationBegin={200} />
                <Bar dataKey="Last 30 days" fill="oklch(0.66 0.22 305)" radius={[6, 6, 0, 0]} isAnimationActive animationBegin={400} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      {/* === ACTIVITY HEATMAP (90-day content creation cadence) === */}
      <SectionShell
        icon={<Flame className="h-4 w-4" />}
        title="Activity heatmap"
        desc="Posting & content creation cadence over the last 90 days — darker cells = more activity."
        delay={940}
        action={
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              {[0.1, 0.3, 0.5, 0.7, 1].map((o) => (
                <span key={o} className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--primary)", opacity: o }} />
              ))}
            </div>
            <span>More</span>
          </div>
        }
      >
        <ActivityHeatmap data={data.activityHeatmap} />
      </SectionShell>

      {/* === LEADERBOARD — content activity === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "1.02s" }}>
        <SectionTitle title="Top contributors" desc="Leaderboard by content activity" action={<Trophy className="h-5 w-5 text-amber-500" />} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <LeaderboardCard title="Most Posts Created" members={data.leaderboard.mostPostsCreated} getValue={(m) => m.metrics.postsCreated.toString()} />
          <LeaderboardCard title="Most Published" members={data.leaderboard.mostPublished} getValue={(m) => m.metrics.publishedPosts.toString()} />
          <LeaderboardCard title="Most Comments Replied" members={data.leaderboard.mostCommentsReplied} getValue={(m) => m.metrics.commentsReplied.toString()} />
          <LeaderboardCard title="Best Reply Rate" members={data.leaderboard.bestReplyRate} getValue={(m) => `${m.metrics.replyRate}%`} />
          <LeaderboardCard title="Most Active (7d)" members={data.leaderboard.mostActive} getValue={(m) => m.metrics.weeklyCadence.toString()} />
        </div>
      </GlassCard>

      {/* === TEAM MEMBER CARDS — content activity === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "1.10s" }}>
        <SectionTitle title="Team members" desc="Individual content activity breakdown" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.members.map((m, i) => (
            <MemberCard key={m.id} member={m} delay={i * 0.04} />
          ))}
        </div>
      </GlassCard>

      {/* === RECENT ACTIVITY === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "1.18s" }}>
        <SectionTitle title="Recent activity" desc="Latest content actions across the team" action={<Activity className="h-4 w-4 text-primary" />} />
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

// ============ Hero — content activity focused ============
function ContentHero({
  postsCreated,
  published,
  commentsReceived,
  weeklyCadence,
  members,
}: {
  postsCreated: number;
  published: number;
  commentsReceived: number;
  weeklyCadence: number;
  members: Member[];
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
              <PenLine className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
              <Activity className="h-3.5 w-3.5" />
              Content Activity
            </div>
            <h2 className="mt-2 text-[28px] font-bold tracking-tight">
              {postsCreated} posts created
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {published} published · {commentsReceived} comments received · {weeklyCadence} this week
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
  icon: React.ReactNode;
  title: string;
  desc?: string;
  delay?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <GlassCard className="crystal-in p-5" style={{ animationDelay: `${(delay ?? 300) / 1000}s` }}>
      <SectionTitle
        title={title}
        desc={desc}
        action={action ?? <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>}
      />
      <div className="mt-3">{children}</div>
    </GlassCard>
  );
}

// ============ Empty inline ============
function EmptyInline({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted/60 text-muted-foreground">{icon}</div>
      <div className="text-xs text-muted-foreground">{text}</div>
    </div>
  );
}

// ============ Sentiment row ============
function SentimentRow({ label, value, total, color }: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value} · {pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />
      </div>
    </div>
  );
}

// ============ Activity Heatmap ============
function ActivityHeatmap({ data }: { data: { date: string; count: number; platforms: string[] }[] }) {
  const weeks: typeof data[] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  const activeDays = data.filter((d) => d.count > 0).length;
  const totalActivity = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="overflow-x-auto scroll-liquid pb-2">
      <div className="flex min-w-[560px] gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const intensity = day.count === 0 ? 0 : Math.min(1, day.count / Math.max(maxCount, 1));
              const opacity = day.count === 0 ? 0.25 : 0.2 + intensity * 0.8;
              const dateLabel = new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
              return (
                <div
                  key={day.date}
                  className="group relative h-3.5 w-3.5 rounded-sm transition hover:scale-125"
                  style={{
                    background: day.count === 0 ? "var(--muted)" : "var(--primary)",
                    opacity,
                  }}
                  title={`${dateLabel}: ${day.count} activity${day.count !== 1 ? "ies" : ""}${day.platforms.length > 0 ? ` on ${day.platforms.join(", ")}` : ""}`}
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
        <span>{activeDays} active days · {totalActivity} total activities</span>
        <span>{new Date(data[data.length - 1]?.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

// ============ Leaderboard Card ============
function LeaderboardCard({ title, members, getValue }: {
  title: string;
  members: Member[];
  getValue: (m: Member) => string;
}) {
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

// ============ Member Card — content activity focused ============
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

      {/* Quick stats grid — content activity */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-base font-bold">{m.postsCreated}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Posts</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-base font-bold text-emerald-500">{m.publishedPosts}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Published</div>
        </div>
        <div className="rounded-xl bg-muted/30 p-2">
          <div className="num-display text-base font-bold text-amber-500">{m.commentsReplied}</div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">Replies</div>
        </div>
      </div>

      {/* Cadence indicator */}
      <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/30 px-3 py-1.5 text-[10px]">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Zap className="h-3 w-3" />
          Cadence
        </div>
        <span className="font-bold">{m.weeklyCadence}/week · {m.monthlyCadence}/30d</span>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <StatRow icon={<FileEdit className="h-3 w-3" />} label="Drafts" value={m.draftPosts.toString()} />
            <StatRow icon={<Clock className="h-3 w-3" />} label="Scheduled" value={m.scheduledPosts.toString()} />
            <StatRow icon={<XCircle className="h-3 w-3" />} label="Failed" value={m.failedPosts.toString()} />
            <StatRow icon={<Send className="h-3 w-3" />} label="Variants" value={m.variantsPublished.toString()} />
            <StatRow icon={<MessageCircle className="h-3 w-3" />} label="Comments" value={m.commentsReceived.toString()} />
            <StatRow icon={<Reply className="h-3 w-3" />} label="Reply rate" value={`${m.replyRate}%`} />
            <StatRow icon={<CheckCircle2 className="h-3 w-3" />} label="Tasks done" value={`${m.completedTasks}/${m.tasksAssigned}`} />
            <StatRow icon={<Clock className="h-3 w-3" />} label="Task rate" value={`${m.taskCompletionRate}%`} />
          </div>

          {/* Sentiment breakdown for this member's accounts */}
          {m.commentsReceived > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">Comments:</span>
              <span className="font-medium text-emerald-500">+{m.positiveComments}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">{m.neutralComments}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium text-rose-500">-{m.negativeComments}</span>
            </div>
          )}

          {/* Per-platform content */}
          {member.platforms.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Content per platform</div>
              {member.platforms.map((p) => (
                <div key={p.platform} className="flex items-center gap-2 text-[11px]">
                  <PlatformBadge platform={p.platform as PlatformId} size={16} />
                  <span className="text-muted-foreground">{p.published} published / {p.total} total</span>
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

// ============ Skeleton ============
function TeamPerformanceSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-32 rounded-3xl" />)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-28 rounded-3xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shimmer h-[340px] rounded-3xl lg:col-span-2" />
        <div className="shimmer h-[340px] rounded-3xl" />
      </div>
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
