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
  ChevronDown, Save, ArrowUpDown, Award, Trophy, UserCheck, Grid3x3, Zap,
  type LucideIcon,
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
// Rich cross-tabulated data from /api/reports/data
interface ReportDataRoot {
  userAccountMatrix: {
    userId: string; userName: string; userEmail: string; avatar: string | null;
    role: string; title: string | null; department: string | null; color: string | null;
    totals: {
      postsCreated: number; published: number; scheduled: number; drafts: number; failed: number;
      commentsReceived: number; commentsReplied: number; accountsOwned: number;
    };
    perAccount: {
      accountId: string; platform: string; handle: string; displayName: string;
      posts: number; published: number; comments: number; commentsReplied: number;
    }[];
  }[];
  userComparison: {
    id: string; name: string; email: string; avatar: string | null;
    role: string; title: string | null; department: string | null; color: string | null;
    postsCreated: number; postsPublished: number; postsScheduled: number;
    postsDraft: number; postsFailed: number; variantsPublished: number;
    commentsReceived: number; commentsReplied: number; replyRate: number;
    accountsOwned: number; postsLast7d: number; avgPostsPerAccount: number;
  }[];
  accountUserMatrix: {
    accountId: string; platform: string; handle: string; displayName: string;
    ownerName: string; ownerColor: string | null; followers: number;
    totalPosts: number; totalPublished: number; totalComments: number; repliedComments: number;
    perUser: { userId: string; userName: string; color: string | null; posts: number; published: number }[];
  }[];
  leaderboard: {
    mostPostsCreated: ReportDataRoot["userComparison"];
    mostPublished: ReportDataRoot["userComparison"];
    mostCommentsReplied: ReportDataRoot["userComparison"];
    bestReplyRate: ReportDataRoot["userComparison"];
    mostActive: ReportDataRoot["userComparison"];
  };
  perUserPlatform: {
    userId: string; userName: string; color: string | null;
    platforms: { platform: string; posts: number; published: number }[];
  }[];
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

// 12 compact report templates — each renders a tailored viewer
type TemplateId = "performance" | "audience" | "engagement" | "team" | "content" | "growth" | "platform" | "reach" | "user-account" | "user-comparison" | "account-user" | "leaderboard";
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
  { id: "user-account", name: "User × Account", icon: Grid3x3, color: "oklch(0.6 0.2 200)", desc: "Posts & comments by each user on each account" },
  { id: "user-comparison", name: "User Compare", icon: UserCheck, color: "oklch(0.7 0.18 180)", desc: "Side-by-side team member work comparison" },
  { id: "account-user", name: "Pages Report", icon: FileBarChart, color: "oklch(0.62 0.2 35)", desc: "Per-account: who posted & how much" },
  { id: "leaderboard", name: "Leaderboard", icon: Trophy, color: "oklch(0.72 0.2 75)", desc: "Top contributors ranked by metrics" },
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
  const { data: reportData, loading: reportDataLoading } = useApi<ReportDataRoot>(`/api/reports/data?days=${days}`);

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
      "user-account": "postsCreated", "user-comparison": "postsCreated",
      "account-user": "totalPosts", leaderboard: "postsCreated",
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
        reportData={reportData}
        totals={totals}
        loading={analyticsLoading || teamLoading || reportDataLoading}
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
        reportData={reportData}
        totals={totals}
      />
    </div>
  );
}

// ============ Report Viewer ============
function ReportViewer({
  template, analytics, teamData, reportData, totals, loading, dateRangeLabel,
  chartMetric, setChartMetric, onSave, onPrint, savingReport,
}: {
  template: Template;
  analytics: AnalyticsData | null;
  teamData: TeamData | null;
  reportData: ReportDataRoot | null;
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
            reportData={reportData}
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
  template, analytics, teamData, reportData, totals, chartMetric, setChartMetric,
}: {
  template: Template;
  analytics: AnalyticsData | null;
  teamData: TeamData | null;
  reportData: ReportDataRoot | null;
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
      return <TeamContent teamData={teamData} reportData={reportData} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "content":
      return <ContentContent analytics={analytics} teamData={teamData} totals={totals} />;
    case "growth":
      return <GrowthContent analytics={analytics} totals={totals} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "platform":
      return <PlatformContent analytics={analytics} totals={totals} />;
    case "reach":
      return <ReachContent analytics={analytics} totals={totals} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "user-account":
      return <UserAccountContent reportData={reportData} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "user-comparison":
      return <UserComparisonContent reportData={reportData} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    case "account-user":
      return <AccountUserContent reportData={reportData} />;
    case "leaderboard":
      return <LeaderboardContent reportData={reportData} />;
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
function TeamContent({ teamData, reportData, chartMetric, setChartMetric }: {
  teamData: TeamData | null;
  reportData: ReportDataRoot | null;
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

      {/* Per-user × per-account matrix — posts & comments each user made on each account */}
      {reportData && reportData.userAccountMatrix.length > 0 && (
        <UserAccountMatrixTable matrix={reportData.userAccountMatrix} />
      )}
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

// ============ User × Account matrix table (used by Team template) ============
function UserAccountMatrixTable({ matrix }: { matrix: ReportDataRoot["userAccountMatrix"] }) {
  // Get all unique accounts across all users
  const allAccounts: { id: string; platform: string; displayName: string }[] = [];
  const seen = new Set<string>();
  for (const u of matrix) {
    for (const a of u.perAccount) {
      if (!seen.has(a.accountId)) {
        seen.add(a.accountId);
        allAccounts.push({ id: a.accountId, platform: a.platform, displayName: a.displayName });
      }
    }
  }

  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        Posts & comments by user on each account
      </div>
      <div className="crystal-in overflow-x-auto rounded-2xl border border-border/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/20">
              <th className="sticky left-0 z-10 bg-muted/20 py-2.5 px-3 text-left font-semibold text-muted-foreground">User</th>
              {allAccounts.map(a => (
                <th key={a.id} className="px-2 py-2.5 text-center font-semibold text-muted-foreground" title={a.displayName}>
                  <div className="flex flex-col items-center gap-0.5">
                    <PlatformBadge platform={a.platform as PlatformId} size={14} />
                    <span className="text-[9px]">{a.displayName.slice(0, 12)}</span>
                  </div>
                </th>
              ))}
              <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map(u => {
              const total = u.totals.postsCreated;
              return (
                <tr key={u.userId} className="border-b border-border/20 transition hover:bg-muted/20">
                  <td className="sticky left-0 z-10 bg-background/80 py-2 px-3">
                    <div className="flex items-center gap-2">
                      <NameAvatar name={u.userName} color={(u.color as any) ?? "blue"} className="h-5 w-5 text-[9px]" />
                      <div className="font-medium truncate">{u.userName}</div>
                    </div>
                  </td>
                  {allAccounts.map(a => {
                    const cell = u.perAccount.find(p => p.accountId === a.id);
                    const posts = cell?.posts ?? 0;
                    const comments = cell?.comments ?? 0;
                    return (
                      <td key={a.id} className="px-2 py-2 text-center">
                        {posts > 0 || comments > 0 ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold tabular-nums">{posts}</span>
                            {comments > 0 && <span className="text-[9px] text-muted-foreground">{comments}c</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right font-bold tabular-nums text-primary">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">Each cell shows posts (top) and comments (bottom, "c") by that user on that account.</p>
    </div>
  );
}

// ============ User × Account template (full report) ============
function UserAccountContent({ reportData, chartMetric, setChartMetric }: {
  reportData: ReportDataRoot | null;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  const [selectedUser, setSelectedUser] = React.useState<string | null>(null);
  if (!reportData) return <EmptyState />;
  const matrix = reportData.userAccountMatrix;
  const totalPosts = matrix.reduce((s, u) => s + u.totals.postsCreated, 0);
  const totalComments = matrix.reduce((s, u) => s + u.totals.commentsReceived, 0);
  const totalPublished = matrix.reduce((s, u) => s + u.totals.published, 0);

  const metrics = [
    { key: "postsCreated", label: "Posts" },
    { key: "published", label: "Published" },
    { key: "commentsReceived", label: "Comments" },
  ];

  const selected = matrix.find(u => u.userId === selectedUser);

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Users", value: matrix.length.toString(), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.6 0.2 200)" },
        { label: "Total Posts", value: totalPosts.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)" },
        { label: "Published", value: totalPublished.toString(), icon: <TrendingUp className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 145)" },
        { label: "Comments", value: totalComments.toString(), icon: <Heart className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)" },
      ]} />

      <ChartCard
        title="Posts per User"
        desc="Click a bar to drill into that user's per-account breakdown"
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={matrix.map(u => ({ name: u.userName, posts: u.totals.postsCreated, published: u.totals.published }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="posts" name="Posts Created" fill="oklch(0.74 0.18 165)" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600} onClick={(d: any) => setSelectedUser(matrix.find(u => u.userName === d.name)?.userId ?? null)} cursor="pointer" />
              <Bar dataKey="published" name="Published" fill="oklch(0.7 0.2 145)" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Drill-down: selected user's per-account breakdown */}
      {selected && (
        <ChartCard
          title={`${selected.userName} — per account breakdown`}
          desc="Posts & comments this user made on each account"
          action={<button onClick={() => setSelectedUser(null)} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Clear</button>}
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selected.perAccount.filter(a => a.posts > 0 || a.comments > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="displayName" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="posts" name="Posts" fill="oklch(0.74 0.18 165)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
                <Bar dataKey="comments" name="Comments" fill="oklch(0.7 0.2 25)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <UserAccountMatrixTable matrix={matrix} />
    </div>
  );
}

// ============ User Comparison template ============
function UserComparisonContent({ reportData, chartMetric, setChartMetric }: {
  reportData: ReportDataRoot | null;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!reportData) return <EmptyState />;
  const users = reportData.userComparison;
  const totalPosts = users.reduce((s, u) => s + u.postsCreated, 0);
  const totalPublished = users.reduce((s, u) => s + u.postsPublished, 0);
  const totalComments = users.reduce((s, u) => s + u.commentsReceived, 0);
  const avgReplyRate = users.length > 0 ? Math.round(users.reduce((s, u) => s + u.replyRate, 0) / users.length) : 0;

  const metrics = [
    { key: "postsCreated", label: "Posts" },
    { key: "postsPublished", label: "Published" },
    { key: "commentsReplied", label: "Replies" },
    { key: "postsLast7d", label: "Last 7d" },
  ];

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Team Members", value: users.length.toString(), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.7 0.18 180)" },
        { label: "Total Posts", value: totalPosts.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)" },
        { label: "Published", value: totalPublished.toString(), icon: <TrendingUp className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 145)" },
        { label: "Avg Reply Rate", value: `${avgReplyRate}%`, icon: <Activity className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)" },
      ]} />

      <ChartCard
        title="Work Comparison"
        desc="Toggle metrics to compare team members side-by-side"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={users.map(u => ({ name: u.name.split(" ")[0], value: (u as any)[chartMetric] ?? 0 }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600}>
                {users.map((u, i) => (
                  <Cell key={i} fill={PLATFORMS[(u as any).platforms?.[0] as PlatformId]?.color ?? "var(--primary)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Posts Created vs Published" desc="Per member">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={users}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="name" tickFormatter={n => n.split(" ")[0]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="postsCreated" name="Created" fill="oklch(0.6 0.02 250)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={500} />
                <Bar dataKey="postsPublished" name="Published" fill="oklch(0.7 0.2 145)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Comments: Received vs Replied" desc="Per member">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={users}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                <XAxis dataKey="name" tickFormatter={n => n.split(" ")[0]} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="commentsReceived" name="Received" fill="oklch(0.7 0.2 25)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={500} />
                <Bar dataKey="commentsReplied" name="Replied" fill="oklch(0.74 0.18 165)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <UserComparisonTable users={users} />
    </div>
  );
}

// ============ User comparison table (sortable) ============
function UserComparisonTable({ users }: { users: ReportDataRoot["userComparison"] }) {
  const [sortKey, setSortKey] = React.useState<string>("postsCreated");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const sorted = [...users].sort((a, b) => {
    const av = (a as any)[sortKey] ?? 0;
    const bv = (b as any)[sortKey] ?? 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });
  function toggle(k: string) {
    if (sortKey === k) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  }

  const cols: { key: string; label: string }[] = [
    { key: "postsCreated", label: "Posts" },
    { key: "postsPublished", label: "Published" },
    { key: "postsScheduled", label: "Scheduled" },
    { key: "postsDraft", label: "Drafts" },
    { key: "postsFailed", label: "Failed" },
    { key: "commentsReceived", label: "Comments" },
    { key: "commentsReplied", label: "Replied" },
    { key: "replyRate", label: "Reply%" },
    { key: "postsLast7d", label: "7d" },
  ];

  return (
    <div className="crystal-in overflow-x-auto rounded-2xl border border-border/30">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 bg-muted/20">
            <th className="sticky left-0 z-10 bg-muted/20 py-2.5 px-3 text-left font-semibold text-muted-foreground">Member</th>
            {cols.map(c => (
              <th key={c.key} className="px-2 py-2.5 text-right font-semibold">
                <button onClick={() => toggle(c.key)} className="flex items-center gap-1 hover:text-foreground">
                  {c.label}
                  <ArrowUpDown className={cn("h-2.5 w-2.5", sortKey === c.key ? "opacity-100" : "opacity-30")} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(u => (
            <tr key={u.id} className="border-b border-border/20 transition hover:bg-muted/20">
              <td className="sticky left-0 z-10 bg-background/80 py-2 px-3">
                <div className="flex items-center gap-2">
                  <NameAvatar name={u.name} color={(u.color as any) ?? "blue"} className="h-6 w-6 text-[10px]" />
                  <div>
                    <div className="font-medium">{u.name}</div>
                    <div className="text-[10px] text-muted-foreground">{u.title ?? u.role}</div>
                  </div>
                </div>
              </td>
              <td className="px-2 text-right tabular-nums">{u.postsCreated}</td>
              <td className="px-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{u.postsPublished}</td>
              <td className="px-2 text-right tabular-nums text-amber-500">{u.postsScheduled}</td>
              <td className="px-2 text-right tabular-nums">{u.postsDraft}</td>
              <td className="px-2 text-right tabular-nums text-rose-500">{u.postsFailed}</td>
              <td className="px-2 text-right tabular-nums">{u.commentsReceived}</td>
              <td className="px-2 text-right tabular-nums">{u.commentsReplied}</td>
              <td className="px-2 text-right tabular-nums">{u.replyRate}%</td>
              <td className="px-2 text-right tabular-nums">{u.postsLast7d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============ Account × User (Pages Report) template ============
function AccountUserContent({ reportData }: { reportData: ReportDataRoot | null }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  if (!reportData) return <EmptyState />;
  const accounts = reportData.accountUserMatrix;
  const totalFollowers = accounts.reduce((s, a) => s + a.followers, 0);
  const totalPosts = accounts.reduce((s, a) => s + a.totalPosts, 0);
  const totalComments = accounts.reduce((s, a) => s + a.totalComments, 0);
  const totalReplied = accounts.reduce((s, a) => s + a.repliedComments, 0);

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Pages", value: accounts.length.toString(), icon: <Globe className="h-3.5 w-3.5" />, color: "oklch(0.62 0.2 35)" },
        { label: "Followers", value: fmt(totalFollowers), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.62 0.2 255)" },
        { label: "Total Posts", value: totalPosts.toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)" },
        { label: "Reply Rate", value: totalComments > 0 ? `${Math.round((totalReplied / totalComments) * 100)}%` : "—", icon: <Heart className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)" },
      ]} />

      <ChartCard title="Posts & Comments per Page" desc="Click a bar to see who posted">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={accounts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="displayName" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="totalPosts" name="Posts" fill="oklch(0.74 0.18 165)" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600} />
              <Bar dataKey="totalComments" name="Comments" fill="oklch(0.7 0.2 25)" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={600} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Per-page expandable breakdown */}
      <div className="crystal-in overflow-hidden rounded-2xl border border-border/30">
        <div className="border-b border-border/40 bg-muted/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Pages × Users — who posted on each account
        </div>
        <div className="divide-y divide-border/20">
          {accounts.map(a => (
            <div key={a.accountId}>
              <button
                onClick={() => setExpanded(expanded === a.accountId ? null : a.accountId)}
                className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-muted/30"
              >
                <PlatformBadge platform={a.platform as PlatformId} size={18} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{a.displayName}</div>
                  <div className="text-[10px] text-muted-foreground">@{a.handle} · owned by {a.ownerName}</div>
                </div>
                <div className="flex gap-3 text-[10px]">
                  <span className="text-right"><div className="font-bold">{a.totalPosts}</div><div className="text-muted-foreground">posts</div></span>
                  <span className="text-right"><div className="font-bold">{a.totalPublished}</div><div className="text-muted-foreground">pub</div></span>
                  <span className="text-right"><div className="font-bold">{a.totalComments}</div><div className="text-muted-foreground">cmts</div></span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded === a.accountId && "rotate-180")} />
              </button>
              {expanded === a.accountId && (
                <div className="border-t border-border/20 bg-muted/10 p-3">
                  {a.perUser.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="py-1.5 text-left font-semibold text-muted-foreground">User</th>
                          <th className="py-1.5 text-right font-semibold text-muted-foreground">Posts</th>
                          <th className="py-1.5 text-right font-semibold text-muted-foreground">Published</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.perUser.map(u => (
                          <tr key={u.userId} className="border-b border-border/10">
                            <td className="py-1.5">
                              <div className="flex items-center gap-2">
                                <NameAvatar name={u.userName} color={(u.color as any) ?? "blue"} className="h-5 w-5 text-[9px]" />
                                <span>{u.userName}</span>
                              </div>
                            </td>
                            <td className="py-1.5 text-right tabular-nums">{u.posts}</td>
                            <td className="py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{u.published}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="py-2 text-center text-[11px] text-muted-foreground">No users have posted on this account yet.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Leaderboard template ============
function LeaderboardPodiumCard({ users, title, icon, color }: {
  users: ReportDataRoot["userComparison"]; title: string; icon: LucideIcon; color: string;
}) {
  const Icon = icon;
  return (
    <div className="crystal-in rounded-2xl border border-border/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${color}18`, color }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
      </div>
      <div className="space-y-2">
        {users.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-muted-foreground">No data yet</p>
        ) : users.map((u, i) => (
          <div key={u.id} className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: i === 0 ? "oklch(0.78 0.18 85)" : i === 1 ? "oklch(0.6 0.02 250)" : i === 2 ? "oklch(0.6 0.15 50)" : "var(--muted-foreground)" }}>
              {i + 1}
            </span>
            <NameAvatar name={u.name} color={(u.color as any) ?? "blue"} className="h-6 w-6 text-[9px]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{u.name}</div>
              <div className="text-[10px] text-muted-foreground">{u.title ?? u.role}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold tabular-nums" style={{ color }}>{u.postsCreated}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardContent({ reportData }: { reportData: ReportDataRoot | null }) {
  if (!reportData) return <EmptyState />;
  const lb = reportData.leaderboard;

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: "Members", value: reportData.userComparison.length.toString(), icon: <Users className="h-3.5 w-3.5" />, color: "oklch(0.72 0.2 75)" },
        { label: "Total Posts", value: reportData.userComparison.reduce((s, u) => s + u.postsCreated, 0).toString(), icon: <FileText className="h-3.5 w-3.5" />, color: "oklch(0.74 0.18 165)" },
        { label: "Total Published", value: reportData.userComparison.reduce((s, u) => s + u.postsPublished, 0).toString(), icon: <TrendingUp className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 145)" },
        { label: "Most Active", value: reportData.userComparison[0]?.postsLast7d.toString() ?? "0", icon: <Activity className="h-3.5 w-3.5" />, color: "oklch(0.7 0.2 25)" },
      ]} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LeaderboardPodiumCard users={lb.mostPostsCreated} title="Most Posts Created" icon={FileText} color="oklch(0.74 0.18 165)" />
        <LeaderboardPodiumCard users={lb.mostPublished} title="Most Published" icon={TrendingUp} color="oklch(0.7 0.2 145)" />
        <LeaderboardPodiumCard users={lb.mostCommentsReplied} title="Most Comments Replied" icon={Heart} color="oklch(0.7 0.2 25)" />
        <LeaderboardPodiumCard users={lb.bestReplyRate} title="Best Reply Rate" icon={Activity} color="oklch(0.62 0.22 300)" />
        <LeaderboardPodiumCard users={lb.mostActive} title="Most Active (7d)" icon={Zap} color="oklch(0.72 0.2 75)" />
        <LeaderboardPodiumCard users={[...reportData.userComparison].sort((a, b) => b.accountsOwned - a.accountsOwned).slice(0, 5)} title="Most Accounts Managed" icon={Globe} color="oklch(0.6 0.2 220)" />
      </div>

      {/* Per-user platform breakdown — stacked bar chart */}
      <ChartCard title="Platform Distribution by User" desc="Which platforms each member posts to">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData.perUserPlatform.map(u => {
              const row: Record<string, string | number> = { name: u.userName.split(" ")[0] };
              for (const p of u.platforms) row[p.platform] = p.posts;
              return row;
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {Object.keys(PLATFORMS).map((p) => {
                const pm = PLATFORMS[p as PlatformId];
                return <Bar key={p} dataKey={p} stackId="a" fill={pm?.color ?? "var(--primary)"} isAnimationActive animationDuration={500} />;
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
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
  template, dateRangeLabel, analytics, teamData, reportData, totals,
}: {
  template: Template; dateRangeLabel: string; analytics: AnalyticsData | null;
  teamData: TeamData | null;
  reportData: ReportDataRoot | null;
  totals: { followers: number; impressions: number; reach: number; engagement: number; posts: number; likes: number; comments: number; shares: number; saves: number };
}) {
  if (!analytics) return null;
  const now = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const title = `${template.name} Report`;
  const templateColor = template.color;

  // Template-specific executive summary text
  const summaryText = (() => {
    switch (template.id) {
      case "user-account":
      case "user-comparison":
        return `This ${dateRangeLabel.toLowerCase()} report compares team member activity. ${reportData?.userComparison.length ?? 0} member(s) created ${reportData?.userComparison.reduce((s, u) => s + u.postsCreated, 0) ?? 0} posts total, of which ${reportData?.userComparison.reduce((s, u) => s + u.postsPublished, 0) ?? 0} were published across ${analytics.perAccount.length} account(s).`;
      case "account-user":
        return `This ${dateRangeLabel.toLowerCase()} pages report details per-account activity. ${analytics.perAccount.length} account(s) received ${reportData?.accountUserMatrix.reduce((s, a) => s + a.totalPosts, 0) ?? 0} posts from ${reportData?.userComparison.length ?? 0} team member(s), with ${reportData?.accountUserMatrix.reduce((s, a) => s + a.totalComments, 0) ?? 0} total comments.`;
      case "leaderboard":
        return `This ${dateRangeLabel.toLowerCase()} leaderboard ranks ${reportData?.userComparison.length ?? 0} team member(s) by posts created, published, comment replies, reply rate, and 7-day activity.`;
      case "team":
        return `This ${dateRangeLabel.toLowerCase()} team activity report covers ${teamData?.teamTotals.members ?? 0} member(s) managing ${analytics.perAccount.length} account(s). The team created ${teamData?.teamTotals.postsCreated ?? 0} posts, published ${teamData?.teamTotals.publishedPosts ?? 0}, and replied to ${teamData?.teamTotals.commentsReplied ?? 0} of ${teamData?.teamTotals.commentsReceived ?? 0} comments (${teamData?.teamTotals.replyRate ?? 0}% reply rate).`;
      case "engagement":
        return `This ${dateRangeLabel.toLowerCase()} engagement report covers ${analytics.perAccount.length} account(s). Total engagement: ${fmt(totals.engagement)} (${fmt(totals.likes)} likes, ${fmt(totals.comments)} comments, ${fmt(totals.shares)} shares, ${fmt(totals.saves)} saves).`;
      default:
        return `This ${dateRangeLabel.toLowerCase()} ${template.name.toLowerCase()} report covers ${analytics.perAccount.length} account(s)${teamData ? ` and ${teamData.teamTotals.members} team member(s)` : ""}. Total audience: ${fmt(totals.followers)} followers, ${fmt(totals.impressions)} impressions, ${fmt(totals.reach)} reach, and ${fmt(totals.engagement)} total engagement.`;
    }
  })();

  // Whether to show the user×account matrix table
  const showUserMatrix = ["user-account", "team", "user-comparison"].includes(template.id) && reportData && reportData.userAccountMatrix.length > 0;
  const showAccountUser = ["account-user"].includes(template.id) && reportData && reportData.accountUserMatrix.length > 0;
  const showLeaderboard = ["leaderboard"].includes(template.id) && reportData;

  return (
    <div className="report-print-root hidden print:block">
      <table className="w-full">
        <thead><tr><td className="report-header-cell">
          <div className="report-header">
            <div className="report-header-row">
              <div>
                <div className="report-brand">SocialFlow</div>
                <div className="report-subtitle">{title}</div>
                <div className="report-template-desc">{template.desc}</div>
              </div>
              <div className="text-right">
                <div className="report-date">{now}</div>
                <div className="report-type">{dateRangeLabel} Report</div>
                <div className="report-range">Last {dateRangeLabel === "Today" ? "1 day" : dateRangeLabel === "7D" ? "7 days" : dateRangeLabel === "30D" ? "30 days" : "90 days"}</div>
              </div>
            </div>
            <div className="report-accent-bar" style={{ background: templateColor }} />
          </div>
        </td></tr></thead>
        <tbody><tr><td className="report-body-cell">
          <div className="report-content">
            <h2 className="report-section-title">Executive Summary</h2>
            <p className="report-text">{summaryText}</p>

            {/* KPI summary grid — 4 cards */}
            <div className="report-kpi-grid">
              {(() => {
                const kpis: { label: string; value: string }[] = [];
                if (["user-account", "user-comparison", "leaderboard", "team"].includes(template.id) && reportData) {
                  kpis.push(
                    { label: "Members", value: (reportData.userComparison.length).toString() },
                    { label: "Posts Created", value: reportData.userComparison.reduce((s, u) => s + u.postsCreated, 0).toString() },
                    { label: "Published", value: reportData.userComparison.reduce((s, u) => s + u.postsPublished, 0).toString() },
                    { label: "Comments Replied", value: reportData.userComparison.reduce((s, u) => s + u.commentsReplied, 0).toString() },
                  );
                } else {
                  kpis.push(
                    { label: "Followers", value: fmt(totals.followers) },
                    { label: "Impressions", value: fmt(totals.impressions) },
                    { label: "Reach", value: fmt(totals.reach) },
                    { label: "Engagement", value: fmt(totals.engagement) },
                  );
                }
                return kpis.map((k, i) => (
                  <div key={i} className="report-kpi-card">
                    <div className="report-kpi-value">{k.value}</div>
                    <div className="report-kpi-label">{k.label}</div>
                  </div>
                ));
              })()}
            </div>

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

            {/* Team member comparison — full table */}
            {reportData && ["team", "user-comparison", "leaderboard"].includes(template.id) && (
              <>
                <h2 className="report-section-title">Team Member Work Comparison</h2>
                <table className="report-table">
                  <thead><tr>
                    <th>Member</th>
                    <th className="text-right">Posts</th>
                    <th className="text-right">Published</th>
                    <th className="text-right">Drafts</th>
                    <th className="text-right">Failed</th>
                    <th className="text-right">Comments</th>
                    <th className="text-right">Replied</th>
                    <th className="text-right">Reply %</th>
                    <th className="text-right">7-day</th>
                  </tr></thead>
                  <tbody>
                    {reportData.userComparison.map(u => (
                      <tr key={u.id}>
                        <td className="font-medium">{u.name}<span className="report-subtle"> · {u.title ?? u.role}</span></td>
                        <td className="text-right tabular-nums">{u.postsCreated}</td>
                        <td className="text-right tabular-nums">{u.postsPublished}</td>
                        <td className="text-right tabular-nums">{u.postsDraft}</td>
                        <td className="text-right tabular-nums">{u.postsFailed}</td>
                        <td className="text-right tabular-nums">{u.commentsReceived}</td>
                        <td className="text-right tabular-nums">{u.commentsReplied}</td>
                        <td className="text-right tabular-nums">{u.replyRate}%</td>
                        <td className="text-right tabular-nums">{u.postsLast7d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* User × Account matrix table */}
            {showUserMatrix && (() => {
              const matrix = reportData!.userAccountMatrix;
              const allAccounts: { id: string; displayName: string; platform: string }[] = [];
              const seen = new Set<string>();
              for (const u of matrix) for (const a of u.perAccount) if (!seen.has(a.accountId)) { seen.add(a.accountId); allAccounts.push({ id: a.accountId, displayName: a.displayName, platform: a.platform }); }
              return (
                <>
                  <h2 className="report-section-title">Posts & Comments by User on Each Account</h2>
                  <table className="report-table report-matrix">
                    <thead><tr>
                      <th>User</th>
                      {allAccounts.map(a => <th key={a.id} className="text-center">{a.displayName}</th>)}
                      <th className="text-right">Total</th>
                    </tr></thead>
                    <tbody>
                      {matrix.map(u => (
                        <tr key={u.userId}>
                          <td className="font-medium">{u.userName}</td>
                          {allAccounts.map(a => {
                            const cell = u.perAccount.find(p => p.accountId === a.id);
                            return <td key={a.id} className="text-center tabular-nums">{cell?.posts ?? "—"}</td>;
                          })}
                          <td className="text-right tabular-nums font-bold">{u.totals.postsCreated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              );
            })()}

            {/* Account × User (Pages Report) — per account who posted */}
            {showAccountUser && (
              <>
                <h2 className="report-section-title">Pages Report — Per Account Breakdown</h2>
                <table className="report-table">
                  <thead><tr><th>Account</th><th>Platform</th><th>Owner</th><th className="text-right">Followers</th><th className="text-right">Posts</th><th className="text-right">Published</th><th className="text-right">Comments</th><th className="text-right">Replied</th></tr></thead>
                  <tbody>
                    {reportData!.accountUserMatrix.map(a => (
                      <tr key={a.accountId}>
                        <td className="font-medium">{a.displayName}</td>
                        <td className="capitalize">{a.platform}</td>
                        <td>{a.ownerName}</td>
                        <td className="text-right tabular-nums">{a.followers.toLocaleString()}</td>
                        <td className="text-right tabular-nums">{a.totalPosts}</td>
                        <td className="text-right tabular-nums">{a.totalPublished}</td>
                        <td className="text-right tabular-nums">{a.totalComments}</td>
                        <td className="text-right tabular-nums">{a.repliedComments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Per-account user breakdown */}
                <h2 className="report-section-title">Who Posted on Each Account</h2>
                {reportData!.accountUserMatrix.map(a => a.perUser.length > 0 && (
                  <div key={a.accountId} className="report-subsection">
                    <div className="report-subhead">{a.displayName} <span className="report-subtle">(@{a.handle})</span></div>
                    <table className="report-table report-sub-table">
                      <thead><tr><th>User</th><th className="text-right">Posts</th><th className="text-right">Published</th></tr></thead>
                      <tbody>
                        {a.perUser.map(u => (
                          <tr key={u.userId}>
                            <td>{u.userName}</td>
                            <td className="text-right tabular-nums">{u.posts}</td>
                            <td className="text-right tabular-nums">{u.published}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}

            {/* Leaderboard */}
            {showLeaderboard && reportData && (
              <>
                <h2 className="report-section-title">Leaderboard — Top Contributors</h2>
                <table className="report-table">
                  <thead><tr><th>Rank</th><th>Member</th><th>Posts Created</th><th>Published</th><th>Comments Replied</th><th>Reply Rate</th><th>7-day Activity</th></tr></thead>
                  <tbody>
                    {[...reportData.userComparison].sort((a, b) => b.postsCreated - a.postsCreated).slice(0, 10).map((u, i) => (
                      <tr key={u.id}>
                        <td className="tabular-nums">{i + 1}</td>
                        <td className="font-medium">{u.name}</td>
                        <td className="text-right tabular-nums">{u.postsCreated}</td>
                        <td className="text-right tabular-nums">{u.postsPublished}</td>
                        <td className="text-right tabular-nums">{u.commentsReplied}</td>
                        <td className="text-right tabular-nums">{u.replyRate}%</td>
                        <td className="text-right tabular-nums">{u.postsLast7d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Standard account breakdown (for non-pages templates) */}
            {!showAccountUser && (
              <>
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
              </>
            )}

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

            <p className="report-footer-note">Generated by SocialFlow on {now} · {title} · Confidential — for internal use only.</p>
          </div>
        </td></tr></tbody>
        <tfoot><tr><td className="report-footer-cell">
          <div className="report-footer">
            <div className="report-footer-row">
              <span><strong>SocialFlow</strong> — Social, Simplified.</span>
              <span>Page <span className="page-number"></span> of <span className="page-count"></span></span>
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
          .report-header { border-bottom: 1px solid #e0e0e0; }
          .report-header-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 48px 12px; }
          .report-accent-bar { height: 3px; width: 100%; }
          .report-brand { font-size: 22px; font-weight: 800; color: #5856D6; letter-spacing: -0.5px; }
          .report-subtitle { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-top: 2px; }
          .report-template-desc { font-size: 10px; color: #777; margin-top: 2px; }
          .report-date { font-size: 11px; color: #555; }
          .report-type { font-size: 10px; color: #888; text-transform: uppercase; font-weight: 600; }
          .report-range { font-size: 9px; color: #aaa; margin-top: 2px; }
          .report-body-cell { padding: 20px 48px 32px; }
          .report-content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; }
          .report-section-title { font-size: 13px; font-weight: 700; color: #5856D6; margin-top: 22px; margin-bottom: 8px; border-bottom: 2px solid #5856D6; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
          .report-text { font-size: 11.5px; line-height: 1.65; color: #333; margin-bottom: 12px; }
          .report-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 16px; }
          .report-kpi-card { border: 1px solid #e0e0e0; border-left: 3px solid #5856D6; border-radius: 4px; padding: 10px 12px; background: #fafafa; }
          .report-kpi-value { font-size: 20px; font-weight: 700; color: #1a1a1a; line-height: 1; }
          .report-kpi-label { font-size: 9px; font-weight: 600; color: #777; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
          .report-table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 14px; }
          .report-table th { background: #5856D6; color: #fff; font-weight: 600; text-align: left; padding: 7px 10px; border: 1px solid #5856D6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
          .report-table td { padding: 5px 10px; border: 1px solid #e0e0e0; }
          .report-table tbody tr:nth-child(even) { background: #f9f9fb; }
          .report-table tbody tr:hover { background: #f0f0ff; }
          .report-matrix th, .report-matrix td { font-size: 9.5px; padding: 4px 6px; }
          .report-subsection { margin-top: 12px; page-break-inside: avoid; }
          .report-subhead { font-size: 11px; font-weight: 700; color: #333; margin-bottom: 4px; }
          .report-sub-table th { background: #f0f0f5; color: #333; font-size: 9px; }
          .report-subtle { color: #888; font-weight: 400; font-size: 9px; }
          .report-footer-note { font-size: 9.5px; color: #888; margin-top: 28px; font-style: italic; border-top: 1px dashed #ccc; padding-top: 8px; }
          .report-footer { border-top: 2px solid #5856D6; padding: 10px 48px; }
          .report-footer-row { display: flex; justify-content: space-between; font-size: 9.5px; color: #666; }
          .page-number:after { content: counter(page); }
          .page-count:after { content: counter(pages); }
        }
      `}</style>
    </div>
  );
}
