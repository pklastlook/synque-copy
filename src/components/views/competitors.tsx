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
} from "recharts";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Plus,
  Crosshair,
  Pause,
  Play,
  ArrowRight,
  Sparkles,
  ArrowUpDown,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import {
  PlatformBadge,
  PlatformPill,
} from "@/components/glass/platform-badge";
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

export function CompetitorsView() {
  const { data, loading, reload } = useApi<Competitor[]>("/api/competitors");
  const { data: accounts } = useApi<AccountInfo[]>("/api/accounts");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Competitor | null>(null);

  if (loading || !data) return <CompetitorsSkeleton />;

  // Our top account's followers — used for honest benchmarking.
  const ourFollowers = accounts && accounts.length > 0
    ? Math.max(...accounts.map((a) => a.followers))
    : 0;

  const sorted = [...data].sort((a, b) => b.followers - a.followers);
  const filtered =
    statusFilter === "all"
      ? sorted
      : sorted.filter((c) => c.status === statusFilter);

  // Top 4 for the line chart
  const top = sorted.slice(0, 4);

  // Build a merged dataset keyed by date
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

  // KPIs
  const totalReach = sorted.reduce((s, c) => s + c.followers, 0);
  const avgEng =
    sorted.length > 0
      ? sorted.reduce((s, c) => s + c.engagementRate, 0) / sorted.length
      : 0;
  const avgGrowth =
    sorted.length > 0
      ? sorted.reduce((s, c) => s + c.growthRate, 0) / sorted.length
      : 0;

  return (
    <div className="animate-rise space-y-5">
      <HelpText module="competitors"><strong className="text-foreground">Competitors</strong> benchmarks your performance against rival accounts. Add a competitor to compare growth and engagement.</HelpText>
      {/* Hero */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Crosshair className="h-3.5 w-3.5" />
              Listening · Competitive benchmark
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Competitors
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Track rival accounts across every platform you publish on.
              Compare follower growth, engagement, posting cadence and{" "}
              <span className="font-medium text-foreground">
                benchmark against your own top profile
              </span>
              .
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add competitor
          </button>
        </div>
      </GlassCard>

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

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Competitors tracked"
          value={sorted.length}
          icon={<Crosshair className="h-5 w-5" />}
          accent="var(--primary)"
          hint={`${sorted.filter((c) => c.status === "tracking").length} active`}
        />
        <KpiCard
          label="Total reach"
          value={fmt(totalReach)}
          icon={<Users className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="combined followers"
        />
        <KpiCard
          label="Avg engagement"
          value={`${avgEng.toFixed(1)}%`}
          icon={<Activity className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="across tracked rivals"
        />
        <KpiCard
          label="Avg growth"
          value={`${avgGrowth >= 0 ? "+" : ""}${avgGrowth.toFixed(1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="follower growth rate"
        />
      </div>

      {/* Comparison chart */}
      <GlassCard className="p-5">
        <SectionTitle
          title="Follower growth"
          desc="Top 4 competitors by audience size over time"
          action={
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              {top.map((c, i) => (
                <span
                  key={c.id}
                  className="flex items-center gap-1.5"
                >
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
        />
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
      </GlassCard>

      {/* Comparison table */}
      <GlassCard className="p-5">
        <SectionTitle
          title="Comparison table"
          desc="Sortable by followers — click to invert"
          action={
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ArrowUpDown className="h-3 w-3" /> sorted by followers
            </span>
          }
        />
        <div className="max-h-[460px] overflow-y-auto scroll-liquid">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Competitor</th>
                <th className="px-3 py-2 text-right font-medium">Followers</th>
                <th className="px-3 py-2 text-right font-medium">Engagement</th>
                <th className="px-3 py-2 text-right font-medium">Growth</th>
                <th className="px-3 py-2 text-right font-medium">Posts/wk</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const growthUp = c.growthRate >= 0;
                return (
                  <tr
                    key={c.id}
                    className="border-t border-border/40 transition hover:bg-muted/40"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <PlatformBadge platform={c.platform} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {c.name}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            @{c.handle}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {fmt(c.followers)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {c.engagementRate.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          growthUp
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {growthUp ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(c.growthRate).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {c.postingFreq.toFixed(1)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                          c.status === "tracking"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {c.status === "tracking" ? (
                          <Play className="h-3 w-3" />
                        ) : (
                          <Pause className="h-3 w-3" />
                        )}
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-xl"
                        onClick={() => {
                          const url = platformProfileUrl(c.platform, c.handle);
                          if (url) {
                            window.open(url, "_blank", "noopener,noreferrer");
                          } else {
                            toast.info(`No profile URL for ${PLATFORMS[c.platform].name}`);
                          }
                        }}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    No competitors match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Status filter pills */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* Detail cards grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((c) => (
          <CompetitorCard
            key={c.id}
            competitor={c}
            ourFollowers={ourFollowers}
            hasOurAccounts={!!accounts && accounts.length > 0}
            onEdit={() => setEditing(c)}
            onToggleStatus={() =>
              patchCompetitor(
                c.id,
                { status: c.status === "tracking" ? "paused" : "tracking" },
                reload,
              )
            }
            onDelete={() => deleteCompetitor(c.id, c.name, reload)}
          />
        ))}
        {filtered.length === 0 && (
          <GlassCard className="col-span-full p-10 text-center text-sm text-muted-foreground">
            No competitors match this filter.
          </GlassCard>
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
    </div>
  );
}

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

function CompetitorCard({
  competitor,
  ourFollowers,
  hasOurAccounts,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  competitor: Competitor;
  ourFollowers: number;
  hasOurAccounts: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const growthUp = competitor.growthRate >= 0;
  const sparkColor = growthUp ? "oklch(0.76 0.18 145)" : "var(--primary)";
  const series = competitor.series.length
    ? competitor.series
    : [
        { date: new Date().toISOString().slice(0, 10), followers: competitor.followers, engagement: 0, posts: 0 },
      ];
  const profileUrl = platformProfileUrl(competitor.platform, competitor.handle);
  const benchmarkPct =
    hasOurAccounts && ourFollowers > 0 && competitor.followers > 0
      ? Math.min(100, Math.round((competitor.followers / ourFollowers) * 100))
      : 0;
  const ahead = hasOurAccounts && competitor.followers >= ourFollowers;

  return (
    <GlassCard hover className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <PlatformBadge platform={competitor.platform} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold leading-tight">
              {competitor.name}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                competitor.status === "tracking"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {competitor.status === "tracking" ? (
                <Play className="h-2.5 w-2.5" />
              ) : (
                <Pause className="h-2.5 w-2.5" />
              )}
              {competitor.status}
            </span>
          </div>
          <PlatformPill
            platform={competitor.platform}
            handle={competitor.handle}
            className="mt-1"
          />
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-xl font-bold tabular-nums leading-none">
            {fmt(competitor.followers)}
          </div>
          <div className="text-[10px] text-muted-foreground">followers</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Actions for ${competitor.name}`}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onToggleStatus}>
                {competitor.status === "paused" ? (
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
                  <ExternalLink className="mr-2 h-3.5 w-3.5" /> View on {PLATFORMS[competitor.platform].name}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-500 focus:text-rose-500"
                onSelect={onDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-4 h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
          >
            <Line
              type="monotone"
              dataKey="followers"
              stroke={sparkColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat
          label="Engagement"
          value={`${competitor.engagementRate.toFixed(1)}%`}
        />
        <Stat
          label="Growth"
          value={`${growthUp ? "+" : ""}${competitor.growthRate.toFixed(1)}%`}
          tone={growthUp ? "up" : "down"}
        />
        <Stat
          label="Posts/wk"
          value={competitor.postingFreq.toFixed(1)}
        />
      </div>

      {/* Benchmark vs us */}
      <div className="mt-4 rounded-xl bg-muted/40 p-3">
        {hasOurAccounts ? (
          <>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">vs. our top account</span>
              <span
                className={cn(
                  "font-semibold",
                  ahead ? "text-rose-500" : "text-emerald-500",
                )}
              >
                {ahead ? "+" : "−"}
                {fmt(Math.abs(competitor.followers - ourFollowers))}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-[var(--gold)]"
                style={{ width: `${benchmarkPct}%` }}
              />
              <div
                className="absolute inset-y-0 w-px bg-foreground/60"
                style={{ left: "100%", transform: "translateX(-100%)" }}
                aria-hidden
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{fmt(competitor.followers)} rival</span>
              <span>{fmt(ourFollowers)} us</span>
            </div>
          </>
        ) : (
          <div className="text-[11px] text-muted-foreground">
            Connect one of your own accounts to benchmark against this rival.
          </div>
        )}
      </div>

      {/* Notes */}
      {competitor.notes && (
        <div className="mt-3 rounded-xl bg-muted/30 px-3 py-2 text-[12px] text-foreground/80">
          <span className="mr-1 text-muted-foreground">“</span>
          {competitor.notes}
          <span className="ml-0.5 text-muted-foreground">”</span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 rounded-xl"
          onClick={() => {
            if (profileUrl) {
              window.open(profileUrl, "_blank", "noopener,noreferrer");
            } else {
              toast.info(`No profile URL for ${PLATFORMS[competitor.platform].name}`);
            }
          }}
        >
          View profile <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
        <Sparkles className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
    </GlassCard>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-2.5 text-center">
      <div
        className={cn(
          "text-sm font-bold tabular-nums",
          tone === "up" && "text-emerald-600 dark:text-emerald-400",
          tone === "down" && "text-rose-600 dark:text-rose-400",
        )}
      >
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

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
        "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition",
        active
          ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px]",
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

function CompetitorsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-[340px] rounded-3xl" />
      <div className="shimmer h-72 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="shimmer h-80 rounded-3xl" />
        <div className="shimmer h-80 rounded-3xl" />
      </div>
    </div>
  );
}
