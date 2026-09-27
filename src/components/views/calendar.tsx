"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  Hash,
  List as ListIcon,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApi } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import {
  MetricRow,
  SectionHeader,
  ListRow,
  Pill,
  type Metric,
} from "@/components/glass/dense-ui";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { PLATFORMS, PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Post } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

/* ============================================================
   Types & constants
   ============================================================ */

type StatusFilter = "all" | "scheduled" | "published" | "draft" | "failed";
type ViewMode = "month" | "biweek" | "week" | "agenda";
type PillColor = "neutral" | "green" | "amber" | "rose" | "blue" | "violet";

/** Effective status extends Post["status"] with a synthetic "pending" state
 *  used when a draft has an approval-related field attached. */
type EffectiveStatus = Post["status"] | "pending";

type PostAction = "edit" | "duplicate" | "delete" | "view";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All",
  scheduled: "Scheduled",
  published: "Published",
  draft: "Drafts",
  failed: "Failed",
};

/** Status -> Pill color map for both calendar day cells and sidebar rows. */
const STATUS_PILL_COLOR: Record<EffectiveStatus, PillColor> = {
  published: "green",
  scheduled: "blue",
  draft: "amber",
  failed: "rose",
  pending: "amber",
};

const VIEW_MODES: { id: ViewMode; icon: LucideIcon; label: string; short: string }[] = [
  { id: "month", icon: CalendarDays, label: "Month", short: "M" },
  { id: "biweek", icon: CalendarRange, label: "2 Weeks", short: "2W" },
  { id: "week", icon: CalendarClock, label: "Week", short: "W" },
  { id: "agenda", icon: ListIcon, label: "Agenda", short: "A" },
];

/** Local copy of composer's BEST_TIMES — peak engagement windows per platform.
 *  Reach is narrowed to "High" | "Peak" (no "Medium" entries in practice). */
const BEST_TIMES: Record<PlatformId, { time: string; hour: number; reach: "High" | "Peak" }[]> = {
  x: [
    { time: "9:00 AM", hour: 9, reach: "High" },
    { time: "12:00 PM", hour: 12, reach: "Peak" },
    { time: "7:00 PM", hour: 19, reach: "High" },
  ],
  instagram: [
    { time: "11:00 AM", hour: 11, reach: "High" },
    { time: "1:00 PM", hour: 13, reach: "Peak" },
    { time: "8:00 PM", hour: 20, reach: "High" },
  ],
  facebook: [
    { time: "9:00 AM", hour: 9, reach: "High" },
    { time: "1:00 PM", hour: 13, reach: "Peak" },
    { time: "3:00 PM", hour: 15, reach: "High" },
  ],
  linkedin: [
    { time: "8:00 AM", hour: 8, reach: "High" },
    { time: "10:00 AM", hour: 10, reach: "Peak" },
    { time: "12:00 PM", hour: 12, reach: "High" },
  ],
  tiktok: [
    { time: "6:00 AM", hour: 6, reach: "High" },
    { time: "10:00 AM", hour: 10, reach: "Peak" },
    { time: "10:00 PM", hour: 22, reach: "High" },
  ],
  youtube: [
    { time: "12:00 PM", hour: 12, reach: "High" },
    { time: "3:00 PM", hour: 15, reach: "Peak" },
    { time: "7:00 PM", hour: 19, reach: "High" },
  ],
  threads: [
    { time: "9:00 AM", hour: 9, reach: "High" },
    { time: "1:00 PM", hour: 13, reach: "Peak" },
    { time: "6:00 PM", hour: 18, reach: "High" },
  ],
};

/* ============================================================
   Helpers
   ============================================================ */

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem("socialflow-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Effective calendar date for a post.
 * - published -> first variant's publishedAt
 * - scheduled -> scheduledAt
 * - draft    -> createdAt (so drafts can be browsed when filter=draft)
 */
function postDate(p: Post): Date | null {
  if (!p) return null;
  if (p.status === "published") {
    const publishedAt = p.variants.find((v) => v.publishedAt)?.publishedAt;
    if (publishedAt) return new Date(publishedAt);
  }
  if (p.scheduledAt) return new Date(p.scheduledAt);
  if (p.status === "draft") return new Date(p.createdAt);
  return null;
}

/**
 * Pending-approval heuristic: a draft with an approval-related field
 * attached (approvalNote / pendingApproval / reviewerId) is treated
 * as a synthetic "pending" status for display purposes. The Post
 * type doesn't ship these fields today, but this check is defensive
 * so the UI lights up automatically once the API starts returning them.
 */
function isPendingApproval(p: Post): boolean {
  if (p.status !== "draft") return false;
  const extended = p as Post & {
    approvalNote?: string | null;
    pendingApproval?: boolean | null;
    reviewerId?: string | null;
  };
  return Boolean(extended.approvalNote ?? extended.pendingApproval ?? extended.reviewerId);
}

function effectiveStatus(p: Post): EffectiveStatus {
  if (isPendingApproval(p)) return "pending";
  return p.status;
}

/**
 * Daily post-count series for the selected month (used as sparkline input).
 * For the current month, only days up to today are included (no future zeros).
 * For past/future months, all days of the month are included.
 * Returns [] when fewer than 2 days are available (Sparkline renders empty).
 */
function sparkForStatus(
  posts: Post[],
  status: EffectiveStatus | "all",
  month: Date
): number[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const now = new Date();
  const effectiveEnd =
    isSameMonth(month, now) && monthEnd.getTime() > now.getTime()
      ? now
      : monthEnd;
  const days = eachDayOfInterval({ start: monthStart, end: effectiveEnd });
  if (days.length < 2) return [];
  return days.map((d) =>
    posts.filter((p) => {
      const pd = postDate(p);
      if (!pd || !isSameDay(pd, d)) return false;
      if (status === "all") return true;
      return effectiveStatus(p) === status;
    }).length
  );
}

/**
 * Aggregated best-time hours across all platforms for a given day.
 * Peak = weight 2, High = weight 1. Sorted ascending by hour.
 * Used to render the small green dots in the Week/2-Week day cells.
 */
function bestTimeHoursForDay(): { hour: number; weight: number; reach: "High" | "Peak" }[] {
  const map = new Map<number, { weight: number; reach: "High" | "Peak" }>();
  for (const platform of PLATFORM_LIST) {
    for (const t of BEST_TIMES[platform.id]) {
      const w = t.reach === "Peak" ? 2 : 1;
      const existing = map.get(t.hour);
      if (existing) {
        existing.weight += w;
        if (t.reach === "Peak") existing.reach = "Peak";
      } else {
        map.set(t.hour, { weight: w, reach: t.reach });
      }
    }
  }
  return Array.from(map.entries())
    .map(([hour, v]) => ({ hour, weight: v.weight, reach: v.reach }))
    .sort((a, b) => a.hour - b.hour);
}

/* ============================================================
   ProgressToolbar — top sticky header with completion ring
   ============================================================ */
function ProgressToolbar({
  completion,
  viewMode,
  onToday,
  onNewPost,
}: {
  completion: number;
  viewMode: ViewMode;
  onToday: () => void;
  onNewPost: () => void;
}) {
  const modeLabel =
    viewMode === "month" ? "Month"
    : viewMode === "biweek" ? "2-Week"
    : viewMode === "week" ? "Week"
    : "Agenda";
  const modeColor =
    viewMode === "agenda" ? "text-violet-500"
    : viewMode === "week" ? "text-amber-500"
    : viewMode === "biweek" ? "text-emerald-500"
    : "text-primary";

  return (
    <div className="glass-strong glass-sheen sticky top-0 z-20 -mx-4 flex items-center gap-3 rounded-b-2xl px-4 py-2.5 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* Completion ring */}
      <div className="relative grid h-10 w-10 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="3"
            opacity="0.5"
          />
          <circle
            cx="18" cy="18" r="15.5"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(completion / 100) * 97.4} 97.4`}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute text-[9px] font-bold tabular-nums">
          {completion}%
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">Calendar</span>
          <span className={cn(
            "rounded-full bg-muted/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
            modeColor
          )}>
            {modeLabel}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {completion === 100
            ? "All caught up"
            : `${100 - completion}% left to engage with`}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToday}
          className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Jump to today"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Today</span>
        </button>
        <button
          onClick={onNewPost}
          className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Post</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ViewSwitcher — Month / 2-Week / Week / Agenda
   Uses the device-toggle pill style from composer's preview.
   ============================================================ */
function ViewSwitcher({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-muted/40 p-0.5">
      {VIEW_MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          title={m.label}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition",
            value === m.id
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <m.icon className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{m.label}</span>
          <span className="md:hidden">{m.short}</span>
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   FilterPanel — collapsible multi-filter card
   ============================================================ */
function FilterPanel({
  statusFilter,
  onStatusChange,
  platformFilter,
  onPlatformToggle,
  authorFilter,
  onAuthorChange,
  authors,
  platformCounts,
  onClear,
}: {
  statusFilter: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  platformFilter: Set<PlatformId>;
  onPlatformToggle: (p: PlatformId) => void;
  authorFilter: string | null;
  onAuthorChange: (id: string | null) => void;
  authors: { id: string; name: string }[];
  platformCounts: Record<PlatformId, number>;
  onClear: () => void;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const activeCount =
    (statusFilter !== "all" ? 1 : 0) +
    platformFilter.size +
    (authorFilter ? 1 : 0);

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
          <Hash className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Filters</span>
            {activeCount > 0 && (
              <Pill color="violet">{activeCount} active</Pill>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Narrow by status, platform, or author
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
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
          collapsed ? "" : "rotate-180"
        )} />
      </div>

      <div className={cn(
        "transition-all duration-300",
        collapsed ? "max-h-0 overflow-hidden opacity-0" : "max-h-[500px] opacity-100"
      )}>
        <div className="mt-3 space-y-3">
          {/* Status pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-liquid pb-1">
            <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Status:
            </span>
            {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => onStatusChange(f)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                  statusFilter === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          {/* Platform multi-select chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-liquid pb-1">
            <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Platform:
            </span>
            {PLATFORM_LIST.map((p) => {
              const active = platformFilter.has(p.id);
              const count = platformCounts[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => onPlatformToggle(p.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold transition",
                    active
                      ? "text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                  style={active ? { background: p.color } : undefined}
                  title={`${p.name} — ${count} post${count === 1 ? "" : "s"}`}
                >
                  <PlatformBadge platform={p.id} size={14} />
                  <span>{p.name}</span>
                  <span className={cn(
                    "rounded-full px-1 py-0 text-[9px] tabular-nums",
                    active ? "bg-white/20" : "bg-muted"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Author dropdown */}
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Author:
            </span>
            <select
              value={authorFilter ?? ""}
              onChange={(e) => onAuthorChange(e.target.value || null)}
              className="min-w-0 flex-1 rounded-lg border border-border/50 bg-background/60 px-2 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-primary/40"
            >
              <option value="">All authors</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* ============================================================
   PostCard — draggable card with quick actions on hover
   ============================================================ */
function PostCard({
  post,
  dt,
  compact = false,
  onEdit,
  onDuplicate,
  onDelete,
  onView,
}: {
  post: Post;
  dt: Date | null;
  compact?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const platform = post.variants[0]?.platform;
  const accentColor = platform ? PLATFORMS[platform].accent : "var(--primary)";
  const status = effectiveStatus(post);

  return (
    <div
      className={cn(
        "group/post relative flex items-center gap-1.5 rounded-lg border border-border/40 bg-background/70 px-1.5 py-1 transition hover:border-primary/30 hover:shadow-sm",
        compact ? "min-w-0" : ""
      )}
      style={{ borderLeft: `2px solid ${accentColor}` }}
    >
      {platform && <PlatformBadge platform={platform} size={14} />}
      <span className={cn("truncate text-[10px] font-medium", compact ? "flex-1" : "min-w-0")}>
        {post.title}
      </span>
      <Pill
        color={STATUS_PILL_COLOR[status]}
        className="ml-auto shrink-0 px-1 py-0 text-[8px] leading-tight capitalize"
      >
        {status === "pending" ? "Pending" : dt ? format(dt, "HH:mm") : status}
      </Pill>

      {/* Quick actions on hover */}
      <div className="pointer-events-none absolute right-0.5 top-0.5 flex items-center gap-0.5 rounded-md bg-background/90 p-0.5 opacity-0 shadow-sm backdrop-blur transition group-hover/post:pointer-events-auto group-hover/post:opacity-100">
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground transition hover:text-primary"
          title="View details"
        >
          <Eye className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground transition hover:text-primary"
          title="Edit in composer"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground transition hover:text-emerald-500"
          title="Duplicate post"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="grid h-5 w-5 place-items-center rounded text-muted-foreground transition hover:text-rose-500"
          title="Delete post"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   DayCell — month/week grid cell (draggable drop target)
   Implemented as a div role=button to avoid nested <button> elements
   (the quick-action toolbar inside PostCard uses real buttons).
   ============================================================ */
function DayCell({
  day,
  posts,
  inMonth,
  isTodayCell,
  isSelected,
  isDragOver,
  onSelect,
  onDrop,
  onDragOver,
  onDragLeave,
  onPostAction,
  bestTimes,
}: {
  day: Date;
  posts: Post[];
  inMonth: boolean;
  isTodayCell: boolean;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onPostAction: (p: Post, action: PostAction) => void;
  bestTimes: { hour: number; weight: number; reach: "High" | "Peak" }[];
}) {
  const visible = posts.slice(0, 3);
  const overflow = posts.length - visible.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "relative min-h-[96px] rounded-xl border border-border/30 bg-muted/20 p-1.5 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        !inMonth && "opacity-40",
        isSelected && "ring-2 ring-primary",
        isTodayCell && "border-primary",
        isDragOver && "border-dashed border-primary bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
            isTodayCell
              ? "bg-primary text-primary-foreground"
              : isSelected
              ? "bg-foreground text-background"
              : "text-foreground/80"
          )}
        >
          {format(day, "d")}
        </span>
        {posts.length > 0 && (
          <Pill color="neutral" className="px-1 py-0 text-[9px]">
            {posts.length}
          </Pill>
        )}
      </div>

      <div className="mt-1 space-y-1">
        {visible.map((p) => {
          const dt = postDate(p);
          return (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", p.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onClick={(e) => {
                e.stopPropagation();
                onPostAction(p, "view");
              }}
            >
              <PostCard
                post={p}
                dt={dt}
                compact
                onEdit={() => onPostAction(p, "edit")}
                onDuplicate={() => onPostAction(p, "duplicate")}
                onDelete={() => onPostAction(p, "delete")}
                onView={() => onPostAction(p, "view")}
              />
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="px-1 text-[9px] font-semibold text-primary">
            +{overflow} more
          </div>
        )}
      </div>

      {/* Best-time-to-post dots — shown in Week / 2-Week view when cell is empty */}
      {bestTimes.length > 0 && visible.length === 0 && (
        <div className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-0.5">
          {bestTimes.slice(0, 5).map((bt) => (
            <span
              key={bt.hour}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                bt.reach === "Peak" ? "bg-emerald-500" : "bg-emerald-400/50"
              )}
              title={`Best time: ${bt.hour}:00 (${bt.reach})`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   AgendaDay — single day row in Agenda view (also drop target)
   ============================================================ */
function AgendaDay({
  day,
  posts,
  isTodayCell,
  isSelected,
  isDragOver,
  onSelect,
  onDrop,
  onDragOver,
  onDragLeave,
  onPostAction,
}: {
  day: Date;
  posts: Post[];
  isTodayCell: boolean;
  isSelected: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onPostAction: (p: Post, action: PostAction) => void;
}) {
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "rounded-xl border bg-muted/20 p-3 transition",
        isDragOver ? "border-dashed border-primary bg-primary/5" : "border-border/30",
        isTodayCell && "border-primary",
        isSelected && "ring-1 ring-primary/40"
      )}
    >
      <button
        onClick={onSelect}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
            isTodayCell ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
          )}
        >
          {format(day, "d")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{format(day, "EEEE, MMM d")}</div>
          <div className="text-[10px] text-muted-foreground">
            {posts.length === 0
              ? "No posts"
              : `${posts.length} post${posts.length === 1 ? "" : "s"}`}
          </div>
        </div>
        {isTodayCell && <Pill color="green" className="ml-auto shrink-0">Today</Pill>}
      </button>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
          <CalendarDays className="h-4 w-4 text-muted-foreground/50" />
          <span className="text-[11px] text-muted-foreground">
            Nothing scheduled for this day.
          </span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {posts.map((p) => {
            const dt = postDate(p);
            return (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", p.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => onPostAction(p, "view")}
              >
                <PostCard
                  post={p}
                  dt={dt}
                  onEdit={() => onPostAction(p, "edit")}
                  onDuplicate={() => onPostAction(p, "duplicate")}
                  onDelete={() => onPostAction(p, "delete")}
                  onView={() => onPostAction(p, "view")}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PostDetailModal — View action modal
   ============================================================ */
function PostDetailModal({
  post,
  onClose,
  onEdit,
}: {
  post: Post | null;
  onClose: () => void;
  onEdit: (p: Post) => void;
}) {
  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-w-xl" aria-describedby={undefined}>
        {post && <PostDetailBody post={post} onEdit={onEdit} />}
      </DialogContent>
    </Dialog>
  );
}

function PostDetailBody({ post, onEdit }: { post: Post; onEdit: (p: Post) => void }) {
  const dt = postDate(post);
  const status = effectiveStatus(post);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {post.variants[0]?.platform && (
            <PlatformBadge platform={post.variants[0].platform} size={20} />
          )}
          <span className="truncate">{post.title}</span>
          <Pill color={STATUS_PILL_COLOR[status]} className="ml-auto shrink-0 capitalize">
            {status}
          </Pill>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-3">
        {/* Author + time */}
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <NameAvatar name={post.authorName} className="h-6 w-6 text-[9px]" />
          <span className="font-semibold">{post.authorName}</span>
          <span className="text-muted-foreground/40">·</span>
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="tabular-nums text-muted-foreground">
            {dt ? format(dt, "MMM d, yyyy 'at' HH:mm") : "No schedule"}
          </span>
        </div>

        {/* Media */}
        {post.mediaUrl && (
          <div className="overflow-hidden rounded-xl border border-border/40">
            <img src={post.mediaUrl} alt="" className="h-40 w-full object-cover" />
          </div>
        )}

        {/* Caption */}
        {post.caption && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Caption
            </div>
            <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed">
              {post.caption}
            </p>
          </div>
        )}

        {/* Variants */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Variants ({post.variants.length})
          </div>
          <div className="mt-1.5 max-h-60 space-y-1.5 overflow-y-auto scroll-liquid">
            {post.variants.map((v) => (
              <div
                key={v.id}
                className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/20 p-2"
              >
                <PlatformBadge platform={v.platform} size={20} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold">{v.handle}</span>
                    <Pill color={STATUS_PILL_COLOR[v.status as EffectiveStatus]} className="capitalize text-[9px]">
                      {v.status}
                    </Pill>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                    {v.content}
                  </p>
                  {(v.likes + v.comments + v.shares > 0) && (
                    <div className="mt-1 flex gap-2 text-[9px] text-muted-foreground">
                      <span>{v.likes} likes</span>
                      <span>{v.comments} comments</span>
                      <span>{v.shares} shares</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogClose asChild>
        <button
          onClick={() => onEdit(post)}
          className="liquid-pill flex items-center gap-1.5 self-start rounded-xl px-3 py-1.5 text-xs font-semibold"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit in composer
        </button>
      </DialogClose>
    </>
  );
}

/* ============================================================
   ConfirmDeleteDialog
   ============================================================ */
function ConfirmDeleteDialog({
  post,
  onClose,
  onConfirm,
  deleting,
}: {
  post: Post | null;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <Dialog open={!!post} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Delete post
          </DialogTitle>
        </DialogHeader>
        <p className="text-[12px] text-muted-foreground">
          Are you sure you want to delete{" "}
          <strong className="text-foreground">{post?.title}</strong>? This action
          cannot be undone and will remove all {post?.variants.length ?? 0}{" "}
          variant{post?.variants.length === 1 ? "" : "s"} and their analytics data.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <DialogClose asChild>
            <button
              onClick={onClose}
              className="rounded-xl border border-border/50 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            {deleting ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   CalendarView — main
   ============================================================ */
export function CalendarView() {
  const { data, loading, reload } = useApi<Post[]>("/api/posts");
  const { openComposer, openComposerWithPost } = useNav();
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";

  const [currentMonth, setCurrentMonth] = React.useState<Date>(() =>
    startOfMonth(new Date())
  );
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [selectedDay, setSelectedDay] = React.useState<Date>(() => new Date());
  const [platformFilter, setPlatformFilter] = React.useState<Set<PlatformId>>(
    () => new Set()
  );
  const [authorFilter, setAuthorFilter] = React.useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);
  const [detailPost, setDetailPost] = React.useState<Post | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Post | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [hoveredPost, setHoveredPost] = React.useState<Post | null>(null);

  const allPosts = data ?? [];

  // Distinct authors list (for filter dropdown)
  const authors = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allPosts) {
      if (!map.has(p.authorId)) map.set(p.authorId, p.authorName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allPosts]);

  // Per-platform variant counts (across all posts, regardless of filters)
  const platformCounts = React.useMemo(() => {
    const counts = {} as Record<PlatformId, number>;
    for (const p of PLATFORM_LIST) counts[p.id] = 0;
    for (const post of allPosts) {
      for (const v of post.variants) {
        counts[v.platform] = (counts[v.platform] ?? 0) + 1;
      }
    }
    return counts;
  }, [allPosts]);

  // Apply filters (status + platforms + author)
  const filtered = React.useMemo(() => {
    let result = allPosts;
    if (statusFilter !== "all") {
      result = result.filter((p) => effectiveStatus(p) === statusFilter);
    }
    if (platformFilter.size > 0) {
      result = result.filter((p) =>
        p.variants.some((v) => platformFilter.has(v.platform))
      );
    }
    if (authorFilter) {
      result = result.filter((p) => p.authorId === authorFilter);
    }
    return result;
  }, [allPosts, statusFilter, platformFilter, authorFilter]);

  // Build day grid based on view mode
  const gridDays = React.useMemo(() => {
    const today = new Date();
    if (viewMode === "month") {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(monthStart);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: gridStart, end: gridEnd });
    }
    if (viewMode === "biweek") {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 13) });
    }
    if (viewMode === "week") {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: addDays(start, 6) });
    }
    // agenda: next 30 days starting today
    const start = startOfDay(today);
    return eachDayOfInterval({ start, end: addDays(start, 29) });
  }, [currentMonth, viewMode]);

  // Group posts by day key (yyyy-MM-dd)
  const postsByDay = React.useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of filtered) {
      const d = postDate(p);
      if (!d) continue;
      const key = format(d, "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const da = postDate(a)?.getTime() ?? 0;
        const db = postDate(b)?.getTime() ?? 0;
        return da - db;
      });
    }
    return map;
  }, [filtered]);

  // Month-level stats for the metric row
  const monthPostTotal = React.useMemo(
    () =>
      allPosts.filter((p) => {
        const d = postDate(p);
        return d ? isSameMonth(d, currentMonth) : false;
      }).length,
    [allPosts, currentMonth]
  );

  const scheduledCount = React.useMemo(
    () =>
      allPosts.filter((p) => {
        if (p.status !== "scheduled") return false;
        const d = postDate(p);
        return d ? isSameMonth(d, currentMonth) : false;
      }).length,
    [allPosts, currentMonth]
  );

  const publishedCount = React.useMemo(
    () =>
      allPosts.filter((p) => {
        if (p.status !== "published") return false;
        const d = postDate(p);
        return d ? isSameMonth(d, currentMonth) : false;
      }).length,
    [allPosts, currentMonth]
  );

  const draftCount = allPosts.filter((p) => p.status === "draft").length;
  const pendingApprovalCount = allPosts.filter(isPendingApproval).length;

  // Dense metric strip — 5 metrics with inline sparklines.
  const metrics: Metric[] = React.useMemo(
    () => [
      {
        label: "Posts this month",
        value: monthPostTotal,
        spark: sparkForStatus(allPosts, "all", currentMonth),
        color: "var(--primary)",
      },
      {
        label: "Scheduled",
        value: scheduledCount,
        spark: sparkForStatus(allPosts, "scheduled", currentMonth),
        color: "oklch(0.72 0.16 230)",
      },
      {
        label: "Published",
        value: publishedCount,
        spark: sparkForStatus(allPosts, "published", currentMonth),
        color: "oklch(0.74 0.18 165)",
      },
      {
        label: "Drafts",
        value: draftCount,
        spark: sparkForStatus(allPosts, "draft", currentMonth),
        color: "oklch(0.66 0.22 305)",
      },
      {
        label: "Pending Approval",
        value: pendingApprovalCount,
        spark: sparkForStatus(allPosts, "pending", currentMonth),
        color: "oklch(0.78 0.18 75)",
      },
    ],
    [
      allPosts,
      currentMonth,
      monthPostTotal,
      scheduledCount,
      publishedCount,
      draftCount,
      pendingApprovalCount,
    ]
  );

  const selectedDayKey = format(selectedDay, "yyyy-MM-dd");
  const selectedDayPosts = postsByDay.get(selectedDayKey) ?? [];

  // Completion % for ProgressToolbar — 4 conditions × 25% each
  const completion = React.useMemo(() => {
    let pct = 0;
    if (!isSameMonth(currentMonth, new Date())) pct += 25;
    if (statusFilter !== "all" || platformFilter.size > 0 || authorFilter !== null) pct += 25;
    if (!isSameDay(selectedDay, new Date())) pct += 25;
    if (hoveredPost) pct += 25;
    return pct;
  }, [currentMonth, statusFilter, platformFilter, authorFilter, selectedDay, hoveredPost]);

  // ===== Drag-and-drop reschedule =====
  const reschedule = React.useCallback(
    async (postId: string, newDate: Date) => {
      const original = allPosts.find((p) => p.id === postId);
      const dt = original ? postDate(original) : null;
      const target = new Date(newDate);
      // Preserve the original time-of-day if the post had one; default to 9am.
      if (dt) {
        target.setHours(dt.getHours(), dt.getMinutes(), 0, 0);
      } else {
        target.setHours(9, 0, 0, 0);
      }
      const token = getAuthToken();
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            scheduledAt: target.toISOString(),
            status: "scheduled",
          }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        toast.success("Post rescheduled", {
          description: `Moved to ${format(target, "MMM d 'at' HH:mm")}`,
        });
        reload({ silent: true });
      } catch (e) {
        toast.error("Failed to reschedule", {
          description: e instanceof Error ? e.message : "Network error",
        });
      }
    },
    [allPosts, reload]
  );

  // ===== Duplicate post =====
  const duplicate = React.useCallback(
    async (post: Post) => {
      try {
        const body = {
          title: `${post.title} (copy)`,
          caption: post.caption,
          mediaUrl: post.mediaUrl,
          tone: post.tone,
          scheduledAt: null,
          accountIds: post.variants.map((v) => v.accountId),
          variants: Object.fromEntries(
            post.variants.map((v) => [
              v.accountId,
              { content: v.content, hashtags: v.hashtags ?? "" },
            ])
          ),
          authorId: currentUserId || post.authorId,
        };
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        toast.success("Post duplicated", {
          description: `"${post.title}" copied as a new draft.`,
        });
        reload({ silent: true });
      } catch (e) {
        toast.error("Failed to duplicate", {
          description: e instanceof Error ? e.message : "Network error",
        });
      }
    },
    [currentUserId, reload]
  );

  // ===== Delete post =====
  const handleDelete = React.useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${confirmDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      toast.success("Post deleted", {
        description: `"${confirmDelete.title}" was removed.`,
      });
      if (detailPost?.id === confirmDelete.id) setDetailPost(null);
      setConfirmDelete(null);
      reload({ silent: true });
    } catch (e) {
      toast.error("Failed to delete", {
        description: e instanceof Error ? e.message : "Network error",
      });
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, detailPost, reload]);

  const handlePostAction = React.useCallback(
    (p: Post, action: PostAction) => {
      if (action === "edit") {
        openComposerWithPost(p);
        toast.info(`Loaded "${p.title}" into composer`);
      } else if (action === "duplicate") {
        duplicate(p);
      } else if (action === "delete") {
        setConfirmDelete(p);
      } else if (action === "view") {
        setDetailPost(p);
      }
    },
    [duplicate, openComposerWithPost]
  );

  function goToday() {
    const t = new Date();
    setCurrentMonth(startOfMonth(t));
    setSelectedDay(t);
  }

  function clearFilters() {
    setStatusFilter("all");
    setPlatformFilter(new Set());
    setAuthorFilter(null);
  }

  if (loading || !data) return <CalendarSkeleton />;

  // Month-level empty state: only fires in Month view with zero posts
  // for the visible month AND no filters hiding things.
  const isMonthEmpty =
    viewMode === "month" &&
    monthPostTotal === 0 &&
    filtered.length === 0 &&
    statusFilter === "all" &&
    platformFilter.size === 0 &&
    !authorFilter;

  // Static best-time list (computed once per render is fine — the underlying
  // BEST_TIMES map never changes)
  const bestTimes = bestTimeHoursForDay();

  return (
    <div className="space-y-4">
      <ProgressToolbar
        completion={completion}
        viewMode={viewMode}
        onToday={goToday}
        onNewPost={() => openComposer()}
      />

      <HelpText module="calendar">
        <strong className="text-foreground">Calendar</strong> shows your scheduled
        and published posts. Drag a post to reschedule, click to inspect, or use
        the filters to focus on specific platforms or authors.
      </HelpText>

      <MetricRow metrics={metrics} />

      <FilterPanel
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformToggle={(p) =>
          setPlatformFilter((prev) => {
            const next = new Set(prev);
            if (next.has(p)) next.delete(p);
            else next.add(p);
            return next;
          })
        }
        authorFilter={authorFilter}
        onAuthorChange={setAuthorFilter}
        authors={authors}
        platformCounts={platformCounts}
        onClear={clearFilters}
      />

      {/* Mobile view-switcher row (separate from calendar header so it stays reachable) */}
      <div className="flex items-center justify-between gap-2 md:hidden">
        <ViewSwitcher value={viewMode} onChange={setViewMode} />
        {viewMode === "month" && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="grid h-8 w-8 place-items-center rounded-xl bg-muted/60 transition hover:bg-muted"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="grid h-8 w-8 place-items-center rounded-xl bg-muted/60 transition hover:bg-muted"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Calendar container — card #1 */}
        <GlassCard strong className="glass-sheen relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <SectionHeader
            title={
              viewMode === "month"
                ? format(currentMonth, "MMMM yyyy")
                : viewMode === "biweek"
                ? "Next 2 Weeks"
                : viewMode === "week"
                ? "This Week"
                : "Next 30 Days"
            }
            desc={
              viewMode === "month"
                ? "Content pipeline — click a day to inspect"
                : viewMode === "agenda"
                ? "Chronological list of upcoming posts"
                : "Green dots = peak engagement windows"
            }
            action={
              <div className="hidden items-center gap-1.5 md:flex">
                <ViewSwitcher value={viewMode} onChange={setViewMode} />
                {viewMode === "month" && (
                  <>
                    <button
                      onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-muted/60 transition hover:bg-muted"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                      className="grid h-8 w-8 place-items-center rounded-xl bg-muted/60 transition hover:bg-muted"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            }
          />

          {isMonthEmpty ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                <CalendarDays className="h-7 w-7" />
              </div>
              <div>
                <div className="text-sm font-bold">
                  No posts in {format(currentMonth, "MMMM")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Your content pipeline is empty for this month.
                </div>
              </div>
              <button
                onClick={() => openComposer()}
                className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5" /> Compose your first post
              </button>
            </div>
          ) : viewMode === "agenda" ? (
            <div className="max-h-[640px] space-y-2 overflow-y-auto scroll-liquid -mx-1 px-1">
              {gridDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const posts = postsByDay.get(key) ?? [];
                return (
                  <AgendaDay
                    key={key}
                    day={day}
                    posts={posts}
                    isTodayCell={isToday(day)}
                    isSelected={isSameDay(day, selectedDay)}
                    isDragOver={dragOverKey === key}
                    onSelect={() => setSelectedDay(day)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = e.dataTransfer.getData("text/plain");
                      setDragOverKey(null);
                      if (id) reschedule(id, day);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverKey(key);
                    }}
                    onDragLeave={() =>
                      setDragOverKey((k) => (k === key ? null : k))
                    }
                    onPostAction={handlePostAction}
                  />
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto scroll-liquid pb-1">
              <div className="min-w-[620px]">
                {/* Weekday header */}
                <div className="mb-1.5 grid grid-cols-7 gap-1.5">
                  {WEEKDAYS.map((w) => (
                    <div
                      key={w}
                      className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1.5">
                  {gridDays.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const posts = postsByDay.get(key) ?? [];
                    const inMonth = isSameMonth(day, currentMonth);
                    const today = isToday(day);
                    const isSelected = isSameDay(day, selectedDay);
                    const showBestTimes =
                      viewMode === "week" || viewMode === "biweek";
                    return (
                      <DayCell
                        key={key}
                        day={day}
                        posts={posts}
                        inMonth={inMonth}
                        isTodayCell={today}
                        isSelected={isSelected}
                        isDragOver={dragOverKey === key}
                        onSelect={() => setSelectedDay(day)}
                        onDrop={(e) => {
                          e.preventDefault();
                          const id = e.dataTransfer.getData("text/plain");
                          setDragOverKey(null);
                          if (id) reschedule(id, day);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          setDragOverKey(key);
                        }}
                        onDragLeave={() =>
                          setDragOverKey((k) => (k === key ? null : k))
                        }
                        onPostAction={handlePostAction}
                        bestTimes={showBestTimes ? bestTimes : []}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Day detail sidebar — card #2 */}
        <GlassCard className="p-4">
          <SectionHeader
            title={format(selectedDay, "EEEE")}
            desc={format(selectedDay, "MMM d, yyyy")}
            action={<Pill color="neutral">{selectedDayPosts.length} posts</Pill>}
          />

          <div className="max-h-[70vh] overflow-y-auto scroll-liquid -mx-4">
            {selectedDayPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div className="text-sm text-muted-foreground">
                  Nothing scheduled for this day.
                </div>
                <button
                  onClick={() => openComposer()}
                  className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Compose your first post
                </button>
              </div>
            ) : (
              selectedDayPosts.map((p) => {
                const dt = postDate(p);
                const status = effectiveStatus(p);
                const canRepublish = p.status === "draft" || p.status === "failed";
                const accentColor = p.variants[0]
                  ? PLATFORMS[p.variants[0].platform].accent
                  : "var(--primary)";
                return (
                  <ListRow
                    key={p.id}
                    className="flex-col !items-stretch gap-2 px-4 py-2.5 hover:bg-muted/40"
                  >
                    <div
                      className="flex gap-2.5"
                      onMouseEnter={() => setHoveredPost(p)}
                      onMouseLeave={() => setHoveredPost(null)}
                    >
                      <div
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted"
                        style={{ borderTop: `2px solid ${accentColor}` }}
                      >
                        {p.mediaUrl ? (
                          <img
                            src={p.mediaUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-muted-foreground">
                            <CalendarClock className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold">
                            {p.title}
                          </span>
                          <Pill
                            color={STATUS_PILL_COLOR[status]}
                            className="ml-auto shrink-0 capitalize"
                          >
                            {status}
                          </Pill>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5 shrink-0" />
                          <span className="tabular-nums">
                            {dt ? format(dt, "HH:mm") : "—"}
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <NameAvatar
                            name={p.authorName}
                            className="h-3.5 w-3.5 text-[7px]"
                          />
                          <span className="truncate">{p.authorName}</span>
                        </div>
                        <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                          {p.caption}
                        </div>
                      </div>
                    </div>

                    {/* Platform badges + quick actions */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        {p.variants.slice(0, 4).map((v) => (
                          <PlatformBadge
                            key={v.id}
                            platform={v.platform}
                            size={14}
                          />
                        ))}
                        {p.variants.length > 4 && (
                          <span className="text-[9px] text-muted-foreground">
                            +{p.variants.length - 4}
                          </span>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          onClick={() => handlePostAction(p, "view")}
                          className="grid h-6 w-6 place-items-center rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition hover:text-primary"
                          title="View details"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handlePostAction(p, "duplicate")}
                          className="grid h-6 w-6 place-items-center rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition hover:text-emerald-500"
                          title="Duplicate"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handlePostAction(p, "delete")}
                          className="grid h-6 w-6 place-items-center rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition hover:text-rose-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            openComposerWithPost(p);
                            toast.info(`Loaded "${p.title}" into composer`, {
                              description: canRepublish
                                ? "Edit and republish when ready."
                                : "Reschedule or publish now.",
                            });
                          }}
                          className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/60 px-2 py-1 text-[10px] font-semibold text-foreground transition hover:bg-primary hover:text-primary-foreground"
                        >
                          <RotateCw className="h-2.5 w-2.5" />
                          {canRepublish ? "Republish" : "Edit"}
                        </button>
                      </div>
                    </div>
                  </ListRow>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>

      <PostDetailModal
        post={detailPost}
        onClose={() => setDetailPost(null)}
        onEdit={(p) => {
          setDetailPost(null);
          openComposerWithPost(p);
        }}
      />

      <ConfirmDeleteDialog
        post={confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  );
}

/* ============================================================
   CalendarSkeleton — initial loading state
   ============================================================ */
function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-10 rounded-xl" />
      <div className="shimmer h-10 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="shimmer h-[640px] rounded-3xl" />
        <div className="shimmer h-[640px] rounded-3xl" />
      </div>
    </div>
  );
}
