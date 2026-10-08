"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
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
  Download,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CalendarDays,
  GitCompare,
  LineChart as LineChartIcon,
  BarChart2,
  AreaChart as AreaChartIcon,
  DollarSign,
  Target,
  Calculator,
  Flame,
  Play,
  ExternalLink,
  MessageCircle,
  Share2,
  Bookmark,
  Filter,
  X,
  Type,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { startOfWeek, format, parseISO, isSameDay, subDays } from "date-fns";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { PLATFORMS, PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

/* ============================================================
   Types — preserve existing shapes, add new ones
   ============================================================ */
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

interface PostVariantSummary {
  id: string;
  title: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  platform: PlatformId;
  handle: string;
  authorName: string;
  engagement: number;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  publishedAt: string | null;
  url?: string | null;
}

/** Shape returned by GET /api/posts (used by DayDetailModal). */
interface PostListItem {
  id: string;
  title: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  authorName: string;
  variants: Array<{
    id: string;
    platform: PlatformId;
    handle: string;
    publishedAt: string | null;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    reach: number;
    impressions: number;
  }>;
}

interface WeeklyCohort {
  weekStart: string;
  weekStartISO: string;
  posts: number;
  totalEngagement: number;
  avgEngagement: number;
  totalImpressions: number;
  totalReach: number;
  dailyEngagement: { date: string; engagement: number }[];
}

interface ROIInputs {
  costPerPost: number;
  postCount: number;
  engagementRate: number;
  conversionRate: number; // percent
  aov: number;
}

interface ROIResults {
  reachValue: number;
  engagementValue: number;
  conversions: number;
  revenue: number;
  contentCost: number;
  roi: number;
}

type SortKey =
  | "displayName"
  | "platform"
  | "followers"
  | "impressions"
  | "reach"
  | "engagement"
  | "posts";
type SortDir = "asc" | "desc";

/* ============================================================
   Constants
   ============================================================ */
const DAY_OPTIONS = [7, 14, 30, 90] as const;
type DayOption = (typeof DAY_OPTIONS)[number];
const DEFAULT_DAYS: DayOption = 30;

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

type ChartType = "area" | "bar" | "line";

const CHART_TYPE_META: { id: ChartType; label: string; icon: LucideIcon }[] = [
  { id: "area", label: "Area", icon: AreaChartIcon },
  { id: "bar", label: "Bar", icon: BarChart2 },
  { id: "line", label: "Line", icon: LineChartIcon },
];

/* ============================================================
   Format helpers
   ============================================================ */
const dateFmt = (d: string) => {
  try {
    return parseISO(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return d;
  }
};

const dateTooltipFmt = (d: string) => {
  try {
    return parseISO(d).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
};

const currencyFmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);

const todayISO = () => format(new Date(), "yyyy-MM-dd");

const fmtPct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

/* ============================================================
   Cohort builder — group daily series into ISO-week buckets
   ============================================================ */
function buildWeeklyCohorts(series: AnalyticsPoint[]): WeeklyCohort[] {
  const buckets = new Map<string, WeeklyCohort>();
  for (const point of series) {
    const d = parseISO(point.date);
    const weekStart = startOfWeek(d, { weekStartsOn: 1 });
    const key = format(weekStart, "yyyy-MM-dd");
    if (!buckets.has(key)) {
      buckets.set(key, {
        weekStart: format(weekStart, "MMM d"),
        weekStartISO: key,
        posts: 0,
        totalEngagement: 0,
        avgEngagement: 0,
        totalImpressions: 0,
        totalReach: 0,
        dailyEngagement: [],
      });
    }
    const bucket = buckets.get(key)!;
    bucket.posts += point.posts;
    bucket.totalEngagement += point.engagement;
    bucket.totalImpressions += point.impressions;
    bucket.totalReach += point.reach;
    bucket.dailyEngagement.push({ date: point.date, engagement: point.engagement });
  }
  const cohorts = Array.from(buckets.values()).sort((a, b) =>
    a.weekStartISO.localeCompare(b.weekStartISO)
  );
  for (const c of cohorts) {
    c.avgEngagement = c.posts > 0 ? c.totalEngagement / c.posts : 0;
  }
  return cohorts;
}

function cohortHeatColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "transparent";
  const ratio = value / max;
  // 0 → rose, 0.5 → amber, 1 → emerald
  if (ratio >= 0.66) return "rgba(16,185,129,0.18)";
  if (ratio >= 0.33) return "rgba(245,158,11,0.18)";
  return "rgba(244,63,94,0.18)";
}

function cohortBorder(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "var(--border)";
  const ratio = value / max;
  if (ratio >= 0.66) return "rgba(16,185,129,0.4)";
  if (ratio >= 0.33) return "rgba(245,158,11,0.4)";
  return "rgba(244,63,94,0.4)";
}

/* ============================================================
   CSV export — current view → CSV download
   ============================================================ */
function exportAnalyticsCsv(
  data: AnalyticsResponse,
  totals: {
    followers: number;
    impressions: number;
    reach: number;
    engagement: number;
    posts: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  },
  days: DayOption | number,
  accountId: string,
  avgEngagementRate: number
) {
  const rows: string[][] = [];
  const push = (cells: (string | number)[]) =>
    rows.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`));

  push(["SYNQUE Analytics Export"]);
  push(["Generated", new Date().toISOString()]);
  push(["Days", days]);
  push(["AccountId", accountId]);
  push([]);

  push(["SUMMARY METRICS"]);
  push(["Metric", "Value"]);
  push(["Followers", totals.followers]);
  push(["Impressions", totals.impressions]);
  push(["Reach", totals.reach]);
  push(["Engagement", totals.engagement]);
  push(["Likes", totals.likes]);
  push(["Comments", totals.comments]);
  push(["Shares", totals.shares]);
  push(["Saves", totals.saves]);
  push(["Posts", totals.posts]);
  push(["Engagement Rate %", avgEngagementRate.toFixed(2)]);
  push([]);

  push(["DAILY SERIES"]);
  push(["Date", "Followers", "Impressions", "Reach", "Engagement", "Posts"]);
  for (const s of data.series) {
    push([s.date, s.followers, s.impressions, s.reach, s.engagement, s.posts]);
  }
  push([]);

  push(["PER-ACCOUNT BREAKDOWN"]);
  push([
    "Account ID",
    "Platform",
    "Handle",
    "Display Name",
    "Owner",
    "Followers",
    "Impressions",
    "Reach",
    "Engagement",
    "Likes",
    "Comments",
    "Shares",
    "Saves",
    "Posts",
  ]);
  for (const a of data.perAccount) {
    push([
      a.id,
      PLATFORMS[a.platform].name,
      a.handle,
      a.displayName,
      a.ownerName,
      a.followers,
      a.impressions,
      a.reach,
      a.engagement,
      a.likes,
      a.comments,
      a.shares,
      a.saves,
      a.posts,
    ]);
  }
  push([]);

  push(["TOP CONTENT"]);
  push([
    "ID",
    "Title",
    "Platform",
    "Handle",
    "Author",
    "Engagement",
    "Reach",
    "Impressions",
    "Published At",
  ]);
  for (const c of data.topContent) {
    push([
      c.id,
      c.title,
      PLATFORMS[c.platform].name,
      c.handle,
      c.authorName,
      c.engagement,
      c.reach,
      c.impressions,
      c.publishedAt ?? "",
    ]);
  }

  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${days}d-${accountId}-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success("Analytics exported", {
    description: `${data.series.length} days · ${data.perAccount.length} accounts`,
  });
}

/* ============================================================
   Main view
   ============================================================ */
export function AnalyticsView() {
  const [days, setDays] = React.useState<DayOption>(DEFAULT_DAYS);
  const [accountId, setAccountId] = React.useState<string>("all");
  const [syncing, setSyncing] = React.useState(false);
  const [lastSyncAt, setLastSyncAt] = React.useState<number | null>(null);
  const [heroMetric, setHeroMetric] = React.useState<HeroMetric>("impressions");
  const [chartType, setChartType] = React.useState<ChartType>("area");
  const [compareMode, setCompareMode] = React.useState(false);
  const [hiddenSeries, setHiddenSeries] = React.useState<Set<HeroMetric>>(new Set());
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [customRange, setCustomRange] = React.useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [platformFilter, setPlatformFilter] = React.useState<Set<PlatformId>>(new Set());
  const [topContentPlatform, setTopContentPlatform] = React.useState<PlatformId | "all">("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [showDayDetail, setShowDayDetail] = React.useState(false);

  // Fetch list of accounts
  const { data: accounts } = useApi<AccountOption[]>("/api/accounts");

  const analyticsUrl = React.useMemo(() => {
    // Custom range overrides days selector (server still uses days param;
    // we approximate by computing the day span from the custom range)
    let effectiveDays: DayOption | number = days;
    if (customRange.start && customRange.end) {
      const startD = parseISO(customRange.start).getTime();
      const endD = parseISO(customRange.end).getTime();
      const spanDays = Math.max(1, Math.round((endD - startD) / 86400000) + 1);
      effectiveDays = Math.min(365, Math.max(1, spanDays));
    }
    return `/api/analytics?days=${effectiveDays}&accountId=${accountId}`;
  }, [days, accountId, customRange.start, customRange.end]);

  const { data, loading, reload } = useApi<AnalyticsResponse>(analyticsUrl);

  // When compare mode is on, fetch a wider window (2 × days) so we can
  // split the older half as the "previous period" series.
  const compareUrl = React.useMemo(
    () =>
      compareMode
        ? `/api/analytics?days=${(days as number) * 2}&accountId=${accountId}`
        : null,
    [compareMode, days, accountId]
  );
  const { data: compareData } = useApi<AnalyticsResponse>(compareUrl);

  /* ---------- Sync from Twitter (preserved) ---------- */
  async function syncFromTwitter() {
    const targetAccountId =
      accountId === "all"
        ? accounts?.find(
            (a) => (a.platform as string) === "x" || (a.platform as string) === "twitter"
          )?.id
        : accountId;

    if (!targetAccountId) {
      toast.error("No X/Twitter account selected — select one from the dropdown");
      return;
    }

    setSyncing(true);
    try {
      const token =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
          : null;
      const res = await fetch("/api/sync/twitter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ accountId: targetAccountId }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Sync complete!", {
          description:
            json.message ??
            `Synced ${json.syncedPosts ?? 0} new + updated ${json.updatedPosts ?? 0} existing`,
        });
        setLastSyncAt(Date.now());
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

  /* ---------- Export current view as CSV ---------- */
  function handleExport() {
    if (!data) {
      toast.error("No data to export yet");
      return;
    }
    const totals = computeTotals(data, platformFilter);
    const filtered = filterData(data, platformFilter);
    exportAnalyticsCsv(
      filtered,
      totals,
      days,
      accountId,
      totals.reach > 0 ? (totals.engagement / totals.reach) * 100 : 0
    );
  }

  /* ---------- Series visibility toggle ---------- */
  function toggleSeries(id: HeroMetric) {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------- Platform filter toggle ---------- */
  function togglePlatform(id: PlatformId) {
    setPlatformFilter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ---------- Day detail popover / modal ---------- */
  function openDayDetail(date: string) {
    setSelectedDay(date);
    setShowDayDetail(true);
  }

  if (loading || !data) return <AnalyticsSkeleton />;

  // Empty state — no analytics data available (either no accounts or no data)
  if (data.perAccount.length === 0 && data.series.length === 0) {
    return <EmptyState mode="no-posts" />;
  }

  // Filtered data (platform multi-select)
  const filteredData = filterData(data, platformFilter);

  /* ---------- Aggregated totals ---------- */
  const totals = computeTotals(filteredData, new Set());
  const avgEngagementRate =
    totals.reach > 0 ? (totals.engagement / totals.reach) * 100 : 0;

  /* ---------- Sparkline arrays ---------- */
  const sparkFollowers = filteredData.followerSeries.map((p) => p.followers);
  const sparkImpressions = filteredData.series.map((p) => p.impressions);
  const sparkReach = filteredData.series.map((p) => p.reach);
  const sparkEngagement = filteredData.series.map((p) => p.engagement);
  const sparkPosts = filteredData.series.map((p) => p.posts);
  const sparkEngRate = filteredData.series.map((p) =>
    p.reach > 0 ? (p.engagement / p.reach) * 100 : 0
  );

  /* ---------- Follower delta ---------- */
  const firstFollowers = sparkFollowers[0] ?? 0;
  const lastFollowers = sparkFollowers[sparkFollowers.length - 1] ?? 0;
  const followerDelta =
    firstFollowers > 0
      ? Math.round(((lastFollowers - firstFollowers) / firstFollowers) * 100)
      : 0;

  /* ---------- Compare-to-previous-period deltas ---------- */
  const previousSeries = compareData?.series.slice(0, days) ?? [];
  const previousTotals = previousSeries.reduce(
    (acc, p) => {
      acc.impressions += p.impressions;
      acc.reach += p.reach;
      acc.engagement += p.engagement;
      acc.posts += p.posts;
      acc.followers += p.followers;
      return acc;
    },
    { followers: 0, impressions: 0, reach: 0, engagement: 0, posts: 0 }
  );
  const deltaPct = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;

  /* ---------- Hero chart source ---------- */
  const heroCfg = HERO_METRICS.find((m) => m.id === heroMetric) ?? HERO_METRICS[1];
  const heroSeriesData =
    heroCfg.source === "followerSeries"
      ? filteredData.followerSeries.map((p) => ({ date: p.date, value: p.followers }))
      : filteredData.series.map((p) => ({
          date: p.date,
          value: p[heroMetric],
          followers: p.followers,
          impressions: p.impressions,
          reach: p.reach,
          engagement: p.engagement,
          posts: p.posts,
        }));

  // Merge with previous-period for comparison overlay
  const heroCompareData = (() => {
    if (!compareMode || !compareData) return null;
    const older =
      heroCfg.source === "followerSeries"
        ? compareData.followerSeries.slice(0, days).map((p) => p.followers)
        : compareData.series.slice(0, days).map((p) => p[heroMetric]);
    const current =
      heroCfg.source === "followerSeries"
        ? compareData.followerSeries.slice(days).map((p) => p.followers)
        : compareData.series.slice(days).map((p) => p[heroMetric]);
    return { older, current };
  })();

  /* ---------- Per-account sparkline builders ---------- */
  const latestTotalFollowers = lastFollowers;
  const totalEngagement = totals.engagement;
  const accountFollowerSpark = (account: PerAccount): number[] => {
    if (latestTotalFollowers === 0) return [];
    return filteredData.followerSeries.map((p) =>
      Math.round((p.followers * account.followers) / latestTotalFollowers)
    );
  };
  const accountEngagementSpark = (account: PerAccount): number[] => {
    if (totalEngagement === 0) return [];
    return filteredData.series.map((p) =>
      Math.round((p.engagement * account.engagement) / Math.max(1, totalEngagement))
    );
  };

  /* ---------- Engagement rate series ---------- */
  const engagementRateSeries = filteredData.series.map((p) => ({
    date: p.date,
    rate: p.reach > 0 ? (p.engagement / p.reach) * 100 : 0,
  }));

  /* ---------- Per-platform aggregation ---------- */
  const byPlatform = buildPlatformAggregate(filteredData.perAccount);

  /* ---------- Weekly cohort ---------- */
  const cohorts = buildWeeklyCohorts(filteredData.series);
  const maxCohortEngagement = Math.max(1, ...cohorts.map((c) => c.avgEngagement));

  /* ---------- Metric row ---------- */
  const metrics: Metric[] = [
    {
      label: "Followers",
      value: totals.followers,
      delta: compareMode ? deltaPct(totals.followers, previousTotals.followers) : followerDelta,
      spark: sparkFollowers,
      color: "var(--primary)",
    },
    {
      label: "Impressions",
      value: totals.impressions,
      delta: compareMode ? deltaPct(totals.impressions, previousTotals.impressions) : undefined,
      spark: sparkImpressions,
      color: "var(--primary)",
    },
    {
      label: "Reach",
      value: totals.reach,
      delta: compareMode ? deltaPct(totals.reach, previousTotals.reach) : undefined,
      spark: sparkReach,
      color: "oklch(0.74 0.18 165)",
    },
    {
      label: "Engagement",
      value: totals.engagement,
      delta: compareMode ? deltaPct(totals.engagement, previousTotals.engagement) : undefined,
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
      delta: compareMode ? deltaPct(totals.posts, previousTotals.posts) : undefined,
      spark: sparkPosts,
      color: "oklch(0.66 0.22 305)",
    },
  ];

  /* ---------- Completion % for the ProgressToolbar ---------- */
  const syncRecent =
    lastSyncAt !== null && Date.now() - lastSyncAt < 5 * 60_000; // 5 minutes
  const completion = Math.min(
    100,
    [
      data && data.series.length > 0, // data loaded
      accountId !== "all", // account filter applied
      days !== DEFAULT_DAYS, // day range != default
      syncRecent, // sync completed recently
    ].filter(Boolean).length * 25
  );

  const heroInterval = Math.max(0, Math.floor(heroSeriesData.length / 8));

  const activeFilterCount =
    (accountId !== "all" ? 1 : 0) +
    (days !== DEFAULT_DAYS ? 1 : 0) +
    (platformFilter.size > 0 ? 1 : 0) +
    (customRange.start && customRange.end ? 1 : 0) +
    (compareMode ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* ProgressToolbar */}
      <ProgressToolbar
        completion={completion}
        onSync={syncFromTwitter}
        onExport={handleExport}
        syncing={syncing}
        syncRecent={syncRecent}
      />

      {/* Help text */}
      <HelpText module="analytics">
        <strong className="text-foreground">Analytics</strong> shows your performance across all connected accounts.
        Use the filters below to change the date range, focus on a specific account or platform, or compare against the previous period. Click{" "}
        <strong className="text-foreground">Generate AI Insights</strong> at the bottom for data-driven recommendations.
      </HelpText>

      {/* Filter panel */}
      <FilterPanel
        open={filtersOpen}
        onToggle={() => setFiltersOpen((v) => !v)}
        days={days}
        onDaysChange={setDays}
        accountId={accountId}
        onAccountChange={setAccountId}
        accounts={accounts ?? []}
        platformFilter={platformFilter}
        onTogglePlatform={togglePlatform}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        activeFilterCount={activeFilterCount}
        onClear={() => {
          setAccountId("all");
          setDays(DEFAULT_DAYS);
          setPlatformFilter(new Set());
          setCustomRange({ start: "", end: "" });
          setCompareMode(false);
          toast.info("Filters cleared");
        }}
      />

      {/* Metric row */}
      <MetricRow metrics={metrics} className="animate-rise" />

      {/* Hero chart with chart-type toggle + brush + comparison overlay + legend toggle */}
      <HeroChartSection
        data={filteredData.series}
        followerSeries={filteredData.followerSeries}
        heroMetric={heroMetric}
        onHeroMetricChange={setHeroMetric}
        chartType={chartType}
        onChartTypeChange={setChartType}
        compareMode={compareMode}
        hiddenSeries={hiddenSeries}
        onToggleSeries={toggleSeries}
        onPointClick={openDayDetail}
        days={days}
        accountCount={filteredData.perAccount.length}
        heroInterval={heroInterval}
        compareData={heroCompareData}
      />

      {/* Tabs — Growth / Engagement / Accounts */}
      <Tabs defaultValue="growth" className="animate-rise">
        <TabsList className="w-full sm:w-fit">
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
            followerSeries={filteredData.followerSeries}
            perAccount={filteredData.perAccount}
            accountSpark={accountFollowerSpark}
            days={days}
            postsByDay={filteredData.series.map((s) => ({ date: s.date, posts: s.posts }))}
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
            perAccount={filteredData.perAccount}
            followerSpark={accountFollowerSpark}
            engagementSpark={accountEngagementSpark}
            topContent={filteredData.topContent}
            days={days}
          />
        </TabsContent>
      </Tabs>

      {/* NEW: Weekly cohort analysis */}
      <CohortCard
        cohorts={cohorts}
        maxEngagement={maxCohortEngagement}
        days={days}
      />

      {/* NEW: ROI calculator */}
      <ROICalculatorCard
        totals={totals}
        avgEngagementRate={avgEngagementRate}
      />

      {/* P3-FEATURES — Advanced analytics: best time, sentiment trend, hashtag performance */}
      <AdvancedAnalyticsCard days={days} />

      {/* Top performing content */}
      <TopContentSection
        topContent={filteredData.topContent}
        platformFilter={topContentPlatform}
        onPlatformFilterChange={setTopContentPlatform}
      />

      {/* AI Insights — preserved */}
      <AIInsightsCard days={days} accountId={accountId} />

      {/* Day detail modal — opens when user clicks a data point */}
      <DayDetailModal
        date={selectedDay}
        open={showDayDetail}
        onOpenChange={setShowDayDetail}
        point={filteredData.series.find((p) => p.date === selectedDay) ?? null}
        accountId={accountId}
      />
    </div>
  );
}

/* ============================================================
   Helpers — totals, platform aggregates, filtering
   ============================================================ */
function computeTotals(
  data: AnalyticsResponse,
  platformFilter: Set<PlatformId>
): {
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
} {
  const accounts = data.perAccount.filter(
    (a) => platformFilter.size === 0 || platformFilter.has(a.platform)
  );
  return accounts.reduce(
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
}

function filterData(
  data: AnalyticsResponse,
  platformFilter: Set<PlatformId>
): AnalyticsResponse {
  if (platformFilter.size === 0) return data;
  const allowedAccountIds = new Set(
    data.perAccount
      .filter((a) => platformFilter.has(a.platform))
      .map((a) => a.id)
  );
  return {
    ...data,
    perAccount: data.perAccount.filter((a) => platformFilter.has(a.platform)),
    topContent: data.topContent.filter((c) => platformFilter.has(c.platform)),
    // We can't reliably split series by platform (already aggregated),
    // so we leave series & followerSeries as-is. The MetricRow will
    // reflect filtered perAccount totals.
  };
}

interface PlatformAggregate {
  platform: PlatformId;
  accounts: number;
  followers: number;
  impressions: number;
  reach: number;
  engagement: number;
  posts: number;
}

function buildPlatformAggregate(perAccount: PerAccount[]): PlatformAggregate[] {
  const groups: Record<string, PlatformAggregate> = {};
  for (const a of perAccount) {
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
}

/* ============================================================
   ProgressToolbar — top sticky header with completion ring
   (Pattern copied from composer.tsx ProgressToolbar)
   ============================================================ */
function ProgressToolbar({
  completion,
  onSync,
  onExport,
  syncing,
  syncRecent,
}: {
  completion: number;
  onSync: () => void;
  onExport: () => void;
  syncing: boolean;
  syncRecent: boolean;
}) {
  const modeColor = syncRecent
    ? "text-emerald-500"
    : "text-primary";
  const mode = syncRecent ? "In sync" : "Analytics";

  return (
    <div className="glass-strong glass-sheen flex items-center gap-1.5 rounded-xl px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5 lg:px-5">
      {/* Completion ring — centered, same height as 1 line of title text */}
      <div className="relative grid h-7 w-7 shrink-0 place-items-center sm:h-8 sm:w-8">
        <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90 sm:h-8 sm:w-8">
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="3"
            opacity="0.4"
          />
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${(completion / 100) * 97.4} 97.4`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className="absolute text-[7px] font-bold tabular-nums text-foreground sm:text-[8px]">
          {completion}%
        </span>
      </div>

      {/* Title + subtitle — tight grouping, aligned with ring center */}
      <div className="flex min-w-0 flex-1 flex-col gap-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold leading-tight sm:text-xs">Analytics</span>
          <span className={cn(
            "rounded px-1 py-0 text-[7px] font-bold uppercase leading-tight tracking-wide sm:text-[8px]",
            modeColor,
            "bg-muted/50"
          )}>
            {mode}
          </span>
        </div>
        <span className="truncate text-[8px] leading-tight text-muted-foreground sm:text-[9px]">
          {completion === 100
            ? "Fully configured — explore your data"
            : `${100 - completion}% left to optimize`}
        </span>
      </div>

      {/* Quick actions — compact, aligned */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onExport}
          className="hidden items-center gap-1 rounded-lg border border-border/40 bg-muted/30 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:flex"
          title="Export current view as CSV"
        >
          <Download className="h-3 w-3" />
        </button>
        <button
          onClick={onSync}
          disabled={syncing}
          className="flex items-center gap-1 rounded-lg border border-border/40 bg-muted/30 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 sm:px-2.5"
          title="Import tweets published directly on Twitter"
        >
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   FilterPanel — collapsible filters (CollapsibleSection pattern)
   ============================================================ */
function FilterPanel({
  open,
  onToggle,
  days,
  onDaysChange,
  accountId,
  onAccountChange,
  accounts,
  platformFilter,
  onTogglePlatform,
  customRange,
  onCustomRangeChange,
  compareMode,
  onCompareModeChange,
  activeFilterCount,
  onClear,
}: {
  open: boolean;
  onToggle: () => void;
  days: DayOption;
  onDaysChange: (d: DayOption) => void;
  accountId: string;
  onAccountChange: (id: string) => void;
  accounts: AccountOption[];
  platformFilter: Set<PlatformId>;
  onTogglePlatform: (id: PlatformId) => void;
  customRange: { start: string; end: string };
  onCustomRangeChange: (r: { start: string; end: string }) => void;
  compareMode: boolean;
  onCompareModeChange: (v: boolean) => void;
  activeFilterCount: number;
  onClear: () => void;
}) {
  return (
    <GlassCard className="p-3 sm:p-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-bold">Filters</span>
          {activeFilterCount > 0 && (
            <Pill color="violet">{activeFilterCount} active</Pill>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="rounded-md px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Clear
            </span>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open ? "rotate-180" : ""
          )} />
        </div>
      </button>

      <div className={cn(
        "transition-all duration-300",
        open ? "mt-3 max-h-[1200px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
      )}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Day range */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Day range
            </Label>
            <div className="mt-1.5 flex items-center gap-1 rounded-xl bg-muted/60 p-1">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => onDaysChange(d)}
                  className={cn(
                    "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
                    days === d
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Account
            </Label>
            <Select value={accountId} onValueChange={onAccountChange}>
              <SelectTrigger className="mt-1.5 h-9 w-full rounded-xl bg-background/60 text-sm">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.displayName} · {PLATFORMS[a.platform].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Platform multi-select */}
          <div className="sm:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Platforms
            </Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PLATFORM_LIST.map((p) => {
                const active = platformFilter.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => onTogglePlatform(p.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: p.accent }}
                    />
                    {p.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom date range */}
          <div className="sm:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Custom date range (overrides day selector)
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                type="date"
                value={customRange.start}
                onChange={(e) =>
                  onCustomRangeChange({ ...customRange, start: e.target.value })
                }
                className="h-9 text-xs"
              />
              <span className="text-muted-foreground">→</span>
              <Input
                type="date"
                value={customRange.end}
                onChange={(e) =>
                  onCustomRangeChange({ ...customRange, end: e.target.value })
                }
                className="h-9 text-xs"
              />
              {customRange.start && customRange.end && (
                <button
                  onClick={() => onCustomRangeChange({ start: "", end: "" })}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Clear date range"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Compare to previous period */}
          <div className="sm:col-span-2">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Compare to previous period
            </Label>
            <button
              onClick={() => onCompareModeChange(!compareMode)}
              className={cn(
                "mt-1.5 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                compareMode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-1.5">
                <GitCompare className="h-3.5 w-3.5" />
                {compareMode ? "Comparing to previous period" : "Compare to previous period"}
              </span>
              <span
                className={cn(
                  "relative h-4 w-7 rounded-full transition",
                  compareMode ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all",
                    compareMode ? "left-3.5" : "left-0.5"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* ============================================================
   HeroChartSection — enhanced interactive hero chart
   ============================================================ */
function HeroChartSection({
  data,
  followerSeries,
  heroMetric,
  onHeroMetricChange,
  chartType,
  onChartTypeChange,
  compareMode,
  hiddenSeries,
  onToggleSeries,
  onPointClick,
  days,
  accountCount,
  heroInterval,
  compareData,
}: {
  data: AnalyticsPoint[];
  followerSeries: { date: string; followers: number }[];
  heroMetric: HeroMetric;
  onHeroMetricChange: (m: HeroMetric) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  compareMode: boolean;
  hiddenSeries: Set<HeroMetric>;
  onToggleSeries: (m: HeroMetric) => void;
  onPointClick: (date: string) => void;
  days: DayOption;
  accountCount: number;
  heroInterval: number;
  compareData: { older: number[]; current: number[] } | null;
}) {
  const heroCfg = HERO_METRICS.find((m) => m.id === heroMetric) ?? HERO_METRICS[1];
  const showBrush = data.length > 14;

  // Merged series for comparison overlay (if enabled)
  const mergedData = React.useMemo(() => {
    if (!compareMode || !compareData) {
      return data.map((p) => ({
        date: p.date,
        value: heroCfg.source === "followerSeries"
          ? followerSeries.find((f) => f.date === p.date)?.followers ?? 0
          : p[heroMetric],
      }));
    }
    const currentArr = compareData.current;
    const olderArr = compareData.older;
    return currentArr.map((v, i) => ({
      date: i < data.length ? data[i].date : `Day ${i + 1}`,
      current: v,
      previous: i < olderArr.length ? olderArr[i] : null,
    }));
  }, [compareMode, compareData, data, heroCfg.source, heroMetric, followerSeries]);

  // All 4 metrics are shown as overlaid series when user is NOT in single-metric mode.
  // For simplicity (and to preserve the existing UX), the heroMetric toggle picks the
  // PRIMARY series — but we also render the other 3 as faint background lines when
  // they aren't hidden. This gives the legend toggle meaningful behavior.

  // We use the merged "value" series as the primary; the legend toggle hides/shows
  // each metric. But since the hero chart only plots one metric at a time, the
  // legend toggles are wired to SWITCH the primary metric on click (a more useful
  // UX than hide/show for a single-series chart).
  function onLegendClick(m: HeroMetric) {
    if (m === heroMetric) {
      onToggleSeries(m);
    } else {
      onHeroMetricChange(m);
    }
  }

  return (
    <HeroChart
      title="Performance trend"
      desc={`${heroCfg.label} · last ${days} days · ${accountCount} account${accountCount === 1 ? "" : "s"}${compareMode ? " · vs previous period" : ""}`}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart type toggle */}
          <div className="flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
            {CHART_TYPE_META.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => onChartTypeChange(c.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition",
                    chartType === c.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title={`${c.label} chart`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden md:inline">{c.label}</span>
                </button>
              );
            })}
          </div>
          {/* Compare toggle */}
          <button
            onClick={() => onToggleSeries(heroMetric)}
            className={cn(
              "rounded-md px-2 py-1 text-[10px] font-semibold transition",
              hiddenSeries.has(heroMetric)
                ? "bg-muted/60 text-muted-foreground line-through"
                : "bg-primary/10 text-primary"
            )}
            title="Toggle series visibility"
          >
            {hiddenSeries.has(heroMetric) ? "Hidden" : "Visible"}
          </button>
        </div>
      }
      className="animate-rise"
    >
      {/* Custom legend (clickable — switches primary metric on click) */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {HERO_METRICS.map((m) => {
          const isPrimary = m.id === heroMetric;
          const isHidden = hiddenSeries.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => onLegendClick(m.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                isPrimary
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:bg-muted",
                isHidden && "opacity-50 line-through"
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: m.color }}
              />
              {m.label}
              {isHidden && <X className="h-2.5 w-2.5" />}
            </button>
          );
        })}
      </div>

      <div className="h-[240px] w-full md:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderHeroChart({
            chartType,
            data: mergedData,
            heroCfg,
            hidden: hiddenSeries.has(heroMetric),
            compareMode,
            heroInterval,
            onPointClick,
            showBrush,
          })}
        </ResponsiveContainer>
      </div>

      {/* Hint about clickable points */}
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Target className="h-3 w-3" />
        Click any data point to see the full day breakdown
      </div>
    </HeroChart>
  );
}

function renderHeroChart({
  chartType,
  data,
  heroCfg,
  hidden,
  compareMode,
  heroInterval,
  onPointClick,
  showBrush,
}: {
  chartType: ChartType;
  data: Array<Record<string, unknown>>;
  heroCfg: HeroMetricConfig;
  hidden: boolean;
  compareMode: boolean;
  heroInterval: number;
  onPointClick: (date: string) => void;
  showBrush: boolean;
}) {
  const gradId = heroCfg.gradId;

  // Click handler at chart level (recharts passes { activePayload, activeLabel })
  const handleChartClick = (e: { activePayload?: Array<{ payload?: { date?: string } }>; activeLabel?: string } | undefined) => {
    if (!e) return;
    const payload = e.activePayload?.[0]?.payload;
    const date = payload?.date ?? e.activeLabel;
    if (date) onPointClick(date);
  };

  const commonAxes = (
    <>
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
        tickFormatter={(v) => fmt(Number(v))}
        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
        axisLine={false}
        tickLine={false}
        width={44}
      />
      <Tooltip
        contentStyle={TOOLTIP_STYLE}
        labelFormatter={dateTooltipFmt}
        formatter={(v: number, name: string) => {
          const label = name === "previous" ? "Previous period" : heroCfg.label;
          return [fmt(v), label];
        }}
      />
    </>
  );

  if (chartType === "area") {
    return (
      <AreaChart
        data={data}
        margin={{ left: -16, right: 8, top: 8, bottom: 0 }}
        onClick={handleChartClick}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={heroCfg.color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={heroCfg.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {commonAxes}
        {compareMode && (
          <Area
            type="monotone"
            dataKey="previous"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            opacity={0.55}
            activeDot={false}
            name="previous"
          />
        )}
        <Area
          type="monotone"
          dataKey={compareMode ? "current" : "value"}
          stroke={heroCfg.color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          hide={hidden}
          activeDot={{ r: 4, onClick: () => undefined }}
          name={heroCfg.id}
        />
        {showBrush && (
          <Brush
            dataKey="date"
            tickFormatter={dateFmt}
            height={22}
            stroke="var(--primary)"
            fill="var(--muted)"
            travellerWidth={8}
          />
        )}
      </AreaChart>
    );
  }

  if (chartType === "bar") {
    return (
      <BarChart
        data={data}
        margin={{ left: -16, right: 8, top: 8, bottom: 0 }}
        onClick={handleChartClick}
      >
        {commonAxes}
        {compareMode && (
          <Bar
            dataKey="previous"
            fill="var(--muted-foreground)"
            opacity={0.4}
            radius={[2, 2, 0, 0]}
            maxBarSize={20}
            name="previous"
          />
        )}
        <Bar
          dataKey={compareMode ? "current" : "value"}
          fill={heroCfg.color}
          radius={[3, 3, 0, 0]}
          maxBarSize={36}
          hide={hidden}
          name={heroCfg.id}
        />
        {showBrush && (
          <Brush
            dataKey="date"
            tickFormatter={dateFmt}
            height={22}
            stroke="var(--primary)"
            fill="var(--muted)"
            travellerWidth={8}
          />
        )}
      </BarChart>
    );
  }

  // line
  return (
    <LineChart
      data={data}
      margin={{ left: -16, right: 8, top: 8, bottom: 0 }}
      onClick={handleChartClick}
    >
      {commonAxes}
      {compareMode && (
        <Line
          type="monotone"
          dataKey="previous"
          stroke="var(--muted-foreground)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          activeDot={false}
          opacity={0.55}
          name="previous"
        />
      )}
      <Line
        type="monotone"
        dataKey={compareMode ? "current" : "value"}
        stroke={heroCfg.color}
        strokeWidth={2.5}
        dot={false}
        activeDot={{ r: 4 }}
        hide={hidden}
        name={heroCfg.id}
      />
      {showBrush && (
        <Brush
          dataKey="date"
          tickFormatter={dateFmt}
          height={22}
          stroke="var(--primary)"
          fill="var(--muted)"
          travellerWidth={8}
        />
      )}
    </LineChart>
  );
}

/* ============================================================
   DayDetailModal — opens when user clicks a data point
   Shows full-day metrics + lists posts published that day
   ============================================================ */
function DayDetailModal({
  date,
  open,
  onOpenChange,
  point,
  accountId,
}: {
  date: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  point: AnalyticsPoint | null;
  accountId: string;
}) {
  const [posts, setPosts] = React.useState<PostVariantSummary[]>([]);
  const [loadingPosts, setLoadingPosts] = React.useState(false);

  React.useEffect(() => {
    if (!open || !date) return;
    let cancelled = false;
    setLoadingPosts(true);
    fetch("/api/posts")
      .then((r) => r.json() as Promise<PostListItem[]>)
      .then((all) => {
        if (cancelled) return;
        const targetDate = parseISO(date);
        const matched: PostVariantSummary[] = [];
        for (const p of all) {
          for (const v of p.variants) {
            if (!v.publishedAt) continue;
            const pubDate = parseISO(v.publishedAt);
            if (isSameDay(pubDate, targetDate)) {
              matched.push({
                id: v.id,
                title: p.title,
                caption: p.caption,
                mediaUrl: p.mediaUrl,
                mediaType: p.mediaType,
                platform: v.platform,
                handle: v.handle,
                authorName: p.authorName,
                engagement: v.likes + v.comments + v.shares + v.saves,
                reach: v.reach,
                impressions: v.impressions,
                likes: v.likes,
                comments: v.comments,
                shares: v.shares,
                saves: v.saves,
                publishedAt: v.publishedAt,
              });
            }
          }
        }
        matched.sort((a, b) => b.engagement - a.engagement);
        setPosts(matched);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPosts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, date, accountId]);

  if (!date) return null;

  const dateLabel = (() => {
    try {
      return parseISO(date).toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return date;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            {dateLabel}
          </DialogTitle>
          <DialogDescription>
            Full performance breakdown for this day
          </DialogDescription>
        </DialogHeader>

        {point && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DayMetric label="Followers" value={point.followers} color="var(--primary)" />
            <DayMetric label="Impressions" value={point.impressions} color="var(--primary)" />
            <DayMetric label="Reach" value={point.reach} color="oklch(0.74 0.18 165)" />
            <DayMetric label="Engagement" value={point.engagement} color="oklch(0.7 0.24 14)" />
            <DayMetric label="Posts" value={point.posts} color="oklch(0.66 0.22 305)" />
            <DayMetric
              label="Eng. Rate"
              value={point.reach > 0 ? (point.engagement / point.reach) * 100 : 0}
              suffix="%"
              color="oklch(0.78 0.18 75)"
            />
          </div>
        )}

        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">
              Posts published this day
            </h3>
            <Pill color="neutral">{posts.length} posts</Pill>
          </div>

          {loadingPosts ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl bg-muted/40 px-4 py-6 text-center text-xs text-muted-foreground">
              No posts were published on this day.
            </div>
          ) : (
            <div className="max-h-[280px] space-y-2 overflow-y-auto scroll-liquid">
              {posts.map((p) => (
                <DayPostRow key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DayMetric({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className="mt-0.5 text-lg font-bold tabular-nums"
        style={{ color }}
      >
        {fmt(value)}{suffix}
      </div>
    </div>
  );
}

function DayPostRow({ post }: { post: PostVariantSummary }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/40 p-2">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {post.mediaUrl ? (
          <img
            src={post.mediaUrl}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute left-0.5 top-0.5">
          <PlatformBadge platform={post.platform} size={16} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold">{post.title}</div>
        <div className="truncate text-[10px] text-muted-foreground">
          @{post.handle} · {post.authorName}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Heart className="h-2.5 w-2.5" /> {post.likes}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="h-2.5 w-2.5" /> {post.comments}
          </span>
          <span className="flex items-center gap-0.5">
            <Share2 className="h-2.5 w-2.5" /> {post.shares}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold tabular-nums">{fmt(post.engagement)}</div>
        <div className="text-[10px] text-muted-foreground">engagement</div>
      </div>
    </div>
  );
}

/* ============================================================
   CohortCard — weekly cohort analysis with heatmap
   ============================================================ */
function CohortCard({
  cohorts,
  maxEngagement,
  days,
}: {
  cohorts: WeeklyCohort[];
  maxEngagement: number;
  days: DayOption;
}) {
  if (cohorts.length === 0) {
    return (
      <GlassCard className="p-5 animate-rise">
        <SectionHeader
          title="Weekly cohorts"
          desc="Engagement grouped by ISO week"
          icon={Layers}
        />
        <div className="py-8 text-center text-xs text-muted-foreground">
          No cohort data for this range
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5 animate-rise">
      <SectionHeader
        title="Weekly cohorts"
        desc={`${cohorts.length} week${cohorts.length === 1 ? "" : "s"} · last ${days} days · heatmap = avg engagement`}
        icon={Layers}
        action={
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "rgba(244,63,94,0.5)" }} /> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "rgba(245,158,11,0.5)" }} /> Mid
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: "rgba(16,185,129,0.5)" }} /> High
            </span>
          </div>
        }
      />

      {/* Header row (hidden on mobile — list view) */}
      <div className="hidden lg:grid lg:grid-cols-[140px_1fr_120px_120px_140px_100px] gap-2 border-b border-border/40 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <div>Week of</div>
        <div>Trend</div>
        <div className="text-right">Posts</div>
        <div className="text-right">Total Eng.</div>
        <div className="text-right">Avg / Post</div>
        <div className="text-right">Heat</div>
      </div>

      <div className="mt-2 space-y-2 lg:space-y-0">
        {cohorts.map((c) => (
          <CohortRow
            key={c.weekStartISO}
            cohort={c}
            maxEngagement={maxEngagement}
          />
        ))}
      </div>
    </GlassCard>
  );
}

function CohortRow({
  cohort,
  maxEngagement,
}: {
  cohort: WeeklyCohort;
  maxEngagement: number;
}) {
  const heat = cohortHeatColor(cohort.avgEngagement, maxEngagement);
  const border = cohortBorder(cohort.avgEngagement, maxEngagement);
  const sparkData = cohort.dailyEngagement.map((d) => d.engagement);

  return (
    <div
      className="grid grid-cols-2 gap-2 rounded-xl border p-2.5 lg:grid-cols-[140px_1fr_120px_120px_140px_100px] lg:gap-2 lg:border-0 lg:border-b lg:border-border/30 lg:p-2.5 lg:transition-colors lg:hover:bg-muted/30"
      style={{ background: heat, borderColor: border }}
    >
      <div className="flex items-center gap-1.5">
        <CalendarDays className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs font-semibold">{cohort.weekStart}</span>
      </div>

      <div className="col-span-2 lg:col-span-1">
        <div className="lg:hidden text-[10px] text-muted-foreground mb-1">Daily engagement</div>
        <Sparkline
          data={sparkData.length > 1 ? sparkData : [0, 0]}
          width={120}
          height={24}
          color="oklch(0.7 0.24 14)"
        />
      </div>

      <div className="text-right">
        <div className="lg:hidden text-[10px] text-muted-foreground">Posts</div>
        <div className="text-xs font-bold tabular-nums">{cohort.posts}</div>
      </div>

      <div className="text-right">
        <div className="lg:hidden text-[10px] text-muted-foreground">Total Eng.</div>
        <div className="text-xs font-bold tabular-nums">{fmt(cohort.totalEngagement)}</div>
      </div>

      <div className="text-right">
        <div className="lg:hidden text-[10px] text-muted-foreground">Avg / Post</div>
        <div className="text-xs font-bold tabular-nums">{fmt(cohort.avgEngagement)}</div>
      </div>

      <div className="flex items-center justify-end">
        <Flame
          className={cn(
            "h-3.5 w-3.5",
            cohort.avgEngagement / Math.max(1, maxEngagement) >= 0.66
              ? "text-emerald-500"
              : cohort.avgEngagement / Math.max(1, maxEngagement) >= 0.33
              ? "text-amber-500"
              : "text-rose-500"
          )}
        />
      </div>
    </div>
  );
}

/* ============================================================
   ROICalculatorCard — interactive ROI calculator
   ============================================================ */
function ROICalculatorCard({
  totals,
  avgEngagementRate,
}: {
  totals: {
    followers: number;
    impressions: number;
    reach: number;
    engagement: number;
    posts: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
  avgEngagementRate: number;
}) {
  const [inputs, setInputs] = React.useState<ROIInputs>({
    costPerPost: 50,
    postCount: 0,
    engagementRate: 0,
    conversionRate: 2,
    aov: 80,
  });
  const [recalcKey, setRecalcKey] = React.useState(0);

  // Auto-fill from data on first load (and when totals change)
  React.useEffect(() => {
    setInputs((prev) => ({
      ...prev,
      postCount: prev.postCount === 0 ? totals.posts : prev.postCount,
      engagementRate: prev.engagementRate === 0 ? Number(avgEngagementRate.toFixed(2)) : prev.engagementRate,
    }));
  }, [totals.posts, avgEngagementRate]);

  const results: ROIResults = React.useMemo(() => {
    void recalcKey;
    const impressions = totals.impressions;
    const engagement = totals.engagement;
    const reachValue = impressions * 0.003; // $0.003 per impression
    const engagementValue = engagement * 0.05; // $0.05 per engagement
    const conversions = (impressions * inputs.conversionRate) / 100;
    const revenue = conversions * inputs.aov;
    const contentCost = inputs.postCount * inputs.costPerPost;
    const roi = contentCost > 0 ? ((revenue - contentCost) / contentCost) * 100 : 0;
    return { reachValue, engagementValue, conversions, revenue, contentCost, roi };
  }, [recalcKey, totals.impressions, totals.engagement, inputs.conversionRate, inputs.aov, inputs.postCount, inputs.costPerPost]);

  return (
    <GlassCard className="crystal-in relative overflow-hidden p-5 animate-rise">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl" />
      <SectionHeader
        title="ROI calculator"
        desc="Estimate the return on your content investment"
        icon={Calculator}
        action={
          <button
            onClick={() => setRecalcKey((k) => k + 1)}
            className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-emerald-500/40 hover:text-emerald-600"
            title="Recalculate"
          >
            <RefreshCw className="h-3 w-3" />
            Recalculate
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Cost per post
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                value={inputs.costPerPost}
                onChange={(e) =>
                  setInputs({ ...inputs, costPerPost: Number(e.target.value) || 0 })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Posts published (period)
            </Label>
            <Input
              type="number"
              min={0}
              value={inputs.postCount}
              onChange={(e) =>
                setInputs({ ...inputs, postCount: Number(e.target.value) || 0 })
              }
              className="mt-1 h-9 text-sm"
            />
            <div className="mt-1 text-[10px] text-muted-foreground">
              Auto-filled from data ({totals.posts} detected)
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Avg engagement rate (%)
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={inputs.engagementRate}
              onChange={(e) =>
                setInputs({ ...inputs, engagementRate: Number(e.target.value) || 0 })
              }
              className="mt-1 h-9 text-sm"
            />
            <div className="mt-1 text-[10px] text-muted-foreground">
              Auto-filled from data ({avgEngagementRate.toFixed(2)}% detected)
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Conversion rate
              </Label>
              <span className="text-xs font-bold tabular-nums">
                {inputs.conversionRate.toFixed(1)}%
              </span>
            </div>
            <Slider
              value={[inputs.conversionRate]}
              min={0.1}
              max={10}
              step={0.1}
              onValueChange={(v) => setInputs({ ...inputs, conversionRate: v[0] })}
              className="mt-2"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0.1%</span>
              <span>10%</span>
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Average order value (AOV)
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                value={inputs.aov}
                onChange={(e) =>
                  setInputs({ ...inputs, aov: Number(e.target.value) || 0 })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2">
          <ROIResultRow
            label="Estimated reach value"
            formula="impressions × $0.003"
            value={currencyFmt(results.reachValue)}
            tone="neutral"
          />
          <ROIResultRow
            label="Estimated engagement value"
            formula="engagement × $0.05"
            value={currencyFmt(results.engagementValue)}
            tone="neutral"
          />
          <ROIResultRow
            label="Estimated conversions"
            formula={`impressions × ${inputs.conversionRate}% / 100`}
            value={fmt(results.conversions)}
            tone="neutral"
          />
          <ROIResultRow
            label="Estimated revenue"
            formula="conversions × AOV"
            value={currencyFmt(results.revenue)}
            tone="green"
          />
          <ROIResultRow
            label="Content cost"
            formula={`${inputs.postCount} posts × ${currencyFmt(inputs.costPerPost)}`}
            value={currencyFmt(results.contentCost)}
            tone="rose"
          />

          {/* ROI hero */}
          <div className="mt-3 rounded-2xl border border-border/40 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Return on investment
                </div>
                <div className={cn(
                  "mt-1 text-3xl font-bold tabular-nums",
                  results.roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}>
                  {results.roi >= 0 ? "+" : ""}{results.roi.toFixed(0)}%
                </div>
              </div>
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Target className="h-7 w-7" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {results.roi >= 100
                ? "Excellent — your content is generating strong returns"
                : results.roi >= 0
                ? "Profitable — break-even is reached"
                : "Below break-even — adjust your strategy"}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function ROIResultRow({
  label,
  formula,
  value,
  tone,
}: {
  label: string;
  formula: string;
  value: string;
  tone: "neutral" | "green" | "rose";
}) {
  const toneClass = {
    neutral: "text-foreground",
    green: "text-emerald-600 dark:text-emerald-400",
    rose: "text-rose-600 dark:text-rose-400",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/40 px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs font-semibold">{label}</div>
        <div className="truncate text-[10px] text-muted-foreground">{formula}</div>
      </div>
      <div className={cn("text-sm font-bold tabular-nums", toneClass)}>
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   GrowthTab — follower growth area chart + per-account sparkline list
   ============================================================ */
function GrowthTab({
  followerSeries,
  perAccount,
  accountSpark,
  days,
  postsByDay,
}: {
  followerSeries: { date: string; followers: number }[];
  perAccount: PerAccount[];
  accountSpark: (a: PerAccount) => number[];
  days: number;
  postsByDay?: { date: string; posts: number }[];
}) {
  const totalFollowers = perAccount.reduce((s, a) => s + a.followers, 0);
  const netChange =
    (followerSeries[followerSeries.length - 1]?.followers ?? 0) -
    (followerSeries[0]?.followers ?? 0);

  // P3-FEATURES — Follower Growth Attribution.
  // When follower growth spikes on a given day, mark that date with an
  // annotation. A "spike" is defined as: day-over-day delta >= 1.5× the
  // average delta (and >0). We then cross-reference the postsByDay map
  // to surface which published posts are likely responsible for the
  // growth.
  const annotations = React.useMemo(() => {
    if (!postsByDay || followerSeries.length < 3) return [];
    const postsMap = new Map(postsByDay.map((p) => [p.date, p.posts]));
    const deltas = followerSeries.map((s, i) =>
      i === 0 ? 0 : s.followers - followerSeries[i - 1].followers
    );
    const positiveDeltas = deltas.filter((d) => d > 0);
    const avgDelta =
      positiveDeltas.length > 0
        ? positiveDeltas.reduce((a, b) => a + b, 0) / positiveDeltas.length
        : 0;
    if (avgDelta <= 0) return [];
    const threshold = avgDelta * 1.5;
    return followerSeries
      .map((s, i) => ({ ...s, delta: deltas[i] }))
      .filter((s) => s.delta >= threshold && s.delta > 0)
      .map((s) => ({
        date: s.date,
        delta: s.delta,
        posts: postsMap.get(s.date) ?? 0,
      }))
      .slice(-6); // cap at 6 annotations to avoid clutter
  }, [postsByDay, followerSeries]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="p-5 lg:col-span-2">
        <SectionHeader
          title="Follower growth"
          desc={`Cumulative audience over the last ${days} days`}
          action={
            annotations.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Flame className="h-3 w-3" /> {annotations.length} growth spike{annotations.length === 1 ? "" : "s"}
              </span>
            ) : undefined
          }
        />
        <div className="h-[240px] w-full md:h-[280px]">
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
                tickFormatter={(v) => fmt(Number(v))}
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
              {/* Follower-growth attribution annotations — rendered as
                  vertical reference lines on dates where the day-over-day
                  follower delta crossed the 1.5× average threshold. */}
              {annotations.map((a) => (
                <ReferenceLine
                  key={a.date}
                  x={a.date}
                  stroke="oklch(0.7 0.2 25)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: `+${fmt(a.delta)}`,
                    position: "top",
                    fill: "oklch(0.55 0.2 25)",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                />
              ))}
              {followerSeries.length > 14 && (
                <Brush
                  dataKey="date"
                  tickFormatter={dateFmt}
                  height={22}
                  stroke="var(--primary)"
                  fill="var(--muted)"
                  travellerWidth={8}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* Attribution list — surfaces the dates of the growth spikes
            with the number of posts published that day. */}
        {annotations.length > 0 && (
          <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Flame className="h-3 w-3 text-rose-500" />
              Follower growth attribution
            </div>
            <div className="flex flex-wrap gap-1.5">
              {annotations.map((a) => (
                <div
                  key={a.date}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/60 px-2 py-1 text-[10px]"
                  title={`${a.posts} post${a.posts === 1 ? "" : "s"} published on ${a.date}`}
                >
                  <span className="font-semibold tabular-nums">{dateFmt(a.date)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{fmt(a.delta)}
                  </span>
                  <span className="text-muted-foreground">
                    · {a.posts} post{a.posts === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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

/* ============================================================
   EngagementTab — engagement rate trend + breakdown + per-platform pills
   ============================================================ */
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
    { type: "Likes", value: totals.likes, color: "var(--primary)", icon: Heart },
    { type: "Comments", value: totals.comments, color: "oklch(0.74 0.18 165)", icon: MessageCircle },
    { type: "Shares", value: totals.shares, color: "oklch(0.66 0.22 305)", icon: Share2 },
    { type: "Saves", value: totals.saves, color: "oklch(0.78 0.18 75)", icon: Bookmark },
  ];

  // Pie data for engagement mix
  const pieData = breakdownData.map((b) => ({
    name: b.type,
    value: b.value,
    fill: b.color,
  }));

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
        <div className="h-[240px] w-full md:h-[280px]">
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
                tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={dateTooltipFmt}
                formatter={(v: number) => [`${Number(v).toFixed(2)}%`, "Eng. rate"]}
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

        {/* Donut chart */}
        <div className="h-[160px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={70}
                paddingAngle={2}
                stroke="var(--background)"
                strokeWidth={2}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, name: string) => [fmt(v), name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 space-y-2">
          {breakdownData.map((x) => {
            const Icon = x.icon;
            return (
              <div key={x.type}>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3 w-3" style={{ color: x.color }} />
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
            );
          })}
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

/* ============================================================
   AccountsTab — sortable, drill-down per-account comparison
   ============================================================ */
function SortHeaderCell({
  label,
  k,
  align = "left",
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  align?: "left" | "right";
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th
      onClick={() => onSort(k)}
      className={cn(
        "cursor-pointer select-none px-3 py-2 font-medium transition hover:bg-muted/40",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        {active ? (
          sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

function AccountsTab({
  perAccount,
  followerSpark,
  engagementSpark,
  topContent,
  days,
}: {
  perAccount: PerAccount[];
  followerSpark: (a: PerAccount) => number[];
  engagementSpark: (a: PerAccount) => number[];
  topContent: TopContent[];
  days: number;
}) {
  const [sortKey, setSortKey] = React.useState<SortKey>("followers");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const maxEngagement = Math.max(1, ...perAccount.map((p) => p.engagement));
  const totalFollowers = perAccount.reduce((s, x) => s + x.followers, 0);
  const totalEngagementAll = perAccount.reduce((s, x) => s + x.engagement, 0);
  const totalImpressionsAll = perAccount.reduce((s, x) => s + x.impressions, 0);

  const sorted = React.useMemo(() => {
    const arr = perAccount.slice();
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "displayName") cmp = a.displayName.localeCompare(b.displayName);
      else if (sortKey === "platform") cmp = a.platform.localeCompare(b.platform);
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [perAccount, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <GlassCard className="p-5">
      <SectionHeader
        title="Per-account comparison"
        desc="Side-by-side performance with trend sparklines · click a row to drill down"
        icon={Layers}
        action={
          <span className="text-[11px] text-muted-foreground">
            {perAccount.length} accounts · {fmt(totalFollowers)} followers
          </span>
        }
      />
      <div className="max-h-[480px] overflow-auto scroll-liquid rounded-2xl">
        <table className="w-full min-w-[600px] sm:min-w-[820px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur-md">
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <SortHeaderCell label="Account" k="displayName" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-2 font-medium">Follower trend</th>
              <th className="px-3 py-2 font-medium">Engagement trend</th>
              <SortHeaderCell label="Followers" k="followers" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeaderCell label="Impr." k="impressions" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeaderCell label="Reach" k="reach" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeaderCell label="Engagement" k="engagement" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeaderCell label="Posts" k="posts" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <th className="px-3 py-2 font-medium text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const share = totalFollowers > 0 ? (a.followers / totalFollowers) * 100 : 0;
              const engShare = totalEngagementAll > 0 ? (a.engagement / totalEngagementAll) * 100 : 0;
              const imprShare = totalImpressionsAll > 0 ? (a.impressions / totalImpressionsAll) * 100 : 0;
              const expanded = expandedId === a.id;
              const accountTopPosts = topContent
                .filter((c) => c.handle === a.handle)
                .slice(0, 4);

              return (
                <React.Fragment key={a.id}>
                  <tr
                    onClick={() => setExpandedId(expanded ? null : a.id)}
                    className="group cursor-pointer border-t border-border/50 transition hover:bg-muted/40"
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
                        {expanded && (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                        {!expanded && (
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
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
                      <div>{fmt(a.impressions)}</div>
                      <div className="text-[10px] tabular-nums">{imprShare.toFixed(0)}%</div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {fmt(a.reach)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Mini bar chart per row */}
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                          <div
                            className="h-full rounded-full bg-primary/80 transition-all group-hover:bg-primary"
                            style={{
                              width: `${Math.round((a.engagement / maxEngagement) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-semibold tabular-nums">{fmt(a.engagement)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground tabular-nums">
                        {engShare.toFixed(0)}% share
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {a.posts}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Pill color="violet">{share.toFixed(0)}%</Pill>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-muted/20">
                      <td colSpan={9} className="px-3 py-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Top posts for {a.displayName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            last {days} days
                          </span>
                        </div>
                        {accountTopPosts.length === 0 ? (
                          <div className="rounded-lg bg-background/40 px-3 py-4 text-center text-[11px] text-muted-foreground">
                            No published posts for this account in this range
                          </div>
                        ) : (
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {accountTopPosts.map((c) => (
                              <DrillDownPostCard key={c.id} content={c} />
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {perAccount.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">
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

function DrillDownPostCard({ content }: { content: TopContent }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-background/40">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {content.mediaUrl ? (
          <img
            src={content.mediaUrl}
            alt={content.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute left-1.5 top-1.5">
          <PlatformBadge platform={content.platform} size={20} />
        </div>
      </div>
      <div className="p-2">
        <div className="line-clamp-2 text-[11px] font-medium leading-snug">
          {content.title}
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="truncate">@{content.handle}</span>
          <span className="font-bold tabular-nums text-foreground">{fmt(content.engagement)}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TopContentSection — enhanced top content list
   ============================================================ */
function TopContentSection({
  topContent,
  platformFilter,
  onPlatformFilterChange,
}: {
  topContent: TopContent[];
  platformFilter: PlatformId | "all";
  onPlatformFilterChange: (p: PlatformId | "all") => void;
}) {
  const availablePlatforms = Array.from(
    new Set(topContent.map((c) => c.platform))
  );
  const filtered =
    platformFilter === "all"
      ? topContent
      : topContent.filter((c) => c.platform === platformFilter);

  return (
    <GlassCard className="p-5 animate-rise">
      <SectionHeader
        title="Top performing content"
        desc="Highest engagement posts in range"
        icon={Eye}
        action={
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
            <button
              onClick={() => onPlatformFilterChange("all")}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-semibold transition",
                platformFilter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            {availablePlatforms.map((p) => (
              <button
                key={p}
                onClick={() => onPlatformFilterChange(p)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition",
                  platformFilter === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: PLATFORMS[p].accent }}
                />
                {PLATFORMS[p].short}
              </button>
            ))}
          </div>
        }
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {topContent.length === 0
            ? "No published content in this range"
            : "No content matches this platform filter"}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((c) => (
            <TopContentCard key={c.id} content={c} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function TopContentCard({ content }: { content: TopContent }) {
  const [hovering, setHovering] = React.useState(false);
  const isVideo = content.mediaUrl?.match(/\.(mp4|webm|mov|avi)(\?|$)/i);
  const maxEng = Math.max(1, content.engagement);
  // Estimate likes/comments/shares split (topContent only has total engagement)
  // Approximate: likes 70%, comments 20%, shares 10% (industry heuristic)
  const likes = Math.round(content.engagement * 0.7);
  const comments = Math.round(content.engagement * 0.2);
  const shares = Math.round(content.engagement * 0.1);

  // Try to construct a platform URL (best-effort — falls back to platform homepage)
  const platformUrl = (() => {
    const handle = content.handle.replace(/^@/, "");
    switch (content.platform) {
      case "instagram":
        return `https://instagram.com/${handle}`;
      case "facebook":
        return `https://facebook.com/${handle}`;
      case "x":
        return `https://x.com/${handle}`;
      case "linkedin":
        return `https://linkedin.com/in/${handle}`;
      case "tiktok":
        return `https://tiktok.com/@${handle}`;
      case "youtube":
        return `https://youtube.com/@${handle}`;
      case "threads":
        return `https://threads.net/@${handle}`;
      default:
        return null;
    }
  })();

  return (
    <GlassCard
      hover
      className="group glass-sheen relative flex flex-col overflow-hidden p-0"
    >
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-muted"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {content.mediaUrl ? (
          isVideo ? (
            <video
              src={content.mediaUrl}
              poster={content.mediaUrl.replace(/\.\w+$/, ".jpg")}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              muted
              loop
              playsInline
              autoPlay={hovering}
            />
          ) : (
            <img
              src={content.mediaUrl}
              alt={content.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
            <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <PlatformBadge platform={content.platform} size={28} />
        </div>
        {isVideo && (
          <div className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/55 backdrop-blur-sm">
            <Play className="h-3 w-3 text-white" />
          </div>
        )}
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

        {/* Engagement breakdown — mini stacked bar */}
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Engagement breakdown</span>
            <span className="font-bold tabular-nums text-foreground">{fmt(content.engagement)}</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full"
              style={{ width: `${(likes / maxEng) * 100}%`, background: "var(--primary)" }}
              title={`${likes} likes`}
            />
            <div
              className="h-full"
              style={{ width: `${(comments / maxEng) * 100}%`, background: "oklch(0.74 0.18 165)" }}
              title={`${comments} comments`}
            />
            <div
              className="h-full"
              style={{ width: `${(shares / maxEng) * 100}%`, background: "oklch(0.66 0.22 305)" }}
              title={`${shares} shares`}
            />
          </div>
          <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Heart className="h-2 w-2" /> {fmt(likes)}
            </span>
            <span className="flex items-center gap-0.5">
              <MessageCircle className="h-2 w-2" /> {fmt(comments)}
            </span>
            <span className="flex items-center gap-0.5">
              <Share2 className="h-2 w-2" /> {fmt(shares)}
            </span>
          </div>
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

        {platformUrl && (
          <a
            href={platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-background/40 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
            title={`View on ${PLATFORMS[content.platform].name}`}
          >
            <ExternalLink className="h-3 w-3" />
            View on {PLATFORMS[content.platform].name}
          </a>
        )}
      </div>
    </GlassCard>
  );
}

/* ============================================================
   AI Insights card — preserved from original
   ============================================================ */
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
        icon={Sparkles}
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

/* ============================================================
   P3-FEATURES — AdvancedAnalyticsCard
   Renders three advanced charts in one stacked card:
     1. Best Time to Post      (24-bar hourly bar chart)
     2. Sentiment Trend        (stacked area chart, 30 days)
     3. Hashtag Performance    (horizontal bar chart, top 20)
   Each chart fetches its own data so the card stays modular.
   ============================================================ */
interface BestHour {
  hour: number;
  posts: number;
  avgEngagement: number;
  totalEngagement: number;
}
interface BestTimeResponse {
  bestHours: BestHour[];
}
interface SentimentSeries {
  positive: { date: string; count: number }[];
  negative: { date: string; count: number }[];
  neutral: { date: string; count: number }[];
}
interface HashtagStat {
  tag: string;
  posts: number;
  engagement: number;
  reach: number;
  impressions: number;
}
interface HashtagResponse {
  hashtags: HashtagStat[];
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${h.toString().padStart(2, "0")}:00`);

function AdvancedAnalyticsCard({ days }: { days: number }) {
  return (
    <GlassCard className="crystal-in relative overflow-hidden p-5 animate-rise">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[oklch(0.6_0.2_305)]/15 blur-3xl" />
      <SectionHeader
        title="Advanced analytics"
        desc="Best time to post · Sentiment trend · Hashtag performance"
        icon={Sparkles}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <BestTimeToPostChart days={days} />
        <HashtagPerformanceChart days={days} />
      </div>
      <SentimentTrendChart days={days} />
    </GlassCard>
  );
}

function BestTimeToPostChart({ days }: { days: number }) {
  const { data, loading } = useApi<BestTimeResponse>(`/api/analytics/best-time?days=${days}`);
  const bestHours = data?.bestHours ?? [];
  const max = Math.max(1, ...bestHours.map((h) => h.avgEngagement));
  const bestHour = bestHours.reduce<BestHour | null>(
    (best, h) => (!best || h.avgEngagement > best.avgEngagement ? h : best),
    null
  );
  const totalPosts = bestHours.reduce((s, h) => s + h.posts, 0);

  return (
    <GlassCard className="p-4">
      <SectionHeader
        title="Best time to post"
        desc={`Avg engagement per hour, last ${days}d`}
        icon={Clock}
        action={
          bestHour && bestHour.posts > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <Flame className="h-3 w-3" /> Peak: {HOUR_LABELS[bestHour.hour]}
            </span>
          ) : undefined
        }
        className="mb-2"
      />
      {loading ? (
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : totalPosts === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-center text-[11px] text-muted-foreground">
          No published posts in the last {days} days.<br />
          Publish content to see best-time insights.
        </div>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bestHours} margin={{ left: -20, right: 4, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h: number) => `${h}h`}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tickFormatter={(v) => fmt(Number(v))}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(h: number) => `Hour ${HOUR_LABELS[h]}`}
                formatter={(v: number, name: string) => [
                  name === "avgEngagement" ? fmt(v) : String(v),
                  name === "avgEngagement" ? "Avg engagement" : name,
                ]}
              />
              <Bar
                dataKey="avgEngagement"
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              >
                {bestHours.map((h) => {
                  const intensity = h.avgEngagement / max;
                  const isPeak = h.avgEngagement === max && h.posts > 0;
                  const fill = isPeak
                    ? "oklch(0.55 0.2 25)"
                    : intensity > 0.66
                    ? "var(--primary)"
                    : intensity > 0.33
                    ? "oklch(0.7 0.18 165)"
                    : "var(--muted)";
                  return <Cell key={h.hour} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}

function SentimentTrendChart({ days }: { days: number }) {
  // The sentiment-trend API already pins to 30 days internally, but we
  // still pass `days` so the URL differs across analytics windows.
  const { data, loading } = useApi<SentimentSeries | null>(
    `/api/analytics/sentiment-trend?days=${Math.min(30, days)}`
  );

  const series = React.useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { date: string; positive: number; negative: number; neutral: number }>();
    for (const p of data.positive) {
      const row = map.get(p.date) ?? { date: p.date, positive: 0, negative: 0, neutral: 0 };
      row.positive = p.count;
      map.set(p.date, row);
    }
    for (const n of data.negative) {
      const row = map.get(n.date) ?? { date: n.date, positive: 0, negative: 0, neutral: 0 };
      row.negative = n.count;
      map.set(n.date, row);
    }
    for (const u of data.neutral) {
      const row = map.get(u.date) ?? { date: u.date, positive: 0, negative: 0, neutral: 0 };
      row.neutral = u.count;
      map.set(u.date, row);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const totalPositive = series.reduce((s, d) => s + d.positive, 0);
  const totalNegative = series.reduce((s, d) => s + d.negative, 0);
  const totalNeutral = series.reduce((s, d) => s + d.neutral, 0);
  const totalMentions = totalPositive + totalNegative + totalNeutral;

  return (
    <GlassCard className="p-4">
      <SectionHeader
        title="Sentiment trend"
        desc={`Positive / neutral / negative over ${Math.min(30, days)} days`}
        icon={Heart}
        action={
          totalMentions > 0 ? (
            <span className="text-[11px] text-muted-foreground">
              {totalMentions.toLocaleString()} mentions ·{" "}
              <span className="text-emerald-600 dark:text-emerald-400">{totalPositive}+ </span>
              <span className="text-rose-500">{totalNegative}-</span>
            </span>
          ) : undefined
        }
        className="mb-2"
      />
      {loading ? (
        <div className="flex h-[220px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : series.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-center text-[11px] text-muted-foreground">
          No comments or mentions in the last {Math.min(30, days)} days.
        </div>
      ) : (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: -20, right: 4, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="sentPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="sentNeutral" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="sentNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.2 25)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="oklch(0.65 0.2 25)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={dateFmt}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={Math.max(0, Math.floor(series.length / 6))}
              />
              <YAxis
                tickFormatter={(v) => fmt(Number(v))}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={dateTooltipFmt}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="positive"
                stackId="1"
                stroke="oklch(0.55 0.18 145)"
                strokeWidth={1.5}
                fill="url(#sentPositive)"
              />
              <Area
                type="monotone"
                dataKey="neutral"
                stackId="1"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                fill="url(#sentNeutral)"
              />
              <Area
                type="monotone"
                dataKey="negative"
                stackId="1"
                stroke="oklch(0.55 0.2 25)"
                strokeWidth={1.5}
                fill="url(#sentNegative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}

function HashtagPerformanceChart({ days }: { days: number }) {
  const { data, loading } = useApi<HashtagResponse>(`/api/analytics/hashtag-performance?days=${days}`);
  const hashtags = (data?.hashtags ?? []).slice(0, 12); // top 12 fits the chart height
  const max = Math.max(1, ...hashtags.map((h) => h.engagement));

  return (
    <GlassCard className="p-4">
      <SectionHeader
        title="Hashtag performance"
        desc={`Top hashtags by engagement, last ${days}d`}
        icon={Type}
        className="mb-2"
      />
      {loading ? (
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : hashtags.length === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-center text-[11px] text-muted-foreground">
          No hashtags tracked yet. Add hashtags to your post variants to see performance.
        </div>
      ) : (
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hashtags}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => fmt(Number(v))}
                tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="tag"
                tick={{ fontSize: 10, fill: "var(--foreground)" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number, _name: string, props: { payload?: HashtagStat }) => {
                  const p = props.payload;
                  return [
                    `${fmt(v)} engagement${p ? ` · ${p.posts} posts · ${fmt(p.reach)} reach` : ""}`,
                    `#${p?.tag ?? ""}`,
                  ] as [string, string];
                }}
              />
              <Bar
                dataKey="engagement"
                radius={[0, 3, 3, 0]}
                maxBarSize={16}
              >
                {hashtags.map((h, i) => {
                  const intensity = h.engagement / max;
                  const fill =
                    i === 0
                      ? "oklch(0.55 0.2 25)"
                      : intensity > 0.66
                      ? "var(--primary)"
                      : intensity > 0.33
                      ? "oklch(0.7 0.18 165)"
                      : "var(--muted-foreground)";
                  return <Cell key={h.tag} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}

/* ============================================================
   AnalyticsSkeleton — shimmer placeholder
   ============================================================ */
function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="glass-strong glass-sheen sticky top-0 z-20 -mx-4 flex items-center gap-3 rounded-b-2xl px-4 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="shimmer h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="shimmer h-3 w-32 rounded" />
          <div className="shimmer h-2 w-48 rounded" />
        </div>
        <div className="shimmer h-8 w-24 rounded-xl" />
      </div>
      <div className="shimmer h-14 rounded-xl" />
      <div className="shimmer h-24 rounded-2xl" />
      <div className="shimmer h-[380px] rounded-3xl" />
      <div className="shimmer h-9 rounded-lg" />
      <div className="shimmer h-[360px] rounded-3xl" />
      <div className="shimmer h-64 rounded-3xl" />
    </div>
  );
}

/* ============================================================
   EmptyState — friendly empty state
   ============================================================ */
function EmptyState({
  mode,
}: {
  mode: "no-accounts" | "no-posts";
}) {
  const isNoAccounts = mode === "no-accounts";
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary">
        <BarChart3 className="h-10 w-10" />
      </div>
      <h2 className="mt-5 text-xl font-bold tracking-tight">
        {isNoAccounts ? "No analytics yet" : "No data for this period"}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {isNoAccounts
          ? "Connect a social media account to start tracking performance."
          : "Try a different date range, or publish content to see analytics here."}
      </p>
      <div className="mt-5 flex items-center gap-2">
        {isNoAccounts ? (
          <button
            onClick={() => {
              toast.info("Open Settings to connect an account");
              // Could route to /settings if a router is wired
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Users className="h-4 w-4" />
            Connect your first account
          </button>
        ) : (
          <button
            onClick={() => toast.info("Open Composer to create a post")}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Sparkles className="h-4 w-4" />
            Publish your first post
          </button>
        )}
      </div>
    </div>
  );
}

// Re-export types for downstream consumers
export type {
  AnalyticsPoint,
  PerAccount,
  TopContent,
  AnalyticsResponse,
  AccountOption,
};
