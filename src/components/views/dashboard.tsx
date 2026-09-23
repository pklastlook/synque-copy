"use client";

import * as React from "react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Users, Eye, TrendingUp, FileText, Send, Clock, MessageCircle, Reply,
  Sparkles, CheckCircle2, UserPlus, Wand2, ArrowUpRight, ArrowDownRight,
  ChevronRight, ChevronUp, ChevronDown, FileEdit, XCircle, Layers, Inbox,
  PenLine, Hash, Activity, Crown, Award, Trophy, Globe,
  Lightbulb, Bell, Target, Zap, Calendar, BarChart3, AlertCircle,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge, VerifiedTick } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import type { ViewId } from "@/lib/types";

// ============ Types ============

interface DashboardData {
  kpis: {
    totalFollowers: { value: number; display: string; delta: number };
    totalReach: { value: number; display: string; delta: number };
    impressions: { value: number; display: string; delta: number };
    postsCreated: { value: number; display: string; delta: number };
    published: { value: number; display: string; delta: number };
    comments: { value: number; display: string; delta: number };
    replyRate: { value: number; display: string; delta: number };
    drafts: number;
    scheduled: number;
    failed: number;
    pendingInbox: number;
    accounts: number;
    variantsPublished: number;
    totalEngagement: number;
  };
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  pipelineTotal: number;
  series: {
    date: string; followers: number; reach: number; impressions: number;
    postsCreated: number; published: number; comments: number;
  }[];
  pagesRanking: {
    id: string; platform: PlatformId; handle: string; displayName: string;
    avatar: string | null; verified: boolean;
    followers: number; reach: number; impressions: number; engagement: number;
    postsCount: number; engagementRate: number; growth7d: number;
    sparkline: number[];
    ownerName: string; ownerColor: string | null;
    healthStatus: string; riskLevel: string;
  }[];
  topContributors: {
    name: string; color: string | null; avatar: string | null;
    posts: number; published: number; comments: number;
  }[];
  recentPosts: {
    id: string; title: string; caption: string; mediaUrl: string | null;
    status: string; tone: string; authorName: string; authorColor: string | null;
    createdAt: string; publishedAt: string | null;
    platforms: PlatformId[]; variantCount: number;
  }[];
  commentInbox: {
    id: string; author: string; text: string; type: string; sentiment: string;
    platform: PlatformId; handle: string; accountName: string; createdAt: string;
  }[];
  upcoming: {
    id: string; title: string; mediaUrl: string | null;
    scheduledAt: string | null; platforms: PlatformId[];
    authorName: string; authorColor: string | null;
  }[];
  topPosts: {
    id: string; title: string; mediaUrl: string | null; status: string;
    authorName: string; authorColor: string | null;
    engagement: number; reach: number; impressions: number; accounts: number;
    platforms: PlatformId[]; publishedAt: string | null;
  }[];
  activities: {
    id: string; userId: string; userName: string; userColor: string | null;
    userAvatar: string | null; type: string; description: string; createdAt: string;
  }[];
  insights: {
    type: "warning" | "info" | "success" | "tip";
    title: string; desc: string;
    action?: string; actionView?: string;
  }[];
  goals: {
    weeklyPosts: { current: number; target: number; progress: number; label: string };
    publishing: { current: number; target: number; progress: number; label: string };
    replyRate: { current: number; target: number; progress: number; label: string };
    engagement: { current: number; target: number; progress: number; label: string };
  };
  notifications: {
    id: string; type: "urgent" | "info" | "success";
    title: string; desc: string; time: string; actionView?: string;
  }[];
  audienceByPlatform: {
    platform: string; followers: number; accounts: number;
    posts: number; engagement: number; color: string;
  }[];
  weekCalendar: {
    date: string; dayName: string; dayNum: number;
    postCount: number; isToday: boolean;
  }[];
}

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  post_published: Send, post_scheduled: Clock, comment_replied: Reply,
  account_connected: UserPlus, ai_generated: Wand2,
  team_joined: CheckCircle2, task_completed: CheckCircle2,
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-purple-500", bg: "bg-purple-500/15" },
  scheduled: { label: "Scheduled", color: "text-blue-500", bg: "bg-blue-500/15" },
  published: { label: "Published", color: "text-emerald-500", bg: "bg-emerald-500/15" },
  failed: { label: "Failed", color: "text-rose-500", bg: "bg-rose-500/15" },
};

const SENTIMENT_META: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  positive: { color: "text-emerald-500", bg: "bg-emerald-500/15", icon: TrendingUp },
  neutral: { color: "text-muted-foreground", bg: "bg-muted", icon: Hash },
  negative: { color: "text-rose-500", bg: "bg-rose-500/15", icon: ArrowDownRight },
};

const PIPELINE_STAGES = [
  { key: "draft", label: "Drafts", icon: FileEdit, color: "oklch(0.66 0.22 305)" },
  { key: "scheduled", label: "Scheduled", icon: Clock, color: "oklch(0.62 0.22 255)" },
  { key: "published", label: "Published", icon: CheckCircle2, color: "oklch(0.74 0.18 165)" },
  { key: "failed", label: "Failed", icon: XCircle, color: "oklch(0.65 0.22 25)" },
] as const;

const TOOLTIP_STYLE = {
  background: "var(--popover)", border: "1px solid var(--border)",
  borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
};

type SortKey = "followers" | "reach" | "engagement" | "postsCount" | "engagementRate";

const INSIGHT_META: Record<string, { icon: LucideIcon; color: string; bg: string; border: string; glow: string }> = {
  warning: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/15", border: "border-amber-500/30", glow: "bg-amber-500/20" },
  info: { icon: Lightbulb, color: "text-blue-500", bg: "bg-blue-500/15", border: "border-blue-500/30", glow: "bg-blue-500/20" },
  success: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/15", border: "border-emerald-500/30", glow: "bg-emerald-500/20" },
  tip: { icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/15", border: "border-purple-500/30", glow: "bg-purple-500/20" },
};

const NOTIF_META: Record<string, { icon: LucideIcon; bg: string; border: string; iconBg: string; iconColor: string }> = {
  urgent: { icon: AlertCircle, bg: "bg-rose-500/5", border: "border-rose-500/30", iconBg: "bg-rose-500/15", iconColor: "text-rose-500" },
  info: { icon: Bell, bg: "bg-blue-500/5", border: "border-blue-500/30", iconBg: "bg-blue-500/15", iconColor: "text-blue-500" },
  success: { icon: CheckCircle2, bg: "bg-emerald-500/5", border: "border-emerald-500/30", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-500" },
};

const QUICK_ACTIONS: { label: string; icon: LucideIcon; view: string; bg: string; color: string }[] = [
  { label: "Compose", icon: Wand2, view: "composer", bg: "bg-primary/15", color: "text-primary" },
  { label: "Inbox", icon: Inbox, view: "inbox", bg: "bg-amber-500/15", color: "text-amber-500" },
  { label: "Calendar", icon: Calendar, view: "calendar", bg: "bg-blue-500/15", color: "text-blue-500" },
  { label: "Analytics", icon: BarChart3, view: "analytics", bg: "bg-emerald-500/15", color: "text-emerald-500" },
  { label: "Performance", icon: Activity, view: "team-performance", bg: "bg-purple-500/15", color: "text-purple-500" },
];

// ============ Main view ============

export function DashboardView() {
  const { data, loading } = useApi<DashboardData>("/api/dashboard");
  const { setView, openComposerWithPost } = useNav();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  const [sortKey, setSortKey] = React.useState<SortKey>("followers");
  const [chartMetric, setChartMetric] = React.useState<"followers" | "reach" | "postsCreated" | "comments">("followers");

  if (loading || !data) return <DashboardSkeleton />;

  const k = data.kpis;
  const pendingInbox = k.pendingInbox;
  const failedCount = k.failed;

  // Sort pages ranking by selected key
  const sortedRanking = [...data.pagesRanking].sort((a, b) => {
    if (sortKey === "engagementRate") return b.engagementRate - a.engagementRate;
    return (b[sortKey] as number) - (a[sortKey] as number);
  });

  return (
    <div className="space-y-5">
      <HelpText module="dashboard">
        Your <strong className="text-foreground">Dashboard</strong> is the command center — followers, reach, content
        pipeline, pages ranking, comment inbox, and team activity in one view.
      </HelpText>

      {/* === HERO === */}
      <GlassCard strong className="relative overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative grid h-14 w-14 place-items-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "2.5s" }} />
              <div className="absolute inset-1 rounded-full bg-primary/10" />
              <div className="relative grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
                Good day, <span className="retaina-text">{firstName}</span>
              </h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">{fmt(k.totalFollowers.value)}</span> followers ·{" "}
                <span className="font-semibold text-foreground">{fmt(k.totalReach.value)}</span> reach ·{" "}
                {k.postsCreated.value} posts ·{" "}
                <span className={cn(pendingInbox > 0 ? "font-semibold text-amber-500" : "")}>{pendingInbox} unread</span>
                {failedCount > 0 && <span className="font-semibold text-rose-500"> · {failedCount} failed</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingInbox > 0 && (
              <button
                onClick={() => setView("inbox")}
                className="hidden items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-[13px] font-semibold text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400 sm:flex"
              >
                <Inbox className="h-4 w-4" />
                {pendingInbox} unread
              </button>
            )}
            <button
              onClick={() => setView("composer")}
              className="liquid-pill flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold"
            >
              <Wand2 className="h-4 w-4" />
              Compose with AI
            </button>
          </div>
        </div>
      </GlassCard>

      {/* === KPI GRID — mixed vanity + content === */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Followers"
          value={k.totalFollowers.value}
          delta={k.totalFollowers.delta}
          icon={<Users className="h-5 w-5" />}
          accent="oklch(0.55 0.2 255)"
          hint={`across ${k.accounts} accounts`}
          delay={50}
          series={data.series.map((s) => s.followers)}
        />
        <KpiCard
          label="Total Reach"
          value={k.totalReach.value}
          delta={k.totalReach.delta}
          icon={<Eye className="h-5 w-5" />}
          accent="oklch(0.62 0.22 300)"
          hint={`${fmt(k.totalEngagement)} engagement`}
          delay={120}
          series={data.series.map((s) => s.reach)}
        />
        <KpiCard
          label="Posts Created"
          value={k.postsCreated.value}
          delta={k.postsCreated.delta}
          icon={<FileText className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint={`${k.drafts} drafts · ${k.scheduled} scheduled`}
          delay={190}
          series={data.series.map((s) => s.postsCreated)}
        />
        <KpiCard
          label="Comments"
          value={k.comments.value}
          delta={k.comments.delta}
          icon={<MessageCircle className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          hint={`${k.replyRate.display} reply rate`}
          delay={260}
          series={data.series.map((s) => s.comments)}
        />
      </div>

      {/* === AI INSIGHTS BANNER (NEW) — smart recommendations === */}
      {data.insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ animationDelay: "0.28s" }}>
          {data.insights.slice(0, 3).map((insight, i) => {
            const meta = INSIGHT_META[insight.type];
            const InsightIcon = meta.icon;
            return (
              <div
                key={i}
                className={cn(
                  "crystal-in glass relative overflow-hidden rounded-2xl border p-4 transition hover:lift-hover",
                  meta.border
                )}
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <div className={cn("pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl", meta.glow)} />
                <div className="relative flex items-start gap-3">
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", meta.bg, meta.color)}>
                    <InsightIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{insight.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{insight.desc}</div>
                    {insight.action && insight.actionView && (
                      <button
                        onClick={() => setView(insight.actionView as ViewId)}
                        className={cn("mt-2 flex items-center gap-1 text-[11px] font-semibold", meta.color)}
                      >
                        {insight.action} <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* === QUICK ACTIONS STRIP (NEW) — one-click shortcuts === */}
      <div className="flex flex-wrap gap-2" style={{ animationDelay: "0.32s" }}>
        {QUICK_ACTIONS.map((qa, i) => (
          <button
            key={qa.label}
            onClick={() => setView(qa.view as ViewId)}
            className="crystal-in glass group flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2.5 text-[12px] font-semibold transition hover:border-primary/40 hover:bg-muted/40"
            style={{ animationDelay: `${0.04 * i}s` }}
          >
            <span className={cn("grid h-6 w-6 place-items-center rounded-lg", qa.bg, qa.color)}>
              <qa.icon className="h-3.5 w-3.5" />
            </span>
            {qa.label}
            <ChevronRight className="h-3 w-3 text-muted-foreground transition group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      {/* === GOAL TRACKING + NOTIFICATIONS (NEW) === */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Goal tracking — 4 progress rings */}
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.36s" }}>
          <SectionTitle
            title="Weekly goals"
            desc="Progress toward this week's targets"
            action={<Target className="h-4 w-4 text-primary" />}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              { key: "weeklyPosts", icon: FileText, color: "oklch(0.62 0.22 255)" },
              { key: "publishing", icon: Send, color: "oklch(0.74 0.18 165)" },
              { key: "replyRate", icon: Reply, color: "oklch(0.66 0.22 305)" },
              { key: "engagement", icon: TrendingUp, color: "oklch(0.7 0.2 25)" },
            ] as const).map((g, i) => {
              const goal = data.goals[g.key];
              return (
                <GoalRing
                  key={g.key}
                  label={goal.label}
                  current={goal.current}
                  target={goal.target}
                  progress={goal.progress}
                  icon={g.icon}
                  color={g.color}
                  delay={0.04 * i}
                />
              );
            })}
          </div>
        </GlassCard>

        {/* Smart notifications */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.44s" }}>
          <SectionTitle
            title="Notifications"
            desc="Important alerts"
            action={
              <span className="flex items-center gap-1.5 text-[10px]">
                {data.notifications.length > 0 && (
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {data.notifications.length}
                  </span>
                )}
                <Bell className="h-4 w-4 text-primary" />
              </span>
            }
          />
          <div className="scroll-liquid max-h-[240px] space-y-2 overflow-y-auto pr-1">
            {data.notifications.length > 0 ? (
              data.notifications.map((n, i) => {
                const meta = NOTIF_META[n.type];
                const NotifIcon = meta.icon;
                return (
                  <div
                    key={n.id}
                    className={cn("flex items-start gap-2 rounded-xl border p-2.5 transition hover:bg-muted/40", meta.border, meta.bg)}
                    style={{ animationDelay: `${0.04 * i}s` }}
                  >
                    <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", meta.iconBg, meta.iconColor)}>
                      <NotifIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold">{n.title}</div>
                      <div className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{n.desc}</div>
                      {n.actionView && (
                        <button
                          onClick={() => setView(n.actionView as ViewId)}
                          className={cn("mt-1 text-[10px] font-semibold", meta.iconColor)}
                        >
                          View →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-xs text-muted-foreground">All clear — no alerts</div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* === PAGES RANKING (NEW) — interactive sortable table === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.30s" }}>
        <SectionTitle
          title="Pages ranking"
          desc="Your connected accounts ranked by followers, reach, engagement & content"
          action={
            <button
              onClick={() => setView("accounts")}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All accounts <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        />
        <PagesRankingTable
          ranking={sortedRanking}
          sortKey={sortKey}
          onSort={setSortKey}
        />
      </GlassCard>

      {/* === REACH + FOLLOWER TREND (interactive metric switcher) === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.38s" }}>
        <SectionTitle
          title="Performance trend"
          desc="14-day trend — click a metric below to switch"
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { key: "followers", label: "Followers", color: "oklch(0.55 0.2 255)" },
                { key: "reach", label: "Reach", color: "oklch(0.62 0.22 300)" },
                { key: "postsCreated", label: "Posts", color: "oklch(0.74 0.18 165)" },
                { key: "comments", label: "Comments", color: "oklch(0.7 0.2 25)" },
              ] as const).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setChartMetric(m.key)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[10px] font-semibold transition",
                    chartMetric === m.key
                      ? "text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                  style={chartMetric === m.key ? { background: m.color } : {}}
                >
                  {m.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
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
                axisLine={false} tickLine={false} width={40}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              />
              <Area
                type="monotone"
                dataKey={chartMetric}
                name={chartMetric}
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#gMetric)"
                isAnimationActive
                animationBegin={200}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* === AUDIENCE BREAKDOWN + WEEK CALENDAR (NEW) === */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Audience by platform */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.42s" }}>
          <SectionTitle title="Audience" desc="Followers by platform" action={<Users className="h-4 w-4 text-primary" />} />
          {data.audienceByPlatform.length > 0 ? (
            <div className="space-y-2">
              {data.audienceByPlatform.map((p, i) => {
                const total = data.audienceByPlatform.reduce((s, x) => s + x.followers, 0) || 1;
                const pct = Math.round((p.followers / total) * 100);
                return (
                  <div key={p.platform} className="rounded-xl border border-border/40 bg-muted/20 p-2.5" style={{ animationDelay: `${0.04 * i}s` }}>
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={p.platform as PlatformId} size={18} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold">{PLATFORMS[p.platform as PlatformId]?.name ?? p.platform}</div>
                        <div className="text-[9px] text-muted-foreground">{p.accounts} acc · {p.posts} posts</div>
                      </div>
                      <div className="text-right">
                        <div className="num-display text-sm font-bold">{fmt(p.followers)}</div>
                        <div className="text-[8px] text-muted-foreground">{pct}%</div>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%`, background: p.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-xs text-muted-foreground">No audience data yet</div>
            </div>
          )}
        </GlassCard>

        {/* Week calendar strip */}
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.48s" }}>
          <SectionTitle
            title="This week"
            desc="Scheduled posts for the next 7 days"
            action={
              <button onClick={() => setView("calendar")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Calendar <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="grid grid-cols-7 gap-2">
            {data.weekCalendar.map((d, i) => (
              <div
                key={d.date}
                className={cn(
                  "crystal-in glass relative overflow-hidden rounded-xl border p-2 text-center transition hover:lift-hover",
                  d.isToday ? "border-primary/50 bg-primary/5" : "border-border/40 bg-muted/20"
                )}
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{d.dayName}</div>
                <div className={cn("num-display mt-1 text-base font-bold", d.isToday && "text-primary")}>{d.dayNum}</div>
                {d.postCount > 0 ? (
                  <div className="mt-1 flex items-center justify-center gap-0.5">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                      {d.postCount}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 h-4" />
                )}
                {d.isToday && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-[10px]">
            <span className="text-muted-foreground">
              {data.weekCalendar.reduce((s, d) => s + d.postCount, 0)} posts scheduled this week
            </span>
            <button onClick={() => setView("composer")} className="flex items-center gap-1 font-semibold text-primary">
              <Wand2 className="h-3 w-3" /> Schedule more
            </button>
          </div>
        </GlassCard>
      </div>

      {/* === CONTENT PIPELINE + COMMENT INBOX === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.46s" }}>
          <SectionTitle
            title="Content pipeline"
            desc="Every post by lifecycle stage"
            action={
              <button onClick={() => setView("calendar")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Calendar <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <PipelineFlow pipeline={data.pipeline} total={data.pipelineTotal} />
        </GlassCard>

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.54s" }}>
          <SectionTitle
            title="Comment inbox"
            desc="Latest unread comments"
            action={
              <button onClick={() => setView("inbox")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                {pendingInbox} <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="scroll-liquid max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {data.commentInbox.length > 0 ? (
              data.commentInbox.map((c) => {
                const sentiment = SENTIMENT_META[c.sentiment] ?? SENTIMENT_META.neutral;
                const SentIcon = sentiment.icon;
                return (
                  <div key={c.id} className="group rounded-2xl border border-border/40 bg-muted/20 p-3 transition hover:bg-muted/40">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={c.platform} size={18} />
                      <span className="truncate text-xs font-semibold">{c.author}</span>
                      <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground">
                        <SentIcon className={cn("h-3 w-3", sentiment.color)} />
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1.5 line-clamp-2 text-[11px] text-muted-foreground">
                      &ldquo;{c.text}&rdquo;
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="truncate text-[10px] text-muted-foreground">{c.handle}</span>
                      <button
                        onClick={() => setView("inbox")}
                        className={cn("flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold opacity-0 transition group-hover:opacity-100", sentiment.bg, sentiment.color)}
                      >
                        <Reply className="h-2.5 w-2.5" /> Reply
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">All caught up!</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">No unread comments</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* === TOP PERFORMING + TOP CONTRIBUTORS === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.62s" }}>
          <SectionTitle
            title="Top performing posts"
            desc="By engagement & reach across platforms"
            action={
              <button onClick={() => setView("analytics")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="space-y-2">
            {data.topPosts.length > 0 ? (
              data.topPosts.map((p, i) => (
                <div key={p.id} className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-muted/50">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {p.mediaUrl ? <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" /> : null}
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[9px] font-bold text-white">#{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <NameAvatar name={p.authorName} color={p.authorColor ?? "blue"} className="h-4 w-4 text-[7px]" />
                      <span>{p.authorName}</span>
                      <span>·</span>
                      <span>{p.accounts} accounts</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {p.platforms.slice(0, 4).map((pl, j) => <PlatformBadge key={j} platform={pl} size={14} />)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3 text-right">
                    <div>
                      <div className="text-sm font-bold">{fmt(p.engagement)}</div>
                      <div className="text-[10px] text-muted-foreground">eng</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-sm font-bold">{fmt(p.reach)}</div>
                      <div className="text-[10px] text-muted-foreground">reach</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No published posts yet</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Publish your first post to see performance</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.70s" }}>
          <SectionTitle
            title="Top contributors"
            desc="Most active members (30 days)"
            action={
              <button onClick={() => setView("team-performance")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                All <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="space-y-2">
            {data.topContributors.length > 0 ? (
              data.topContributors.map((m, i) => (
                <div key={m.name + i} className="group flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3 transition hover:bg-muted/40">
                  <span className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                    i === 0 ? "bg-amber-500/15 text-amber-500" :
                    i === 1 ? "bg-slate-400/15 text-slate-400" :
                    i === 2 ? "bg-orange-500/15 text-orange-500" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <NameAvatar name={m.name} color={m.color ?? "blue"} className="h-9 w-9 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{m.name}</div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><FileText className="h-2.5 w-2.5" />{m.posts}</span>
                      <span className="flex items-center gap-0.5"><Send className="h-2.5 w-2.5 text-emerald-500" />{m.published}</span>
                      {m.comments > 0 && (
                        <span className="flex items-center gap-0.5"><Reply className="h-2.5 w-2.5 text-purple-500" />{m.comments}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="num-display text-sm font-bold">{m.posts}</div>
                    <div className="text-[8px] uppercase text-muted-foreground">posts</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No contributors yet</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Team activity will show here</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* === RECENT POSTS + UPCOMING === */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.78s" }}>
          <SectionTitle
            title="Recent posts"
            desc="Latest content — click to edit & republish"
            action={
              <button onClick={() => setView("composer")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Composer <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="scroll-liquid max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {data.recentPosts.length > 0 ? (
              data.recentPosts.map((p) => {
                const status = STATUS_META[p.status] ?? STATUS_META.draft;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      openComposerWithPost({
                        id: p.id,
                        title: p.title,
                        caption: p.caption,
                        mediaUrl: p.mediaUrl,
                        mediaType: "image",
                        tone: p.tone,
                        status: p.status as "draft" | "scheduled" | "published" | "failed",
                        scheduledAt: null,
                        authorId: "",
                        authorName: p.authorName,
                        variants: [],
                        createdAt: p.createdAt,
                      });
                    }}
                    className="group flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                      {p.mediaUrl ? <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" /> : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground"><FileText className="h-5 w-5" /></div>
                      )}
                      <span className={cn("absolute bottom-0.5 left-0.5 rounded px-1 text-[9px] font-bold uppercase", status.bg, status.color)}>
                        {p.status.slice(0, 4)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <NameAvatar name={p.authorName} color={p.authorColor ?? "blue"} className="h-4 w-4 text-[7px]" />
                        <span>{p.authorName}</span>
                        <span>·</span>
                        <span>{timeAgo(p.createdAt)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        {p.platforms.slice(0, 4).map((pl, i) => <PlatformBadge key={i} platform={pl} size={14} />)}
                        {p.platforms.length > 4 && <span className="text-[9px] text-muted-foreground">+{p.platforms.length - 4}</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                      <PenLine className="h-3 w-3" /> Edit <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No posts yet</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Create your first post with the AI composer</p>
                </div>
                <button onClick={() => setView("composer")} className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20">
                  Open composer
                </button>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.86s" }}>
          <SectionTitle
            title="Upcoming"
            desc="Scheduled posts"
            action={
              <button onClick={() => setView("calendar")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Calendar <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="scroll-liquid max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {data.upcoming.length > 0 ? (
              data.upcoming.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-muted/50">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-center text-blue-500">
                    <div>
                      <div className="text-sm font-bold leading-none">{p.scheduledAt ? new Date(p.scheduledAt).getDate() : "—"}</div>
                      <div className="text-[9px] uppercase">{p.scheduledAt ? new Date(p.scheduledAt).toLocaleString(undefined, { month: "short" }) : ""}</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {p.scheduledAt && new Date(p.scheduledAt).toLocaleString(undefined, { hour: "numeric", minute: "2-digit" })}
                      <span>·</span>
                      <NameAvatar name={p.authorName} color={p.authorColor ?? "blue"} className="h-3 w-3 text-[6px]" />
                      <span>{p.authorName}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      {p.platforms.slice(0, 3).map((pl, j) => <PlatformBadge key={j} platform={pl} size={12} />)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No scheduled posts</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Draft and schedule your first post</p>
                </div>
                <button onClick={() => setView("composer")} className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20">
                  Open composer
                </button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* === TEAM ACTIVITY FEED === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.94s" }}>
        <SectionTitle
          title="Team activity"
          desc="Recent actions across your workspace"
          action={
            <button onClick={() => setView("team-performance")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              All activity <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        />
        <div className="scroll-liquid max-h-[320px] space-y-1 overflow-y-auto pr-1">
          {data.activities.length > 0 ? (
            data.activities.map((a) => {
              const Icon = ACTIVITY_ICON[a.type] ?? CheckCircle2;
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
            })
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">No recent activity</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Actions across your workspace will appear here</p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ Pages Ranking Table — interactive sortable ============
function PagesRankingTable({
  ranking,
  sortKey,
  onSort,
}: {
  ranking: DashboardData["pagesRanking"];
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
}) {
  const columns: { key: SortKey; label: string; fmt: (v: number) => string }[] = [
    { key: "followers", label: "Followers", fmt: (v) => fmt(v) },
    { key: "reach", label: "Reach", fmt: (v) => fmt(v) },
    { key: "engagement", label: "Engagement", fmt: (v) => fmt(v) },
    { key: "postsCount", label: "Posts", fmt: (v) => v.toString() },
    { key: "engagementRate", label: "Eng. Rate", fmt: (v) => `${v}%` },
  ];

  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">No accounts connected</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Connect a social account to see ranking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scroll-liquid">
      <div className="min-w-[680px]">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_repeat(5,80px)_60px] items-center gap-2 border-b border-border/40 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          <span>Account</span>
          {columns.map((col) => (
            <button
              key={col.key}
              onClick={() => onSort(col.key)}
              className={cn(
                "flex items-center justify-end gap-0.5 transition hover:text-foreground",
                sortKey === col.key && "text-primary"
              )}
            >
              {col.label}
              {sortKey === col.key && <ChevronUp className="h-2.5 w-2.5" />}
            </button>
          ))}
          <span className="text-right">Health</span>
        </div>

        {/* Rows */}
        <div className="space-y-1">
          {ranking.map((acc, i) => {
            const healthColor =
              acc.healthStatus === "healthy" ? "bg-emerald-500" :
              acc.healthStatus === "warning" ? "bg-amber-500" :
              acc.healthStatus === "restricted" ? "bg-orange-500" :
              "bg-rose-500";
            return (
              <div
                key={acc.id}
                className="group grid grid-cols-[1fr_repeat(5,80px)_60px] items-center gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 transition hover:border-primary/40 hover:bg-muted/40"
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                {/* Account info */}
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                    i === 0 ? "bg-amber-500/15 text-amber-500" :
                    i === 1 ? "bg-slate-400/15 text-slate-400" :
                    i === 2 ? "bg-orange-500/15 text-orange-500" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <PlatformBadge platform={acc.platform} size={20} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-xs font-bold">{acc.displayName}</span>
                      {acc.verified && <VerifiedTick />}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">{acc.handle}</div>
                  </div>
                  {/* Mini sparkline */}
                  <div className="hidden h-6 w-16 shrink-0 sm:block">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={acc.sparkline.map((v, i) => ({ i, v }))} margin={{ left: 0, right: 0, top: 2, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`spark-${acc.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PLATFORMS[acc.platform]?.color ?? "var(--primary)"} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={PLATFORMS[acc.platform]?.color ?? "var(--primary)"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke={PLATFORMS[acc.platform]?.color ?? "var(--primary)"} strokeWidth={1.5} fill={`url(#spark-${acc.id})`} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Metric values */}
                {columns.map((col) => (
                  <div key={col.key} className="text-right">
                    <div className="num-display text-xs font-bold">{col.fmt(acc[col.key] as number)}</div>
                    {col.key === "followers" && acc.growth7d !== 0 && (
                      <div className={cn("text-[9px] font-semibold", acc.growth7d >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {acc.growth7d >= 0 ? "+" : ""}{acc.growth7d}%
                      </div>
                    )}
                  </div>
                ))}

                {/* Health indicator */}
                <div className="flex items-center justify-end gap-1">
                  <span className={cn("h-2 w-2 rounded-full", healthColor)} />
                  <span className="hidden text-[9px] text-muted-foreground lg:inline">{acc.healthStatus}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ Goal Ring — animated circular progress ============
function GoalRing({
  label, current, target, progress, icon: Icon, color, delay,
}: {
  label: string; current: number; target: number; progress: number;
  icon: LucideIcon; color: string; delay: number;
}) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <div
      className="crystal-in glass flex flex-col items-center rounded-2xl border border-border/40 p-3 transition hover:lift-hover"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="relative h-16 w-16">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--muted)" strokeWidth="5" opacity={0.3} />
          <circle
            cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div className="mt-2 text-center">
        <div className="num-display text-sm font-bold">{current}<span className="text-[10px] text-muted-foreground">/{target}</span></div>
        <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-[9px] font-bold" style={{ color }}>{progress}%</div>
      </div>
    </div>
  );
}

// ============ Pipeline Flow ============
function PipelineFlow({ pipeline, total }: {
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-1.5">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = pipeline[stage.key as keyof typeof pipeline];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <React.Fragment key={stage.key}>
              <button
                className="group relative flex-1 overflow-hidden rounded-2xl border border-border/40 bg-muted/20 p-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 transition-all duration-700 ease-out"
                  style={{
                    height: `${Math.max(pct, 4)}%`,
                    background: `linear-gradient(180deg, ${stage.color}30 0%, ${stage.color}08 100%)`,
                  }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between gap-1">
                    <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${stage.color}14`, color: stage.color }}>
                      <stage.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: `${stage.color}14`, color: stage.color }}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="mt-2 num-display text-xl font-bold">{count}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{stage.label}</div>
                </div>
              </button>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="flex items-center">
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> Total content
        </div>
        <span className="num-display font-bold">{total} posts</span>
      </div>
    </div>
  );
}

// ============ Skeleton ============
function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-32 rounded-3xl" />)}
      </div>
      <div className="shimmer h-64 rounded-3xl" />
      <div className="shimmer h-72 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shimmer h-[320px] rounded-3xl lg:col-span-2" />
        <div className="shimmer h-[320px] rounded-3xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shimmer h-[320px] rounded-3xl lg:col-span-2" />
        <div className="shimmer h-[320px] rounded-3xl" />
      </div>
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
