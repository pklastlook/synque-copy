"use client";

import * as React from "react";
import {
  Link2, Copy, Check, Trash2, History, ExternalLink,
  Sparkles, QrCode, Loader2, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SectionHeader, ListRow, Pill, BentoGrid, BentoTile,
} from "@/components/glass/dense-ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HelpText } from "@/components/glass/help-text";

// ============================================================================
// Types
// ============================================================================
interface GeneratedLink {
  id: string;
  url: string;
  short: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
  createdAt: string;
}

// ============================================================================
// Constants — common UTM presets so users don't have to type from scratch.
// ============================================================================
const SOURCES = ["facebook", "instagram", "x", "linkedin", "tiktok", "newsletter", "email", "google", "reddit", "youtube"];
const MEDIUMS = ["social", "email", "cpc", "paid-social", "organic", "referral", "display", "affiliate"];
const PRIORITIES = ["spring_sale", "black_friday", "launch", "webinar", "ebook_download"];

const HISTORY_KEY = "synque-utm-history";
const MAX_HISTORY = 25;

// ============================================================================
// Main view
// ============================================================================
export function UTMBuilderView() {
  const [baseUrl, setBaseUrl] = React.useState("");
  const [source, setSource] = React.useState("");
  const [medium, setMedium] = React.useState("");
  const [campaign, setCampaign] = React.useState("");
  const [term, setTerm] = React.useState("");
  const [content, setContent] = React.useState("");

  const [history, setHistory] = React.useState<GeneratedLink[]>([]);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Load history from localStorage on mount
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw) as GeneratedLink[]);
    } catch { /* ignore */ }
  }, []);

  function persist(next: GeneratedLink[]) {
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function getToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
    } catch { return null; }
  }

  // ----- live preview (computed client-side, no API roundtrip) -----
  const preview = React.useMemo(() => {
    if (!baseUrl) return null;
    let u: URL;
    try {
      const withScheme = /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`;
      u = new URL(withScheme);
    } catch { return null; }
    const slug = (s: string) =>
      s.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
    const s = slug(source), m = slug(medium), c = slug(campaign);
    if (s) u.searchParams.set("utm_source", s);
    if (m) u.searchParams.set("utm_medium", m);
    if (c) u.searchParams.set("utm_campaign", c);
    if (term) u.searchParams.set("utm_term", slug(term));
    if (content) u.searchParams.set("utm_content", slug(content));
    return {
      url: u.toString(),
      short: `${u.origin}${u.pathname === "/" ? "" : u.pathname}?utm_campaign=${encodeURIComponent(c)}`,
      params: { source: s, medium: m, campaign: c },
    };
  }, [baseUrl, source, medium, campaign, term, content]);

  const canGenerate = !!baseUrl && !!source && !!medium && !!campaign;

  async function saveToHistory() {
    if (!preview || !canGenerate) {
      toast.error("Fill in URL, source, medium, and campaign first");
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch("/api/utm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: baseUrl, source, medium, campaign, term, content }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error((json as { error?: string }).error ?? "Failed to generate UTM link");
        return;
      }
      const link: GeneratedLink = {
        id: crypto.randomUUID(),
        url: (json as { url: string }).url,
        short: (json as { short: string }).short,
        source, medium, campaign, term, content,
        createdAt: new Date().toISOString(),
      };
      persist([link, ...history].slice(0, MAX_HISTORY));
      toast.success("Saved to history", { description: link.short });
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  function clearForm() {
    setBaseUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
    setTerm("");
    setContent("");
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  function removeHistory(id: string) {
    persist(history.filter((h) => h.id !== id));
  }

  function clearHistory() {
    if (history.length === 0) return;
    if (!confirm(`Clear ${history.length} saved UTM link(s)?`)) return;
    persist([]);
    toast.success("History cleared");
  }

  return (
    <div className="space-y-4">
      <HelpText module="utm-builder">
        <strong className="text-foreground">UTM Builder</strong> — generate campaign tracking links
        for Google Analytics, Adobe, or any platform that reads utm_* params. Saved links stay
        on this device.
      </HelpText>

      <SectionHeader
        title="UTM Builder"
        icon={Link2}
        desc="Generate trackable URLs with utm_source / medium / campaign params"
        action={
          <Pill color="blue">
            <Sparkles className="h-2.5 w-2.5" />
            {history.length} saved
          </Pill>
        }
      />

      <BentoGrid className="lg:grid-cols-2">
        {/* ============================ FORM ============================ */}
        <BentoTile span="1x2" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight">Link parameters</h3>
            <button
              onClick={clearForm}
              className="text-[10px] font-semibold text-muted-foreground transition hover:text-foreground"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="utm-url" className="text-[11px] font-semibold">Destination URL *</Label>
            <Input
              id="utm-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com/landing-page"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="utm-source" className="text-[11px] font-semibold">Source *</Label>
              <Input
                id="utm-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="facebook"
                list="utm-sources"
                className="text-xs"
              />
              <datalist id="utm-sources">
                {SOURCES.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="utm-medium" className="text-[11px] font-semibold">Medium *</Label>
              <Input
                id="utm-medium"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                placeholder="cpc"
                list="utm-mediums"
                className="text-xs"
              />
              <datalist id="utm-mediums">
                {MEDIUMS.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="utm-campaign" className="text-[11px] font-semibold">Campaign *</Label>
            <Input
              id="utm-campaign"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="spring_sale_2024"
              list="utm-campaigns"
              className="text-xs"
            />
            <datalist id="utm-campaigns">
              {PRIORITIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="utm-term" className="text-[11px] font-semibold">Term (optional)</Label>
              <Input
                id="utm-term"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="running+shoes"
                className="text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="utm-content" className="text-[11px] font-semibold">Content (optional)</Label>
              <Input
                id="utm-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="red_button"
                className="text-xs"
              />
            </div>
          </div>

          <Button
            onClick={saveToHistory}
            disabled={!canGenerate || saving}
            className="w-full text-xs font-semibold"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Generate & Save to History
          </Button>
        </BentoTile>

        {/* ============================ PREVIEW ============================ */}
        <BentoTile span="1x2" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-tight">Live preview</h3>
            {preview && (
              <button
                onClick={() => copy(preview.url, "preview")}
                className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20"
              >
                {copiedId === "preview" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copy URL
              </button>
            )}
          </div>

          {!preview ? (
            <div className="grid h-[260px] place-items-center rounded-lg border border-dashed border-border/40 bg-muted/10 text-center">
              <div>
                <Link2 className="mx-auto h-7 w-7 text-muted-foreground/40" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Start typing a URL to see the tracked link preview
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* URL preview box */}
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Tracked URL</div>
                <p className="break-all font-mono text-[11px] leading-relaxed text-foreground">{preview.url}</p>
              </div>

              {/* Param pills */}
              <div className="flex flex-wrap gap-1.5">
                {preview.params.source && <Pill color="blue">src: {preview.params.source}</Pill>}
                {preview.params.medium && <Pill color="violet">med: {preview.params.medium}</Pill>}
                {preview.params.campaign && <Pill color="green">cmp: {preview.params.campaign}</Pill>}
                {term && <Pill color="amber">term: {term}</Pill>}
                {content && <Pill color="rose">ctn: {content}</Pill>}
              </div>

              {/* QR code — uses the qrserver.com public API so we don't add a new dependency. */}
              <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/10 p-3">
                <div className="grid h-[120px] w-[120px] shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(preview.url)}`}
                    alt="QR code for tracked URL"
                    width={120}
                    height={120}
                    onError={(e) => { (e.currentTarget.style.display = "none"); }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    <QrCode className="h-3 w-3" /> QR Code
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    Scan to open the tracked URL on any device. Generated on demand from a public QR service.
                  </p>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(preview.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                  >
                    <ExternalLink className="h-2.5 w-2.5" />
                    Download high-res
                  </a>
                </div>
              </div>
            </>
          )}
        </BentoTile>
      </BentoGrid>

      {/* ============================ HISTORY ============================ */}
      <SectionHeader
        title="Saved links"
        icon={History}
        desc={`${history.length} UTM link(s) stored locally on this device`}
        action={
          history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </button>
          )
        }
      />

      {history.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border/40 bg-muted/10 py-10 text-center">
          <History className="h-7 w-7 text-muted-foreground/40" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            No saved UTM links yet. Generate one above and click "Save to History".
          </p>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          {history.map((h) => (
            <ListRow key={h.id} className="!py-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill color="blue">{h.source}</Pill>
                  <Pill color="violet">{h.medium}</Pill>
                  <Pill color="green">{h.campaign}</Pill>
                  {h.term && <Pill color="amber">{h.term}</Pill>}
                  {h.content && <Pill color="rose">{h.content}</Pill>}
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{h.url}</p>
                <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                  {new Date(h.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => copy(h.url, h.id)}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg transition",
                    copiedId === h.id
                      ? "bg-emerald-500/15 text-emerald-600"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}
                  title="Copy URL"
                >
                  {copiedId === h.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <a
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
                  title="Open URL"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={() => removeHistory(h.id)}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground transition hover:bg-rose-500/15 hover:text-rose-600"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </ListRow>
          ))}
        </div>
      )}
    </div>
  );
}
