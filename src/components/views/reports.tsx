"use client";

import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  Line, LineChart, ComposedChart,
} from "recharts";
import {
  FileText, Download, Trash2, Eye, Printer,
  Calendar, BarChart3, Users, TrendingUp, Heart, FileBarChart,
  Clock, Loader2, Activity, Globe, Target,
  ChevronDown, Save, ArrowUpDown, Award, Trophy, UserCheck, Grid3x3, Zap,
  Layers, CheckCircle2, XCircle, ListFilter, MessageCircle, Reply, LayoutGrid, List as ListIcon,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MetricRow, Sparkline, SectionHeader, HeroChart, ListRow, Pill, type Metric,
} from "@/components/glass/dense-ui";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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

// Posts performance data from /api/reports/posts
interface PostsPerformanceData {
  kpis: {
    totalPosts: number; published: number; scheduled: number;
    draft: number; failed: number; totalVariantsPublished: number;
    totalComments: number; totalCommentsReplied: number;
  };
  platformBreakdown: {
    platform: string; postsPublished: number; totalVariants: number;
    totalEngagement: number; avgEngagement: number; shareOfTotal: number;
  }[];
  memberBreakdown: {
    userId: string; name: string; avatar: string | null; color: string | null;
    role: string; title: string | null;
    postsAuthored: number; postsPublished: number;
    platforms: string[]; engagement: number; shareOfTotal: number;
    commentsReceived: number; commentsReplied: number; replyRate: number;
  }[];
  posts: {
    id: string; title: string; caption: string; status: string;
    scheduledAt: string | null; createdAt: string;
    authorId: string; authorName: string; authorAvatar: string | null; authorColor: string | null;
    platforms: string[]; engagement: number;
    comments: number; commentsReplied: number;
    variants: {
      id: string; platform: string; handle: string; accountName: string;
      content: string; status: string; publishedAt: string | null;
      likes: number; comments: number; shares: number;
      reach: number; impressions: number; saves: number; engagement: number;
    }[];
  }[];
  totals: { totalPlatformPosts: number; totalEngagement: number; totalComments: number; totalCommentsReplied: number };
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

// 13 compact report templates — grouped into 4 logical tabs.
type TemplateId = "performance" | "audience" | "engagement" | "team" | "content" | "growth" | "platform" | "reach" | "user-account" | "user-comparison" | "account-user" | "leaderboard" | "posts-performance";
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
  { id: "posts-performance", name: "Team Posts", icon: Layers, color: "oklch(0.66 0.22 305)", desc: "Per-user posts + comments + platforms · list & kanban" },
];

// 4 tabs that group the 13 templates into focused, related reports.
type TabId = "performance" | "team" | "content" | "platforms";
interface TabGroup {
  id: TabId; label: string; icon: LucideIcon; color: string;
  templates: TemplateId[]; default: TemplateId;
}
const TAB_GROUPS: TabGroup[] = [
  { id: "performance", label: "Performance", icon: TrendingUp, color: "oklch(0.62 0.2 255)",
    templates: ["performance", "growth", "reach"], default: "performance" },
  { id: "team", label: "Team", icon: Users, color: "oklch(0.74 0.18 165)",
    templates: ["team", "user-comparison", "leaderboard", "user-account"], default: "team" },
  { id: "content", label: "Content", icon: FileText, color: "oklch(0.68 0.18 95)",
    templates: ["content", "posts-performance", "account-user"], default: "posts-performance" },
  { id: "platforms", label: "Platforms", icon: Globe, color: "oklch(0.6 0.2 220)",
    templates: ["platform", "audience", "engagement"], default: "platform" },
];

// ============ Main view ============
export function ReportsView() {
  const [dateRange, setDateRange] = React.useState<DateRange>("30d");
  // Active tab drives the group; activeTemplate is the focused report within that tab.
  // Default tab = Performance (the most-requested overview), per spec.
  const [activeTab, setActiveTab] = React.useState<TabId>("performance");
  const [activeTemplate, setActiveTemplate] = React.useState<TemplateId>("performance");
  const [chartMetric, setChartMetric] = React.useState<string>("followers");
  const [savingReport, setSavingReport] = React.useState(false);
  const { data: savedReports, reload } = useApi<ReportData[]>("/api/reports");

  const days = DATE_RANGES.find(d => d.key === dateRange)?.days ?? 30;
  const analyticsUrl = `/api/analytics?days=${days}&accountId=all`;
  const { data: analytics, loading: analyticsLoading } = useApi<AnalyticsData>(analyticsUrl);
  const { data: teamData, loading: teamLoading } = useApi<TeamData>("/api/team-performance");
  const { data: reportData, loading: reportDataLoading } = useApi<ReportDataRoot>(`/api/reports/data?days=${days}`);
  // Posts performance data — independent of date range (shows full history)
  const { data: postsPerfData, loading: postsPerfLoading } = useApi<PostsPerformanceData>("/api/reports/posts");

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
      "posts-performance": "engagement",
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
  const activeGroup = TAB_GROUPS.find(g => g.id === activeTab)!;

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

  // Dense MetricRow — 6 metrics that adapt to the active tab. Replaces the old
  // 4-card KPI strip (~480px) with a single ~56px row.
  const metrics: Metric[] = React.useMemo(() => {
    const seriesSlice = analytics?.series.slice(-14) ?? [];
    const spark = (arr: number[]) => arr.length > 1 ? arr : undefined;
    if (activeTab === "performance") {
      return [
        { label: "Followers", value: fmt(totals.followers), spark: spark(seriesSlice.map(s => s.followers)), color: "oklch(0.62 0.2 255)" },
        { label: "Impressions", value: fmt(totals.impressions), spark: spark(seriesSlice.map(s => s.impressions)), color: "oklch(0.62 0.22 300)" },
        { label: "Reach", value: fmt(totals.reach), spark: spark(seriesSlice.map(s => s.reach)), color: "oklch(0.7 0.2 25)" },
        { label: "Engagement", value: fmt(totals.engagement), spark: spark(seriesSlice.map(s => s.engagement)), color: "oklch(0.7 0.2 145)" },
        { label: "Posts", value: totals.posts.toLocaleString(), spark: spark(seriesSlice.map(s => s.posts)), color: "oklch(0.74 0.18 165)" },
        { label: "Eng. Rate", value: totals.impressions > 0 ? `${((totals.engagement / totals.impressions) * 100).toFixed(2)}%` : "0%", color: "oklch(0.72 0.2 75)" },
      ];
    }
    if (activeTab === "team") {
      if (!teamData) return [{ label: "Loading", value: "—", color: "var(--muted-foreground)" }];
      const t = teamData.teamTotals;
      const trend = teamData.trend.slice(-14);
      return [
        { label: "Members", value: t.members.toString(), color: "oklch(0.62 0.2 255)" },
        { label: "Posts Created", value: t.postsCreated.toLocaleString(), spark: spark(trend.map(d => d.postsCreated)), color: "oklch(0.74 0.18 165)" },
        { label: "Published", value: t.publishedPosts.toLocaleString(), spark: spark(trend.map(d => d.published)), color: "oklch(0.7 0.2 145)" },
        { label: "Comments Replied", value: t.commentsReplied.toLocaleString(), color: "oklch(0.7 0.2 25)" },
        { label: "Reply Rate", value: `${t.replyRate}%`, color: "oklch(0.62 0.22 300)" },
        { label: "Posts Last 7d", value: t.postsLast7d.toLocaleString(), color: "oklch(0.72 0.2 75)" },
      ];
    }
    if (activeTab === "content") {
      const pipeline = teamData?.pipeline ?? { draft: 0, scheduled: 0, published: 0, failed: 0 };
      const k = postsPerfData?.kpis;
      const totalPosts = teamData?.teamTotals.postsCreated ?? k?.totalPosts ?? 0;
      const variants = k?.totalVariantsPublished ?? 0;
      const comments = k?.totalComments ?? teamData?.teamTotals.commentsReceived ?? 0;
      return [
        { label: "Total Posts", value: totalPosts.toLocaleString(), color: "oklch(0.62 0.22 255)" },
        { label: "Drafts", value: pipeline.draft.toLocaleString(), color: "oklch(0.6 0.02 250)" },
        { label: "Scheduled", value: pipeline.scheduled.toLocaleString(), color: "oklch(0.7 0.15 75)" },
        { label: "Published", value: pipeline.published.toLocaleString(), color: "oklch(0.7 0.2 145)" },
        { label: "Failed", value: pipeline.failed.toLocaleString(), color: "oklch(0.55 0.22 25)" },
        { label: "Variants", value: variants.toLocaleString(), color: "oklch(0.72 0.2 75)" },
        { label: "Comments", value: comments.toLocaleString(), color: "oklch(0.7 0.2 305)" },
      ];
    }
    // platforms
    const platformCount = analytics ? new Set(analytics.perAccount.map(a => a.platform)).size : 0;
    return [
      { label: "Platforms", value: platformCount.toString(), color: "oklch(0.6 0.2 220)" },
      { label: "Accounts", value: (analytics?.perAccount.length ?? 0).toString(), color: "oklch(0.62 0.2 255)" },
      { label: "Followers", value: fmt(totals.followers), spark: spark(seriesSlice.map(s => s.followers)), color: "oklch(0.62 0.22 300)" },
      { label: "Engagement", value: fmt(totals.engagement), spark: spark(seriesSlice.map(s => s.engagement)), color: "oklch(0.7 0.2 25)" },
      { label: "Posts", value: totals.posts.toLocaleString(), color: "oklch(0.74 0.18 165)" },
      { label: "Comments", value: fmt(totals.comments), color: "oklch(0.7 0.2 145)" },
    ];
  }, [activeTab, analytics, teamData, postsPerfData, totals]);

  // When user changes tab, set activeTemplate to the tab's default template.
  function handleTabChange(tabId: TabId) {
    setActiveTab(tabId);
    const group = TAB_GROUPS.find(g => g.id === tabId)!;
    setActiveTemplate(group.default);
  }

  // Clicking a saved report jumps to its tab + template.
  function loadSavedReport(r: ReportData) {
    const grp = TAB_GROUPS.find(g => g.templates.includes(r.type as TemplateId));
    if (grp) {
      setActiveTab(grp.id);
      setActiveTemplate(r.type as TemplateId);
    }
    toast.info(`Loaded "${r.name}" into the viewer above`);
  }

  const loading = activeTemplate === "posts-performance"
    ? postsPerfLoading
    : analyticsLoading || teamLoading || reportDataLoading;

  return (
    <div className="space-y-4">
      <HelpText module="reports">
        <strong className="text-foreground">Reports</strong> — 4 tabs group 13 templates so you can focus on one
        report at a time. Pick a tab, then a focused report. Save, print, or export as PDF.
      </HelpText>

      {/* === Header (title + date range) === */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reports</h2>
          <p className="text-[12px] text-muted-foreground">
            {allReports.length} saved · {analytics?.perAccount.length ?? 0} accounts · {teamData?.teamTotals.members ?? 0} members
          </p>
        </div>
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

      {/* === Main 4-tab navigation (replaces 13 template buttons) === */}
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabId)}>
        <TabsList className="h-9 w-fit">
          {TAB_GROUPS.map(g => {
            const Icon = g.icon;
            const active = activeTab === g.id;
            return (
              <TabsTrigger
                key={g.id}
                value={g.id}
                className="gap-1.5 px-3 text-[12px] data-[state=active]:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" style={{ color: active ? g.color : undefined }} />
                {g.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* === Sub-template pill row + compact toolbar (Save / Print) === */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {activeGroup.templates.map(tid => {
            const t = TEMPLATES.find(t => t.id === tid)!;
            const Icon = t.icon;
            const active = activeTemplate === tid;
            return (
              <button
                key={tid}
                onClick={() => setActiveTemplate(tid)}
                title={t.desc}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition",
                  active
                    ? "border-primary/40 bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--ring)]"
                    : "border-border/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" style={{ color: active ? t.color : undefined }} />
                {t.name}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={saveCurrentReport}
            disabled={savingReport}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-50"
          >
            {savingReport ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            <span className="hidden sm:inline">Save</span>
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
          >
            <Printer className="h-3 w-3" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* === Dense MetricRow (6 metrics, ~56px) === */}
      <MetricRow metrics={metrics} />

      {/* === Report Viewer (one focused report) === */}
      <ReportViewer
        template={template}
        analytics={analytics}
        teamData={teamData}
        reportData={reportData}
        postsPerfData={postsPerfData}
        totals={totals}
        loading={loading}
        dateRangeLabel={DATE_RANGES.find(d => d.key === dateRange)?.label ?? "30 Days"}
        chartMetric={chartMetric}
        setChartMetric={setChartMetric}
      />

      {/* === Saved reports (compact ListRow list, collapsible) === */}
      <SavedReportsStrip
        reports={allReports}
        onView={loadSavedReport}
        onDownload={downloadPDF}
        onDelete={deleteReport}
      />

      {/* === Print layout (modernized — cover page + page numbers) === */}
      <PrintLayout
        template={template}
        dateRangeLabel={DATE_RANGES.find(d => d.key === dateRange)?.label ?? "30 Days"}
        analytics={analytics}
        teamData={teamData}
        reportData={reportData}
        postsPerfData={postsPerfData}
        totals={totals}
      />
    </div>
  );
}

// ============ Report Viewer (focused, single template) ============
function ReportViewer({
  template, analytics, teamData, reportData, postsPerfData, totals, loading, dateRangeLabel,
  chartMetric, setChartMetric,
}: {
  template: Template;
  analytics: AnalyticsData | null;
  teamData: TeamData | null;
  reportData: ReportDataRoot | null;
  postsPerfData: PostsPerformanceData | null;
  totals: { followers: number; impressions: number; reach: number; engagement: number; posts: number; likes: number; comments: number; shares: number; saves: number };
  loading: boolean;
  dateRangeLabel: string;
  chartMetric: string;
  setChartMetric: (m: string) => void;
}) {
  const Icon = template.icon;
  const generatedAt = new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <GlassCard className="crystal-in overflow-hidden p-0" style={{ animationDelay: "0.1s" }}>
      {/* Compact viewer header — no big KPIs, no Save/Print buttons (moved to toolbar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 bg-muted/20 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ background: `${template.color}1a`, color: template.color }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">{template.name} Report</h3>
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                style={{ background: `${template.color}1a`, color: template.color }}
              >
                Live
              </span>
            </div>
            <p className="truncate text-[10px] text-muted-foreground">
              {dateRangeLabel} · {template.desc} · {generatedAt}
            </p>
          </div>
        </div>
      </div>

      {/* Viewer body — one focused report at a time */}
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
            postsPerfData={postsPerfData}
            totals={totals}
            chartMetric={chartMetric}
            setChartMetric={setChartMetric}
          />
        )}
      </div>
    </GlassCard>
  );
}

// ============ Template-specific content dispatcher ============
function TemplateContent({
  template, analytics, teamData, reportData, postsPerfData, totals, chartMetric, setChartMetric,
}: {
  template: Template;
  analytics: AnalyticsData | null;
  teamData: TeamData | null;
  reportData: ReportDataRoot | null;
  postsPerfData: PostsPerformanceData | null;
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
    case "posts-performance":
      return <PostsPerformanceContent data={postsPerfData} chartMetric={chartMetric} setChartMetric={setChartMetric} />;
    default:
      return null;
  }
}

// ============ Metric tabs (for main chart toggle) ============
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

// ============ Compact pipeline pills (draft / scheduled / published / failed) ============
// Replaces a 4-card KPI strip with one 4-pill row.
function PipelinePills({
  draft, scheduled, published, failed,
}: {
  draft: number; scheduled: number; published: number; failed: number;
}) {
  const total = draft + scheduled + published + failed;
  const pills = [
    { label: "Draft", value: draft, color: "neutral" as const, icon: <FileText className="h-2.5 w-2.5" /> },
    { label: "Scheduled", value: scheduled, color: "amber" as const, icon: <Clock className="h-2.5 w-2.5" /> },
    { label: "Published", value: published, color: "green" as const, icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
    { label: "Failed", value: failed, color: "rose" as const, icon: <XCircle className="h-2.5 w-2.5" /> },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pipeline</span>
      <span className="text-[10px] text-muted-foreground/70">· {total} total</span>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {pills.map(p => (
          <Pill key={p.label} color={p.color}>
            {p.icon}
            <span className="tabular-nums">{p.value}</span>
            <span className="opacity-70">{p.label}</span>
          </Pill>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Performance tab templates — Performance, Growth, Reach
// Each: 1 HeroChart (metric toggle) + compact table. No redundant charts.
// ============================================================================

function PerformanceContent({ analytics, totals, chartMetric, setChartMetric }: {
  analytics: AnalyticsData | null; totals: Record<string, number>;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!analytics) return <EmptyState />;
  const series = analytics.series;
  const engRate = totals.impressions > 0 ? ((totals.engagement / totals.impressions) * 100).toFixed(2) : "0.00";
  const metrics = [
    { key: "followers", label: "Followers" },
    { key: "reach", label: "Reach" },
    { key: "impressions", label: "Impressions" },
    { key: "engagement", label: "Engagement" },
  ];

  return (
    <div className="space-y-4">
      {/* Executive summary */}
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Across <strong className="text-foreground">{analytics.perAccount.length}</strong> accounts, the team reached
        <strong className="text-foreground"> {fmt(totals.reach)}</strong> unique users with
        <strong className="text-foreground"> {fmt(totals.impressions)}</strong> impressions — an overall engagement rate of
        <strong className="text-foreground"> {engRate}%</strong> across <strong className="text-foreground">{totals.posts}</strong> published posts.
      </p>

      {/* Single HeroChart — the main trend with metric toggle */}
      <HeroChart
        title="Performance Trend"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[280px]">
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
      </HeroChart>

      {/* Compact per-account comparison table (replaces 4-chart sidebar) */}
      <div>
        <SectionHeader title="Account Breakdown" icon={BarChart3} desc="Sortable per-account performance" />
        <AccountBreakdownTable analytics={analytics} />
      </div>
    </div>
  );
}

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
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{fmt(totals.followers)}</strong> total followers — grown from
        <strong className="text-foreground"> {fmt(series[0]?.followers ?? 0)}</strong> at the start of the period to
        <strong className="text-foreground"> {fmt(series[series.length - 1]?.followers ?? 0)}</strong> today.
      </p>

      <HeroChart
        title="Growth Trend"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[280px]">
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
      </HeroChart>

      {/* Top accounts by growth — compact ListRow list with sparklines */}
      <div>
        <SectionHeader title="Top Growing Accounts" icon={TrendingUp} desc="Sorted by follower count" />
        <div className="glass overflow-hidden rounded-xl">
          {[...analytics.perAccount].sort((a, b) => b.followers - a.followers).slice(0, 6).map((a, i) => {
            const p = PLATFORMS[a.platform as PlatformId];
            return (
              <ListRow key={a.id} className="!py-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: i < 3 ? "oklch(0.7 0.2 45)" : "var(--muted-foreground)" }}>{i + 1}</span>
                <PlatformBadge platform={a.platform as PlatformId} size={18} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{a.displayName}</div>
                  <div className="truncate text-[10px] text-muted-foreground">@{a.handle} · {a.ownerName}</div>
                </div>
                <div className="flex items-center gap-3 text-[10px] tabular-nums">
                  <div className="text-right">
                    <div className="font-bold" style={{ color: p?.color }}>{fmt(a.followers)}</div>
                    <div className="text-muted-foreground">followers</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{fmt(a.engagement)}</div>
                    <div className="text-muted-foreground">eng</div>
                  </div>
                </div>
              </ListRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{fmt(totals.impressions)}</strong> total impressions delivered
        <strong className="text-foreground"> {fmt(totals.reach)}</strong> unique accounts reached —
        reach rate of <strong className="text-foreground">{totals.impressions > 0 ? ((totals.reach / totals.impressions) * 100).toFixed(1) : "0"}%</strong>.
      </p>

      <HeroChart
        title="Reach & Impressions Trend"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[280px]">
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
      </HeroChart>

      <div>
        <SectionHeader title="Account Breakdown" icon={BarChart3} desc="Sortable per-account reach & impressions" />
        <AccountBreakdownTable analytics={analytics} />
      </div>
    </div>
  );
}

// ============================================================================
// Team tab templates — Team, User-Comparison, Leaderboard, User-Account
// ============================================================================

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
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{t.members}</strong> team members created
        <strong className="text-foreground"> {t.postsCreated}</strong> posts, published
        <strong className="text-foreground"> {t.publishedPosts}</strong>, and replied to
        <strong className="text-foreground"> {t.commentsReplied}</strong> of
        <strong className="text-foreground"> {t.commentsReceived}</strong> comments
        (<strong className="text-foreground">{t.replyRate}%</strong> reply rate).
      </p>

      <HeroChart
        title="Content Activity Trend"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[280px]">
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
      </HeroChart>

      <div>
        <SectionHeader title="Member Breakdown" icon={Users} desc="Posts · published · comments · reply rate · cadence" />
        <MemberBreakdownTable teamData={teamData} />
      </div>

      {/* Per-user × per-account matrix — compact, not a chart */}
      {reportData && reportData.userAccountMatrix.length > 0 && (
        <div>
          <SectionHeader title="User × Account Matrix" icon={Grid3x3} desc="Posts & comments by user on each account" />
          <UserAccountMatrixTable matrix={reportData.userAccountMatrix} />
        </div>
      )}
    </div>
  );
}

function UserComparisonContent({ reportData, chartMetric, setChartMetric }: {
  reportData: ReportDataRoot | null;
  chartMetric: string; setChartMetric: (m: string) => void;
}) {
  if (!reportData) return <EmptyState />;
  const users = reportData.userComparison;
  const totalPosts = users.reduce((s, u) => s + u.postsCreated, 0);
  const totalPublished = users.reduce((s, u) => s + u.postsPublished, 0);
  const avgReplyRate = users.length > 0 ? Math.round(users.reduce((s, u) => s + u.replyRate, 0) / users.length) : 0;

  const metrics = [
    { key: "postsCreated", label: "Posts" },
    { key: "postsPublished", label: "Published" },
    { key: "commentsReplied", label: "Replies" },
    { key: "postsLast7d", label: "Last 7d" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Comparing <strong className="text-foreground">{users.length}</strong> team members:
        <strong className="text-foreground"> {totalPosts}</strong> posts created,
        <strong className="text-foreground"> {totalPublished}</strong> published,
        average reply rate <strong className="text-foreground">{avgReplyRate}%</strong>.
      </p>

      <HeroChart
        title="Work Comparison"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[280px]">
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
      </HeroChart>

      <div>
        <SectionHeader title="Member Comparison" icon={UserCheck} desc="Sortable by every metric" />
        <UserComparisonTable users={users} />
      </div>
    </div>
  );
}

function LeaderboardContent({ reportData }: { reportData: ReportDataRoot | null }) {
  if (!reportData) return <EmptyState />;
  const lb = reportData.leaderboard;

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Top contributors ranked by posts created, published, comments replied, reply rate, and 7-day activity.
      </p>

      {/* Leaderboard pods (compact lists, not charts) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <LeaderboardPodiumCard users={lb.mostPostsCreated} title="Most Posts Created" icon={FileText} color="oklch(0.74 0.18 165)" />
        <LeaderboardPodiumCard users={lb.mostPublished} title="Most Published" icon={TrendingUp} color="oklch(0.7 0.2 145)" />
        <LeaderboardPodiumCard users={lb.mostCommentsReplied} title="Most Comments Replied" icon={Heart} color="oklch(0.7 0.2 25)" />
        <LeaderboardPodiumCard users={lb.bestReplyRate} title="Best Reply Rate" icon={Activity} color="oklch(0.62 0.22 300)" />
        <LeaderboardPodiumCard users={lb.mostActive} title="Most Active (7d)" icon={Zap} color="oklch(0.72 0.2 75)" />
        <LeaderboardPodiumCard users={[...reportData.userComparison].sort((a, b) => b.accountsOwned - a.accountsOwned).slice(0, 5)} title="Most Accounts Managed" icon={Globe} color="oklch(0.6 0.2 220)" />
      </div>

      {/* One chart: platform distribution by user (stacked bar) */}
      <HeroChart title="Platform Distribution by User" action={<span className="text-[10px] text-muted-foreground">Which platforms each member posts to</span>}>
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
      </HeroChart>
    </div>
  );
}

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
  // chartMetric drives color coding but the chart itself shows posts vs published side-by-side
  void chartMetric; void setChartMetric; void metrics; // (kept for API parity; this template uses a fixed chart)

  const selected = matrix.find(u => u.userId === selectedUser);

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{matrix.length}</strong> users created
        <strong className="text-foreground"> {totalPosts}</strong> posts,
        published <strong className="text-foreground">{totalPublished}</strong>,
        received <strong className="text-foreground">{totalComments}</strong> comments across all accounts.
      </p>

      <HeroChart title="Posts per User" desc="Click a bar to drill into per-account breakdown">
        <div className="h-[280px]">
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
      </HeroChart>

      {/* Drill-down inline (not a chart) */}
      {selected && (
        <div className="glass rounded-xl border border-border/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {selected.userName} — per account
            </div>
            <button onClick={() => setSelectedUser(null)} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">Clear</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.perAccount.filter(a => a.posts > 0 || a.comments > 0).map(a => (
              <div key={a.accountId} className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 px-2 py-1.5">
                <PlatformBadge platform={a.platform as PlatformId} size={16} />
                <div>
                  <div className="text-[10px] font-bold">{a.displayName}</div>
                  <div className="text-[9px] text-muted-foreground">{a.posts} posts · {a.comments} comments</div>
                </div>
              </div>
            ))}
            {selected.perAccount.filter(a => a.posts > 0 || a.comments > 0).length === 0 && (
              <p className="text-[11px] text-muted-foreground">No posts from this user.</p>
            )}
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="User × Account Matrix" icon={Grid3x3} desc="Posts & comments by each user on each account" />
        <UserAccountMatrixTable matrix={matrix} />
      </div>
    </div>
  );
}

// ============================================================================
// Content tab templates — Content, Posts-Performance (Team Posts), Account-User
// ============================================================================

function ContentContent({ analytics, teamData, totals }: {
  analytics: AnalyticsData | null; teamData: TeamData | null; totals: Record<string, number>;
}) {
  if (!analytics || !teamData) return <EmptyState />;
  const pipeline = teamData.pipeline;
  const platformData = teamData.postsByPlatform;

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Content pipeline overview — <strong className="text-foreground">{totals.posts}</strong> total posts,
        <strong className="text-foreground"> {pipeline.draft}</strong> drafts,
        <strong className="text-foreground"> {pipeline.scheduled}</strong> scheduled,
        <strong className="text-foreground"> {pipeline.published}</strong> published,
        <strong className="text-foreground"> {pipeline.failed}</strong> failed.
      </p>

      {/* Pipeline as compact 4-pill row (not 4 cards) */}
      <PipelinePills draft={pipeline.draft} scheduled={pipeline.scheduled} published={pipeline.published} failed={pipeline.failed} />

      {/* One chart: posts by platform */}
      <HeroChart title="Posts by Platform" desc="Published vs total per platform">
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
      </HeroChart>

      <TopContentList analytics={analytics} title="Top Performing Content" />
    </div>
  );
}

function PostsPerformanceContent({ data, chartMetric, setChartMetric }: {
  data: PostsPerformanceData | null;
  chartMetric: string;
  setChartMetric: (m: string) => void;
}) {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [platformFilter, setPlatformFilter] = React.useState<string>("all");
  const [sortKey, setSortKey] = React.useState<"date" | "engagement" | "title">("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [expandedRow, setExpandedRow] = React.useState<string | null>(null);
  const [postsView, setPostsView] = React.useState<"list" | "kanban">("list");

  const filteredPosts = React.useMemo(() => {
    if (!data) return [];
    let list = data.posts;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (platformFilter !== "all") list = list.filter((p) => p.platforms.includes(platformFilter));
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "engagement") cmp = a.engagement - b.engagement;
      else cmp = a.title.localeCompare(b.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [data, statusFilter, platformFilter, sortKey, sortDir]);

  const kanbanColumns = React.useMemo(() => {
    const cols: Record<string, typeof filteredPosts> = {
      draft: [], scheduled: [], published: [], failed: [],
    };
    for (const p of filteredPosts) {
      if (cols[p.status]) cols[p.status].push(p);
    }
    return cols;
  }, [filteredPosts]);

  if (!data) return <EmptyState />;
  const k = data.kpis;

  const chartData = data.platformBreakdown.map((p) => ({
    name: PLATFORMS[p.platform as PlatformId]?.short ?? p.platform,
    platform: p.platform,
    engagement: p.totalEngagement,
    published: p.postsPublished,
    avg: p.avgEngagement,
  }));

  function toggleSort(key: "date" | "engagement" | "title") {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-4">
      {/* Compact pipeline as 4-pill row (not 8 cards) */}
      <PipelinePills draft={k.draft} scheduled={k.scheduled} published={k.published} failed={k.failed} />

      {/* One chart: engagement by platform with metric toggle */}
      {chartData.length > 0 && (
        <HeroChart
          title="Engagement by Platform"
          desc="Total engagement (likes + comments + shares) per platform"
          action={
            <MetricTabs
              metrics={[
                { key: "engagement", label: "Total" },
                { key: "avg", label: "Avg / post" },
                { key: "published", label: "Published" },
              ]}
              value={chartMetric}
              onChange={setChartMetric}
            />
          }
        >
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                  formatter={(v: number) => fmt(v)}
                />
                <Bar dataKey={chartMetric} radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={PLATFORMS[entry.platform as PlatformId]?.color ?? "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </HeroChart>
      )}

      {/* Platform breakdown table — kept compact */}
      <div>
        <SectionHeader title="Platform Breakdown" icon={Globe} desc="Posts published, engagement, and share-of-total per platform"
          action={<Badge variant="outline" className="text-[10px]">{data.platformBreakdown.length} platforms</Badge>} />
        <div className="glass overflow-hidden rounded-xl">
          {data.platformBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No platform variants published yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="h-8 text-[10px] uppercase">Platform</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Published</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Variants</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Engagement</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Avg / post</TableHead>
                    <TableHead className="h-8 text-[10px] uppercase">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.platformBreakdown.map((p) => {
                    const config = PLATFORMS[p.platform as PlatformId];
                    return (
                      <TableRow key={p.platform} className="border-border/30">
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <PlatformBadge platform={p.platform as PlatformId} size={20} />
                            <span className="text-xs font-bold">{config?.name ?? p.platform}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-xs font-bold tabular-nums">{p.postsPublished}</TableCell>
                        <TableCell className="py-2.5 text-right text-xs tabular-nums text-muted-foreground">{p.totalVariants}</TableCell>
                        <TableCell className="py-2.5 text-right text-xs font-semibold tabular-nums">{fmt(p.totalEngagement)}</TableCell>
                        <TableCell className="py-2.5 text-right text-xs tabular-nums text-muted-foreground">{fmt(p.avgEngagement)}</TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Progress value={p.shareOfTotal} className="h-1.5 w-16" />
                            <span className="text-[10px] tabular-nums text-muted-foreground">{p.shareOfTotal}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Member breakdown — kept (compact table) */}
      <div>
        <SectionHeader title="Member Breakdown" icon={Users} desc="Posts authored, published, platforms, comments & engagement per member"
          action={<Badge variant="outline" className="text-[10px]">{data.memberBreakdown.length} authors</Badge>} />
        <div className="glass overflow-hidden rounded-xl">
          {data.memberBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No posts authored yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="h-8 text-[10px] uppercase">Member</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Posts</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Published</TableHead>
                    <TableHead className="h-8 text-[10px] uppercase">Platforms</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Comments</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Reply %</TableHead>
                    <TableHead className="h-8 text-right text-[10px] uppercase">Engagement</TableHead>
                    <TableHead className="h-8 text-[10px] uppercase">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.memberBreakdown.map((m) => (
                    <TableRow key={m.userId} className="border-border/30">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <NameAvatar name={m.name} color={m.color ?? "blue"} src={m.avatar} className="h-7 w-7 text-[10px]" />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold">{m.name}</div>
                            {m.title && <div className="truncate text-[10px] text-muted-foreground">{m.title}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-bold tabular-nums">{m.postsAuthored}</TableCell>
                      <TableCell className="py-2.5 text-right text-xs tabular-nums text-emerald-600 dark:text-emerald-400">{m.postsPublished}</TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {m.platforms.slice(0, 4).map((pl) => (
                            <PlatformBadge key={pl} platform={pl as PlatformId} size={16} />
                          ))}
                          {m.platforms.length > 4 && (
                            <span className="text-[9px] text-muted-foreground">+{m.platforms.length - 4}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs tabular-nums">
                        <span className="font-semibold">{m.commentsReceived}</span>
                        <span className="text-[9px] text-muted-foreground"> / {m.commentsReplied} replied</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs tabular-nums">
                        <span className={cn("font-bold", m.replyRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : m.replyRate >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400")}>
                          {m.commentsReceived > 0 ? `${m.replyRate}%` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-semibold tabular-nums">{fmt(m.engagement)}</TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Progress value={m.shareOfTotal} className="h-1.5 w-16" />
                          <span className="text-[10px] tabular-nums text-muted-foreground">{m.shareOfTotal}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* All Posts list with List/Kanban toggle — KEPT intact */}
      <div className="glass rounded-xl border border-border/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">All Posts</div>
            <div className="text-[10px] text-muted-foreground/70">
              {postsView === "list"
                ? "Click a row to expand and see platform variants + comments"
                : "Kanban view — posts grouped by lifecycle stage"}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ListFilter className="h-3 w-3" /> Filters:
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 w-[110px] text-[10px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                <SelectItem value="published" className="text-xs">Published</SelectItem>
                <SelectItem value="scheduled" className="text-xs">Scheduled</SelectItem>
                <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                <SelectItem value="failed" className="text-xs">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-7 w-[120px] text-[10px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All platforms</SelectItem>
                {Object.values(PLATFORMS).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={postsView} onValueChange={(v) => setPostsView(v as "list" | "kanban")}>
              <TabsList className="h-7 p-0.5">
                <TabsTrigger value="list" className="gap-1 px-2 py-0 text-[10px]">
                  <ListIcon className="h-3 w-3" /> List
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-1 px-2 py-0 text-[10px]">
                  <LayoutGrid className="h-3 w-3" /> Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No posts match these filters.</div>
        ) : postsView === "kanban" ? (
          /* Kanban view — 4 columns by status */
          <div className="grid gap-3 lg:grid-cols-4">
            {(Object.entries(kanbanColumns) as [string, typeof filteredPosts][]).map(([status, items]) => {
              const sm = POST_STATUS_META[status] ?? POST_STATUS_META.draft;
              return (
                <div key={status} className="flex flex-col gap-2">
                  <div className="sticky top-0 z-10 flex items-center justify-between rounded-xl border border-border/40 bg-background/80 px-3 py-2 backdrop-blur">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("inline-flex", sm.color)}>{sm.icon}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wide">{sm.label}</span>
                    </div>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums", sm.bg, sm.color)}>
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/40 p-4 text-center text-[10px] text-muted-foreground">
                        No posts
                      </div>
                    ) : (
                      items.map((p) => (
                        <div
                          key={p.id}
                          className="group cursor-pointer rounded-xl border border-border/40 bg-background/60 p-3 transition hover:border-primary/40 hover:shadow-md"
                        >
                          <div className="mb-2">
                            <div className="truncate text-xs font-bold">{p.title || "Untitled"}</div>
                            <div className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                              {p.caption || "—"}
                            </div>
                          </div>
                          <div className="mb-2 flex items-center gap-1.5">
                            <NameAvatar name={p.authorName} color={p.authorColor ?? "blue"} src={p.authorAvatar} className="h-5 w-5 text-[8px]" />
                            <span className="truncate text-[10px] font-medium">{p.authorName}</span>
                          </div>
                          <div className="mb-2 flex flex-wrap gap-1">
                            {p.platforms.slice(0, 5).map((pl) => (
                              <PlatformBadge key={pl} platform={pl as PlatformId} size={14} />
                            ))}
                            {p.platforms.length > 5 && (
                              <span className="text-[9px] text-muted-foreground">+{p.platforms.length - 5}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between border-t border-border/30 pt-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-2.5 w-2.5" />
                              <span className="tabular-nums">{p.comments}</span>
                            </span>
                            <span className="tabular-nums font-semibold text-foreground/70">{fmt(p.engagement)}</span>
                            <span>{new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List view (sortable table) */
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="border-border/40">
                  <TableHead className="h-8 text-[10px] uppercase">
                    <button onClick={() => toggleSort("title")} className="flex items-center gap-1 hover:text-foreground">
                      Post <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
                    </button>
                  </TableHead>
                  <TableHead className="h-8 text-[10px] uppercase">Author</TableHead>
                  <TableHead className="h-8 text-[10px] uppercase">Status</TableHead>
                  <TableHead className="h-8 text-[10px] uppercase">Platforms</TableHead>
                  <TableHead className="h-8 text-right text-[10px] uppercase">Comments</TableHead>
                  <TableHead className="h-8 text-right text-[10px] uppercase">
                    <button onClick={() => toggleSort("engagement")} className="flex items-center gap-1 hover:text-foreground">
                      Engagement <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
                    </button>
                  </TableHead>
                  <TableHead className="h-8 text-right text-[10px] uppercase">
                    <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-foreground">
                      Date <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.map((p) => {
                  const isOpen = expandedRow === p.id;
                  const sm = POST_STATUS_META[p.status] ?? POST_STATUS_META.draft;
                  return (
                    <React.Fragment key={p.id}>
                      <TableRow
                        className="cursor-pointer border-border/30 transition hover:bg-muted/30"
                        onClick={() => setExpandedRow(isOpen ? null : p.id)}
                      >
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <ChevronDown className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                            <div className="min-w-0 max-w-[220px]">
                              <div className="truncate text-xs font-bold">{p.title || "Untitled"}</div>
                              <div className="truncate text-[10px] text-muted-foreground">{p.caption || "—"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <NameAvatar name={p.authorName} color={p.authorColor ?? "blue"} src={p.authorAvatar} className="h-6 w-6 text-[9px]" />
                            <span className="truncate text-[11px] font-medium">{p.authorName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", sm.bg, sm.color)}>
                            {sm.icon}
                            {sm.label}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {p.platforms.slice(0, 4).map((pl) => (
                              <PlatformBadge key={pl} platform={pl as PlatformId} size={16} />
                            ))}
                            {p.platforms.length > 4 && (
                              <span className="text-[9px] text-muted-foreground">+{p.platforms.length - 4}</span>
                            )}
                            {p.platforms.length === 0 && <span className="text-[10px] text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-xs tabular-nums">
                          {p.comments > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-bold">{p.comments}</span>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400">{p.commentsReplied} replied</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-xs font-bold tabular-nums">{fmt(p.engagement)}</TableCell>
                        <TableCell className="py-2.5 text-right text-[10px] tabular-nums text-muted-foreground">
                          {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="border-border/30 bg-muted/20">
                          <TableCell colSpan={7} className="p-4">
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                Platform variants ({p.variants.length})
                              </div>
                              {p.variants.length === 0 ? (
                                <div className="text-[11px] text-muted-foreground">No variants for this post.</div>
                              ) : (
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {p.variants.map((v) => {
                                    const vsm = POST_STATUS_META[v.status] ?? POST_STATUS_META.draft;
                                    return (
                                      <div key={v.id} className="rounded-xl border border-border/40 bg-background/50 p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <PlatformBadge platform={v.platform as PlatformId} size={20} />
                                            <div className="min-w-0">
                                              <div className="truncate text-[11px] font-bold">{v.accountName}</div>
                                              <div className="truncate text-[9px] text-muted-foreground">@{v.handle}</div>
                                            </div>
                                          </div>
                                          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold", vsm.bg, vsm.color)}>
                                            {vsm.icon}
                                            {vsm.label}
                                          </span>
                                        </div>
                                        <div className="line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">
                                          {v.content || p.caption || "—"}
                                        </div>
                                        <div className="mt-2 grid grid-cols-4 gap-1 text-center">
                                          <div>
                                            <div className="text-[11px] font-bold tabular-nums">{fmt(v.likes)}</div>
                                            <div className="text-[8px] uppercase text-muted-foreground">Likes</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-bold tabular-nums">{fmt(v.comments)}</div>
                                            <div className="text-[8px] uppercase text-muted-foreground">Cmts</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-bold tabular-nums">{fmt(v.shares)}</div>
                                            <div className="text-[8px] uppercase text-muted-foreground">Shares</div>
                                          </div>
                                          <div>
                                            <div className="text-[11px] font-bold tabular-nums text-primary">{fmt(v.engagement)}</div>
                                            <div className="text-[8px] uppercase text-muted-foreground">Total</div>
                                          </div>
                                        </div>
                                        {v.publishedAt && (
                                          <div className="mt-2 text-[9px] text-muted-foreground">
                                            Published {new Date(v.publishedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Showing {filteredPosts.length} of {data.posts.length} posts</span>
          <span>Total engagement: {fmt(data.totals.totalEngagement)}</span>
        </div>
      </div>
    </div>
  );
}

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
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{accounts.length}</strong> pages/accounts,
        <strong className="text-foreground"> {fmt(totalFollowers)}</strong> followers,
        <strong className="text-foreground"> {totalPosts}</strong> posts,
        <strong className="text-foreground"> {totalComments}</strong> comments
        ({totalComments > 0 ? Math.round((totalReplied / totalComments) * 100) : 0}% replied).
      </p>

      <HeroChart title="Posts & Comments per Page" desc="Click a bar to expand per-user breakdown below">
        <div className="h-[280px]">
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
      </HeroChart>

      {/* Per-page expandable breakdown (compact list, not a chart) */}
      <div className="glass overflow-hidden rounded-xl">
        <div className="border-b border-border/40 bg-muted/20 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Pages × Users — click to expand
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

// ============================================================================
// Platforms tab templates — Platform, Audience, Engagement
// ============================================================================

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
  const platformData = platformRows.map(r => ({
    name: r.platform.charAt(0).toUpperCase() + r.platform.slice(1),
    value: r.followers, platform: r.platform,
  }));

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{platformRows.length}</strong> platforms across
        <strong className="text-foreground"> {analytics.perAccount.length}</strong> accounts —
        <strong className="text-foreground"> {fmt(totals.followers)}</strong> followers and
        <strong className="text-foreground"> {fmt(totals.engagement)}</strong> engagement.
      </p>

      {/* ONE chart: platform distribution (donut) */}
      <HeroChart title="Platform Distribution" action={<span className="text-[10px] text-muted-foreground">Followers by platform</span>}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={platformData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive
                animationDuration={700}
              >
                {platformData.map((d, i) => {
                  const p = PLATFORMS[d.platform as PlatformId];
                  return <Cell key={i} fill={p?.color ?? "var(--primary)"} />;
                })}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </HeroChart>

      {/* Platform comparison table (with inline sparklines) */}
      <div>
        <SectionHeader title="Platform Comparison" icon={BarChart3} desc="One row per platform with sparkline trend" />
        <div className="glass overflow-hidden rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Platform</th>
                <th className="px-3 text-right font-semibold text-muted-foreground">Accounts</th>
                <th className="px-3 text-right font-semibold text-muted-foreground">Followers</th>
                <th className="px-3 text-right font-semibold text-muted-foreground">Impressions</th>
                <th className="px-3 text-right font-semibold text-muted-foreground">Engagement</th>
                <th className="px-3 text-right font-semibold text-muted-foreground">Posts</th>
                <th className="px-3 text-center font-semibold text-muted-foreground">14d Trend</th>
              </tr>
            </thead>
            <tbody>
              {platformRows.map(row => {
                const p = PLATFORMS[row.platform as PlatformId];
                // Sparkline of per-platform followers across last 14 days
                const platformSeries = analytics.series.slice(-14).map(s => {
                  // approximate: total followers × platform share (since series is aggregate)
                  return Math.round(s.followers * (row.followers / totals.followers));
                });
                return (
                  <tr key={row.platform} className="border-b border-border/20 transition hover:bg-muted/20">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={row.platform as PlatformId} size={18} />
                        <span className="font-medium capitalize" style={{ color: p?.color }}>{row.platform}</span>
                      </div>
                    </td>
                    <td className="px-3 text-right tabular-nums">{row.count}</td>
                    <td className="px-3 text-right tabular-nums font-semibold">{row.followers.toLocaleString()}</td>
                    <td className="px-3 text-right tabular-nums">{row.impressions.toLocaleString()}</td>
                    <td className="px-3 text-right tabular-nums">{row.engagement.toLocaleString()}</td>
                    <td className="px-3 text-right tabular-nums">{row.posts}</td>
                    <td className="px-3 text-center">
                      <Sparkline data={platformSeries} color={p?.color ?? "var(--primary)"} width={64} height={20} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="space-y-4">
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">{fmt(totals.followers)}</strong> total audience across
        <strong className="text-foreground"> {analytics.perAccount.length}</strong> accounts.
      </p>

      <HeroChart
        title="Audience Growth"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[280px]">
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
      </HeroChart>

      <div>
        <SectionHeader title="Account Breakdown" icon={BarChart3} desc="Sortable per-account audience" />
        <AccountBreakdownTable analytics={analytics} />
      </div>
    </div>
  );
}

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
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Total engagement <strong className="text-foreground">{fmt(totals.engagement)}</strong> —
        <strong className="text-foreground"> {fmt(totals.likes)}</strong> likes,
        <strong className="text-foreground"> {fmt(totals.comments)}</strong> comments,
        <strong className="text-foreground"> {fmt(totals.shares)}</strong> shares,
        <strong className="text-foreground"> {fmt(totals.saves)}</strong> saves.
        Overall engagement rate: <strong className="text-foreground">{engRate}%</strong>.
      </p>

      <HeroChart
        title="Engagement Trend"
        action={<MetricTabs metrics={metrics} value={chartMetric} onChange={setChartMetric} />}
      >
        <div className="h-[280px]">
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
      </HeroChart>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Second chart: composition donut */}
        <HeroChart title="Engagement Composition" desc="By interaction type">
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
        </HeroChart>

        {/* Top engaged accounts list (compact ListRow) */}
        <div>
          <SectionHeader title="Top Engaged Accounts" icon={Award} desc="By total engagement" />
          <div className="glass overflow-hidden rounded-xl">
            {[...analytics.perAccount].sort((a, b) => b.engagement - a.engagement).slice(0, 5).map((a, i) => {
              const p = PLATFORMS[a.platform as PlatformId];
              return (
                <ListRow key={a.id} className="!py-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: i < 3 ? "oklch(0.7 0.2 45)" : "var(--muted-foreground)" }}>{i + 1}</span>
                  <PlatformBadge platform={a.platform as PlatformId} size={18} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{a.displayName}</div>
                    <div className="truncate text-[10px] text-muted-foreground">@{a.handle}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkline data={series.slice(-10).map(s => Math.round(s.engagement * (a.engagement / totals.engagement)))} color={p?.color ?? "var(--primary)"} width={56} height={20} />
                    <div className="text-right text-[11px] tabular-nums">
                      <div className="font-bold" style={{ color: p?.color }}>{fmt(a.engagement)}</div>
                    </div>
                  </div>
                </ListRow>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Account breakdown table (sortable, with sparkline) ============
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

  const series14 = analytics.series.slice(-14);

  return (
    <div className="glass overflow-x-auto rounded-xl">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 bg-muted/20">
            <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Account</th>
            <th className="px-3 text-right font-semibold"><SortHeader label="Followers" k="followers" sortKey={sortKey} sortDir={sortDir} onToggle={(k) => toggleSort(k as typeof sortKey)} /></th>
            <th className="px-3 text-right font-semibold"><SortHeader label="Impressions" k="impressions" sortKey={sortKey} sortDir={sortDir} onToggle={(k) => toggleSort(k as typeof sortKey)} /></th>
            <th className="px-3 text-right font-semibold"><SortHeader label="Engagement" k="engagement" sortKey={sortKey} sortDir={sortDir} onToggle={(k) => toggleSort(k as typeof sortKey)} /></th>
            <th className="px-3 text-right font-semibold"><SortHeader label="Posts" k="posts" sortKey={sortKey} sortDir={sortDir} onToggle={(k) => toggleSort(k as typeof sortKey)} /></th>
            <th className="px-3 text-left font-semibold text-muted-foreground">Owner</th>
            <th className="px-3 text-center font-semibold text-muted-foreground">14d Trend</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(a => {
            const p = PLATFORMS[a.platform as PlatformId];
            const spark = series14.map(s => Math.round(s.followers * (a.followers / (analytics.perAccount.reduce((s, x) => s + x.followers, 0) || 1))));
            return (
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
                <td className="px-3 text-center">
                  <Sparkline data={spark} color={p?.color ?? "var(--primary)"} width={56} height={18} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============ Member breakdown table (with inline sparkline for cadence) ============
function MemberBreakdownTable({ teamData }: { teamData: TeamData }) {
  const trend = teamData.trend.slice(-14);
  return (
    <div className="glass overflow-x-auto rounded-xl">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 bg-muted/20">
            <th className="py-2.5 px-3 text-left font-semibold text-muted-foreground">Member</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Posts</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Published</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Replied</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Reply %</th>
            <th className="px-3 text-right font-semibold text-muted-foreground">Weekly</th>
            <th className="px-3 text-center font-semibold text-muted-foreground">14d Trend</th>
          </tr>
        </thead>
        <tbody>
          {teamData.members.map(m => {
            const spark = trend.map(d => {
              // approximate share — equal distribution is not perfect but visualizes cadence
              return Math.round(d.postsCreated / Math.max(1, teamData.teamTotals.members));
            });
            return (
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
                <td className="px-3 text-center">
                  <Sparkline data={spark} color="oklch(0.74 0.18 165)" width={56} height={18} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============ User × Account matrix table ============
function UserAccountMatrixTable({ matrix }: { matrix: ReportDataRoot["userAccountMatrix"] }) {
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
    <div className="glass overflow-x-auto rounded-xl">
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
      <p className="px-3 py-1.5 text-[10px] text-muted-foreground">Each cell shows posts (top) and comments (bottom, "c") by that user on that account.</p>
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
    <div className="glass overflow-x-auto rounded-xl">
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

// ============ Leaderboard podium card ============
function LeaderboardPodiumCard({ users, title, icon, color }: {
  users: ReportDataRoot["userComparison"]; title: string; icon: LucideIcon; color: string;
}) {
  const Icon = icon;
  return (
    <div className="glass rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${color}18`, color }}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
      </div>
      <div className="space-y-1.5">
        {users.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-muted-foreground">No data yet</p>
        ) : users.map((u, i) => (
          <div key={u.id} className="flex items-center gap-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
              style={{ background: i === 0 ? "oklch(0.78 0.18 85)" : i === 1 ? "oklch(0.6 0.02 250)" : i === 2 ? "oklch(0.6 0.15 50)" : "var(--muted-foreground)" }}>
              {i + 1}
            </span>
            <NameAvatar name={u.name} color={(u.color as any) ?? "blue"} className="h-5 w-5 text-[9px]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-semibold">{u.name}</div>
              <div className="truncate text-[9px] text-muted-foreground">{u.title ?? u.role}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold tabular-nums" style={{ color }}>{u.postsCreated}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Top content list (compact ListRow) ============
function TopContentList({ analytics, title }: { analytics: AnalyticsData; title?: string }) {
  if (analytics.topContent.length === 0) return null;
  return (
    <div>
      <SectionHeader title={title ?? "Top Performing Content"} icon={Award} desc="Sorted by engagement" />
      <div className="glass overflow-hidden rounded-xl">
        {analytics.topContent.slice(0, 6).map((c, i) => (
          <ListRow key={c.id} className="!py-2">
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
              style={{ background: i < 3 ? "oklch(0.7 0.2 45)" : "var(--muted-foreground)" }}
            >
              {i + 1}
            </span>
            <PlatformBadge platform={c.platform as PlatformId} size={16} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{c.title || "Untitled post"}</div>
              <div className="truncate text-[10px] text-muted-foreground">@{c.handle} · {c.authorName}</div>
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
          </ListRow>
        ))}
      </div>
    </div>
  );
}

// ============ Saved reports strip (compact ListRow list, collapsible) ============
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
    <div className="glass rounded-xl">
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
              const tabGroup = TAB_GROUPS.find(g => g.templates.includes(r.type as TemplateId));
              return (
                <ListRow key={r.id} onClick={() => onView(r)}>
                  <div
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${template?.color ?? "var(--primary)"}18`, color: template?.color ?? "var(--primary)" }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{r.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {tabGroup?.label ?? r.type} · {r.lastGenerated ? timeAgo(r.lastGenerated) : "never"}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onView(r); }}
                    title="Load into viewer"
                    className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary/20"
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDownload(r); }}
                    title="Download PDF"
                    className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary transition hover:bg-primary/20"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                    title="Delete"
                    className="grid h-6 w-6 place-items-center rounded-md border border-border/40 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </ListRow>
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

// ============ Posts Performance: post status meta (icon as ReactNode) ============
const POST_STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  published: { label: "Published", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", icon: <CheckCircle2 className="h-2.5 w-2.5" /> },
  scheduled: { label: "Scheduled", color: "text-primary", bg: "bg-primary/15", icon: <Clock className="h-2.5 w-2.5" /> },
  draft: { label: "Draft", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15", icon: <FileText className="h-2.5 w-2.5" /> },
  failed: { label: "Failed", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/15", icon: <XCircle className="h-2.5 w-2.5" /> },
};

// ============ Print Layout (hidden on screen) — modernized ============
function PrintLayout({
  template, dateRangeLabel, analytics, teamData, reportData, postsPerfData, totals,
}: {
  template: Template; dateRangeLabel: string; analytics: AnalyticsData | null;
  teamData: TeamData | null;
  reportData: ReportDataRoot | null;
  postsPerfData: PostsPerformanceData | null;
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
      case "posts-performance":
        return `This posts performance report covers all ${teamData?.teamTotals.postsCreated ?? 0} post(s) created by the team — ${teamData?.teamTotals.publishedPosts ?? 0} published, ${teamData?.teamTotals.scheduledPosts ?? 0} scheduled, ${teamData?.teamTotals.draftPosts ?? 0} drafts, ${teamData?.teamTotals.failedPosts ?? 0} failed, and ${postsPerfData?.kpis.totalVariantsPublished ?? 0} platform variants published across all platforms.`;
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
      {/* =========================================================
          COVER PAGE — title, date, company, accent bar
          Forces a page break after itself.
         ========================================================= */}
      <section className="report-cover">
        <div>
          <div className="report-cover-brand">SYNQUE</div>
          <div className="report-cover-tagline">Sync Your Social.</div>
        </div>
        <div className="report-cover-spacer" />
        <div className="report-cover-accent" style={{ background: templateColor }} />
        <div className="report-cover-eyebrow">{dateRangeLabel} Report</div>
        <div className="report-cover-title">{template.name}</div>
        {template.desc && <div className="report-cover-desc">{template.desc}</div>}
        <div className="report-cover-meta">
          <div>
            <div className="report-cover-meta-label">Report Date</div>
            <div className="report-cover-meta-value">{now}</div>
          </div>
          <div>
            <div className="report-cover-meta-label">Date Range</div>
            <div className="report-cover-meta-value">{dateRangeLabel} · Last {dateRangeLabel === "Today" ? "1 day" : dateRangeLabel === "7D" ? "7 days" : dateRangeLabel === "30D" ? "30 days" : "90 days"}</div>
          </div>
          <div>
            <div className="report-cover-meta-label">Prepared By</div>
            <div className="report-cover-meta-value">SYNQUE</div>
          </div>
        </div>
        <div className="report-cover-footer">
          <span>Confidential — for internal use only</span>
          <span>synque.app</span>
        </div>
      </section>

      {/* =========================================================
          CONTENT PAGES — running header + body
          (page numbers + "Generated by SYNQUE" handled by @page
          footer rules in globals.css)
         ========================================================= */}
      <div className="report-header">
        <div>
          <div className="report-header-brand">SYNQUE</div>
          <div className="report-header-title">{title}</div>
        </div>
        <div className="report-header-meta">
          <strong>{now}</strong>
          <br />
          {dateRangeLabel} Report
        </div>
      </div>

      <div className="report-content">
        <h2 className="report-section-title">Executive Summary</h2>
        <p className="report-text">{summaryText}</p>

        {/* Dense MetricRow-style KPI strip — compact, scannable, low ink */}
        <div className="report-metric-row">
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
              <div key={i} className="report-metric">
                <div className="report-metric-value">{k.value}</div>
                <div className="report-metric-label">{k.label}</div>
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

        <p className="report-footer-note">
          Generated by SYNQUE on {now} · {title} · Confidential — for internal use only.
        </p>
      </div>
    </div>
  );
}
