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
  Plus,
  Crosshair,
  Pause,
  Play,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  StickyNote,
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

  // Dense MetricRow — replaces the old 4-tall KpiCard strip.
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
          <button
            onClick={() => setAddOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add competitor
          </button>
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
