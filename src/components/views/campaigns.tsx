"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import {
  Megaphone,
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Target,
  CalendarRange,
  Sparkles,
  Eye,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/hooks";
import { HelpText } from "@/components/glass/help-text";
import {
  MetricRow,
  BentoTile,
  SectionHeader,
  ListRow,
  Pill,
} from "@/components/glass/dense-ui";
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

// ============================================================================
// Types & constants
// ============================================================================

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
type PillColor = "neutral" | "green" | "amber" | "rose" | "blue" | "violet";

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

const STATUS_PILL: Record<
  Campaign["status"],
  { label: string; color: PillColor }
> = {
  active: { label: "Active", color: "green" },
  draft: { label: "Draft", color: "amber" },
  paused: { label: "Paused", color: "neutral" },
  completed: { label: "Completed", color: "blue" },
};

const OBJECTIVES: {
  value: string;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { value: "awareness", label: "Awareness", icon: Eye, color: "oklch(0.7 0.18 250)" },
  { value: "engagement", label: "Engagement", icon: Heart, color: "oklch(0.7 0.2 25)" },
  { value: "conversion", label: "Conversion", icon: Target, color: "oklch(0.7 0.18 145)" },
  { value: "traffic", label: "Traffic", icon: ArrowRight, color: "oklch(0.7 0.18 75)" },
];

function objectiveMeta(value: string | null) {
  return OBJECTIVES.find((o) => o.value === value) ?? null;
}

// ============================================================================
// Helpers
// ============================================================================

function fmtRange(start: string | null, end: string | null) {
  const s = start && isValid(parseISO(start)) ? parseISO(start) : null;
  const e = end && isValid(parseISO(end)) ? parseISO(end) : null;
  if (!s && !e) return null;
  if (s && !e) return format(s, "MMM d, yyyy");
  if (!s && e) return `→ ${format(e, "MMM d, yyyy")}`;
  return `${format(s as Date, "MMM d")} → ${format(e as Date, "MMM d, yyyy")}`;
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return format(d, "yyyy-MM-dd");
}

/**
 * Build a 6-bucket sparkline of campaign counts by `createdAt` month,
 * optionally filtered by status. Used to give the MetricRow inline trends.
 */
function makeSpark(campaigns: Campaign[], status?: Campaign["status"]): number[] {
  const now = new Date();
  const out: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    out.push(
      campaigns.filter((c) => {
        if (!c.createdAt) return false;
        const d = new Date(c.createdAt);
        if (d < start || d >= end) return false;
        if (status && c.status !== status) return false;
        return true;
      }).length,
    );
  }
  return out;
}

// ============================================================================
// Main view
// ============================================================================

export function CampaignsView() {
  const { data, loading, reload } = useApi<Campaign[]>("/api/campaigns");
  const { setView } = useNav();
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Campaign | null>(null);

  const handleDuplicate = React.useCallback(
    async (c: Campaign) => {
      try {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${c.name} (copy)`,
            description: c.description,
            color: c.color,
            objective: c.objective,
            startDate: c.startDate,
            endDate: c.endDate,
            ownerId: c.ownerId,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to duplicate");
        toast.success(`"${c.name}" duplicated`);
        reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not duplicate campaign");
      }
    },
    [reload],
  );

  const handleDelete = React.useCallback(
    async (c: Campaign) => {
      try {
        const res = await fetch(`/api/campaigns/${c.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        toast.success(`"${c.name}" deleted`);
        reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete campaign");
      }
    },
    [reload],
  );

  if (loading || !data) return <CampaignsSkeleton />;

  const filtered = filter === "all" ? data : data.filter((c) => c.status === filter);

  const counts = {
    all: data.length,
    active: data.filter((c) => c.status === "active").length,
    completed: data.filter((c) => c.status === "completed").length,
    draft: data.filter((c) => c.status === "draft").length,
    paused: data.filter((c) => c.status === "paused").length,
  };

  const metrics = [
    { label: "Total campaigns", value: counts.all, spark: makeSpark(data) },
    {
      label: "Active",
      value: counts.active,
      spark: makeSpark(data, "active"),
      color: "oklch(0.55 0.18 145)",
    },
    {
      label: "Completed",
      value: counts.completed,
      spark: makeSpark(data, "completed"),
      color: "oklch(0.55 0.18 165)",
    },
    {
      label: "Drafts",
      value: counts.draft,
      spark: makeSpark(data, "draft"),
      color: "oklch(0.6 0.16 75)",
    },
  ];

  const filterPills: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "active", label: "Active", count: counts.active },
    { value: "draft", label: "Draft", count: counts.draft },
    { value: "paused", label: "Paused", count: counts.paused },
    { value: "completed", label: "Completed", count: counts.completed },
  ];

  const statusBars: { label: string; count: number; color: string }[] = [
    { label: "Active", count: counts.active, color: "oklch(0.7 0.18 145)" },
    { label: "Draft", count: counts.draft, color: "oklch(0.78 0.18 75)" },
    { label: "Paused", count: counts.paused, color: "oklch(0.65 0.02 250)" },
    { label: "Completed", count: counts.completed, color: "oklch(0.74 0.18 165)" },
  ];

  const objBars = OBJECTIVES.map((o) => ({
    label: o.label,
    icon: o.icon,
    color: o.color,
    count: data.filter((c) => c.objective === o.value).length,
  }));

  const activeCampaigns = data.filter((c) => c.status === "active");
  const featuredActive = activeCampaigns[0] ?? null;

  return (
    <div className="animate-rise space-y-4">
      <HelpText module="campaigns">
        <strong className="text-foreground">Campaigns</strong> groups related posts to
        measure their combined impact. Create a campaign to track multi-post initiatives.
      </HelpText>

      {/* Header — compact title + desc + New Campaign action */}
      <SectionHeader
        title="Campaigns"
        desc={`${counts.all} total · ${counts.active} active · ${counts.draft} drafts · ${counts.completed} completed`}
        icon={Megaphone}
        action={
          <button
            onClick={() => setCreateOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> New campaign
          </button>
        }
      />

      {/* Dense KPI strip with inline sparklines */}
      <MetricRow metrics={metrics} />

      {/* Bento grid — 5 tiles total */}
      <div className="grid auto-rows-[minmax(120px,auto)] grid-cols-1 gap-3 lg:grid-cols-4">
        {/* Tile 1 — Campaigns list (main, wide & tall) */}
        <BentoTile className="flex flex-col overflow-hidden p-0 lg:col-span-3 lg:row-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="truncate text-sm font-bold tracking-tight">All campaigns</h3>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                {filtered.length}
              </span>
            </div>
            {/* Inline filter pills */}
            <div className="flex flex-wrap items-center gap-1">
              {filterPills.map((p) => {
                const active = filter === p.value;
                return (
                  <button
                    key={p.value}
                    onClick={() => setFilter(p.value)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {p.label}
                    <span className={cn("tabular-nums", active ? "opacity-80" : "opacity-60")}>
                      {p.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="scroll-liquid min-h-[280px] flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                <Megaphone className="h-7 w-7 text-muted-foreground/40" />
                <p className="text-sm font-medium">No campaigns match this filter</p>
                <p className="text-xs text-muted-foreground">
                  Try a different status or create a new campaign.
                </p>
              </div>
            ) : (
              filtered.map((c) => (
                <CampaignListRow
                  key={c.id}
                  campaign={c}
                  onViewPosts={() => setView("calendar")}
                  onEdit={() => setEditing(c)}
                  onDuplicate={() => handleDuplicate(c)}
                  onDelete={() => handleDelete(c)}
                />
              ))
            )}
          </div>
        </BentoTile>

        {/* Tile 2 — Status distribution */}
        <BentoTile>
          <SectionHeader title="Status" desc="Distribution" />
          <div className="space-y-2">
            {statusBars.map((s) => {
              const pct = counts.all > 0 ? (s.count / counts.all) * 100 : 0;
              return (
                <div key={s.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-bold tabular-nums">{s.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: s.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </BentoTile>

        {/* Tile 3 — Objective breakdown */}
        <BentoTile>
          <SectionHeader title="Objective" desc="Breakdown" />
          <div className="grid grid-cols-2 gap-2">
            {objBars.map((o) => (
              <div
                key={o.label}
                className="rounded-lg border border-border/30 bg-muted/30 p-2"
              >
                <div className="flex items-center gap-1.5">
                  <o.icon className="h-3 w-3" style={{ color: o.color }} />
                  <span className="truncate text-[10px] font-semibold">{o.label}</span>
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums">{o.count}</div>
              </div>
            ))}
          </div>
        </BentoTile>

        {/* Tile 4 — Featured active campaign */}
        <BentoTile hover className="lg:col-span-2">
          {featuredActive ? (
            <FeaturedCampaign
              campaign={featuredActive}
              onViewPosts={() => setView("calendar")}
              onEdit={() => setEditing(featuredActive)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-center">
              <Megaphone className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-xs font-medium text-muted-foreground">No active campaign</p>
              <p className="text-[10px] text-muted-foreground">
                Activate a campaign from the list to feature it here.
              </p>
            </div>
          )}
        </BentoTile>

        {/* Tile 5 — Quick stats */}
        <BentoTile className="lg:col-span-2">
          <SectionHeader title="Quick stats" desc="Pipeline snapshot" />
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Active share"
              value={`${counts.all > 0 ? Math.round((counts.active / counts.all) * 100) : 0}%`}
              accent="oklch(0.7 0.18 145)"
            />
            <Stat
              label="Completion rate"
              value={`${counts.all > 0 ? Math.round((counts.completed / counts.all) * 100) : 0}%`}
              accent="oklch(0.74 0.18 165)"
            />
            <Stat
              label="On hold"
              value={counts.paused}
              accent="oklch(0.78 0.18 75)"
            />
          </div>
        </BentoTile>
      </div>

      <CreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          reload();
          setCreateOpen(false);
        }}
      />

      <EditCampaignDialog
        campaign={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}

// ============================================================================
// Campaign list row — dense ListRow item
// ============================================================================

function CampaignListRow({
  campaign,
  onViewPosts,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  campaign: Campaign;
  onViewPosts: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const statusPill = STATUS_PILL[campaign.status];
  const objective = objectiveMeta(campaign.objective);
  const range = fmtRange(campaign.startDate, campaign.endDate);

  return (
    <ListRow className="group">
      {/* Color accent */}
      <div
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ background: campaign.color }}
      />

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-bold leading-tight">{campaign.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
          {objective && (
            <span className="inline-flex items-center gap-0.5">
              <objective.icon className="h-2.5 w-2.5" />
              {objective.label}
            </span>
          )}
          {range && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="inline-flex items-center gap-0.5 truncate">
                <CalendarRange className="h-2.5 w-2.5" />
                {range}
              </span>
            </>
          )}
          {!objective && !range && campaign.description && (
            <span className="truncate italic">{campaign.description}</span>
          )}
        </div>
      </div>

      {/* Status pill */}
      <Pill color={statusPill.color}>{statusPill.label}</Pill>

      {/* View posts */}
      <button
        onClick={onViewPosts}
        className="flex items-center gap-1 rounded-lg bg-muted/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-primary hover:text-primary-foreground"
        aria-label="View posts"
      >
        Posts
        <ArrowRight className="h-3 w-3" />
      </button>

      {/* Actions dropdown */}
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
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-rose-500 focus:text-rose-500"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ListRow>
  );
}

// ============================================================================
// Featured active campaign tile
// ============================================================================

function FeaturedCampaign({
  campaign,
  onViewPosts,
  onEdit,
}: {
  campaign: Campaign;
  onViewPosts: () => void;
  onEdit: () => void;
}) {
  const statusPill = STATUS_PILL[campaign.status];
  const objective = objectiveMeta(campaign.objective);
  const range = fmtRange(campaign.startDate, campaign.endDate);

  return (
    <div className="relative flex h-full flex-col gap-2 overflow-hidden">
      {/* Soft color glow */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl"
        style={{ background: campaign.color }}
      />
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3 w-3" /> Featured active
        </div>
        <Pill color={statusPill.color}>{statusPill.label}</Pill>
      </div>

      <div className="relative">
        <div className="flex items-center gap-2">
          <div
            className="h-6 w-1 rounded-full"
            style={{ background: campaign.color }}
          />
          <h3 className="truncate text-sm font-bold leading-tight">{campaign.name}</h3>
        </div>
        {campaign.description ? (
          <p className="mt-1 line-clamp-2 pl-3 text-[11px] text-muted-foreground">
            {campaign.description}
          </p>
        ) : (
          <p className="mt-1 pl-3 text-[11px] italic text-muted-foreground/60">
            No description
          </p>
        )}
      </div>

      <div className="relative mt-auto flex flex-wrap items-center gap-2 pt-2">
        {objective && (
          <span
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: `${objective.color}1a`, color: objective.color }}
          >
            <objective.icon className="h-2.5 w-2.5" />
            {objective.label}
          </span>
        )}
        {range && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <CalendarRange className="h-2.5 w-2.5" />
            <span className="truncate">{range}</span>
          </span>
        )}
      </div>

      <div className="relative flex items-center gap-2 border-t border-border/40 pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 flex-1 rounded-lg text-[11px]"
          onClick={onViewPosts}
        >
          View posts <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 rounded-lg text-[11px]"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Tiny stat block (used inside Quick stats tile)
// ============================================================================

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-border/30 bg-muted/30 p-2">
      <div
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: accent }}
      >
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

// ============================================================================
// Create dialog — preserved
// ============================================================================

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
    if (!user?.id) {
      toast.error("You must be signed in to create a campaign");
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
          ownerId: user.id,
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
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
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
                      : "border-transparent hover:scale-110",
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

// ============================================================================
// Edit dialog — preserved
// ============================================================================

function EditCampaignDialog({
  campaign,
  onOpenChange,
  onSaved,
}: {
  campaign: Campaign | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = campaign !== null;
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [color, setColor] = React.useState(COLOR_SWATCHES[0]);
  const [objective, setObjective] = React.useState<string>("awareness");
  const [status, setStatus] = React.useState<Campaign["status"]>("draft");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  // Prefill when a campaign is selected
  React.useEffect(() => {
    if (!campaign) return;
    setName(campaign.name);
    setDescription(campaign.description ?? "");
    setColor(campaign.color || COLOR_SWATCHES[0]);
    setObjective(campaign.objective ?? "awareness");
    setStatus(campaign.status);
    setStartDate(isoToDateInput(campaign.startDate));
    setEndDate(isoToDateInput(campaign.endDate));
  }, [campaign]);

  async function handleSubmit() {
    if (!campaign) return;
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          objective,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update campaign");
      toast.success(`Campaign "${name.trim()}" updated`);
      onSaved();
    } catch {
      toast.error("Could not update campaign");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Pencil className="h-4 w-4" />
            </span>
            Edit campaign
          </DialogTitle>
          <DialogDescription>
            Update the details, status, or timeline of this campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edt-name">Campaign name</Label>
            <Input
              id="edt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edt-desc">Description</Label>
            <Input
              id="edt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as Campaign["status"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                      : "border-transparent hover:scale-110",
                  )}
                  style={{ background: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edt-start">Start date</Label>
              <Input
                id="edt-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edt-end">End date</Label>
              <Input
                id="edt-end"
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
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Skeleton — matches new dense layout
// ============================================================================

function CampaignsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-9 rounded-xl" />
      <div className="shimmer h-14 rounded-xl" />
      <div className="grid auto-rows-[minmax(120px,auto)] grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="shimmer rounded-xl lg:col-span-3 lg:row-span-2" />
        <div className="shimmer rounded-xl" />
        <div className="shimmer rounded-xl" />
        <div className="shimmer rounded-xl lg:col-span-2" />
        <div className="shimmer rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}
