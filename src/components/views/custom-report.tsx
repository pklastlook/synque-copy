"use client";

import * as React from "react";
import {
  Search, Filter, Download, Printer, Loader2, Calendar, Users, AtSign,
  Globe, TrendingUp, MessageCircle, Heart, Share2, Eye, Target, Zap,
  CheckCircle2, Clock, XCircle, FileText, BarChart3, type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { SectionHeader, MetricRow, Pill, ListRow, type Metric } from "@/components/glass/dense-ui";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
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
    sentiment: { positive: number; neutral: number; negative: number };
    platformBreakdown: { platform: string; posts: number; engagement: number; followers: number }[];
    activeAccounts: number;
  };
  series: {
    date: string; postsCreated: number; published: number; comments: number;
    shares: number; likes: number; engagement: number; followers: number;
    reach: number; impressions: number;
  }[];
  posts: {
    id: string; title: string; caption: string; status: string;
    authorName: string; authorAvatar: string | null; createdAt: string;
    scheduledAt: string | null; platforms: string[]; engagement: number;
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

// ============ Main View ============

export function CustomReportView() {
  // Filter state
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
  const [report, setReport] = React.useState<CustomReportData | null>(null);
  const [loading, setLoading] = React.useState(false);

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
        }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      setReport(data);
      toast.success("Custom report generated", {
        description: `${data.summary.totalPosts} posts · ${data.summary.totalComments} comments · ${data.summary.totalEngagement} engagement`,
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

  function printReport() {
    const originalTitle = document.title;
    const reportName = `Custom Report — ${startDate} to ${endDate}`;
    document.title = reportName;
    setTimeout(() => {
      window.print();
      window.addEventListener("afterprint", () => { document.title = originalTitle; }, { once: true });
      setTimeout(() => { document.title = originalTitle; }, 5000);
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
    rows.push([]);

    // Daily series
    rows.push(["Daily Breakdown"]);
    rows.push(["Date", "Posts", "Published", "Comments", "Shares", "Likes", "Engagement", "Followers", "Reach"]);
    for (const d of report.series) {
      rows.push([d.date, d.postsCreated.toString(), d.published.toString(), d.comments.toString(), d.shares.toString(), d.likes.toString(), d.engagement.toString(), d.followers.toString(), d.reach.toString()]);
    }
    rows.push([]);

    // Posts
    if (report.posts.length > 0) {
      rows.push(["Post Details"]);
      rows.push(["Title", "Author", "Status", "Platforms", "Engagement", "Created"]);
      for (const p of report.posts) {
        rows.push([p.title || "Untitled", p.authorName, p.status, p.platforms.join(", "), p.engagement.toString(), p.createdAt]);
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

  // Build metrics for display
  const metrics: Metric[] = report ? [
    ...(selectedMetrics.includes("posts") ? [{ label: "Total Posts", value: fmt(report.summary.totalPosts), spark: report.series.map(s => s.postsCreated), color: "oklch(0.74 0.18 165)" }] : []),
    ...(selectedMetrics.includes("published") ? [{ label: "Published", value: fmt(report.summary.publishedPosts), spark: report.series.map(s => s.published), color: "oklch(0.68 0.2 145)" }] : []),
    ...(selectedMetrics.includes("comments") ? [{ label: "Comments", value: fmt(report.summary.totalComments), spark: report.series.map(s => s.comments), color: "oklch(0.7 0.2 25)" }] : []),
    ...(selectedMetrics.includes("shares") ? [{ label: "Shares", value: fmt(report.summary.totalShares), spark: report.series.map(s => s.shares), color: "oklch(0.72 0.18 75)" }] : []),
    ...(selectedMetrics.includes("likes") ? [{ label: "Likes", value: fmt(report.summary.totalLikes), spark: report.series.map(s => s.likes), color: "oklch(0.65 0.22 15)" }] : []),
    ...(selectedMetrics.includes("engagement") ? [{ label: "Engagement", value: fmt(report.summary.totalEngagement), spark: report.series.map(s => s.engagement), color: "oklch(0.7 0.2 305)" }] : []),
  ] : [];

  const STATUS_META: Record<string, { label: string; color: "green" | "amber" | "blue" | "rose" }> = {
    published: { label: "Published", color: "green" },
    scheduled: { label: "Scheduled", color: "blue" },
    draft: { label: "Draft", color: "amber" },
    failed: { label: "Failed", color: "rose" },
  };

  return (
    <div className="space-y-4">
      {/* === Filter Panel === */}
      <div className="glass rounded-xl p-5 space-y-4">
        <SectionHeader
          title="Custom Report Builder"
          desc="Filter by member, account, platform, date range, and metrics"
          icon={Filter}
          action={
            <div className="flex items-center gap-2">
              {report && (
                <>
                  <button
                    onClick={downloadCSV}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-500/20"
                  >
                    <Download className="h-3 w-3" /> CSV
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

        {/* Filter row 2: Date range */}
        <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="report-print-root space-y-4">
          {/* KPI Strip */}
          {metrics.length > 0 && <MetricRow metrics={metrics} />}

          {/* Trend Chart */}
          {report.series.length > 0 && (
            <div className="glass rounded-xl p-4">
              <SectionHeader title="Activity Trend" desc={`${report.series.length} data points`} icon={TrendingUp} />
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

          {/* Member Breakdown */}
          {report.members.length > 0 && (
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
          )}

          {/* Post Details */}
          {report.posts.length > 0 && (
            <div className="glass rounded-xl p-4">
              <SectionHeader title={`Post Details (${report.posts.length})`} icon={FileText} />
              <div className="max-h-96 space-y-2 overflow-y-auto scroll-liquid">
                {report.posts.map((p) => {
                  const sm = STATUS_META[p.status] ?? STATUS_META.draft;
                  return (
                    <div key={p.id} className="rounded-lg border border-border/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{p.title || "Untitled"}</div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">{p.caption || "—"}</div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{p.authorName}</span>
                            <span>·</span>
                            <span>{timeAgo(p.createdAt)}</span>
                          </div>
                        </div>
                        <Pill color={sm.color}>{sm.label}</Pill>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <div className="flex gap-1">
                          {p.platforms.map((pl) => <PlatformBadge key={pl} platform={pl as any} size={14} />)}
                        </div>
                        <span className="ml-auto font-semibold tabular-nums">{fmt(p.engagement)} engagement</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comment Details */}
          {report.comments.length > 0 && (
            <div className="glass rounded-xl p-4">
              <SectionHeader title={`Comment Details (${report.comments.length})`} icon={MessageCircle} />
              <div className="max-h-96 space-y-2 overflow-y-auto scroll-liquid">
                {report.comments.map((c) => (
                  <div key={c.id} className="rounded-lg border border-border/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold">{c.author}</div>
                        <p className="mt-1 text-xs text-muted-foreground">{c.text}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <PlatformBadge platform={c.platform as any} size={12} />
                          <span>{c.accountName}</span>
                          <span>·</span>
                          <span>{timeAgo(c.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Pill color={c.sentiment === "positive" ? "green" : c.sentiment === "negative" ? "rose" : "neutral"}>
                          {c.sentiment}
                        </Pill>
                        {c.replied && <Pill color="blue">Replied</Pill>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Print Layout */}
          <div className="hidden print:block">
            {/* Print-only content uses the same data via CSS */}
          </div>
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
            Filter by team member, social account, platform, date range, and choose which metrics to include.
          </p>
        </div>
      )}
    </div>
  );
}
