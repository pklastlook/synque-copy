"use client";

import * as React from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Users, TrendingUp, FileText, Send, Clock, Reply,
  Sparkles, CheckCircle2, UserPlus, Wand2, ArrowUpRight, ChevronRight,
  FileEdit, XCircle, Layers, Inbox, Activity, Globe,
  Lightbulb, AlertCircle, AtSign, Check,
  BarChart3, Calendar, Zap,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import type { ViewId } from "@/lib/types";
import {
  Sparkline, MetricRow, BentoGrid, BentoTile, SectionHeader,
  HeroChart, ListRow, DeltaBadge, Pill, NavCard,
  type Metric,
} from "@/components/glass/dense-ui";

// ============ Types ============

interface DashboardData {
  isManagerView?: boolean;
  userRole?: string;
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
    today: {
      published: number;
      comments: number;
      activeAccounts: number;
      activeMembers: number;
      platformBreakdown: Record<string, number>;
      targets: { published: number; comments: number; activeAccounts: number };
    };
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
  failedPosts: {
    id: string; title: string; caption: string; mediaUrl: string | null;
    tone: string; authorName: string; authorColor: string | null;
    createdAt: string;
    platforms: PlatformId[]; variantCount: number;
  }[];
  publishedPosts: {
    id: string; title: string; caption: string; mediaUrl: string | null;
    tone: string; authorName: string; authorColor: string | null;
    createdAt: string; publishedAt: string | null;
    platforms: PlatformId[]; variantCount: number;
    engagement: number; reach: number;
  }[];
  taskSummary: {
    total: number; done: number; inProgress: number; blocked: number;
    overdue: number; myTasks: number; myDone: number;
    recent: {
      id: string; title: string; status: string; priority: string;
      dueAt: string | null;
    }[];
  };
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

const INSIGHT_META: Record<string, { icon: LucideIcon; color: string; bg: string; border: string }> = {
  warning: { icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  info: { icon: Lightbulb, color: "text-blue-500", bg: "bg-blue-500/15", border: "border-blue-500/30" },
  success: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  tip: { icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/15", border: "border-purple-500/30" },
};

const QUICK_ACTIONS: { label: string; icon: LucideIcon; view: ViewId; accent: string }[] = [
  { label: "Compose", icon: Wand2, view: "composer", accent: "var(--primary)" },
  { label: "Inbox", icon: Inbox, view: "inbox", accent: "oklch(0.7 0.18 75)" },
  { label: "Calendar", icon: Calendar, view: "calendar", accent: "oklch(0.62 0.22 255)" },
  { label: "Analytics", icon: BarChart3, view: "analytics", accent: "oklch(0.74 0.18 165)" },
  { label: "Performance", icon: Activity, view: "team-performance", accent: "oklch(0.66 0.22 305)" },
  { label: "Reports", icon: Layers, view: "reports", accent: "oklch(0.7 0.2 330)" },
];

// ============ Main view ============

export function DashboardView() {
  const { data, loading } = useApi<DashboardData>("/api/dashboard");
  const { setView, openComposerWithPost } = useNav();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  const [chartMetric, setChartMetric] = React.useState<
    "followers" | "reach" | "postsCreated" | "comments"
  >("followers");

  if (loading || !data) return <DashboardSkeleton />;

  const k = data.kpis;
  const pendingInbox = k.pendingInbox;
  const failedCount = k.failed;
  const isManager = data.isManagerView !== false;

  // Build sparkline series from data.series (preserve all data logic).
  const followerSpark = data.series.map((s) => s.followers);
  const reachSpark = data.series.map((s) => s.reach);
  const postsSpark = data.series.map((s) => s.postsCreated);
  const publishedSpark = data.series.map((s) => s.published);
  const commentsSpark = data.series.map((s) => s.comments);
  const engagementSpark = data.series.map((s) => s.impressions);

  // Dense MetricRow — replaces the 4-card KPI strip + Today activity cards.
  const metrics: Metric[] = [
    { label: "Followers", value: k.totalFollowers.display, delta: k.totalFollowers.delta, spark: followerSpark, color: "oklch(0.55 0.2 255)" },
    { label: "Reach", value: k.totalReach.display, delta: k.totalReach.delta, spark: reachSpark, color: "oklch(0.62 0.22 300)" },
    { label: "Posts", value: k.postsCreated.display, delta: k.postsCreated.delta, spark: postsSpark, color: "oklch(0.74 0.18 165)" },
    { label: "Published", value: k.published.display, delta: k.published.delta, spark: publishedSpark, color: "oklch(0.74 0.18 165)" },
    { label: "Comments", value: k.comments.display, delta: k.comments.delta, spark: commentsSpark, color: "oklch(0.7 0.2 25)" },
    { label: "Reply rate", value: k.replyRate.display, delta: k.replyRate.delta, spark: commentsSpark, color: "oklch(0.66 0.22 305)" },
  ];

  // Inline secondary KPIs for hero tile (varied sources — preserve all data).
  const heroSecondary: { label: string; value: string; delta?: number; spark: number[]; color: string }[] = [
    { label: "Reach", value: k.totalReach.display, delta: k.totalReach.delta, spark: reachSpark, color: "oklch(0.62 0.22 300)" },
    { label: "Engagement", value: fmt(k.totalEngagement), spark: engagementSpark, color: "oklch(0.7 0.2 25)" },
    { label: "Posts", value: k.postsCreated.display, delta: k.postsCreated.delta, spark: postsSpark, color: "oklch(0.74 0.18 165)" },
  ];

  // Insights (max 2 visible — preserve action navigation).
  const visibleInsights = data.insights
    .filter((i) => i.type === "warning" || i.type === "info")
    .slice(0, 2);

  // Chart metric config — preserves the chartMetric state toggle.
  const CHART_METRICS = [
    { key: "followers", label: "Followers", color: "oklch(0.55 0.2 255)" },
    { key: "reach", label: "Reach", color: "oklch(0.62 0.22 300)" },
    { key: "postsCreated", label: "Posts", color: "oklch(0.74 0.18 165)" },
    { key: "comments", label: "Comments", color: "oklch(0.7 0.2 25)" },
  ] as const;

  return (
    <div className="space-y-4">
      <HelpText module="dashboard">
        {isManager
          ? <>Your <strong className="text-foreground">Manager Dashboard</strong> — overall team activity, publishing, and engagement across all accounts.</>
          : <>Your <strong className="text-foreground">Dashboard</strong> — your accounts, your posts, and your activity.</>
        }
      </HelpText>

      {/* === 1. Hero header strip — compact (no GlassCard wrapper) === */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="relative grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Globe className="h-5 w-5" />
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" style={{ animationDuration: "2.5s" }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h2 className="mt-0.5 text-[22px] font-bold leading-tight tracking-tight sm:text-[26px]">
              Good day, <span className="retaina-text">{firstName}</span>
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {isManager
                ? <>{k.postsCreated.value} posts · {k.published.value} published ·{" "}<span className={cn(pendingInbox > 0 && "font-semibold text-amber-500")}>{pendingInbox} unread</span></>
                : <>{k.accounts} {k.accounts === 1 ? "account" : "accounts"} · {k.published.value} published ·{" "}<span className={cn(pendingInbox > 0 && "font-semibold text-amber-500")}>{pendingInbox} unread</span>{failedCount > 0 && <span className="font-semibold text-rose-500"> · {failedCount} failed</span>}</>
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingInbox > 0 && (
            <button
              onClick={() => setView("inbox")}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-[12px] font-semibold text-amber-600 transition hover:bg-amber-500/20 dark:text-amber-400"
            >
              <Inbox className="h-4 w-4" />
              {pendingInbox} unread
            </button>
          )}
          <button
            onClick={() => setView("composer")}
            className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold"
          >
            <Wand2 className="h-4 w-4" />
            Compose with AI
          </button>
        </div>
      </div>

      {/* === 2. MetricRow — dense KPI strip (was 4-card KPI strip ~480px → now ~56px) === */}
      <MetricRow metrics={metrics} />

      {/* === 3. AI Insights — compact conditional alerts (NOT bento tiles) === */}
      {visibleInsights.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleInsights.map((insight, i) => {
            const meta = INSIGHT_META[insight.type];
            const InsightIcon = meta.icon;
            return (
              <button
                key={i}
                onClick={insight.actionView ? () => setView(insight.actionView as ViewId) : undefined}
                className={cn(
                  "glass flex items-center gap-3 rounded-xl border p-3 text-left transition hover:lift-hover",
                  meta.border
                )}
              >
                <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", meta.bg, meta.color)}>
                  <InsightIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-bold">{insight.title}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{insight.desc}</div>
                </div>
                {insight.action && (
                  <div className={cn("flex items-center gap-0.5 text-[11px] font-semibold", meta.color)}>
                    {insight.action} <ChevronRight className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* === 4. BentoGrid — 5 intentional tiles === */}
      <BentoGrid className="auto-rows-[minmax(150px,auto)]">

        {/* ── Tile 1: HERO METRIC (2×2) — the visual anchor ── */}
        <BentoTile span="2x2" className="flex flex-col gap-3 overflow-hidden">
          <SectionHeader
            title="Total followers"
            icon={Users}
            action={
              <button
                onClick={() => setView("analytics")}
                className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
              >
                Analytics <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />

          {/* Big number + delta */}
          <div className="flex items-end gap-3">
            <div className="num-display text-[44px] font-bold leading-none tracking-tight sm:text-[52px]">
              {k.totalFollowers.display}
            </div>
            <div className="mb-1.5 flex flex-col gap-1">
              <DeltaBadge delta={k.totalFollowers.delta} />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            across <span className="font-semibold text-foreground">{k.accounts}</span> connected {k.accounts === 1 ? "account" : "accounts"} ·{" "}
            {k.today.activeMembers} member{k.today.activeMembers !== 1 ? "s" : ""} active today
          </div>

          {/* Large sparkline — visual anchor for the trend */}
          <div className="relative flex-1 min-h-[60px]">
            <Sparkline
              data={followerSpark}
              color="var(--primary)"
              width={460}
              height={80}
              strokeWidth={2}
            />
          </div>

          {/* Inline secondary KPIs row — dense mini-stats with sparklines */}
          <div className="grid grid-cols-3 gap-2 border-t border-border/40 pt-3">
            {heroSecondary.map((s) => (
              <div key={s.label} className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="num-display text-sm font-bold leading-none tabular-nums">{s.value}</span>
                  {s.delta !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] font-semibold tabular-nums",
                        s.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {s.delta >= 0 ? "+" : ""}{s.delta}%
                    </span>
                  )}
                </div>
                <div className="label-caps mt-1 truncate text-[10px] text-muted-foreground">{s.label}</div>
                <div className="mt-1">
                  <Sparkline data={s.spark} color={s.color} width={120} height={18} />
                </div>
              </div>
            ))}
          </div>
        </BentoTile>

        {/* ── Tile 2: ACTIVITY FEED (1×2) — recent team activity as dense rows ── */}
        <BentoTile span="1x2" className="flex flex-col overflow-hidden p-0">
          <div className="px-4 pt-4">
            <SectionHeader
              title="Team activity"
              icon={Activity}
              action={
                <button
                  onClick={() => setView("team-performance")}
                  className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
                >
                  All <ArrowUpRight className="h-3 w-3" />
                </button>
              }
            />
          </div>
          <div className="scroll-liquid flex-1 overflow-y-auto">
            {data.activities.length > 0 ? (
              data.activities.slice(0, 8).map((a) => {
                const Icon = ACTIVITY_ICON[a.type] ?? CheckCircle2;
                return (
                  <ListRow key={a.id} onClick={() => setView("team-performance")}>
                    <NameAvatar name={a.userName} color={a.userColor ?? "blue"} src={a.userAvatar} className="h-7 w-7 text-[9px]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] leading-tight">
                        <span className="font-semibold">{a.userName}</span>{" "}
                        <span className="text-muted-foreground">{a.description.replace(a.userName + " ", "")}</span>
                      </div>
                    </div>
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="hidden w-12 shrink-0 text-right text-[10px] text-muted-foreground sm:block">
                      {timeAgo(a.createdAt)}
                    </span>
                  </ListRow>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="text-[12px] font-semibold">No recent activity</div>
                <div className="text-[11px] text-muted-foreground">Workspace activity will appear here</div>
              </div>
            )}
          </div>
        </BentoTile>

        {/* ── Tile 3: QUICK STATS (1×1) — accounts, posts, inbox pills ── */}
        <BentoTile span="1x1">
          <SectionHeader title="Quick stats" icon={Layers} />
          <div className="space-y-2">
            <button
              onClick={() => setView("accounts")}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted/40"
            >
              <AtSign className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">Accounts</span>
              <Pill color="blue">{k.accounts}</Pill>
            </button>
            <button
              onClick={() => setView("calendar")}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted/40"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0 text-purple-500" />
              <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">Scheduled</span>
              <Pill color="violet">{k.scheduled}</Pill>
            </button>
            <button
              onClick={() => setView("composer")}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted/40"
            >
              <FileEdit className="h-3.5 w-3.5 shrink-0 text-purple-500" />
              <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">Drafts</span>
              <Pill color="violet">{k.drafts}</Pill>
            </button>
            <button
              onClick={() => setView("inbox")}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted/40"
            >
              <Inbox className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">Unread</span>
              <Pill color={pendingInbox > 0 ? "amber" : "neutral"}>{pendingInbox}</Pill>
            </button>
            {failedCount > 0 && (
              <button
                onClick={() => setView("composer")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-muted/40"
              >
                <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span className="flex-1 truncate text-[11px] font-medium text-muted-foreground">Failed</span>
                <Pill color="rose">{failedCount}</Pill>
              </button>
            )}
          </div>
        </BentoTile>

        {/* ── Tile 4: TEAM PULSE (1×1) — who's active + weekly goals mini-bars ── */}
        <BentoTile span="1x1">
          <SectionHeader title="Team pulse" icon={Users} />
          {/* Active members + top contributors avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {data.topContributors.slice(0, 4).map((c, i) => (
                <NameAvatar
                  key={i}
                  name={c.name}
                  color={c.color ?? "blue"}
                  src={c.avatar}
                  className="h-7 w-7 text-[9px] ring-2 ring-background"
                />
              ))}
              {data.topContributors.length === 0 && (
                <div className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground ring-2 ring-background">
                  <Users className="h-3 w-3" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="num-display text-lg font-bold leading-none">{k.today.activeMembers}</div>
              <div className="label-caps mt-0.5 text-[9px] text-muted-foreground">active now</div>
            </div>
          </div>

          {/* Weekly goals as mini progress bars */}
          <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
            {([
              { key: "weeklyPosts", icon: FileText, color: "oklch(0.62 0.22 255)" },
              { key: "publishing", icon: Send, color: "oklch(0.74 0.18 165)" },
              { key: "replyRate", icon: Reply, color: "oklch(0.66 0.22 305)" },
              { key: "engagement", icon: TrendingUp, color: "oklch(0.7 0.2 25)" },
            ] as const).map((g) => {
              const goal = data.goals[g.key];
              const pct = Math.max(0, Math.min(100, goal.progress));
              return (
                <div key={g.key} className="flex items-center gap-2">
                  <g.icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="mb-0.5 flex items-baseline justify-between gap-1">
                      <span className="truncate text-[9px] font-medium text-muted-foreground">{goal.label}</span>
                      <span className="num-display text-[9px] font-bold tabular-nums">{goal.current}/{goal.target}</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, background: g.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </BentoTile>

        {/* ── Tile 5: CHART (3×1, full-bleed on lg) — the one trend chart ── */}
        <BentoTile span="3x1" className="overflow-hidden p-0 lg:col-span-4">
          <HeroChart
            title="Performance trend"
            action={
              <div className="flex flex-wrap items-center gap-1">
                {CHART_METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setChartMetric(m.key)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold transition",
                      chartMetric === m.key ? "text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    )}
                    style={chartMetric === m.key ? { background: m.color } : {}}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-[220px] w-full">
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
          </HeroChart>
        </BentoTile>
      </BentoGrid>

      {/* === 5. Recent posts + Shared/Failed — compact secondary section === */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Recent posts — click to edit (preserves openComposerWithPost) */}
        <GlassCard className="p-4">
          <SectionHeader
            title="Recent posts"
            desc="Click to edit & republish"
            action={
              <button onClick={() => setView("composer")} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                Composer <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="scroll-liquid max-h-[280px] space-y-1 overflow-y-auto pr-1">
            {data.recentPosts.length > 0 ? (
              data.recentPosts.slice(0, 6).map((p) => {
                const status = STATUS_META[p.status] ?? STATUS_META.draft;
                return (
                  <button
                    key={p.id}
                    onClick={() =>
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
                      })
                    }
                    className="group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-2 text-left transition hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.mediaUrl ? (
                        <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <FileText className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold">{p.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <NameAvatar name={p.authorName} color={p.authorColor ?? "blue"} className="h-3.5 w-3.5 text-[6px]" />
                        <span className="truncate">{p.authorName}</span>
                        <span>·</span>
                        <span>{timeAgo(p.createdAt)}</span>
                      </div>
                      {p.platforms.length > 0 && (
                        <div className="mt-1 flex items-center gap-0.5">
                          {p.platforms.slice(0, 4).map((pl, i) => (
                            <PlatformBadge key={i} platform={pl} size={12} />
                          ))}
                          {p.platforms.length > 4 && (
                            <span className="ml-1 text-[9px] text-muted-foreground">+{p.platforms.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", status.bg, status.color)}>
                      {status.label}
                    </span>
                    <div className="hidden shrink-0 items-center gap-0.5 text-[10px] font-semibold text-primary opacity-0 transition group-hover:opacity-100 sm:flex">
                      Edit <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="text-[12px] font-semibold">No posts yet</div>
                <button
                  onClick={() => setView("composer")}
                  className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                >
                  Open composer
                </button>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Shared content (manager) OR Failed posts (user) */}
        {isManager ? (
          <GlassCard className="p-4">
            <SectionHeader
              title="Shared content"
              desc={data.publishedPosts.length > 0 ? `${data.publishedPosts.length} post${data.publishedPosts.length > 1 ? "s" : ""} live on social` : "No posts published yet"}
              action={
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-500">
                  <Send className="h-2.5 w-2.5" /> {data.publishedPosts.length}
                </div>
              }
            />
            <div className="scroll-liquid max-h-[280px] space-y-1 overflow-y-auto pr-1">
              {data.publishedPosts.length > 0 ? (
                data.publishedPosts.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      openComposerWithPost({
                        id: p.id,
                        title: p.title,
                        caption: p.caption,
                        mediaUrl: p.mediaUrl,
                        mediaType: "image",
                        tone: p.tone,
                        status: "published",
                        scheduledAt: null,
                        authorId: "",
                        authorName: p.authorName,
                        variants: [],
                        createdAt: p.createdAt,
                      })
                    }
                    className="group flex w-full items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 text-left transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.mediaUrl ? (
                        <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-emerald-500">
                          <Send className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold">{p.title || "Untitled post"}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <NameAvatar name={p.authorName} color={p.authorColor ?? "blue"} className="h-3.5 w-3.5 text-[6px]" />
                        <span className="truncate">{p.authorName}</span>
                        <span>·</span>
                        <span>{p.publishedAt ? timeAgo(p.publishedAt) : timeAgo(p.createdAt)}</span>
                      </div>
                      {p.platforms.length > 0 && (
                        <div className="mt-1 flex items-center gap-0.5">
                          {p.platforms.slice(0, 4).map((pl, i) => (
                            <PlatformBadge key={i} platform={pl} size={12} />
                          ))}
                          {p.platforms.length > 4 && (
                            <span className="ml-1 text-[9px] text-muted-foreground">+{p.platforms.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {p.engagement > 0 && (
                      <div className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-primary">
                        <TrendingUp className="h-3 w-3" /> {fmt(p.engagement)}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <Send className="h-4 w-4" />
                  </div>
                  <div className="text-[12px] font-semibold">Nothing published yet</div>
                  <button
                    onClick={() => setView("composer")}
                    className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                  >
                    Open composer
                  </button>
                </div>
              )}
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-4">
            <SectionHeader
              title="Failed posts"
              desc={data.failedPosts.length > 0 ? `${data.failedPosts.length} need republishing` : "All publishes succeeded"}
              action={
                <div className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-500">
                  <XCircle className="h-2.5 w-2.5" /> {data.failedPosts.length}
                </div>
              }
            />
            <div className="scroll-liquid max-h-[280px] space-y-1 overflow-y-auto pr-1">
              {data.failedPosts.length > 0 ? (
                data.failedPosts.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      openComposerWithPost({
                        id: p.id,
                        title: p.title,
                        caption: p.caption,
                        mediaUrl: p.mediaUrl,
                        mediaType: "image",
                        tone: p.tone,
                        status: "failed",
                        scheduledAt: null,
                        authorId: "",
                        authorName: p.authorName,
                        variants: [],
                        createdAt: p.createdAt,
                      })
                    }
                    className="group flex w-full items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-2 text-left transition hover:border-rose-500/40 hover:bg-rose-500/10"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {p.mediaUrl ? (
                        <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-rose-500">
                          <XCircle className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold">{p.title || "Untitled post"}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <NameAvatar name={p.authorName} color={p.authorColor ?? "blue"} className="h-3.5 w-3.5 text-[6px]" />
                        <span className="truncate">{p.authorName}</span>
                        <span>·</span>
                        <span>{timeAgo(p.createdAt)}</span>
                      </div>
                      {p.platforms.length > 0 && (
                        <div className="mt-1 flex items-center gap-0.5">
                          {p.platforms.slice(0, 4).map((pl, i) => (
                            <PlatformBadge key={i} platform={pl} size={12} />
                          ))}
                          {p.platforms.length > 4 && (
                            <span className="ml-1 text-[9px] text-muted-foreground">+{p.platforms.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="hidden shrink-0 items-center gap-0.5 text-[10px] font-semibold text-rose-500 opacity-0 transition group-hover:opacity-100 sm:flex">
                      Retry <ChevronRight className="h-3 w-3" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="text-[12px] font-semibold">No failed posts</div>
                  <div className="text-[11px] text-muted-foreground">All your publishes succeeded</div>
                </div>
              )}
            </div>
          </GlassCard>
        )}
      </div>

      {/* === 6. Tasks + Pipeline — compact horizontal section === */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Task summary — compact dense list */}
        <GlassCard className="p-4">
          <SectionHeader
            title="Tasks"
            desc={data.taskSummary.total > 0 ? `${data.taskSummary.done}/${data.taskSummary.total} done · ${data.taskSummary.overdue} overdue` : "No tasks yet"}
            action={
              <button onClick={() => setView("tasks")} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                All tasks <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          {/* Dense stat row */}
          <div className="mb-2 flex items-stretch gap-1.5">
            {[
              { label: "Total", value: data.taskSummary.total, color: "oklch(0.62 0.2 255)" },
              { label: "Done", value: data.taskSummary.done, color: "oklch(0.7 0.2 145)" },
              { label: "Active", value: data.taskSummary.inProgress, color: "oklch(0.7 0.15 75)" },
              { label: "Overdue", value: data.taskSummary.overdue, color: "oklch(0.55 0.22 25)" },
            ].map((s) => (
              <div key={s.label} className="flex-1 rounded-lg border border-border/30 bg-muted/10 p-2 text-center">
                <div className="num-display text-base font-bold" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="label-caps mt-0.5 text-[9px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          {/* Recent task list rows */}
          {data.taskSummary.recent.length > 0 && (
            <div className="space-y-1">
              {data.taskSummary.recent.slice(0, 4).map((t) => {
                const isOverdue = t.dueAt && new Date(t.dueAt) < new Date() && t.status !== "done";
                return (
                  <button
                    key={t.id}
                    onClick={() => setView("tasks")}
                    className="flex w-full items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-2 py-1.5 text-left transition hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[8px] font-bold text-white",
                        t.status === "done"
                          ? "bg-emerald-500"
                          : t.status === "blocked"
                          ? "bg-rose-500"
                          : t.status === "in_progress"
                          ? "bg-amber-500"
                          : "bg-muted-foreground"
                      )}
                    >
                      {t.status === "done" ? (
                        <Check className="h-2.5 w-2.5" />
                      ) : t.status === "blocked" ? (
                        <AlertCircle className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-[11px] font-medium", t.status === "done" && "line-through opacity-60")}>
                      {t.title}
                    </span>
                    {isOverdue && (
                      <Pill color="rose">Overdue</Pill>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Pipeline — compact */}
        <GlassCard className="p-4">
          <SectionHeader
            title="Content pipeline"
            desc="Every post by lifecycle stage"
            action={
              <button onClick={() => setView("calendar")} className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline">
                Calendar <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <PipelineFlow pipeline={data.pipeline} total={data.pipelineTotal} />
        </GlassCard>
      </div>

      {/* === 7. Quick actions — horizontal NavCard row === */}
      <div>
        <SectionHeader title="Quick actions" icon={Zap} desc="Jump to a workspace" />
        <div className="flex gap-2 overflow-x-auto pb-2">
          {QUICK_ACTIONS.map((action) => {
            const count =
              action.view === "inbox" ? pendingInbox :
              action.view === "composer" ? k.drafts :
              action.view === "calendar" ? k.scheduled :
              undefined;
            return (
              <div key={action.view} className="min-w-[180px] flex-shrink-0">
                <NavCard
                  icon={action.icon}
                  title={action.label}
                  accent={action.accent}
                  count={count}
                  onClick={() => setView(action.view)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ Pipeline Flow — compact horizontal stages ============
function PipelineFlow({ pipeline, total }: {
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  total: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-1.5">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = pipeline[stage.key as keyof typeof pipeline];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <React.Fragment key={stage.key}>
              <div
                className="group relative flex-1 overflow-hidden rounded-xl border border-border/40 bg-muted/20 p-2.5"
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
                    <div
                      className="grid h-6 w-6 place-items-center rounded-md"
                      style={{ background: `${stage.color}14`, color: stage.color }}
                    >
                      <stage.icon className="h-3 w-3" />
                    </div>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: `${stage.color}14`, color: stage.color }}
                    >
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="mt-1.5 num-display text-base font-bold leading-none">{count}</div>
                  <div className="label-caps mt-0.5 text-[9px]">{stage.label}</div>
                </div>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="flex items-center">
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Layers className="h-3 w-3" /> Total content
        </div>
        <span className="num-display font-bold">{total} posts</span>
      </div>
    </div>
  );
}

// ============ Skeleton — matches the new bento layout ============
function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Hero header */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="shimmer h-11 w-11 rounded-full" />
          <div className="space-y-2">
            <div className="shimmer h-3 w-32 rounded" />
            <div className="shimmer h-6 w-48 rounded" />
            <div className="shimmer h-3 w-40 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="shimmer h-9 w-28 rounded-xl" />
          <div className="shimmer h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* MetricRow skeleton */}
      <div className="shimmer h-14 rounded-xl" />

      {/* BentoGrid skeleton — 4 cols × 2 rows */}
      <div className="grid auto-rows-[minmax(150px,auto)] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="shimmer rounded-xl sm:col-span-2 sm:row-span-2" />
        <div className="shimmer rounded-xl sm:col-span-1 sm:row-span-2" />
        <div className="shimmer rounded-xl" />
        <div className="shimmer rounded-xl" />
        {/* Chart tile — full width row */}
        <div className="shimmer h-[260px] rounded-xl sm:col-span-3 lg:col-span-4" />
      </div>

      {/* Secondary sections skeleton */}
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="shimmer h-[200px] rounded-xl" />
        <div className="shimmer h-[200px] rounded-xl" />
      </div>

      {/* Quick actions row skeleton */}
      <div className="space-y-2">
        <div className="shimmer h-4 w-32 rounded" />
        <div className="flex gap-2 overflow-hidden pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-16 min-w-[180px] flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
