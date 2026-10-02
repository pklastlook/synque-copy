"use client";

import * as React from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  FileBarChart,
  FileDiff,
  GitCompareArrows,
  Inbox as InboxIcon,
  ListChecks,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  SectionHeader,
  Pill,
  MetricRow,
  Sparkline,
  type Metric,
} from "@/components/glass/dense-ui";
import { GlassCard } from "@/components/glass/glass-card";
import { HelpText } from "@/components/glass/help-text";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { useApi, timeAgo } from "@/lib/hooks";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import type { Post } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ============================================================
   Approvals — modern reviewer-queue view.
   Matches the composer + calendar + inbox design language:
   - Top sticky ProgressToolbar with circular completion ring
   - Collapsible FilterPanel (composer CollapsibleSection pattern)
   - 4-column kanban with rich hover-revealed quick actions
   - Approve / Reject / Request-Changes modal with comment field
   - Per-card post preview thumbnail + platform badges + priority pill
   - Sticky bulk-action bar when 2+ cards selected
   - Version-diff detail modal (localStorage originals)
   - Mobile: kanban collapses to a single column with status filter

   API surface preserved (unchanged):
     GET    /api/approvals                  (list)
     POST   /api/approvals                  (create)
     PATCH  /api/approvals/[id]             (status, comment, approverId)
     DELETE /api/approvals/[id]              (delete)
     GET    /api/team                        (assignee picker)
     GET    /api/posts                       (linked-post picker)
     GET    /api/posts/[id]                  (preview for version diff)
     useNav().openComposerWithPost(post)    (edit linked post in composer)
   ============================================================ */

/* ============================================================
   Types
   ============================================================ */
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

type ApprovalStatus = Approval["status"];
type Priority = Approval["priority"];
type StatusFilter = ApprovalStatus | "all";
type PriorityFilter = Priority | "all";
type AssigneeFilter = "all" | "me" | "unassigned" | string;
type SortBy = "newest" | "oldest" | "due" | "priority";
type ActionKind = "approve" | "reject" | "changes";

/* ============================================================
   Constants
   ============================================================ */
const STATUS_META: Record<
  ApprovalStatus,
  { label: string; color: "amber" | "green" | "rose" | "violet"; icon: LucideIcon }
> = {
  pending: { label: "Pending", color: "amber", icon: Clock },
  approved: { label: "Approved", color: "green", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "rose", icon: XCircle },
  changes_requested: { label: "Changes Requested", color: "violet", icon: AlertCircle },
};

const PRIORITY_META: Record<
  Priority,
  { label: string; color: "neutral" | "blue" | "amber" | "rose"; icon: LucideIcon; weight: number }
> = {
  low: { label: "Low", color: "neutral", icon: ArrowDown, weight: 1 },
  normal: { label: "Normal", color: "blue", icon: ArrowRight, weight: 2 },
  high: { label: "High", color: "amber", icon: ArrowUp, weight: 3 },
  urgent: { label: "Urgent", color: "rose", icon: ShieldAlert, weight: 4 },
};

const ACTION_META: Record<
  ActionKind,
  {
    label: string;
    icon: LucideIcon;
    /** Tailwind text color class */
    text: string;
    /** Tailwind background tint class */
    bg: string;
    /** Tailwind hover background tint class */
    hoverBg: string;
    status: ApprovalStatus;
    toastVerb: string;
  }
> = {
  approve: {
    label: "Approve",
    icon: CheckCircle2,
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    hoverBg: "hover:bg-emerald-500/20",
    status: "approved",
    toastVerb: "Approved",
  },
  reject: {
    label: "Reject",
    icon: XCircle,
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    hoverBg: "hover:bg-rose-500/20",
    status: "rejected",
    toastVerb: "Rejected",
  },
  changes: {
    label: "Request Changes",
    icon: AlertCircle,
    text: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    hoverBg: "hover:bg-violet-500/20",
    status: "changes_requested",
    toastVerb: "Marked for changes",
  },
};

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "due", label: "Due date" },
  { id: "priority", label: "Priority" },
];

const STATUS_FILTER_LIST: StatusFilter[] = [
  "all",
  "pending",
  "changes_requested",
  "approved",
  "rejected",
];

const PRIORITY_FILTER_LIST: PriorityFilter[] = [
  "all",
  "urgent",
  "high",
  "normal",
  "low",
];

const KANBAN_COLUMNS: ApprovalStatus[] = [
  "pending",
  "changes_requested",
  "approved",
  "rejected",
];

const ORIGINALS_KEY = "socialflow-approval-originals";

/* ============================================================
   Helpers
   ============================================================ */
function getToken(): string | null {
  try {
    return (
      JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null
    );
  } catch {
    return null;
  }
}

function getCurrentUser(): { id: string; name: string } | null {
  try {
    const u = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.user;
    if (u?.id && u?.name) return { id: u.id, name: u.name };
    return null;
  } catch {
    return null;
  }
}

function isOverdue(dueAt: string | null, status: ApprovalStatus): boolean {
  if (!dueAt || status === "approved" || status === "rejected") return false;
  return new Date(dueAt).getTime() < Date.now();
}

/** Returns the humanised countdown ("3d left" / "Overdue 2d" / "Today" / "5h left"). */
function dueCountdown(dueAt: string | null, status: ApprovalStatus): { label: string; overdue: boolean } {
  if (!dueAt) return { label: "No due date", overdue: false };
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const diff = due - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / dayMs);
  const hours = Math.floor((abs % dayMs) / hourMs);
  const resolved = status === "approved" || status === "rejected";

  if (resolved) {
    return {
      label: new Date(dueAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      overdue: false,
    };
  }
  if (diff === 0 || (diff > 0 && diff < hourMs)) {
    return { label: "Due today", overdue: false };
  }
  if (diff < 0) {
    if (days > 0) return { label: `Overdue ${days}d`, overdue: true };
    return { label: `Overdue ${hours}h`, overdue: true };
  }
  if (days > 0) return { label: `${days}d left`, overdue: false };
  return { label: `${hours}h left`, overdue: false };
}

function avgResolutionHours(approvals: Approval[]): number | null {
  const resolved = approvals.filter(
    (a) => (a.status === "approved" || a.status === "rejected") && a.resolvedAt,
  );
  if (resolved.length === 0) return null;
  const totalHours = resolved.reduce((sum, a) => {
    const ms = new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime();
    return sum + ms / (60 * 60 * 1000);
  }, 0);
  return Math.round((totalHours / resolved.length) * 10) / 10;
}

function formatAvgResolution(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

/** Read the saved "original" caption for a post from localStorage. */
function readOriginalCaption(postId: string): string | null {
  try {
    const raw = localStorage.getItem(`${ORIGINALS_KEY}:${postId}`);
    return raw ?? null;
  } catch {
    return null;
  }
}

/** Save the original caption for a post (only if not already saved). */
function saveOriginalCaption(postId: string, caption: string): void {
  try {
    const key = `${ORIGINALS_KEY}:${postId}`;
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, caption);
    }
  } catch {
    /* localStorage may be unavailable */
  }
}

/** Tiny line-based diff: returns aligned rows with added/removed/unchanged flags. */
interface DiffRow {
  type: "added" | "removed" | "unchanged";
  left: string | null;
  right: string | null;
}

function diffText(original: string, current: string): DiffRow[] {
  const a = original.split(/\r?\n/);
  const b = current.split(/\r?\n/);
  const max = Math.max(a.length, b.length);
  const rows: DiffRow[] = [];
  for (let i = 0; i < max; i++) {
    const left = i < a.length ? a[i] : null;
    const right = i < b.length ? b[i] : null;
    if (left === right) {
      rows.push({ type: "unchanged", left, right });
    } else {
      if (left !== null) rows.push({ type: "removed", left, right: null });
      if (right !== null) rows.push({ type: "added", left: null, right });
    }
  }
  return rows;
}

/* ============================================================
   ProgressToolbar — top sticky header with completion ring.
   Pattern copied from composer.tsx + inbox.tsx.
   ============================================================ */
function ProgressToolbar({
  completion,
  hasOverdue,
  hasPending,
  onNew,
  onRefresh,
  refreshing,
}: {
  completion: number;
  hasOverdue: boolean;
  hasPending: boolean;
  onNew: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const modeColor = hasOverdue
    ? "text-rose-500"
    : hasPending
    ? "text-amber-500"
    : "text-emerald-500";

  return (
    <div className="glass-strong glass-sheen flex items-center gap-1.5 rounded-xl px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5 lg:px-5">
      {/* Completion ring */}
      <div className="relative grid h-7 w-7 shrink-0 place-items-center sm:h-8 sm:w-8">
        <svg viewBox="0 0 36 36" className="h-7 w-7 -rotate-90 sm:h-8 sm:w-8">
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="3"
            opacity="0.5"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={hasOverdue ? "var(--rose-500, #f43f5e)" : "var(--primary)"}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${(completion / 100) * 97.4} 97.4`}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute text-[7px] font-bold tabular-nums text-foreground sm:text-[8px]">{completion}%</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold leading-tight sm:text-xs">Approvals</span>
          <span
            className={cn(
              "rounded px-1 py-0 text-[7px] font-bold uppercase leading-tight tracking-wider sm:text-[8px] bg-muted/50",
              modeColor,
            )}
          >
            {hasOverdue ? "Overdue" : hasPending ? "Pending" : "All clear"}
          </span>
        </div>
        <div className="text-[8px] leading-tight text-muted-foreground sm:text-[9px]">
          {completion === 100
            ? "Queue is healthy"
            : `${100 - completion}% left to review`}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onNew}
          className="liquid-pill flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold"
        >
          <Plus className="h-3 w-3" />
          <span className="hidden sm:inline">New Request</span>
          <span className="sm:hidden">New</span>
        </button>
        <button
          onClick={onRefresh}
          className="grid h-7 w-7 place-items-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
          title="Refresh approvals"
          aria-label="Refresh approvals"
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   FilterPanel — collapsible multi-filter card.
   Uses the CollapsibleSection pattern from composer.tsx.
   ============================================================ */
function FilterPanel({
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  assigneeFilter,
  onAssigneeChange,
  showOverdueOnly,
  onToggleOverdue,
  sortBy,
  onSortByChange,
  team,
  statusCounts,
  priorityCounts,
  activeCount,
  onClear,
  defaultOpen = false,
}: {
  statusFilter: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityChange: (p: PriorityFilter) => void;
  assigneeFilter: AssigneeFilter;
  onAssigneeChange: (a: AssigneeFilter) => void;
  showOverdueOnly: boolean;
  onToggleOverdue: () => void;
  sortBy: SortBy;
  onSortByChange: (s: SortBy) => void;
  team: TeamMember[];
  statusCounts: Record<StatusFilter, number>;
  priorityCounts: Record<PriorityFilter, number>;
  activeCount: number;
  onClear: () => void;
  defaultOpen?: boolean;
}) {
  const [collapsed, setCollapsed] = React.useState(!defaultOpen);

  return (
    <GlassCard className="p-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed((c) => !c)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed((c) => !c);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Search className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Filters</span>
            {activeCount > 0 && <Pill color="violet">{activeCount} active</Pill>}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Narrow by status, priority, assignee, overdue & sort
          </div>
        </div>
        {activeCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:text-foreground"
            title="Clear all filters"
          >
            <X className="h-3 w-3" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            collapsed ? "" : "rotate-180",
          )}
        />
      </div>

      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "max-h-0 overflow-hidden opacity-0" : "max-h-[1200px] opacity-100",
        )}
      >
        <div className="mt-3 space-y-3">
          {/* Status */}
          <FilterRow label="Status">
            {STATUS_FILTER_LIST.map((s) => {
              const meta = s === "all" ? null : STATUS_META[s];
              const count = statusCounts[s] ?? 0;
              return (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  onClick={() => onStatusChange(s)}
                >
                  {meta && <meta.icon className="h-3 w-3" />}
                  {s === "all" ? "All" : meta!.label}
                  <span className="ml-0.5 rounded-full bg-white/20 px-1 text-[9px] tabular-nums">
                    {count}
                  </span>
                </FilterChip>
              );
            })}
          </FilterRow>

          {/* Priority */}
          <FilterRow label="Priority">
            {PRIORITY_FILTER_LIST.map((p) => {
              const meta = p === "all" ? null : PRIORITY_META[p];
              const count = priorityCounts[p] ?? 0;
              return (
                <FilterChip
                  key={p}
                  active={priorityFilter === p}
                  onClick={() => onPriorityChange(p)}
                >
                  {meta && <meta.icon className="h-3 w-3" />}
                  {p === "all" ? "All" : meta!.label}
                  <span className="ml-0.5 rounded-full bg-white/20 px-1 text-[9px] tabular-nums">
                    {count}
                  </span>
                </FilterChip>
              );
            })}
          </FilterRow>

          {/* Assignee */}
          <FilterRow label="Assignee">
            <div className="flex items-center gap-1.5">
              <Select value={assigneeFilter} onValueChange={onAssigneeChange}>
                <SelectTrigger className="h-7 w-[180px] text-[11px]">
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All assignees</SelectItem>
                  <SelectItem value="me" className="text-xs">Me</SelectItem>
                  <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                  <div className="my-1 border-t border-border/40" />
                  {team.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                      {t.title ? ` · ${t.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterRow>

          {/* Show only overdue */}
          <FilterRow label="Show only">
            <ToggleChip active={showOverdueOnly} onClick={onToggleOverdue} icon={ShieldAlert}>
              Overdue
            </ToggleChip>
          </FilterRow>

          {/* Sort */}
          <FilterRow label="Sort">
            {SORT_OPTIONS.map((s) => (
              <FilterChip
                key={s.id}
                active={sortBy === s.id}
                onClick={() => onSortByChange(s.id)}
              >
                {s.label}
              </FilterChip>
            ))}
          </FilterRow>
        </div>
      </div>
    </GlassCard>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scroll-liquid pb-0.5">
      <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}:
      </span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function ToggleChip({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted",
      )}
      aria-pressed={active}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}

/* ============================================================
   PostPreview — lazy-loads the linked post's media + variants.
   Caches by postId to avoid refetching across cards.
   ============================================================ */
const postCache = new Map<string, Post | null>();

function usePostPreview(postId: string | null): Post | null | undefined {
  const [post, setPost] = React.useState<Post | null | undefined>(
    postId ? postCache.get(postId) ?? undefined : null,
  );

  React.useEffect(() => {
    if (!postId) {
      setPost(null);
      return;
    }
    if (postCache.has(postId)) {
      setPost(postCache.get(postId) ?? null);
      return;
    }
    let cancelled = false;
    setPost(undefined);
    const token = getToken();
    fetch(`/api/posts/${postId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => (r.ok ? ((await r.json()) as Post) : null))
      .then((p) => {
        if (cancelled) return;
        postCache.set(postId, p);
        setPost(p);
      })
      .catch(() => {
        if (cancelled) return;
        postCache.set(postId, null);
        setPost(null);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return post;
}

/* ============================================================
   ApprovalCard — single card inside a kanban column.
   Shows: post thumbnail, platform badges, author/approver avatars,
   priority pill, due countdown, comment preview, hover quick actions.
   ============================================================ */
function ApprovalCard({
  approval,
  author,
  approver,
  acting,
  selected,
  showCheckbox,
  onToggleSelect,
  onAction,
  onView,
  onEdit,
  onDelete,
}: {
  approval: Approval;
  author: { name: string; color: string | null; avatar: string | null; title: string | null };
  approver: { name: string; color: string | null; avatar: string | null; title: string | null };
  acting: boolean;
  selected: boolean;
  showCheckbox: boolean;
  onToggleSelect: () => void;
  onAction: (kind: ActionKind) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const post = usePostPreview(approval.postId);
  const overdue = isOverdue(approval.dueAt, approval.status);
  const isPending =
    approval.status === "pending" || approval.status === "changes_requested";
  const due = dueCountdown(approval.dueAt, approval.status);
  const priorityMeta = PRIORITY_META[approval.priority];
  const statusMeta = STATUS_META[approval.status];

  const platformIds: PlatformId[] = React.useMemo(() => {
    if (!post?.variants) return [];
    const seen = new Set<PlatformId>();
    for (const v of post.variants) {
      if (!seen.has(v.platform)) seen.add(v.platform);
    }
    return Array.from(seen);
  }, [post]);

  const commentPreview = approval.comment
    ? approval.comment.length > 100
      ? approval.comment.slice(0, 100) + "…"
      : approval.comment
    : null;

  return (
    <div
      className={cn(
        "glass group relative rounded-xl border p-3 transition-all",
        overdue && "border-rose-500/40 bg-rose-500/5",
        selected && "ring-2 ring-primary/40",
      )}
    >
      {/* Bulk-select checkbox */}
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="absolute -left-2 top-3 h-3.5 w-3.5 cursor-pointer accent-[var(--primary)]"
          aria-label={`Select ${approval.title}`}
        />
      )}

      {/* Header: priority pill + post thumbnail */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-bold leading-tight">{approval.title}</h4>
        <Pill color={priorityMeta.color}>
          <priorityMeta.icon className="h-2.5 w-2.5" />
          {priorityMeta.label}
        </Pill>
      </div>

      {/* Post thumbnail + platform badges */}
      {approval.postId && (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/40">
            {post === undefined ? (
              <div className="grid h-full w-full place-items-center">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              </div>
            ) : post?.mediaUrl ? (
              <img
                src={post.mediaUrl}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            ) : post ? (
              <div className="grid h-full w-full place-items-center text-muted-foreground/40">
                <FileBarChart className="h-4 w-4" />
              </div>
            ) : (
              <div className="grid h-full w-full place-items-center text-muted-foreground/40">
                <FileBarChart className="h-4 w-4" />
              </div>
            )}
            <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/80">
              {post?.mediaType?.slice(0, 5) ?? "post"}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {platformIds.length > 0 ? (
              platformIds.map((p) => (
                <PlatformBadge key={p} platform={p} size={16} />
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground/60">
                {post === undefined ? "Loading…" : "No variants"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Author / Approver */}
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <NameAvatar
          name={author.name}
          color={author.color ?? undefined}
          src={author.avatar ?? undefined}
          className="h-4 w-4 !text-[7px]"
        />
        <span className="truncate">by {author.name}</span>
        {approver.name !== "—" && (
          <>
            <UserCheck className="h-2.5 w-2.5 shrink-0" />
            <NameAvatar
              name={approver.name}
              color={approver.color ?? undefined}
              src={approver.avatar ?? undefined}
              className="h-4 w-4 !text-[7px]"
            />
            <span className="truncate">{approver.name}</span>
          </>
        )}
      </div>

      {/* Due date with countdown */}
      {approval.dueAt && (
        <div
          className={cn(
            "mt-1.5 flex items-center gap-1 text-[10px]",
            due.overdue
              ? "font-semibold text-rose-600 dark:text-rose-400"
              : "text-muted-foreground",
          )}
        >
          <Clock className="h-2.5 w-2.5" />
          {due.label}
          {due.overdue && <span className="font-bold uppercase">· action needed</span>}
        </div>
      )}

      {/* Comment preview */}
      {commentPreview && (
        <div className="mt-2 rounded-lg bg-muted/30 p-2">
          <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            <MessageCircle className="h-2.5 w-2.5" />
            Comment
          </div>
          <p className="mt-0.5 text-[10px] leading-relaxed text-foreground/80">
            {commentPreview}
          </p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground/70">
        <span>{timeAgo(approval.createdAt)}</span>
        <span className="inline-flex items-center gap-0.5">
          <statusMeta.icon className="h-2.5 w-2.5" />
          {statusMeta.label}
        </span>
      </div>

      {/* Hover quick actions */}
      <div className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-lg bg-background/90 p-0.5 opacity-0 shadow-sm backdrop-blur transition group-hover:pointer-events-auto group-hover:opacity-100">
        {isPending && (
          <>
            <CardActionButton
              title="Approve"
              tone="emerald"
              onClick={(e) => {
                e.stopPropagation();
                onAction("approve");
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
            </CardActionButton>
            <CardActionButton
              title="Request changes"
              tone="violet"
              onClick={(e) => {
                e.stopPropagation();
                onAction("changes");
              }}
            >
              <AlertCircle className="h-3 w-3" />
            </CardActionButton>
            <CardActionButton
              title="Reject"
              tone="rose"
              onClick={(e) => {
                e.stopPropagation();
                onAction("reject");
              }}
            >
              <XCircle className="h-3 w-3" />
            </CardActionButton>
          </>
        )}
        <CardActionButton
          title="View details"
          tone="muted"
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="h-3 w-3" />
        </CardActionButton>
        {approval.postId && (
          <CardActionButton
            title="Edit linked post"
            tone="muted"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-3 w-3" />
          </CardActionButton>
        )}
        <CardActionButton
          title="Delete"
          tone="rose"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </CardActionButton>
      </div>

      {/* Inline action buttons (always visible on pending) */}
      {isPending && (
        <div className="mt-2 flex flex-wrap gap-1">
          <InlineActionButton
            onClick={() => onAction("approve")}
            disabled={acting}
            tone="emerald"
            icon={CheckCircle2}
          >
            Approve
          </InlineActionButton>
          <InlineActionButton
            onClick={() => onAction("changes")}
            disabled={acting}
            tone="violet"
            icon={AlertCircle}
          >
            Changes
          </InlineActionButton>
          <InlineActionButton
            onClick={() => onAction("reject")}
            disabled={acting}
            tone="rose"
            icon={XCircle}
          >
            Reject
          </InlineActionButton>
        </div>
      )}
    </div>
  );
}

function CardActionButton({
  title,
  tone,
  onClick,
  children,
}: {
  title: string;
  tone: "emerald" | "rose" | "violet" | "muted";
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  const toneCls: Record<typeof tone, string> = {
    emerald: "text-emerald-500 hover:bg-emerald-500/15",
    rose: "text-rose-500 hover:bg-rose-500/15",
    violet: "text-violet-500 hover:bg-violet-500/15",
    muted: "text-muted-foreground hover:bg-muted hover:text-foreground",
  };
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        "grid h-5 w-5 place-items-center rounded transition",
        toneCls[tone],
      )}
    >
      {children}
    </button>
  );
}

function InlineActionButton({
  onClick,
  disabled,
  tone,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  tone: "emerald" | "rose" | "violet";
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const toneCls: Record<typeof tone, string> = {
    emerald:
      "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
    rose: "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400",
    violet:
      "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition disabled:opacity-50",
        toneCls[tone],
      )}
    >
      {disabled ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Icon className="h-3 w-3" />
      )}
      {children}
    </button>
  );
}

/* ============================================================
   ActionDialog — Approve / Reject / Request Changes modal with
   an optional comment field. Calls PATCH /api/approvals/[id].
   ============================================================ */
function ActionDialog({
  open,
  onOpenChange,
  approval,
  author,
  kind,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  approval: Approval | null;
  author: { name: string; color: string | null; avatar: string | null };
  kind: ActionKind;
  onConfirm: (comment: string) => void;
  busy: boolean;
}) {
  const [comment, setComment] = React.useState("");
  const meta = ACTION_META[kind];

  React.useEffect(() => {
    if (open) setComment("");
  }, [open]);

  if (!approval) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={cn("grid h-7 w-7 place-items-center rounded-lg", meta.bg)}>
              <meta.icon className={cn("h-3.5 w-3.5", meta.text)} />
            </span>
            {meta.label}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            You&apos;re about to <span className={cn("font-semibold", meta.text)}>{meta.label.toLowerCase()}</span> this approval request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Approval summary */}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-2">
              <NameAvatar
                name={author.name}
                color={author.color ?? undefined}
                src={author.avatar ?? undefined}
                className="h-6 w-6 !text-[9px]"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">{approval.title}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  by {author.name}
                </div>
              </div>
              <Pill color={PRIORITY_META[approval.priority].color}>
                {PRIORITY_META[approval.priority].label}
              </Pill>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Reviewer note</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a note for the author (optional)"
              className="min-h-[80px] text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              The author will see this comment in their approval notification.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-[11px]"
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(comment.trim() || "")}
            disabled={busy}
            className={cn(
              "h-8 gap-1.5 text-[11px]",
              kind === "approve" && "bg-emerald-500/90 text-white hover:bg-emerald-600",
              kind === "reject" && "bg-rose-500/90 text-white hover:bg-rose-600",
              kind === "changes" && "bg-violet-500/90 text-white hover:bg-violet-600",
            )}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <meta.icon className="h-3.5 w-3.5" />
            )}
            {meta.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   DetailDialog — full approval details with version diff.
   ============================================================ */
function DetailDialog({
  open,
  onOpenChange,
  approval,
  author,
  approver,
  onAction,
  onEdit,
  onDelete,
  acting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  approval: Approval | null;
  author: { name: string; color: string | null; avatar: string | null; title: string | null };
  approver: { name: string; color: string | null; avatar: string | null; title: string | null };
  onAction: (kind: ActionKind) => void;
  onEdit: () => void;
  onDelete: () => void;
  acting: boolean;
}) {
  const post = usePostPreview(approval?.postId ?? null);
  const [showDiff, setShowDiff] = React.useState(false);

  React.useEffect(() => {
    if (open) setShowDiff(false);
  }, [open]);

  if (!approval) return null;
  const statusMeta = STATUS_META[approval.status];
  const priorityMeta = PRIORITY_META[approval.priority];
  const due = dueCountdown(approval.dueAt, approval.status);
  const overdue = isOverdue(approval.dueAt, approval.status);

  const originalCaption = approval.postId ? readOriginalCaption(approval.postId) : null;
  const currentCaption = post?.caption ?? null;
  const diffRows =
    showDiff && originalCaption !== null && currentCaption !== null
      ? diffText(originalCaption, currentCaption)
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong rounded-3xl sm:max-w-2xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <statusMeta.icon
              className={cn(
                "h-4 w-4",
                statusMeta.color === "amber" && "text-amber-500",
                statusMeta.color === "green" && "text-emerald-500",
                statusMeta.color === "rose" && "text-rose-500",
                statusMeta.color === "violet" && "text-violet-500",
              )}
            />
            {approval.title}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Submitted {timeAgo(approval.createdAt)}
            {approval.resolvedAt && ` · resolved ${timeAgo(approval.resolvedAt)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto scroll-liquid pr-1">
          {/* People */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Author
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <NameAvatar
                  name={author.name}
                  color={author.color ?? undefined}
                  src={author.avatar ?? undefined}
                  className="h-6 w-6 !text-[9px]"
                />
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold">{author.name}</div>
                  {author.title && (
                    <div className="truncate text-[10px] text-muted-foreground">
                      {author.title}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Approver
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {approver.name !== "—" ? (
                  <>
                    <NameAvatar
                      name={approver.name}
                      color={approver.color ?? undefined}
                      src={approver.avatar ?? undefined}
                      className="h-6 w-6 !text-[9px]"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold">{approver.name}</div>
                      {approver.title && (
                        <div className="truncate text-[10px] text-muted-foreground">
                          {approver.title}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Unassigned</div>
                )}
              </div>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2">
            <Pill color={priorityMeta.color}>
              <priorityMeta.icon className="h-2.5 w-2.5" />
              {priorityMeta.label}
            </Pill>
            <Pill color={statusMeta.color}>{statusMeta.label}</Pill>
            {approval.dueAt && (
              <Pill color={due.overdue ? "rose" : "neutral"}>
                <Clock className="h-2.5 w-2.5" />
                {due.label}
                {overdue && " · overdue"}
              </Pill>
            )}
            {approval.postId && (
              <Pill color="blue">
                <FileBarChart className="h-2.5 w-2.5" />
                Linked post
              </Pill>
            )}
          </div>

          {/* Comment (existing) */}
          {approval.comment && (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <MessageCircle className="h-3 w-3" />
                Last reviewer comment
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                {approval.comment}
              </p>
            </div>
          )}

          {/* Version diff */}
          {approval.postId && (
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <GitCompareArrows className="h-3 w-3" />
                  Version diff
                </div>
                {originalCaption !== null && currentCaption !== null && !showDiff && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiff(true)}
                    className="h-6 gap-1 text-[10px] font-semibold"
                  >
                    <FileDiff className="h-3 w-3" />
                    Compare with original
                  </Button>
                )}
                {showDiff && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDiff(false)}
                    className="h-6 gap-1 text-[10px] font-semibold"
                  >
                    <X className="h-3 w-3" />
                    Hide diff
                  </Button>
                )}
              </div>

              {!showDiff && (
                <div className="mt-2">
                  {currentCaption !== null ? (
                    <pre className="whitespace-pre-wrap break-words rounded-lg bg-background/60 p-2 font-mono text-[11px] leading-relaxed text-foreground/80">
                      {currentCaption}
                    </pre>
                  ) : post === undefined ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading post…
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground">
                      Post not found.
                    </div>
                  )}
                  {originalCaption === null && currentCaption !== null && (
                    <p className="mt-1.5 text-[10px] italic text-muted-foreground/70">
                      No previous version saved.
                    </p>
                  )}
                </div>
              )}

              {showDiff && diffRows.length > 0 && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Original
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/60 p-2">
                      {diffRows.map((r, i) =>
                        r.type === "added" ? (
                          <div key={i} className="h-[14px]" />
                        ) : (
                          <div
                            key={i}
                            className={cn(
                              "whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed",
                              r.type === "removed" && "bg-rose-500/15 text-rose-700 dark:text-rose-300",
                            )}
                          >
                            {r.left ?? " "}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Current
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/60 p-2">
                      {diffRows.map((r, i) =>
                        r.type === "removed" ? (
                          <div key={i} className="h-[14px]" />
                        ) : (
                          <div
                            key={i}
                            className={cn(
                              "whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed",
                              r.type === "added" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                            )}
                          >
                            {r.right ?? " "}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-1.5">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-[11px]"
          >
            Close
          </Button>
          {approval.postId && (
            <Button
              variant="ghost"
              onClick={onEdit}
              className="h-8 gap-1.5 text-[11px]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit in composer
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onDelete}
            className="h-8 gap-1.5 text-[11px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          {approval.status === "pending" || approval.status === "changes_requested" ? (
            <>
              <Button
                variant="ghost"
                onClick={() => onAction("changes")}
                disabled={acting}
                className="h-8 gap-1.5 text-[11px] text-violet-600 hover:bg-violet-500/10 hover:text-violet-600 dark:text-violet-400"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Request changes
              </Button>
              <Button
                variant="ghost"
                onClick={() => onAction("reject")}
                disabled={acting}
                className="h-8 gap-1.5 text-[11px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                onClick={() => onAction("approve")}
                disabled={acting}
                className="h-8 gap-1.5 bg-emerald-500/90 text-[11px] text-white hover:bg-emerald-600"
              >
                {acting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Approve
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   BulkActionBar — sticky bottom bar (StickyPublishBar pattern).
   ============================================================ */
function BulkActionBar({
  count,
  busy,
  onClear,
  onBulkAction,
}: {
  count: number;
  busy: boolean;
  onClear: () => void;
  onBulkAction: (kind: ActionKind | "delete" | "assign") => void;
}) {
  if (count < 2) return null;
  return (
    <div className="sticky bottom-0 z-30 -mx-4 px-4 py-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="glass-strong glass-sheen flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary tabular-nums">
            {count}
          </span>
          <span className="text-xs font-semibold">selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BulkButton
            onClick={() => onBulkAction("approve")}
            disabled={busy}
            icon={CheckCircle2}
            tone="emerald"
          >
            Approve
          </BulkButton>
          <BulkButton
            onClick={() => onBulkAction("changes")}
            disabled={busy}
            icon={AlertCircle}
            tone="violet"
          >
            Changes
          </BulkButton>
          <BulkButton
            onClick={() => onBulkAction("reject")}
            disabled={busy}
            icon={XCircle}
            tone="rose"
          >
            Reject
          </BulkButton>
          <BulkButton
            onClick={() => onBulkAction("assign")}
            disabled={busy}
            icon={UserPlus}
          >
            Assign
          </BulkButton>
          <BulkButton
            onClick={() => onBulkAction("delete")}
            disabled={busy}
            icon={Trash2}
            tone="rose"
          >
            Delete
          </BulkButton>
          <button
            onClick={onClear}
            className="grid h-8 w-8 place-items-center rounded-xl border border-border/50 bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkButton({
  onClick,
  disabled,
  icon: Icon,
  children,
  tone = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
  tone?: "default" | "emerald" | "rose" | "violet";
}) {
  const toneCls: Record<typeof tone, string> = {
    default: "text-muted-foreground hover:bg-muted hover:text-foreground",
    emerald: "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400",
    rose: "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400",
    violet: "text-violet-600 hover:bg-violet-500/10 dark:text-violet-400",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "hidden items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 sm:flex",
        toneCls[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

/* ============================================================
   BulkConfirmDialog — confirmation modal for bulk actions.
   Optional comment + (for "assign") team-member picker.
   ============================================================ */
function BulkConfirmDialog({
  open,
  onOpenChange,
  kind,
  count,
  team,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: ActionKind | "delete" | "assign";
  count: number;
  team: TeamMember[];
  onConfirm: (comment: string, assigneeId: string | null) => void;
  busy: boolean;
}) {
  const [comment, setComment] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setComment("");
      setAssigneeId("");
    }
  }, [open]);

  const isAction = kind === "approve" || kind === "reject" || kind === "changes";
  const isAssign = kind === "assign";
  const isDelete = kind === "delete";

  const title = isDelete
    ? "Delete selected"
    : isAssign
    ? "Assign selected"
    : `${ACTION_META[kind as ActionKind].label} selected`;

  const Icon = isDelete
    ? Trash2
    : isAssign
    ? UserPlus
    : ACTION_META[kind as ActionKind].icon;
  const toneCls = isDelete
    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
    : isAssign
    ? "bg-primary/10 text-primary"
    : ACTION_META[kind as ActionKind].bg + " " + ACTION_META[kind as ActionKind].text;

  const buttonCls = isDelete
    ? "bg-rose-500/90 text-white hover:bg-rose-600"
    : isAssign
    ? ""
    : kind === "approve"
    ? "bg-emerald-500/90 text-white hover:bg-emerald-600"
    : kind === "reject"
    ? "bg-rose-500/90 text-white hover:bg-rose-600"
    : "bg-violet-500/90 text-white hover:bg-violet-600";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className={cn("grid h-7 w-7 place-items-center rounded-lg", toneCls)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            {title}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {count} approval{count === 1 ? "" : "s"} will be affected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isAction && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Reviewer note (optional)</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note for the authors (optional)"
                className="min-h-[60px] text-xs"
              />
            </div>
          )}
          {isAssign && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Assign to</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pick a team member" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name} {t.title ? `· ${t.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {isDelete && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-[11px] text-rose-700 dark:text-rose-300">
              This permanently deletes the selected approvals. This action cannot be undone.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-[11px]"
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(comment.trim() || "", assigneeId || null)}
            disabled={busy || (isAssign && !assigneeId)}
            className={cn("h-8 gap-1.5 text-[11px]", buttonCls)}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   EmptyState — friendly empty / no-match state.
   ============================================================ */
function EmptyState({
  icon: Icon = ListChecks,
  title,
  desc,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-3 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-sm font-semibold">{title}</div>
      <div className="max-w-[280px] text-xs text-muted-foreground">{desc}</div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ============================================================
   ApprovalsSkeleton — shimmer blocks matching the layout.
   ============================================================ */
function ApprovalsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => (
          <div key={col} className="space-y-2">
            <div className="h-8 animate-pulse rounded-lg bg-muted/40" />
            <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
            <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   CreateApprovalDialog — preserved from old code with optional
   linked-post picker. When a post is linked, its current caption
   is saved to localStorage as the "original" for version diffing.
   ============================================================ */
function CreateApprovalDialog({
  open,
  onOpenChange,
  team,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  team: TeamMember[];
  onCreated: () => void;
}) {
  const { data: posts } = useApi<Post[]>("/api/posts");
  const [title, setTitle] = React.useState("");
  const [authorId, setAuthorId] = React.useState("");
  const [approverId, setApproverId] = React.useState("");
  const [postId, setPostId] = React.useState("");
  const [priority, setPriority] = React.useState<Priority>("normal");
  const [dueAt, setDueAt] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Auto-pick the current user as author
  React.useEffect(() => {
    if (!open) return;
    try {
      const u = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.user;
      if (u?.id && !authorId) setAuthorId(u.id);
    } catch {
      /* ignore */
    }
  }, [open, authorId]);

  function reset() {
    setTitle("");
    setApproverId("");
    setPostId("");
    setPriority("normal");
    setDueAt("");
    setComment("");
  }

  async function submit() {
    if (!title || !authorId) {
      toast.error("Title and author are required");
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title,
          authorId,
          postId: postId || null,
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
      // Save the linked post's current caption as the "original" version
      // so future version diffs have a baseline to compare against.
      if (postId) {
        const linked = (posts ?? []).find((p) => p.id === postId);
        if (linked?.caption) {
          saveOriginalCaption(postId, linked.caption);
        }
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
      <DialogContent className="rounded-3xl sm:max-w-md" aria-describedby={undefined}>
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
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pick author" />
                </SelectTrigger>
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
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
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

          {/* Linked post (optional) */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">
              Linked post{" "}
              <span className="text-muted-foreground">(optional — for version diff)</span>
            </Label>
            <Select value={postId} onValueChange={setPostId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pick a post (optional)" />
              </SelectTrigger>
              <SelectContent>
                {(posts ?? []).slice(0, 100).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.title} · {p.authorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {postId && (
              <p className="text-[10px] text-muted-foreground">
                The current caption will be saved as the original for version diffing.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
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
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-[11px]"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || !title || !authorId}
            className="h-8 gap-1.5 text-[11px]"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileBarChart className="h-3.5 w-3.5" />
            )}
            Create Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   Main view
   ============================================================ */
export function ApprovalsView() {
  const { data: approvals, loading, reload } = useApi<Approval[]>("/api/approvals");
  const { data: team } = useApi<TeamMember[]>("/api/team");
  const { user } = useAuth();
  const { openComposerWithPost } = useNav();

  // Filter / sort state
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState<AssigneeFilter>("all");
  const [showOverdueOnly, setShowOverdueOnly] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortBy>("newest");
  const [mobileColumn, setMobileColumn] = React.useState<ApprovalStatus>("pending");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  // Modal state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [actingId, setActingId] = React.useState<string | null>(null);
  const [actionTarget, setActionTarget] = React.useState<{
    approval: Approval;
    kind: ActionKind;
  } | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [bulkKind, setBulkKind] = React.useState<ActionKind | "delete" | "assign" | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);

  // Selection state for bulk actions
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  // Refresh spinner (purely cosmetic — reload is async)
  const [refreshing, setRefreshing] = React.useState(false);

  const currentUser = React.useMemo(
    () => (user ? { id: user.id, name: user.name } : getCurrentUser()),
    [user],
  );

  const allApprovals = approvals ?? [];

  // Member map for name resolution
  const memberMap = React.useMemo(() => {
    const m = new Map<string, TeamMember>();
    (team ?? []).forEach((t) => m.set(t.id, t));
    return m;
  }, [team]);

  function resolveName(id: string | null): {
    name: string;
    color: string | null;
    avatar: string | null;
    title: string | null;
  } {
    if (!id) return { name: "—", color: null, avatar: null, title: null };
    const m = memberMap.get(id);
    return m
      ? { name: m.name, color: m.color, avatar: m.avatar, title: m.title }
      : { name: id.slice(0, 8), color: null, avatar: null, title: null };
  }

  // Filter + sort
  const visible = React.useMemo(() => {
    let list = allApprovals;
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter((a) => a.priority === priorityFilter);
    if (assigneeFilter === "me") {
      list = list.filter((a) => a.approverId === currentUser?.id);
    } else if (assigneeFilter === "unassigned") {
      list = list.filter((a) => !a.approverId);
    } else if (assigneeFilter !== "all") {
      list = list.filter((a) => a.approverId === assigneeFilter);
    }
    if (showOverdueOnly) list = list.filter((a) => isOverdue(a.dueAt, a.status));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.comment?.toLowerCase().includes(q) ?? false),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "due") {
        const ad = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
        const bd = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
        return ad - bd;
      }
      // priority — urgent first
      return PRIORITY_META[b.priority].weight - PRIORITY_META[a.priority].weight;
    });
    return sorted;
  }, [allApprovals, statusFilter, priorityFilter, assigneeFilter, showOverdueOnly, search, sortBy, currentUser]);

  // Group by status for the kanban
  const byStatus = React.useMemo(() => {
    const map: Record<ApprovalStatus, Approval[]> = {
      pending: [],
      changes_requested: [],
      approved: [],
      rejected: [],
    };
    for (const a of visible) map[a.status].push(a);
    return map;
  }, [visible]);

  // KPI metrics — extended with avg resolution time + approval rate sparkline
  const metrics: Metric[] = React.useMemo(() => {
    const total = allApprovals.length;
    const pending = allApprovals.filter((a) => a.status === "pending").length;
    const changes = allApprovals.filter((a) => a.status === "changes_requested").length;
    const approved = allApprovals.filter((a) => a.status === "approved").length;
    const rejected = allApprovals.filter((a) => a.status === "rejected").length;
    const overdue = allApprovals.filter((a) => isOverdue(a.dueAt, a.status)).length;
    const approvalRate =
      approved + rejected > 0
        ? Math.round((approved / (approved + rejected)) * 100)
        : 0;
    const avgHours = avgResolutionHours(allApprovals);
    // Last 7 resolved approvals, newest first → 1 if approved, 0 if rejected
    const last7Spark = allApprovals
      .filter((a) => a.status === "approved" || a.status === "rejected")
      .slice(0, 7)
      .reverse()
      .map((a) => (a.status === "approved" ? 1 : 0));
    return [
      { label: "Total", value: total, color: "oklch(0.62 0.22 300)" },
      { label: "Pending", value: pending, color: "oklch(0.72 0.18 75)" },
      { label: "Changes", value: changes, color: "oklch(0.66 0.22 305)" },
      { label: "Approved", value: approved, color: "oklch(0.7 0.2 145)" },
      { label: "Rejected", value: rejected, color: "oklch(0.55 0.22 25)" },
      { label: "Overdue", value: overdue, color: "oklch(0.65 0.22 15)" },
      {
        label: "Approval %",
        value: `${approvalRate}%`,
        color: "oklch(0.62 0.2 255)",
        spark: last7Spark,
      },
      {
        label: "Avg resolve",
        value: formatAvgResolution(avgHours),
        color: "oklch(0.7 0.18 200)",
      },
    ];
  }, [allApprovals]);

  // Completion % — derived from filter / search / overdue / pending.
  const completion = React.useMemo(() => {
    if (allApprovals.length === 0) return 0;
    const hasPending = allApprovals.some(
      (a) => a.status === "pending" || a.status === "changes_requested",
    );
    const hasOverdue = allApprovals.some((a) => isOverdue(a.dueAt, a.status));
    const base =
      (statusFilter !== "all" ? 25 : 0) +
      (search.trim() ? 25 : 0) +
      (hasOverdue ? 25 : 0) +
      (hasPending ? 25 : 0);
    return Math.min(100, base);
  }, [allApprovals, statusFilter, search]);

  const hasOverdue = React.useMemo(
    () => allApprovals.some((a) => isOverdue(a.dueAt, a.status)),
    [allApprovals],
  );
  const hasPending = React.useMemo(
    () => allApprovals.some((a) => a.status === "pending" || a.status === "changes_requested"),
    [allApprovals],
  );

  // Counts for filter chips
  const statusCounts = React.useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: allApprovals.length,
      pending: 0,
      changes_requested: 0,
      approved: 0,
      rejected: 0,
    };
    for (const a of allApprovals) c[a.status]++;
    return c;
  }, [allApprovals]);

  const priorityCounts = React.useMemo(() => {
    const c: Record<PriorityFilter, number> = {
      all: allApprovals.length,
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    };
    for (const a of allApprovals) c[a.priority]++;
    return c;
  }, [allApprovals]);

  const activeFilterCount = React.useMemo(() => {
    let n = 0;
    if (statusFilter !== "all") n++;
    if (priorityFilter !== "all") n++;
    if (assigneeFilter !== "all") n++;
    if (showOverdueOnly) n++;
    if (sortBy !== "newest") n++;
    if (search.trim()) n++;
    return n;
  }, [statusFilter, priorityFilter, assigneeFilter, showOverdueOnly, sortBy, search]);

  function clearFilters() {
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setShowOverdueOnly(false);
    setSortBy("newest");
    setSearch("");
  }

  // ---------- Actions ----------
  function refreshNow() {
    setRefreshing(true);
    reload();
    setTimeout(() => setRefreshing(false), 600);
  }

  async function patchApproval(id: string, status: ApprovalStatus, comment?: string) {
    setActingId(id);
    try {
      const token = getToken();
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status, comment: comment || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? `Failed to ${status}`);
        return false;
      }
      reload();
      return true;
    } catch {
      toast.error("Network error");
      return false;
    } finally {
      setActingId(null);
    }
  }

  async function deleteApproval(id: string) {
    const token = getToken();
    try {
      await fetch(`/api/approvals/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success("Approval deleted");
      reload();
    } catch {
      toast.error("Network error");
    }
  }

  function openAction(approval: Approval, kind: ActionKind) {
    setActionTarget({ approval, kind });
  }

  async function confirmAction(comment: string) {
    if (!actionTarget) return;
    const { approval, kind } = actionTarget;
    const ok = await patchApproval(approval.id, ACTION_META[kind].status, comment);
    if (ok) {
      toast.success(`${ACTION_META[kind].toastVerb} successfully`);
    }
    setActionTarget(null);
  }

  async function confirmBulk(comment: string, assigneeId: string | null) {
    if (!bulkKind) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      if (bulkKind === "delete") {
        const token = getToken();
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/approvals/${id}`, {
              method: "DELETE",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }),
          ),
        );
        toast.success(`Deleted ${ids.length} approval${ids.length === 1 ? "" : "s"}`);
      } else if (bulkKind === "assign") {
        if (!assigneeId) {
          toast.error("Pick a team member");
          setBulkBusy(false);
          return;
        }
        const token = getToken();
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/approvals/${id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ approverId: assigneeId }),
            }),
          ),
        );
        toast.success(`Assigned ${ids.length} approval${ids.length === 1 ? "" : "s"}`);
      } else {
        // action: approve / reject / changes
        const token = getToken();
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/approvals/${id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                status: ACTION_META[bulkKind as ActionKind].status,
                comment: comment || null,
              }),
            }),
          ),
        );
        toast.success(
          `${ACTION_META[bulkKind as ActionKind].toastVerb} ${ids.length} approval${
            ids.length === 1 ? "" : "s"
          }`,
        );
      }
      setSelected(new Set());
      setBulkKind(null);
      reload();
    } catch {
      toast.error("Some operations failed");
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const detailApproval = detailId
    ? allApprovals.find((a) => a.id === detailId) ?? null
    : null;

  function editLinkedPost(approval: Approval) {
    // The Post type is needed by openComposerWithPost. We use the cached
    // post preview if available, else fetch synchronously and dispatch.
    const cached = approval.postId ? postCache.get(approval.postId) : null;
    if (cached) {
      openComposerWithPost(cached);
      setDetailId(null);
      return;
    }
    if (!approval.postId) return;
    const token = getToken();
    fetch(`/api/posts/${approval.postId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (r) => (r.ok ? ((await r.json()) as Post) : null))
      .then((p) => {
        if (p) {
          if (approval.postId) postCache.set(approval.postId, p);
          openComposerWithPost(p);
          setDetailId(null);
        } else {
          toast.error("Linked post not found");
        }
      })
      .catch(() => toast.error("Network error"));
  }

  // ---------- Render ----------
  return (
    <div className="space-y-4">
      <ProgressToolbar
        completion={completion}
        hasOverdue={hasOverdue}
        hasPending={hasPending}
        onNew={() => setCreateOpen(true)}
        onRefresh={refreshNow}
        refreshing={refreshing}
      />

      <HelpText module="approvals">
        <strong className="text-foreground">Content Approvals</strong> — submit posts for review
        before they go live. Approvers can approve, reject, or request changes. Each request tracks
        priority, due date, and resolution comments.
      </HelpText>

      <SectionHeader
        title="Content Approvals"
        icon={ListChecks}
        desc="Approval workflow: draft → pending → approved / rejected → publish"
      />

      {/* KPIs */}
      <MetricRow metrics={metrics} />

      {/* Search + filters trigger (mobile) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or comment…"
            className="h-8 pl-8 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
        >
          <Search className="h-3 w-3" />
          Filters
          {activeFilterCount > 0 && (
            <Pill color="violet">{activeFilterCount}</Pill>
          )}
        </button>
      </div>

      {/* Desktop filter panel (always expanded on lg+) */}
      <div className="hidden lg:block">
        <FilterPanel
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          showOverdueOnly={showOverdueOnly}
          onToggleOverdue={() => setShowOverdueOnly((v) => !v)}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          team={team ?? []}
          statusCounts={statusCounts}
          priorityCounts={priorityCounts}
          activeCount={activeFilterCount}
          onClear={clearFilters}
          defaultOpen
        />
      </div>

      {/* Mobile filter sheet (collapsible) */}
      {filtersOpen && (
        <div className="lg:hidden">
          <FilterPanel
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityChange={setPriorityFilter}
            assigneeFilter={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            showOverdueOnly={showOverdueOnly}
            onToggleOverdue={() => setShowOverdueOnly((v) => !v)}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            team={team ?? []}
            statusCounts={statusCounts}
            priorityCounts={priorityCounts}
            activeCount={activeFilterCount}
            onClear={clearFilters}
            defaultOpen
          />
        </div>
      )}

      {/* Status filter pills (always visible on mobile for kanban navigation) */}
      <div className="flex flex-wrap items-center gap-1.5 lg:hidden">
        {STATUS_FILTER_LIST.map((s) => {
          const meta = s === "all" ? null : STATUS_META[s];
          const count = statusCounts[s] ?? 0;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                if (s !== "all") setMobileColumn(s);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground shadow-[inset_0_0_0_1px_var(--ring)]"
                  : "border-border/40 text-muted-foreground hover:bg-muted/30 hover:text-foreground",
              )}
            >
              {meta && <meta.icon className="h-3 w-3" />}
              {s === "all" ? "All" : meta!.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold tabular-nums">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      {loading ? (
        <ApprovalsSkeleton />
      ) : allApprovals.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No approval requests yet"
          desc="Create your first request to start the review workflow. Approvers can approve, reject, or request changes."
          action={
            <Button
              onClick={() => setCreateOpen(true)}
              className="liquid-pill h-8 gap-1.5 text-[11px]"
            >
              <Plus className="h-3.5 w-3.5" />
              Create your first request
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title="No matching approvals"
          desc="Try adjusting your filters or search query to find what you're looking for."
          action={
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-8 gap-1.5 text-[11px]"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop: 4-column kanban */}
          <div className="hidden gap-3 lg:grid lg:grid-cols-4">
            {KANBAN_COLUMNS.map((status) => {
              const meta = STATUS_META[status];
              const items = byStatus[status];
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <meta.icon
                        className={cn(
                          "h-3.5 w-3.5",
                          meta.color === "amber" && "text-amber-500",
                          meta.color === "green" && "text-emerald-500",
                          meta.color === "rose" && "text-rose-500",
                          meta.color === "violet" && "text-violet-500",
                        )}
                      />
                      <span className="text-[11px] font-bold tracking-tight">
                        {meta.label}
                      </span>
                    </div>
                    <Pill color={meta.color}>{items.length}</Pill>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/30 bg-muted/5 px-3 py-4 text-center text-[10px] text-muted-foreground">
                        Empty
                      </div>
                    ) : (
                      items.map((a) => {
                        const author = resolveName(a.authorId);
                        const approver = resolveName(a.approverId);
                        return (
                          <ApprovalCard
                            key={a.id}
                            approval={a}
                            author={author}
                            approver={approver}
                            acting={actingId === a.id}
                            selected={selected.has(a.id)}
                            showCheckbox={selected.size > 0}
                            onToggleSelect={() => toggleSelected(a.id)}
                            onAction={(kind) => openAction(a, kind)}
                            onView={() => setDetailId(a.id)}
                            onEdit={() => editLinkedPost(a)}
                            onDelete={() => {
                              if (window.confirm("Delete this approval request?")) {
                                deleteApproval(a.id);
                              }
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: single column with status filter */}
          <div className="space-y-2 lg:hidden">
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-1.5">
                {(() => {
                  const meta = STATUS_META[mobileColumn];
                  return (
                    <>
                      <meta.icon
                        className={cn(
                          "h-3.5 w-3.5",
                          meta.color === "amber" && "text-amber-500",
                          meta.color === "green" && "text-emerald-500",
                          meta.color === "rose" && "text-rose-500",
                          meta.color === "violet" && "text-violet-500",
                        )}
                      />
                      <span className="text-[11px] font-bold tracking-tight">
                        {meta.label}
                      </span>
                    </>
                  );
                })()}
              </div>
              <Pill color={STATUS_META[mobileColumn].color}>
                {byStatus[mobileColumn].length}
              </Pill>
            </div>
            <div className="space-y-2">
              {byStatus[mobileColumn].length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/30 bg-muted/5 px-3 py-4 text-center text-[10px] text-muted-foreground">
                  Empty
                </div>
              ) : (
                byStatus[mobileColumn].map((a) => {
                  const author = resolveName(a.authorId);
                  const approver = resolveName(a.approverId);
                  return (
                    <ApprovalCard
                      key={a.id}
                      approval={a}
                      author={author}
                      approver={approver}
                      acting={actingId === a.id}
                      selected={selected.has(a.id)}
                      showCheckbox={selected.size > 0}
                      onToggleSelect={() => toggleSelected(a.id)}
                      onAction={(kind) => openAction(a, kind)}
                      onView={() => setDetailId(a.id)}
                      onEdit={() => editLinkedPost(a)}
                      onDelete={() => {
                        if (window.confirm("Delete this approval request?")) {
                          deleteApproval(a.id);
                        }
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        count={selected.size}
        busy={bulkBusy}
        onClear={clearSelection}
        onBulkAction={(kind) => setBulkKind(kind)}
      />

      {/* Action dialog (single approval) */}
      <ActionDialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && setActionTarget(null)}
        approval={actionTarget?.approval ?? null}
        author={
          actionTarget
            ? resolveName(actionTarget.approval.authorId)
            : { name: "—", color: null, avatar: null }
        }
        kind={actionTarget?.kind ?? "approve"}
        onConfirm={confirmAction}
        busy={actingId === actionTarget?.approval.id}
      />

      {/* Detail dialog */}
      <DetailDialog
        open={!!detailApproval}
        onOpenChange={(o) => !o && setDetailId(null)}
        approval={detailApproval}
        author={detailApproval ? resolveName(detailApproval.authorId) : { name: "—", color: null, avatar: null, title: null }}
        approver={detailApproval ? resolveName(detailApproval.approverId) : { name: "—", color: null, avatar: null, title: null }}
        onAction={(kind) => {
          if (!detailApproval) return;
          setDetailId(null);
          openAction(detailApproval, kind);
        }}
        onEdit={() => {
          if (detailApproval) editLinkedPost(detailApproval);
        }}
        onDelete={() => {
          if (!detailApproval) return;
          if (window.confirm("Delete this approval request?")) {
            const id = detailApproval.id;
            setDetailId(null);
            deleteApproval(id);
          }
        }}
        acting={!!detailApproval && actingId === detailApproval.id}
      />

      {/* Bulk confirm dialog */}
      <BulkConfirmDialog
        open={!!bulkKind}
        onOpenChange={(o) => !o && setBulkKind(null)}
        kind={bulkKind ?? "approve"}
        count={selected.size}
        team={team ?? []}
        onConfirm={confirmBulk}
        busy={bulkBusy}
      />

      {/* Create dialog */}
      <CreateApprovalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        team={team ?? []}
        onCreated={() => {
          reload();
          setCreateOpen(false);
        }}
      />
    </div>
  );
}

/* ============================================================
   Re-exports used elsewhere — keep API surface stable.
   ============================================================ */
export type { Approval, TeamMember };
export { STATUS_META, PRIORITY_META };
