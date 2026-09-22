"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Save,
  ExternalLink,
  Eye,
  MousePointerClick,
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
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
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
  const avgCtr = totalVisits > 0 ? (totalClicks / totalVisits) * 100 : 0;

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

  return (
    <div className="space-y-5">
      {/* Hero */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <LinkIcon className="h-3.5 w-3.5" />
              Link-in-bio · Build &amp; preview
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Your <span className="retaina-text">link-in-bio</span> pages
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{pages.length}</span> live pages ·{" "}
              <span className="font-semibold text-foreground">{fmt(totalVisits)}</span> visits ·{" "}
              <span className="font-semibold text-foreground">{avgCtr.toFixed(1)}%</span> avg CTR.
            </p>
          </div>
          <button
            onClick={() => toast.info("Coming soon — page builder v2")}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            New page
          </button>
        </div>
      </GlassCard>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Pages"
          value={pages.length}
          icon={<Smartphone className="h-5 w-5" />}
          accent="var(--primary)"
          hint={`${pages.filter((p) => p.active).length} active`}
        />
        <KpiCard
          label="Total visits"
          value={fmt(totalVisits)}
          icon={<Eye className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="all-time"
        />
        <KpiCard
          label="Total clicks"
          value={fmt(totalClicks)}
          icon={<MousePointerClick className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="on link buttons"
        />
        <KpiCard
          label="Avg CTR"
          value={`${avgCtr.toFixed(1)}%`}
          icon={<ExternalLink className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="clicks / visits"
        />
      </div>

      {/* Pages list */}
      <GlassCard className="p-5">
        <SectionTitle
          title="Your pages"
          desc="Pick a page to edit. Toggle live status with the switch."
          action={<Sparkles className="h-4 w-4 text-primary" />}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {pages.map((p) => {
            const isActive = selectedId === p.id;
            const theme = (THEMES[p.theme as ThemeKey] ?? THEMES.rose);
            const ctr = p.visits > 0 ? (p.clicks / p.visits) * 100 : 0;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(p.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(p.id); } }}
                className={cn(
                  "group glass-sheen relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border bg-background/40 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg",
                  isActive ? "border-primary ring-2 ring-primary" : "border-border/40",
                )}
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-25 blur-2xl"
                  style={{ background: theme.color }}
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-md"
                      style={{ background: theme.gradient }}
                    >
                      <LinkIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        prism.co/{p.slug}
                      </div>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={p.active}
                      onCheckedChange={(v) => toggleActive(p, v)}
                    />
                  </div>
                </div>
                <div className="relative grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <div className="text-sm font-bold tabular-nums">{fmt(p.visits)}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Visits</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <div className="text-sm font-bold tabular-nums">{fmt(p.clicks)}</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Clicks</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                    <div className="text-sm font-bold tabular-nums">{ctr.toFixed(1)}%</div>
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">CTR</div>
                  </div>
                </div>
              </div>
            );
          })}
          {pages.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              No link-in-bio pages yet.
            </div>
          )}
        </div>
      </GlassCard>

      {/* Editor + phone preview */}
      {draft && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          {/* Editor */}
          <GlassCard className="p-5">
            <SectionTitle
              title="Editor"
              desc={`Editing prism.co/${draft.slug}`}
              action={
                <button
                  onClick={savePage}
                  disabled={saving}
                  className="liquid-pill flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Save changes"}
                </button>
              }
            />

            <div className="space-y-4">
              {/* Title + subtitle */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lb-title">Title</Label>
                  <Input
                    id="lb-title"
                    value={draft.title}
                    onChange={(e) => updateDraft({ title: e.target.value })}
                    placeholder="Your page title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lb-subtitle">Subtitle</Label>
                  <Input
                    id="lb-subtitle"
                    value={draft.subtitle ?? ""}
                    onChange={(e) => updateDraft({ subtitle: e.target.value || null })}
                    placeholder="A short tagline"
                  />
                </div>
              </div>

              {/* Avatar URL */}
              <div className="space-y-2">
                <Label htmlFor="lb-avatar">Avatar URL</Label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
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
                  />
                </div>
              </div>

              {/* Theme picker */}
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(THEMES) as ThemeKey[]).map((t) => {
                    const isActive = (draft.theme ?? "rose") === t;
                    return (
                      <button
                        key={t}
                        onClick={() => changeTheme(t)}
                        aria-label={`Theme ${THEMES[t].label}`}
                        className={cn(
                          "relative h-9 w-9 rounded-full shadow-md transition-all",
                          isActive
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "ring-1 ring-border/60 hover:scale-105",
                        )}
                        style={{ background: THEMES[t].gradient }}
                      >
                        {isActive && (
                          <CheckCircle2 className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Links manager */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Links ({draft.links.length})</Label>
                  <button
                    onClick={addLink}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                  >
                    <Plus className="h-3 w-3" /> Add link
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.links.map((link, idx) => {
                    const Icon = iconComponent(link.icon);
                    return (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-background/40 p-2 sm:flex-nowrap"
                      >
                        <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground/60 sm:block" />
                        <Select
                          value={link.icon}
                          onValueChange={(v) => updateLink(idx, { icon: v })}
                        >
                          <SelectTrigger className="h-9 w-[140px] shrink-0 rounded-xl">
                            <span className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              <SelectValue />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_SET.map((opt) => {
                              const OptIcon = opt.component;
                              return (
                                <SelectItem key={opt.name} value={opt.name}>
                                  <span className="flex items-center gap-2">
                                    <OptIcon className="h-3.5 w-3.5" />
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
                          className="h-9 min-w-[120px] flex-1 rounded-xl"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => updateLink(idx, { url: e.target.value })}
                          placeholder="https://"
                          className="h-9 min-w-[140px] flex-1 rounded-xl"
                        />
                        <button
                          onClick={() => removeLink(idx)}
                          aria-label="Remove link"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-500 transition hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {draft.links.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                      No links yet. Add one to make your page live.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Phone preview */}
          <PhonePreview page={draft} />
        </div>
      )}
    </div>
  );
}

function PhonePreview({ page }: { page: LinkBioPage }) {
  const theme = THEMES[(page.theme as ThemeKey) ?? "rose"] ?? THEMES.rose;
  const isDark = page.theme === "dark";
  const ctr = page.visits > 0 ? (page.clicks / page.visits) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <SectionTitle title="Live preview" desc="iPhone 15 Pro" />
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
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white" style={{ background: theme.color }}>
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
              made with <Sparkles className="h-2.5 w-2.5" /> Prism
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
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-32 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="shimmer h-[460px] rounded-3xl" />
        <div className="shimmer h-[460px] rounded-3xl" />
      </div>
    </div>
  );
}
