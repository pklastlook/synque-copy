"use client";

import * as React from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  FileText, Send, Clock, MessageCircle, Reply, Sparkles, CheckCircle2,
  UserPlus, Wand2, ArrowUpRight, ArrowDownRight, ChevronRight,
  FileEdit, XCircle, Layers, Inbox, TrendingUp, TrendingDown,
  PenLine, Hash, AlertCircle, Activity, type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

// ============ Types ============

interface DashboardData {
  kpis: {
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
  };
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  pipelineTotal: number;
  series: { date: string; postsCreated: number; published: number; comments: number }[];
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
    engagement: number; reach: number; accounts: number;
    platforms: PlatformId[]; publishedAt: string | null;
  }[];
  activities: {
    id: string; userId: string; userName: string; userColor: string | null;
    userAvatar: string | null; type: string; description: string; createdAt: string;
  }[];
}

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  post_published: Send,
  post_scheduled: Clock,
  comment_replied: Reply,
  account_connected: UserPlus,
  ai_generated: Wand2,
  team_joined: CheckCircle2,
  task_completed: CheckCircle2,
};

const PIPELINE_STAGES = [
  { key: "draft", label: "Drafts", icon: FileEdit, color: "oklch(0.66 0.22 305)", desc: "Work in progress" },
  { key: "scheduled", label: "Scheduled", icon: Clock, color: "oklch(0.62 0.22 255)", desc: "Queued for publish" },
  { key: "published", label: "Published", icon: CheckCircle2, color: "oklch(0.74 0.18 165)", desc: "Live on platforms" },
  { key: "failed", label: "Failed", icon: XCircle, color: "oklch(0.65 0.22 25)", desc: "Needs attention" },
] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-purple-500", bg: "bg-purple-500/15" },
  scheduled: { label: "Scheduled", color: "text-blue-500", bg: "bg-blue-500/15" },
  published: { label: "Published", color: "text-emerald-500", bg: "bg-emerald-500/15" },
  failed: { label: "Failed", color: "text-rose-500", bg: "bg-rose-500/15" },
};

const SENTIMENT_META: Record<string, { color: string; bg: string; icon: LucideIcon }> = {
  positive: { color: "text-emerald-500", bg: "bg-emerald-500/15", icon: TrendingUp },
  neutral: { color: "text-muted-foreground", bg: "bg-muted", icon: Hash },
  negative: { color: "text-rose-500", bg: "bg-rose-500/15", icon: TrendingDown },
};

const TOOLTIP_STYLE = {
  background: "var(--popover)", border: "1px solid var(--border)",
  borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
};

// ============ Main view ============

export function DashboardView() {
  const { data, loading } = useApi<DashboardData>("/api/dashboard");
  const { setView, openComposerWithPost } = useNav();
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "there";

  if (loading || !data) return <DashboardSkeleton />;

  const k = data.kpis;
  const pendingInbox = k.pendingInbox;
  const failedCount = k.failed;

  return (
    <div className="space-y-5">
      <HelpText module="dashboard">
        Your <strong className="text-foreground">Dashboard</strong> tracks every piece of content your team creates —
        posts drafted, tweets published, comments received & replied. Click <strong className="text-foreground">Compose with AI</strong> to start.
      </HelpText>

      {/* === HERO GREETING === */}
      <GlassCard strong className="relative overflow-hidden p-6 sm:p-7">
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
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <h2 className="mt-2 text-[28px] font-bold leading-tight tracking-tight sm:text-[32px]">
                Good day, <span className="retaina-text">{firstName}</span>
              </h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                {k.postsCreated.value} posts created · {k.published.value} published ·{" "}
                <span className={cn(pendingInbox > 0 ? "font-semibold text-amber-500" : "")}>{pendingInbox} comments need replies</span>
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

      {/* === KPI GRID — content activity focused === */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Posts Created"
          value={k.postsCreated.value}
          delta={k.postsCreated.delta}
          icon={<FileText className="h-5 w-5" />}
          accent="oklch(0.62 0.22 255)"
          hint={`${k.drafts} drafts · ${k.scheduled} scheduled`}
          delay={50}
          series={data.series.map((s) => s.postsCreated)}
        />
        <KpiCard
          label="Published"
          value={k.published.value}
          delta={k.published.delta}
          icon={<Send className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint={`${k.variantsPublished} platform posts · ${k.failed} failed`}
          delay={120}
          series={data.series.map((s) => s.published)}
        />
        <KpiCard
          label="Comments Received"
          value={k.comments.value}
          delta={k.comments.delta}
          icon={<MessageCircle className="h-5 w-5" />}
          accent="oklch(0.7 0.2 25)"
          hint={`${k.comments.value - k.pendingInbox} replied · ${k.pendingInbox} pending`}
          delay={190}
          series={data.series.map((s) => s.comments)}
        />
        <KpiCard
          label="Reply Rate"
          value={k.replyRate.display}
          delta={k.replyRate.delta}
          icon={<Reply className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint={`team avg ${k.replyRate.display}`}
          delay={260}
        />
      </div>

      {/* === CONTENT PIPELINE WIDGET (NEW) — interactive horizontal flow === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.30s" }}>
        <SectionTitle
          title="Content pipeline"
          desc="Every post your team has touched, by lifecycle stage"
          action={
            <button
              onClick={() => setView("calendar")}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Calendar <ArrowUpRight className="h-3 w-3" />
            </button>
          }
        />
        <PipelineFlow pipeline={data.pipeline} total={data.pipelineTotal} />
      </GlassCard>

      {/* === CONTENT CREATION TREND + COMMENT INBOX === */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Trend chart */}
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.38s" }}>
          <SectionTitle
            title="Content creation trend"
            desc="Posts created, published & comments received (14 days)"
            action={
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Created
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[oklch(0.74_0.18_165)]" /> Published
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[oklch(0.7_0.2_25)]" /> Comments
                </span>
              </div>
            }
          />
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.74 0.18 165)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.74 0.18 165)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCmt" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="postsCreated" name="Posts created" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gCreated)" isAnimationActive animationBegin={200} animationDuration={1200} />
                <Area type="monotone" dataKey="published" name="Published" stroke="oklch(0.74 0.18 165)" strokeWidth={2} fill="url(#gPub)" isAnimationActive animationBegin={350} animationDuration={1200} />
                <Area type="monotone" dataKey="comments" name="Comments" stroke="oklch(0.7 0.2 25)" strokeWidth={2} fill="url(#gCmt)" isAnimationActive animationBegin={500} animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Comment inbox preview */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.46s" }}>
          <SectionTitle
            title="Comment inbox"
            desc="Latest unread comments"
            action={
              <button
                onClick={() => setView("inbox")}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {pendingInbox} unread <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="scroll-liquid max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {data.commentInbox.length > 0 ? (
              data.commentInbox.map((c) => {
                const sentiment = SENTIMENT_META[c.sentiment] ?? SENTIMENT_META.neutral;
                const SentIcon = sentiment.icon;
                return (
                  <div
                    key={c.id}
                    className="group rounded-2xl border border-border/40 bg-muted/20 p-3 transition hover:bg-muted/40"
                  >
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
                        className={cn(
                          "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold opacity-0 transition group-hover:opacity-100",
                          sentiment.bg, sentiment.color
                        )}
                      >
                        <Reply className="h-2.5 w-2.5" />
                        Reply
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

      {/* === RECENT POSTS + TOP CONTRIBUTORS === */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent posts (interactive — click to republish) */}
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.54s" }}>
          <SectionTitle
            title="Recent posts"
            desc="Latest content from your team — click to edit & republish"
            action={
              <button
                onClick={() => setView("composer")}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
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
                      // Open composer with this post for republish/edit
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
                      {p.mediaUrl ? (
                        <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <FileText className="h-5 w-5" />
                        </div>
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
                        {p.platforms.slice(0, 4).map((pl, i) => (
                          <PlatformBadge key={i} platform={pl} size={14} />
                        ))}
                        {p.platforms.length > 4 && (
                          <span className="text-[9px] text-muted-foreground">+{p.platforms.length - 4}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                      <PenLine className="h-3 w-3" />
                      Edit
                      <ChevronRight className="h-3 w-3" />
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
                <button
                  onClick={() => setView("composer")}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                >
                  Open composer
                </button>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Top contributors */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.62s" }}>
          <SectionTitle
            title="Top contributors"
            desc="Most active members (30 days)"
            action={
              <button
                onClick={() => setView("team-performance")}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                All <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="space-y-2">
            {data.topContributors.length > 0 ? (
              data.topContributors.map((m, i) => (
                <div
                  key={m.name + i}
                  className="group flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3 transition hover:bg-muted/40"
                >
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
                      <span className="flex items-center gap-0.5"><FileText className="h-2.5 w-2.5" />{m.posts} created</span>
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

      {/* === TOP PERFORMING + UPCOMING === */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top performing posts */}
        <GlassCard className="crystal-in p-5 lg:col-span-2" style={{ animationDelay: "0.70s" }}>
          <SectionTitle
            title="Top performing posts"
            desc="By total engagement across platforms"
            action={
              <button
                onClick={() => setView("analytics")}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="space-y-2">
            {data.topPosts.length > 0 ? (
              data.topPosts.map((p, i) => (
                <div key={p.id} className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-muted/50">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {p.mediaUrl ? (
                      <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
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
                      {p.platforms.slice(0, 4).map((pl, j) => (
                        <PlatformBadge key={j} platform={pl} size={14} />
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3 text-right">
                    <div>
                      <div className="text-sm font-bold">{fmt(p.engagement)}</div>
                      <div className="text-[10px] text-muted-foreground">engagement</div>
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

        {/* Upcoming scheduled */}
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.78s" }}>
          <SectionTitle
            title="Upcoming"
            desc="Scheduled posts"
            action={
              <button
                onClick={() => setView("calendar")}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
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
                      <div className="text-sm font-bold leading-none">
                        {p.scheduledAt ? new Date(p.scheduledAt).getDate() : "—"}
                      </div>
                      <div className="text-[9px] uppercase">
                        {p.scheduledAt ? new Date(p.scheduledAt).toLocaleString(undefined, { month: "short" }) : ""}
                      </div>
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
                      {p.platforms.slice(0, 3).map((pl, j) => (
                        <PlatformBadge key={j} platform={pl} size={12} />
                      ))}
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
                <button
                  onClick={() => setView("composer")}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                >
                  Open composer
                </button>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* === TEAM ACTIVITY FEED === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.86s" }}>
        <SectionTitle
          title="Team activity"
          desc="Recent actions across your workspace"
          action={
            <button
              onClick={() => setView("team-performance")}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
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

// ============ Pipeline Flow — interactive horizontal visualization ============
function PipelineFlow({ pipeline, total }: {
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  total: number;
}) {
  return (
    <div className="space-y-4">
      {/* Horizontal flow visualization */}
      <div className="flex items-stretch gap-1.5">
        {PIPELINE_STAGES.map((stage, i) => {
          const count = pipeline[stage.key];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <React.Fragment key={stage.key}>
              <button
                className="group relative flex-1 overflow-hidden rounded-2xl border border-border/40 bg-muted/20 p-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                {/* Background fill bar */}
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
                      className="grid h-7 w-7 place-items-center rounded-lg"
                      style={{ background: `${stage.color}14`, color: stage.color }}
                    >
                      <stage.icon className="h-3.5 w-3.5" />
                    </div>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                      style={{ background: `${stage.color}14`, color: stage.color }}
                    >
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="mt-2 num-display text-xl font-bold">{count}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {stage.label}
                  </div>
                </div>
              </button>
              {/* Arrow between stages */}
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="flex items-center">
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          Total content
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
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-32 rounded-3xl" />
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
