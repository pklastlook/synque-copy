"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Users,
  Crosshair,
  Megaphone,
  Settings2,
  Plus,
  Sparkles,
  FileText,
  CalendarClock,
  Layers,
  Download,
  Clock,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Play,
  Wand2,
  CheckCircle2,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
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
import { cn } from "@/lib/utils";

type ReportType = "performance" | "audience" | "campaign" | "competitor" | "custom";

interface Report {
  id: string;
  name: string;
  type: ReportType;
  description: string | null;
  config: string;
  schedule: string | null;
  createdByName: string;
  lastGenerated: string | null;
  createdAt: string;
}

interface AccountOption {
  id: string;
  platform: import("@/lib/platforms").PlatformId;
  handle: string;
  displayName: string;
}

interface ReportConfig {
  metrics?: string[];
  dateRange?: string;
  accounts?: string;
  groupBy?: string;
}

const TYPE_META: Record<
  ReportType,
  { icon: React.ElementType; label: string; color: string }
> = {
  performance: { icon: BarChart3, label: "Performance", color: "var(--primary)" },
  audience: { icon: Users, label: "Audience", color: "oklch(0.74 0.18 165)" },
  competitor: { icon: Crosshair, label: "Competitor", color: "oklch(0.66 0.22 305)" },
  campaign: { icon: Megaphone, label: "Campaign", color: "oklch(0.78 0.18 75)" },
  custom: { icon: Settings2, label: "Custom", color: "oklch(0.76 0.18 145)" },
};

const METRIC_OPTIONS = [
  "impressions",
  "reach",
  "engagement",
  "followers",
  "likes",
  "comments",
  "shares",
  "saves",
] as const;

const DATE_RANGES = ["7d", "14d", "30d", "90d"] as const;
const SCHEDULES = ["none", "daily", "weekly", "monthly"] as const;

const TEMPLATES: Array<{
  name: string;
  desc: string;
  type: ReportType;
  accent: string;
  icon: React.ElementType;
  metrics: string[];
  dateRange?: string;
  schedule?: "daily" | "weekly" | "monthly";
  groupBy?: string;
}> = [
  {
    name: "Monthly Performance",
    desc: "All-account overview of impressions, reach & engagement for the last 30 days.",
    type: "performance",
    accent: "var(--primary)",
    icon: BarChart3,
    metrics: ["impressions", "reach", "engagement", "followers"],
    dateRange: "30d",
    schedule: "monthly",
  },
  {
    name: "Audience Growth",
    desc: "Track follower growth and reach trends across platforms, week over week.",
    type: "audience",
    accent: "oklch(0.74 0.18 165)",
    icon: Users,
    metrics: ["followers", "reach"],
    dateRange: "30d",
    schedule: "weekly",
  },
  {
    name: "Competitor Benchmark",
    desc: "Compare follower count and engagement against your top competitors.",
    type: "competitor",
    accent: "oklch(0.66 0.22 305)",
    icon: Crosshair,
    metrics: ["followers", "engagement"],
    dateRange: "90d",
    schedule: "weekly",
  },
  {
    name: "Campaign ROI",
    desc: "Engagement, reach and shares for an active campaign — export-ready.",
    type: "campaign",
    accent: "oklch(0.78 0.18 75)",
    icon: Megaphone,
    metrics: ["engagement", "reach", "shares"],
    dateRange: "30d",
  },
  {
    name: "Team Productivity",
    desc: "Posts published per teammate with engagement attribution.",
    type: "custom",
    accent: "oklch(0.76 0.18 145)",
    icon: Settings2,
    metrics: ["engagement"],
    groupBy: "author",
    schedule: "weekly",
  },
];

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
} as const;

export function ReportsView() {
  const { data, loading, reload } = useApi<Report[]>("/api/reports");
  const { data: accounts } = useApi<AccountOption[]>("/api/accounts");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  // Local override map so "Generate" reflects an optimistic lastGenerated update.
  const [genOverride, setGenOverride] = React.useState<Record<string, string>>({});

  const reports = data ?? [];
  const selected = reports.find((r) => r.id === selectedId) ?? null;
  const selectedGenerated = selected
    ? genOverride[selected.id] ?? selected.lastGenerated
    : null;

  const totals = React.useMemo(() => {
    const scheduled = reports.filter((r) => r.schedule).length;
    const types = new Set(reports.map((r) => r.type)).size;
    const now = new Date();
    const dayMs = 86_400_000;
    const weekAgo = new Date(now.getTime() - 7 * dayMs);
    const generatedThisWeek = reports.filter(
      (r) => (genOverride[r.id] ?? r.lastGenerated) && new Date(genOverride[r.id] ?? r.lastGenerated!) >= weekAgo,
    ).length;
    return {
      total: reports.length,
      scheduled,
      types,
      generatedThisWeek,
    };
  }, [reports, genOverride]);

  const handleCreateFromTemplate = async (tpl: (typeof TEMPLATES)[number]) => {
    const config: ReportConfig = {
      metrics: tpl.metrics,
      ...(tpl.dateRange ? { dateRange: tpl.dateRange } : {}),
      accounts: "all",
      ...(tpl.groupBy ? { groupBy: tpl.groupBy } : {}),
    };
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tpl.name,
          type: tpl.type,
          description: tpl.desc,
          config: JSON.stringify(config),
          schedule: tpl.schedule ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Created report from "${tpl.name}"`);
      reload();
    } catch {
      toast.error("Could not create report");
    }
  };

  if (loading || !data) return <ReportsSkeleton />;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <FileText className="h-3.5 w-3.5" />
              Reports · Build &amp; schedule
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Custom <span className="retaina-text">reports</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totals.total}</span> reports ·{" "}
              <span className="font-semibold text-foreground">{totals.scheduled}</span> scheduled ·{" "}
              <span className="font-semibold text-foreground">{totals.generatedThisWeek}</span> generated this week.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            New report
          </button>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total reports"
          value={totals.total}
          icon={<FileText className="h-5 w-5" />}
          accent="var(--primary)"
          hint="in your workspace"
        />
        <KpiCard
          label="Scheduled"
          value={totals.scheduled}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="auto-generated"
        />
        <KpiCard
          label="Generated this week"
          value={totals.generatedThisWeek}
          icon={<Clock className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="last 7 days"
        />
        <KpiCard
          label="Report types"
          value={totals.types}
          icon={<Layers className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="across categories"
        />
      </div>

      {/* Templates */}
      <GlassCard className="p-5">
        <SectionTitle
          title="Templates"
          desc="Start from a pre-built report. One click and it's saved to your workspace."
          action={<Sparkles className="h-4 w-4 text-primary" />}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.name}
                onClick={() => handleCreateFromTemplate(tpl)}
                className="group glass-sheen relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/40 bg-background/40 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-40"
                  style={{ background: tpl.accent }}
                />
                <div className="relative flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-md"
                    style={{ background: tpl.accent }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{tpl.name}</div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {TYPE_META[tpl.type].label}
                    </div>
                  </div>
                </div>
                <p className="relative line-clamp-3 text-xs text-muted-foreground">{tpl.desc}</p>
                <div className="relative mt-auto flex flex-wrap gap-1.5">
                  {tpl.metrics.slice(0, 3).map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {m}
                    </span>
                  ))}
                  {tpl.metrics.length > 3 && (
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      +{tpl.metrics.length - 3}
                    </span>
                  )}
                  {tpl.schedule && (
                    <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {tpl.schedule}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Existing reports grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            lastGeneratedOverride={genOverride[r.id] ?? null}
            selected={selectedId === r.id}
            onSelect={() => setSelectedId(r.id)}
            onGenerate={() => {
              const nowIso = new Date().toISOString();
              setGenOverride((m) => ({ ...m, [r.id]: nowIso }));
              toast.success("Generating report…");
            }}
            onDuplicate={() => toast.success("Report duplicated")}
            onDelete={() => toast.success("Report deleted")}
          />
        ))}
        {reports.length === 0 && (
          <GlassCard className="col-span-full p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm font-medium">No reports yet</p>
            <p className="text-xs text-muted-foreground">
              Use a template above or create a new report to get started.
            </p>
          </GlassCard>
        )}
      </div>

      {/* Preview panel */}
      {selected && (
        <ReportPreview report={selected} lastGenerated={selectedGenerated} />
      )}

      <CreateReportDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        accounts={accounts ?? []}
        onCreated={() => {
          setCreateOpen(false);
          reload();
        }}
      />
    </div>
  );
}

function ReportCard({
  report,
  lastGeneratedOverride,
  selected,
  onSelect,
  onGenerate,
  onDuplicate,
  onDelete,
}: {
  report: Report;
  lastGeneratedOverride: string | null;
  selected: boolean;
  onSelect: () => void;
  onGenerate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[report.type];
  const Icon = meta.icon;
  const scheduleText = scheduleLabel(report.schedule);
  const lastGen = lastGeneratedOverride ?? report.lastGenerated;

  let config: ReportConfig = {};
  try {
    config = JSON.parse(report.config) as ReportConfig;
  } catch {
    config = {};
  }

  return (
    <GlassCard
      hover
      className={cn(
        "glass-sheen relative flex flex-col overflow-hidden p-5 transition-all",
        selected && "ring-2 ring-primary",
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl"
        style={{ background: meta.color }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <button onClick={onSelect} className="flex min-w-0 items-center gap-3 text-left">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md"
            style={{ background: meta.color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight">{report.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {meta.label}
            </div>
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Report actions"
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => toast.info("Edit report (mock)")}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-rose-500 focus:text-rose-500"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="relative mt-3 line-clamp-2 min-h-[2.25rem] text-xs text-muted-foreground">
        {report.description ?? "No description."}
      </p>

      {/* Schedule + meta row */}
      <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
        {scheduleText && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <CalendarClock className="h-2.5 w-2.5" /> {scheduleText}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {lastGen ? `Generated ${timeAgo(lastGen)}` : "Never generated"}
        </span>
        {config.dateRange && (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            <Hash className="h-2.5 w-2.5" /> {config.dateRange}
          </span>
        )}
      </div>

      {config.metrics && config.metrics.length > 0 && (
        <div className="relative mt-2 flex flex-wrap gap-1">
          {config.metrics.slice(0, 4).map((m) => (
            <span
              key={m}
              className="rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      <div className="relative mt-3 flex items-center gap-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
        <NameAvatar name={report.createdByName} className="h-6 w-6 text-[9px]" />
        <span className="truncate">{report.createdByName}</span>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-2">
        <button
          onClick={onGenerate}
          className="liquid-pill flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold"
        >
          <Play className="h-3 w-3" /> Generate
        </button>
        <button
          onClick={() => toast.success("Downloading PDF…")}
          className="flex items-center justify-center gap-1 rounded-xl bg-muted/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Download className="h-3 w-3" />
        </button>
        <button
          onClick={() => toast.info("Schedule updated (mock)")}
          className="flex items-center justify-center gap-1 rounded-xl bg-muted/50 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <CalendarClock className="h-3 w-3" />
        </button>
      </div>
    </GlassCard>
  );
}

function ReportPreview({
  report,
  lastGenerated,
}: {
  report: Report;
  lastGenerated: string | null;
}) {
  const meta = TYPE_META[report.type];
  const Icon = meta.icon;

  let config: ReportConfig = {};
  try {
    config = JSON.parse(report.config) as ReportConfig;
  } catch {
    config = {};
  }

  // Build a deterministic mock series from the report id.
  const series = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < report.id.length; i++) h = report.id.charCodeAt(i) + ((h << 5) - h);
    const days = config.dateRange === "7d" ? 7 : config.dateRange === "14d" ? 14 : config.dateRange === "90d" ? 30 : 30;
    const out: { date: string; value: number }[] = [];
    const now = Date.now();
    for (let i = days - 1; i >= 0; i--) {
      const wave = Math.sin((i + h) * 0.6) * 18 + Math.cos((i + h) * 0.3) * 9;
      const trend = ((days - i) / days) * 30;
      out.push({
        date: new Date(now - i * 86_400_000).toISOString().slice(0, 10),
        value: Math.max(20, Math.round(80 + wave + trend + (Math.abs(h) % 30))),
      });
    }
    return out;
  }, [report.id, config.dateRange]);

  const metricRows = (config.metrics && config.metrics.length > 0
    ? config.metrics
    : ["impressions", "reach", "engagement", "followers"]
  ).slice(0, 5);

  return (
    <GlassCard className="animate-rise overflow-hidden p-5">
      <SectionTitle
        title={report.name}
        desc={`${meta.label} report · ${config.dateRange ?? "30d"} range · ${lastGenerated ? `Generated ${timeAgo(lastGenerated)}` : "Not generated yet"}`}
        action={
          <div
            className="flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow"
            style={{ background: meta.color }}
          >
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {metricRows[0] ?? "value"} trend
              </span>
              <span className="text-[11px] font-semibold text-emerald-500">
                +{((series[series.length - 1]?.value ?? 0) - (series[0]?.value ?? 0)) / Math.max(1, series[0]?.value ?? 1) > 0 ? "+" : ""}
                {Math.round(
                  (((series[series.length - 1]?.value ?? 0) - (series[0]?.value ?? 0)) /
                    Math.max(1, series[0]?.value ?? 1)) *
                    100,
                )}
                %
              </span>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: -16, right: 4, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={meta.color} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) =>
                      new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                    }
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.max(0, Math.floor(series.length / 6))}
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
                    labelFormatter={(d) =>
                      new Date(d).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                    formatter={(v: number) => [fmt(v), "Value"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={meta.color}
                    strokeWidth={2.5}
                    fill="url(#prevGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-background/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Metrics snapshot
          </div>
          <div className="space-y-1.5">
            {metricRows.map((m, i) => {
              const base = 40 + (i * 7 + (report.id.charCodeAt(0) % 5)) * 12;
              const prev = Math.max(10, base - 8);
              const delta = Math.round(((base - prev) / prev) * 100);
              return (
                <div
                  key={m}
                  className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2 text-xs"
                >
                  <span className="capitalize text-muted-foreground">{m}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">{fmt(base * 1000)}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        delta >= 0
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-rose-500/15 text-rose-500",
                      )}
                    >
                      {delta >= 0 ? "+" : ""}
                      {delta}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function CreateReportDialog({
  open,
  onOpenChange,
  accounts,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: AccountOption[];
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ReportType>("performance");
  const [description, setDescription] = React.useState("");
  const [metrics, setMetrics] = React.useState<string[]>(["impressions", "engagement"]);
  const [dateRange, setDateRange] = React.useState<string>("30d");
  const [schedule, setSchedule] = React.useState<string>("none");
  const [accountsFilter, setAccountsFilter] = React.useState<string>("all");
  const [submitting, setSubmitting] = React.useState(false);

  const toggleMetric = (m: string) => {
    setMetrics((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    );
  };

  const reset = () => {
    setName("");
    setType("performance");
    setDescription("");
    setMetrics(["impressions", "engagement"]);
    setDateRange("30d");
    setSchedule("none");
    setAccountsFilter("all");
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Report name is required");
      return;
    }
    if (metrics.length === 0) {
      toast.error("Pick at least one metric");
      return;
    }
    setSubmitting(true);
    const config: ReportConfig = {
      metrics,
      dateRange,
      accounts: accountsFilter,
    };
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          description: description.trim() || null,
          config: JSON.stringify(config),
          schedule: schedule === "none" ? null : schedule,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Report created");
      reset();
      onCreated();
    } catch {
      toast.error("Could not create report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> New report
          </DialogTitle>
          <DialogDescription>
            Configure the metrics, range, and schedule for your custom report.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto scroll-liquid pr-1">
          <div className="space-y-2">
            <Label htmlFor="r-name">Report name</Label>
            <Input
              id="r-name"
              placeholder="e.g. Q3 Instagram performance"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_META) as ReportType[]).map((t) => {
                    const M = TYPE_META[t];
                    return (
                      <SelectItem key={t} value={t}>
                        {M.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((d) => (
                    <SelectItem key={d} value={d}>
                      Last {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              placeholder="What does this report show?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Metrics</Label>
            <div className="flex flex-wrap gap-2">
              {METRIC_OPTIONS.map((m) => {
                const active = metrics.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMetric(m)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "none" ? "No schedule" : s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Accounts</Label>
              <Select value={accountsFilter} onValueChange={setAccountsFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-muted/50 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {submitting ? "Creating…" : "Create report"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function scheduleLabel(s: string | null): string | null {
  if (!s) return null;
  if (s === "daily") return "Daily";
  if (s === "weekly") return "Weekly on Mon";
  if (s === "monthly") return "Monthly on 1st";
  return s;
}

function ReportsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-48 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-56 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
