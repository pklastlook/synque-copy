"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Save,
  ExternalLink,
  Eye,
  Link as LinkIcon,
  Globe,
  Smartphone,
  Sparkles,
  GripVertical,
  ShoppingBag,
  BookOpen,
  Play,
  Music,
  Mail,
  MessageCircle,
  Instagram,
  Youtube,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { HelpText } from "@/components/glass/help-text";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  MetricRow,
  ListRow,
  Pill,
  SectionHeader,
  type Metric,
} from "@/components/glass/dense-ui";

interface LinkItem {
  title: string;
  url: string;
  icon: string;
}

interface LinkBioPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  avatar: string | null;
  theme: string;
  visits: number;
  clicks: number;
  accountId: string | null;
  active: boolean;
  links: LinkItem[];
  createdAt: string;
}

type ThemeKey = "rose" | "teal" | "amber" | "magenta" | "green" | "dark";

const THEMES: Record<ThemeKey, { color: string; gradient: string; label: string }> = {
  rose: {
    color: "oklch(0.7 0.24 14)",
    gradient: "linear-gradient(160deg, oklch(0.72 0.24 14) 0%, oklch(0.66 0.22 305) 100%)",
    label: "Rose",
  },
  teal: {
    color: "oklch(0.74 0.18 165)",
    gradient: "linear-gradient(160deg, oklch(0.74 0.18 165) 0%, oklch(0.6 0.14 200) 100%)",
    label: "Teal",
  },
  amber: {
    color: "oklch(0.78 0.18 75)",
    gradient: "linear-gradient(160deg, oklch(0.8 0.18 75) 0%, oklch(0.7 0.2 25) 100%)",
    label: "Amber",
  },
  magenta: {
    color: "oklch(0.66 0.22 305)",
    gradient: "linear-gradient(160deg, oklch(0.66 0.22 305) 0%, oklch(0.55 0.24 350) 100%)",
    label: "Magenta",
  },
  green: {
    color: "oklch(0.76 0.18 145)",
    gradient: "linear-gradient(160deg, oklch(0.76 0.18 145) 0%, oklch(0.6 0.16 165) 100%)",
    label: "Green",
  },
  dark: {
    color: "oklch(0.18 0.02 250)",
    gradient: "linear-gradient(160deg, oklch(0.16 0.02 260) 0%, oklch(0.08 0 0) 100%)",
    label: "Midnight",
  },
};

const ICON_SET: { name: string; component: React.ElementType }[] = [
  { name: "shopping-bag", component: ShoppingBag },
  { name: "book-open", component: BookOpen },
  { name: "play", component: Play },
  { name: "music", component: Music },
  { name: "mail", component: Mail },
  { name: "message-circle", component: MessageCircle },
  { name: "link", component: LinkIcon },
  { name: "globe", component: Globe },
  { name: "instagram", component: Instagram },
  { name: "youtube", component: Youtube },
];

function iconComponent(name: string): React.ElementType {
  return ICON_SET.find((i) => i.name === name)?.component ?? LinkIcon;
}

/**
 * Synthesize a small 7-point sparkline trend from a single aggregate.
 * Deterministic per (total, seed) so the curve is stable across renders.
 * The API exposes only totals — we approximate a believable trend shape.
 */
function synthSpark(total: number, seed: number, length = 8): number[] {
  if (total <= 0) return Array.from({ length }, () => 0);
  const base = total / length;
  return Array.from({ length }, (_, i) => {
    const trend = 0.55 + (i / (length - 1)) * 0.65;
    const noise = 0.7 + Math.abs(Math.sin((i + 1) * (seed + 1.3) * 0.62)) * 0.55;
    return Math.max(0, Math.round(base * trend * noise));
  });
}

export function LinkBioView() {
  const { data, loading, reload } = useApi<LinkBioPage[]>("/api/linkbio");

  const pages = data ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Local edit buffer for the selected page — initialized from server data.
  const [draft, setDraft] = React.useState<LinkBioPage | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Initialise selection + draft whenever data arrives / changes.
  React.useEffect(() => {
    if (pages.length === 0) {
      if (draft) setDraft(null);
      return;
    }
    if (!selectedId || !pages.some((p) => p.id === selectedId)) {
      setSelectedId(pages[0].id);
    }
  }, [pages, selectedId, draft]);

  React.useEffect(() => {
    if (!selectedId || !data) return;
    const serverPage = data.find((p) => p.id === selectedId);
    if (!serverPage) return;
    // Only reset draft when switching to a different page (not on every reload).
    setDraft((prev) => {
      if (prev && prev.id === selectedId) {
        // Merge server values that aren't user-editable: visits/clicks/active/slug.
        return {
          ...serverPage,
          title: prev.title,
          subtitle: prev.subtitle,
          avatar: prev.avatar,
          theme: prev.theme,
          links: prev.links,
        };
      }
      return serverPage;
    });
  }, [selectedId, data]);

  if (loading || !data) return <LinkBioSkeleton />;

  const totalVisits = pages.reduce((s, p) => s + p.visits, 0);
  const totalClicks = pages.reduce((s, p) => s + p.clicks, 0);
  const totalLinks = pages.reduce((s, p) => s + p.links.length, 0);
  const activePages = pages.filter((p) => p.active).length;
  const avgCtr = totalVisits > 0 ? (totalClicks / totalVisits) * 100 : 0;

  const metrics: Metric[] = [
    {
      label: "Pages",
      value: pages.length,
      spark: synthSpark(pages.length, 1),
      color: "var(--primary)",
    },
    {
      label: "Active",
      value: activePages,
      spark: synthSpark(activePages, 2),
      color: "oklch(0.76 0.18 145)",
    },
    {
      label: "Total links",
      value: totalLinks,
      spark: synthSpark(totalLinks, 3),
      color: "oklch(0.74 0.18 165)",
    },
    {
      label: "Total visits",
      value: fmt(totalVisits),
      spark: synthSpark(totalVisits, 4),
      color: "oklch(0.7 0.24 14)",
    },
    {
      label: "Total clicks",
      value: fmt(totalClicks),
      spark: synthSpark(totalClicks, 5),
      color: "oklch(0.66 0.22 305)",
    },
    {
      label: "Avg CTR",
      value: `${avgCtr.toFixed(1)}%`,
      spark: synthSpark(Math.round(avgCtr * 10), 6),
      color: "oklch(0.78 0.18 75)",
    },
  ];

  const toggleActive = async (page: LinkBioPage, next: boolean) => {
    setDraft((prev) => (prev && prev.id === page.id ? { ...prev, active: next } : prev));
    try {
      await fetch("/api/linkbio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: page.id, active: next }),
      });
      toast.success(next ? "Page published" : "Page paused");
      reload();
    } catch {
      toast.error("Could not update page");
    }
  };

  const changeTheme = async (themeKey: ThemeKey) => {
    if (!draft) return;
    setDraft({ ...draft, theme: themeKey });
    try {
      await fetch("/api/linkbio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id, theme: themeKey }),
      });
      toast.success(`Theme: ${THEMES[themeKey].label}`);
      reload();
    } catch {
      toast.error("Could not change theme");
    }
  };

  const createNewPage = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/linkbio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled page" }),
      });
      if (!res.ok) throw new Error("Failed");
      const j = await res.json();
      toast.success("New page created", { description: `prism.co/${j.slug}` });
      setSelectedId(j.id);
      reload();
    } catch {
      toast.error("Could not create page");
    } finally {
      setSaving(false);
    }
  };

  const savePage = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/linkbio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          title: draft.title,
          subtitle: draft.subtitle,
          theme: draft.theme,
          links: draft.links,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Changes saved");
      reload();
    } catch {
      toast.error("Could not save changes");
    } finally {
      setSaving(false);
    }
  };

  const deletePage = async (page: LinkBioPage) => {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/linkbio/${page.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Page deleted");
      setSelectedId(null);
      setDraft(null);
      reload();
    } catch {
      toast.error("Could not delete page");
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (patch: Partial<LinkBioPage>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateLink = (idx: number, patch: Partial<LinkItem>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      links: draft.links.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    });
  };

  const removeLink = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, links: draft.links.filter((_, i) => i !== idx) });
  };

  const addLink = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      links: [...draft.links, { title: "New link", url: "https://", icon: "link" }],
    });
  };

  /** Reorder a link up (-1) or down (+1) — dense UI replacement for DnD. */
  const moveLink = (idx: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = idx + dir;
    if (next < 0 || next >= draft.links.length) return;
    const links = [...draft.links];
    [links[idx], links[next]] = [links[next], links[idx]];
    setDraft({ ...draft, links });
  };

  return (
    <div className="space-y-4">
      <HelpText module="link-bio">
        <strong className="text-foreground">Link in Bio</strong> creates a customizable landing page
        for your social profiles. Pick a page on the left, edit in the middle, watch the phone preview
        update live on the right.
      </HelpText>

      {/* Dense metrics band — single ~56px row */}
      <MetricRow metrics={metrics} />

      {/* Master-detail: list (left) | editor (middle) | sticky preview (right) */}
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        {/* ===== LEFT: pages list ===== */}
        <GlassCard className="flex max-h-[calc(100vh-200px)] flex-col overflow-hidden p-0">
          <div className="border-b border-border/40 px-3 py-2.5">
            <SectionHeader
              title="Your pages"
              icon={LinkIcon}
              desc={`${pages.length} total`}
              action={
                <button
                  onClick={createNewPage}
                  disabled={saving}
                  className="liquid-pill flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold disabled:opacity-60"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
              }
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto scroll-liquid">
            {pages.map((p) => {
              const isActive = selectedId === p.id;
              const theme = THEMES[p.theme as ThemeKey] ?? THEMES.rose;
              const ctr = p.visits > 0 ? (p.clicks / p.visits) * 100 : 0;
              return (
                <ListRow
                  key={p.id}
                  active={isActive}
                  onClick={() => setSelectedId(p.id)}
                  className="gap-2.5"
                >
                  <div
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-sm"
                    style={{ background: theme.gradient }}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold">{p.title}</span>
                      {p.active ? (
                        <Pill color="green">live</Pill>
                      ) : (
                        <Pill color="amber">draft</Pill>
                      )}
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      prism.co/{p.slug} · {fmt(p.visits)} visits
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="num-display text-xs font-bold tabular-nums leading-none">
                      {ctr.toFixed(1)}%
                    </div>
                    <div className="label-caps mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      CTR
                    </div>
                  </div>
                </ListRow>
              );
            })}
            {pages.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No pages yet. Click <span className="font-semibold">New</span> to create one.
              </div>
            )}
          </div>
        </GlassCard>

        {/* ===== MIDDLE: editor ===== */}
        {draft ? (
          <GlassCard className="p-4">
            <SectionHeader
              title="Editor"
              icon={Smartphone}
              desc={`prism.co/${draft.slug}`}
              action={
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => deletePage(draft)}
                    disabled={saving}
                    aria-label="Delete page"
                    className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={savePage}
                    disabled={saving}
                    className="liquid-pill flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60"
                  >
                    <Save className="h-3 w-3" />
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              }
            />

            <div className="space-y-3">
              {/* Title + subtitle */}
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="lb-title" className="text-[11px]">
                    Title
                  </Label>
                  <Input
                    id="lb-title"
                    value={draft.title}
                    onChange={(e) => updateDraft({ title: e.target.value })}
                    placeholder="Your page title"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lb-subtitle" className="text-[11px]">
                    Subtitle
                  </Label>
                  <Input
                    id="lb-subtitle"
                    value={draft.subtitle ?? ""}
                    onChange={(e) => updateDraft({ subtitle: e.target.value || null })}
                    placeholder="A short tagline"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Avatar + live toggle */}
              <div className="grid gap-2 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                  {draft.avatar ? (
                    <img
                      src={draft.avatar}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-[10px] font-medium text-muted-foreground">
                      {draft.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <Input
                  id="lb-avatar"
                  value={draft.avatar ?? ""}
                  onChange={(e) => updateDraft({ avatar: e.target.value || null })}
                  placeholder="https://example.com/avatar.png"
                  className="h-9"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="lb-active" className="text-[11px] text-muted-foreground">
                    Live
                  </Label>
                  <Switch
                    id="lb-active"
                    checked={draft.active}
                    onCheckedChange={(v) => toggleActive(draft, v)}
                  />
                </div>
              </div>

              {/* Theme picker */}
              <div className="space-y-1.5">
                <Label className="text-[11px]">Theme</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(THEMES) as ThemeKey[]).map((t) => {
                    const isActive = (draft.theme ?? "rose") === t;
                    return (
                      <button
                        key={t}
                        onClick={() => changeTheme(t)}
                        aria-label={`Theme ${THEMES[t].label}`}
                        className={cn(
                          "relative h-7 w-7 rounded-full shadow transition-all",
                          isActive
                            ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                            : "ring-1 ring-border/60 hover:scale-105",
                        )}
                        style={{ background: THEMES[t].gradient }}
                      >
                        {isActive && (
                          <CheckCircle2 className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Links manager — dense, reorderable rows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px]">Links ({draft.links.length})</Label>
                  <button
                    onClick={addLink}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20"
                  >
                    <Plus className="h-3 w-3" /> Add link
                  </button>
                </div>
                <div className="space-y-1.5">
                  {draft.links.map((link, idx) => {
                    const Icon = iconComponent(link.icon);
                    return (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/40 bg-background/40 p-1.5 sm:flex-nowrap"
                      >
                        <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 sm:block" />
                        <div className="flex shrink-0 flex-col">
                          <button
                            onClick={() => moveLink(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Move up"
                            className="grid h-4 w-4 place-items-center text-muted-foreground transition hover:text-foreground disabled:opacity-20"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveLink(idx, 1)}
                            disabled={idx === draft.links.length - 1}
                            aria-label="Move down"
                            className="grid h-4 w-4 place-items-center text-muted-foreground transition hover:text-foreground disabled:opacity-20"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <Select
                          value={link.icon}
                          onValueChange={(v) => updateLink(idx, { icon: v })}
                        >
                          <SelectTrigger className="h-8 w-[120px] shrink-0 rounded-lg">
                            <span className="flex items-center gap-1.5">
                              <Icon className="h-3 w-3" />
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_SET.map((opt) => {
                              const OptIcon = opt.component;
                              return (
                                <SelectItem key={opt.name} value={opt.name}>
                                  <span className="flex items-center gap-1.5">
                                    <OptIcon className="h-3 w-3" />
                                    {opt.name}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Input
                          value={link.title}
                          onChange={(e) => updateLink(idx, { title: e.target.value })}
                          placeholder="Button label"
                          className="h-8 min-w-[100px] flex-1 rounded-lg"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => updateLink(idx, { url: e.target.value })}
                          placeholder="https://"
                          className="h-8 min-w-[120px] flex-1 rounded-lg"
                        />
                        <button
                          onClick={() => removeLink(idx)}
                          aria-label="Remove link"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                  {draft.links.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
                      No links yet. Add one to make your page live.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="grid place-items-center p-8 text-center text-xs text-muted-foreground">
            <div className="space-y-1">
              <Smartphone className="mx-auto h-6 w-6 text-muted-foreground/50" />
              <p>Select a page on the left to edit it.</p>
            </div>
          </GlassCard>
        )}

        {/* ===== RIGHT: sticky phone preview ===== */}
        {draft && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <PhonePreview page={draft} />
          </div>
        )}
      </div>
    </div>
  );
}

function PhonePreview({ page }: { page: LinkBioPage }) {
  const theme = THEMES[(page.theme as ThemeKey) ?? "rose"] ?? THEMES.rose;
  const isDark = page.theme === "dark";
  const ctr = page.visits > 0 ? (page.clicks / page.visits) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <SectionHeader title="Live preview" desc="iPhone 15 Pro" className="w-full" />
      <div className="relative h-[620px] w-[300px] shrink-0 rounded-[2.8rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl">
        {/* Notch */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-neutral-900" />
        {/* Screen */}
        <div
          className="relative h-full w-full overflow-y-auto overflow-x-hidden rounded-[2.1rem] scroll-liquid"
          style={{ background: theme.gradient }}
        >
          {/* URL bar */}
          <div className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-black/20 px-3 py-2 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-medium text-white">
              <Globe className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">prism.co/{page.slug}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[9px] font-semibold text-white">
              <Eye className="h-2.5 w-2.5" />
              {fmt(page.visits)}
            </div>
          </div>

          {/* Profile */}
          <div className="flex flex-col items-center px-5 pb-6 pt-8 text-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-[3px] border-white/40 shadow-xl">
              {page.avatar ? (
                <img
                  src={page.avatar}
                  alt={page.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-white/20 text-2xl font-bold text-white">
                  {page.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h1
              className={cn(
                "mt-3 text-lg font-bold leading-tight",
                isDark ? "text-white" : "text-white",
              )}
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.78) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {page.title || "Untitled page"}
            </h1>
            {page.subtitle && (
              <p
                className={cn(
                  "mt-1 max-w-[220px] text-[11px] leading-snug",
                  isDark ? "text-white/70" : "text-white/85",
                )}
              >
                {page.subtitle}
              </p>
            )}
          </div>

          {/* Links */}
          <div className="space-y-2 px-4 pb-8">
            {page.links.map((link, idx) => {
              const Icon = iconComponent(link.icon);
              return (
                <a
                  key={idx}
                  href={link.url}
                  onClick={(e) => e.preventDefault()}
                  className="group flex items-center gap-2.5 rounded-2xl bg-white/90 px-3.5 py-2.5 text-neutral-900 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg active:scale-[0.98]"
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: theme.color }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                    {link.title || "Untitled"}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400 transition group-hover:text-neutral-700" />
                </a>
              );
            })}
            {page.links.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/30 bg-white/5 px-4 py-6 text-center text-[11px] text-white/70">
                Add links to see them here.
              </div>
            )}
          </div>

          {/* Footer brand */}
          <div className="px-4 pb-5 text-center">
            <div className="inline-flex items-center gap-1 text-[9px] font-medium text-white/60">
              made with <Sparkles className="h-2.5 w-2.5" /> SocialFlow
            </div>
          </div>
        </div>

        {/* Visit / click overlay */}
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-xl bg-black/60 px-2.5 py-1.5 text-right backdrop-blur-md">
          <div className="text-[9px] font-medium uppercase tracking-wide text-white/60">CTR</div>
          <div className="text-xs font-bold text-white">{ctr.toFixed(1)}%</div>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        {fmt(page.clicks)} clicks · {fmt(page.visits)} visits
      </p>
    </div>
  );
}

function LinkBioSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-12 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
        <div className="shimmer h-[460px] rounded-2xl" />
        <div className="shimmer h-[460px] rounded-2xl" />
        <div className="shimmer h-[460px] rounded-2xl" />
      </div>
    </div>
  );
}
