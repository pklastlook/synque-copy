"use client";

import * as React from "react";
import {
  CheckCircle2, XCircle, Clock, Plus, Trash2, MessageCircle,
  AlertCircle, Loader2, ListChecks, UserCheck, FileBarChart,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SectionHeader, ListRow, Pill, MetricRow, type Metric,
} from "@/components/glass/dense-ui";
import { HelpText } from "@/components/glass/help-text";
import { NameAvatar } from "@/components/glass/name-avatar";
import { useApi } from "@/lib/hooks";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ============================================================================
// Types
// ============================================================================
interface Approval {
  id: string;
  postId: string | null;
  title: string;
  authorId: string;
  approverId: string | null;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  comment: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  dueAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
  title: string | null;
  color: string | null;
}

// ============================================================================
// Helpers
// ============================================================================
const PRIORITY_COLOR: Record<Approval["priority"], "neutral" | "blue" | "amber" | "rose"> = {
  low: "neutral",
  normal: "blue",
  high: "amber",
  urgent: "rose",
};

const STATUS_META: Record<
  Approval["status"],
  { label: string; color: "amber" | "green" | "rose" | "violet"; icon: typeof Clock }
> = {
  pending: { label: "Pending", color: "amber", icon: Clock },
  approved: { label: "Approved", color: "green", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "rose", icon: XCircle },
  changes_requested: { label: "Changes Requested", color: "violet", icon: AlertCircle },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(dueAt: string | null, status: Approval["status"]): boolean {
  if (!dueAt || status === "approved" || status === "rejected") return false;
  return new Date(dueAt).getTime() < Date.now();
}

// ============================================================================
// Main view
// ============================================================================
export function ApprovalsView() {
  const { data: approvals, loading, reload } = useApi<Approval[]>("/api/approvals");
  const { data: team } = useApi<TeamMember[]>("/api/team");
  const [filter, setFilter] = React.useState<Approval["status"] | "all">("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [actingId, setActingId] = React.useState<string | null>(null);

  function getToken(): string | null {
    try {
      return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
    } catch { return null; }
  }

  async function actOnApproval(id: string, status: Approval["status"], comment?: string) {
    setActingId(id);
    try {
      const token = getToken();
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status, comment }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? `Failed to ${status}`);
        return;
      }
      const verb = status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Marked";
      toast.success(`${verb} successfully`);
      reload();
    } catch {
      toast.error("Network error");
    } finally {
      setActingId(null);
    }
  }

  async function deleteApproval(id: string) {
    if (!confirm("Delete this approval request?")) return;
    const token = getToken();
    await fetch(`/api/approvals/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    toast.success("Approval deleted");
    reload();
  }

  const allApprovals = approvals ?? [];
  const filtered = filter === "all" ? allApprovals : allApprovals.filter((a) => a.status === filter);

  // Group by status for the kanban
  const byStatus = {
    pending: filtered.filter((a) => a.status === "pending"),
    changes_requested: filtered.filter((a) => a.status === "changes_requested"),
    approved: filtered.filter((a) => a.status === "approved"),
    rejected: filtered.filter((a) => a.status === "rejected"),
  };

  // KPI metrics
  const metrics: Metric[] = React.useMemo(() => {
    const total = allApprovals.length;
    const pending = allApprovals.filter((a) => a.status === "pending").length;
    const approved = allApprovals.filter((a) => a.status === "approved").length;
    const rejected = allApprovals.filter((a) => a.status === "rejected").length;
    const changes = allApprovals.filter((a) => a.status === "changes_requested").length;
    const overdue = allApprovals.filter((a) => isOverdue(a.dueAt, a.status)).length;
    const approvalRate = approved + rejected > 0
      ? Math.round((approved / (approved + rejected)) * 100)
      : 0;
    return [
      { label: "Total", value: total, color: "oklch(0.62 0.22 300)" },
      { label: "Pending", value: pending, color: "oklch(0.72 0.18 75)" },
      { label: "Changes", value: changes, color: "oklch(0.66 0.22 305)" },
      { label: "Approved", value: approved, color: "oklch(0.7 0.2 145)" },
      { label: "Rejected", value: rejected, color: "oklch(0.55 0.22 25)" },
      { label: "Overdue", value: overdue, color: "oklch(0.65 0.22 15)" },
      { label: "Approval %", value: `${approvalRate}%`, color: "oklch(0.62 0.2 255)" },
    ];
  }, [allApprovals]);

  // Map team members by ID for name resolution
  const memberMap = React.useMemo(() => {
    const m = new Map<string, TeamMember>();
    (team ?? []).forEach((t) => m.set(t.id, t));
    return m;
  }, [team]);

  function resolveName(id: string | null): { name: string; color: string | null; avatar: string | null; title: string | null } {
    if (!id) return { name: "—", color: null, avatar: null, title: null };
    const m = memberMap.get(id);
    return m
      ? { name: m.name, color: m.color, avatar: m.avatar, title: m.title }
      : { name: id.slice(0, 8), color: null, avatar: null, title: null };
  }

  return (
    <div className="space-y-4">
      <HelpText module="approvals">
        <strong className="text-foreground">Content Approvals</strong> — submit posts for review
        before they go live. Approvers can approve, reject, or request changes. Each request tracks
        priority, due date, and resolution comments.
      </HelpText>

      <SectionHeader
        title="Content Approvals"
        icon={ListChecks}
        desc="Approval workflow: draft → pending → approved / rejected → publish"
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            className="liquid-pill h-8 gap-1.5 px-3 text-[11px] font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            New Request
          </Button>
        }
      />

      {/* KPIs */}
      <MetricRow metrics={metrics} />

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "pending", "changes_requested", "approved", "rejected"] as const).map((s) => {
          const isAll = s === "all";
          const meta = isAll ? null : STATUS_META[s];
          const count = isAll ? allApprovals.length : byStatus[s].length;
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--ring)]"
                  : "border-border/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )}
            >
              {meta && <meta.icon className="h-3 w-3" style={{ color: active ? undefined : "var(--muted-foreground)" }} />}
              {isAll ? "All" : meta!.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : allApprovals.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border/40 bg-muted/10 py-12 text-center">
          <ListChecks className="h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-xs text-muted-foreground">No approval requests yet.</p>
          <Button onClick={() => setCreateOpen(true)} className="mt-3 h-8 gap-1.5 text-[11px]">
            <Plus className="h-3.5 w-3.5" />
            Create your first request
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          {(["pending", "changes_requested", "approved", "rejected"] as const).map((status) => {
            const meta = STATUS_META[status];
            const items = byStatus[status];
            return (
              <div key={status} className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <meta.icon className="h-3.5 w-3.5" style={{ color: `var(--${meta.color === "amber" ? "amber" : meta.color === "green" ? "emerald" : meta.color === "rose" ? "rose" : "violet"}-500)` }} />
                    <span className="text-[11px] font-bold tracking-tight">{meta.label}</span>
                  </div>
                  <Pill color={meta.color}>{items.length}</Pill>
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/30 bg-muted/5 px-3 py-4 text-center text-[10px] text-muted-foreground">
                      Empty
                    </div>
                  ) : (
                    items.map((a) => (
                      <ApprovalCard
                        key={a.id}
                        approval={a}
                        author={resolveName(a.authorId)}
                        approver={resolveName(a.approverId)}
                        acting={actingId === a.id}
                        onApprove={() => actOnApproval(a.id, "approved")}
                        onReject={() => actOnApproval(a.id, "rejected")}
                        onRequestChanges={() => actOnApproval(a.id, "changes_requested")}
                        onDelete={() => deleteApproval(a.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <CreateApprovalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        team={team ?? []}
        onCreated={() => { reload(); setCreateOpen(false); }}
      />
    </div>
  );
}

// ============================================================================
// Approval card — single row inside a kanban column
// ============================================================================
function ApprovalCard({
  approval, author, approver, acting,
  onApprove, onReject, onRequestChanges, onDelete,
}: {
  approval: Approval;
  author: { name: string; color: string | null; avatar: string | null; title: string | null };
  approver: { name: string; color: string | null; avatar: string | null; title: string | null };
  acting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
  onDelete: () => void;
}) {
  const overdue = isOverdue(approval.dueAt, approval.status);
  const isPending = approval.status === "pending" || approval.status === "changes_requested";

  return (
    <div
      className={cn(
        "glass rounded-xl border p-3 transition-all",
        overdue && "border-rose-500/40 bg-rose-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-bold leading-tight">{approval.title}</h4>
        <Pill color={PRIORITY_COLOR[approval.priority]}>
          {approval.priority}
        </Pill>
      </div>

      {/* Author / Approver */}
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <NameAvatar
          name={author.name}
          color={(author.color as any) ?? "blue"}
          src={author.avatar ?? undefined}
          className="h-4 w-4 !text-[7px]"
        />
        <span>by {author.name}</span>
        {approver.name !== "—" && (
          <>
            <UserCheck className="h-2.5 w-2.5" />
            <span>→ {approver.name}</span>
          </>
        )}
      </div>

      {/* Due date */}
      {approval.dueAt && (
        <div className={cn(
          "mt-1.5 flex items-center gap-1 text-[10px]",
          overdue ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-muted-foreground"
        )}>
          <Clock className="h-2.5 w-2.5" />
          Due {new Date(approval.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {overdue && <span className="font-bold uppercase">· overdue</span>}
        </div>
      )}

      {/* Comment (if any) */}
      {approval.comment && (
        <div className="mt-2 rounded-lg bg-muted/30 p-2">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            <MessageCircle className="h-2.5 w-2.5" />
            Comment
          </div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-foreground/80">{approval.comment}</p>
        </div>
      )}

      <div className="mt-2 text-[9px] text-muted-foreground/70">{timeAgo(approval.createdAt)}</div>

      {/* Action buttons — only on pending / changes_requested */}
      {isPending && (
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            onClick={onApprove}
            disabled={acting}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[10px] font-bold text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-3 w-3" />
            Approve
          </button>
          <button
            onClick={onRequestChanges}
            disabled={acting}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-violet-500/10 px-2 py-1.5 text-[10px] font-bold text-violet-600 transition hover:bg-violet-500/20 disabled:opacity-50 dark:text-violet-400"
          >
            <AlertCircle className="h-3 w-3" />
            Changes
          </button>
          <button
            onClick={onReject}
            disabled={acting}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1.5 text-[10px] font-bold text-rose-600 transition hover:bg-rose-500/20 disabled:opacity-50 dark:text-rose-400"
          >
            <XCircle className="h-3 w-3" />
            Reject
          </button>
        </div>
      )}

      {/* Delete (always available) */}
      <button
        onClick={onDelete}
        className="mt-1.5 flex items-center gap-1 text-[9px] text-muted-foreground/60 transition hover:text-rose-600"
      >
        <Trash2 className="h-2.5 w-2.5" />
        Delete
      </button>
    </div>
  );
}

// ============================================================================
// Create approval dialog
// ============================================================================
function CreateApprovalDialog({
  open, onOpenChange, team, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  team: TeamMember[];
  onCreated: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [authorId, setAuthorId] = React.useState("");
  const [approverId, setApproverId] = React.useState("");
  const [priority, setPriority] = React.useState<"low" | "normal" | "high" | "urgent">("normal");
  const [dueAt, setDueAt] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Auto-pick the current user as author
  React.useEffect(() => {
    if (!open) return;
    try {
      const u = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.user;
      if (u?.id && !authorId) setAuthorId(u.id);
    } catch { /* ignore */ }
  }, [open, authorId]);

  function reset() {
    setTitle(""); setApproverId(""); setPriority("normal"); setDueAt(""); setComment("");
  }

  async function submit() {
    if (!title || !authorId) {
      toast.error("Title and author are required");
      return;
    }
    setSaving(true);
    try {
      const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null;
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title, authorId,
          approverId: approverId || null,
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          comment: comment || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Failed to create approval");
        return;
      }
      toast.success("Approval request created");
      reset();
      onCreated();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            New Approval Request
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Submit a post for review. Approvers can approve, reject, or request changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Black Friday Sale — IG carousel post"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Author *</Label>
              <Select value={authorId} onValueChange={setAuthorId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick author" /></SelectTrigger>
                <SelectContent>
                  {team.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} {t.title ? `· ${t.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Approver</Label>
              <Select value={approverId} onValueChange={setApproverId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {team.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} {t.title ? `· ${t.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low" className="text-xs">Low</SelectItem>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="high" className="text-xs">High</SelectItem>
                  <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Due date</Label>
              <Input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Comment (optional)</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Context for the approver…"
              className="min-h-[60px] text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-[11px]">
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !title || !authorId} className="h-8 gap-1.5 text-[11px]">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileBarChart className="h-3.5 w-3.5" />}
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
