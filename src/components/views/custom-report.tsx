"use client";

import * as React from "react";
import {
  Search, Filter, Download, Printer, Loader2, Users, AtSign,
  Globe, TrendingUp, MessageCircle, Heart, Share2, Eye, Target, Zap,
  CheckCircle2, Clock, XCircle, FileText, BarChart3, type LucideIcon,
  ChevronUp, ChevronDown, ChevronRight, Crown, Sparkles, ArrowUpDown,
  LayoutGrid, MessagesSquare, UserCircle2,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { SectionHeader, MetricRow, Pill, ListRow, type Metric } from "@/components/glass/dense-ui";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar, Cell,
} from "recharts";

// ============ Types ============

interface CustomReportData {
  ok: boolean;
  filters: {
    userId: string | null;
    accountId: string | null;
    platform: string | null;
    startDate: string;
    endDate: string;
    metrics: string[];
    postStatus: string[] | null;
    sentiment: string[] | null;
    sortBy: string;
    groupBy: string;
    minEngagement: number;
    search: string | null;
  };
  summary: {
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    scheduledPosts: number;
    failedPosts: number;
    totalVariants: number;
    publishedVariants: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    totalEngagement: number;
    totalReach: number;
    totalImpressions: number;
    totalFollowers: number;
    replyRate: number;
    commentsReplied: number;
    engagementRate: number;
    avgEngagementPerPost: number;
    sentiment: { positive: number; neutral: number; negative: number };
    platformBreakdown: { platform: string; posts: number; engagement: number; followers: number }[];
    activeAccounts: number;
  };
  series: {
    date: string; postsCreated: number; published: number; comments: number;
    shares: number; likes: number; engagement: number; followers: number;
    reach: number; impressions: number;
  }[];
  cadence: { period: string; posts: number; label: string }[];
  posts: {
    id: string; title: string; caption: string; status: string;
    authorName: string; authorAvatar: string | null; createdAt: string;
    scheduledAt: string | null; platforms: string[]; engagement: number;
    likes: number; comments: number; shares: number;
    variants: {
      id: string; platform: string; handle: string; accountName: string;
      status: string; publishedAt: string | null; likes: number; comments: number;
      shares: number; engagement: number;
    }[];
  }[];
  comments: {
    id: string; author: string; text: string; sentiment: string;
    replied: boolean; replyText: string | null; createdAt: string;
    platform: string; accountName: string;
  }[];
  members: {
    id: string; name: string; avatar: string | null; color: string | null;
    posts: number; published: number; comments: number; engagement: number;
  }[];
  accounts: {
    id: string; platform: string; handle: string; displayName: string;
    avatar: string | null; followers: number; ownerName: string;
  }[];
  bestPost: {
    id: string; title: string; caption: string; status: string;
    authorName: string; engagement: number; likes: number; comments: number;
    shares: number; platforms: string[]; createdAt: string;
  } | null;
}

interface TeamMember { id: string; name: string; email: string; role: string; title: string | null; }
interface Account { id: string; platform: string; handle: string; displayName: string; }

// ============ Available metrics ============

const ALL_METRICS: { id: string; label: string; icon: LucideIcon; color: string }[] = [
  { id: "posts", label: "Posts Created", icon: FileText, color: "oklch(0.74 0.18 165)" },
  { id: "published", label: "Published", icon: CheckCircle2, color: "oklch(0.68 0.2 145)" },
  { id: "comments", label: "Comments", icon: MessageCircle, color: "oklch(0.7 0.2 25)" },
  { id: "shares", label: "Shares", icon: Share2, color: "oklch(0.72 0.18 75)" },
  { id: "likes", label: "Likes", icon: Heart, color: "oklch(0.65 0.22 15)" },
  { id: "engagement", label: "Engagement", icon: Zap, color: "oklch(0.7 0.2 305)" },
  { id: "followers", label: "Followers", icon: Users, color: "oklch(0.55 0.2 255)" },
  { id: "reach", label: "Reach", icon: Eye, color: "oklch(0.62 0.22 300)" },
  { id: "impressions", label: "Impressions", icon: BarChart3, color: "oklch(0.6 0.2 220)" },
  { id: "replyRate", label: "Reply Rate", icon: Target, color: "oklch(0.66 0.22 305)" },
];

// ============ Filter option constants ============

const POST_STATUSES = [
  { id: "published", label: "Published", color: "green" as const, icon: CheckCircle2 },
  { id: "draft", label: "Draft", color: "amber" as const, icon: FileText },
  { id: "scheduled", label: "Scheduled", color: "blue" as const, icon: Clock },
  { id: "failed", label: "Failed", color: "rose" as const, icon: XCircle },
];

const SENTIMENTS = [
  { id: "positive", label: "Positive", color: "green" as const },
  { id: "neutral", label: "Neutral", color: "blue" as const },
  { id: "negative", label: "Negative", color: "rose" as const },
];

const SORT_OPTIONS = [
  { id: "date-desc", label: "Date (newest)" },
  { id: "date-asc", label: "Date (oldest)" },
  { id: "engagement-desc", label: "Engagement (high→low)" },
  { id: "comments-desc", label: "Comments (high→low)" },
];

const GROUP_OPTIONS = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
];

const STATUS_META: Record<string, { label: string; color: "green" | "amber" | "blue" | "rose" }> = {
  published: { label: "Published", color: "green" },
  scheduled: { label: "Scheduled", color: "blue" },
  draft: { label: "Draft", color: "amber" },
  failed: { label: "Failed", color: "rose" },
};

const SENTIMENT_META: Record<string, { label: string; color: "green" | "amber" | "blue" | "rose" }> = {
  positive: { label: "Positive", color: "green" },
  neutral: { label: "Neutral", color: "blue" },
  negative: { label: "Negative", color: "rose" },
};

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "posts", label: "Posts", icon: FileText },
  { id: "comments", label: "Comments", icon: MessagesSquare },
  { id: "members", label: "Members", icon: UserCircle2 },
] as const;
type ResultsTab = typeof TABS[number]["id"];

// ============ Sortable column helpers ============

type SortDir = "asc" | "desc";
type PostSortKey = "title" | "author" | "status" | "createdAt" | "engagement" | "comments";
type CommentSortKey = "author" | "text" | "sentiment" | "replied" | "platform" | "createdAt";

// ============ Company info helper (mirrors reports.tsx PrintLayout) ============

function getCompany() {
  if (typeof window === "undefined") {
    return { name: "", logo: null, address: "", city: "", country: "", phone: "", website: "" };
  }
  try {
    const stored = JSON.parse(localStorage.getItem("socialflow-company") ?? "{}");
    return {
      name: stored.companyName ?? "",
      logo: stored.companyLogo ?? null,
      address: stored.address ?? "",
      city: stored.city ?? "",
      country: stored.country ?? "",
      phone: stored.phone ?? "",
      website: stored.website ?? "",
    };
  } catch {
    return { name: "", logo: null, address: "", city: "", country: "", phone: "", website: "" };
  }
}

// ============ Small print-only building blocks ============

function PrintKpiStrip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="report-metric-row">
      {items.map((k, i) => (
        <div key={i} className="report-metric">
          <div className="report-metric-value">{k.value}</div>
          <div className="report-metric-label">{k.label}</div>
        </div>
      ))}
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="report-section-title">{title}</h2>
      {children}
    </>
  );
}

function fmtDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch { return iso; }
}

// ============ Main View ============

export function CustomReportView() {
  // === Filter state (preserved from original) ===
  const [userId, setUserId] = React.useState<string>("");
  const [accountId, setAccountId] = React.useState<string>("");
  const [platform, setPlatform] = React.useState<string>("");
  const [startDate, setStartDate] = React.useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>(
    ALL_METRICS.map((m) => m.id)
  );

  // === NEW filter state ===
  const [postStatuses, setPostStatuses] = React.useState<string[]>([]);
  const [sentiments, setSentiments] = React.useState<string[]>([]);
  const [sortBy, setSortBy] = React.useState<string>("date-desc");
  const [groupBy, setGroupBy] = React.useState<string>("day");
  const [minEngagement, setMinEngagement] = React.useState<number>(0);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const [report, setReport] = React.useState<CustomReportData | null>(null);
  const [loading, setLoading] = React.useState(false);

  // === Interactivity state ===
  const [activeTab, setActiveTab] = React.useState<ResultsTab>("overview");
  const [postQuickFilter, setPostQuickFilter] = React.useState<string>("all");
  const [expandedPostIds, setExpandedPostIds] = React.useState<Set<string>>(new Set());
  const [postSort, setPostSort] = React.useState<{ key: PostSortKey | null; dir: SortDir }>({ key: null, dir: "asc" });
  const [commentSort, setCommentSort] = React.useState<{ key: CommentSortKey | null; dir: SortDir }>({ key: null, dir: "asc" });

  // Fetch team members + accounts for filter dropdowns
  const { data: teamMembers } = useApi<TeamMember[]>("/api/team");
  const { data: accounts } = useApi<Account[]>("/api/accounts");

  // Filter accounts by platform
  const filteredAccounts = accounts
    ? platform ? accounts.filter((a) => a.platform === platform) : accounts
    : [];

  async function generateReport() {
    setLoading(true);
    try {
      const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
      const res = await fetch("/api/reports/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: userId || undefined,
          accountId: accountId || undefined,
          platform: platform || undefined,
          startDate,
          endDate,
          metrics: selectedMetrics,
          postStatus: postStatuses.length > 0 ? postStatuses : undefined,
          sentiment: sentiments.length > 0 ? sentiments : undefined,
          sortBy,
          groupBy,
          minEngagement: minEngagement || undefined,
          search: searchQuery.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json() as CustomReportData;
      setReport(data);
      // Reset interactivity state on each new report
      setActiveTab("overview");
      setPostQuickFilter("all");
      setExpandedPostIds(new Set());
      setPostSort({ key: null, dir: "asc" });
      setCommentSort({ key: null, dir: "asc" });
      toast.success("Custom report generated", {
        description: `${data.summary.totalPosts} posts · ${data.summary.totalComments} comments · ${fmt(data.summary.totalEngagement)} engagement`,
      });
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  function toggleMetric(id: string) {
    setSelectedMetrics((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function togglePill(list: string[], id: string) {
    return list.includes(id) ? list.filter((s) => s !== id) : [...list, id];
  }

  function printReport() {
    const originalTitle = document.title;
    const reportName = `Custom Report — ${startDate} to ${endDate}`;
    document.title = reportName;

    // Move the hidden .report-print-root to be a DIRECT child of <body>
    // before printing. This escapes any ancestor containing blocks
    // (transform, backdrop-filter, position:relative on glass cards) that
    // would trap the absolute-positioned print root and cause blank pages.
    const printRoot = document.querySelector(".report-print-root");
    let originalParent: Node | null = null;
    let originalNextSibling: Node | null = null;
    if (printRoot && printRoot.parentElement !== document.body) {
      originalParent = printRoot.parentElement;
      originalNextSibling = printRoot.nextSibling;
      document.body.appendChild(printRoot);
    }

    const restore = () => {
      document.title = originalTitle;
      if (printRoot && originalParent) {
        if (originalNextSibling) {
          (originalParent as HTMLElement).insertBefore(printRoot, originalNextSibling);
        } else {
          (originalParent as HTMLElement).appendChild(printRoot);
        }
      }
    };

    setTimeout(() => {
      window.print();
      window.addEventListener("afterprint", () => {
        restore();
      }, { once: true });
      // Fallback restore in case afterprint doesn't fire
      setTimeout(restore, 5000);
    }, 300);
  }

  function downloadCSV() {
    if (!report) return;
    const rows: string[][] = [];
    rows.push(["SYNQUE Custom Report"]);
    rows.push([`Period: ${startDate} to ${endDate}`]);
    rows.push([`Member: ${userId ? teamMembers?.find(m => m.id === userId)?.name ?? "Selected" : "All"}`]);
    rows.push([`Account: ${accountId ? accounts?.find(a => a.id === accountId)?.displayName ?? "Selected" : "All"}`]);
    rows.push([`Platform: ${platform || "All"}`]);
    rows.push([`Post Status: ${postStatuses.length > 0 ? postStatuses.join(", ") : "All"}`]);
    rows.push([`Sentiment: ${sentiments.length > 0 ? sentiments.join(", ") : "All"}`]);
    rows.push([`Sort By: ${SORT_OPTIONS.find(s => s.id === sortBy)?.label ?? sortBy}`]);
    rows.push([`Group By: ${GROUP_OPTIONS.find(g => g.id === groupBy)?.label ?? groupBy}`]);
    rows.push([`Min Engagement: ${minEngagement}`]);
    rows.push([`Search: ${searchQuery || ""}`]);
    rows.push([]);

    // Summary
    rows.push(["Summary"]);
    rows.push(["Metric", "Value"]);
    const s = report.summary;
    if (selectedMetrics.includes("posts")) rows.push(["Total Posts", s.totalPosts.toString()]);
    if (selectedMetrics.includes("published")) rows.push(["Published", s.publishedPosts.toString()]);
    if (selectedMetrics.includes("comments")) rows.push(["Comments", s.totalComments.toString()]);
    if (selectedMetrics.includes("shares")) rows.push(["Shares", s.totalShares.toString()]);
    if (selectedMetrics.includes("likes")) rows.push(["Likes", s.totalLikes.toString()]);
    if (selectedMetrics.includes("engagement")) rows.push(["Engagement", s.totalEngagement.toString()]);
    if (selectedMetrics.includes("followers")) rows.push(["Followers", s.totalFollowers.toString()]);
    if (selectedMetrics.includes("reach")) rows.push(["Reach", s.totalReach.toString()]);
    if (selectedMetrics.includes("impressions")) rows.push(["Impressions", s.totalImpressions.toString()]);
    if (selectedMetrics.includes("replyRate")) rows.push(["Reply Rate", `${s.replyRate}%`]);
    rows.push(["Engagement Rate (%)", `${s.engagementRate}%`]);
    rows.push(["Avg Engagement / Post", s.avgEngagementPerPost.toString()]);
    rows.push([]);

    // Daily series
    rows.push([`${GROUP_OPTIONS.find(g => g.id === groupBy)?.label ?? "Daily"} Breakdown`]);
    rows.push(["Date", "Posts", "Published", "Comments", "Shares", "Likes", "Engagement", "Followers", "Reach"]);
    for (const d of report.series) {
      rows.push([d.date, d.postsCreated.toString(), d.published.toString(), d.comments.toString(), d.shares.toString(), d.likes.toString(), d.engagement.toString(), d.followers.toString(), d.reach.toString()]);
    }
    rows.push([]);

    // Posts
    if (report.posts.length > 0) {
      rows.push(["Post Details"]);
      rows.push(["Title", "Author", "Status", "Platforms", "Likes", "Comments", "Shares", "Engagement", "Created"]);
      for (const p of report.posts) {
        rows.push([p.title || "Untitled", p.authorName, p.status, p.platforms.join(", "), p.likes.toString(), p.comments.toString(), p.shares.toString(), p.engagement.toString(), p.createdAt]);
      }
      rows.push([]);
    }

    // Comments
    if (report.comments.length > 0) {
      rows.push(["Comment Details"]);
      rows.push(["Author", "Text", "Sentiment", "Replied", "Platform", "Account", "Date"]);
      for (const c of report.comments) {
        rows.push([c.author, c.text.substring(0, 100), c.sentiment, c.replied ? "Yes" : "No", c.platform, c.accountName, c.createdAt]);
      }
    }

    const csv = rows.map(row => row.map(cell => `"${(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Custom_Report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }

  // Build metrics for on-screen MetricRow (preserved)
  const metrics: Metric[] = report ? [
    ...(selectedMetrics.includes("posts") ? [{ label: "Total Posts", value: fmt(report.summary.totalPosts), spark: report.series.map(s => s.postsCreated), color: "oklch(0.74 0.18 165)" }] : []),
    ...(selectedMetrics.includes("published") ? [{ label: "Published", value: fmt(report.summary.publishedPosts), spark: report.series.map(s => s.published), color: "oklch(0.68 0.2 145)" }] : []),
    ...(selectedMetrics.includes("comments") ? [{ label: "Comments", value: fmt(report.summary.totalComments), spark: report.series.map(s => s.comments), color: "oklch(0.7 0.2 25)" }] : []),
    ...(selectedMetrics.includes("shares") ? [{ label: "Shares", value: fmt(report.summary.totalShares), spark: report.series.map(s => s.shares), color: "oklch(0.72 0.18 75)" }] : []),
    ...(selectedMetrics.includes("likes") ? [{ label: "Likes", value: fmt(report.summary.totalLikes), spark: report.series.map(s => s.likes), color: "oklch(0.65 0.22 15)" }] : []),
    ...(selectedMetrics.includes("engagement") ? [{ label: "Engagement", value: fmt(report.summary.totalEngagement), spark: report.series.map(s => s.engagement), color: "oklch(0.7 0.2 305)" }] : []),
  ] : [];

  // === Derived post list (after quick-filter + on-screen sort) ===
  const visiblePosts = React.useMemo(() => {
    if (!report) return [];
    let list = postQuickFilter === "all"
      ? [...report.posts]
      : report.posts.filter((p) => p.status === postQuickFilter);
    if (postSort.key) {
      const dirMul = postSort.dir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        let av: string | number, bv: string | number;
        switch (postSort.key) {
          case "title": av = a.title ?? ""; bv = b.title ?? ""; break;
          case "author": av = a.authorName; bv = b.authorName; break;
          case "status": av = a.status; bv = b.status; break;
          case "createdAt": av = a.createdAt; bv = b.createdAt; break;
          case "comments": av = a.comments; bv = b.comments; break;
          case "engagement": av = a.engagement; bv = b.engagement; break;
          default: av = 0; bv = 0;
        }
        if (typeof av === "string" && typeof bv === "string") {
          return av.localeCompare(bv) * dirMul;
        }
        return ((av as number) - (bv as number)) * dirMul;
      });
    }
    return list;
  }, [report, postQuickFilter, postSort]);

  const visibleComments = React.useMemo(() => {
    if (!report) return [];
    let list = [...report.comments];
    if (commentSort.key) {
      const dirMul = commentSort.dir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        let av: string | number, bv: string | number;
        switch (commentSort.key) {
          case "author": av = a.author; bv = b.author; break;
          case "text": av = a.text; bv = b.text; break;
          case "sentiment": av = a.sentiment; bv = b.sentiment; break;
          case "replied": av = a.replied ? 1 : 0; bv = b.replied ? 1 : 0; break;
          case "platform": av = a.platform; bv = b.platform; break;
          case "createdAt": av = a.createdAt; bv = b.createdAt; break;
          default: av = 0; bv = 0;
        }
        if (typeof av === "string" && typeof bv === "string") {
          return av.localeCompare(bv) * dirMul;
        }
        return ((av as number) - (bv as number)) * dirMul;
      });
    }
    return list;
  }, [report, commentSort]);

  function toggleExpand(id: string) {
    setExpandedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function setPostSortClick(key: PostSortKey) {
    setPostSort((prev) => prev.key === key
      ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "desc" });
  }
  function setCommentSortClick(key: CommentSortKey) {
    setCommentSort((prev) => prev.key === key
      ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "desc" });
  }

  // ============ Render helpers for sortable header ============
  function SortHeader({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) {
    return (
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-foreground">
        <span>{label}</span>
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    );
  }

  // ============ Render ============
  return (
    <div className="space-y-4">
      {/* === Filter Panel === */}
      <div className="glass rounded-xl p-5 space-y-4">
        <SectionHeader
          title="Custom Report Builder"
          desc="Filter by member, account, platform, date range, metrics, status, sentiment, and more"
          icon={Filter}
          action={
            <div className="flex items-center gap-2">
              {report && (
                <>
                  <button
                    onClick={downloadCSV}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                  >
                    <Download className="h-3 w-3" /> Save
                  </button>
                  <button
                    onClick={printReport}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                  >
                    <Printer className="h-3 w-3" /> Print
                  </button>
                </>
              )}
              <button
                onClick={generateReport}
                disabled={loading}
                className="liquid-pill flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                {loading ? "Generating…" : "Generate Report"}
              </button>
            </div>
          }
        />

        {/* Filter row 1: Member + Account + Platform */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Team Member</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            >
              <option value="">All Members</option>
              {teamMembers?.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Social Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            >
              <option value="">All Accounts</option>
              {filteredAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.displayName} ({a.handle})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Platform</label>
            <select
              value={platform}
              onChange={(e) => { setPlatform(e.target.value); setAccountId(""); }}
              className="mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            >
              <option value="">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="x">X (Twitter)</option>
              <option value="twitter">Twitter</option>
              <option value="linkedin">LinkedIn</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="threads">Threads</option>
            </select>
          </div>
        </div>

        {/* Filter row 2: Date range + Sort + Group */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            >
              {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Group Trend By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            >
              {GROUP_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Filter row 3: Post status pills + Sentiment pills */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Post Status</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {POST_STATUSES.map((s) => {
                const active = postStatuses.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setPostStatuses((prev) => togglePill(prev, s.id))}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/40 text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    <s.icon className="h-3 w-3" />
                    {s.label}
                  </button>
                );
              })}
              {postStatuses.length > 0 && (
                <button
                  onClick={() => setPostStatuses([])}
                  className="rounded-full border border-border/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted/30"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Comment Sentiment</label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SENTIMENTS.map((s) => {
                const active = sentiments.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSentiments((prev) => togglePill(prev, s.id))}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border/40 text-muted-foreground hover:bg-muted/30"
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
              {sentiments.length > 0 && (
                <button
                  onClick={() => setSentiments([])}
                  className="rounded-full border border-border/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-muted/30"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter row 4: Search + Min engagement */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Search in posts (title / caption)</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. product launch, sale, Q3 wrap-up"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Min Engagement</label>
            <input
              type="number"
              min={0}
              value={minEngagement}
              onChange={(e) => setMinEngagement(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Metric selector */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Metrics to Include</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_METRICS.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMetric(m.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition",
                  selectedMetrics.includes(m.id)
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border/40 text-muted-foreground hover:bg-muted/30"
                )}
              >
                <m.icon className="h-3 w-3" style={{ color: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === Report Results === */}
      {report && (
        <div className="space-y-4">
          {/* KPI Strip */}
          {metrics.length > 0 && <MetricRow metrics={metrics} />}

          {/* Tab Switcher */}
          <div className="glass rounded-xl p-2">
            <div className="flex flex-wrap items-center gap-1">
              {TABS.map((t) => {
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* === OVERVIEW TAB === */}
          {activeTab === "overview" && (
            <>
              {/* Trend Chart */}
              {report.series.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <SectionHeader title="Activity Trend" desc={`${report.series.length} data points · ${GROUP_OPTIONS.find(g => g.id === groupBy)?.label ?? "Daily"}`} icon={TrendingUp} />
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={report.series}>
                        <defs>
                          <linearGradient id="customGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip
                          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                        />
                        <Area type="monotone" dataKey="engagement" stroke="var(--primary)" strokeWidth={2} fill="url(#customGrad)" />
                        <Area type="monotone" dataKey="postsCreated" stroke="oklch(0.74 0.18 165)" strokeWidth={1.5} fill="none" />
                        <Area type="monotone" dataKey="comments" stroke="oklch(0.7 0.2 25)" strokeWidth={1.5} fill="none" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* New Advanced Cards: Best Post + Engagement Rate / Avg Engagement / Reply Rate */}
              <div className="grid gap-3 lg:grid-cols-3">
                {/* Best Performing Post — spans 2 cols */}
                <div className="glass rounded-xl p-4 lg:col-span-2">
                  <SectionHeader title="Best Performing Post" icon={Crown} desc="Top post by total engagement across all platforms" />
                  {report.bestPost ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-amber-500" />
                            <span className="truncate text-base font-bold">{report.bestPost.title || "Untitled"}</span>
                          </div>
                          {report.bestPost.caption && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{report.bestPost.caption}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="font-semibold">{report.bestPost.authorName}</span>
                            <span>·</span>
                            <span>{timeAgo(report.bestPost.createdAt)}</span>
                            <span>·</span>
                            <Pill color={STATUS_META[report.bestPost.status]?.color ?? "neutral"}>
                              {STATUS_META[report.bestPost.status]?.label ?? report.bestPost.status}
                            </Pill>
                          </div>
                          <div className="mt-2 flex gap-1">
                            {report.bestPost.platforms.map((pl) => (
                              <PlatformBadge key={pl} platform={pl as any} size={14} />
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {fmt(report.bestPost.engagement)}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Engagement</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-background/60 p-2">
                          <Heart className="mx-auto h-3 w-3 text-rose-500" />
                          <div className="mt-1 text-sm font-bold tabular-nums">{fmt(report.bestPost.likes)}</div>
                          <div className="text-[9px] text-muted-foreground">Likes</div>
                        </div>
                        <div className="rounded-lg bg-background/60 p-2">
                          <MessageCircle className="mx-auto h-3 w-3 text-orange-500" />
                          <div className="mt-1 text-sm font-bold tabular-nums">{fmt(report.bestPost.comments)}</div>
                          <div className="text-[9px] text-muted-foreground">Comments</div>
                        </div>
                        <div className="rounded-lg bg-background/60 p-2">
                          <Share2 className="mx-auto h-3 w-3 text-blue-500" />
                          <div className="mt-1 text-sm font-bold tabular-nums">{fmt(report.bestPost.shares)}</div>
                          <div className="text-[9px] text-muted-foreground">Shares</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid place-items-center py-8 text-xs text-muted-foreground">
                      <Sparkles className="mb-2 h-6 w-6 opacity-30" />
                      No posts with engagement yet.
                    </div>
                  )}
                </div>

                {/* Engagement / Avg / Reply Rate card */}
                <div className="glass rounded-xl p-4 space-y-3">
                  <SectionHeader title="Efficiency" icon={Zap} desc="Engagement quality metrics" />
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Engagement Rate</span>
                      <span className="font-bold tabular-nums">{report.summary.engagementRate}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        style={{ width: `${Math.min(100, report.summary.engagementRate * 5)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      of {fmt(report.summary.totalImpressions)} impressions
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Avg Engagement / Post</span>
                      <span className="font-bold tabular-nums">{fmt(report.summary.avgEngagementPerPost)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                        style={{ width: `${Math.min(100, report.summary.avgEngagementPerPost / 10)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Comment Reply Rate</span>
                      <span className="font-bold tabular-nums">{report.summary.replyRate}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                        style={{ width: `${report.summary.replyRate}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {report.summary.commentsReplied} / {report.summary.totalComments} comments replied
                    </div>
                  </div>
                </div>
              </div>

              {/* Sentiment Distribution + Posting Cadence */}
              <div className="grid gap-3 lg:grid-cols-2">
                {/* Sentiment Distribution */}
                <div className="glass rounded-xl p-4">
                  <SectionHeader title="Sentiment Distribution" icon={MessageCircle} desc="From comment-level sentiment analysis" />
                  {(() => {
                    const sent = report.summary.sentiment;
                    const total = sent.positive + sent.neutral + sent.negative;
                    if (total === 0) {
                      return (
                        <div className="grid place-items-center py-6 text-xs text-muted-foreground">
                          <MessageCircle className="mb-2 h-6 w-6 opacity-30" />
                          No comments yet.
                        </div>
                      );
                    }
                    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
                    return (
                      <div className="space-y-3">
                        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
                          <div className="bg-emerald-500" style={{ width: `${pct(sent.positive)}%` }} />
                          <div className="bg-sky-500" style={{ width: `${pct(sent.neutral)}%` }} />
                          <div className="bg-rose-500" style={{ width: `${pct(sent.negative)}%` }} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {SENTIMENTS.map((s) => {
                            const count = (sent as any)[s.id] as number;
                            return (
                              <div key={s.id} className="rounded-lg border border-border/40 p-2 text-center">
                                <Pill color={s.color}>{s.label}</Pill>
                                <div className="mt-1 text-lg font-bold tabular-nums">{count}</div>
                                <div className="text-[10px] text-muted-foreground">{pct(count)}%</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Posting Cadence */}
                <div className="glass rounded-xl p-4">
                  <SectionHeader title="Posting Cadence" icon={BarChart3} desc={`Posts per ${GROUP_OPTIONS.find(g => g.id === groupBy)?.label?.toLowerCase() ?? "day"}`} />
                  {report.cadence.length > 0 ? (
                    <div className="h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={report.cadence}>
                          <XAxis dataKey="label" tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 8, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 11 }}
                            cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
                          />
                          <Bar dataKey="posts" radius={[3, 3, 0, 0]}>
                            {report.cadence.map((entry, i) => (
                              <Cell
                                key={i}
                                fill={entry.posts === 0 ? "oklch(0.85 0.02 250)" : "oklch(0.65 0.2 165)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="grid place-items-center py-6 text-xs text-muted-foreground">No cadence data.</div>
                  )}
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold tabular-nums">{report.summary.totalPosts}</div>
                      <div className="text-[9px] text-muted-foreground">Total Posts</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold tabular-nums">{report.cadence.length > 0 ? (report.summary.totalPosts / report.cadence.length).toFixed(1) : "0"}</div>
                      <div className="text-[9px] text-muted-foreground">Avg / Period</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold tabular-nums">{report.cadence.filter(c => c.posts === 0).length}</div>
                      <div className="text-[9px] text-muted-foreground">Quiet Periods</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Breakdown */}
              {report.summary.platformBreakdown.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <SectionHeader title="Platform Breakdown" icon={Globe} />
                  <div className="space-y-2">
                    {report.summary.platformBreakdown.map((p) => (
                      <ListRow key={p.platform}>
                        <PlatformBadge platform={p.platform as any} size={20} />
                        <span className="text-sm font-semibold">{p.posts} posts</span>
                        <span className="ml-auto text-sm text-muted-foreground">{fmt(p.engagement)} engagement</span>
                        <span className="text-sm text-muted-foreground">{fmt(p.followers)} followers</span>
                      </ListRow>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* === POSTS TAB === */}
          {activeTab === "posts" && report.posts.length > 0 && (
            <div className="glass rounded-xl p-4">
              <SectionHeader
                title={`Post Details (${report.posts.length})`}
                icon={FileText}
                action={
                  <span className="text-[10px] text-muted-foreground">Click headers to sort · Click row to expand</span>
                }
              />
              {/* Quick status filter pills */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setPostQuickFilter("all")}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                    postQuickFilter === "all"
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/40 text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  All ({report.posts.length})
                </button>
                {POST_STATUSES.map((s) => {
                  const count = report.posts.filter((p) => p.status === s.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setPostQuickFilter(s.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition",
                        postQuickFilter === s.id
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border/40 text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      <s.icon className="h-3 w-3" />
                      {s.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Sortable header row */}
              <div className="grid grid-cols-12 gap-2 border-b border-border/40 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-4">
                  <SortHeader label="Post" active={postSort.key === "title"} dir={postSort.key === "title" ? postSort.dir : "asc"} onClick={() => setPostSortClick("title")} />
                </div>
                <div className="col-span-2">
                  <SortHeader label="Author" active={postSort.key === "author"} dir={postSort.key === "author" ? postSort.dir : "asc"} onClick={() => setPostSortClick("author")} />
                </div>
                <div className="col-span-2">
                  <SortHeader label="Status" active={postSort.key === "status"} dir={postSort.key === "status" ? postSort.dir : "asc"} onClick={() => setPostSortClick("status")} />
                </div>
                <div className="col-span-1 text-right">
                  <SortHeader label="Cmnts" active={postSort.key === "comments"} dir={postSort.key === "comments" ? postSort.dir : "asc"} onClick={() => setPostSortClick("comments")} />
                </div>
                <div className="col-span-2 text-right">
                  <SortHeader label="Engagement" active={postSort.key === "engagement"} dir={postSort.key === "engagement" ? postSort.dir : "asc"} onClick={() => setPostSortClick("engagement")} />
                </div>
                <div className="col-span-1 text-right">
                  <SortHeader label="Created" active={postSort.key === "createdAt"} dir={postSort.key === "createdAt" ? postSort.dir : "asc"} onClick={() => setPostSortClick("createdAt")} />
                </div>
              </div>

              <div className="max-h-[640px] space-y-1 overflow-y-auto scroll-liquid">
                {visiblePosts.length === 0 ? (
                  <div className="grid place-items-center py-8 text-xs text-muted-foreground">
                    No posts match this quick filter.
                  </div>
                ) : (
                  visiblePosts.map((p) => {
                    const sm = STATUS_META[p.status] ?? STATUS_META.draft;
                    const expanded = expandedPostIds.has(p.id);
                    return (
                      <div key={p.id} className="rounded-lg border border-border/30 bg-background/30">
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="grid w-full grid-cols-12 items-center gap-2 px-2 py-2.5 text-left transition-colors hover:bg-muted/30"
                        >
                          <div className="col-span-4 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <ChevronRight className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
                              <span className="truncate text-sm font-semibold">{p.title || "Untitled"}</span>
                            </div>
                            <div className="mt-0.5 flex gap-1 pl-4">
                              {p.platforms.map((pl) => <PlatformBadge key={pl} platform={pl as any} size={12} />)}
                            </div>
                          </div>
                          <div className="col-span-2 truncate text-xs">{p.authorName}</div>
                          <div className="col-span-2"><Pill color={sm.color}>{sm.label}</Pill></div>
                          <div className="col-span-1 text-right text-xs font-semibold tabular-nums">{p.comments}</div>
                          <div className="col-span-2 text-right text-xs font-bold tabular-nums">{fmt(p.engagement)}</div>
                          <div className="col-span-1 text-right text-[10px] text-muted-foreground">{timeAgo(p.createdAt)}</div>
                        </button>
                        {expanded && (
                          <div className="border-t border-border/30 bg-muted/20 px-4 py-3">
                            {p.caption && (
                              <p className="mb-3 text-xs text-muted-foreground">{p.caption}</p>
                            )}
                            {p.variants.length > 0 ? (
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Per-Platform Variants ({p.variants.length})</div>
                                {p.variants.map((v) => {
                                  const vsm = STATUS_META[v.status] ?? STATUS_META.draft;
                                  return (
                                    <div key={v.id} className="grid grid-cols-12 items-center gap-2 rounded-md border border-border/20 bg-background/40 px-2 py-1.5 text-xs">
                                      <div className="col-span-3 flex items-center gap-1.5">
                                        <PlatformBadge platform={v.platform as any} size={14} />
                                        <span className="truncate">{v.accountName}</span>
                                      </div>
                                      <div className="col-span-2 truncate text-muted-foreground">@{v.handle}</div>
                                      <div className="col-span-2"><Pill color={vsm.color}>{vsm.label}</Pill></div>
                                      <div className="col-span-1 text-right tabular-nums">{v.likes}</div>
                                      <div className="col-span-1 text-right tabular-nums">{v.comments}</div>
                                      <div className="col-span-1 text-right tabular-nums">{v.shares}</div>
                                      <div className="col-span-2 text-right font-semibold tabular-nums">{fmt(v.engagement)}</div>
                                    </div>
                                  );
                                })}
                                <div className="grid grid-cols-12 gap-2 border-t border-border/20 pt-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                  <div className="col-span-6">Variant totals</div>
                                  <div className="col-span-1 text-right">Likes</div>
                                  <div className="col-span-1 text-right">Cmnts</div>
                                  <div className="col-span-1 text-right">Shares</div>
                                  <div className="col-span-3 text-right">Total Engagement</div>
                                </div>
                                <div className="grid grid-cols-12 gap-2 text-xs font-bold tabular-nums">
                                  <div className="col-span-6"></div>
                                  <div className="col-span-1 text-right">{fmt(p.likes)}</div>
                                  <div className="col-span-1 text-right">{fmt(p.comments)}</div>
                                  <div className="col-span-1 text-right">{fmt(p.shares)}</div>
                                  <div className="col-span-3 text-right">{fmt(p.engagement)}</div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No published variants.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {activeTab === "posts" && report.posts.length === 0 && (
            <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">No posts match the current filters.</div>
          )}

          {/* === COMMENTS TAB === */}
          {activeTab === "comments" && report.comments.length > 0 && (
            <div className="glass rounded-xl p-4">
              <SectionHeader title={`Comment Details (${report.comments.length})`} icon={MessageCircle} action={<span className="text-[10px] text-muted-foreground">Click headers to sort</span>} />
              {/* Sortable header row */}
              <div className="grid grid-cols-12 gap-2 border-b border-border/40 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="col-span-2"><SortHeader label="Author" active={commentSort.key === "author"} dir={commentSort.key === "author" ? commentSort.dir : "asc"} onClick={() => setCommentSortClick("author")} /></div>
                <div className="col-span-4"><SortHeader label="Comment" active={commentSort.key === "text"} dir={commentSort.key === "text" ? commentSort.dir : "asc"} onClick={() => setCommentSortClick("text")} /></div>
                <div className="col-span-2"><SortHeader label="Sentiment" active={commentSort.key === "sentiment"} dir={commentSort.key === "sentiment" ? commentSort.dir : "asc"} onClick={() => setCommentSortClick("sentiment")} /></div>
                <div className="col-span-1"><SortHeader label="Reply" active={commentSort.key === "replied"} dir={commentSort.key === "replied" ? commentSort.dir : "asc"} onClick={() => setCommentSortClick("replied")} /></div>
                <div className="col-span-2"><SortHeader label="Platform" active={commentSort.key === "platform"} dir={commentSort.key === "platform" ? commentSort.dir : "asc"} onClick={() => setCommentSortClick("platform")} /></div>
                <div className="col-span-1 text-right"><SortHeader label="When" active={commentSort.key === "createdAt"} dir={commentSort.key === "createdAt" ? commentSort.dir : "asc"} onClick={() => setCommentSortClick("createdAt")} /></div>
              </div>
              <div className="max-h-[640px] space-y-1 overflow-y-auto scroll-liquid">
                {visibleComments.map((c) => {
                  const sm = SENTIMENT_META[c.sentiment] ?? SENTIMENT_META.neutral;
                  return (
                    <div key={c.id} className="grid grid-cols-12 items-center gap-2 rounded-lg border border-border/30 p-2 text-xs">
                      <div className="col-span-2 truncate font-semibold">{c.author}</div>
                      <div className="col-span-4 truncate text-muted-foreground">{c.text}</div>
                      <div className="col-span-2"><Pill color={sm.color}>{sm.label}</Pill></div>
                      <div className="col-span-1">
                        {c.replied ? <Pill color="green">Yes</Pill> : <Pill color="neutral">No</Pill>}
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <PlatformBadge platform={c.platform as any} size={12} />
                        <span className="truncate text-[10px] text-muted-foreground">{c.accountName}</span>
                      </div>
                      <div className="col-span-1 text-right text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === "comments" && report.comments.length === 0 && (
            <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">No comments match the current filters.</div>
          )}

          {/* === MEMBERS TAB === */}
          {activeTab === "members" && (
            <>
              {report.members.length > 0 ? (
                <div className="glass rounded-xl p-4">
                  <SectionHeader title="Member Breakdown" icon={Users} />
                  <div className="space-y-2">
                    {report.members.map((m) => (
                      <ListRow key={m.id}>
                        <NameAvatar name={m.name} color={m.color ?? "blue"} src={m.avatar} className="h-8 w-8 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{m.name}</div>
                        </div>
                        <span className="text-xs font-bold tabular-nums">{m.posts} posts</span>
                        <span className="text-xs text-muted-foreground">{m.published} published</span>
                        <span className="text-xs text-muted-foreground">{m.comments} comments</span>
                        <span className="text-xs font-semibold tabular-nums">{fmt(m.engagement)} eng</span>
                      </ListRow>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
                  Member breakdown only shows when not filtering by a specific team member.
                </div>
              )}

              {/* Accounts list */}
              {report.accounts.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <SectionHeader title={`Accounts in Scope (${report.accounts.length})`} icon={AtSign} />
                  <div className="space-y-2">
                    {report.accounts.map((a) => (
                      <ListRow key={a.id}>
                        <PlatformBadge platform={a.platform as any} size={20} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{a.displayName}</div>
                          <div className="text-[10px] text-muted-foreground">@{a.handle}</div>
                        </div>
                        <span className="text-xs text-muted-foreground">Owner: {a.ownerName}</span>
                        <span className="text-xs font-semibold tabular-nums">{fmt(a.followers)} followers</span>
                      </ListRow>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ============================================================
              PRINT LAYOUT — uses the SAME CSS classes as standard reports.
              Hidden on screen, visible only when printing.
              Contains the full report (banner, KPI strip, all tables, footer).
             ============================================================ */}
          <PrintLayout
            report={report}
            startDate={startDate}
            endDate={endDate}
            groupLabel={GROUP_OPTIONS.find((g) => g.id === groupBy)?.label ?? "Daily"}
            selectedMetrics={selectedMetrics}
          />
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="glass rounded-xl p-12 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Filter className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold">Build Your Custom Report</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Select filters above and click "Generate Report" to create a fully customized analysis.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Filter by team member, social account, platform, date range, post status, sentiment, sort order, aggregation, and minimum engagement — plus full-text search in post titles and captions.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Print Layout — mirrors the standard reports.tsx PrintLayout structure.
// Uses the SAME CSS classes (report-print-root, report-title-banner, etc.)
// defined in globals.css so the printed output matches all other reports.
// ============================================================================

function PrintLayout({
  report, startDate, endDate, groupLabel, selectedMetrics,
}: {
  report: CustomReportData;
  startDate: string;
  endDate: string;
  groupLabel: string;
  selectedMetrics: string[];
}) {
  const now = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const dateRangeLabel = `${startDate} → ${endDate}`;
  const title = "Custom Report";

  // Company info from localStorage (set by Settings → Company section)
  const company = getCompany();
  const companyLine = [company.address, company.city, company.country].filter(Boolean).join(", ");
  const contactLine = [company.phone, company.website].filter(Boolean).join(" · ");

  const s = report.summary;
  const eng = s.totalEngagement;
  const engRateText = `${s.engagementRate}%`;

  // Executive summary text — computed from the actual data
  const summaryText =
    `This custom report covers ${report.accounts.length} account(s) ` +
    `and ${report.members.length || (s.totalPosts > 0 ? 1 : 0)} team member(s) ` +
    `between ${startDate} and ${endDate}. ` +
    `${s.totalPosts} post(s) created (${s.publishedPosts} published, ${s.scheduledPosts} scheduled, ${s.draftPosts} draft, ${s.failedPosts} failed) ` +
    `across ${s.activeAccounts} active account(s). ` +
    `Total engagement: ${fmt(eng)} (${fmt(s.totalLikes)} likes, ${fmt(s.totalComments)} comments, ${fmt(s.totalShares)} shares) ` +
    `at ${engRateText} engagement rate. ` +
    `${s.commentsReplied} of ${s.totalComments} comments replied (${s.replyRate}% reply rate). ` +
    `Sentiment: ${s.sentiment.positive} positive, ${s.sentiment.neutral} neutral, ${s.sentiment.negative} negative.`;

  // KPI strip — built from the selected metrics
  const kpis: { label: string; value: string }[] = [];
  if (selectedMetrics.includes("posts")) kpis.push({ label: "Total Posts", value: fmt(s.totalPosts) });
  if (selectedMetrics.includes("published")) kpis.push({ label: "Published", value: fmt(s.publishedPosts) });
  if (selectedMetrics.includes("comments")) kpis.push({ label: "Comments", value: fmt(s.totalComments) });
  if (selectedMetrics.includes("shares")) kpis.push({ label: "Shares", value: fmt(s.totalShares) });
  if (selectedMetrics.includes("likes")) kpis.push({ label: "Likes", value: fmt(s.totalLikes) });
  if (selectedMetrics.includes("engagement")) kpis.push({ label: "Engagement", value: fmt(s.totalEngagement) });
  if (selectedMetrics.includes("followers")) kpis.push({ label: "Followers", value: fmt(s.totalFollowers) });
  if (selectedMetrics.includes("reach")) kpis.push({ label: "Reach", value: fmt(s.totalReach) });
  if (selectedMetrics.includes("impressions")) kpis.push({ label: "Impressions", value: fmt(s.totalImpressions) });
  if (selectedMetrics.includes("replyRate")) kpis.push({ label: "Reply Rate", value: `${s.replyRate}%` });
  kpis.push({ label: "Eng. Rate", value: engRateText });
  kpis.push({ label: "Avg Eng/Post", value: fmt(s.avgEngagementPerPost) });
  // Cap at 8 KPIs for print layout
  const kpisTrimmed = kpis.slice(0, 8);

  return (
    <div className="report-print-root hidden print:block">
      {/* ====== BANNER ====== */}
      <div className="report-title-banner">
        <div className="report-title-banner-left">
          {company.logo ? (
            <img src={company.logo} alt={company.name || "Company"} className="report-company-logo" />
          ) : null}
          <div>
            <div className="report-title-banner-brand">{company.name || "SYNQUE"}</div>
            <div className="report-title-banner-tagline">{company.name ? "Social Media Report" : "Orchestrate Your Social"}</div>
          </div>
        </div>
        <div className="report-title-banner-right">
          <div className="report-title-banner-eyebrow">{groupLabel} Report</div>
          <div className="report-title-banner-title">{title}</div>
          <div className="report-title-banner-meta">{now} · {dateRangeLabel}</div>
        </div>
      </div>
      <div className="report-title-accent" style={{ background: "oklch(0.65 0.22 305)" }} />

      {/* ====== CONTENT ====== */}
      <div className="report-content">
        <h2 className="report-section-title">Executive Summary</h2>
        <p className="report-text">{summaryText}</p>

        <PrintKpiStrip items={kpisTrimmed} />

        {/* === Filters applied === */}
        <PrintSection title="Filters Applied">
          <table className="report-table">
            <thead><tr><th>Filter</th><th>Value</th></tr></thead>
            <tbody>
              <tr><td className="font-medium">Period</td><td>{startDate} to {endDate}</td></tr>
              <tr><td className="font-medium">Group By</td><td className="capitalize">{groupLabel}</td></tr>
              <tr><td className="font-medium">Sort By</td><td>{SORT_OPTIONS.find((o) => o.id === report.filters.sortBy)?.label ?? report.filters.sortBy}</td></tr>
              <tr><td className="font-medium">Post Status</td><td>{report.filters.postStatus ? report.filters.postStatus.join(", ") : "All"}</td></tr>
              <tr><td className="font-medium">Comment Sentiment</td><td>{report.filters.sentiment ? report.filters.sentiment.join(", ") : "All"}</td></tr>
              <tr><td className="font-medium">Min Engagement</td><td className="tabular-nums">{report.filters.minEngagement}</td></tr>
              {report.filters.search && (
                <tr><td className="font-medium">Search</td><td>&ldquo;{report.filters.search}&rdquo;</td></tr>
              )}
              <tr><td className="font-medium">Metrics</td><td>{selectedMetrics.join(", ")}</td></tr>
            </tbody>
          </table>
        </PrintSection>

        {/* === Trend table === */}
        {report.series.length > 0 && (
          <PrintSection title={`Activity Trend (${groupLabel})`}>
            <table className="report-table">
              <thead><tr>
                <th>Period</th>
                <th className="text-right">Posts</th>
                <th className="text-right">Published</th>
                <th className="text-right">Likes</th>
                <th className="text-right">Comments</th>
                <th className="text-right">Shares</th>
                <th className="text-right">Engagement</th>
                <th className="text-right">Reach</th>
              </tr></thead>
              <tbody>
                {report.series.slice(-30).map((d) => (
                  <tr key={d.date}>
                    <td>{fmtDay(d.date)}</td>
                    <td className="text-right tabular-nums">{d.postsCreated}</td>
                    <td className="text-right tabular-nums">{d.published}</td>
                    <td className="text-right tabular-nums">{d.likes.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{d.comments.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{d.shares.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{d.engagement.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{d.reach.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {/* === Platform breakdown === */}
        {report.summary.platformBreakdown.length > 0 && (
          <PrintSection title="Platform Breakdown">
            <table className="report-table">
              <thead><tr>
                <th>Platform</th>
                <th className="text-right">Posts</th>
                <th className="text-right">Engagement</th>
                <th className="text-right">Followers</th>
              </tr></thead>
              <tbody>
                {report.summary.platformBreakdown.map((p) => (
                  <tr key={p.platform}>
                    <td className="font-medium capitalize">{p.platform}</td>
                    <td className="text-right tabular-nums">{p.posts}</td>
                    <td className="text-right tabular-nums">{p.engagement.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{p.followers.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {/* === Member breakdown === */}
        {report.members.length > 0 && (
          <PrintSection title="Member Breakdown">
            <table className="report-table">
              <thead><tr>
                <th>Member</th>
                <th className="text-right">Posts</th>
                <th className="text-right">Published</th>
                <th className="text-right">Comments</th>
                <th className="text-right">Engagement</th>
              </tr></thead>
              <tbody>
                {report.members.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium">{m.name}</td>
                    <td className="text-right tabular-nums">{m.posts}</td>
                    <td className="text-right tabular-nums">{m.published}</td>
                    <td className="text-right tabular-nums">{m.comments}</td>
                    <td className="text-right tabular-nums">{m.engagement.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {/* === Post details === */}
        {report.posts.length > 0 && (
          <PrintSection title={`Post Details (${report.posts.length})`}>
            <table className="report-table">
              <thead><tr>
                <th>Title</th>
                <th>Author</th>
                <th>Status</th>
                <th>Platforms</th>
                <th className="text-right">Likes</th>
                <th className="text-right">Comments</th>
                <th className="text-right">Engagement</th>
              </tr></thead>
              <tbody>
                {report.posts.slice(0, 30).map((p) => (
                  <tr key={p.id}>
                    <td className="max-w-[180px] truncate font-medium">{p.title || "Untitled"}</td>
                    <td>{p.authorName}</td>
                    <td className="capitalize">{p.status}</td>
                    <td className="text-[8.5px] capitalize">{p.platforms.join(", ") || "—"}</td>
                    <td className="text-right tabular-nums">{p.likes.toLocaleString()}</td>
                    <td className="text-right tabular-nums">{p.comments.toLocaleString()}</td>
                    <td className="text-right tabular-nums font-semibold">{p.engagement.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {/* === Comment details === */}
        {report.comments.length > 0 && (
          <PrintSection title={`Comment Details (${report.comments.length})`}>
            <table className="report-table">
              <thead><tr>
                <th>Author</th>
                <th>Comment</th>
                <th>Sentiment</th>
                <th>Replied</th>
                <th>Platform</th>
                <th>Account</th>
              </tr></thead>
              <tbody>
                {report.comments.slice(0, 30).map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.author}</td>
                    <td className="max-w-[240px] truncate">{c.text}</td>
                    <td className="capitalize">{c.sentiment}</td>
                    <td>{c.replied ? "Yes" : "No"}</td>
                    <td className="capitalize">{c.platform}</td>
                    <td>{c.accountName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintSection>
        )}

        {/* === Best performing post callout === */}
        {report.bestPost && (
          <PrintSection title="Best Performing Post">
            <table className="report-table">
              <thead><tr>
                <th>Title</th>
                <th>Author</th>
                <th className="text-right">Likes</th>
                <th className="text-right">Comments</th>
                <th className="text-right">Shares</th>
                <th className="text-right">Engagement</th>
              </tr></thead>
              <tbody>
                <tr>
                  <td className="font-medium">{report.bestPost.title || "Untitled"}</td>
                  <td>{report.bestPost.authorName}</td>
                  <td className="text-right tabular-nums">{report.bestPost.likes.toLocaleString()}</td>
                  <td className="text-right tabular-nums">{report.bestPost.comments.toLocaleString()}</td>
                  <td className="text-right tabular-nums">{report.bestPost.shares.toLocaleString()}</td>
                  <td className="text-right tabular-nums font-semibold">{report.bestPost.engagement.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </PrintSection>
        )}

        {/* === Footer === */}
        <div className="report-footer-company">
          {company.logo ? (
            <img src={company.logo} alt={company.name || "Company"} className="report-footer-logo" />
          ) : null}
          <div className="report-footer-company-info">
            <div className="report-footer-company-name">{company.name || "SYNQUE"}</div>
            {companyLine && <div className="report-footer-company-line">{companyLine}</div>}
            {contactLine && <div className="report-footer-company-contact">{contactLine}</div>}
          </div>
          <div className="report-footer-meta">
            <div>Generated on {now}</div>
            <div>{title}</div>
            <div className="report-footer-confidential">Confidential — for internal use only</div>
          </div>
        </div>
      </div>
    </div>
  );
}
