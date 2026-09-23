"use client";

import * as React from "react";
import { format, parseISO, isValid } from "date-fns";
import {
  Image as ImageIcon,
  Film,
  Music,
  Search,
  Upload,
  Plus,
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
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/lib/hooks";
import { GlassCard, KpiCard } from "@/components/glass/glass-card";
import { HelpText } from "@/components/glass/help-text";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

/** Preset library images for "Add from library" quick-pick. */
const PRESET_LIBRARY: { url: string; name: string; tags: string }[] = [
  {
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/90d070238cd1.jpg",
    name: "Brand sunset",
    tags: "brand, sunset, product",
  },
  {
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3c1a14f7bc03.jpg",
    name: "Lifestyle shot",
    tags: "lifestyle, people",
  },
  {
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/499f6186a75b.jpg",
    name: "Flat lay",
    tags: "flat-lay, product",
  },
  {
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/72adecde4e2f.jpg",
    name: "Team moment",
    tags: "team, behind-the-scenes",
  },
  {
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/26cfb8da4289.jpg",
    name: "Texture background",
    tags: "background, texture",
  },
  {
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0d38ffbc8924.jpg",
    name: "City scene",
    tags: "city, urban",
  },
];

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
  { icon: React.ElementType; color: string; bg: string }
> = {
  image: {
    icon: ImageIcon,
    color: "text-[oklch(0.55_0.18_145)]",
    bg: "bg-[oklch(0.76_0.18_145)]/20",
  },
  video: {
    icon: Film,
    color: "text-[oklch(0.55_0.16_75)]",
    bg: "bg-[oklch(0.78_0.18_75)]/20",
  },
  audio: {
    icon: Music,
    color: "text-[oklch(0.55_0.18_165)]",
    bg: "bg-[oklch(0.74_0.18_165)]/20",
  },
};

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function MediaLibraryView() {
  const { data, loading, reload } = useApi<MediaResponse>("/api/media");
  const { openComposer, mediaTab } = useNav();
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
      size: assets.filter((a) => a.folder === "root").reduce((s, a) => s + a.size, 0),
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
  const scopedAssets = activeType === null ? assets : assets.filter((a) => a.type === activeType);
  const totalSize = scopedAssets.reduce((s, a) => s + a.size, 0);
  const imageCount = scopedAssets.filter((a) => a.type === "image").length;
  const uniqueFolders = new Set(scopedAssets.map((a) => a.folder)).size;

  return (
    <div className="animate-rise space-y-5">
      {/* Help text for new users */}
      <HelpText module="media-library">
        <strong className="text-foreground">Media Library</strong> stores all your images, videos, and audio for use
        in posts. Click <strong className="text-foreground">Upload</strong> to drag-and-drop a file from your computer,
        or paste a URL. Assets are organized into folders by tag.
      </HelpText>
      {/* Hero */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-40 blur-3xl"
          style={{ background: "oklch(0.74 0.18 165)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--primary)" }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Media library
              {mediaTab !== "all" && (
                <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {mediaTab}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Your creative assets, organized
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{scopedAssets.length}</span> assets ·{" "}
              <span className="font-semibold text-foreground">{fmtBytesBig(totalSize)}</span> used ·{" "}
              <span className="font-semibold text-foreground">{uniqueFolders}</span> folders
            </p>
          </div>
          <button
            onClick={() => setUploadOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
        </div>
      </GlassCard>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total assets"
          value={scopedAssets.length}
          icon={<ImageIcon className="h-5 w-5" />}
          accent="var(--primary)"
          hint={mediaTab === "all" ? "all media files" : `${mediaTab} only`}
        />
        <KpiCard
          label="Total size"
          value={fmtBytesBig(totalSize)}
          icon={<HardDrive className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="storage used"
        />
        <KpiCard
          label="Folders"
          value={uniqueFolders}
          icon={<FolderIcon className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="organized collections"
        />
        <KpiCard
          label="Images"
          value={imageCount}
          icon={<Hash className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="image assets"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Sidebar (folders) — hidden on mobile, becomes horizontal pills */}
        <div className="lg:block">
          <GlassCard className="p-4">
            <div className="mb-3 hidden items-center justify-between lg:flex">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Folders
              </span>
              <button
                onClick={() => toast.info("New folder coming soon")}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="New folder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Mobile: horizontal scroll */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {folderList.map((f) => {
                const isActive = folder === f.name;
                const label = f.name === "all" ? "All assets" : f.name === "root" ? "Root" : f.name;
                return (
                  <button
                    key={f.name}
                    onClick={() => setFolder(f.name)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition lg:shrink-0",
                      isActive
                        ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {f.name === "all" ? (
                      <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <FolderIcon className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="whitespace-nowrap">{label}</span>
                    <span
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[10px]",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted-foreground/15 text-muted-foreground"
                      )}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => toast.info("New folder coming soon")}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted/40 hover:text-foreground lg:hidden"
              >
                <FolderPlus className="h-3.5 w-3.5" /> New
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Main area */}
        <div className="min-w-0 space-y-4">
          {/* Toolbar */}
          <GlassCard className="flex flex-wrap items-center gap-3 p-3">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or tag…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-lg transition",
                  view === "grid"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-lg transition",
                  view === "list"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label="List view"
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>
          </GlassCard>

          {/* Grid or list */}
          {filtered.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium">No assets match this filter</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try a different folder or search query.
              </p>
            </GlassCard>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((a) => (
                <MediaGridCard
                  key={a.id}
                  asset={a}
                  onSelect={() => setSelected(a)}
                  onUse={() => openComposer()}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="overflow-hidden p-0">
              <div className="max-h-[70vh] overflow-y-auto scroll-liquid">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur">
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-semibold">Asset</th>
                      <th className="hidden px-4 py-2 font-semibold sm:table-cell">Folder</th>
                      <th className="px-4 py-2 font-semibold">Size</th>
                      <th className="hidden px-4 py-2 font-semibold md:table-cell">Date</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => (
                      <tr
                        key={a.id}
                        className="cursor-pointer border-t border-border/40 transition hover:bg-muted/40"
                        onClick={() => setSelected(a)}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-muted">
                              {a.type === "image" && a.thumbnail ? (
                                <img
                                  src={a.thumbnail}
                                  alt={a.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className={cn("grid h-full w-full place-items-center", TYPE_META[a.type].bg)}>
                                  <TypeIcon type={a.type} className={cn("h-4 w-4", TYPE_META[a.type].color)} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-medium">{a.name}</div>
                              <div className="text-[10px] text-muted-foreground">{a.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-2 text-xs text-muted-foreground sm:table-cell">
                          {a.folder}
                        </td>
                        <td className="px-4 py-2 text-xs tabular-nums text-muted-foreground">
                          {fmtSize(a.size)}
                        </td>
                        <td className="hidden px-4 py-2 text-xs text-muted-foreground md:table-cell">
                          {isValid(parseISO(a.createdAt))
                            ? format(parseISO(a.createdAt), "MMM d, yyyy")
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openComposer();
                            }}
                            className="rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                          >
                            Use
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>
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
            const res = await fetch(`/api/media/${a.id}`, { method: "DELETE" });
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

function TypeIcon({
  type,
  className,
}: {
  type: MediaAsset["type"];
  className?: string;
}) {
  const Icon = TYPE_META[type].icon;
  return <Icon className={className} />;
}

function MediaGridCard({
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
        className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/40 bg-muted shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        {asset.type === "image" && asset.thumbnail ? (
          <img
            src={asset.thumbnail}
            alt={asset.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={cn("grid h-full w-full place-items-center", typeMeta.bg)}>
            <TypeIcon type={asset.type} className={cn("h-10 w-10", typeMeta.color)} />
          </div>
        )}

        {/* Type icon top-left */}
        <span
          className={cn(
            "absolute left-2 top-2 grid h-7 w-7 place-items-center rounded-lg backdrop-blur",
            typeMeta.bg,
            typeMeta.color
          )}
        >
          <TypeIcon type={asset.type} className="h-3.5 w-3.5" />
        </span>

        {/* Size badge top-right */}
        <span className="absolute right-2 top-2 rounded-lg bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {fmtSize(asset.size)}
        </span>

        {/* Hover overlay with name + Use */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <div className="pointer-events-none text-[11px] font-semibold text-white drop-shadow line-clamp-1">
            {asset.name}
          </div>
          <div
            className="pointer-events-auto mt-1 inline-flex w-fit items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onUse();
            }}
          >
            <Wand2 className="h-3 w-3" /> Use
          </div>
        </div>
      </button>

      {/* Below: name + tags */}
      <div className="mt-1.5 px-0.5">
        <div className="truncate text-xs font-medium leading-tight">{asset.name}</div>
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
  const [url, setUrl] = React.useState("");
  const [name, setName] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [folder, setFolder] = React.useState<string>("root");
  const [type, setType] = React.useState<"image" | "video" | "audio">("image");
  const [submitting, setSubmitting] = React.useState(false);

  const reset = () => {
    setUrl("");
    setName("");
    setTags("");
    setFolder("root");
    setType("image");
  };

  const handleSubmit = async (override?: Partial<typeof PRESET_LIBRARY[number]> & { url?: string; name?: string }) => {
    const finalUrl = override?.url ?? url;
    const finalName = override?.name ?? name;
    if (!finalUrl || !finalName) {
      toast.error("URL and name are required");
      return;
    }
    if (!user?.id) {
      toast.error("You must be signed in to upload media");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalName,
          url: finalUrl,
          type,
          tags: (override?.tags ?? tags) || null,
          folder,
          uploadedById: user.id,
        }),
      });
      if (!res.ok) throw new Error("Upload failed");
      toast.success(`"${finalName}" added`);
      reset();
      onUploaded();
    } catch {
      toast.error("Could not upload asset");
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
              <Upload className="h-4 w-4" />
            </span>
            Add media
          </DialogTitle>
          <DialogDescription>
            Paste a URL or pick from the preset library below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* === Real file upload (drag-and-drop or click) === */}
          <FileUploadZone
            onUploaded={(file, uploadedUrl) => {
              setName(file.name.replace(/\.[^/.]+$/, ""));
              setUrl(uploadedUrl);
              const mime = file.type.toLowerCase();
              if (mime.startsWith("video/")) setType("video");
              else if (mime.startsWith("audio/")) setType("audio");
              else setType("image");
            }}
            submitting={submitting}
            userId={user?.id ?? null}
            folder={folder}
            onDone={onUploaded}
          />

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">or paste a URL</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-url">Asset URL</Label>
            <Input
              id="m-url"
              placeholder="https://example.com/image.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="m-name">Name</Label>
              <Input
                id="m-name"
                placeholder="Photo name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-tags">Tags</Label>
              <Input
                id="m-tags"
                placeholder="brand, product"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "image" | "video" | "audio")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">root</SelectItem>
                  {folders
                    .filter((f) => f !== "root")
                    .map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preset library */}
          <div className="space-y-2">
            <Label>Or pick from library</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_LIBRARY.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => handleSubmit(p)}
                  disabled={submitting}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border/40 transition hover:-translate-y-0.5 hover:border-primary/40"
                  title={p.name}
                >
                  <img
                    src={p.url}
                    alt={p.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />
                  <span className="absolute bottom-1 left-1 right-1 truncate rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-medium opacity-0 transition group-hover:opacity-100">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {submitting ? "Adding…" : "Add asset"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
      <DialogContent className="sm:max-w-2xl rounded-3xl" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <span
              className={cn(
                "grid h-7 w-7 place-items-center rounded-lg",
                typeMeta.bg,
                typeMeta.color
              )}
            >
              <TypeIcon type={asset?.type ?? "image"} className="h-4 w-4" />
            </span>
            <span className="truncate">{asset?.name ?? "Asset"}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Asset preview and details</DialogDescription>
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
                  <TypeIcon type={asset.type} className={cn("h-16 w-16", typeMeta.color)} />
                </div>
              )}
              <span className="absolute left-3 top-3 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-white backdrop-blur">
                {asset.type}
              </span>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
              <span className="text-[11px] font-medium text-muted-foreground">URL</span>
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
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    navigator.clipboard.writeText(asset.url).then(
                      () => toast.success("URL copied to clipboard"),
                      () => toast.error("Could not copy URL")
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

function MediaSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="shimmer h-64 rounded-3xl" />
        <div className="space-y-3">
          <div className="shimmer h-14 rounded-3xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="shimmer aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FileUploadZone — drag-and-drop or click-to-browse file upload.
 * Uploads to /api/media/upload (multipart), saves to public/uploads/.
 * On success, calls onUploaded(file, publicUrl) so the parent can
 * prefill the URL + name + type fields.
 */
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
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("File too large (max 1.5MB for direct upload). For larger files, paste a URL below.");
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
          // Clipboard may not be available
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
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
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
          (uploading || submitting) && "pointer-events-none opacity-60"
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
            <span className="text-[13px] font-medium text-muted-foreground">{progress}</span>
          </>
        ) : (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-semibold">Drop a file or click to browse</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                PNG, JPG, MP4, MP3 · max 1.5MB · URL auto-copied after upload
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
            <div className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">Upload successful!</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {uploadedUrl.startsWith("data:") ? "Image data URL (copied to clipboard)" : uploadedUrl}
            </div>
          </div>
          <button
            onClick={copyUrl}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
              copied
                ? "bg-emerald-500 text-white"
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {copied ? (
              <><Check className="h-3 w-3" /> Copied!</>
            ) : (
              <><Copy className="h-3 w-3" /> Copy URL</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
