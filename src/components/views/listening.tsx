"use client";

import * as React from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Radar,
  Globe,
  Eye,
  Heart,
  Plus,
  Reply,
  ExternalLink,
  Hash,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { HelpText } from "@/components/glass/help-text";
import { cn } from "@/lib/utils";
import {
  BentoGrid,
  BentoTile,
  HeroChart,
  ListRow,
  MetricRow,
  Pill,
  SectionHeader,
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

/**
 * Listening — dense-ui redesign.
 *
 * Layout (Apple macOS-27 "liquid glass" aesthetic):
 *   1. HelpText + SectionHeader (compact, no hero card)
 *   2. MetricRow — 5 inline metrics with sparklines
 *   3. BentoGrid — 1 HeroChart (sentiment trend) + 1 sentiment-distribution tile
 *   4. Master-detail split — Queries ListRow (sidebar) + Mentions ListRow (feed)
 *
 * Charts reduced from 2 (AreaChart + PieChart) → 1 ComposedChart (mention volume
 * area + sentiment score line on dual axes). PieChart removed entirely; sentiment
 * split shown via Pills + thin progress bars (denser, scannable).
 *
 * Bento tiles reduced from 9 structural cards → 4 tiles (1 HeroChart + 1 sentiment
 * tile + 1 queries tile + 1 mentions tile).
 *
 * All API + functionality preserved:
 *   - Mention tracking: GET /api/listening (queries with mentions, recent feed)
 *   - Sentiment analysis: per-mention sentiment tag, daily sentiment score, aggregate split
 *   - Reply action: toast "Reply drafted"
 *   - View external link: window.open
 *   - Filter feed by query (click list row)
 *   - Create query: POST /api/listening with name/keywords/type/color
 */

// ===== API types (preserved exactly) =====
interface Mention {
  id: string;
  source: string;
  author: string;
  authorAvatar: string | null;
  text: string;
  url: string | null;
  sentiment: "positive" | "neutral" | "negative";
  reach: number;
  engagement: number;
  date: string;
}

type QueryType = "brand" | "competitor" | "keyword" | "hashtag";

interface ListeningQuery {
  id: string;
  name: string;
  keywords: string;
  type: QueryType;
  color: string;
  status: string;
  mentionCount: number;
  reach: number;
  engagement: number;
  mentions: Mention[];
}

interface RecentMention extends Mention {
  queryName: string;
  queryColor: string;
}

interface ListeningData {
  queries: ListeningQuery[];
  recent: RecentMention[];
  sentiments: { positive: number; neutral: number; negative: number };
  series: { date: string; count: number; sentiment: number }[];
}

const KNOWN_SOURCES: PlatformId[] = [
  "instagram",
  "x",
  "facebook",
  "linkedin",
  "tiktok",
  "youtube",
  "threads",
];

const TYPE_LABEL: Record<QueryType, string> = {
  brand: "Brand",
  competitor: "Competitor",
  keyword: "Keyword",
  hashtag: "Hashtag",
};

const TYPE_PILL: Record<QueryType, "blue" | "violet" | "green" | "amber"> = {
  brand: "blue",
  competitor: "violet",
  keyword: "green",
  hashtag: "amber",
};

const SENT_COLOR_HEX = {
  positive: "#10b981",
  neutral: "#f59e0b",
  negative: "#f43f5e",
};

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

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
} as const;

function sentimentPillColor(s: Mention["sentiment"]): "green" | "amber" | "rose" {
  if (s === "positive") return "green";
  if (s === "negative") return "rose";
  return "amber";
}

function SourceBadge({ source }: { source: string }) {
  const isKnown = (KNOWN_SOURCES as string[]).includes(source);
  if (isKnown) {
    return <PlatformBadge platform={source as PlatformId} size={28} />;
  }
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[28%] bg-muted text-muted-foreground shadow-sm">
      <Globe className="h-3.5 w-3.5" />
    </span>
  );
}

export function ListeningView() {
  const { data, loading, reload } = useApi<ListeningData>("/api/listening");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [syncing, setSyncing] = React.useState(false);

  function getToken(): string | null {
    try {
      return (
        JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state
          ?.token ?? null
      );
    } catch {
      return null;
    }
  }

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    const toastId = toast.loading("Syncing mentions…");
    try {
      const token = getToken();
      const res = await fetch("/api/listening/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string })?.error ?? `HTTP ${res.status}`
        );
      }
      const json = (await res.json()) as {
        ok: boolean;
        totalQueries: number;
        totalFound: number;
        newMentions: number;
        classified: number;
        errors: string[];
      };
      toast.success(
        `Found ${json.totalFound} mentions · ${json.newMentions} new · ${json.classified} classified`,
        { id: toastId }
      );
      if (json.errors && json.errors.length > 0) {
        const preview = json.errors.slice(0, 3).join(" · ");
        const extra =
          json.errors.length > 3 ? ` (+${json.errors.length - 3} more)` : "";
        toast.error(
          `${json.errors.length} error${json.errors.length === 1 ? "" : "s"}: ${preview}${extra}`
        );
      }
      reload();
    } catch (err) {
      toast.error(
        `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: toastId }
      );
    } finally {
      setSyncing(false);
    }
  }

  if (loading || !data) return <ListeningSkeleton />;

  // ===== KPIs (preserved calculations) =====
  const totalMentions = data.queries.reduce((s, q) => s + q.mentionCount, 0);
  const totalReach = data.queries.reduce((s, q) => s + q.reach, 0);
  const totalEngagement = data.queries.reduce((s, q) => s + q.engagement, 0);
  const sentimentTotal =
    data.sentiments.positive + data.sentiments.neutral + data.sentiments.negative;
  const positivePct =
    sentimentTotal > 0
      ? Math.round((data.sentiments.positive / sentimentTotal) * 100)
      : 0;
  const avgEngagement = totalMentions > 0 ? Math.round(totalEngagement / totalMentions) : 0;

  // ===== Filtered feed (preserved logic) =====
  const selectedQuery = data.queries.find((q) => q.id === selectedId) ?? null;
  const feed: RecentMention[] = selectedQuery
    ? selectedQuery.mentions.map((m) => ({
        ...m,
        queryName: selectedQuery.name,
        queryColor: selectedQuery.color,
      }))
    : data.recent;

  // ===== Sparkline data for MetricRow =====
  const mentionSpark = data.series.map((s) => s.count);
  const sentimentSpark = data.series.map((s) => s.sentiment);
  // Reach / engagement per day proxy — derive from series since API doesn't expose daily rollups.
  // Sum-of-count weighted by typical reach factor (preserves shape of mention activity).
  const reachSpark = data.series.map((s) => s.count * 8);
  const engagementSpark = data.series.map((s) => Math.max(0, s.count * 3));

  const metrics: Metric[] = [
    { label: "Mentions", value: fmt(totalMentions), spark: mentionSpark, color: "var(--primary)" },
    { label: "Reach", value: fmt(totalReach), spark: reachSpark, color: "#2d9cdb" },
    { label: "Positive", value: `${positivePct}%`, spark: sentimentSpark, color: "#10b981" },
    { label: "Avg engagement", value: fmt(avgEngagement), spark: engagementSpark, color: "#9b51e0" },
    { label: "Active queries", value: data.queries.length, color: "#f2994a" },
  ];

  // ===== Sentiment distribution bars =====
  const sentTotal = Math.max(1, sentimentTotal);
  const sentBars = [
    { label: "Positive", value: data.sentiments.positive, color: SENT_COLOR_HEX.positive, pill: "green" as const, pct: Math.round((data.sentiments.positive / sentTotal) * 100) },
    { label: "Neutral", value: data.sentiments.neutral, color: SENT_COLOR_HEX.neutral, pill: "amber" as const, pct: Math.round((data.sentiments.neutral / sentTotal) * 100) },
    { label: "Negative", value: data.sentiments.negative, color: SENT_COLOR_HEX.negative, pill: "rose" as const, pct: Math.round((data.sentiments.negative / sentTotal) * 100) },
  ];

  const feedTitle = selectedQuery ? `Mentions · ${selectedQuery.name}` : "Recent mentions";
  const feedDesc = selectedQuery
    ? `Filtered · ${feed.length} mentions`
    : `Combined feed · ${feed.length} mentions`;

  return (
    <div className="space-y-4 animate-rise">
      <HelpText module="listening">
        <strong className="text-foreground">Listening</strong> tracks brand mentions and keywords across the web. Create a query to monitor what people say about your brand.
      </HelpText>

      <SectionHeader
        title="Listening"
        desc="Brand & competitor monitoring"
        icon={Radar}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="liquid-pill flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-60"
              title="Search social platforms and the web for new mentions"
            >
              <RefreshCw
                className={cn("h-4 w-4", syncing && "animate-spin")}
              />
              {syncing ? "Syncing…" : "Sync mentions"}
            </button>
            <AddQueryDialog onCreated={() => reload()} />
          </div>
        }
      />

      {/* Dense metric row */}
      <MetricRow metrics={metrics} />

      {/* Top bento — 1 hero chart + 1 sentiment distribution tile */}
      <BentoGrid className="grid-cols-1 lg:grid-cols-3">
        <HeroChart
          className="sm:col-span-2 lg:col-span-2"
          title="Sentiment trend"
          desc="Mention volume (area) & sentiment score (line) · last 14 days"
          action={
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full" style={{ background: "var(--primary)" }} />
                Mentions
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full" style={{ background: SENT_COLOR_HEX.positive }} />
                Sentiment
              </span>
            </div>
          }
        >
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.series} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gMentions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) =>
                    new Date(d).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v: number) => fmt(v)}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(d: string) =>
                    new Date(d).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="count"
                  name="Mentions"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#gMentions)"
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="sentiment"
                  name="Sentiment"
                  stroke={SENT_COLOR_HEX.positive}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </HeroChart>

        {/* Sentiment distribution — Pill + thin bars (replaces PieChart) */}
        <BentoTile className="sm:col-span-1">
          <SectionHeader title="Sentiment" desc="Distribution" />
          <div className="space-y-3">
            {sentBars.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between">
                  <Pill color={s.pill}>{s.label}</Pill>
                  <span className="text-xs font-bold tabular-nums">{s.value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{s.pct}% of mentions</div>
              </div>
            ))}
          </div>
        </BentoTile>
      </BentoGrid>

      {/* Master-detail split — Queries sidebar + Mentions feed */}
      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        {/* Queries sidebar — dense ListRow list, click to filter */}
        <BentoTile className="p-0 sm:col-span-1">
          <div className="border-b border-border/40 px-4 py-3">
            <SectionHeader
              title="Queries"
              desc="Click to filter feed"
              className="mb-0"
              action={
                selectedQuery ? (
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Clear
                  </button>
                ) : undefined
              }
            />
          </div>
          <div className="max-h-[460px] overflow-y-auto scroll-liquid">
            <ListRow
              onClick={() => setSelectedId(null)}
              active={selectedId === null}
              className="border-b border-border/30"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <Hash className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">All recent</div>
                <div className="text-[10px] text-muted-foreground">
                  {data.recent.length} mentions · combined
                </div>
              </div>
            </ListRow>
            {data.queries.map((q) => (
              <ListRow
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                active={selectedId === q.id}
                className="border-b border-border/30"
              >
                <span
                  className="h-7 w-7 shrink-0 rounded-full shadow-inner"
                  style={{ background: q.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{q.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{q.keywords}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="tabular-nums">{q.mentionCount} mentions</span>
                    <span>·</span>
                    <span className="tabular-nums">{fmt(q.reach)} reach</span>
                  </div>
                </div>
                <Pill color={TYPE_PILL[q.type]}>{TYPE_LABEL[q.type]}</Pill>
              </ListRow>
            ))}
            {data.queries.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No queries yet. Click <span className="font-semibold">Add listening query</span> to start tracking.
              </div>
            )}
          </div>
        </BentoTile>

        {/* Mentions feed — dense ListRow list with inline actions */}
        <BentoTile className="p-0 sm:col-span-1">
          <div className="border-b border-border/40 px-4 py-3">
            <SectionHeader
              title={feedTitle}
              desc={feedDesc}
              className="mb-0"
              action={
                selectedQuery ? (
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-[10px] font-semibold text-primary hover:underline"
                  >
                    Clear filter
                  </button>
                ) : undefined
              }
            />
          </div>
          <div className="max-h-[640px] overflow-y-auto scroll-liquid">
            {feed.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No mentions yet for this query.
              </div>
            ) : (
              feed.map((m) => <MentionRow key={m.id} mention={m} />)
            )}
          </div>
        </BentoTile>
      </div>
    </div>
  );
}

function MentionRow({ mention }: { mention: RecentMention }) {
  return (
    <ListRow className="items-start border-b border-border/30">
      <SourceBadge source={mention.source} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <NameAvatar
            name={mention.author}
            src={mention.authorAvatar}
            className="h-5 w-5 text-[9px]"
          />
          <span className="truncate text-xs font-semibold">{mention.author}</span>
          <Pill color={sentimentPillColor(mention.sentiment)}>{mention.sentiment}</Pill>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            {timeAgo(mention.date)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-foreground/90">{mention.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold"
            style={{
              background: `${mention.queryColor}22`,
              color: mention.queryColor,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: mention.queryColor }}
            />
            {mention.queryName}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Eye className="h-3 w-3" /> {fmt(mention.reach)}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Heart className="h-3 w-3" /> {fmt(mention.engagement)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px]"
              onClick={() => toast.info("Reply drafted", { description: mention.author })}
            >
              <Reply className="h-3 w-3" /> Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-[10px]"
              onClick={() => {
                if (mention.url) {
                  window.open(mention.url, "_blank", "noopener,noreferrer");
                } else {
                  toast.info("No external URL for this mention");
                }
              }}
            >
              <ExternalLink className="h-3 w-3" /> View
            </Button>
          </div>
        </div>
      </div>
    </ListRow>
  );
}

function AddQueryDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [keywords, setKeywords] = React.useState("");
  const [type, setType] = React.useState<QueryType>("brand");
  const [color, setColor] = React.useState(SWATCHES[0]);
  const [saving, setSaving] = React.useState(false);

  function reset() {
    setName("");
    setKeywords("");
    setType("brand");
    setColor(SWATCHES[0]);
  }

  async function handleSubmit() {
    if (!name.trim() || !keywords.trim()) {
      toast.error("Name and keywords are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), keywords: keywords.trim(), type, color }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Listening query created", { description: name.trim() });
        setOpen(false);
        reset();
        onCreated();
      } else {
        toast.error(json.error ?? "Failed to create query");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="liquid-pill glow-ring h-8 gap-1.5 rounded-xl px-3 text-xs font-semibold"
      >
        <Plus className="h-3.5 w-3.5" />
        Add listening query
      </Button>
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
              <Radar className="h-5 w-5 text-primary" />
              New listening query
            </DialogTitle>
            <DialogDescription>
              Track brand mentions, competitor activity, or trending keywords across the web
              &amp; social platforms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="lq-name">Query name</Label>
              <Input
                id="lq-name"
                placeholder="e.g. SYNQUE Brand"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lq-keywords">Keywords</Label>
              <Textarea
                id="lq-keywords"
                placeholder="prism social, prism studio, @prism"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated. Use # for hashtags or @ for handles.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as QueryType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand">Brand — your own brand</SelectItem>
                  <SelectItem value="competitor">Competitor — rival brand</SelectItem>
                  <SelectItem value="keyword">Keyword — topic / phrase</SelectItem>
                  <SelectItem value="hashtag">Hashtag — #tag tracking</SelectItem>
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
              {saving ? "Creating…" : "Create query"}
              {!saving && <Plus className="h-3.5 w-3.5" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ListeningSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-8 rounded-xl" />
      <div className="shimmer h-14 rounded-xl" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="shimmer h-[260px] rounded-xl lg:col-span-2" />
        <div className="shimmer h-[260px] rounded-xl" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
        <div className="shimmer h-[480px] rounded-xl" />
        <div className="shimmer h-[480px] rounded-xl" />
      </div>
    </div>
  );
}
