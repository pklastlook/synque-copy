"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import {
  Megaphone,
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  Archive,
  ArrowRight,
  CheckCircle2,
  FileEdit,
  Target,
  CalendarRange,
  Pause,
  Sparkles,
  Eye,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/hooks";
import { GlassCard, KpiCard } from "@/components/glass/glass-card";
import { useAuth } from "@/lib/auth-store";
import { useNav } from "@/lib/store";
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
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: "draft" | "active" | "paused" | "completed";
  objective: string | null;
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  createdAt: string;
}

type StatusFilter = "all" | "active" | "draft" | "paused" | "completed";

const COLOR_SWATCHES = [
  "#E1306C",
  "oklch(0.74 0.18 165)",
  "oklch(0.66 0.22 305)",
  "oklch(0.78 0.18 75)",
  "oklch(0.76 0.18 145)",
  "oklch(0.7 0.18 250)",
  "#F97316",
  "#14B8A6",
];

const STATUS_META: Record<
  Campaign["status"],
  { label: string; bg: string; text: string; dot: string }
> = {
  active: {
    label: "Active",
    bg: "bg-[oklch(0.76_0.18_145)]/15",
    text: "text-[oklch(0.55_0.18_145)]",
    dot: "bg-[oklch(0.55_0.18_145)]",
  },
  draft: {
    label: "Draft",
    bg: "bg-[oklch(0.78_0.18_75)]/15",
    text: "text-[oklch(0.58_0.16_75)]",
    dot: "bg-[oklch(0.58_0.16_75)]",
  },
  paused: {
    label: "Paused",
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/70",
  },
  completed: {
    label: "Completed",
    bg: "bg-[oklch(0.74_0.18_165)]/15",
    text: "text-[oklch(0.55_0.18_165)]",
    dot: "bg-[oklch(0.55_0.18_165)]",
  },
};

const OBJECTIVES: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "awareness", label: "Awareness", icon: Eye },
  { value: "engagement", label: "Engagement", icon: Heart },
  { value: "conversion", label: "Conversion", icon: Target },
  { value: "traffic", label: "Traffic", icon: ArrowRight },
];

function fmtRange(start: string | null, end: string | null) {
  const s = start && isValid(parseISO(start)) ? parseISO(start) : null;
  const e = end && isValid(parseISO(end)) ? parseISO(end) : null;
  if (!s && !e) return null;
  if (s && !e) return format(s, "MMM d, yyyy");
  if (!s && e) return `→ ${format(e, "MMM d, yyyy")}`;
  return `${format(s, "MMM d")} → ${format(e, "MMM d, yyyy")}`;
}

export function CampaignsView() {
  const { data, loading, reload } = useApi<Campaign[]>("/api/campaigns");
  const { setView } = useNav();
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = React.useState(false);

  if (loading || !data) return <CampaignsSkeleton />;

  const filtered = filter === "all" ? data : data.filter((c) => c.status === filter);

  const kpis = {
    active: data.filter((c) => c.status === "active").length,
    completed: data.filter((c) => c.status === "completed").length,
    draft: data.filter((c) => c.status === "draft").length,
    paused: data.filter((c) => c.status === "paused").length,
  };

  const filterPills: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: data.length },
    { value: "active", label: "Active", count: data.filter((c) => c.status === "active").length },
    { value: "draft", label: "Draft", count: data.filter((c) => c.status === "draft").length },
    { value: "paused", label: "Paused", count: data.filter((c) => c.status === "paused").length },
    { value: "completed", label: "Completed", count: data.filter((c) => c.status === "completed").length },
  ];

  return (
    <div className="animate-rise space-y-5">
      {/* Hero */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-40 blur-3xl"
          style={{ background: "var(--primary)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
          style={{ background: "oklch(0.74 0.18 165)" }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Campaigns
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Plan, launch &amp; track your campaigns
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{data.length}</span> campaigns ·{" "}
              <span className="font-semibold text-foreground">{kpis.active}</span> active right now
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </GlassCard>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Active campaigns"
          value={kpis.active}
          icon={<Megaphone className="h-5 w-5" />}
          accent="oklch(0.76 0.18 145)"
          hint="running now"
        />
        <KpiCard
          label="Paused"
          value={kpis.paused}
          icon={<Pause className="h-5 w-5" />}
          accent="oklch(0.72 0.18 75)"
          hint="on hold"
        />
        <KpiCard
          label="Completed"
          value={kpis.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="finished campaigns"
        />
        <KpiCard
          label="Drafts"
          value={kpis.draft}
          icon={<FileEdit className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="not yet launched"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {filterPills.map((p) => (
          <button
            key={p.value}
            onClick={() => setFilter(p.value)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition",
              filter === p.value
                ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span>{p.label}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                filter === p.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted-foreground/15 text-muted-foreground"
              )}
            >
              {p.count}
            </span>
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">No campaigns match this filter</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different status or create a new campaign.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onViewPosts={() => setView("calendar")}
            />
          ))}
        </div>
      )}

      <CreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          reload();
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

function CampaignCard({
  campaign,
  onViewPosts,
}: {
  campaign: Campaign;
  onViewPosts: () => void;
}) {
  const status = STATUS_META[campaign.status];
  const range = fmtRange(campaign.startDate, campaign.endDate);
  const objective = campaign.objective
    ? OBJECTIVES.find((o) => o.value === campaign.objective)
    : null;

  return (
    <GlassCard hover className="relative flex overflow-hidden p-5">
      {/* Colored left accent bar */}
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: campaign.color }}
      />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-15 blur-2xl"
        style={{ background: campaign.color }}
      />
      <div className="relative ml-2 flex min-w-0 flex-1 flex-col">
        {/* Top: status badge */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              status.bg,
              status.text
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Campaign actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuItem onClick={() => toast.info(`Editing "${campaign.name}"`)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success(`"${campaign.name}" duplicated`)}
              >
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-500 focus:text-rose-500"
                onClick={() => toast.error(`"${campaign.name}" archived`)}
              >
                <Archive className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Name + description */}
        <h3 className="mt-2 truncate text-base font-bold leading-tight">{campaign.name}</h3>
        {campaign.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {campaign.description}
          </p>
        ) : (
          <p className="mt-1 text-xs italic text-muted-foreground/60">No description</p>
        )}

        {/* Objective row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {objective && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1 text-[11px] font-medium text-foreground/80">
              <objective.icon className="h-3 w-3" />
              {objective.label}
            </span>
          )}
        </div>

        {/* Date range */}
        {range && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CalendarRange className="h-3 w-3" />
            <span className="truncate">{range}</span>
          </div>
        )}


        {/* Footer */}
        <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 flex-1 rounded-xl text-xs"
            onClick={onViewPosts}
          >
            View posts <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}

function CreateCampaignDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState(COLOR_SWATCHES[0]);
  const [objective, setObjective] = React.useState<string>("awareness");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setColor(COLOR_SWATCHES[0]);
    setObjective("awareness");
    setStartDate("");
    setEndDate("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          objective,
          startDate: startDate || null,
          endDate: endDate || null,
          ownerId: user?.id ?? "u-admin",
        }),
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      toast.success(`Campaign "${name.trim()}" created`);
      reset();
      onCreated();
    } catch {
      toast.error("Could not create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground"
            >
              <Megaphone className="h-4 w-4" />
            </span>
            New campaign
          </DialogTitle>
          <DialogDescription>
            Define the goals and timeline for your next campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="cmp-name">Campaign name</Label>
            <Input
              id="cmp-name"
              placeholder="Summer Launch 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="cmp-desc">Description</Label>
            <Input
              id="cmp-desc"
              placeholder="A short summary of the campaign"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Accent color</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-110"
                  )}
                  style={{ background: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Objective */}
          <div className="space-y-2">
            <Label>Objective</Label>
            <Select value={objective} onValueChange={setObjective}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <span className="flex items-center gap-2">
                      <o.icon className="h-3.5 w-3.5" />
                      {o.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cmp-start">Start date</Label>
              <Input
                id="cmp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cmp-end">End date</Label>
              <Input
                id="cmp-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {submitting ? "Creating..." : "Create campaign"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="shimmer h-9 w-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shimmer h-72 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
