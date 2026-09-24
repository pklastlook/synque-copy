"use client";

import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  RadialBar, RadialBarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Line, LineChart, ComposedChart,
} from "recharts";
import {
  FileText, Download, Trash2, Eye, Printer,
  Calendar, BarChart3, Users, TrendingUp, Heart, FileBarChart,
  Clock, RefreshCw, Loader2, Activity, Globe, Target, Sparkles,
  ChevronDown, Save, ArrowUpDown, type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ============ Types ============
interface AnalyticsData {
  series: { date: string; followers: number; reach: number; impressions: number; engagement: number; posts: number }[];
  perAccount: {
    id: string; platform: string; handle: string; displayName: string;
    followers: number; impressions: number; reach: number; engagement: number;
    likes: number; comments: number; shares: number; saves: number; posts: number;
    ownerName: string;
  }[];
  topContent: {
    id: string; title: string; mediaUrl: string | null; platform: string;
    handle: string; engagement: number; reach: number; impressions: number;
    authorName: string;
  }[];
}
interface TeamData {
  members: {
    id: string; name: string; email: string; avatar: string | null; role: string;
    title: string | null; department: string | null; color: string | null;
    metrics: {
      postsCreated: number; publishedPosts: number; scheduledPosts: number;
      draftPosts: number; failedPosts: number; variantsPublished: number;
      commentsReceived: number; commentsReplied: number; replyRate: number;
      weeklyCadence: number; monthlyCadence: number;
      tasksAssigned: number; completedTasks: number; taskCompletionRate: number;
    };
    platforms: { platform: string; published: number; total: number }[];
  }[];
  teamTotals: {
    members: number; activeMembers: number; postsCreated: number;
    publishedPosts: number; scheduledPosts: number; draftPosts: number;
    failedPosts: number; commentsReceived: number; commentsReplied: number;
    replyRate: number; postsLast7d: number; postsLast30d: number;
    completedTasks: number; pendingTasks: number;
  };
  pipeline: { draft: number; scheduled: number; published: number; failed: number };
  postsByPlatform: { platform: string; published: number; total: number; comments: number }[];
  commentsBySentiment: { positive: number; neutral: number; negative: number };
  trend: { date: string; postsCreated: number; published: number; comments: number }[];
}
interface ReportData {
  id: string; name: string; type: string; description: string | null;
  config: string; schedule: string | null; createdByName: string;
  lastGenerated: string | null; createdAt: string;
}

const TOOLTIP_STYLE = {
  background: "var(--popover)", border: "1px solid var(--border)",
  borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px -8px rgba(0,0,0,0.3)",
  padding: "8px 12px",
};

type DateRange = "today" | "7d" | "30d" | "90d";
const DATE_RANGES: { key: DateRange; label: string; days: number }[] = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
];

// 8 compact report templates — each renders a tailored viewer
type TemplateId = "performance" | "audience" | "engagement" | "team" | "content" | "growth" | "platform" | "reach";
interface Template {
  id: TemplateId; name: string; icon: LucideIcon; color: string; desc: string;
}
const TEMPLATES: Template[] = [
  { id: "performance", name: "Performance", icon: TrendingUp, color: "oklch(0.62 0.2 255)", desc: "Followers · reach · engagement overview" },
  { id: "audience", name: "Audience", icon: Users, color: "oklch(0.62 0.22 300)", desc: "Follower growth & platform distribution" },
  { id: "engagement", name: "Engagement", icon: Heart, color: "oklch(0.7 0.2 25)", desc: "Likes · comments · shares · saves" },
  { id: "team", name: "Team Activity", icon: BarChart3, color: "oklch(0.74 0.18 165)", desc: "Member contributions & cadence" },
  { id: "content", name: "Content", icon: FileText, color: "oklch(0.68 0.18 95)", desc: "Post pipeline: draft → scheduled → published" },
  { id: "growth", name: "Growth", icon: Activity, color: "oklch(0.7 0.2 145)", desc: "Follower & reach trends over time" },
  { id: "platform", name: "Platforms", icon: Globe, color: "oklch(0.6 0.2 220)", desc: "Per-platform performance comparison" },
  { id: "reach", name: "Reach", icon: Target, color: "oklch(0.65 0.22 15)", desc: "Impressions & reach breakdown" },
];

// ============ Main view ============
export function ReportsView() {
  const [dateRange, setDateRange] = React.useState<DateRange>("30d");
  const [activeTemplate, setActiveTemplate] = React.useState<TemplateId>("performance");
  const [chartMetric, setChartMetric] = React.useState<string>("followers");
  const [savingReport, setSavingReport] = React.useState(false);
  const { data: savedReports, reload } = useApi<ReportData[]>("/api/reports");

  const days = DATE_RANGES.find(d => d.key === dateRange)?.days ?? 30;
  const analyticsUrl = `/api/analytics?days=${days}&accountId=all`;
  const { data: analytics, loading: analyticsLoading } = useApi<AnalyticsData>(analyticsUrl);
  const { data: teamData, loading: teamLoading } = useApi<TeamData>("/api/team-performance");

  function getToken(): string | null {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  // When user changes template, pick a sensible default metric for the main chart
  React.useEffect(() => {
    const defaults: Record<TemplateId, string> = {
      performance: "followers", audience: "followers", engagement: "engagement",
      team: "postsCreated", content: "posts", growth: "followers",
      platform: "followers", reach: "impressions",
    };
    setChartMetric(defaults[activeTemplate] ?? "followers");
  }, [activeTemplate]);

  async function saveCurrentReport() {
    const template = TEMPLATES.find(t => t.id === activeTemplate)!;
    setSavingReport(true);
    try {
      const token = getToken();
      const title = `${template.name} — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: title,
          type: activeTemplate,
          description: `${DATE_RANGES.find(d => d.key === dateRange)?.label} · Last ${days} days`,
          config: JSON.stringify({ days, range: dateRange, template: activeTemplate }),
          createdBy: null,
        }),
      });
      if (res.ok) {
        toast.success("Report saved", { description: "Added to your saved reports below" });
        reload();
      } else {
        toast.error("Failed to save report");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingReport(false);
    }
  }

  async function downloadPDF(r: ReportData) {
    try {
      const token = getToken();
      const res = await fetch(`/api/reports/${r.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${r.name.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch { toast.error("Failed to generate PDF"); }
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this saved report?")) return;
    const token = getToken();
    await fetch(`/api/reports/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    toast.success("Report deleted");
    reload();
  }

  function printReport() {
    setTimeout(() => window.print(), 300);
  }

  const allReports = savedReports ?? [];
  const template = TEMPLATES.find(t => t.id === activeTemplate)!;

  // Calculate totals from analytics
  const totals = React.useMemo(() => {
    if (!analytics) return { followers: 0, impressions: 0, reach: 0, engagement: 0, posts: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
    return analytics.perAccount.reduce((acc, a) => {
      acc.followers += a.followers;
      acc.impressions += a.impressions;
      acc.reach += a.reach;
      acc.engagement += a.engagement;
      acc.posts += a.posts;
      acc.likes += a.likes;
      acc.comments += a.comments;
      acc.shares += a.shares;
      acc.saves += a.saves;
      return acc;
    }, { followers: 0, impressions: 0, reach: 0, engagement: 0, posts: 0, likes: 0, comments: 0, shares: 0, saves: 0 });
  }, [analytics]);

  return (
    <div className="space-y-4">
      <HelpText module="reports">
        <strong className="text-foreground">Reports</strong> — pick a template below to load real data
        directly into the interactive viewer. Save, print, or export as PDF.
      </HelpText>

      {/* === Header === */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reports</h2>
          <p className="text-[12px] text-muted-foreground">
            {allReports.length} saved · {analytics?.perAccount.length ?? 0} accounts · {teamData?.teamTotals.members ?? 0} members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
            {DATE_RANGES.map(d => (
              <button
                key={d.key}
                onClick={() => setDateRange(d.key)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
                  dateRange === d.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === Compact generator strip (8 templates, small) === */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          const active = activeTemplate === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTemplate(t.id)}
              title={t.desc}
              className={cn(
                "group crystal-in flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all",
                active
                  ? "border-primary/40 bg-primary/10 shadow-[inset_0_0_0_1px_var(--ring)]"
                  : "border-border/40 hover:border-border/70 hover:bg-muted/30"
              )}
            >
              <div
                className="grid h-8 w-8 place-items-center rounded-lg transition-transform group-hover:scale-110"
                style={{ background: `${t.color}18`, color: t.color }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={cn(
                "text-[10px] font-bold leading-tight",
                active ? "text-foreground" : "text-muted-foreground"
              )}>
                {t.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* === Report Viewer (the main focus) === */}
      <ReportViewer
        template={template}
        analytics={analytics}
        teamData={teamData}
        totals={totals}
        loading={analyticsLoading || teamLoading}
        dateRangeLabel={DATE_RANGES.find(d => d.key === dateRange)?.label ?? "30 Days"}
        chartMetric={chartMetric}
        setChartMetric={setChartMetric}
        onSave={saveCurrentReport}
        onPrint={printReport}
        savingReport={savingReport}
      />

      {/* === Saved reports (slim horizontal list, NOT big cards) === */}
      <SavedReportsStrip
        reports={allReports}
        onView={(r) => {
          setActiveTemplate(r.type as TemplateId);
          toast.info(`Loaded "${r.name}" into the viewer above`);
        }}
        onDownload={downloadPDF}
        onDelete={deleteReport}
      />

      {/* === Print layout === */}
      <PrintLayout
        template={template}
        dateRangeLabel={DATE_RANGES.find(d => d.key === dateRange)?.label ?? "30 Days"}
        analytics={analytics}
        teamData={teamData}
        totals={totals}
      />
    </div>
  );
}

// ============ Report Viewer ============
function ReportViewer({
  template, analytics, teamData, totals, loading, dateRangeLabel,
  chartMetric, setChartMetric, onSave, onPrint, savingReport,
}: {
  template: Template;
  analytics: AnalyticsData | null;
  teamData: TeamData | null;
  totals: { followers: number; impressions: number; reach: number; engagement: number; posts: number; likes: number; comments: number; shares: number; saves: number };
  loading: boolean;
  dateRangeLabel: string;
  chartMetric: string;
  setChartMetric: (m: string) => void;
  onSave: () => void;
  onPrint: () => void;
  savingReport: boolean;
}) {
  const Icon = template.icon;
  const generatedAt = new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <GlassCard className="crystal-in overflow-hidden p-0" style={{ animationDelay: "0.1s" }}>
      {/* Viewer header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 bg-muted/20 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{ background: `${template.color}1a`, color: template.color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">{template.name} Report</h3>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ background: `${template.color}1a`, color: template.color }}
              >
                Live
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {dateRangeLabel} · {template.desc} · Generated {generatedAt}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSave}
            disabled={savingReport}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
          >
            {savingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
          >
            <Printer className="h-3 w-3" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Viewer body */}
      <div className="p-5">
        {loading ? (
          <div className="grid place-items-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-xs">Loading live data…</p>
          </div>
        ) : (
          <TemplateContent
            template={template}
            analytics={analytics}
            teamData={teamData}
            totals={totals}
            chartMetric={chartMetric}
            setChartMetric={setChartMetric}
          />
        )}
      </div>
    </GlassCard>
  );
}

// ============ Template-specific content ============
function TemplateContent({
  template, analytics, teamData, totals, chartMetric, setChartMetric,
}: {
  template: Template;
  analytics: AnalyticsData | null;
  teamData: TeamData | null;
  totals: { followers: number; impressions: number; reach: number; engagement: number; posts: number; likes: number; comments: number; shares: number; saves: number };
  chartMetric: string;
  setChartMetric: (m: string) => void;
}) {
  switch (template.id) {
    case "performance":
      return <PerformanceContent analytics={analytics} totals={totals} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "audience":
      return <AudienceContent analytics={analytics} totals={totals} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "engagement":
      return <EngagementContent analytics={analytics} totals={totals} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "team":
      return <TeamContent teamData={teamData} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "content":
      return <ContentContent analytics={analytics} teamData={teamData} totals={totals} />;
    case "growth":
      return <GrowthContent analytics={analytics} totals={totals} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "platform":
      return <PlatformContent analytics={analytics} totals={totals} />;
    case "reach":
      return <ReachContent analytics={analytics} totals={totals} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    default:
      return null;
  }
}

// ============ KPI row helper ============
function KpiRow({ items }: { items: { label: string; value: string; icon: React.ReactNode; color: string; series?: number[] }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {items.map((k, i) => (
        <div key={i} className="crystal-in rounded-xl border border-border/30 bg-muted/10 p-3">
          <div className="flex items-center gap-2" style={{ color: k.color }}>
            {k.icon}
            <span className="text-[10px] font-semibold uppercase tracking-wide">{k.label}</span>
          </div>
          <div className="num-display mt-1 text-2xl font-bold">{k.value}</div>
          {k.series && k.series.length > 0 && (
            <div className="mt-2 flex h-5 items-end gap-[2px]">
              {k.series.map((v, j) => {
                const mx = Math.max(...k.series!, 1);
                const mn = Math.min(...k.series!, 0);
                const range = Math.max(mx - mn, 1);
                return (
                  <span
                    key={j}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${((v - mn) / range) * 100}%`,
                      background: k.color,
                      opacity: 0.3 + (j / k.series!.length) * 0.5,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============ Chart card wrapper ============
function ChartCard({ title, desc, children, action }: { title: string; desc?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="crystal-in rounded-2xl border border-border/30 bg-muted/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
          {desc && <div className="text-[10px] text-muted-foreground/70">{desc}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ============ Metric tabs (for main chart) ============
function MetricTabs({ metrics, value, onChange }: { metrics: { key: string; label: string }[]; value: string; onChange: (m: string) => void }) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="h-7 p-0.5">
        {metrics.map(m => (
          <TabsTrigger key={m.key} value={m.key} className="px-2 py-0 text-[10px]">
            {m.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

// ============ Performance template ============
function PerformanceContent({ analytics, totals, chartMetric, setChartMetric }: {
  analytics: AnalyticsData | null; totals: Record<string, number>;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!analytics) return <EmptyState />;
  const series = analytics.series;
  const spark = (key: string) => series.slice(-14).map(s => (s as any)[key] ?? 0);

  const metrics = [
    { key: "followers", label: "Followers" },
    { key: "reach", label: "Reach" },
    { key: "impressions", label: "Impressions" },
    { key: "engagement", label: "Engagement" },
  ];

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Followers", value: fmt(totals.followers), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.62 0.2 255)", series: spark("followers") },
        { label: "Impressions", value: fmt(totals.impressions), icon: <Eye className="h-3.5 w-3.5" />, color: "oklch(0.62 0.22 300)", series: spark("impressions") },
        { label: "Engagement", value: fmt(totals.engagement), icon: <Heart className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)", series: spark("engagement") },
        { label: "Posts", value: totals.posts.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)", series: spark("posts") },
      ]} />

      {/* Main interactive chart */}
      <ChartCard
        title="Performance Trend"
        desc="Click a metric tab to switch the series"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
              <Area type="monotone" dataKey={chartMetric} stroke="var(--primary)" strokeWidth={2.5} fill="url(#perfGrad)" isAnimationActive animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Two secondary charts */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Engagement Mix" desc="Likes · comments · shares · saves">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Likes", value: totals.likes, fill: "oklch(0.62 0.2 255)" },
                { name: "Comments", value: totals.comments, fill: "oklch(0.74 0.18 165)" },
                { name: "Shares", value: totals.shares, fill: "oklch(0.66 0.22 305)" },
                { name: "Saves", value: totals.saves, fill: "oklch(0.78 0.18 75)" },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Platform Distribution" desc="Followers by platform">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.perAccount.map(a => ({ name: a.displayName, value: a.followers, platform: a.platform }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={700}
                >
                  {analytics.perAccount.map((a, i) => {
                    const p = PLATFORMS[a.platform as PlatformId];
                    return <Cell key={i} fill={p?.color ?? "var(--primary)"} />;
                  })}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <AccountBreakdownTable analytics={analytics} />
      <TopContentList analytics={analytics} />
    </div>
  );
}

// ============ Audience template ============
function AudienceContent({ analytics, totals, chartMetric, setChartMetric }: {
  analytics: AnalyticsData | null; totals: Record<string, number>;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!analytics) return <EmptyState />;
  const series = analytics.series;
  const metrics = [
    { key: "followers", label: "Followers" },
    { key: "reach", label: "Reach" },
    { key: "impressions", label: "Impress." },
  ];
  const platformTotals = analytics.perAccount.reduce((acc, a) => {
    acc[a.platform] = (acc[a.platform] ?? 0) + a.followers;
    return acc;
  }, {} as Record<string, number>);
  const platformData = Object.entries(platformTotals).map(([platform, value]) => ({
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    value, platform,
  }));

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Total Audience", value: fmt(totals.followers), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.62 0.2 255)", series: series.slice(-14).map(s => s.followers) },
        { label: "Accounts", value: analytics.perAccount.length.toString(), icon: <Globe className="h-3.5 w-3.5" />, color: "oklch(0.62 0.22 300)" },
        { label: "Reach", value: fmt(totals.reach), icon: <Target className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)", series: series.slice(-14).map(s => s.reach) },
        { label: "Impressions", value: fmt(totals.impressions), icon: <Eye className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)", series: series.slice(-14).map(s => s.impressions) },
      ]} />

      <ChartCard
        title="Audience Growth"
        desc="Follower accumulation over the selected period"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="audGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.62 0.22 300)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.62 0.22 300)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
              <Area type="monotone" dataKey={chartMetric} stroke="oklch(0.62 0.22 300)" strokeWidth={2.5} fill="url(#audGrad)" isAnimationActive animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Platform Share" desc="Followers by platform">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platformData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} isAnimationActive animationDuration={700}>
                  {platformData.map((d, i) => {
                    const p = PLATFORMS[d.platform as PlatformId];
                    return <Cell key={i} fill={p?.color ?? "var(--primary)"} />;
                  })}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Per-Account Followers" desc="Sorted by follower count">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...analytics.perAccount].sort((a, b) => b.followers - a.followers).slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="displayName" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="followers" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600}>
                  {analytics.perAccount.map((a, i) => {
                    const p = PLATFORMS[a.platform as PlatformId];
                    return <Cell key={i} fill={p?.color ?? "var(--primary)"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <AccountBreakdownTable analytics={analytics} />
    </div>
  );
}

// ============ Engagement template ============
function EngagementContent({ analytics, totals, chartMetric, setChartMetric }: {
  analytics: AnalyticsData | null; totals: Record<string, number>;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!analytics) return <EmptyState />;
  const series = analytics.series;
  const metrics = [
    { key: "engagement", label: "Engagement" },
    { key: "impressions", label: "Impressions" },
    { key: "reach", label: "Reach" },
  ];
  const engagementData = [
    { name: "Likes", value: totals.likes, color: "oklch(0.62 0.2 255)" },
    { name: "Comments", value: totals.comments, color: "oklch(0.74 0.18 165)" },
    { name: "Shares", value: totals.shares, color: "oklch(0.66 0.22 305)" },
    { name: "Saves", value: totals.saves, color: "oklch(0.78 0.18 75)" },
  ];
  const engRate = totals.impressions > 0 ? ((totals.engagement / totals.impressions) * 100).toFixed(2) : "0.00";

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Total Engagement", value: fmt(totals.engagement), icon: <Heart className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)", series: series.slice(-14).map(s => s.engagement) },
        { label: "Likes", value: fmt(totals.likes), icon: <Heart className="h-3.5 w-3.5" />, color: "oklch(0.62 0.2 255)" },
        { label: "Comments", value: fmt(totals.comments), icon: <Eye className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)" },
        { label: "Engagement Rate", value: `${engRate}%`, icon: <Activity className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 145)" },
      ]} />

      <ChartCard
        title="Engagement Trend"
        desc="How engagement evolved over the period"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series}>
              <defs>
                <linearGradient id="engBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.2 25)" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="oklch(0.7 0.2 25)" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
              <Bar dataKey={chartMetric} fill="url(#engBar)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
              <Line type="monotone" dataKey="engagement" stroke="oklch(0.7 0.2 25)" strokeWidth={2} dot={false} isAnimationActive />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Engagement Composition" desc="Breakdown by interaction type">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={engagementData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} isAnimationActive animationDuration={700}>
                  {engagementData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Top Engaged Accounts" desc="By total engagement">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...analytics.perAccount].sort((a, b) => b.engagement - a.engagement).slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="displayName" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="engagement" radius={[4, 4, 0, 0]} fill="oklch(0.7 0.2 25)" isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <TopContentList analytics={analytics} />
    </div>
  );
}

// ============ Team template ============
function TeamContent({ teamData, chartMetric, setChartMetric }: {
  teamData: TeamData | null;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!teamData) return <EmptyState />;
  const t = teamData.teamTotals;
  const trend = teamData.trend;
  const metrics = [
    { key: "postsCreated", label: "Created" },
    { key: "published", label: "Published" },
    { key: "comments", label: "Comments" },
  ];

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Members", value: t.members.toString(), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.62 0.2 255)" },
        { label: "Posts Created", value: t.postsCreated.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)", series: trend.slice(-14).map(d => d.postsCreated) },
        { label: "Published", value: t.publishedPosts.toString(), icon: <TrendingUp className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 145)", series: trend.slice(-14).map(d => d.published) },
        { label: "Reply Rate", value: `${t.replyRate}%`, icon: <Activity className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)" },
      ]} />

      <ChartCard
        title="Content Activity Trend"
        desc="Posts created, published & comments over 14 days"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="postsCreated" name="Created" fill="oklch(0.74 0.18 165)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
              <Bar dataKey="published" name="Published" fill="oklch(0.7 0.2 145)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
              <Line type="monotone" dataKey="comments" name="Comments" stroke="oklch(0.7 0.2 25)" strokeWidth={2} dot={false} isAnimationActive />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Content Pipeline" desc="Draft → Scheduled → Published → Failed">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Draft", value: t.draftPosts, fill: "oklch(0.6 0.02 250)" },
                { name: "Scheduled", value: t.scheduledPosts, fill: "oklch(0.7 0.15 75)" },
                { name: "Published", value: t.publishedPosts, fill: "oklch(0.7 0.2 145)" },
                { name: "Failed", value: t.failedPosts, fill: "oklch(0.55 0.22 25)" },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Comment Sentiment" desc="Positive · neutral · negative">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Positive", value: teamData.commentsBySentiment.positive, color: "oklch(0.7 0.2 145)" },
                    { name: "Neutral", value: teamData.commentsBySentiment.neutral, color: "oklch(0.6 0.02 250)" },
                    { name: "Negative", value: teamData.commentsBySentiment.negative, color: "oklch(0.55 0.22 25)" },
                  ]}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}
                  isAnimationActive animationDuration={700}
                >
                  {[
                    { color: "oklch(0.7 0.2 145)" },
                    { color: "oklch(0.6 0.02 250)" },
                    { color: "oklch(0.55 0.22 25)" },
                  ].map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <MemberBreakdownTable teamData={teamData} />
    </div>
  );
}

// ============ Content template ============
function ContentContent({ analytics, teamData, totals }: {
  analytics: AnalyticsData | null; teamData: TeamData | null; totals: Record<string, number>;
}) {
  if (!analytics || !teamData) return <EmptyState />;
  const pipeline = teamData.pipeline;
  const platformData = teamData.postsByPlatform;

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Total Posts", value: totals.posts.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)" },
        { label: "Drafts", value: pipeline.draft.toString(), icon: <Clock className="h-3.5 w-3.5" />, color: "oklch(0.6 0.02 250)" },
        { label: "Scheduled", value: pipeline.scheduled.toString(), icon: <Calendar className="h-3.5 w-3.5" />, color: "oklch(0.7 0.15 75)" },
        { label: "Published", value: pipeline.published.toString(), icon: <TrendingUp className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 145)" },
      ]} />

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Content Pipeline" desc="Status distribution of all posts">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Draft", value: pipeline.draft, fill: "oklch(0.6 0.02 250)" },
                { name: "Scheduled", value: pipeline.scheduled, fill: "oklch(0.7 0.15 75)" },
                { name: "Published", value: pipeline.published, fill: "oklch(0.7 0.2 145)" },
                { name: "Failed", value: pipeline.failed, fill: "oklch(0.55 0.22 25)" },
              ]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Posts by Platform" desc="Published vs total per platform">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="platform" tickFormatter={p => p.charAt(0).toUpperCase() + p.slice(1)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="total" name="Total" fill="oklch(0.6 0.02 250)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
                <Bar dataKey="published" name="Published" fill="oklch(0.7 0.2 145)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <TopContentList analytics={analytics} title="Top Performing Content" />
    </div>
  );
}

// ============ Growth template ============
function GrowthContent({ analytics, totals, chartMetric, setChartMetric }: {
  analytics: AnalyticsData | null; totals: Record<string, number>;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!analytics) return <EmptyState />;
  const series = analytics.series;
  const metrics = [
    { key: "followers", label: "Followers" },
    { key: "reach", label: "Reach" },
    { key: "impressions", label: "Impress." },
    { key: "posts", label: "Posts" },
  ];

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Followers", value: fmt(totals.followers), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.62 0.2 255)", series: series.slice(-14).map(s => s.followers) },
        { label: "Reach", value: fmt(totals.reach), icon: <Target className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)", series: series.slice(-14).map(s => s.reach) },
        { label: "Impressions", value: fmt(totals.impressions), icon: <Eye className="h-3.5 w-3.5" />, color: "oklch(0.62 0.22 300)", series: series.slice(-14).map(s => s.impressions) },
        { label: "Posts", value: totals.posts.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)", series: series.slice(-14).map(s => s.posts) },
      ]} />

      <ChartCard
        title="Growth Comparison"
        desc="Toggle metrics to compare trends side-by-side"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
              <Line type="monotone" dataKey={chartMetric} stroke="oklch(0.7 0.2 145)" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Multi-Metric Overlay" desc="Followers, reach & impressions together">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="followers" stroke="oklch(0.62 0.2 255)" strokeWidth={2} dot={false} isAnimationActive />
              <Line type="monotone" dataKey="reach" stroke="oklch(0.7 0.2 25)" strokeWidth={2} dot={false} isAnimationActive />
              <Line type="monotone" dataKey="impressions" stroke="oklch(0.62 0.22 300)" strokeWidth={2} dot={false} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

// ============ Platform template ============
function PlatformContent({ analytics, totals }: {
  analytics: AnalyticsData | null; totals: Record<string, number>;
}) {
  if (!analytics) return <EmptyState />;
  const byPlatform = analytics.perAccount.reduce((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = { followers: 0, impressions: 0, engagement: 0, posts: 0, count: 0 };
    acc[a.platform].followers += a.followers;
    acc[a.platform].impressions += a.impressions;
    acc[a.platform].engagement += a.engagement;
    acc[a.platform].posts += a.posts;
    acc[a.platform].count += 1;
    return acc;
  }, {} as Record<string, { followers: number; impressions: number; engagement: number; posts: number; count: number }>);
  const platformRows = Object.entries(byPlatform).map(([p, v]) => ({ platform: p, ...v }));

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Platforms", value: platformRows.length.toString(), icon: <Globe className="h-3.5 w-3.5" />, color: "oklch(0.6 0.2 220)" },
        { label: "Followers", value: fmt(totals.followers), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.62 0.2 255)" },
        { label: "Engagement", value: fmt(totals.engagement), icon: <Heart className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)" },
        { label: "Posts", value: totals.posts.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)" },
      ]} />

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Followers by Platform" desc="Stacked comparison">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="platform" tickFormatter={p => p.charAt(0).toUpperCase() + p.slice(1)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="followers" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600}>
                  {platformRows.map((d, i) => {
                    const p = PLATFORMS[d.platform as PlatformId];
                    return <Cell key={i} fill={p?.color ?? "var(--primary)"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Engagement by Platform" desc="Total engagement per platform">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformRows} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="platform" tickFormatter={p => p.charAt(0).toUpperCase() + p.slice(1)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="engagement" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600}>
                  {platformRows.map((d, i) => {
                    const p = PLATFORMS[d.platform as PlatformId];
                    return <Cell key={i} fill={p?.color ?? "var(--primary)"} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="crystal-in overflow-x-auto rounded-2xl border border-border/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Platform</th>
              <th className="px-3 text-right font-semibold text-muted-foreground">Accounts</th>
              <th className="px-3 text-right font-semibold text-muted-foreground">Followers</th>
              <th className="px-3 text-right font-semibold text-muted-foreground">Impressions</th>
              <th className="px-3 text-right font-semibold text-muted-foreground">Engagement</th>
              <th className="px-3 text-right font-semibold text-muted-foreground">Posts</th>
            </tr>
          </thead>
          <tbody>
            {platformRows.map(row => {
              const p = PLATFORMS[row.platform as PlatformId];
              return (
                <tr key={row.platform} className="border-b border-border/20 transition hover:bg-muted/20">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={row.platform as PlatformId} size={16} />
                      <span className="font-medium capitalize" style={{ color: p?.color }}>{row.platform}</span>
                    </div>
                  </td>
                  <td className="px-3 text-right tabular-nums">{row.count}</td>
                  <td className="px-3 text-right tabular-nums">{row.followers.toLocaleString()}</td>
                  <td className="px-3 text-right tabular-nums">{row.impressions.toLocaleString()}</td>
                  <td className="px-3 text-right tabular-nums">{row.engagement.toLocaleString()}</td>
                  <td className="px-3 text-right tabular-nums">{row.posts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ Reach template ============
function ReachContent({ analytics, totals, chartMetric, setChartMetric }: {
  analytics: AnalyticsData | null; totals: Record<string, number>;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!analytics) return <EmptyState />;
  const series = analytics.series;
  const metrics = [
    { key: "impressions", label: "Impress." },
    { key: "reach", label: "Reach" },
  ];

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Impressions", value: fmt(totals.impressions), icon: <Eye className="h-3.5 w-3.5" />, color: "oklch(0.62 0.22 300)", series: series.slice(-14).map(s => s.impressions) },
        { label: "Reach", value: fmt(totals.reach), icon: <Target className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)", series: series.slice(-14).map(s => s.reach) },
        { label: "Reach Rate", value: totals.impressions > 0 ? `${((totals.reach / totals.impressions) * 100).toFixed(1)}%` : "0%", icon: <Activity className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 145)" },
        { label: "Posts", value: totals.posts.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)" },
      ]} />

      <ChartCard
        title="Reach & Impressions Trend"
        desc="Compare how many people saw vs were reached"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.22 15)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="oklch(0.65 0.22 15)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} />
              <Area type="monotone" dataKey={chartMetric} stroke="oklch(0.65 0.22 15)" strokeWidth={2.5} fill="url(#reachGrad)" isAnimationActive animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Reach vs Impressions" desc="Side-by-side comparison">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="impressions" name="Impressions" fill="oklch(0.62 0.22 300)" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={500} />
                <Bar dataKey="reach" name="Reach" fill="oklch(0.65 0.22 15)" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Reach by Account" desc="Top accounts by reach">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...analytics.perAccount].sort((a, b) => b.reach - a.reach).slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
                <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="displayName" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Bar dataKey="reach" radius={[0, 4, 4, 0]} fill="oklch(0.65 0.22 15)" isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <AccountBreakdownTable analytics={analytics} />
    </div>
  );
}

// ============ Account breakdown table (sortable) ============
function SortHeader({ label, k, sortKey, sortDir, onToggle }: { label: string; k: string; sortKey: string; sortDir: "asc" | "desc"; onToggle: (k: string) => void }) {
  return (
    <button onClick={() => onToggle(k)} className="flex items-center gap-1 hover:text-foreground">
      {label}
      <ArrowUpDown className={cn("h-2.5 w-2.5", sortKey === k ? "opacity-100" : "opacity-30")} />
    </button>
  );
}

function AccountBreakdownTable({ analytics }: { analytics: AnalyticsData }) {
  const [sortKey, setSortKey] = React.useState<"followers" | "impressions" | "engagement" | "posts">("followers");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const sorted = [...analytics.perAccount].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortDir === "desc" ? -diff : diff;
  });

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="crystal-in overflow-x-auto rounded-2xl border border-border/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 bg-muted/20">
            <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Account</th>
            <th className="px-3 text-right font-semibold"><SortHeader label="Followers" k="followers" sortKey={sortKey} sortDir={sortDir} onToggle={(k) => toggleSort(k as typeof sortKey)} /></th>
            <th className="px-3 text-right font-semibold"><SortHeader label="Impressions" k="impressions" sortKey={sortKey} sortDir={sortDir} onToggle={(k) => toggleSort(k as typeof sortKey)} /></th>
            <th className="px-3 text-right font-semibold"><SortHeader label="Engagement" k="engagement" sortKey={sortKey} sortDir={sortDir} onToggle={(k) => toggleSort(k as typeof sortKey)} /></th>
            <th className="px-3 text-right font-semibold"><SortHeader label="Posts" k="posts" sortKey={sortKey} sortDir={sortDir} onToggle={(k) => toggleSort(k as typeof sortKey)} /></th>
            <th className="px-3 text-left font-semibold text-muted-foreground">Owner</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(a => (
            <tr key={a.id} className="border-b border-border/20 transition hover:bg-muted/20">
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <PlatformBadge platform={a.platform as PlatformId} size={16} />
                  <span className="font-medium">{a.displayName}</span>
                </div>
              </td>
              <td className="px-3 text-right tabular-nums">{a.followers.toLocaleString()}</td>
              <td className="px-3 text-right tabular-nums">{a.impressions.toLocaleString()}</td>
              <td className="px-3 text-right tabular-nums">{a.engagement.toLocaleString()}</td>
              <td className="px-3 text-right tabular-nums">{a.posts}</td>
              <td className="px-3 text-muted-foreground">{a.ownerName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Member breakdown table ============
function MemberBreakdownTable({ teamData }: { teamData: TeamData }) {
  return (
    <div className="crystal-in overflow-x-auto rounded-2xl border border-border/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 bg-muted/20">
            <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Member</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Posts Created</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Published</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Comments Replied</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Reply Rate</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Weekly Cadence</th>
          </tr>
        </thead>
        <tbody>
          {teamData.members.map(m => (
            <tr key={m.id} className="border-b border-border/20 transition hover:bg-muted/20">
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <NameAvatar name={m.name} color={(m.color as any) ?? "blue"} className="h-6 w-6 text-[10px]" />
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-[10px] text-muted-foreground">{m.title ?? m.role}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 text-right tabular-nums">{m.metrics.postsCreated}</td>
              <td className="px-3 text-right tabular-nums">{m.metrics.publishedPosts}</td>
              <td className="px-3 text-right tabular-nums">{m.metrics.commentsReplied}</td>
              <td className="px-3 text-right tabular-nums">{m.metrics.replyRate}%</td>
              <td className="px-3 text-right tabular-nums">{m.metrics.weeklyCadence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Top content list ============
function TopContentList({ analytics, title }: { analytics: AnalyticsData; title?: string }) {
  if (analytics.topContent.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title ?? "Top Performing Content"}</div>
      <div className="space-y-1.5">
        {analytics.topContent.slice(0, 6).map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/10 p-2.5 transition hover:bg-muted/20">
            <span
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: i < 3 ? "oklch(0.7 0.2 45)" : "var(--muted-foreground)" }}
            >
              {i + 1}
            </span>
            <PlatformBadge platform={c.platform as PlatformId} size={16} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{c.title || "Untitled post"}</div>
              <div className="text-[10px] text-muted-foreground">@{c.handle} · {c.authorName}</div>
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="text-right">
                <div className="font-bold">{fmt(c.engagement)}</div>
                <div className="text-muted-foreground">eng</div>
              </span>
              <span className="text-right">
                <div className="font-bold">{fmt(c.reach)}</div>
                <div className="text-muted-foreground">reach</div>
              </span>
              <span className="text-right">
                <div className="font-bold">{fmt(c.impressions)}</div>
                <div className="text-muted-foreground">imp</div>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Saved reports strip (compact horizontal list) ============
function SavedReportsStrip({
  reports, onView, onDownload, onDelete,
}: {
  reports: ReportData[];
  onView: (r: ReportData) => void;
  onDownload: (r: ReportData) => void;
  onDelete: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  if (reports.length === 0) return null;

  return (
    <div className="crystal-in rounded-2xl border border-border/30 bg-muted/10">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex w-full items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Saved Reports · {reports.length}
          </span>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", collapsed ? "-rotate-90" : "")} />
      </button>
      {!collapsed && (
        <div className="max-h-72 overflow-y-auto px-3 pb-3">
          <div className="space-y-1">
            {reports.map(r => {
              const template = TEMPLATES.find(t => t.id === r.type);
              const Icon = template?.icon ?? FileText;
              return (
                <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-border/20 bg-background/40 p-2 transition hover:border-border/50 hover:bg-muted/30">
                  <div
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${template?.color ?? "var(--primary)"}18`, color: template?.color ?? "var(--primary)" }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{r.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.type} · {r.lastGenerated ? timeAgo(r.lastGenerated) : "never"}
                    </div>
                  </div>
                  <button
                    onClick={() => onView(r)}
                    title="Load into viewer"
                    className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary/20"
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                  <button
                    onClick={() => onDownload(r)}
                    title="Download PDF"
                    className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary transition hover:bg-primary/20"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    title="Delete"
                    className="grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Empty state ============
function EmptyState() {
  return (
    <div className="grid place-items-center py-16 text-muted-foreground">
      <FileBarChart className="h-10 w-10 opacity-30" />
      <p className="mt-3 text-xs">No data available for this template yet.</p>
      <p className="text-[10px] text-muted-foreground/70">Connect social accounts or publish content to populate reports.</p>
    </div>
  );
}

// ============ Print Layout (hidden on screen) ============
function PrintLayout({
  template, dateRangeLabel, analytics, teamData, totals,
}: {
  template: Template; dateRangeLabel: string; analytics: AnalyticsData | null;
  teamData: TeamData | null;
  totals: { followers: number; impressions: number; reach: number; engagement: number; posts: number; likes: number; comments: number; shares: number; saves: number };
}) {
  if (!analytics) return null;
  const now = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const title = `${template.name} Report`;

  return (
    <div className="report-print-root hidden print:block">
      <table className="w-full">
        <thead><tr><td className="report-header-cell">
          <div className="report-header">
            <div className="flex items-center justify-between">
              <div>
                <div className="report-brand">SocialFlow</div>
                <div className="report-subtitle">{title}</div>
              </div>
              <div className="text-right">
                <div className="report-date">{now}</div>
                <div className="report-type">{dateRangeLabel} Report</div>
              </div>
            </div>
          </div>
        </td></tr></thead>
        <tbody><tr><td className="report-body-cell">
          <div className="report-content">
            <h2 className="report-section-title">Executive Summary</h2>
            <p className="report-text">
              This {dateRangeLabel.toLowerCase()} {template.name.toLowerCase()} report covers {analytics.perAccount.length} account(s)
              {teamData ? ` and ${teamData.teamTotals.members} team member(s)` : ""}. Total audience:
              {" "}<strong>{fmt(totals.followers)}</strong> followers,
              {" "}<strong>{fmt(totals.impressions)}</strong> impressions,
              {" "}<strong>{fmt(totals.reach)}</strong> reach, and
              {" "}<strong>{fmt(totals.engagement)}</strong> total engagement.
            </p>

            <h2 className="report-section-title">Key Metrics</h2>
            <table className="report-table">
              <thead><tr><th>Metric</th><th className="text-right">Value</th></tr></thead>
              <tbody>
                <tr><td>Total Followers</td><td className="text-right tabular-nums">{totals.followers.toLocaleString()}</td></tr>
                <tr><td>Total Impressions</td><td className="text-right tabular-nums">{totals.impressions.toLocaleString()}</td></tr>
                <tr><td>Total Reach</td><td className="text-right tabular-nums">{totals.reach.toLocaleString()}</td></tr>
                <tr><td>Total Engagement</td><td className="text-right tabular-nums">{totals.engagement.toLocaleString()}</td></tr>
                <tr><td>Likes</td><td className="text-right tabular-nums">{totals.likes.toLocaleString()}</td></tr>
                <tr><td>Comments</td><td className="text-right tabular-nums">{totals.comments.toLocaleString()}</td></tr>
                <tr><td>Shares</td><td className="text-right tabular-nums">{totals.shares.toLocaleString()}</td></tr>
                <tr><td>Saves</td><td className="text-right tabular-nums">{totals.saves.toLocaleString()}</td></tr>
                <tr><td>Posts Published</td><td className="text-right tabular-nums">{totals.posts.toLocaleString()}</td></tr>
              </tbody>
            </table>

            {teamData && (
              <>
                <h2 className="report-section-title">Team Activity</h2>
                <table className="report-table">
                  <thead><tr><th>Member</th><th className="text-right">Posts</th><th className="text-right">Published</th><th className="text-right">Reply Rate</th></tr></thead>
                  <tbody>
                    {teamData.members.map(m => (
                      <tr key={m.id}>
                        <td className="font-medium">{m.name}</td>
                        <td className="text-right tabular-nums">{m.metrics.postsCreated}</td>
                        <td className="text-right tabular-nums">{m.metrics.publishedPosts}</td>
                        <td className="text-right tabular-nums">{m.metrics.replyRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h2 className="report-section-title">Account Breakdown</h2>
            <table className="report-table">
              <thead><tr><th>Account</th><th>Platform</th><th className="text-right">Followers</th><th className="text-right">Impressions</th><th className="text-right">Engagement</th><th>Owner</th></tr></thead>
              <tbody>
                {analytics.perAccount.map(a => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.displayName}</td>
                    <td className="capitalize">{a.platform}</td>
                    <td className="text-right tabular-nums">{a.followers.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{a.impressions.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{a.engagement.toLocaleString()}</td>
                    <td>{a.ownerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {analytics.topContent.length > 0 && (
              <>
                <h2 className="report-section-title">Top Performing Content</h2>
                <table className="report-table">
                  <thead><tr><th>#</th><th>Title</th><th>Platform</th><th className="text-right">Engagement</th><th className="text-right">Reach</th></tr></thead>
                  <tbody>
                    {analytics.topContent.slice(0, 8).map((c, i) => (
                      <tr key={c.id}>
                        <td>{i + 1}</td>
                        <td className="max-w-[200px] truncate">{c.title || "Untitled"}</td>
                        <td className="capitalize">{c.platform}</td>
                        <td className="text-right tabular-nums">{c.engagement.toLocaleString()}</td>
                        <td className="text-right tabular-nums">{c.reach.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <p className="report-footer-note">Generated by SocialFlow on {now}. Data sourced from connected social media accounts.</p>
          </div>
        </td></tr></tbody>
        <tfoot><tr><td className="report-footer-cell">
          <div className="report-footer">
            <div className="flex items-center justify-between">
              <span>SocialFlow — Social, Simplified.</span>
              <span>Page <span className="page-number"></span></span>
            </div>
          </div>
        </td></tr></tfoot>
      </table>

      <style jsx global>{`
        @media print {
          @page { size: letter; margin: 0; }
          body * { visibility: hidden; }
          .report-print-root, .report-print-root * { visibility: visible; }
          .report-print-root { position: absolute; top: 0; left: 0; width: 100%; }
          .report-header { border-bottom: 2px solid #000; padding: 20px 40px 10px; }
          .report-brand { font-size: 18px; font-weight: 800; color: #5856D6; }
          .report-subtitle { font-size: 14px; font-weight: 600; color: #333; }
          .report-date { font-size: 11px; color: #666; }
          .report-type { font-size: 10px; color: #999; text-transform: uppercase; }
          .report-body-cell { padding: 20px 40px; }
          .report-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #222; }
          .report-section-title { font-size: 14px; font-weight: 700; color: #5856D6; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
          .report-text { font-size: 12px; line-height: 1.6; color: #333; margin-bottom: 12px; }
          .report-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
          .report-table th { background: #f5f5f5; font-weight: 600; text-align: left; padding: 6px 10px; border: 1px solid #ddd; }
          .report-table td { padding: 5px 10px; border: 1px solid #ddd; }
          .report-table tbody tr:nth-child(even) { background: #fafafa; }
          .report-footer-note { font-size: 10px; color: #999; margin-top: 24px; font-style: italic; }
          .report-footer { border-top: 2px solid #000; padding: 10px 40px; font-size: 10px; color: #666; }
          .page-number:after { content: counter(page); }
        }
      `}</style>
    </div>
  );
}
