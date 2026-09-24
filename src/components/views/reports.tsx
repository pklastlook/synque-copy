"use client";

import * as React from "react";
import {
  FileText, Download, Plus, Trash2, Play, Clock,
  Calendar, BarChart3, Users, TrendingUp, Eye, Heart, Share2,
  Printer, ChevronRight, FileBarChart, User, RefreshCw, Loader2,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ============ Types ============

interface ReportData {
  id: string;
  name: string;
  type: string;
  description: string | null;
  config: string;
  schedule: string | null;
  createdBy: string | null;
  lastGenerated: string | null;
  createdAt: string;
}

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

interface Account {
  id: string; platform: string; handle: string; displayName: string; followers: number;
}

interface TeamMember {
  id: string; name: string; email: string; role: string; title: string | null;
}

type ReportPeriod = "daily" | "weekly" | "monthly" | "custom";
type ReportScope = "team" | "individual" | "account";

const PERIOD_META: Record<ReportPeriod, { label: string; days: number; icon: LucideIcon }> = {
  daily: { label: "Daily", days: 1, icon: Calendar },
  weekly: { label: "Weekly", days: 7, icon: Calendar },
  monthly: { label: "Monthly", days: 30, icon: Calendar },
  custom: { label: "Custom", days: 90, icon: Calendar },
};

const SCOPE_META: Record<ReportScope, { label: string; icon: LucideIcon }> = {
  team: { label: "Entire Team", icon: Users },
  individual: { label: "Team Member", icon: User },
  account: { label: "Specific Account", icon: BarChart3 },
};

const REPORT_TEMPLATES = [
  { id: "performance", name: "Performance Report", icon: TrendingUp, desc: "Followers, reach, engagement, top content" },
  { id: "audience", name: "Audience Report", icon: Users, desc: "Follower growth, demographics, platform breakdown" },
  { id: "content", name: "Content Report", icon: FileText, desc: "Posts published, drafts, scheduling pipeline" },
  { id: "engagement", name: "Engagement Report", icon: Heart, desc: "Likes, comments, shares, sentiment analysis" },
  { id: "team", name: "Team Activity Report", icon: Users, desc: "Member contributions, posting cadence, tasks" },
];

// ============ Main view ============

export function ReportsView() {
  const { data: reports, loading, reload } = useApi<ReportData[]>("/api/reports");
  const { data: accounts } = useApi<Account[]>("/api/accounts");
  const { data: teamMembers } = useApi<TeamMember[]>("/api/team");

  const [showGenerator, setShowGenerator] = React.useState(false);
  const [previewReport, setPreviewReport] = React.useState<ReportData | null>(null);
  const [previewData, setPreviewData] = React.useState<AnalyticsData | null>(null);
  const [generating, setGenerating] = React.useState(false);

  // Generator state
  const [reportName, setReportName] = React.useState("");
  const [reportType, setReportType] = React.useState("performance");
  const [period, setPeriod] = React.useState<ReportPeriod>("weekly");
  const [scope, setScope] = React.useState<ReportScope>("team");
  const [selectedMemberId, setSelectedMemberId] = React.useState<string>("all");
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>("all");
  const [customDays, setCustomDays] = React.useState(14);

  const allReports = reports ?? [];

  function getToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
    } catch { return null; }
  }

  async function generateReport() {
    if (!reportName.trim()) {
      toast.error("Enter a report name");
      return;
    }
    setGenerating(true);
    try {
      const token = getToken();
      const days = period === "custom" ? customDays : PERIOD_META[period].days;
      const config = JSON.stringify({
        period, scope, days,
        memberId: scope === "individual" ? selectedMemberId : null,
        accountId: scope === "account" ? selectedAccountId : null,
      });

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: reportName.trim(),
          type: reportType,
          description: `${PERIOD_META[period].label} · ${SCOPE_META[scope].label} · Last ${days} days`,
          config,
          createdBy: null,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        toast.success("Report generated");

        // Fetch analytics data for preview
        const analyticsRes = await fetch(`/api/analytics?days=${days}&accountId=all`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        });
        const analyticsJson = await analyticsRes.json();
        setPreviewData(analyticsJson);
        setPreviewReport({
          id: json.id,
          name: reportName.trim(),
          type: reportType,
          description: `${PERIOD_META[period].label} · ${SCOPE_META[scope].label} · Last ${days} days`,
          config, schedule: null, createdBy: null,
          lastGenerated: new Date().toISOString(), createdAt: new Date().toISOString(),
        });
        setShowGenerator(false);
        setReportName("");
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

  async function viewReport(r: ReportData) {
    setPreviewReport(r);
    try {
      const token = getToken();
      const config = JSON.parse(r.config);
      const days = config.days ?? 30;
      const res = await fetch(`/api/analytics?days=${days}&accountId=all`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      const json = await res.json();
      setPreviewData(json);
    } catch {
      toast.error("Failed to load report data");
    }
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report?")) return;
    const token = getToken();
    await fetch(`/api/reports/${id}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });
    toast.success("Report deleted");
    if (previewReport?.id === id) setPreviewReport(null);
    reload();
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
    } catch {
      toast.error("Failed to generate PDF");
    }
  }

  function printReport() {
    setTimeout(() => window.print(), 300);
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="shimmer h-20 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="shimmer h-40 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <HelpText module="reports">
        <strong className="text-foreground">Reports</strong> — generate professional reports by selecting a period,
        scope, and template. View, print, or download as PDF with letter-size formatting.
      </HelpText>

      {/* === Header === */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reports</h2>
          <p className="text-[12px] text-muted-foreground">{allReports.length} generated reports</p>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Generate Report
        </button>
      </div>

      {/* === Saved reports list === */}
      {allReports.length === 0 ? (
        <GlassCard className="p-10">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <FileBarChart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">No reports yet</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Generate your first report by selecting a period, scope, and template</p>
            </div>
            <button onClick={() => setShowGenerator(true)} className="liquid-pill rounded-lg px-4 py-2 text-xs font-semibold">
              Generate Report
            </button>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allReports.map((r, i) => {
            const config = JSON.parse(r.config);
            const template = REPORT_TEMPLATES.find(t => t.id === r.type);
            const TemplateIcon = template?.icon ?? FileText;
            return (
              <div
                key={r.id}
                className="crystal-in glass group flex flex-col rounded-2xl border border-border/40 p-4 transition hover:lift-hover"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <TemplateIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{r.name}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.type}</div>
                  </div>
                </div>

                {/* Meta */}
                {r.description && (
                  <p className="mt-2 text-[11px] text-muted-foreground">{r.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {r.lastGenerated ? `Generated ${timeAgo(r.lastGenerated)}` : "Never generated"}
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-1.5">
                  <button onClick={() => viewReport(r)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20">
                    <Eye className="h-3 w-3" /> View
                  </button>
                  <button onClick={() => downloadPDF(r)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20">
                    <Download className="h-3 w-3" /> PDF
                  </button>
                  <button onClick={printReport} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20">
                    <Printer className="h-3 w-3" /> Print
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => deleteReport(r.id)} className="grid h-7 w-7 place-items-center rounded-lg border border-border/50 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500" title="Delete">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* === Report Generator Dialog === */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto scroll-liquid pr-2">
            {/* Step 1: Report name */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Report name
              </label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g. Weekly Performance — Sep 2026"
                className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
                autoFocus
              />
            </div>

            {/* Step 2: Template */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Report template
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {REPORT_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setReportType(t.id)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-3 text-left transition",
                      reportType === t.id ? "border-primary/50 bg-primary/5" : "border-border/40 hover:bg-muted/40"
                    )}
                  >
                    <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", reportType === t.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      <t.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Period */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Period
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PERIOD_META) as ReportPeriod[]).map((p) => {
                  const PeriodIcon = PERIOD_META[p].icon;
                  return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition",
                      period === p ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <PeriodIcon className="h-3.5 w-3.5" />
                    {PERIOD_META[p].label}
                  </button>
                  );
                })}
              </div>
              {period === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Last</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={(e) => setCustomDays(parseInt(e.target.value) || 14)}
                    className="w-16 rounded-lg border border-border/50 bg-background/60 px-2 py-1 text-xs text-center outline-none focus:border-primary/50"
                  />
                  <span className="text-[11px] text-muted-foreground">days</span>
                </div>
              )}
            </div>

            {/* Step 4: Scope */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Scope
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SCOPE_META) as ReportScope[]).map((s) => {
                  const ScopeIcon = SCOPE_META[s].icon;
                  return (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition",
                      scope === s ? "border-primary/50 bg-primary/10 text-primary" : "border-border/40 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <ScopeIcon className="h-3.5 w-3.5" />
                    {SCOPE_META[s].label}
                  </button>
                  );
                })}
              </div>

              {/* Conditional selectors */}
              {scope === "individual" && teamMembers && (
                <div className="mt-2">
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger className="w-full rounded-lg bg-background/60 text-sm">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All members</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name} — {m.title ?? m.role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scope === "account" && accounts && (
                <div className="mt-2">
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="w-full rounded-lg bg-background/60 text-sm">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All accounts</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.displayName} · {a.handle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Summary preview */}
            <div className="rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Summary:</strong> {reportType} report · {PERIOD_META[period].label} period
              {period === "custom" ? ` (${customDays} days)` : ""}
              {" · "} {SCOPE_META[scope].label}
              {scope === "individual" && selectedMemberId !== "all" ? ` (${teamMembers?.find(m => m.id === selectedMemberId)?.name ?? ""})` : ""}
              {scope === "account" && selectedAccountId !== "all" ? ` (${accounts?.find(a => a.id === selectedAccountId)?.displayName ?? ""})` : ""}
            </div>

            {/* Generate */}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowGenerator(false)} className="rounded-lg border border-border/50 px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted">
                Cancel
              </button>
              <button onClick={generateReport} disabled={generating || !reportName.trim()} className="liquid-pill flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-semibold disabled:opacity-50">
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {generating ? "Generating…" : "Generate Report"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* === Report Preview Dialog === */}
      {previewReport && previewData && (
        <ReportPreview
          report={previewReport}
          analytics={previewData}
          onClose={() => { setPreviewReport(null); setPreviewData(null); }}
          onPrint={printReport}
          onPDF={() => downloadPDF(previewReport)}
        />
      )}

      {/* === Print layout (hidden on screen, visible on print) === */}
      {previewReport && previewData && (
        <PrintLayout report={previewReport} analytics={previewData} />
      )}
    </div>
  );
}

// ============ Report Preview Dialog ============
function ReportPreview({
  report, analytics, onClose, onPrint, onPDF,
}: {
  report: ReportData;
  analytics: AnalyticsData;
  onClose: () => void;
  onPrint: () => void;
  onPDF: () => void;
}) {
  const totals = analytics.perAccount.reduce(
    (acc, a) => {
      acc.followers += a.followers;
      acc.impressions += a.impressions;
      acc.reach += a.reach;
      acc.engagement += a.engagement;
      acc.posts += a.posts;
      acc.likes += a.likes;
      acc.comments += a.comments;
      acc.shares += a.shares;
      return acc;
    },
    { followers: 0, impressions: 0, reach: 0, engagement: 0, posts: 0, likes: 0, comments: 0, shares: 0 }
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" />
            {report.name}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-3">
          <button onClick={onPDF} className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20">
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
          <button onClick={onPrint} className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20">
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto scroll-liquid space-y-4 pr-2">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PreviewKPI label="Followers" value={fmt(totals.followers)} icon={<Users className="h-4 w-4" />} />
            <PreviewKPI label="Impressions" value={fmt(totals.impressions)} icon={<Eye className="h-4 w-4" />} />
            <PreviewKPI label="Engagement" value={fmt(totals.engagement)} icon={<Heart className="h-4 w-4" />} />
            <PreviewKPI label="Posts" value={totals.posts.toString()} icon={<FileText className="h-4 w-4" />} />
          </div>

          {/* Account breakdown */}
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Account breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="py-2 pr-3 text-left font-semibold text-muted-foreground">Account</th>
                    <th className="px-3 text-right font-semibold text-muted-foreground">Followers</th>
                    <th className="px-3 text-right font-semibold text-muted-foreground">Impressions</th>
                    <th className="px-3 text-right font-semibold text-muted-foreground">Engagement</th>
                    <th className="px-3 text-right font-semibold text-muted-foreground">Posts</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.perAccount.map((a) => (
                    <tr key={a.id} className="border-b border-border/20">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <PlatformBadge platform={a.platform as any} size={16} />
                          <span className="font-medium">{a.displayName}</span>
                        </div>
                      </td>
                      <td className="px-3 text-right tabular-nums">{a.followers.toLocaleString()}</td>
                      <td className="px-3 text-right tabular-nums">{a.impressions.toLocaleString()}</td>
                      <td className="px-3 text-right tabular-nums">{a.engagement.toLocaleString()}</td>
                      <td className="px-3 text-right tabular-nums">{a.posts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top content */}
          {analytics.topContent.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Top performing content</div>
              <div className="space-y-2">
                {analytics.topContent.slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-2.5">
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

          {/* Report info */}
          <div className="rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
            <strong className="text-foreground">{report.name}</strong>
            {report.description && <div className="mt-1">{report.description}</div>}
            <div className="mt-1">Generated: {report.lastGenerated ? new Date(report.lastGenerated).toLocaleString() : "N/A"}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewKPI({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="num-display mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

// ============ Print Layout — letter-size, hidden on screen ============
function PrintLayout({ report, analytics }: { report: ReportData; analytics: AnalyticsData }) {
  const totals = analytics.perAccount.reduce(
    (acc, a) => {
      acc.followers += a.followers;
      acc.impressions += a.impressions;
      acc.reach += a.reach;
      acc.engagement += a.engagement;
      acc.posts += a.posts;
      acc.likes += a.likes;
      acc.comments += a.comments;
      acc.shares += a.shares;
      return acc;
    },
    { followers: 0, impressions: 0, reach: 0, engagement: 0, posts: 0, likes: 0, comments: 0, shares: 0 }
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="report-print-root hidden print:block">
      <table className="w-full">
        <thead>
          <tr>
            <td className="report-header-cell">
              <div className="report-header">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="report-brand">SocialFlow</div>
                    <div className="report-subtitle">{report.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="report-date">{dateStr}</div>
                    <div className="report-type">{report.type} Report</div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="report-body-cell">
              <div className="report-content">
                {report.description && <p className="report-description">{report.description}</p>}

                <h2 className="report-section-title">Executive Summary</h2>
                <p className="report-text">
                  This report covers {analytics.perAccount.length} account(s). Total audience:
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
                    <tr><td>Posts Published</td><td className="text-right tabular-nums">{totals.posts.toLocaleString()}</td></tr>
                  </tbody>
                </table>

                <h2 className="report-section-title">Account Breakdown</h2>
                <table className="report-table">
                  <thead>
                    <tr><th>Account</th><th>Platform</th><th className="text-right">Followers</th><th className="text-right">Impressions</th><th className="text-right">Engagement</th><th>Owner</th></tr>
                  </thead>
                  <tbody>
                    {analytics.perAccount.map((a) => (
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

                <p className="report-footer-note">
                  Generated by SocialFlow on {dateStr}. Data sourced from connected social media accounts.
                </p>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="report-footer-cell">
              <div className="report-footer">
                <div className="flex items-center justify-between">
                  <span>SocialFlow — Social, Simplified.</span>
                  <span>Page <span className="page-number"></span></span>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
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
          .report-description { font-size: 12px; color: #555; margin-bottom: 16px; font-style: italic; }
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
