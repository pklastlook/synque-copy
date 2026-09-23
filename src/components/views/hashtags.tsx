"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Hash,
  Plus,
  Copy,
  Wand2,
  Sparkles,
  Tags,
  TrendingUp,
  Eye,
  Layers,
  Flame,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
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
import { Textarea } from "@/components/ui/textarea";
import type { PlatformId } from "@/lib/platforms";

// ===== API types =====
type HashtagPlatform = "all" | "instagram" | "x" | "tiktok" | "linkedin";

interface HashtagGroup {
  id: string;
  name: string;
  tags: string;
  platform: HashtagPlatform;
  usageCount: number;
  avgReach: number;
  color: string;
  tagCount: number;
  createdAt: string;
}

interface HashtagData {
  groups: HashtagGroup[];
  totalUses: number;
  totalReach: number;
}

const PLATFORM_OPTIONS: { value: HashtagPlatform; label: string }[] = [
  { value: "all", label: "All platforms" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
];

const SWATCHES = [
  "#E1306C",
  "#9b51e0",
  "#2d9cdb",
  "#27ae60",
  "#f2994a",
  "#eb5757",
  "#0EA5E9",
  "#F43F5E",
];

const PILL_PALETTE = [
  "oklch(0.7 0.24 14)",
  "oklch(0.74 0.18 165)",
  "oklch(0.66 0.22 305)",
  "oklch(0.78 0.18 75)",
  "oklch(0.76 0.18 145)",
];

/** Deterministic color from a string for trending tag pills. */
function colorFor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h);
  return PILL_PALETTE[Math.abs(h) % PILL_PALETTE.length];
}

/** Split tags string on commas or newlines, trim, strip leading '#', drop empties. */
function parseTags(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function PlatformCell({ platform }: { platform: HashtagPlatform }) {
  if (platform === "all") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        <Layers className="h-3 w-3" /> All platforms
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <PlatformBadge platform={platform as PlatformId} size={20} />
      <span className="text-[11px] font-medium">
        {PLATFORM_OPTIONS.find((p) => p.value === platform)?.label ?? platform}
      </span>
    </span>
  );
}

export function HashtagsView() {
  const { data, loading, reload } = useApi<HashtagData>("/api/hashtags");
  const { openComposer } = useNav();
  const [editing, setEditing] = React.useState<HashtagGroup | null>(null);

  const handleDelete = React.useCallback(
    async (g: HashtagGroup) => {
      try {
        const res = await fetch(`/api/hashtags/${g.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to delete");
        toast.success(`"${g.name}" deleted`);
        reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete group");
      }
    },
    [reload],
  );

  if (loading || !data) return <HashtagsSkeleton />;

  // KPIs
  const totalGroups = data.groups.length;
  const totalTags = data.groups.reduce((s, g) => s + g.tagCount, 0);
  const totalUses = data.totalUses;
  const totalReach = data.totalReach;

  // Trending tag frequency (across all groups, weighted by usageCount)
  const tagFreq: Record<string, number> = {};
  for (const g of data.groups) {
    for (const t of parseTags(g.tags)) {
      tagFreq[t] = (tagFreq[t] ?? 0) + 1;
    }
  }
  const trending = Object.entries(tagFreq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const maxFreq = Math.max(1, ...trending.map((t) => t.count));

  // Bar chart data
  const maxUsage = Math.max(1, ...data.groups.map((g) => g.usageCount));

  return (
    <div className="space-y-5">
      <HelpText module="hashtags"><strong className="text-foreground">Hashtag Manager</strong> saves reusable hashtag groups. Add tags once, then insert them into any post.</HelpText>
      {/* Hero */}
      <GlassCard strong className="glass-sheen animate-rise relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                <span>Hashtag manager</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Curated hashtag groups
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {totalGroups} groups · {totalTags} tags · {fmt(totalReach)} total reach
              </p>
            </div>
          </div>
          <CreateGroupDialog onCreated={() => reload()} />
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-rise">
        <KpiCard
          label="Total groups"
          value={totalGroups}
          icon={<Tags className="h-5 w-5" />}
          accent="oklch(0.7 0.24 14)"
          hint="curated tag sets"
        />
        <KpiCard
          label="Total tags"
          value={totalTags}
          icon={<Hash className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="across all groups"
        />
        <KpiCard
          label="Total uses"
          value={fmt(totalUses)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="times posted"
        />
        <KpiCard
          label="Total reach"
          value={fmt(totalReach)}
          icon={<Eye className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="sum of avg reach"
        />
      </div>

      {/* Trending tags panel */}
      <GlassCard className="animate-rise p-5">
        <SectionTitle
          title="Trending tags"
          desc="Top 12 by frequency across all groups"
          action={
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Flame className="h-3 w-3 text-primary" /> click to copy
            </span>
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          {trending.length === 0 && (
            <div className="py-6 text-sm text-muted-foreground">
              No tags yet — create a group to get started.
            </div>
          )}
          {trending.map((t) => {
            const size = 12 + Math.round((t.count / maxFreq) * 10); // 12–22px
            const color = colorFor(t.tag);
            return (
              <button
                key={t.tag}
                onClick={() => {
                  navigator.clipboard?.writeText(`#${t.tag}`).catch(() => {});
                  toast.success(`Copied #${t.tag}`, {
                    description: `Used ${t.count}× across groups`,
                  });
                }}
                className="rounded-full px-3 py-1 font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
                style={{
                  background: color,
                  fontSize: size,
                }}
                title={`#${t.tag} · ${t.count} uses`}
              >
                #{t.tag}
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Groups grid + bar chart */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 animate-rise">
          {data.groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              maxUsage={maxUsage}
              onUseInComposer={() => {
                const tags = parseTags(g.tags).map((t) => `#${t}`).join(" ");
                openComposer(tags);
              }}
              onEdit={() => setEditing(g)}
              onDelete={() => handleDelete(g)}
            />
          ))}
          {data.groups.length === 0 && (
            <GlassCard className="col-span-full p-10 text-center text-sm text-muted-foreground">
              No hashtag groups yet. Create your first group to start curating tags.
            </GlassCard>
          )}
        </div>

        {/* Bar chart: avg reach by group */}
        <GlassCard className="animate-rise p-5">
          <SectionTitle
            title="Avg reach"
            desc="By hashtag group"
          />
          <div
            className="w-full"
            style={{ height: Math.max(220, data.groups.length * 44 + 40) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.groups.map((g) => ({
                  name: g.name.length > 18 ? g.name.slice(0, 18) + "…" : g.name,
                  reach: g.avgReach,
                  color: g.color,
                }))}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmt(v), "Avg reach"]}
                  cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                />
                <Bar dataKey="reach" radius={[6, 6, 6, 6]} barSize={18}>
                  {data.groups.map((g, i) => (
                    <Cell key={i} fill={g.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <EditGroupDialog
        group={editing}
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

function GroupCard({
  group,
  maxUsage,
  onUseInComposer,
  onEdit,
  onDelete,
}: {
  group: HashtagGroup;
  maxUsage: number;
  onUseInComposer: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = parseTags(group.tags);
  const usagePct = Math.round((group.usageCount / maxUsage) * 100);

  function copyTag(tag: string) {
    navigator.clipboard?.writeText(`#${tag}`).catch(() => {});
    toast.success(`Copied #${tag}`);
  }

  function copyAll() {
    const text = tags.map((t) => `#${t}`).join(" ");
    navigator.clipboard?.writeText(text).catch(() => {});
    toast.success(`Copied ${tags.length} hashtags`, {
      description: "Ready to paste into your post",
    });
  }

  return (
    <GlassCard hover className="glass-sheen group relative flex flex-col overflow-hidden p-5">
      {/* Top accent */}
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: group.color }}
      />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
        style={{ background: group.color }}
      />

      {/* Header */}
      <div className="relative mt-1 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold leading-tight">{group.name}</h3>
          <div className="mt-1">
            <PlatformCell platform={group.platform} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label={`Actions for ${group.name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
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
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
            style={{ background: group.color }}
          >
            <Hash className="h-4 w-4" />
          </span>
        </div>
      </div>

      {/* Tag pills */}
      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {tags.slice(0, 8).map((t) => (
          <button
            key={t}
            onClick={() => copyTag(t)}
            className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] font-medium text-foreground/80 transition hover:bg-primary/15 hover:text-primary"
            title={`Copy #${t}`}
          >
            #{t}
          </button>
        ))}
        {tags.length > 8 && (
          <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
            +{tags.length - 8} more
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="relative mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Uses</div>
          <div className="text-lg font-bold">{group.usageCount}</div>
        </div>
        <div className="rounded-xl bg-muted/40 p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg reach</div>
          <div className="text-lg font-bold">{fmt(group.avgReach)}</div>
        </div>
      </div>

      {/* Usage bar */}
      <div className="relative mt-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Usage</span>
          <span>{usagePct}% of max</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${usagePct}%`, background: group.color }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="relative mt-4 flex items-center gap-2 border-t border-border/40 pt-3">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 flex-1 gap-1.5 text-xs"
          onClick={copyAll}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy all
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 flex-1 gap-1.5 text-xs"
          onClick={onUseInComposer}
        >
          <Wand2 className="h-3.5 w-3.5 text-primary" />
          Use in composer
        </Button>
      </div>
    </GlassCard>
  );
}

function CreateGroupDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [platform, setPlatform] = React.useState<HashtagPlatform>("all");
  const [color, setColor] = React.useState(SWATCHES[0]);
  const [saving, setSaving] = React.useState(false);

  function reset() {
    setName("");
    setTags("");
    setPlatform("all");
    setColor(SWATCHES[0]);
  }

  async function handleSubmit() {
    if (!name.trim() || !tags.trim()) {
      toast.error("Name and tags are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tags: tags.trim(),
          platform,
          color,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Hashtag group created", { description: name.trim() });
        setOpen(false);
        reset();
        onCreated();
      } else {
        toast.error(json.error ?? "Failed to create group");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  const previewCount = parseTags(tags).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" />
        Create group
      </button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              New hashtag group
            </DialogTitle>
            <DialogDescription>
              Curate a reusable set of hashtags you can drop into any post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="hg-name">Group name</Label>
              <Input
                id="hg-name"
                placeholder="e.g. Instagram — Growth Set"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hg-tags">
                Tags{" "}
                <span className="text-[11px] font-normal text-muted-foreground">
                  ({previewCount} parsed)
                </span>
              </Label>
              <Textarea
                id="hg-tags"
                placeholder={"creatoreconomy, contentcreator\nsocialmediatips, growoninstagram"}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                rows={4}
              />
              <p className="text-[11px] text-muted-foreground">
                Comma or newline separated. The <code>#</code> prefix is added automatically.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as HashtagPlatform)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {SWATCHES.map((sw) => (
                  <button
                    key={sw}
                    type="button"
                    onClick={() => setColor(sw)}
                    className={cn(
                      "h-8 w-8 rounded-full transition",
                      color === sw
                        ? "ring-2 ring-offset-2 ring-offset-background"
                        : "opacity-80 hover:opacity-100",
                    )}
                    style={{ background: sw, boxShadow: color === sw ? `0 0 0 2px ${sw}` : undefined }}
                    aria-label={`Color ${sw}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
              {saving ? "Creating…" : "Create group"}
              {!saving && <Plus className="h-3.5 w-3.5" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditGroupDialog({
  group,
  onOpenChange,
  onSaved,
}: {
  group: HashtagGroup | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = group !== null;
  const [name, setName] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [platform, setPlatform] = React.useState<HashtagPlatform>("all");
  const [color, setColor] = React.useState(SWATCHES[0]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!group) return;
    setName(group.name);
    setTags(group.tags);
    setPlatform((group.platform as HashtagPlatform) ?? "all");
    setColor(group.color || SWATCHES[0]);
  }, [group]);

  async function handleSubmit() {
    if (!group) return;
    if (!name.trim() || !tags.trim()) {
      toast.error("Name and tags are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/hashtags/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tags: tags.trim(),
          platform,
          color,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to update group");
      }
      toast.success("Hashtag group updated", { description: name.trim() });
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  const previewCount = parseTags(tags).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit hashtag group
          </DialogTitle>
          <DialogDescription>
            Update the name, tags, platform, or color of this group.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edt-hg-name">Group name</Label>
            <Input
              id="edt-hg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edt-hg-tags">
              Tags{" "}
              <span className="text-[11px] font-normal text-muted-foreground">
                ({previewCount} parsed)
              </span>
            </Label>
            <Textarea
              id="edt-hg-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              rows={4}
            />
            <p className="text-[11px] text-muted-foreground">
              Comma or newline separated. The <code>#</code> prefix is added automatically.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as HashtagPlatform)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((sw) => (
                <button
                  key={sw}
                  type="button"
                  onClick={() => setColor(sw)}
                  className={cn(
                    "h-8 w-8 rounded-full transition",
                    color === sw
                      ? "ring-2 ring-offset-2 ring-offset-background"
                      : "opacity-80 hover:opacity-100",
                  )}
                  style={{ background: sw, boxShadow: color === sw ? `0 0 0 2px ${sw}` : undefined }}
                  aria-label={`Color ${sw}`}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving ? "Saving…" : "Save changes"}
            {!saving && <CheckCircle2 className="h-3.5 w-3.5" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HashtagsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-32 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-80 rounded-3xl" />
          ))}
        </div>
        <div className="shimmer h-80 rounded-3xl" />
      </div>
    </div>
  );
}
