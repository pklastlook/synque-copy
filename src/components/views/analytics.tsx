"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import {
  HeroChart,
  MetricRow,
  Sparkline,
  SectionHeader,
  Pill,
  ListRow,
  type Metric,
} from "@/components/glass/dense-ui";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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

type HeroMetric = "followers" | "impressions" | "reach" | "engagement";

interface HeroMetricConfig {
  id: HeroMetric;
  label: string;
  color: string;
  gradId: string;
  source: "series" | "followerSeries";
}

const HERO_METRICS: HeroMetricConfig[] = [
  { id: "followers", label: "Followers", color: "var(--primary)", gradId: "hFollowers", source: "followerSeries" },
  { id: "impressions", label: "Impressions", color: "var(--primary)", gradId: "hImpressions", source: "series" },
  { id: "reach", label: "Reach", color: "oklch(0.74 0.18 165)", gradId: "hReach", source: "series" },
  { id: "engagement", label: "Engagement", color: "oklch(0.7 0.24 14)", gradId: "hEngagement", source: "series" },
];

const dateFmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const dateTooltipFmt = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

interface PlatformAggregate {
  platform: PlatformId;
  accounts: number;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  posts: number;
}

export function AnalyticsView() {
  const [days, setDays] = React.useState<DayOption>(30);
  const [accountId, setAccountId] = React.useState<string>("all");
  const [syncing, setSyncing] = React.useState(false);
  const [heroMetric, setHeroMetric] = React.useState<HeroMetric>("impressions");

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

  // Sparkline arrays per metric (from aggregated series)
  const sparkFollowers = data.followerSeries.map((p) => p.followers);
  const sparkImpressions = data.series.map((p) => p.impressions);
  const sparkReach = data.series.map((p) => p.reach);
  const sparkEngagement = data.series.map((p) => p.engagement);
  const sparkPosts = data.series.map((p) => p.posts);
  const sparkEngRate = data.series.map((p) =>
    p.reach > 0 ? (p.engagement / p.reach) * 100 : 0
  );

  // Follower delta (cumulative series → meaningful percentage)
  const firstFollowers = sparkFollowers[0] ?? 0;
  const lastFollowers = sparkFollowers[sparkFollowers.length - 1] ?? 0;
  const followerDelta =
    firstFollowers > 0
      ? Math.round(((lastFollowers - firstFollowers) / firstFollowers) * 100)
      : 0;

  // Hero chart source (series already has all 4 metrics; followerSeries has followers only)
  const heroCfg = HERO_METRICS.find((m) => m.id === heroMetric) ?? HERO_METRICS[1];
  const heroSeriesData =
    heroCfg.source === "followerSeries" ? data.followerSeries : data.series;

  // Per-account sparkline (scaled share of aggregate follower trend — see worklog)
  const latestTotalFollowers = lastFollowers;
  const accountFollowerSpark = (account: PerAccount): number[] => {
    if (latestTotalFollowers === 0) return [];
    return data.followerSeries.map((p) =>
      Math.round((p.followers * account.followers) / latestTotalFollowers)
    );
  };

  // Per-account engagement sparkline (same scaling, using engagement daily totals)
  const latestEngagementTotal =
    sparkEngagement[sparkEngagement.length - 1] ?? 0;
  const totalEngagement = totals.engagement;
  const accountEngagementSpark = (account: PerAccount): number[] => {
    if (latestEngagementTotal === 0 || totalEngagement === 0) return [];
    return data.series.map((p) =>
      Math.round((p.engagement * account.engagement) / totalEngagement)
    );
  };

  // Engagement rate per day (for the Engagement tab bar chart)
  const engagementRateSeries = data.series.map((p) => ({
    date: p.date,
    rate: p.reach > 0 ? (p.engagement / p.reach) * 100 : 0,
  }));

  // Per-platform aggregation (for the Engagement tab pills)
  const byPlatform: PlatformAggregate[] = (() => {
    const groups: Record<string, PlatformAggregate> = {};
    for (const a of data.perAccount) {
      const key = a.platform;
      if (!groups[key]) {
        groups[key] = {
          platform: a.platform,
          accounts: 0,
          followers: 0,
          impressions: 0,
          reach: 0,
          engagement: 0,
          posts: 0,
        };
      }
      groups[key].accounts += 1;
      groups[key].followers += a.followers;
      groups[key].impressions += a.impressions;
      groups[key].reach += a.reach;
      groups[key].engagement += a.engagement;
      groups[key].posts += a.posts;
    }
    return Object.values(groups).sort((a, b) => b.followers - a.followers);
  })();

  // Metric row — 6 metrics with inline sparklines, dense single-line strip.
  const metrics: Metric[] = [
    {
      label: "Followers",
      value: totals.followers,
      delta: followerDelta,
      spark: sparkFollowers,
      color: "var(--primary)",
    },
    {
      label: "Impressions",
      value: totals.impressions,
      spark: sparkImpressions,
      color: "var(--primary)",
    },
    {
      label: "Reach",
      value: totals.reach,
      spark: sparkReach,
      color: "oklch(0.74 0.18 165)",
    },
    {
      label: "Engagement",
      value: totals.engagement,
      spark: sparkEngagement,
      color: "oklch(0.7 0.24 14)",
    },
    {
      label: "Eng. Rate",
      value: `${avgEngagementRate.toFixed(1)}%`,
      spark: sparkEngRate,
      color: "oklch(0.78 0.18 75)",
    },
    {
      label: "Posts",
      value: totals.posts,
      spark: sparkPosts,
      color: "oklch(0.66 0.22 305)",
    },
  ];

  const heroInterval = Math.max(
    0,
    Math.floor(heroSeriesData.length / 8)
  );

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

      {/* Dense metric row */}
      <MetricRow metrics={metrics} className="animate-rise" />

      {/* Hero chart — one big chart with metric toggle */}
      <HeroChart
        title="Performance trend"
        desc={`${heroCfg.label} over the last ${days} days · ${data.perAccount.length} account${data.perAccount.length === 1 ? "" : "s"}`}
        action={
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            {HERO_METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => setHeroMetric(m.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
                  heroMetric === m.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
        className="animate-rise"
      >
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={heroSeriesData} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id={heroCfg.gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={heroCfg.color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={heroCfg.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateFmt}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={heroInterval}
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
                labelFormatter={dateTooltipFmt}
                formatter={(v: number) => [fmt(v), heroCfg.label]}
              />
              <Area
                type="monotone"
                dataKey={heroMetric}
                stroke={heroCfg.color}
                strokeWidth={2.5}
                fill={`url(#${heroCfg.gradId})`}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </HeroChart>

      {/* Tabs — Growth / Engagement / Accounts */}
      <Tabs defaultValue="growth" className="animate-rise">
        <TabsList>
          <TabsTrigger value="growth">
            <TrendingUp className="h-3.5 w-3.5" />
            Growth
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <Heart className="h-3.5 w-3.5" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <Layers className="h-3.5 w-3.5" />
            Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="growth">
          <GrowthTab
            followerSeries={data.followerSeries}
            perAccount={data.perAccount}
            accountSpark={accountFollowerSpark}
            days={days}
          />
        </TabsContent>

        <TabsContent value="engagement">
          <EngagementTab
            engagementRateSeries={engagementRateSeries}
            byPlatform={byPlatform}
            totals={totals}
          />
        </TabsContent>

        <TabsContent value="accounts">
          <AccountsTab
            perAccount={data.perAccount}
            followerSpark={accountFollowerSpark}
            engagementSpark={accountEngagementSpark}
          />
        </TabsContent>
      </Tabs>

      {/* Top content */}
      <GlassCard className="p-5 animate-rise">
        <SectionHeader
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

// ============================================================================
// Growth tab — follower growth area chart + per-account sparkline list
// ============================================================================
function GrowthTab({
  followerSeries,
  perAccount,
  accountSpark,
  days,
}: {
  followerSeries: { date: string; followers: number }[];
  perAccount: PerAccount[];
  accountSpark: (a: PerAccount) => number[];
  days: number;
}) {
  const totalFollowers = perAccount.reduce((s, a) => s + a.followers, 0);
  const netChange =
    (followerSeries[followerSeries.length - 1]?.followers ?? 0) -
    (followerSeries[0]?.followers ?? 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="p-5 lg:col-span-2">
        <SectionHeader
          title="Follower growth"
          desc={`Cumulative audience over the last ${days} days`}
        />
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={followerSeries} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gFollowers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateFmt}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(followerSeries.length / 6))}
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
                labelFormatter={dateTooltipFmt}
                formatter={(v: number) => [fmt(v), "Followers"]}
              />
              <Area
                type="monotone"
                dataKey="followers"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fill="url(#gFollowers)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Net change</span>
          <span className={cn("font-semibold tabular-nums", netChange >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {netChange >= 0 ? "+" : ""}{fmt(netChange)}
          </span>
        </div>
      </GlassCard>

      <GlassCard className="p-3">
        <SectionHeader
          title="Per-account"
          icon={Users}
          desc="Followers (scaled trend)"
          className="px-2 pt-1"
        />
        <div className="max-h-[320px] overflow-auto scroll-liquid">
          {perAccount
            .slice()
            .sort((a, b) => b.followers - a.followers)
            .map((a) => {
              const share = totalFollowers > 0 ? (a.followers / totalFollowers) * 100 : 0;
              return (
                <ListRow key={a.id}>
                  <PlatformBadge platform={a.platform} size={28} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{a.displayName}</div>
                    <div className="truncate text-[10px] text-muted-foreground">@{a.handle}</div>
                  </div>
                  <Sparkline
                    data={accountSpark(a)}
                    width={48}
                    height={20}
                    color={PLATFORMS[a.platform].accent}
                  />
                  <div className="text-right">
                    <div className="text-xs font-bold tabular-nums">{fmt(a.followers)}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {share.toFixed(0)}%
                    </div>
                  </div>
                </ListRow>
              );
            })}
          {perAccount.length === 0 && (
            <div className="py-8 text-center text-xs text-muted-foreground">No accounts in range</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Engagement tab — engagement rate trend bar chart + breakdown + per-platform pills
// ============================================================================
function EngagementTab({
  engagementRateSeries,
  byPlatform,
  totals,
}: {
  engagementRateSeries: { date: string; rate: number }[];
  byPlatform: PlatformAggregate[];
  totals: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagement: number;
    reach: number;
  };
}) {
  const maxBreakdown = Math.max(1, totals.likes, totals.comments, totals.shares, totals.saves);
  const breakdownData = [
    { type: "Likes", value: totals.likes, color: "var(--primary)" },
    { type: "Comments", value: totals.comments, color: "oklch(0.74 0.18 165)" },
    { type: "Shares", value: totals.shares, color: "oklch(0.66 0.22 305)" },
    { type: "Saves", value: totals.saves, color: "oklch(0.78 0.18 75)" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="p-5 lg:col-span-2">
        <SectionHeader
          title="Engagement rate trend"
          desc="Engagement / Reach per day (%)"
          action={
            <span className="text-[11px] text-muted-foreground">
              Avg {(totals.reach > 0 ? (totals.engagement / totals.reach) * 100 : 0).toFixed(1)}%
            </span>
          }
        />
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={engagementRateSeries} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateFmt}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(engagementRateSeries.length / 8))}
              />
              <YAxis
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={dateTooltipFmt}
                formatter={(v: number) => [`${v.toFixed(2)}%`, "Eng. rate"]}
              />
              <Bar
                dataKey="rate"
                fill="var(--primary)"
                radius={[3, 3, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionHeader title="Engagement mix" desc="Breakdown by action type" icon={Heart} />
        <div className="space-y-2.5">
          {breakdownData.map((x) => (
            <div key={x.type}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: x.color }} />
                  {x.type}
                </span>
                <span className="font-bold tabular-nums">{fmt(x.value)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(x.value / maxBreakdown) * 100}%`,
                    background: x.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <SectionHeader
          title="By platform"
          desc="Engagement rate per platform"
          icon={Layers}
          className="mt-5 mb-2"
        />
        <div className="flex flex-wrap gap-1.5">
          {byPlatform.map((p) => {
            const rate = p.reach > 0 ? (p.engagement / p.reach) * 100 : 0;
            const colorTone: "neutral" | "green" | "amber" | "rose" | "blue" | "violet" =
              rate >= 5 ? "green" : rate >= 2 ? "blue" : rate > 0 ? "amber" : "neutral";
            return (
              <Pill key={p.platform} color={colorTone}>
                {PLATFORMS[p.platform].short} · {rate.toFixed(1)}%
              </Pill>
            );
          })}
          {byPlatform.length === 0 && (
            <span className="text-[11px] text-muted-foreground">No platform data</span>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============================================================================
// Accounts tab — per-account comparison table with sparklines
// ============================================================================
function AccountsTab({
  perAccount,
  followerSpark,
  engagementSpark,
}: {
  perAccount: PerAccount[];
  followerSpark: (a: PerAccount) => number[];
  engagementSpark: (a: PerAccount) => number[];
}) {
  const maxEngagement = Math.max(1, ...perAccount.map((p) => p.engagement));
  const totalFollowers = perAccount.reduce((s, x) => s + x.followers, 0);

  return (
    <GlassCard className="p-5">
      <SectionHeader
        title="Per-account comparison"
        desc="Side-by-side performance with trend sparklines"
        icon={Layers}
        action={
          <span className="text-[11px] text-muted-foreground">
            {perAccount.length} accounts · {fmt(totalFollowers)} followers
          </span>
        }
      />
      <div className="max-h-[420px] overflow-auto scroll-liquid rounded-2xl">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium">Follower trend</th>
              <th className="px-3 py-2 font-medium">Engagement trend</th>
              <th className="px-3 py-2 text-right font-medium">Followers</th>
              <th className="px-3 py-2 text-right font-medium">Impr.</th>
              <th className="px-3 py-2 text-right font-medium">Reach</th>
              <th className="px-3 py-2 text-right font-medium">Engagement</th>
              <th className="px-3 py-2 text-right font-medium">Posts</th>
            </tr>
          </thead>
          <tbody>
            {perAccount
              .slice()
              .sort((a, b) => b.followers - a.followers)
              .map((a) => {
                const share = totalFollowers > 0 ? (a.followers / totalFollowers) * 100 : 0;
                return (
                  <tr
                    key={a.id}
                    className="group border-t border-border/50 transition hover:bg-muted/40"
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <PlatformBadge platform={a.platform} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{a.displayName}</div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            @{a.handle} · {a.ownerName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Sparkline
                        data={followerSpark(a)}
                        width={64}
                        height={20}
                        color={PLATFORMS[a.platform].accent}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Sparkline
                        data={engagementSpark(a)}
                        width={64}
                        height={20}
                        color="oklch(0.7 0.24 14)"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="font-medium tabular-nums">{fmt(a.followers)}</div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {share.toFixed(0)}% of total
                      </div>
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
                        <span className="font-semibold tabular-nums">{fmt(a.engagement)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {a.posts}
                    </td>
                  </tr>
                );
              })}
            {perAccount.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No accounts in range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ============================================================================
// AI Insights card — generates data-driven recommendations from real analytics.
// ============================================================================
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
      <SectionHeader
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
      <div className="shimmer h-14 rounded-xl" />
      <div className="shimmer h-[380px] rounded-3xl" />
      <div className="shimmer h-9 rounded-lg" />
      <div className="shimmer h-[360px] rounded-3xl" />
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}
