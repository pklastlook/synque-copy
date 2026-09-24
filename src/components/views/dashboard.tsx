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
  AtSign,
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
        Your <strong className="text-foreground">Dashboard</strong> — the command center. Quick stats, trends, and your latest content at a glance.
      </HelpText>

      {/* === 1. HERO — greeting + key stats + compose === */}
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
                {k.postsCreated.value} posts · {k.published.value} published ·{" "}
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

      {/* === 2. TODAY'S SOCIAL ACTIVITY — what's being posted on social right now === */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TodayActivityCard
          label="Posted to Social"
          icon={<Send className="h-5 w-5" />}
          color="oklch(0.74 0.18 165)"
          current={k.today.published}
          target={k.today.targets.published}
          hint={`${k.today.activeMembers} member${k.today.activeMembers !== 1 ? "s" : ""} publishing`}
          delay={50}
        />
        <TodayActivityCard
          label="Active Pages"
          icon={<AtSign className="h-5 w-5" />}
          color="oklch(0.62 0.22 255)"
          current={k.today.activeAccounts}
          target={k.today.targets.activeAccounts}
          hint={`of ${k.accounts} connected profiles`}
          delay={120}
        />
        <TodayActivityCard
          label="Comments Received"
          icon={<MessageCircle className="h-5 w-5" />}
          color="oklch(0.7 0.2 25)"
          current={k.today.comments}
          target={k.today.targets.comments}
          hint={`${k.pendingInbox} unread to reply`}
          delay={190}
        />
        <TodayActivityCard
          label="Platforms Active"
          icon={<Globe className="h-5 w-5" />}
          color="oklch(0.66 0.22 305)"
          current={Object.keys(k.today.platformBreakdown).length}
          target={7}
          hint={
            Object.keys(k.today.platformBreakdown).length > 0
              ? Object.entries(k.today.platformBreakdown).map(([p, n]) => `${p}: ${n}`).join(" · ")
              : "No posts today yet"
          }
          delay={260}
        />
      </div>

      {/* === 3. AI INSIGHTS — only show if there are alerts (max 2) === */}
      {data.insights.length > 0 && data.insights.some(i => i.type === "warning" || i.type === "info") && (
        <div className="grid gap-3 sm:grid-cols-2" style={{ animationDelay: "0.28s" }}>
          {data.insights.filter(i => i.type === "warning" || i.type === "info").slice(0, 2).map((insight, i) => {
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

      {/* === 4. PERFORMANCE TREND + GOALS (side by side) === */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Trend chart — main visual */}
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.34s" }}>
          <SectionTitle
            title="Performance trend"
            desc="14-day trend — click a metric to switch"
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
          <div className="h-[260px] w-full">
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

        {/* Weekly goals — compact rings */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.40s" }}>
          <SectionTitle
            title="Weekly goals"
            desc="This week's targets"
            action={<Target className="h-4 w-4 text-primary" />}
          />
          <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* === 5. CONTENT PIPELINE === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.42s" }}>
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

      {/* === 6. RECENT POSTS — actionable (click to republish) === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.48s" }}>
        <SectionTitle
          title="Recent posts"
          desc="Latest content — click to edit & republish"
          action={
            <button onClick={() => setView("composer")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Composer <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        />
        <div className="scroll-liquid max-h-[360px] space-y-2 overflow-y-auto pr-1">
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

      {/* === 7. TEAM ACTIVITY — condensed feed === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.54s" }}>
        <SectionTitle
          title="Team activity"
          desc="Recent actions across your workspace"
          action={
            <button onClick={() => setView("team-performance")} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              All activity <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        />
        <div className="scroll-liquid max-h-[280px] space-y-1 overflow-y-auto pr-1">
          {data.activities.length > 0 ? (
            data.activities.slice(0, 8).map((a) => {
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

// ============ Today's Activity Card — big number + progress bar ============
function TodayActivityCard({
  label, icon, color, current, target, hint, delay,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  current: number;
  target: number;
  hint: string;
  delay: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const achieved = current >= target && target > 0;

  return (
    <div
      className="crystal-in glass group relative overflow-hidden rounded-2xl p-5 transition hover:lift-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top row: icon tile + achievement badge */}
      <div className="relative flex items-center justify-between gap-2">
        <div
          className="grid h-9 w-9 place-items-center rounded-lg"
          style={{ background: `${color}14` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        {achieved ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-500">
            <CheckCircle2 className="h-2.5 w-2.5" /> Done
          </span>
        ) : pct > 0 ? (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{ background: `${color}14`, color }}
          >
            {pct}%
          </span>
        ) : null}
      </div>

      {/* Big number */}
      <div className="mt-3 flex items-end gap-2">
        <span className="num-display text-[40px] font-bold leading-none">{current}</span>
        <span className="mb-1 text-[10px] text-muted-foreground">/ {target}</span>
      </div>

      {/* Label */}
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>

      {/* Hint */}
      <div className="mt-0.5 text-[10px] text-muted-foreground/80">{hint}</div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.max(pct, 2)}%`,
            background: achieved ? "oklch(0.74 0.18 165)" : color,
          }}
        />
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
