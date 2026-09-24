"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Eye,
  Users,
  Heart,
  TrendingUp,
  Layers,
  BarChart3,
  Sparkles,
  ImageIcon,
  Loader2,
  Wand2,
  RefreshCw,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalyticsPoint {
  date: string;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  posts: number;
}

interface PerAccount {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  posts: number;
  ownerName: string;
}

interface TopContent {
  id: string;
  title: string;
  mediaUrl: string | null;
  platform: PlatformId;
  handle: string;
  authorName: string;
  engagement: number;
  reach: number;
  impressions: number;
  publishedAt: string | null;
}

interface AnalyticsResponse {
  series: AnalyticsPoint[];
  perAccount: PerAccount[];
  topContent: TopContent[];
  followerSeries: { date: string; followers: number }[];
}

interface AccountOption {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
}

const DAY_OPTIONS = [7, 14, 30, 90] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
} as const;

export function AnalyticsView() {
  const [days, setDays] = React.useState<DayOption>(30);
  const [accountId, setAccountId] = React.useState<string>("all");
  const [syncing, setSyncing] = React.useState(false);

  // Fetch the list of accounts for the filter dropdown
  const { data: accounts } = useApi<AccountOption[]>("/api/accounts");

  const analyticsUrl = React.useMemo(
    () => `/api/analytics?days=${days}&accountId=${accountId}`,
    [days, accountId]
  );
  const { data, loading, reload } = useApi<AnalyticsResponse>(analyticsUrl);

  async function syncFromTwitter() {
    const targetAccountId = accountId === "all"
      ? accounts?.find(a => (a.platform as string) === "x" || (a.platform as string) === "twitter")?.id
      : accountId;

    if (!targetAccountId) {
      toast.error("No X/Twitter account selected — select one from the dropdown");
      return;
    }

    setSyncing(true);
    try {
      const token = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
        : null;
      const res = await fetch("/api/sync/twitter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ accountId: targetAccountId }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Sync complete!", {
          description: json.message ?? `Synced ${json.syncedPosts ?? 0} new + updated ${json.updatedPosts ?? 0} existing`,
        });
        reload();
      } else {
        toast.error("Sync failed", {
          description: json.error ?? "Unknown error",
          duration: 8000,
        });
      }
    } catch {
      toast.error("Network error during sync");
    } finally {
      setSyncing(false);
    }
  }

  if (loading || !data) return <AnalyticsSkeleton />;

  // Aggregated KPIs from perAccount
  const totals = data.perAccount.reduce(
    (acc, a) => {
      acc.impressions += a.impressions;
      acc.reach += a.reach;
      acc.engagement += a.engagement;
      acc.posts += a.posts;
      acc.followers += a.followers;
      acc.likes += a.likes;
      acc.comments += a.comments;
      acc.shares += a.shares;
      acc.saves += a.saves;
      return acc;
    },
    {
      impressions: 0,
      reach: 0,
      engagement: 0,
      posts: 0,
      followers: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
    }
  );
  const avgEngagementRate =
    totals.reach > 0 ? (totals.engagement / totals.reach) * 100 : 0;

  // Per-account engagement bar widths (relative)
  const maxEngagement = Math.max(1, ...data.perAccount.map((p) => p.engagement));

  // Radar data (engagement types normalized to 0-100)
  const maxBreakdown = Math.max(
    1,
    totals.likes,
    totals.comments,
    totals.shares,
    totals.saves
  );
  const radarData = [
    { type: "Likes", value: Math.round((totals.likes / maxBreakdown) * 100) },
    { type: "Comments", value: Math.round((totals.comments / maxBreakdown) * 100) },
    { type: "Shares", value: Math.round((totals.shares / maxBreakdown) * 100) },
    { type: "Saves", value: Math.round((totals.saves / maxBreakdown) * 100) },
  ];

  return (
    <div className="space-y-5">
      {/* Help text for new users */}
      <HelpText module="analytics">
        <strong className="text-foreground">Analytics</strong> shows your performance across all connected accounts.
        Use the filters to change the date range or focus on a specific account. Click{" "}
        <strong className="text-foreground">Generate AI Insights</strong> below for data-driven recommendations.
      </HelpText>

      {/* Controls */}
      <GlassCard strong className="glass-sheen animate-rise relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                <span>Analytics</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Performance insights
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 w-[180px] rounded-xl bg-background/60 text-sm">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.displayName} · {PLATFORMS[a.platform].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    days === d
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            {/* Sync from Twitter */}
            <button
              onClick={syncFromTwitter}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50"
              title="Import tweets published directly on Twitter"
            >
              {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {syncing ? "Syncing…" : "Sync Twitter"}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-rise">
        <KpiCard
          label="Impressions"
          value={fmt(totals.impressions)}
          icon={<Eye className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint={`across ${data.perAccount.length} accounts`}
        />
        <KpiCard
          label="Total Reach"
          value={fmt(totals.reach)}
          icon={<Users className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint={`last ${days} days`}
        />
        <KpiCard
          label="Engagement"
          value={fmt(totals.engagement)}
          icon={<Heart className="h-5 w-5" />}
          accent="oklch(0.7 0.24 14)"
          hint="likes + comments + shares"
        />
        <KpiCard
          label="Engagement Rate"
          value={`${avgEngagementRate.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="engagement / reach"
        />
      </div>

      {/* Main chart + follower chart */}
      <div className="grid gap-4 lg:grid-cols-3 animate-rise">
        <GlassCard className="p-5 lg:col-span-2">
          <SectionTitle
            title="Impressions vs Reach"
            desc={`Performance trend over the last ${days} days`}
            action={
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" /> Impressions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[oklch(0.74_0.18_165)]" /> Reach
                </span>
              </div>
            }
          />
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="aImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="aReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.74 0.18 165)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.74 0.18 165)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(data.series.length / 6))}
                />
                <YAxis
                  tickFormatter={(v) => fmt(v)}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }
                  formatter={(v: number, n: string) => [
                    fmt(v),
                    n === "impressions" ? "Impressions" : "Reach",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#aImp)"
                />
                <Area
                  type="monotone"
                  dataKey="reach"
                  stroke="oklch(0.74 0.18 165)"
                  strokeWidth={2.5}
                  fill="url(#aReach)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionTitle title="Followers" desc="Audience growth" />
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.followerSeries} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="lFollowers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(data.followerSeries.length / 4))}
                />
                <YAxis
                  tickFormatter={(v) => fmt(v)}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }
                  formatter={(v: number) => [fmt(v), "Followers"]}
                />
                <Line
                  type="monotone"
                  dataKey="followers"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Net change</span>
            <span className="font-semibold text-emerald-500">
              +{fmt(
                (data.followerSeries[data.followerSeries.length - 1]?.followers ?? 0) -
                  (data.followerSeries[0]?.followers ?? 0)
              )}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Comparison table + radar */}
      <div className="grid gap-4 lg:grid-cols-3 animate-rise">
        <GlassCard className="p-5 lg:col-span-2">
          <SectionTitle
            title="Per-account comparison"
            desc="Side-by-side performance"
            action={<Layers className="h-4 w-4 text-muted-foreground" />}
          />
          <div className="max-h-96 overflow-y-auto scroll-liquid rounded-2xl">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 text-right font-medium">Followers</th>
                  <th className="px-3 py-2 text-right font-medium">Impr.</th>
                  <th className="px-3 py-2 text-right font-medium">Reach</th>
                  <th className="px-3 py-2 text-right font-medium">Engagement</th>
                  <th className="px-3 py-2 text-right font-medium">Posts</th>
                </tr>
              </thead>
              <tbody>
                {data.perAccount
                  .slice()
                  .sort((a, b) => b.followers - a.followers)
                  .map((a) => (
                    <tr
                      key={a.id}
                      className="group border-t border-border/50 transition hover:bg-muted/40"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <PlatformBadge platform={a.platform} size={32} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {a.displayName}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              @{a.handle}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {fmt(a.followers)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {fmt(a.impressions)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {fmt(a.reach)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                            <div
                              className="h-full rounded-full bg-primary/80 transition-all group-hover:bg-primary"
                              style={{
                                width: `${Math.round(
                                  (a.engagement / maxEngagement) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="font-semibold tabular-nums">
                            {fmt(a.engagement)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {a.posts}
                      </td>
                    </tr>
                  ))}
                {data.perAccount.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      No accounts in range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionTitle title="Engagement mix" desc="Breakdown by action type" />
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius={75}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="type"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [`${v}%`, "Relative"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            {[
              { label: "Likes", v: totals.likes, c: "var(--primary)" },
              { label: "Comments", v: totals.comments, c: "oklch(0.74 0.18 165)" },
              { label: "Shares", v: totals.shares, c: "oklch(0.66 0.22 305)" },
              { label: "Saves", v: totals.saves, c: "oklch(0.78 0.18 75)" },
            ].map((x) => (
              <div
                key={x.label}
                className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: x.c }} />
                <span className="text-muted-foreground">{x.label}</span>
                <span className="ml-auto font-semibold tabular-nums">{fmt(x.v)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Top content */}
      <GlassCard className="p-5 animate-rise">
        <SectionTitle
          title="Top performing content"
          desc="Highest engagement posts in range"
        />
        {data.topContent.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No published content in this range
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.topContent.map((c) => (
              <TopContentCard key={c.id} content={c} />
            ))}
          </div>
        )}
      </GlassCard>

      {/* AI Insights — advanced data-driven recommendations */}
      <AIInsightsCard days={days} accountId={accountId} />
    </div>
  );
}

/** AI Insights card — generates data-driven recommendations from real analytics. */
function AIInsightsCard({ days, accountId }: { days: number; accountId: string }) {
  const [insights, setInsights] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [generated, setGenerated] = React.useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/insights?days=${days}&accountId=${accountId}`);
      const json = await res.json();
      if (json.insights) {
        setInsights(json.insights);
        setGenerated(true);
      } else {
        toast.error(json.error ?? "Failed to generate insights");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="crystal-in relative overflow-hidden p-5 animate-rise">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[oklch(0.588_0.209_277)]/15 blur-3xl" />
      <SectionTitle
        title="AI Insights"
        desc="Data-driven recommendations from your real performance"
        action={
          <button
            onClick={generate}
            disabled={loading}
            className="liquid-gold flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? "Analyzing…" : generated ? "Regenerate" : "Generate AI Insights"}
          </button>
        }
      />

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Analyzing your performance data…
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            This takes a few seconds — we're processing your real metrics.
          </p>
        </div>
      )}

      {!loading && insights && (
        <div className="crystal-in rounded-2xl border border-border bg-muted/30 p-4">
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90 dark:prose-invert">
            {insights}
          </div>
        </div>
      )}

      {!loading && !insights && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <p className="mt-3 text-sm font-semibold">Generate AI-powered insights</p>
          <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">
            Click the button above to analyze your real performance data and get
            personalized recommendations for growth, posting strategy, and content optimization.
          </p>
        </div>
      )}
    </GlassCard>
  );
}

function TopContentCard({ content }: { content: TopContent }) {
  return (
    <GlassCard
      hover
      className="group glass-sheen relative flex flex-col overflow-hidden p-0"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {content.mediaUrl ? (
           
          <img
            src={content.mediaUrl}
            alt={content.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
            <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <PlatformBadge platform={content.platform} size={28} />
        </div>
        {content.publishedAt && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {timeAgo(content.publishedAt)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug">
          {content.title}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate">@{content.handle}</span>
          <span>·</span>
          <span className="truncate">{content.authorName}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border/60 pt-2 text-center">
          <div>
            <div className="text-sm font-bold tabular-nums">
              {fmt(content.engagement)}
            </div>
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Eng.
            </div>
          </div>
          <div>
            <div className="text-sm font-bold tabular-nums">{fmt(content.reach)}</div>
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Reach
            </div>
          </div>
          <div>
            <div className="text-sm font-bold tabular-nums">
              {fmt(content.impressions)}
            </div>
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Impr.
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-24 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="shimmer h-[360px] rounded-3xl lg:col-span-2" />
        <div className="shimmer h-[360px] rounded-3xl" />
      </div>
      <div className="shimmer h-96 rounded-3xl" />
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
