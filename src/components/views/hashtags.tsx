"use client";

import * as React from "react";
import {
  Hash,
  Plus,
  Copy,
  Wand2,
  Tags,
  TrendingUp,
  Eye,
  Flame,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  MetricRow,
  BentoGrid,
  BentoTile,
  Sparkline,
  SectionHeader,
  ListRow,
  Pill,
  type Metric,
} from "@/components/glass/dense-ui";
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

/** Convert a numeric series into a small sparkline-friendly shape (max 12 points). */
function toSpark(values: number[], maxPoints = 12): number[] {
  if (!values.length) return [];
  if (values.length <= maxPoints) return values;
  // Down-sample by averaging buckets
  const step = Math.ceil(values.length / maxPoints);
  const out: number[] = [];
  for (let i = 0; i < values.length; i += step) {
    const slice = values.slice(i, i + step);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
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

  // Trending tag frequency (across all groups)
  const tagFreq: Record<string, number> = {};
  for (const g of data.groups) {
    for (const t of parseTags(g.tags)) {
      tagFreq[t] = (tagFreq[t] ?? 0) + 1;
    }
  }
  const trending = Object.entries(tagFreq)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);
  const maxFreq = Math.max(1, ...trending.map((t) => t.count));
  const bannedCount = 0; // Banned tags feature placeholder (preserved API hook for future)

  // Per-group sparkline series (sorted by usage desc — top groups first)
  const sortedGroups = [...data.groups].sort((a, b) => b.usageCount - a.usageCount);
  const usesSpark = toSpark(sortedGroups.map((g) => g.usageCount));
  const reachSpark = toSpark(sortedGroups.map((g) => g.avgReach));
  const tagsSpark = toSpark(sortedGroups.map((g) => g.tagCount));
  const groupsSpark = toSpark(
    data.groups.map((g, i) => (i + 1) * (g.usageCount + 1)),
  );

  const metrics: Metric[] = [
    {
      label: "Total groups",
      value: totalGroups,
      spark: groupsSpark,
      color: "oklch(0.7 0.24 14)",
    },
    {
      label: "Total tags",
      value: totalTags,
      spark: tagsSpark,
      color: "oklch(0.74 0.18 165)",
    },
    {
      label: "Total uses",
      value: fmt(totalUses),
      spark: usesSpark,
      color: "oklch(0.66 0.22 305)",
    },
    {
      label: "Total reach",
      value: fmt(totalReach),
      spark: reachSpark,
      color: "oklch(0.78 0.18 75)",
    },
  ];

  // Top group by avg reach
  const topByReach = sortedGroups
    .slice()
    .sort((a, b) => b.avgReach - a.avgReach)[0];

  return (
    <div className="space-y-4">
      <HelpText module="hashtags">
        <strong className="text-foreground">Hashtag Manager</strong> — curate
        reusable hashtag groups, then drop them into any post.
      </HelpText>

      {/* Hero strip — compact title bar */}
      <div className="glass animate-rise relative overflow-hidden rounded-xl p-4">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Hash className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                <span>Hashtag manager</span>
              </div>
              <h2 className="truncate text-base font-bold tracking-tight sm:text-lg">
                Curated hashtag groups
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {totalGroups} groups · {totalTags} tags · {fmt(totalReach)} reach
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Pill color="rose">{bannedCount} banned</Pill>
            <Pill color="amber">
              <Flame className="h-2.5 w-2.5" />
              {trending.length} trending
            </Pill>
            <CreateGroupDialog onCreated={() => reload()} />
          </div>
        </div>
      </div>

      {/* Dense metric row — replaces 4 KPI cards */}
      <MetricRow metrics={metrics} className="animate-rise" />

      {/* Bento grid — 4 tiles max */}
      <BentoGrid className="animate-rise">
        {/* Groups list — 2x2 tile */}
        <BentoTile span="2x2" className="flex flex-col overflow-hidden p-0">
          <SectionHeader
            title="Hashtag groups"
            desc={`${totalGroups} curated · click tag to copy`}
            icon={Tags}
            action={
              <span className="text-[10px] text-muted-foreground">
                {totalTags} tags
              </span>
            }
            className="border-b border-border/40 px-4 py-3"
          />
          <div className="min-h-0 flex-1 overflow-y-auto scroll-liquid">
            {data.groups.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                No hashtag groups yet. Create your first group to start curating.
              </div>
            ) : (
              data.groups.map((g) => (
                <GroupListRow
                  key={g.id}
                  group={g}
                  onUseInComposer={() => {
                    const tags = parseTags(g.tags)
                      .map((t) => `#${t}`)
                      .join(" ");
                    openComposer(tags);
                  }}
                  onEdit={() => setEditing(g)}
                  onDelete={() => handleDelete(g)}
                />
              ))
            )}
          </div>
        </BentoTile>

        {/* Trending tags — 1x2 tile */}
        <BentoTile span="1x2" className="flex flex-col overflow-hidden p-0">
          <SectionHeader
            title="Trending tags"
            desc="Top by frequency · click to copy"
            icon={Flame}
            className="border-b border-border/40 px-4 py-3"
          />
          <div className="min-h-0 flex-1 overflow-y-auto p-3 scroll-liquid">
            {trending.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No tags yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {trending.map((t) => {
                  const size = 11 + Math.round((t.count / maxFreq) * 4); // 11–15px
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
                      className="rounded-full px-2 py-0.5 text-white shadow-sm transition hover:-translate-y-0.5"
                      style={{
                        background: color,
                        fontSize: size,
                        fontWeight: 600,
                      }}
                      title={`#${t.tag} · ${t.count} uses`}
                    >
                      #{t.tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </BentoTile>

        {/* Top group by reach — 1x1 tile */}
        <BentoTile span="1x1" className="flex flex-col">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="label-caps text-[10px] text-muted-foreground">
                Top reach
              </div>
              <div className="mt-0.5 truncate text-sm font-bold tracking-tight">
                {topByReach?.name ?? "—"}
              </div>
            </div>
            <div
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
              style={{ background: topByReach?.color ?? "var(--muted)" }}
            >
              <Eye className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num-display text-xl font-bold tabular-nums">
              {fmt(topByReach?.avgReach ?? 0)}
            </span>
            <span className="text-[10px] text-muted-foreground">avg reach</span>
          </div>
          <div className="mt-auto pt-2">
            <Sparkline
              data={reachSpark}
              color="oklch(0.78 0.18 75)"
              width={220}
              height={28}
            />
          </div>
        </BentoTile>

        {/* Usage distribution — 1x1 tile */}
        <BentoTile span="1x1" className="flex flex-col">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="label-caps text-[10px] text-muted-foreground">
                Usage distribution
              </div>
              <div className="mt-0.5 truncate text-sm font-bold tracking-tight">
                {fmt(totalUses)} total uses
              </div>
            </div>
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="num-display text-xl font-bold tabular-nums">
              {totalGroups > 0
                ? (totalUses / totalGroups).toFixed(1)
                : "0"}
            </span>
            <span className="text-[10px] text-muted-foreground">avg / group</span>
          </div>
          <div className="mt-auto pt-2">
            <Sparkline
              data={usesSpark}
              color="oklch(0.66 0.22 305)"
              width={220}
              height={28}
            />
          </div>
        </BentoTile>
      </BentoGrid>

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

// ============================================================================
// GroupListRow — dense row for a single hashtag group (uses ListRow primitive)
// ============================================================================

function GroupListRow({
  group,
  onUseInComposer,
  onEdit,
  onDelete,
}: {
  group: HashtagGroup;
  onUseInComposer: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = parseTags(group.tags);

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

  const platformPill =
    group.platform === "all" ? (
      <Pill color="neutral">
        <Layers className="h-2.5 w-2.5" />
        All
      </Pill>
    ) : (
      <span className="inline-flex items-center gap-1">
        <PlatformBadge platform={group.platform as PlatformId} size={16} />
      </span>
    );

  return (
    <ListRow className="!flex-col !items-stretch !gap-0 !px-0 !py-0">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span
          className="h-7 w-1 shrink-0 rounded-full"
          style={{ background: group.color }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-xs font-bold tracking-tight">
              {group.name}
            </span>
            {platformPill}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>
              <strong className="text-foreground">{group.tagCount}</strong> tags
            </span>
            <span>
              <strong className="text-foreground">{group.usageCount}</strong> uses
            </span>
            <span>
              <strong className="text-foreground">{fmt(group.avgReach)}</strong> reach
            </span>
          </div>
        </div>

        {/* Copy all + use in composer */}
        <button
          onClick={copyAll}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Copy all tags"
          aria-label="Copy all tags"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onUseInComposer}
          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
          title="Use in composer"
          aria-label="Use in composer"
        >
          <Wand2 className="h-3.5 w-3.5" />
        </button>

        {/* Dropdown: edit + delete */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={`Actions for ${group.name}`}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36 rounded-xl">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-500 focus:text-rose-500"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tag pills — inline, dense */}
      <div className="flex flex-wrap gap-1 px-3 pb-2.5">
        {tags.slice(0, 10).map((t) => (
          <button
            key={t}
            onClick={() => copyTag(t)}
            className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 transition hover:bg-primary/15 hover:text-primary"
            title={`Copy #${t}`}
          >
            #{t}
          </button>
        ))}
        {tags.length > 10 && (
          <span className="rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            +{tags.length - 10}
          </span>
        )}
        {tags.length === 0 && (
          <span className="text-[10px] italic text-muted-foreground">
            No tags yet
          </span>
        )}
      </div>
    </ListRow>
  );
}

// ============================================================================
// CreateGroupDialog — preserved CRUD
// ============================================================================

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
        className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
      >
        <Plus className="h-3.5 w-3.5" />
        New group
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

// ============================================================================
// EditGroupDialog — preserved CRUD
// ============================================================================

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

// ============================================================================
// Skeleton — compact, dense
// ============================================================================

function HashtagsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-20 rounded-xl" />
      <div className="shimmer h-14 rounded-xl" />
      <BentoGrid>
        <BentoTile span="2x2" className="shimmer">{""}</BentoTile>
        <BentoTile span="1x2" className="shimmer">{""}</BentoTile>
        <BentoTile span="1x1" className="shimmer">{""}</BentoTile>
        <BentoTile span="1x1" className="shimmer">{""}</BentoTile>
      </BentoGrid>
    </div>
  );
}
