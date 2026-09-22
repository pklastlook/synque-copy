"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useApi, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Approval {
  id: string;
  postId: string | null;
  title: string;
  authorId: string;
  authorName: string;
  authorColor: string | null;
  approverId: string | null;
  approverName: string | null;
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
  role: "admin" | "member";
  title: string | null;
  color: string | null;
  accountsCount: number;
  postsCount: number;
}

type Priority = Approval["priority"];
type Status = Approval["status"];

const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const PRIORITY_COLOR: Record<Priority, string> = {
  urgent: "var(--primary)",
  high: "oklch(0.78 0.18 75)",
  normal: "oklch(0.74 0.18 165)",
  low: "var(--muted-foreground)",
};

const PRIORITY_PILL: Record<Priority, string> = {
  urgent: "bg-primary/15 text-primary",
  high: "bg-[oklch(0.78_0.18_75)]/15 text-[oklch(0.62_0.18_65)]",
  normal: "bg-[oklch(0.74_0.18_165)]/15 text-[oklch(0.55_0.16_165)]",
  low: "bg-muted text-muted-foreground",
};

const STATUS_META: Record<
  Status,
  { label: string; className: string }
> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  approved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  changes_requested:
    "bg-[oklch(0.66_0.22_305)]/15 text-[oklch(0.5_0.2_305)]",
};

const STACK_COLORS: Record<Status, string> = {
  approved: "oklch(0.76 0.18 145)",
  rejected: "var(--primary)",
  changes_requested: "oklch(0.66 0.22 305)",
  pending: "oklch(0.78 0.18 75)",
};

export function ApprovalsView() {
  const { data, loading, reload } = useApi<Approval[]>("/api/approvals");
  const { data: team } = useApi<TeamMember[]>("/api/team");
  const [requestOpen, setRequestOpen] = React.useState(false);

  if (loading || !data) return <ApprovalsSkeleton />;

  const pending = data
    .filter((a) => a.status === "pending")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  const resolved = data
    .filter((a) => a.status !== "pending")
    .sort(
      (a, b) =>
        new Date(b.resolvedAt ?? b.createdAt).getTime() -
        new Date(a.resolvedAt ?? a.createdAt).getTime(),
    );

  const counts = {
    pending: data.filter((a) => a.status === "pending").length,
    approved: data.filter((a) => a.status === "approved").length,
    rejected: data.filter((a) => a.status === "rejected").length,
    changes_requested: data.filter((a) => a.status === "changes_requested").length,
  };
  const total = data.length || 1;
  const stack: { key: Status; label: string; value: number; color: string }[] = [
    { key: "approved", label: "Approved", value: counts.approved, color: STACK_COLORS.approved },
    { key: "changes_requested", label: "Changes", value: counts.changes_requested, color: STACK_COLORS.changes_requested },
    { key: "rejected", label: "Rejected", value: counts.rejected, color: STACK_COLORS.rejected },
    { key: "pending", label: "Pending", value: counts.pending, color: STACK_COLORS.pending },
  ];

  const onPatch = async (id: string, status: Status, comment?: string) => {
    try {
      const res = await fetch("/api/approvals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, comment: comment ?? null }),
      });
      if (!res.ok) throw new Error("Patch failed");
      toast.success(
        status === "approved"
          ? "Approved"
          : status === "rejected"
            ? "Rejected"
            : "Changes requested",
      );
      reload();
    } catch {
      toast.error("Could not update approval");
    }
  };

  return (
    <div className="animate-rise space-y-5">
      {/* Hero */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Workflow · Approval queue
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Approvals
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Every post your team schedules can be routed for a second set of
              eyes. Request approval, leave a comment, and resolve to{" "}
              <span className="font-medium text-foreground">approve</span>,{" "}
              <span className="font-medium text-foreground">reject</span>, or{" "}
              <span className="font-medium text-foreground">request changes</span>.
            </p>
          </div>
          <button
            onClick={() => setRequestOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            Request approval
          </button>
        </div>
      </GlassCard>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request approval</DialogTitle>
            <DialogDescription>
              Route a draft post to a teammate for review before publishing.
            </DialogDescription>
          </DialogHeader>
          <RequestForm
            members={team ?? []}
            onCancel={() => setRequestOpen(false)}
            onSubmit={() => {
              toast.success("Approval requested");
              setRequestOpen(false);
              reload();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Pending"
          value={counts.pending}
          icon={<Clock className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint="awaiting review"
        />
        <KpiCard
          label="Approved"
          value={counts.approved}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="oklch(0.76 0.18 145)"
          hint="ready to publish"
        />
        <KpiCard
          label="Rejected"
          value={counts.rejected}
          icon={<XCircle className="h-5 w-5" />}
          accent="var(--primary)"
          hint="needs revision"
        />
        <KpiCard
          label="Changes requested"
          value={counts.changes_requested}
          icon={<RefreshCw className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="awaiting author"
        />
      </div>

      {/* Stats bar */}
      <GlassCard className="p-5">
        <SectionTitle
          title="Resolution ratio"
          desc="Breakdown of all approval decisions across the workspace"
        />
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted/60">
          {stack.map((s) => (
            <div
              key={s.key}
              className="h-full transition-all"
              style={{
                width: `${(s.value / total) * 100}%`,
                background: s.color,
              }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          {stack.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
              <span className="font-semibold text-foreground">{s.value}</span>
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Two-column queue + history */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="flex flex-col p-5">
          <SectionTitle
            title="Pending queue"
            desc={`${pending.length} awaiting decision · sorted by priority`}
            action={
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                {pending.length} open
              </span>
            }
          />
          <div className="max-h-[640px] space-y-3 overflow-y-auto scroll-liquid pr-1">
            {pending.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-5 w-5" />}
                title="All caught up"
                desc="No pending approvals right now."
              />
            ) : (
              pending.map((a) => (
                <PendingCard key={a.id} approval={a} onResolve={onPatch} />
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col p-5">
          <SectionTitle
            title="History"
            desc="Recently resolved approvals"
            action={
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {resolved.length} resolved
              </span>
            }
          />
          <div className="max-h-[640px] space-y-3 overflow-y-auto scroll-liquid pr-1">
            {resolved.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-5 w-5" />}
                title="No history yet"
                desc="Resolved approvals will show up here."
              />
            ) : (
              resolved.map((a) => <ResolvedCard key={a.id} approval={a} />)
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function RequestForm({
  members,
  onCancel,
  onSubmit,
}: {
  members: TeamMember[];
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [authorId, setAuthorId] = React.useState(members[0]?.id ?? "");
  const [approverId, setApproverId] = React.useState(
    members.find((m) => m.role === "admin")?.id ?? members[0]?.id ?? "",
  );
  const [priority, setPriority] = React.useState<Priority>("normal");
  const [dueAt, setDueAt] = React.useState("");

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="ap-title">Post title</Label>
        <Input
          id="ap-title"
          placeholder="e.g. Q4 launch announcement"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Author</Label>
          <Select value={authorId} onValueChange={setAuthorId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select author" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Approver</Label>
          <Select value={approverId} onValueChange={setApproverId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select approver" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as Priority)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ap-due">Due date</Label>
          <Input
            id="ap-due"
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <button
          onClick={onSubmit}
          className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
        >
          <Send className="h-4 w-4" />
          Send request
        </button>
      </DialogFooter>
    </div>
  );
}

function PendingCard({
  approval,
  onResolve,
}: {
  approval: Approval;
  onResolve: (id: string, status: Status, comment?: string) => void;
}) {
  const [action, setAction] = React.useState<null | Status>(null);
  const [comment, setComment] = React.useState("");

  const overdue =
    approval.dueAt && new Date(approval.dueAt).getTime() < Date.now();

  const submit = () => {
    onResolve(approval.id, action ?? "approved", comment.trim() || undefined);
    setAction(null);
    setComment("");
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/40 bg-background/40 p-3 pl-4 transition hover:bg-muted/30",
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: PRIORITY_COLOR[approval.priority] }}
      />
      <div className="flex items-start gap-3">
        <NameAvatar
          name={approval.authorName}
          color={approval.authorColor}
          className="h-9 w-9 text-[11px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {approval.title}
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                PRIORITY_PILL[approval.priority],
              )}
            >
              {approval.priority}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">
              {approval.authorName}
            </span>
            <span>·</span>
            <span>requested {timeAgo(approval.createdAt)}</span>
            {approval.dueAt && (
              <>
                <span>·</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    overdue && "font-semibold text-rose-500",
                  )}
                >
                  {overdue && <AlertTriangle className="h-3 w-3" />}
                  due {new Date(approval.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </>
            )}
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            STATUS_META[approval.status].className,
          )}
        >
          Pending
        </span>
      </div>

      {action === null ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ActionBtn
            tone="green"
            onClick={() => setAction("approved")}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            Approve
          </ActionBtn>
          <ActionBtn
            tone="amber"
            onClick={() => setAction("changes_requested")}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Request changes
          </ActionBtn>
          <ActionBtn
            tone="rose"
            onClick={() => setAction("rejected")}
            icon={<XCircle className="h-3.5 w-3.5" />}
          >
            Reject
          </ActionBtn>
        </div>
      ) : (
        <div className="mt-3 space-y-2 rounded-xl bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            {action === "approved" && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            )}
            {action === "rejected" && (
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
            )}
            {action === "changes_requested" && (
              <RefreshCw className="h-3.5 w-3.5 text-[oklch(0.66_0.22_305)]" />
            )}
            <span className="capitalize">
              {action === "changes_requested" ? "Request changes" : action}
            </span>
            <span className="text-muted-foreground">· add a comment</span>
          </div>
          <Textarea
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment for the author…"
            className="min-h-[60px] resize-none rounded-xl bg-background/60 text-sm"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-xl"
              onClick={() => {
                setAction(null);
                setComment("");
              }}
            >
              Cancel
            </Button>
            <button
              onClick={submit}
              className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              Confirm <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResolvedCard({ approval }: { approval: Approval }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-background/40 p-3 pl-4">
      <span
        className="absolute inset-y-0 left-0 w-1 opacity-70"
        style={{ background: PRIORITY_COLOR[approval.priority] }}
      />
      <div className="flex items-start gap-3">
        <NameAvatar
          name={approval.authorName}
          color={approval.authorColor}
          className="h-9 w-9 text-[11px]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {approval.title}
            </span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                PRIORITY_PILL[approval.priority],
              )}
            >
              {approval.priority}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">
              {approval.authorName}
            </span>
            <span>·</span>
            <span>
              resolved {approval.resolvedAt ? timeAgo(approval.resolvedAt) : "—"}
            </span>
            {approval.approverName && (
              <>
                <span>·</span>
                <span>by {approval.approverName}</span>
              </>
            )}
          </div>
          {approval.comment && (
            <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-[12px] text-foreground/80">
              <span className="mr-1 text-muted-foreground">“</span>
              {approval.comment}
              <span className="ml-0.5 text-muted-foreground">”</span>
            </div>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
            STATUS_META[approval.status].className,
          )}
        >
          {approval.status === "changes_requested"
            ? "changes"
            : approval.status}
        </span>
      </div>
    </div>
  );
}

function ActionBtn({
  tone,
  onClick,
  icon,
  children,
}: {
  tone: "green" | "amber" | "rose";
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "green"
      ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:text-emerald-400"
      : tone === "amber"
        ? "bg-[oklch(0.78_0.18_75)]/10 text-[oklch(0.55_0.16_65)] hover:bg-[oklch(0.78_0.18_75)] hover:text-white"
        : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
        toneCls,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}

function ApprovalsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-32 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="shimmer h-24 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="shimmer h-96 rounded-3xl" />
        <div className="shimmer h-96 rounded-3xl" />
      </div>
    </div>
  );
}
