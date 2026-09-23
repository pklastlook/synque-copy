"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MessagesSquare,
  Radar,
  Globe,
  Eye,
  Heart,
  Smile,
  Plus,
  Reply,
  ExternalLink,
  Sparkles,
  Hash,
  TrendingUp,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
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
import { Textarea } from "@/components/ui/textarea";
import type { PlatformId } from "@/lib/platforms";

// ===== API types =====
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

const TYPE_ACCENT: Record<QueryType, string> = {
  brand: "oklch(0.7 0.24 14)",
  competitor: "oklch(0.66 0.22 305)",
  keyword: "oklch(0.74 0.18 165)",
  hashtag: "oklch(0.78 0.18 75)",
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

const SENT_COLORS = {
  positive: "oklch(0.76 0.18 145)",
  neutral: "oklch(0.7 0.0 0)",
  negative: "oklch(0.7 0.24 14)",
};

function SentimentTag({ sentiment }: { sentiment: Mention["sentiment"] }) {
  const cfg = {
    positive: { label: "Positive", cls: "bg-emerald-500/15 text-emerald-500" },
    neutral: { label: "Neutral", cls: "bg-muted text-muted-foreground" },
    negative: { label: "Negative", cls: "bg-rose-500/15 text-rose-500" },
  }[sentiment];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        cfg.cls,
      )}
    >
      <CircleDot className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const isKnown = (KNOWN_SOURCES as string[]).includes(source);
  if (isKnown) {
    return <PlatformBadge platform={source as PlatformId} size={32} />;
  }
  return (
    <span className="grid h-8 w-8 place-items-center rounded-[28%] bg-muted text-muted-foreground shadow-sm">
      <Globe className="h-4 w-4" />
    </span>
  );
}

export function ListeningView() {
  const { data, loading, reload } = useApi<ListeningData>("/api/listening");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (loading || !data) return <ListeningSkeleton />;

  // KPIs
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

  // Filtered feed
  const selectedQuery = data.queries.find((q) => q.id === selectedId) ?? null;
  const feed: RecentMention[] = selectedQuery
    ? selectedQuery.mentions.map((m) => ({
        ...m,
        queryName: selectedQuery.name,
        queryColor: selectedQuery.color,
      }))
    : data.recent;

  const sentimentData = [
    { name: "Positive", value: data.sentiments.positive, color: SENT_COLORS.positive },
    { name: "Neutral", value: data.sentiments.neutral, color: SENT_COLORS.neutral },
    { name: "Negative", value: data.sentiments.negative, color: SENT_COLORS.negative },
  ];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <GlassCard strong className="glass-sheen animate-rise relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                <span>Listening</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Brand &amp; competitor monitoring
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {data.queries.length} active queries · {fmt(totalMentions)} mentions tracked
              </p>
            </div>
          </div>
          <AddQueryDialog onCreated={() => reload()} />
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-rise">
        <KpiCard
          label="Total mentions"
          value={fmt(totalMentions)}
          icon={<MessagesSquare className="h-5 w-5" />}
          accent="oklch(0.7 0.24 14)"
          hint="across all queries"
        />
        <KpiCard
          label="Total reach"
          value={fmt(totalReach)}
          icon={<Eye className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="sum of mention reach"
        />
        <KpiCard
          label="Positive sentiment"
          value={`${positivePct}%`}
          icon={<Smile className="h-5 w-5" />}
          accent="oklch(0.76 0.18 145)"
          hint={`${data.sentiments.positive} positive mentions`}
        />
        <KpiCard
          label="Avg engagement"
          value={fmt(avgEngagement)}
          icon={<Heart className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="per mention"
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Left: query list */}
        <GlassCard className="animate-rise p-4">
          <SectionTitle
            title="Queries"
            desc="Click to filter feed"
          />
          <div className="max-h-[640px] space-y-1.5 overflow-y-auto scroll-liquid pr-1">
            <button
              onClick={() => setSelectedId(null)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition",
                selectedId === null
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-muted/50",
              )}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground">
                <Hash className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">All recent mentions</div>
                <div className="text-[11px] text-muted-foreground">
                  {data.recent.length} mentions · combined
                </div>
              </div>
            </button>
            {data.queries.map((q) => (
              <button
                key={q.id}
                onClick={() => setSelectedId(q.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition",
                  selectedId === q.id
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-muted/50",
                )}
              >
                <span
                  className="h-9 w-9 shrink-0 rounded-full shadow-inner"
                  style={{ background: q.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{q.name}</span>
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {q.keywords}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      style={{
                        background: `${TYPE_ACCENT[q.type]}22`,
                        color: TYPE_ACCENT[q.type],
                      }}
                    >
                      {TYPE_LABEL[q.type]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {q.mentionCount} mentions · {fmt(q.reach)} reach
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Right: chart + feed */}
        <div className="space-y-4">
          {/* Charts row */}
          <div className="grid gap-4 sm:grid-cols-5">
            <GlassCard className="animate-rise p-5 sm:col-span-3">
              <SectionTitle
                title="Mention volume"
                desc="Daily mentions across all queries · last 14 days"
              />
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.series} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gMentions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) =>
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
                      tickFormatter={(v) => fmt(v)}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                        boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
                      }}
                      labelFormatter={(d) =>
                        new Date(d).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      }
                      formatter={(v: number) => [fmt(v), "Mentions"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#gMentions)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="animate-rise p-5 sm:col-span-2">
              <SectionTitle title="Sentiment" desc="Distribution" />
              <div className="relative mx-auto h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={66}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {sentimentData.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number, n) => [fmt(v), n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold">{positivePct}%</span>
                  <span className="text-[9px] text-muted-foreground">positive</span>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {sentimentData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                    <span className="ml-auto font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Mentions feed */}
          <GlassCard className="animate-rise p-5">
            <SectionTitle
              title={selectedQuery ? `Mentions · ${selectedQuery.name}` : "Recent mentions"}
              desc={
                selectedQuery
                  ? `Filtered feed · ${feed.length} mentions`
                  : "Combined feed across all queries"
              }
              action={
                selectedQuery && (
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Clear filter
                  </button>
                )
              }
            />
            <div className="max-h-[600px] space-y-2 overflow-y-auto scroll-liquid pr-1">
              {feed.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No mentions yet for this query.
                </div>
              )}
              {feed.map((m) => (
                <MentionCard key={m.id} mention={m} />
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function MentionCard({ mention }: { mention: RecentMention }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-3 transition hover:bg-muted/40">
      <div className="flex items-start gap-3">
        <SourceBadge source={mention.source} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <NameAvatar
              name={mention.author}
              src={mention.authorAvatar}
              className="h-6 w-6 text-[10px]"
            />
            <span className="truncate text-sm font-semibold">{mention.author}</span>
            <SentimentTag sentiment={mention.sentiment} />
            <span className="ml-auto text-[10px] text-muted-foreground">
              {timeAgo(mention.date)}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-3 text-sm text-foreground/90">{mention.text}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
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
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" /> {fmt(mention.reach)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> {fmt(mention.engagement)}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={() => toast.info("Reply drafted", { description: mention.author })}
              >
                <Reply className="h-3 w-3" /> Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  if (mention.url) {
                    toast.success("Opening mention", { description: mention.url });
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
      </div>
    </div>
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
      <button
        onClick={() => setOpen(true)}
        className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
      >
        <Plus className="h-4 w-4" />
        Add listening query
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
                placeholder="e.g. SocialFlow Brand"
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
    <div className="space-y-5">
      <div className="shimmer h-28 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="shimmer h-[640px] rounded-3xl" />
        <div className="space-y-4">
          <div className="shimmer h-[300px] rounded-3xl" />
          <div className="shimmer h-[400px] rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
