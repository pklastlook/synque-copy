"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  Legend,
} from "recharts";
import {
  Users,
  Plus,
  Crosshair,
  Pause,
  Play,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  StickyNote,
  RefreshCw,
  Microscope,
  Loader2,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import {
  PLATFORMS,
  PLATFORM_LIST,
  type PlatformId,
} from "@/lib/platforms";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MetricRow,
  HeroChart,
  ListRow,
  SectionHeader,
  Sparkline,
  DeltaBadge,
  Pill,
  BentoGrid,
  BentoTile,
  type Metric,
} from "@/components/glass/dense-ui";

// ============================================================================
// Types — every field preserved from the original API contract.
// ============================================================================

interface CompetitorSeries {
  date: string;
  followers: number;
  engagement: number;
  posts: number;
}

interface Competitor {
  id: string;
  name: string;
  handle: string;
  platform: PlatformId;
  avatar: string | null;
  followers: number;
  engagementRate: number;
  growthRate: number;
  postingFreq: number;
  status: "tracking" | "paused";
  notes: string | null;
  series: CompetitorSeries[];
}

type StatusFilter = "all" | "tracking" | "paused";

interface AccountInfo {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  followers: number;
}

// ============================================================================
// Deep analysis types — mirrors the response from POST /api/competitors/[id]/analyze
// ============================================================================

interface AnalyzedPost {
  id: string;
  externalId: string;
  text: string;
  mediaUrl: string | null;
  likes: number;
  comments: number;
  shares: number;
  sentiment: string | null;
  postedAt: string;
  engagementScore?: number;
}

interface CompetitorAnalysis {
  posts: AnalyzedPost[];
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  contentGaps: { topic: string; competitorPosts: number; yourPosts: number }[];
  shareOfVoice: number;
  topPosts: AnalyzedPost[];
  meta?: {
    competitorId: string;
    competitorName: string;
    platform: string;
    handle: string;
    followers: number;
    postsAnalyzed: number;
    yourEngagement: number;
    competitorEngagement: number;
  };
  // Attached client-side for the dialog header (not from the API response).
  competitor?: {
    id: string;
    name: string;
    handle: string;
    platform: PlatformId;
    avatar: string | null;
    followers: number;
    engagementRate: number;
  };
}

const LINE_COLORS = [
  "var(--primary)",
  "oklch(0.74 0.18 165)",
  "oklch(0.66 0.22 305)",
  "oklch(0.78 0.18 75)",
];

function platformProfileUrl(platform: PlatformId, handle: string): string | null {
  const h = handle.replace(/^@/, "");
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${h}`;
    case "facebook":
      return `https://facebook.com/${h}`;
    case "x":
      return `https://x.com/${h}`;
    case "linkedin":
      return `https://linkedin.com/company/${h}`;
    case "tiktok":
      return `https://tiktok.com/@${h}`;
    case "youtube":
      return `https://youtube.com/@${h}`;
    case "threads":
      return `https://threads.net/@${h}`;
    default:
      return null;
  }
}

// ============================================================================
// Main view — dense macOS-27 liquid-glass redesign.
// ============================================================================

export function CompetitorsView() {
  const { data, loading, reload } = useApi<Competitor[]>("/api/competitors");
  const { data: accounts } = useApi<AccountInfo[]>("/api/accounts");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Competitor | null>(null);
  const [syncing, setSyncing] = React.useState(false);
  const [analyzingId, setAnalyzingId] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<CompetitorAnalysis | null>(null);

  function getToken(): string | null {
    try {
      return (
        JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state
          ?.token ?? null
      );
    } catch {
      return null;
    }
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    const toastId = toast.loading("Syncing competitors…");
    try {
      const token = getToken();
      const res = await fetch("/api/competitors/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ?? `HTTP ${res.status}`
        );
      }
      const json = (await res.json()) as {
        ok: boolean;
        synced: unknown[];
        errors: string[];
        total: number;
        updated: number;
        postsStored?: number;
      };
      toast.success(
        `Synced ${json.updated} of ${json.total} competitors${
          json.postsStored ? ` · ${json.postsStored} posts stored` : ""
        }`,
        { id: toastId }
      );
      if (json.errors && json.errors.length > 0) {
        const preview = json.errors.slice(0, 3).join(" · ");
        const extra =
          json.errors.length > 3 ? ` (+${json.errors.length - 3} more)` : "";
        toast.error(`${json.errors.length} error${json.errors.length === 1 ? "" : "s"}: ${preview}${extra}`);
      }
      reload();
    } catch (err) {
      toast.error(
        `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId }
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleAnalyze(c: Competitor) {
    if (analyzingId) return;
    setAnalyzingId(c.id);
    setAnalysis(null);
    const toastId = toast.loading(`Analyzing ${c.name}…`);
    try {
      const token = getToken();
      const res = await fetch(`/api/competitors/${c.id}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ?? `HTTP ${res.status}`
        );
      }
      const json = (await res.json()) as CompetitorAnalysis & { meta?: { competitorId: string; competitorName: string; platform: string; handle: string; followers: number; postsAnalyzed: number; yourEngagement: number; competitorEngagement: number } };
      // Attach the competitor identity for the dialog header.
      json.competitor = {
        id: c.id,
        name: c.name,
        handle: c.handle,
        platform: c.platform,
        avatar: c.avatar,
        followers: c.followers,
        engagementRate: c.engagementRate,
      };
      setAnalysis(json);
      toast.success(
        `Analysis ready — ${json.meta?.postsAnalyzed ?? json.posts.length} posts analyzed`,
        { id: toastId }
      );
    } catch (err) {
      toast.error(
        `Analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId }
      );
    } finally {
      setAnalyzingId(null);
    }
  }

  if (loading || !data) return <CompetitorsSkeleton />;

  // Our top account's followers — used for honest benchmarking.
  const hasOurAccounts = !!accounts && accounts.length > 0;
  const ourFollowers = hasOurAccounts
    ? Math.max(...accounts.map((a) => a.followers))
    : 0;

  const sorted = [...data].sort((a, b) => b.followers - a.followers);
  const filtered =
    statusFilter === "all"
      ? sorted
      : sorted.filter((c) => c.status === statusFilter);

  // Top 4 for the hero comparison chart
  const top = sorted.slice(0, 4);

  // Merged dataset keyed by date (one row per date across all top rivals)
  const dateSet = new Set<string>();
  top.forEach((c) => c.series.forEach((s) => dateSet.add(s.date)));
  const dates = Array.from(dateSet).sort();
  const chartData = dates.map((d) => {
    const row: Record<string, number | string | null> = { date: d };
    top.forEach((c) => {
      const pt = c.series.find((s) => s.date === d);
      row[c.id] = pt ? pt.followers : null;
    });
    return row;
  });

  // Aggregated reach sparkline (sum of all rivals' followers over time)
  const reachSpark = dates.map((d) => {
    let sum = 0;
    sorted.forEach((c) => {
      const pt = c.series.find((s) => s.date === d);
      if (pt) sum += pt.followers;
    });
    return sum;
  });

  // KPI aggregates
  const totalReach = sorted.reduce((s, c) => s + c.followers, 0);
  const trackingCount = sorted.filter((c) => c.status === "tracking").length;
  const avgEng =
    sorted.length > 0
      ? sorted.reduce((s, c) => s + c.engagementRate, 0) / sorted.length
      : 0;
  const avgGrowth =
    sorted.length > 0
      ? sorted.reduce((s, c) => s + c.growthRate, 0) / sorted.length
      : 0;
  const avgPostsWk =
    sorted.length > 0
      ? sorted.reduce((s, c) => s + c.postingFreq, 0) / sorted.length
      : 0;
  const platformsTracked = new Set(sorted.map((c) => c.platform)).size;

  // Dense MetricRow — single-line KPI strip.
  const metrics: Metric[] = [
    {
      label: "Tracked",
      value: sorted.length,
      spark: reachSpark.length > 1 ? reachSpark : undefined,
      color: "var(--primary)",
    },
    {
      label: "Total reach",
      value: fmt(totalReach),
      spark: reachSpark.length > 1 ? reachSpark : undefined,
      color: "oklch(0.74 0.18 165)",
    },
    {
      label: "Avg engagement",
      value: `${avgEng.toFixed(1)}%`,
      color: "oklch(0.66 0.22 305)",
    },
    {
      label: "Avg growth",
      value: `${avgGrowth >= 0 ? "+" : ""}${avgGrowth.toFixed(1)}%`,
      delta: Number(avgGrowth.toFixed(1)),
      color: "oklch(0.78 0.18 75)",
    },
    {
      label: "Avg posts/wk",
      value: avgPostsWk.toFixed(1),
      color: "var(--primary)",
    },
    {
      label: "Active",
      value: trackingCount,
      color: "oklch(0.74 0.18 165)",
    },
  ];

  // Bento insight tiles — up to 4 standout rivals.
  const topGrower = sorted.length
    ? [...sorted].sort((a, b) => b.growthRate - a.growthRate)[0]
    : null;
  const topEngaged = sorted.length
    ? [...sorted].sort((a, b) => b.engagementRate - a.engagementRate)[0]
    : null;
  const topPoster = sorted.length
    ? [...sorted].sort((a, b) => b.postingFreq - a.postingFreq)[0]
    : null;

  const empty = sorted.length === 0;

  return (
    <div className="animate-rise space-y-4">
      <HelpText module="competitors"><strong className="text-foreground">Competitors</strong> benchmarks your performance against rival accounts. Add a competitor to compare growth and engagement.</HelpText>

      {/* Header — compact, replaces the tall hero glass-sheen banner */}
      <SectionHeader
        title="Competitors"
        desc={`Tracking ${sorted.length} rival ${sorted.length === 1 ? "account" : "accounts"} across ${platformsTracked} ${platformsTracked === 1 ? "platform" : "platforms"}`}
        icon={Crosshair}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="liquid-pill flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-60"
              title="Fetch real follower counts and engagement rates from platform APIs"
            >
              <RefreshCw
                className={cn("h-4 w-4", syncing && "animate-spin")}
              />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add competitor
            </button>
          </div>
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a competitor</DialogTitle>
            <DialogDescription>
              Start tracking a rival account. We will pull snapshots on every
              refresh.
            </DialogDescription>
          </DialogHeader>
          <AddCompetitorForm
            onCancel={() => setAddOpen(false)}
            onDone={() => {
              setAddOpen(false);
              reload();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dense metric row — replaces the old 4-tall KPI cards */}
      <MetricRow metrics={metrics} />

      {/* HeroChart — ONE comparison chart, not 10 */}
      {!empty && (
        <HeroChart
          title="Follower growth"
          desc="Top 4 rivals by audience size over time"
          action={
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              {top.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: LINE_COLORS[i % LINE_COLORS.length] }}
                  />
                  <PlatformBadge platform={c.platform} size={16} />
                  <span className="font-medium">{c.name}</span>
                </span>
              ))}
            </div>
          }
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ left: -8, right: 12, top: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => fmt(Number(v))}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                    boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
                  }}
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }
                  formatter={(v: number, n: string) => {
                    const c = top.find((x) => x.id === n);
                    return [fmt(Number(v)), c ? c.name : n];
                  }}
                />
                {top.map((c, i) => (
                  <Line
                    key={c.id}
                    type="monotone"
                    dataKey={c.id}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </HeroChart>
      )}

      {/* BentoGrid — up to 4 insight tiles (was 15 cards) */}
      {!empty && (
        <BentoGrid>
          {topGrower && (
            <BentoTile>
              <div className="flex h-full flex-col">
                <div className="label-caps text-[10px] text-muted-foreground">Top grower</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <PlatformBadge platform={topGrower.platform} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{topGrower.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">@{topGrower.handle}</div>
                  </div>
                </div>
                <div className="mt-auto flex items-baseline gap-2 pt-3">
                  <span className="num-display text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{topGrower.growthRate.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">growth rate</span>
                </div>
              </div>
            </BentoTile>
          )}
          {topEngaged && (
            <BentoTile>
              <div className="flex h-full flex-col">
                <div className="label-caps text-[10px] text-muted-foreground">Engagement leader</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <PlatformBadge platform={topEngaged.platform} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{topEngaged.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">@{topEngaged.handle}</div>
                  </div>
                </div>
                <div className="mt-auto flex items-baseline gap-2 pt-3">
                  <span className="num-display text-xl font-bold tabular-nums">{topEngaged.engagementRate.toFixed(1)}%</span>
                  <span className="text-[10px] text-muted-foreground">engagement</span>
                </div>
              </div>
            </BentoTile>
          )}
          {topPoster && (
            <BentoTile>
              <div className="flex h-full flex-col">
                <div className="label-caps text-[10px] text-muted-foreground">Most active</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <PlatformBadge platform={topPoster.platform} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{topPoster.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">@{topPoster.handle}</div>
                  </div>
                </div>
                <div className="mt-auto flex items-baseline gap-2 pt-3">
                  <span className="num-display text-xl font-bold tabular-nums">{topPoster.postingFreq.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground">posts / week</span>
                </div>
              </div>
            </BentoTile>
          )}
          <BentoTile>
            <div className="flex h-full flex-col">
              <div className="label-caps text-[10px] text-muted-foreground">Coverage</div>
              <div className="mt-1.5 text-sm text-muted-foreground">
                {platformsTracked} {platformsTracked === 1 ? "platform" : "platforms"} · {trackingCount} active
              </div>
              {hasOurAccounts && ourFollowers > 0 && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Your top: <span className="font-semibold text-foreground">{fmt(ourFollowers)}</span>
                </div>
              )}
              <div className="mt-auto flex items-baseline gap-2 pt-3">
                <span className="num-display text-xl font-bold tabular-nums">{fmt(totalReach)}</span>
                <span className="text-[10px] text-muted-foreground">combined reach</span>
              </div>
            </div>
          </BentoTile>
        </BentoGrid>
      )}

      {/* Filter pills + All-competitors dense list */}
      <SectionHeader
        title="All competitors"
        desc="Sorted by followers · inline trend"
        icon={Users}
        action={
          <div className="flex items-center gap-1.5">
            <FilterPill
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              label="All"
              count={sorted.length}
            />
            <FilterPill
              active={statusFilter === "tracking"}
              onClick={() => setStatusFilter("tracking")}
              label="Tracking"
              count={sorted.filter((c) => c.status === "tracking").length}
            />
            <FilterPill
              active={statusFilter === "paused"}
              onClick={() => setStatusFilter("paused")}
              label="Paused"
              count={sorted.filter((c) => c.status === "paused").length}
            />
          </div>
        }
      />

      <div className="glass overflow-hidden rounded-xl">
        {empty ? (
          <div className="px-4 py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm font-semibold">No competitors yet</p>
            <p className="text-xs text-muted-foreground">
              Add your first rival account to start benchmarking.
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="liquid-pill mx-auto mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Add competitor
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No competitors match this filter.
          </div>
        ) : (
          filtered.map((c) => {
            const spark =
              c.series.length > 1
                ? c.series.map((s) => s.followers)
                : undefined;
            const profileUrl = platformProfileUrl(c.platform, c.handle);
            const ahead = hasOurAccounts && c.followers >= ourFollowers;
            const diff = hasOurAccounts
              ? Math.abs(c.followers - ourFollowers)
              : 0;
            return (
              <ListRow key={c.id}>
                <PlatformBadge platform={c.platform} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{c.name}</span>
                    {c.status === "tracking" ? (
                      <Pill color="green">
                        <Play className="h-2.5 w-2.5" />
                        tracking
                      </Pill>
                    ) : (
                      <Pill color="neutral">
                        <Pause className="h-2.5 w-2.5" />
                        paused
                      </Pill>
                    )}
                    {c.notes && (
                      <span
                        title={c.notes}
                        className="hidden items-center gap-0.5 text-[10px] text-muted-foreground/70 sm:inline-flex"
                      >
                        <StickyNote className="h-2.5 w-2.5" />
                        note
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">@{c.handle}</div>
                </div>

                <div className="hidden flex-col items-end text-right sm:flex min-w-[72px]">
                  <span className="text-sm font-bold tabular-nums">{fmt(c.followers)}</span>
                  <span className="text-[10px] text-muted-foreground">followers</span>
                </div>

                <div className="hidden flex-col items-end text-right md:flex min-w-[64px]">
                  <span className="text-sm font-semibold tabular-nums">{c.engagementRate.toFixed(1)}%</span>
                  <span className="text-[10px] text-muted-foreground">engagement</span>
                </div>

                <div className="hidden flex-col items-end text-right lg:flex min-w-[56px]">
                  <span className="text-sm font-semibold tabular-nums">{c.postingFreq.toFixed(1)}</span>
                  <span className="text-[10px] text-muted-foreground">posts/wk</span>
                </div>

                {hasOurAccounts && ourFollowers > 0 && (
                  <div className="hidden flex-col items-end text-right xl:flex min-w-[80px]">
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        ahead ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"
                      )}
                    >
                      {ahead ? "+" : "−"}{fmt(diff)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">vs us</span>
                  </div>
                )}

                <DeltaBadge delta={Number(c.growthRate.toFixed(1))} />

                {spark && (
                  <Sparkline
                    data={spark}
                    color={c.growthRate >= 0 ? "oklch(0.76 0.18 145)" : "var(--primary)"}
                    width={56}
                    height={20}
                  />
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label={`Actions for ${c.name}`}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => handleAnalyze(c)}
                      disabled={!!analyzingId}
                    >
                      {analyzingId === c.id ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Microscope className="mr-2 h-3.5 w-3.5" />
                      )}
                      {analyzingId === c.id ? "Analyzing…" : "Deep analyze"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setEditing(c)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        patchCompetitor(
                          c.id,
                          { status: c.status === "tracking" ? "paused" : "tracking" },
                          reload,
                        )
                      }
                    >
                      {c.status === "paused" ? (
                        <>
                          <Play className="mr-2 h-3.5 w-3.5" /> Resume tracking
                        </>
                      ) : (
                        <>
                          <Pause className="mr-2 h-3.5 w-3.5" /> Pause tracking
                        </>
                      )}
                    </DropdownMenuItem>
                    {profileUrl && (
                      <DropdownMenuItem
                        onSelect={() => window.open(profileUrl, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> View on {PLATFORMS[c.platform].name}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-rose-500 focus:text-rose-500"
                      onSelect={() => deleteCompetitor(c.id, c.name, reload)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ListRow>
            );
          })
        )}
      </div>

      <EditCompetitorDialog
        competitor={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />

      <AnalysisDialog
        analysis={analysis}
        analyzingId={analyzingId}
        onClose={() => setAnalysis(null)}
      />
    </div>
  );
}

// ============================================================================
// CRUD helpers — unchanged behaviour, preserved verbatim.
// ============================================================================

async function patchCompetitor(
  id: string,
  patch: Partial<Pick<Competitor, "name" | "handle" | "platform" | "notes" | "status">>,
  reload: () => void,
) {
  try {
    const res = await fetch(`/api/competitors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Failed");
    toast.success("Competitor updated");
    reload();
  } catch {
    toast.error("Could not update competitor");
  }
}

async function deleteCompetitor(
  id: string,
  name: string,
  reload: () => void,
) {
  try {
    const res = await fetch(`/api/competitors/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    toast.success("Competitor removed", { description: name });
    reload();
  } catch {
    toast.error("Could not delete competitor");
  }
}

// ============================================================================
// Add-competitor dialog form — preserved verbatim.
// ============================================================================

function AddCompetitorForm({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
}) {
  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [platform, setPlatform] = React.useState<PlatformId>("instagram");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!name.trim() || !handle.trim()) {
      toast.error("Name and handle are required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          handle: handle.trim().replace(/^@/, ""),
          platform,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      toast.success("Competitor added");
      setName("");
      setHandle("");
      setNotes("");
      onDone();
    } catch {
      toast.error("Could not add competitor");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="c-name">Name</Label>
        <Input
          id="c-name"
          placeholder="e.g. Acme Studio"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="c-handle">Handle</Label>
          <Input
            id="c-handle"
            placeholder="@acme"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select
            value={platform}
            onValueChange={(v) => setPlatform(v as PlatformId)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_LIST.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="c-notes">Notes</Label>
        <Textarea
          id="c-notes"
          placeholder="What should the team watch for?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[80px] resize-none"
        />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <button
          onClick={submit}
          disabled={busy}
          className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {busy ? "Adding…" : "Add competitor"}
        </button>
      </DialogFooter>
    </div>
  );
}

// ============================================================================
// Edit dialog — preserved verbatim.
// ============================================================================

function EditCompetitorDialog({
  competitor,
  onClose,
  onSaved,
}: {
  competitor: Competitor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [platform, setPlatform] = React.useState<PlatformId>("instagram");
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (competitor) {
      setName(competitor.name);
      setHandle(competitor.handle);
      setPlatform(competitor.platform);
      setNotes(competitor.notes ?? "");
    }
  }, [competitor]);

  const submit = async () => {
    if (!competitor) return;
    if (!name.trim() || !handle.trim()) {
      toast.error("Name and handle are required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/competitors/${competitor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          handle: handle.trim().replace(/^@/, ""),
          platform,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Competitor updated");
      onSaved();
    } catch {
      toast.error("Could not update competitor");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!competitor} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit competitor
          </DialogTitle>
          <DialogDescription>
            Update the rival&apos;s profile details. Tracking status and notes can be changed here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ce-name">Name</Label>
            <Input
              id="ce-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ce-handle">Handle</Label>
              <Input
                id="ce-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as PlatformId)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_LIST.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ce-notes">Notes</Label>
            <Textarea
              id="ce-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <button
            onClick={submit}
            disabled={busy}
            className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" />
            {busy ? "Saving…" : "Save changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Local primitives — FilterPill kept (used for status filter, distinct from
// dense-ui's tag-style Pill).
// ============================================================================

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
        active
          ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[9px] tabular-nums",
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted-foreground/15 text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// Skeleton — trimmed to match the new dense layout.
// ============================================================================

function CompetitorsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-10 rounded-xl" />
      <div className="shimmer h-14 rounded-xl" />
      <div className="shimmer h-[320px] rounded-xl" />
      <div className="shimmer h-24 rounded-xl" />
      <div className="shimmer h-64 rounded-xl" />
    </div>
  );
}

// ============================================================================
// Deep Analysis dialog — renders sentiment pie + share-of-voice bar +
// content gap table + top posts list. Triggered from the row dropdown.
// ============================================================================

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "oklch(0.74 0.18 165)",
  neutral: "oklch(0.7 0.04 250)",
  negative: "oklch(0.65 0.22 25)",
};

function AnalysisDialog({
  analysis,
  analyzingId,
  onClose,
}: {
  analysis: CompetitorAnalysis | null;
  analyzingId: string | null;
  onClose: () => void;
}) {
  const open = !!analysis;
  const meta = analysis?.meta;
  const comp = analysis?.competitor;

  // Pie chart data for sentiment breakdown.
  const sentimentData = analysis
    ? [
        { name: "Positive", value: analysis.sentimentBreakdown.positive, color: SENTIMENT_COLORS.positive },
        { name: "Neutral", value: analysis.sentimentBreakdown.neutral, color: SENTIMENT_COLORS.neutral },
        { name: "Negative", value: analysis.sentimentBreakdown.negative, color: SENTIMENT_COLORS.negative },
      ].filter((d) => d.value > 0)
    : [];

  // Bar chart data for share-of-voice.
  const sovData = analysis
    ? [
        { name: comp?.name ?? "Competitor", engagement: meta?.competitorEngagement ?? 0, fill: "oklch(0.65 0.22 25)" },
        { name: "You", engagement: meta?.yourEngagement ?? 0, fill: "oklch(0.74 0.18 165)" },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5 text-primary" />
            Deep analysis
            {comp && (
              <span className="ml-2 flex items-center gap-2">
                <PlatformBadge platform={comp.platform} size={22} />
                <span className="truncate text-sm font-semibold">{comp.name}</span>
                <span className="text-xs text-muted-foreground">@{comp.handle}</span>
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {meta
              ? `${meta.postsAnalyzed} recent posts analyzed · ${meta.followers.toLocaleString()} followers`
              : "Sentiment, content gaps, and share-of-voice vs your accounts."}
          </DialogDescription>
        </DialogHeader>

        {!analysis && (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-xs text-muted-foreground">
              {analyzingId ? "Running sentiment analysis…" : "Loading…"}
            </p>
          </div>
        )}

        {analysis && (
          <div className="space-y-4">
            {/* Top KPI strip */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiTile
                label="Posts analyzed"
                value={meta?.postsAnalyzed ?? analysis.posts.length}
                accent="var(--primary)"
              />
              <KpiTile
                label="Share-of-voice"
                value={`${Math.round(analysis.shareOfVoice * 100)}%`}
                hint={analysis.shareOfVoice >= 0.5 ? "they lead" : "you lead"}
                accent={analysis.shareOfVoice >= 0.5 ? "oklch(0.65 0.22 25)" : "oklch(0.74 0.18 165)"}
              />
              <KpiTile
                label="Positive"
                value={analysis.sentimentBreakdown.positive}
                accent={SENTIMENT_COLORS.positive}
              />
              <KpiTile
                label="Content gaps"
                value={analysis.contentGaps.length}
                accent="oklch(0.78 0.18 75)"
              />
            </div>

            {/* Two-column charts: sentiment pie + share-of-voice bar */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Sentiment breakdown pie */}
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Sentiment breakdown
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {analysis.posts.length} posts
                  </span>
                </div>
                {sentimentData.length === 0 ? (
                  <div className="grid h-[180px] place-items-center text-xs text-muted-foreground">
                    No sentiment data
                  </div>
                ) : (
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sentimentData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          innerRadius={32}
                          isAnimationActive={false}
                        >
                          {sentimentData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            fontSize: 11,
                          }}
                        />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: 10 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Share-of-voice bar */}
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Share-of-voice
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    weighted engagement
                  </span>
                </div>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sovData}
                      layout="vertical"
                      margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => fmt(Number(v))}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={84}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 11,
                        }}
                        formatter={(v: number) => [fmt(Number(v)), "Engagement"]}
                      />
                      <Bar dataKey="engagement" radius={[6, 6, 6, 6]} isAnimationActive={false}>
                        {sovData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    Competitor:{" "}
                    <span className="font-bold tabular-nums">
                      {fmt(meta?.competitorEngagement ?? 0)}
                    </span>
                  </span>
                  <span>
                    You:{" "}
                    <span className="font-bold tabular-nums">
                      {fmt(meta?.yourEngagement ?? 0)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Content gaps table */}
            <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <Lightbulb className="h-3 w-3 text-amber-500" />
                Content gaps — topics they cover that you don&apos;t
              </div>
              {analysis.contentGaps.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No content gaps detected — your topic coverage matches the competitor&apos;s.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/30">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/40 bg-muted/30">
                        <TableHead className="h-8 text-[10px] uppercase text-muted-foreground">Topic</TableHead>
                        <TableHead className="h-8 text-right text-[10px] uppercase text-muted-foreground">Competitor posts</TableHead>
                        <TableHead className="h-8 text-right text-[10px] uppercase text-muted-foreground">Your posts</TableHead>
                        <TableHead className="h-8 text-right text-[10px] uppercase text-muted-foreground">Gap</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.contentGaps.map((g) => (
                        <TableRow key={g.topic} className="border-border/30">
                          <TableCell className="py-2 text-xs font-semibold">
                            #{g.topic}
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs font-bold tabular-nums">
                            {g.competitorPosts}
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs tabular-nums text-muted-foreground">
                            {g.yourPosts}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                              <TrendingDown className="h-2.5 w-2.5" />
                              {g.competitorPosts} post{g.competitorPosts === 1 ? "" : "s"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Top performing posts */}
            <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                Top performing posts
              </div>
              {analysis.topPosts.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  No posts stored — run &quot;Sync now&quot; to fetch the competitor&apos;s recent posts.
                </div>
              ) : (
                <div className="scroll-liquid max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {analysis.topPosts.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/60 p-3"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-xs leading-relaxed text-foreground">
                          {p.text || "(no caption)"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          {p.sentiment && (
                            <span
                              className="rounded-md px-1.5 py-0.5 font-semibold capitalize"
                              style={{
                                background: `${SENTIMENT_COLORS[p.sentiment] ?? "var(--muted)"}20`,
                                color: SENTIMENT_COLORS[p.sentiment] ?? "var(--muted-foreground)",
                              }}
                            >
                              {p.sentiment}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5" />
                            {fmt(p.likes)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <MessageCircle className="h-2.5 w-2.5" />
                            {fmt(p.comments)}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Share2 className="h-2.5 w-2.5" />
                            {fmt(p.shares)}
                          </span>
                          <span className="ml-auto">
                            {new Date(p.postedAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: `${accent}30`, background: `${accent}08` }}
    >
      <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className="num-display mt-1 text-lg font-bold tabular-nums"
        style={{ color: accent }}
      >
        {typeof value === "number" ? fmt(value) : value}
      </div>
      {hint && <div className="text-[9px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
