"use client";

import * as React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  FileText, Download, Plus, Trash2, Eye, Printer, ChevronRight,
  Calendar, BarChart3, Users, TrendingUp, Heart, FileBarChart,
  Clock, RefreshCw, Loader2, type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";

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
interface ReportData {
  id: string; name: string; type: string; description: string | null;
  config: string; schedule: string | null; createdBy: string | null;
  lastGenerated: string | null; createdAt: string;
}

const TOOLTIP_STYLE = {
  background: "var(--popover)", border: "1px solid var(--border)",
  borderRadius: 12, fontSize: 12, boxShadow: "0 8px 32px -8px rgba(0,0,0,0.2)",
};

type DateRange = "today" | "7d" | "30d" | "90d";
const DATE_RANGES: { key: DateRange; label: string; days: number }[] = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7 Days", days: 7 },
  { key: "30d", label: "30 Days", days: 30 },
  { key: "90d", label: "90 Days", days: 90 },
];

const TEMPLATES = [
  { id: "performance", name: "Performance Report", icon: TrendingUp, color: "oklch(0.55 0.2 255)", desc: "Followers, reach, engagement & top content overview" },
  { id: "audience", name: "Audience Report", icon: Users, color: "oklch(0.62 0.22 300)", desc: "Follower growth and platform distribution breakdown" },
  { id: "engagement", name: "Engagement Report", icon: Heart, color: "oklch(0.7 0.2 25)", desc: "Likes, comments, shares and saves analysis" },
  { id: "team", name: "Team Activity Report", icon: BarChart3, color: "oklch(0.74 0.18 165)", desc: "Member contributions, posting cadence and tasks" },
];

// ============ Main view ============
export function ReportsView() {
  const [dateRange, setDateRange] = React.useState<DateRange>("30d");
  const [showReport, setShowReport] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [reportTitle, setReportTitle] = React.useState("");
  const [reportType, setReportType] = React.useState("performance");
  const { data: savedReports, reload } = useApi<ReportData[]>("/api/reports");

  const days = DATE_RANGES.find(d => d.key === dateRange)?.days ?? 30;
  const analyticsUrl = `/api/analytics?days=${days}&accountId=all`;
  const { data: analytics, loading: analyticsLoading } = useApi<AnalyticsData>(analyticsUrl);

  function getToken(): string | null {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  async function generateReport(templateId: string) {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setGenerating(true);
    setReportType(templateId);
    const title = `${template.name} — ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    setReportTitle(title);

    try {
      const token = getToken();
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: title,
          type: templateId,
          description: `${DATE_RANGES.find(d => d.key === dateRange)?.label} · Last ${days} days`,
          config: JSON.stringify({ days, range: dateRange }),
          createdBy: null,
        }),
      });
      if (res.ok) {
        toast.success("Report generated", { description: "Scroll down to view the full report" });
        setShowReport(true);
        reload();
      } else {
        toast.error("Failed to generate report");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPDF(r: ReportData) {
    try {
      const token = getToken();
      const res = await fetch(`/api/reports/${r.id}/pdf`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
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
    if (!confirm("Delete this report?")) return;
    const token = getToken();
    await fetch(`/api/reports/${id}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });
    toast.success("Report deleted");
    reload();
  }

  function printReport() {
    setTimeout(() => window.print(), 300);
  }

  const allReports = savedReports ?? [];

  // Calculate totals
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
    <div className="space-y-5">
      <HelpText module="reports">
        <strong className="text-foreground">Reports</strong> — select a date range, click a template to generate,
        then view, print, or download as PDF.
      </HelpText>

      {/* === Header + Date Range === */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reports</h2>
          <p className="text-[12px] text-muted-foreground">{allReports.length} saved · {analytics?.perAccount.length ?? 0} accounts</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1">
          {DATE_RANGES.map(d => (
            <button
              key={d.key}
              onClick={() => setDateRange(d.key)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                dateRange === d.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* === Quick Templates === */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map((t, i) => (
          <button
            key={t.id}
            onClick={() => generateReport(t.id)}
            disabled={generating}
            className="crystal-in glass group flex flex-col rounded-2xl border border-border/40 p-4 text-left transition hover:lift-hover disabled:opacity-50"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: `${t.color}14`, color: t.color }}>
              <t.icon className="h-6 w-6" />
            </div>
            <div className="mt-3 text-sm font-bold">{t.name}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{t.desc}</div>
            <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
              {generating && reportType === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              {generating && reportType === t.id ? "Generating…" : "Generate now"}
            </div>
          </button>
        ))}
      </div>

      {/* === Report Preview === */}
      {showReport && analytics && !analyticsLoading && (
        <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.2s" }}>
          <SectionTitle
            title={reportTitle}
            desc={`${DATE_RANGES.find(d => d.key === dateRange)?.label} report · ${analytics.perAccount.length} accounts · Generated ${new Date().toLocaleString()}`}
            action={
              <div className="flex items-center gap-2">
                <button onClick={printReport} className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button onClick={() => downloadPDF({ id: allReports[0]?.id ?? "", name: reportTitle, type: reportType, description: "", config: "", schedule: null, createdBy: null, lastGenerated: new Date().toISOString(), createdAt: new Date().toISOString() })} className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20">
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
              </div>
            }
          />

          {/* KPI Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ReportKPI label="Followers" value={fmt(totals.followers)} icon={<Users className="h-4 w-4" />} color="oklch(0.55 0.2 255)" />
            <ReportKPI label="Impressions" value={fmt(totals.impressions)} icon={<Eye className="h-4 w-4" />} color="oklch(0.62 0.22 300)" />
            <ReportKPI label="Engagement" value={fmt(totals.engagement)} icon={<Heart className="h-4 w-4" />} color="oklch(0.7 0.2 25)" />
            <ReportKPI label="Posts" value={totals.posts.toString()} icon={<FileText className="h-4 w-4" />} color="oklch(0.74 0.18 165)" />
          </div>

          {/* Charts */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Growth chart */}
            <div className="rounded-2xl border border-border/30 bg-muted/10 p-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Follower Growth</div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.series}>
                    <defs>
                      <linearGradient id="rptFol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" })} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="followers" stroke="var(--primary)" strokeWidth={2} fill="url(#rptFol)" isAnimationActive />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Engagement breakdown */}
            <div className="rounded-2xl border border-border/30 bg-muted/10 p-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Engagement Breakdown</div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Likes", value: totals.likes, fill: "var(--primary)" },
                    { name: "Comments", value: totals.comments, fill: "oklch(0.74 0.18 165)" },
                    { name: "Shares", value: totals.shares, fill: "oklch(0.66 0.22 305)" },
                    { name: "Saves", value: totals.saves, fill: "oklch(0.78 0.18 75)" },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Account Breakdown Table */}
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Account Breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="py-2 pr-3 text-left font-semibold text-muted-foreground">Account</th>
                    <th className="px-3 text-right font-semibold text-muted-foreground">Followers</th>
                    <th className="px-3 text-right font-semibold text-muted-foreground">Impressions</th>
                    <th className="px-3 text-right font-semibold text-muted-foreground">Engagement</th>
                    <th className="px-3 text-right font-semibold text-muted-foreground">Posts</th>
                    <th className="px-3 text-left font-semibold text-muted-foreground">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.perAccount.map(a => (
                    <tr key={a.id} className="border-b border-border/20">
                      <td className="py-2 pr-3">
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
          </div>

          {/* Top Content */}
          {analytics.topContent.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Top Performing Content</div>
              <div className="space-y-2">
                {analytics.topContent.slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/10 p-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground">{c.handle} · {c.authorName}</div>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-right"><span className="font-bold">{fmt(c.engagement)}</span> eng</span>
                      <span className="text-right"><span className="font-bold">{fmt(c.reach)}</span> reach</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* === Saved Reports === */}
      {allReports.length > 0 && (
        <div>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Saved Reports</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allReports.map((r, i) => {
              const template = TEMPLATES.find(t => t.id === r.type);
              const TemplateIcon = template?.icon ?? FileText;
              return (
                <div key={r.id} className="crystal-in glass flex flex-col rounded-2xl border border-border/40 p-3" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="flex items-start gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <TemplateIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold">{r.name}</div>
                      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{r.type}</div>
                    </div>
                  </div>
                  {r.description && <p className="mt-1.5 text-[10px] text-muted-foreground">{r.description}</p>}
                  <div className="mt-1.5 flex items-center gap-1 text-[9px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {r.lastGenerated ? timeAgo(r.lastGenerated) : "Never"}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <button onClick={() => { setReportTitle(r.name); setReportType(r.type); setShowReport(true); }} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[9px] font-semibold text-primary transition hover:bg-primary/20">
                      <Eye className="h-2.5 w-2.5" /> View
                    </button>
                    <button onClick={() => downloadPDF(r)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[9px] font-semibold text-primary transition hover:bg-primary/20">
                      <Download className="h-2.5 w-2.5" /> PDF
                    </button>
                    <button onClick={() => deleteReport(r.id)} className="ml-auto grid h-6 w-6 place-items-center rounded-lg border border-border/50 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === Print Layout (hidden on screen, visible on print) === */}
      <PrintLayout
        title={reportTitle}
        dateRange={DATE_RANGES.find(d => d.key === dateRange)?.label ?? "30 Days"}
        analytics={analytics}
        totals={totals}
      />
    </div>
  );
}

// ============ Helper components ============
function ReportKPI({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-border/30 bg-muted/10 p-3">
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="num-display mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function PrintLayout({ title, dateRange, analytics, totals }: {
  title: string; dateRange: string; analytics: AnalyticsData | null;
  totals: { followers: number; impressions: number; reach: number; engagement: number; posts: number; likes: number; comments: number; shares: number; saves: number };
}) {
  if (!analytics) return null;
  const now = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

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
                <div className="report-type">{dateRange} Report</div>
              </div>
            </div>
          </div>
        </td></tr></thead>
        <tbody><tr><td className="report-body-cell">
          <div className="report-content">
            <h2 className="report-section-title">Executive Summary</h2>
            <p className="report-text">
              This {dateRange.toLowerCase()} report covers {analytics.perAccount.length} account(s). Total audience:
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
                        <td className="max-w-[200px] truncate">{c.title}</td>
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
