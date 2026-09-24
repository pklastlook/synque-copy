"use client";

import * as React from "react";
import {
  FileText, Download, Plus, Pencil, Copy, Trash2, Play, Clock,
  Calendar, BarChart3, Users, TrendingUp, Eye, Heart, Share2,
  RefreshCw, Printer, ChevronRight, Crosshair, type LucideIcon,
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

// ============ Main view ============

export function ReportsView() {
  const { data: reports, loading, reload } = useApi<ReportData[]>("/api/reports");
  const { data: analytics } = useApi<AnalyticsData>("/api/analytics?days=30&accountId=all");
  const { data: accounts } = useApi<Account[]>("/api/accounts");

  const [showCreate, setShowCreate] = React.useState(false);
  const [previewReport, setPreviewReport] = React.useState<ReportData | null>(null);
  const [reportName, setReportName] = React.useState("");
  const [reportType, setReportType] = React.useState("performance");
  const [reportDesc, setReportDesc] = React.useState("");

  const allReports = reports ?? [];

  async function createReport() {
    if (!reportName.trim()) {
      toast.error("Enter a report name");
      return;
    }
    try {
      const token = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
        : null;
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: reportName.trim(),
          type: reportType,
          description: reportDesc.trim() || null,
          config: JSON.stringify({ metrics: ["followers", "reach", "engagement", "posts"], dateRange: "30" }),
          createdBy: null,
        }),
      });
      if (res.ok) {
        toast.success("Report created");
        setReportName("");
        setReportDesc("");
        setShowCreate(false);
        reload();
      } else {
        toast.error("Failed to create report");
      }
    } catch {
      toast.error("Network error");
    }
  }

  async function deleteReport(id: string) {
    if (!confirm("Delete this report?")) return;
    const token = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
      : null;
    await fetch(`/api/reports/${id}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });
    toast.success("Report deleted");
    reload();
  }

  async function duplicateReport(r: ReportData) {
    const token = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
      : null;
    await fetch("/api/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: `${r.name} (copy)`,
        type: r.type,
        description: r.description,
        config: r.config,
        createdBy: null,
      }),
    });
    toast.success("Report duplicated");
    reload();
  }

  async function generateReport(r: ReportData) {
    const token = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
      : null;
    await fetch(`/api/reports/${r.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ lastGenerated: new Date().toISOString() }),
    });
    toast.success("Report generated", { description: "Last generated timestamp updated." });
    reload();
  }

  async function downloadPDF(r: ReportData) {
    try {
      const token = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
        : null;
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

  function printReport(r: ReportData) {
    setPreviewReport(r);
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
        <strong className="text-foreground">Reports</strong> — create professional, printable reports with real analytics data.
        Generate PDFs or print directly with letter-size formatting.
      </HelpText>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Reports</h2>
          <p className="text-[12px] text-muted-foreground">{allReports.length} reports · Professional letter-size format</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> New Report
        </button>
      </div>

      {/* Report cards */}
      {allReports.length === 0 ? (
        <GlassCard className="p-10">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">No reports yet</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Create your first report to generate professional analytics PDFs</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="liquid-pill rounded-lg px-4 py-2 text-xs font-semibold">
              Create report
            </button>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allReports.map((r, i) => (
            <ReportCard
              key={r.id}
              report={r}
              onPreview={() => setPreviewReport(r)}
              onPrint={() => printReport(r)}
              onPDF={() => downloadPDF(r)}
              onGenerate={() => generateReport(r)}
              onDelete={() => deleteReport(r.id)}
              onDuplicate={() => duplicateReport(r)}
              delay={i * 0.04}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create new report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Report name</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g. Monthly Performance Report"
                className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-full rounded-lg bg-background/60 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">Performance Report</SelectItem>
                  <SelectItem value="audience">Audience Report</SelectItem>
                  <SelectItem value="campaign">Campaign Report</SelectItem>
                  <SelectItem value="competitor">Competitor Report</SelectItem>
                  <SelectItem value="custom">Custom Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Description (optional)</label>
              <textarea
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                placeholder="Brief description of what this report covers..."
                rows={2}
                className="w-full resize-none rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted">
                Cancel
              </button>
              <button onClick={createReport} className="liquid-pill rounded-lg px-4 py-1.5 text-xs font-semibold">
                Create report
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print preview (hidden on screen, visible on print) */}
      {previewReport && analytics && (
        <PrintPreview report={previewReport} analytics={analytics} accounts={accounts ?? []} />
      )}
    </div>
  );
}

// ============ Report Card ============
function ReportCard({
  report, onPreview, onPrint, onPDF, onGenerate, onDelete, onDuplicate, delay,
}: {
  report: ReportData;
  onPreview: () => void;
  onPrint: () => void;
  onPDF: () => void;
  onGenerate: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  delay: number;
}) {
  const typeIcons: Record<string, LucideIcon> = {
    performance: BarChart3, audience: Users, campaign: TrendingUp,
    competitor: Crosshair, custom: FileText,
  };
  const TypeIcon = typeIcons[report.type] ?? FileText;

  return (
    <div
      className="crystal-in glass group flex flex-col rounded-2xl border border-border/40 p-4 transition hover:lift-hover"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <TypeIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{report.name}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{report.type}</div>
        </div>
      </div>

      {/* Description */}
      {report.description && (
        <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{report.description}</p>
      )}

      {/* Meta */}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <Calendar className="h-3 w-3" />
        {report.lastGenerated ? `Generated ${timeAgo(report.lastGenerated)}` : "Never generated"}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-1.5">
        <button onClick={onPrint} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20" title="Print report">
          <Printer className="h-3 w-3" /> Print
        </button>
        <button onClick={onPDF} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary transition hover:bg-primary/20" title="Download PDF">
          <Download className="h-3 w-3" /> PDF
        </button>
        <button onClick={onGenerate} className="grid h-7 w-7 place-items-center rounded-lg border border-border/50 text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Generate">
          <Play className="h-3 w-3" />
        </button>
        <button onClick={onDuplicate} className="grid h-7 w-7 place-items-center rounded-lg border border-border/50 text-muted-foreground transition hover:bg-muted hover:text-foreground" title="Duplicate">
          <Copy className="h-3 w-3" />
        </button>
        <button onClick={onDelete} className="grid h-7 w-7 place-items-center rounded-lg border border-border/50 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500" title="Delete">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ============ Print Preview — professional letter-size layout ============
function PrintPreview({
  report, analytics, accounts,
}: {
  report: ReportData;
  analytics: AnalyticsData;
  accounts: Account[];
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

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="report-print-root hidden print:block">
      {/* === PAGE HEADER (repeats on each page via thead) === */}
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
              {/* === REPORT CONTENT === */}
              <div className="report-content">
                {/* Description */}
                {report.description && (
                  <p className="report-description">{report.description}</p>
                )}

                {/* Executive Summary */}
                <h2 className="report-section-title">Executive Summary</h2>
                <p className="report-text">
                  This report covers the last 30 days of social media performance across
                  {" "}{analytics.perAccount.length} account(s) on {accounts.length} platform(s).
                  Total audience: <strong>{fmt(totals.followers)}</strong> followers,
                  {" "}<strong>{fmt(totals.impressions)}</strong> impressions,
                  {" "}<strong>{fmt(totals.reach)}</strong> reach, and
                  {" "}<strong>{fmt(totals.engagement)}</strong> total engagement.
                </p>

                {/* Key Metrics Table */}
                <h2 className="report-section-title">Key Metrics</h2>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th className="text-right">Value</th>
                    </tr>
                  </thead>
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

                {/* Per-Account Breakdown */}
                <h2 className="report-section-title">Account Breakdown</h2>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Platform</th>
                      <th className="text-right">Followers</th>
                      <th className="text-right">Impressions</th>
                      <th className="text-right">Engagement</th>
                      <th>Owner</th>
                    </tr>
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

                {/* Top Content */}
                {analytics.topContent.length > 0 && (
                  <>
                    <h2 className="report-section-title">Top Performing Content</h2>
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Title</th>
                          <th>Platform</th>
                          <th className="text-right">Engagement</th>
                          <th className="text-right">Reach</th>
                        </tr>
                      </thead>
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

                {/* Footer note */}
                <p className="report-footer-note">
                  This report was generated by SocialFlow on {dateStr}. Data covers the last 30 days
                  and is sourced from connected social media accounts.
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
          @page {
            size: letter;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          .report-print-root, .report-print-root * {
            visibility: visible;
          }
          .report-print-root {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
          .report-header-cell, .report-footer-cell {
            display: table-cell;
          }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .report-header {
            border-bottom: 2px solid #000;
            padding: 20px 40px 10px;
          }
          .report-brand {
            font-size: 18px;
            font-weight: 800;
            color: #5856D6;
          }
          .report-subtitle {
            font-size: 14px;
            font-weight: 600;
            color: #333;
          }
          .report-date {
            font-size: 11px;
            color: #666;
          }
          .report-type {
            font-size: 10px;
            color: #999;
            text-transform: uppercase;
          }
          .report-body-cell {
            padding: 20px 40px;
          }
          .report-content {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #222;
          }
          .report-description {
            font-size: 12px;
            color: #555;
            margin-bottom: 16px;
            font-style: italic;
          }
          .report-section-title {
            font-size: 14px;
            font-weight: 700;
            color: #5856D6;
            margin-top: 20px;
            margin-bottom: 8px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 4px;
          }
          .report-text {
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            margin-bottom: 12px;
          }
          .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 16px;
          }
          .report-table th {
            background: #f5f5f5;
            font-weight: 600;
            text-align: left;
            padding: 6px 10px;
            border: 1px solid #ddd;
          }
          .report-table td {
            padding: 5px 10px;
            border: 1px solid #ddd;
          }
          .report-table tbody tr:nth-child(even) {
            background: #fafafa;
          }
          .report-footer-note {
            font-size: 10px;
            color: #999;
            margin-top: 24px;
            font-style: italic;
          }
          .report-footer {
            border-top: 2px solid #000;
            padding: 10px 40px;
            font-size: 10px;
            color: #666;
          }
          .page-number:after {
            content: counter(page);
          }
        }
      `}</style>
    </div>
  );
}
