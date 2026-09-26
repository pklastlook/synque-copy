"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import {
  Image as ImageIcon,
  Film,
  Music,
  Search,
  Upload,
  Folder as FolderIcon,
  FolderPlus,
  LayoutGrid,
  List as ListIcon,
  Copy,
  CheckCircle2,
  Check,
  Trash2,
  Wand2,
  Sparkles,
  HardDrive,
  Hash,
  Calendar,
  FolderOpen,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { HelpText } from "@/components/glass/help-text";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  MetricRow,
  BentoGrid,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MediaAsset {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  url: string;
  thumbnail: string | null;
  size: number;
  width: number | null;
  height: number | null;
  tags: string | null;
  folder: string;
  uploadedById: string | null;
  createdAt: string;
}

interface MediaFolder {
  name: string;
  count: number;
  size: number;
}

interface MediaResponse {
  assets: MediaAsset[];
  folders: MediaFolder[];
}

function fmtSize(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function fmtBytesBig(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

const TYPE_META: Record<
  MediaAsset["type"],
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    pillColor: "blue" | "amber" | "violet";
  }
> = {
  image: {
    icon: ImageIcon,
    color: "text-[oklch(0.55_0.18_145)]",
    bg: "bg-[oklch(0.76_0.18_145)]/20",
    pillColor: "blue",
  },
  video: {
    icon: Film,
    color: "text-[oklch(0.55_0.16_75)]",
    bg: "bg-[oklch(0.78_0.18_75)]/20",
    pillColor: "amber",
  },
  audio: {
    icon: Music,
    color: "text-[oklch(0.55_0.18_165)]",
    bg: "bg-[oklch(0.74_0.18_165)]/20",
    pillColor: "violet",
  },
};

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Compute a 7-day trend (count of assets created each day) for the sparkline.
 * Returns zeros if no assets.
 */
function computeTrend(assets: MediaAsset[], days = 7): number[] {
  if (assets.length === 0) return Array(days).fill(0);
  const now = new Date();
  const trend: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(now.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    trend.push(
      assets.filter((a) => {
        const c = new Date(a.createdAt);
        return c >= dayStart && c < dayEnd;
      }).length,
    );
  }
  return trend;
}

/** Storage trend — MB uploaded per day, for the sparkline. */
function computeSizeTrendMb(assets: MediaAsset[], days = 7): number[] {
  if (assets.length === 0) return Array(days).fill(0);
  const now = new Date();
  const trend: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(now.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    const sum = assets
      .filter((a) => {
        const c = new Date(a.createdAt);
        return c >= dayStart && c < dayEnd;
      })
      .reduce((s, a) => s + a.size, 0);
    trend.push(sum / 1_048_576); // MB
  }
  return trend;
}

export function MediaLibraryView() {
  const { data, loading, reload } = useApi<MediaResponse>("/api/media");
  const { openComposer, mediaTab, setMediaTab } = useNav();
  const { user } = useAuth();
  const [folder, setFolder] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<MediaAsset | null>(null);

  if (loading || !data) return <MediaSkeleton />;

  const assets = data.assets;
  const folders = data.folders;

  // Type filter driven by the sidebar's Media Library expandable group:
  // "all" | "images" | "videos" | "audio".
  const typeFilter: Record<string, MediaAsset["type"] | null> = {
    all: null,
    images: "image",
    videos: "video",
    audio: "audio",
  };
  const activeType = typeFilter[mediaTab] ?? null;

  // Folder list: All + root + each folder from API
  const folderList: { name: string; count: number; size: number }[] = [
    {
      name: "all",
      count: assets.length,
      size: assets.reduce((s, a) => s + a.size, 0),
    },
    {
      name: "root",
      count: assets.filter((a) => a.folder === "root").length,
      size: assets
        .filter((a) => a.folder === "root")
        .reduce((s, a) => s + a.size, 0),
    },
    ...folders.filter((f) => f.name !== "root"),
  ];

  // Filter assets by type + folder + query
  const filtered = assets.filter((a) => {
    if (activeType !== null && a.type !== activeType) return false;
    const folderMatch = folder === "all" ? true : a.folder === folder;
    if (!folderMatch) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const tags = parseTags(a.tags);
    return (
      a.name.toLowerCase().includes(q) ||
      tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // KPIs — scope counts to the active type filter so the strip reflects
  // what the user is currently viewing in the sidebar.
  const scopedAssets =
    activeType === null ? assets : assets.filter((a) => a.type === activeType);
  const totalSize = scopedAssets.reduce((s, a) => s + a.size, 0);
  const imageCount = scopedAssets.filter((a) => a.type === "image").length;
  const videoCount = scopedAssets.filter((a) => a.type === "video").length;
  const audioCount = scopedAssets.filter((a) => a.type === "audio").length;

  // Trends — 7-day sparkline based on createdAt
  const allTrend = computeTrend(scopedAssets);
  const sizeTrendMb = computeSizeTrendMb(scopedAssets);
  const imageTrend = computeTrend(assets.filter((a) => a.type === "image"));
  const videoTrend = computeTrend(assets.filter((a) => a.type === "video"));

  const metrics: Metric[] = [
    {
      label: "Total assets",
      value: scopedAssets.length,
      spark: allTrend,
      color: "var(--primary)",
    },
    {
      label: "Storage used",
      value: fmtBytesBig(totalSize),
      spark: sizeTrendMb,
      color: "oklch(0.74 0.18 165)",
    },
    {
      label: "Images",
      value: imageCount,
      spark: imageTrend,
      color: "oklch(0.55 0.18 145)",
    },
    {
      label: "Videos",
      value: videoCount,
      spark: videoTrend,
      color: "oklch(0.55 0.16 75)",
    },
  ];

  // Type filter pills (SectionHeader action)
  const typePills: {
    id: string;
    label: string;
    count: number;
    color: "neutral" | "blue" | "amber" | "violet";
  }[] = [
    { id: "all", label: "All", count: assets.length, color: "neutral" },
    {
      id: "images",
      label: "Images",
      count: assets.filter((a) => a.type === "image").length,
      color: "blue",
    },
    {
      id: "videos",
      label: "Videos",
      count: assets.filter((a) => a.type === "video").length,
      color: "amber",
    },
    {
      id: "audio",
      label: "Audio",
      count: assets.filter((a) => a.type === "audio").length,
      color: "violet",
    },
  ];

  return (
    <div className="animate-rise space-y-4">
      {/* Help text for new users */}
      <HelpText module="media-library">
        <strong className="text-foreground">Media Library</strong> stores all your images, videos, and audio for use
        in posts. Drag-and-drop a file into the upload zone, or click <strong className="text-foreground">Upload</strong> for the
        URL/manual flow. Assets are organized into folders by tag.
      </HelpText>

      {/* MetricRow — dense KPI strip with sparklines (replaces hero + 4 KPI cards) */}
      <MetricRow metrics={metrics} />

      {/* CARD #1 — Toolbar (search + folder pills + view toggle + upload button) */}
      <GlassCard className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Folder pills — horizontal scroll on overflow */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {folderList.map((f) => {
              const isActive = folder === f.name;
              const label =
                f.name === "all" ? "All" : f.name === "root" ? "Root" : f.name;
              return (
                <button
                  key={f.name}
                  onClick={() => setFolder(f.name)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {f.name === "all" ? (
                    <LayoutGrid className="h-3 w-3" />
                  ) : (
                    <FolderIcon className="h-3 w-3" />
                  )}
                  <span className="whitespace-nowrap">{label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1 text-[10px] tabular-nums",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/15 text-muted-foreground",
                    )}
                  >
                    {f.count}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => {
                const name = window.prompt("Enter folder name:");
                if (!name?.trim()) return;
                setFolder(name.trim());
                toast.success(`Folder "${name.trim()}" created`, {
                  description: "Upload media to this folder to populate it.",
                });
              }}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="New folder"
              title="New folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "grid h-6 w-6 place-items-center rounded transition",
                view === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="Grid view"
              title="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "grid h-6 w-6 place-items-center rounded transition",
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="List view"
              title="List view"
            >
              <ListIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            onClick={() => setUploadOpen(true)}
            size="sm"
            className="liquid-pill gap-1.5 rounded-xl"
          >
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
      </GlassCard>

      {/* CARD #2 — Upload zone (compact, always visible drag-and-drop) */}
      <GlassCard className="p-3">
        <FileUploadZoneInline
          userId={user?.id ?? null}
          folder={folder === "all" ? "root" : folder}
          onDone={reload}
          onOpenDialog={() => setUploadOpen(true)}
        />
      </GlassCard>

      {/* Media grid — NOT a card; SectionHeader + direct grid (BentoGrid) */}
      <div>
        <SectionHeader
          title="Media library"
          desc={`${filtered.length} of ${assets.length} assets · ${fmtBytesBig(
            filtered.reduce((s, a) => s + a.size, 0),
          )} · ${audioCount} audio`}
          icon={Sparkles}
          action={
            <div className="flex flex-wrap items-center gap-1">
              {typePills.map((p) => {
                const isActive = mediaTab === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setMediaTab(p.id)}
                    className={cn(
                      "transition",
                      !isActive && "opacity-50 hover:opacity-100",
                    )}
                    title={`Filter to ${p.label.toLowerCase()}`}
                  >
                    <Pill color={p.color}>
                      {p.label}
                      <span className="opacity-70">{p.count}</span>
                    </Pill>
                  </button>
                );
              })}
            </div>
          }
        />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 py-12 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No assets match this filter</p>
            <p className="text-xs text-muted-foreground">
              Try a different folder, type filter, or search query.
            </p>
          </div>
        ) : view === "grid" ? (
          <BentoGrid
            className="grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {filtered.map((a) => (
              <MediaTile
                key={a.id}
                asset={a}
                onSelect={() => setSelected(a)}
                onUse={() => openComposer()}
              />
            ))}
          </BentoGrid>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/40">
            {filtered.map((a) => (
              <MediaListRow
                key={a.id}
                asset={a}
                onClick={() => setSelected(a)}
                onUse={() => openComposer()}
              />
            ))}
          </div>
        )}
      </div>

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folders={folders.map((f) => f.name)}
        onUploaded={() => {
          reload();
          setUploadOpen(false);
        }}
      />

      <AssetDetailDialog
        asset={selected}
        onClose={() => setSelected(null)}
        onUse={() => {
          openComposer();
          setSelected(null);
        }}
        onDelete={async (a) => {
          try {
            const res = await fetch(`/api/media/${a.id}`, {
              method: "DELETE",
            });
            if (res.ok) {
              toast.success(`"${a.name}" deleted`);
              reload();
            } else {
              toast.error("Failed to delete asset");
            }
          } catch {
            toast.error("Network error");
          }
          setSelected(null);
        }}
      />
    </div>
  );
}

// ============================================================================
// MediaTile — direct grid tile, NOT a card. Pure visual container for a
// media asset thumbnail + type Pill + size badge + hover overlay.
// ============================================================================

function MediaTile({
  asset,
  onSelect,
  onUse,
}: {
  asset: MediaAsset;
  onSelect: () => void;
  onUse: () => void;
}) {
  const tags = parseTags(asset.tags);
  const typeMeta = TYPE_META[asset.type];

  return (
    <div className="group flex flex-col">
      <button
        onClick={onSelect}
        className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/40 bg-muted transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      >
        {asset.type === "image" && asset.thumbnail ? (
          <img
            src={asset.thumbnail}
            alt={asset.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={cn("grid h-full w-full place-items-center", typeMeta.bg)}>
            <typeMeta.icon className={cn("h-10 w-10", typeMeta.color)} />
          </div>
        )}

        {/* Type Pill top-left */}
        <span className="absolute left-2 top-2">
          <Pill color={typeMeta.pillColor}>
            <typeMeta.icon className="h-2.5 w-2.5" />
            {asset.type}
          </Pill>
        </span>

        {/* Size badge top-right */}
        <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {fmtSize(asset.size)}
        </span>

        {/* Hover overlay with name + Use button */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <div className="pointer-events-none line-clamp-1 text-[11px] font-semibold text-white drop-shadow">
            {asset.name}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
            className="pointer-events-auto mt-1 inline-flex w-fit items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold text-foreground transition hover:bg-white"
          >
            <Wand2 className="h-3 w-3" /> Use
          </button>
        </div>
      </button>

      {/* Caption below thumbnail — NOT a card */}
      <div className="mt-1.5 px-0.5">
        <div className="truncate text-xs font-medium leading-tight">
          {asset.name}
        </div>
        {tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[9px] text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MediaListRow — dense list row (uses ListRow primitive, NOT a card).
// ============================================================================

function MediaListRow({
  asset,
  onClick,
  onUse,
}: {
  asset: MediaAsset;
  onClick: () => void;
  onUse: () => void;
}) {
  const typeMeta = TYPE_META[asset.type];
  return (
    <ListRow onClick={onClick} className="bg-background/50 hover:bg-muted/40">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
        {asset.type === "image" && asset.thumbnail ? (
          <img
            src={asset.thumbnail}
            alt={asset.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className={cn("grid h-full w-full place-items-center", typeMeta.bg)}>
            <typeMeta.icon className={cn("h-4 w-4", typeMeta.color)} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{asset.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Pill color={typeMeta.pillColor}>{asset.type}</Pill>
          <span className="text-[10px] text-muted-foreground">
            {asset.folder}
          </span>
        </div>
      </div>
      <div className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
        {fmtSize(asset.size)}
      </div>
      <div className="hidden shrink-0 text-xs text-muted-foreground md:block">
        {isValid(parseISO(asset.createdAt))
          ? format(parseISO(asset.createdAt), "MMM d, yyyy")
          : "—"}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUse();
        }}
        className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
      >
        Use
      </button>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </ListRow>
  );
}

// ============================================================================
// UploadDialog — modal for URL/manual upload flow. Preserved from original.
// ============================================================================

function UploadDialog({
  open,
  onOpenChange,
  folders,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folders: string[];
  onUploaded: () => void;
}) {
  const { user } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Upload className="h-4 w-4" />
            </span>
            Upload media
          </DialogTitle>
          <DialogDescription>
            Drag-and-drop a file or click to browse. URL is auto-copied after
            upload.
          </DialogDescription>
        </DialogHeader>

        <FileUploadZone
          onUploaded={() => {
            /* parent handles */
          }}
          submitting={false}
          userId={user?.id ?? null}
          folder={folders[0] ?? "root"}
          onDone={onUploaded}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// AssetDetailDialog — modal for asset preview, copy URL, delete. Preserved.
// ============================================================================

function AssetDetailDialog({
  asset,
  onClose,
  onUse,
  onDelete,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onUse: () => void;
  onDelete: (a: MediaAsset) => void | Promise<void>;
}) {
  const tags = asset ? parseTags(asset.tags) : [];
  const typeMeta = asset ? TYPE_META[asset.type] : TYPE_META.image;

  return (
    <Dialog open={!!asset} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-lg",
                typeMeta.bg,
                typeMeta.color,
              )}
            >
              {asset && <typeMeta.icon className="h-4 w-4" />}
            </span>
            <span className="truncate">{asset?.name ?? "Asset"}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Asset preview and details
          </DialogDescription>
        </DialogHeader>

        {asset && (
          <div className="space-y-4">
            {/* Large preview */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
              {asset.type === "image" && asset.thumbnail ? (
                <img
                  src={asset.thumbnail}
                  alt={asset.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={cn("grid h-full w-full place-items-center", typeMeta.bg)}>
                  <typeMeta.icon className={cn("h-16 w-16", typeMeta.color)} />
                </div>
              )}
              <span className="absolute left-3 top-3">
                <Pill color={typeMeta.pillColor}>{asset.type}</Pill>
              </span>
            </div>

            {/* Metadata grid — compact, uses dense MetricRow-like cells */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetaItem
                icon={<HardDrive className="h-3.5 w-3.5" />}
                label="Size"
                value={fmtSize(asset.size)}
              />
              <MetaItem
                icon={<ImageIcon className="h-3.5 w-3.5" />}
                label="Dimensions"
                value={
                  asset.width && asset.height
                    ? `${asset.width}×${asset.height}`
                    : "—"
                }
              />
              <MetaItem
                icon={<FolderIcon className="h-3.5 w-3.5" />}
                label="Folder"
                value={asset.folder}
              />
              <MetaItem
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="Uploaded"
                value={
                  isValid(parseISO(asset.createdAt))
                    ? format(parseISO(asset.createdAt), "MMM d, yyyy")
                    : "—"
                }
              />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-muted/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* URL row */}
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                URL
              </span>
              <code className="min-w-0 flex-1 truncate text-[11px] text-foreground/80">
                {asset.url}
              </code>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onUse}
                className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
              >
                <Wand2 className="h-4 w-4" /> Use in composer
              </button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  if (
                    typeof navigator !== "undefined" &&
                    navigator.clipboard
                  ) {
                    navigator.clipboard.writeText(asset.url).then(
                      () => toast.success("URL copied to clipboard"),
                      () => toast.error("Could not copy URL"),
                    );
                  } else {
                    toast.info("Copy not supported in this browser");
                  }
                }}
              >
                <Copy className="h-4 w-4" /> Copy URL
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                onClick={() => onDelete(asset)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

// ============================================================================
// FileUploadZoneInline — compact, always-visible drop zone (page card #2).
// Uploads files directly via /api/media/upload on drop; shows the resulting
// URL with a copy button. Click "Open dialog" for the URL/manual flow.
// ============================================================================

function FileUploadZoneInline({
  userId,
  folder,
  onDone,
  onOpenDialog,
}: {
  userId: string | null;
  folder: string;
  onDone: () => void;
  onOpenDialog: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<string>("");
  const [uploadedUrl, setUploadedUrl] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!userId) {
      toast.error("Sign in to upload files");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25 MB)");
      return;
    }
    setUploading(true);
    setUploadedUrl("");
    setProgress(`Uploading ${file.name}…`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploadedById", userId);
      fd.append("folder", folder);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.url) {
        toast.success(`"${file.name}" uploaded successfully`);
        setUploadedUrl(json.url);
        onDone();
        // Auto-copy URL to clipboard
        try {
          await navigator.clipboard.writeText(json.url);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } catch {
          /* Clipboard may not be available */
        }
      } else {
        toast.error(json.error ?? "Upload failed");
      }
    } catch {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  const copyUrl = async () => {
    if (!uploadedUrl) return;
    try {
      await navigator.clipboard.writeText(uploadedUrl);
      toast.success("URL copied to clipboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy URL");
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Drop zone — compact */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "relative flex flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition",
          dragOver
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/40 hover:bg-muted/40",
          uploading && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="h-7 w-7 shrink-0 animate-spin text-primary" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold">Uploading…</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {progress}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Upload className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold">
                Drop a file or click to browse
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                PNG, JPG, MP4, MP3 · max 25MB · URL auto-copied
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right column: either upload-success or open-dialog button */}
      {uploadedUrl && !uploading ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
              Upload successful
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {uploadedUrl.startsWith("data:")
                ? "Image data URL (copied to clipboard)"
                : uploadedUrl}
            </div>
          </div>
          <button
            onClick={copyUrl}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
              copied
                ? "bg-emerald-500 text-white"
                : "bg-primary/10 text-primary hover:bg-primary/20",
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy URL
              </>
            )}
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-xl"
          onClick={onOpenDialog}
        >
          <Wand2 className="h-3.5 w-3.5" />
          URL upload
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// FileUploadZone — full drop zone used inside the UploadDialog. Preserved.
// ============================================================================

function FileUploadZone({
  onUploaded,
  submitting,
  userId,
  folder,
  onDone,
}: {
  onUploaded: (file: File, url: string) => void;
  submitting: boolean;
  userId: string | null;
  folder: string;
  onDone: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState<string>("");
  const [uploadedUrl, setUploadedUrl] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  const handleFile = async (file: File) => {
    if (!userId) {
      toast.error("Sign in to upload files");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25 MB)");
      return;
    }
    setUploading(true);
    setUploadedUrl("");
    setProgress(`Uploading ${file.name}…`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploadedById", userId);
      fd.append("folder", folder);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.url) {
        toast.success(`"${file.name}" uploaded successfully`);
        setUploadedUrl(json.url);
        onUploaded(file, json.url);
        onDone();
        // Auto-copy URL to clipboard
        try {
          await navigator.clipboard.writeText(json.url);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } catch {
          /* Clipboard may not be available */
        }
      } else {
        toast.error(json.error ?? "Upload failed");
      }
    } catch {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  const copyUrl = async () => {
    if (!uploadedUrl) return;
    try {
      await navigator.clipboard.writeText(uploadedUrl);
      toast.success("URL copied to clipboard");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy URL");
    }
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => !uploading && !submitting && inputRef.current?.click()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition",
          dragOver
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/40 hover:bg-muted/40",
          (uploading || submitting) && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-[13px] font-medium text-muted-foreground">
              {progress}
            </span>
          </>
        ) : (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold">
                Drop a file or click to browse
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                PNG, JPG, MP4, MP3 · max 25MB · URL auto-copied after upload
              </div>
            </div>
          </>
        )}
      </div>

      {/* Upload success — show preview + copy URL */}
      {uploadedUrl && !uploading && (
        <div className="crystal-in flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
              Upload successful!
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {uploadedUrl.startsWith("data:")
                ? "Image data URL (copied to clipboard)"
                : uploadedUrl}
            </div>
          </div>
          <button
            onClick={copyUrl}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
              copied
                ? "bg-emerald-500 text-white"
                : "bg-primary/10 text-primary hover:bg-primary/20",
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy URL
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MediaSkeleton — loading placeholder.
// ============================================================================

function MediaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-14 rounded-xl" />
      <div className="shimmer h-14 rounded-xl" />
      <div className="shimmer h-14 rounded-xl" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="shimmer aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}
