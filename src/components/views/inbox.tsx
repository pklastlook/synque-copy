"use client";

import * as React from "react";
import {
  AlertCircle,
  Archive,
  AtSign,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Circle,
  Clock,
  Filter,
  Frown,
  Inbox as InboxIcon,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Smile,
  Sparkles,
  Trash2,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApi, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge, PlatformPill, VerifiedTick } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import {
  ListRow,
  MetricRow,
  Pill,
  SectionHeader,
  Sparkline,
  type Metric,
} from "@/components/glass/dense-ui";
import { PLATFORMS, PLATFORM_LIST, type PlatformId } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import type { Comment } from "@/lib/types";

/* ============================================================
   Inbox — modern master-detail view.
   Matches the composer + calendar design language:
   - Top sticky ProgressToolbar with circular completion ring
   - Collapsible FilterPanel (composer CollapsibleSection pattern)
   - Sentiment pulse stream at the top of the list
   - Per-row hover quick actions
   - AI reply suggestions above the reply textarea
   - Sticky bulk-action bar when 2+ rows are selected
   - Mobile: list -> detail navigation (state-driven, no router)

   API surface preserved (unchanged):
     GET    /api/inbox?filter=unread     (server-side unread filter)
     GET    /api/inbox                    (all conversations)
     GET    /api/team                     (assignee picker)
     POST   /api/inbox/[id]/reply         (send reply)
     PATCH  /api/inbox { id, replied, replyText, assigneeId }
     DELETE /api/inbox/[id]               (delete conversation)
   ============================================================ */

/* ============================================================
   Types & constants
   ============================================================ */

type FilterId = "all" | "unread" | "mention" | "mine";
type SentimentFilter = "all" | "positive" | "neutral" | "negative";
type PriorityFilter = "all" | "high" | "normal";
type DateRange = "24h" | "7d" | "30d" | "all";
type SortBy = "newest" | "oldest" | "engagement" | "negative";

interface TeamMemberLite {
  id: string;
  name: string;
  avatar: string | null;
}

/** Defensive extension of Comment — `repliedAt` and `replyText` exist in the
 *  Prisma schema and are written by /api/inbox/[id]/reply, but they aren't on
 *  the TS Comment type today. Reading them defensively so the threaded
 *  timeline lights up the moment the API starts returning them. */
type InboxComment = Comment & {
  repliedAt?: string | null;
  replyText?: string | null;
};

const TOP_FILTERS: { id: FilterId; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "All", icon: InboxIcon },
  { id: "unread", label: "Unread", icon: Circle },
  { id: "mention", label: "Mentions", icon: AtSign },
  { id: "mine", label: "Mine", icon: UserPlus },
];

const TYPE_ICON: Record<Comment["type"], LucideIcon> = {
  comment: MessageSquare,
  message: Mail,
  mention: AtSign,
};

const SENTIMENT_OPTIONS: {
  id: SentimentFilter;
  label: string;
  pillColor: "neutral" | "green" | "blue" | "rose";
}[] = [
  { id: "all", label: "All", pillColor: "neutral" },
  { id: "positive", label: "Positive", pillColor: "green" },
  { id: "neutral", label: "Neutral", pillColor: "blue" },
  { id: "negative", label: "Negative", pillColor: "rose" },
];

const DATE_RANGES: { id: DateRange; label: string; ms: number }[] = [
  { id: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { id: "7d", label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "30d", label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { id: "all", label: "All time", ms: Number.POSITIVE_INFINITY },
];

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "engagement", label: "Most engagement" },
  { id: "negative", label: "Negative first" },
];

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "🔥"] as const;

/* ============================================================
   Helpers
   ============================================================ */

function sentimentPillColor(s: Comment["sentiment"]): "green" | "rose" | "neutral" {
  if (s === "positive") return "green";
  if (s === "negative") return "rose";
  return "neutral";
}

function sentimentDotClass(s: Comment["sentiment"]): string {
  if (s === "positive") return "bg-emerald-500";
  if (s === "negative") return "bg-rose-500";
  return "bg-muted-foreground/50";
}

/** True when the comment text mentions a handle that matches the current user.
 *  AuthUser has no `handle` field, so we derive one from the first name. */
function isMentionForUser(c: Comment, userName: string | null): boolean {
  if (!userName) return false;
  const first = userName.toLowerCase().split(/\s+/)[0];
  if (!first) return false;
  const text = c.text.toLowerCase();
  return text.includes("@" + first) || text.includes("@" + userName.toLowerCase().replace(/\s+/g, ""));
}

/** Engagement heuristic — Comment type doesn't carry likes/shares today,
 *  so we approximate using text length (longer = more engagement) plus a
 *  recency boost. Used only for the "Most engagement" sort. */
function engagementScore(c: Comment): number {
  const ageMs = Date.now() - new Date(c.createdAt).getTime();
  const ageHours = Math.max(1, ageMs / (60 * 60 * 1000));
  return c.text.length / Math.log2(ageHours + 2);
}

/** Returns true when the comment is considered "high priority":
 *  negative sentiment OR a direct mention of the current user. */
function isHighPriority(c: Comment, userName: string | null): boolean {
  return c.sentiment === "negative" || isMentionForUser(c, userName);
}

/** Highlights substring matches in `text` for the active `query`. */
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark
        key={key++}
        className="rounded bg-primary/30 px-0.5 text-foreground"
      >
        {text.slice(idx, idx + ql.length)}
      </mark>
    );
    i = idx + ql.length;
  }
  return <>{out}</>;
}

/* ============================================================
   ProgressToolbar — top sticky header with circular completion ring.
   Pattern copied from composer.tsx & calendar.tsx.
   ============================================================ */
function ProgressToolbar({
  completion,
  unreadCount,
  refreshing,
  onRefresh,
  onMarkAllRead,
}: {
  completion: number;
  unreadCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onMarkAllRead: () => void;
}) {
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
            stroke="var(--primary)"
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
          <span className="text-[11px] font-bold leading-tight sm:text-xs">Inbox</span>
          <span className="rounded px-1 py-0 text-[7px] font-bold uppercase leading-tight tracking-wider sm:text-[8px] bg-muted/50 text-primary">
            Inbox
          </span>
        </div>
        <div className="text-[8px] leading-tight text-muted-foreground sm:text-[9px]">
          {completion === 100
            ? "All caught up"
            : `${unreadCount} unread · ${100 - completion}% left to engage`}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          title="Mark all visible as read"
        >
          <CheckCircle2 className="h-3 w-3" />
          <span className="hidden sm:inline">Mark all read</span>
        </button>
        <button
          onClick={onRefresh}
          className="grid h-7 w-7 place-items-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
          title="Refresh inbox"
          aria-label="Refresh inbox"
        >
          <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SentimentStream — horizontal stacked bar showing sentiment pulse.
   ============================================================ */
function SentimentStream({ comments }: { comments: InboxComment[] }) {
  const counts = React.useMemo(() => {
    const c = { positive: 0, neutral: 0, negative: 0 };
    for (const cm of comments) c[cm.sentiment]++;
    return c;
  }, [comments]);

  const total = comments.length;
  const segs = [
    { label: "Positive", count: counts.positive, cls: "bg-emerald-500" },
    { label: "Neutral", count: counts.neutral, cls: "bg-blue-500" },
    { label: "Negative", count: counts.negative, cls: "bg-rose-500" },
  ] as const;

  return (
    <div className="border-b border-border/40 px-3 py-2.5">
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          Sentiment pulse
        </span>
        <span className="tabular-nums">{total} shown</span>
      </div>
      {total === 0 ? (
        <div className="h-2 w-full rounded-full bg-muted" />
      ) : (
        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
          {segs.map(
            (s) =>
              s.count > 0 && (
                <div
                  key={s.label}
                  className={cn("transition-all duration-500", s.cls)}
                  style={{ width: `${(s.count / total) * 100}%` }}
                  title={`${s.label}: ${s.count}`}
                />
              )
          )}
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        {segs.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", s.cls)} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-bold tabular-nums">{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   FilterPanel — collapsible multi-filter card.
   Uses the CollapsibleSection pattern from composer.tsx.
   ============================================================ */
function FilterPanel({
  sentiment,
  onSentimentChange,
  platformFilter,
  onPlatformToggle,
  showMentions,
  onToggleMentions,
  showUnanswered,
  onToggleUnanswered,
  priority,
  onPriorityChange,
  dateRange,
  onDateRangeChange,
  sortBy,
  onSortByChange,
  platformCounts,
  activeCount,
  onClear,
  defaultOpen = false,
}: {
  sentiment: SentimentFilter;
  onSentimentChange: (s: SentimentFilter) => void;
  platformFilter: Set<PlatformId>;
  onPlatformToggle: (p: PlatformId) => void;
  showMentions: boolean;
  onToggleMentions: () => void;
  showUnanswered: boolean;
  onToggleUnanswered: () => void;
  priority: PriorityFilter;
  onPriorityChange: (p: PriorityFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (d: DateRange) => void;
  sortBy: SortBy;
  onSortByChange: (s: SortBy) => void;
  platformCounts: Record<PlatformId, number>;
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
          <Filter className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Filters</span>
            {activeCount > 0 && <Pill color="violet">{activeCount} active</Pill>}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Narrow by sentiment, platform, mention, priority & date
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
            collapsed ? "" : "rotate-180"
          )}
        />
      </div>

      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "max-h-0 overflow-hidden opacity-0" : "max-h-[1200px] opacity-100"
        )}
      >
        <div className="mt-3 space-y-3">
          {/* Sentiment */}
          <FilterRow label="Sentiment">
            {SENTIMENT_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.id}
                active={sentiment === opt.id}
                onClick={() => onSentimentChange(opt.id)}
              >
                {opt.label}
              </FilterChip>
            ))}
          </FilterRow>

          {/* Platform multi-select */}
          <FilterRow label="Platform">
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
                  title={`${p.name} — ${count} comment${count === 1 ? "" : "s"}`}
                >
                  <PlatformBadge platform={p.id} size={14} />
                  <span>{p.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1 py-0 text-[9px] tabular-nums",
                      active ? "bg-white/20" : "bg-muted"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </FilterRow>

          {/* Toggles: mentions + unanswered */}
          <FilterRow label="Show only">
            <ToggleChip active={showMentions} onClick={onToggleMentions} icon={AtSign}>
              Mentions of me
            </ToggleChip>
            <ToggleChip active={showUnanswered} onClick={onToggleUnanswered} icon={Circle}>
              Unanswered
            </ToggleChip>
          </FilterRow>

          {/* Priority */}
          <FilterRow label="Priority">
            {(
              [
                { id: "all" as const, label: "All" },
                { id: "high" as const, label: "High" },
                { id: "normal" as const, label: "Normal" },
              ]
            ).map((opt) => (
              <FilterChip
                key={opt.id}
                active={priority === opt.id}
                onClick={() => onPriorityChange(opt.id)}
              >
                {opt.label}
              </FilterChip>
            ))}
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              High = negative or mention
            </span>
          </FilterRow>

          {/* Date range */}
          <FilterRow label="Date">
            {DATE_RANGES.map((d) => (
              <FilterChip
                key={d.id}
                active={dateRange === d.id}
                onClick={() => onDateRangeChange(d.id)}
              >
                {d.label}
              </FilterChip>
            ))}
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
        "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted"
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
          : "bg-muted/60 text-muted-foreground hover:bg-muted"
      )}
      aria-pressed={active}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}

/* ============================================================
   ConversationRow — list item with hover quick actions.
   ============================================================ */
function ConversationRow({
  c,
  isSelected,
  isCheckboxShown,
  isChecked,
  onPick,
  onToggleCheck,
  onToggleRead,
  onArchive,
  onDelete,
  canDelete,
  onAssignOpen,
  onReactOpen,
  query,
  currentUserName,
}: {
  c: InboxComment;
  isSelected: boolean;
  isCheckboxShown: boolean;
  isChecked: boolean;
  onPick: () => void;
  onToggleCheck: () => void;
  onToggleRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
  canDelete: boolean;
  onAssignOpen: (e: React.MouseEvent) => void;
  onReactOpen: (e: React.MouseEvent) => void;
  query: string;
  currentUserName: string | null;
}) {
  const TypeIcon = TYPE_ICON[c.type];
  const isUnread = !c.replied;
  const isMention = isMentionForUser(c, currentUserName);
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-2.5 border-b border-border/30 px-3 py-2.5 transition-colors hover:bg-muted/40",
        isSelected && "bg-primary/5 border-l-2 border-l-primary"
      )}
      onClick={onPick}
    >
      {/* Bulk-select checkbox — appears whenever any row is checked. */}
      {isCheckboxShown && (
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggleCheck}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--primary)]"
          aria-label={`Select ${c.author}'s message`}
        />
      )}

      {/* Platform avatar with sentiment dot */}
      <div className="relative shrink-0">
        <PlatformBadge platform={c.platform} size={28} />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background",
            sentimentDotClass(c.sentiment)
          )}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-xs",
              isUnread ? "font-bold" : "font-semibold"
            )}
          >
            {c.author}
          </span>
          {isMention && (
            <AtSign className="h-3 w-3 shrink-0 text-primary" aria-label="mention" />
          )}
          <TypeIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            {timeAgo(c.createdAt)}
          </span>
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-[11px]",
            isUnread ? "text-foreground/80" : "text-muted-foreground"
          )}
        >
          {highlightMatch(c.text, query)}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="truncate text-[10px] text-muted-foreground">@{c.handle}</span>
          {c.assigneeName && (
            <Pill color="blue" className="ml-auto">
              {c.assigneeName}
            </Pill>
          )}
          {isUnread && (
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-primary",
                c.assigneeName ? "ml-1.5" : "ml-auto"
              )}
              aria-label="unread"
            />
          )}
        </div>
      </div>

      {/* Hover quick actions */}
      <div className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-lg bg-background/90 p-0.5 opacity-0 shadow-sm backdrop-blur transition group-hover:pointer-events-auto group-hover:opacity-100">
        <RowActionButton
          title={isUnread ? "Mark as read" : "Mark as unread"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleRead();
          }}
        >
          {isUnread ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          ) : (
            <Circle className="h-3 w-3 text-muted-foreground" />
          )}
        </RowActionButton>
        <RowActionButton
          title="Archive"
          onClick={(e) => {
            e.stopPropagation();
            onArchive();
          }}
        >
          <Archive className="h-3 w-3 text-muted-foreground" />
        </RowActionButton>
        <RowActionButton
          title="Assign"
          onClick={onAssignOpen}
        >
          <UserPlus className="h-3 w-3 text-muted-foreground" />
        </RowActionButton>
        <RowActionButton
          title="React"
          onClick={onReactOpen}
        >
          <Smile className="h-3 w-3 text-muted-foreground" />
        </RowActionButton>
        {canDelete && (
          <RowActionButton
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 text-rose-500" />
          </RowActionButton>
        )}
      </div>
    </div>
  );
}

function RowActionButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="grid h-5 w-5 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

/* ============================================================
   EmojiPopover — tiny inline popover for quick reactions.
   ============================================================ */
function EmojiPopover({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-1.5 top-9 z-20 flex items-center gap-1 rounded-xl border border-border/60 bg-popover/95 p-1.5 shadow-xl backdrop-blur-xl">
        {QUICK_EMOJIS.map((emo) => (
          <button
            key={emo}
            onClick={(e) => {
              e.stopPropagation();
              onPick(emo);
            }}
            className="grid h-7 w-7 place-items-center rounded-lg text-base transition hover:bg-muted"
            title={`React with ${emo}`}
          >
            {emo}
          </button>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   AssigneePopover — opens next to the row that triggered it.
   ============================================================ */
function AssigneePopover({
  members,
  currentAssignee,
  onPick,
  onClose,
}: {
  members: TeamMemberLite[];
  currentAssignee: string | null;
  onPick: (member: TeamMemberLite | null) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-1.5 top-9 z-20 max-h-60 w-56 overflow-y-auto rounded-xl border border-border/60 bg-popover/95 p-1 shadow-xl backdrop-blur-xl scroll-liquid">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPick(null);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted"
        >
          <Circle className="h-3 w-3 text-muted-foreground" />
          <span>Unassign</span>
        </button>
        {members.length === 0 ? (
          <div className="px-2.5 py-1.5 text-[10px] text-muted-foreground">No team members</div>
        ) : (
          members.map((m) => (
            <button
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                onPick(m);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted",
                currentAssignee === m.name && "bg-primary/5"
              )}
            >
              <NameAvatar name={m.name} src={m.avatar} className="h-5 w-5 text-[8px]" />
              <span className="truncate">{m.name}</span>
              {currentAssignee === m.name && (
                <Check className="ml-auto h-3 w-3 text-primary" />
              )}
            </button>
          ))
        )}
      </div>
    </>
  );
}

/* ============================================================
   ThreadedTimeline — vertical timeline with comment + user reply.
   ============================================================ */
function ThreadedTimeline({ comment }: { comment: InboxComment }) {
  const TypeIcon = TYPE_ICON[comment.type];
  const repliedAt = comment.repliedAt ?? null;
  const replyText = comment.replyText ?? null;

  return (
    <div className="space-y-3">
      {/* Original comment */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <NameAvatar name={comment.author} src={comment.authorAvatar} className="h-9 w-9 text-[10px]" />
          <div className="mt-1 w-px flex-1 bg-border/50" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold">{comment.author}</span>
            <Pill color={sentimentPillColor(comment.sentiment)} className="capitalize">
              {comment.sentiment}
            </Pill>
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <TypeIcon className="h-3 w-3" />
            <span className="capitalize">{comment.type}</span>
            <span className="opacity-50">·</span>
            <PlatformPill platform={comment.platform} handle={comment.handle} />
          </div>
          <p className="mt-2 rounded-xl bg-muted/30 p-3 text-sm leading-relaxed">
            {comment.text}
          </p>
        </div>
      </div>

      {/* User reply (if any) */}
      {replyText && (
        <div className="flex flex-row-reverse gap-3">
          <div className="flex flex-col items-center">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="mt-1 w-px flex-1 bg-border/50" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold">You replied</span>
              <Pill color="green">
                <CheckCircle2 className="h-2.5 w-2.5" /> Replied
              </Pill>
              {repliedAt && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timeAgo(repliedAt)}
                </span>
              )}
            </div>
            <p className="mt-2 rounded-xl bg-primary/5 p-3 text-sm leading-relaxed">
              {replyText}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   AISuggestions — 3 reply drafts generated by /api/ai/chat.
   ============================================================ */
function AISuggestions({
  comment,
  tone,
  onApply,
}: {
  comment: InboxComment;
  tone: string;
  onApply: (draft: string) => void;
}) {
  const [drafts, setDrafts] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fetchedFor, setFetchedFor] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Generate 3 short, friendly reply drafts for this social media comment.
Tone: ${tone}.
Comment author: ${comment.author}.
Comment text: "${comment.text.slice(0, 600)}".

Return them as a numbered list (1. 2. 3.). Each draft should be under 220 characters, sound natural, and avoid hashtags.`;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          tone,
          platforms: [comment.platform],
          currentCaption: "",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        reply?: string;
        suggestions?: string[];
      };
      // suggestions are preferred; otherwise fall back to splitting the reply.
      let list: string[] = [];
      if (Array.isArray(json.suggestions) && json.suggestions.length > 0) {
        list = json.suggestions.slice(0, 3);
      } else if (typeof json.reply === "string" && json.reply.trim()) {
        list = json.reply
          .split(/\n+/)
          .map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim())
          .filter((l) => l.length > 4 && l.length < 600)
          .slice(0, 3);
      }
      if (list.length === 0) {
        throw new Error("No drafts returned");
      }
      setDrafts(list);
      setFetchedFor(comment.id);
    } catch {
      setError("Couldn't generate drafts. Try again in a moment.");
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [comment.id, comment.author, comment.text, comment.platform, tone]);

  // Auto-fetch when the selected comment changes.
  React.useEffect(() => {
    if (fetchedFor === comment.id) return;
    load();
  }, [comment.id, fetchedFor, load]);

  if (error) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{error}</span>
        <button
          onClick={load}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Bot className="h-3.5 w-3.5 text-primary" />
          AI reply drafts
          <Pill color="violet" className="ml-1">{tone}</Pill>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          title="Regenerate drafts"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </button>
      </div>
      {loading && drafts.length === 0 ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="shimmer h-16 rounded-xl border border-border/40 bg-muted/30"
            />
          ))}
        </div>
      ) : drafts.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {drafts.map((d, i) => (
            <button
              key={i}
              onClick={() => onApply(d)}
              className="group/draft relative rounded-xl border border-border/40 bg-muted/30 p-3 text-left text-xs leading-relaxed transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/60"
            >
              <span className="absolute right-2 top-2 text-[9px] font-bold text-muted-foreground/60">
                {i + 1}
              </span>
              <span className="line-clamp-4">{d}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-primary opacity-0 transition group-hover/draft:opacity-100">
                <Sparkles className="h-3 w-3" />
                Use this
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================
   BulkActionBar — sticky bottom action bar for multi-select.
   Pattern mirrors composer's StickyPublishBar.
   ============================================================ */
function BulkActionBar({
  count,
  onClear,
  onMarkRead,
  onArchive,
  onAssign,
  onDelete,
  busy,
}: {
  count: number;
  onClear: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
  onAssign: () => void;
  onDelete: () => void;
  busy: boolean;
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
          <BulkButton onClick={onMarkRead} disabled={busy} icon={CheckCircle2}>
            Mark read
          </BulkButton>
          <BulkButton onClick={onArchive} disabled={busy} icon={Archive}>
            Archive
          </BulkButton>
          <BulkButton onClick={onAssign} disabled={busy} icon={UserPlus}>
            Assign
          </BulkButton>
          <BulkButton onClick={onDelete} disabled={busy} icon={Trash2} tone="rose">
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
  tone?: "default" | "rose";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "hidden items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50 sm:flex",
        tone === "rose" && "text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

/* ============================================================
   EmptyState — friendly empty / no-match state.
   ============================================================ */
function EmptyState({
  icon: Icon = InboxIcon,
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
      <div className="max-w-[260px] text-xs text-muted-foreground">{desc}</div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ============================================================
   InboxView — main exported component.
   ============================================================ */
export function InboxView() {
  const [filter, setFilter] = React.useState<FilterId>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [query, setQuery] = React.useState("");
  // Mobile: tapping a row reveals the detail panel full-width.
  const [mobileShowDetail, setMobileShowDetail] = React.useState(false);
  // Bulk selection
  const [checkedIds, setCheckedIds] = React.useState<Set<string>>(new Set());
  // FilterPanel state
  const [sentiment, setSentiment] = React.useState<SentimentFilter>("all");
  const [platformFilter, setPlatformFilter] = React.useState<Set<PlatformId>>(new Set());
  const [showMentions, setShowMentions] = React.useState(false);
  const [showUnanswered, setShowUnanswered] = React.useState(false);
  const [priority, setPriority] = React.useState<PriorityFilter>("all");
  const [dateRange, setDateRange] = React.useState<DateRange>("all");
  const [sortBy, setSortBy] = React.useState<SortBy>("newest");
  const [showFiltersMobile, setShowFiltersMobile] = React.useState(false);
  // Popover anchors — track the comment id whose popover is open
  const [assignOpenFor, setAssignOpenFor] = React.useState<string | null>(null);
  const [emojiOpenFor, setEmojiOpenFor] = React.useState<string | null>(null);
  // Refresh flag (just toggles to trigger useApi reload via URL change)
  const [refreshing, setRefreshing] = React.useState(false);
  // Bulk-action busy state
  const [bulkBusy, setBulkBusy] = React.useState(false);

  // Current user — for "Mine" filter, mention detection, delete permissions.
  const currentUserName = useAuth((s) => s.user?.name ?? null);

  // Server-side "unread" filter preserves the original URL behaviour.
  const url = filter === "unread" ? "/api/inbox?filter=unread" : "/api/inbox";
  const { data, loading, reload } = useApi<InboxComment[]>(url);

  // Lazy-load team only when an assignee popover is opened.
  const { data: team } = useApi<TeamMemberLite[]>(assignOpenFor ? "/api/team" : null);
  const members = team ?? [];

  const all = data ?? [];

  // Platform counts (pre-filter — shows the universe of platforms).
  const platformCounts = React.useMemo(() => {
    const counts = {} as Record<PlatformId, number>;
    for (const p of PLATFORM_LIST) counts[p.id] = 0;
    for (const c of all) counts[c.platform] = (counts[c.platform] ?? 0) + 1;
    return counts;
  }, [all]);

  // Filter + sort pipeline (client-side on top of the server response).
  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const rangeMs = DATE_RANGES.find((d) => d.id === dateRange)?.ms ?? Number.POSITIVE_INFINITY;
    const now = Date.now();
    const filtered = all.filter((c) => {
      if (q) {
        const hay = `${c.author}\n${c.text}\n${c.handle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "unread" || filter === "all") {
        // top pill matches the server filter — fall through
      } else if (filter === "mention") {
        if (!isMentionForUser(c, currentUserName)) return false;
      } else if (filter === "mine") {
        if (!currentUserName || c.assigneeName !== currentUserName) return false;
      }
      if (sentiment !== "all" && c.sentiment !== sentiment) return false;
      if (platformFilter.size > 0 && !platformFilter.has(c.platform)) return false;
      if (showMentions && !isMentionForUser(c, currentUserName)) return false;
      if (showUnanswered && c.replied) return false;
      if (priority === "high" && !isHighPriority(c, currentUserName)) return false;
      if (priority === "normal" && isHighPriority(c, currentUserName)) return false;
      if (rangeMs !== Number.POSITIVE_INFINITY) {
        const age = now - new Date(c.createdAt).getTime();
        if (age > rangeMs) return false;
      }
      return true;
    });

    // Sort
    const sorted = [...filtered];
    if (sortBy === "newest") {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === "engagement") {
      sorted.sort((a, b) => engagementScore(b) - engagementScore(a));
    } else if (sortBy === "negative") {
      sorted.sort((a, b) => {
        const rank = (s: Comment["sentiment"]) => (s === "negative" ? 0 : s === "neutral" ? 1 : 2);
        if (rank(a.sentiment) !== rank(b.sentiment)) return rank(a.sentiment) - rank(b.sentiment);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return sorted;
  }, [all, query, filter, sentiment, platformFilter, showMentions, showUnanswered, priority, dateRange, sortBy, currentUserName]);

  const unreadCount = React.useMemo(() => all.filter((c) => !c.replied).length, [all]);
  const repliedCount = React.useMemo(() => all.filter((c) => c.replied).length, [all]);

  // Completion % — derived from filter/search/selection + replied ratio.
  const completion = React.useMemo(() => {
    if (all.length === 0) return 0;
    const base = Math.round((repliedCount / all.length) * 60);
    const bonus =
      (filter !== "all" ? 10 : 0) +
      (query.trim() ? 10 : 0) +
      (selectedId ? 10 : 0) +
      (sentiment !== "all" || platformFilter.size > 0 || showMentions || showUnanswered || priority !== "all" || dateRange !== "all" ? 10 : 0);
    return Math.min(100, base + bonus);
  }, [all.length, repliedCount, filter, query, selectedId, sentiment, platformFilter, showMentions, showUnanswered, priority, dateRange]);

  // Selected comment is looked up against `all` (not `visible`) so the detail
  // panel keeps showing it even when search narrows the list.
  const selected = React.useMemo(
    () => (selectedId ? all.find((c) => c.id === selectedId) ?? null : null),
    [all, selectedId]
  );

  // Top metrics strip — modern dense MetricRow.
  const metrics: Metric[] = React.useMemo(() => {
    const pos = visible.filter((c) => c.sentiment === "positive").length;
    const neg = visible.filter((c) => c.sentiment === "negative").length;
    const mentions = visible.filter((c) => isMentionForUser(c, currentUserName)).length;
    const sentimentTrend = visible.slice(0, 14).map((c) => (c.sentiment === "positive" ? 2 : c.sentiment === "negative" ? 0 : 1));
    return [
      {
        label: "Unread",
        value: unreadCount,
        color: "var(--primary)",
        spark: all.slice(0, 14).map((c) => (c.replied ? 0 : 1)),
      },
      {
        label: "Replied",
        value: repliedCount,
        color: "oklch(0.76 0.18 145)",
        spark: all.slice(0, 14).map((c) => (c.replied ? 1 : 0)),
      },
      {
        label: "Positive",
        value: pos,
        delta: visible.length ? Math.round((pos / Math.max(1, visible.length)) * 100) - 50 : 0,
        color: "oklch(0.76 0.18 145)",
        spark: sentimentTrend,
      },
      {
        label: "Mentions",
        value: mentions,
        color: "oklch(0.7 0.18 230)",
        spark: visible.slice(0, 14).map((c) => (isMentionForUser(c, currentUserName) ? 1 : 0)),
      },
    ];
  }, [visible, all, unreadCount, repliedCount, currentUserName]);

  // ---------- Actions ----------
  const handleFilterChange = (f: FilterId) => {
    setFilter(f);
    setSelectedId(null);
    setReplyText("");
    setMobileShowDetail(false);
    setAssignOpenFor(null);
    setEmojiOpenFor(null);
  };

  const selectRow = (c: InboxComment) => {
    setSelectedId(c.id);
    setReplyText("");
    setMobileShowDetail(true);
    setAssignOpenFor(null);
    setEmojiOpenFor(null);
  };

  const backToList = () => setMobileShowDetail(false);

  const refreshNow = () => {
    setRefreshing(true);
    reload();
    // Brief spinner — reload() resolves async, but the UX feedback is enough.
    setTimeout(() => setRefreshing(false), 600);
  };

  const markReplied = async (c: InboxComment, replied = true) => {
    try {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, replied }),
      });
      if (!res.ok) throw new Error("patch failed");
      toast.success(replied ? "Marked as replied" : "Marked unread");
      reload();
    } catch {
      toast.error("Could not update — try again");
    }
  };

  const markAllRead = async () => {
    const targets = visible.filter((c) => !c.replied);
    if (targets.length === 0) {
      toast.info("Nothing to mark read");
      return;
    }
    try {
      await Promise.all(
        targets.map((c) =>
          fetch("/api/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: c.id, replied: true }),
          })
        )
      );
      toast.success(`Marked ${targets.length} read`);
      reload();
    } catch {
      toast.error("Could not update all");
    }
  };

  const assignTo = async (c: InboxComment, memberId: string | null, memberName: string | null) => {
    try {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, assigneeId: memberId }),
      });
      if (!res.ok) throw new Error("assign failed");
      toast.success(memberName ? `Assigned to ${memberName}` : "Assignment cleared");
      setAssignOpenFor(null);
      reload();
    } catch {
      toast.error("Could not assign — try again");
    }
  };

  const archiveConversation = async (c: InboxComment) => {
    // Archive = mark replied + clear assignment (best-effort on the current API).
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, replied: true, assigneeId: null }),
      });
      toast.success("Archived");
      if (selectedId === c.id) {
        setSelectedId(null);
        setMobileShowDetail(false);
      }
      reload();
    } catch {
      toast.error("Could not archive");
    }
  };

  const quickReact = async (c: InboxComment, emoji: string) => {
    setEmojiOpenFor(null);
    toast.success(`Reacted with ${emoji}`, {
      description: `Quick reaction queued for ${c.author}'s comment.`,
    });
    // No API endpoint exists for reactions today — the toast is the UX.
  };

  const deleteConversation = async (c: InboxComment) => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/inbox/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      toast.success("Conversation deleted");
      if (selectedId === c.id) {
        setSelectedId(null);
        setMobileShowDetail(false);
        setReplyText("");
      }
      setAssignOpenFor(null);
      setEmojiOpenFor(null);
      reload();
    } catch {
      toast.error("Could not delete — try again");
    }
  };

  const sendReply = async () => {
    if (!selected) return;
    if (!replyText.trim()) {
      toast.error("Write a reply first");
      return;
    }
    try {
      const res = await fetch(`/api/inbox/${selected.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyText: replyText.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        postedToPlatform?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to reply");

      if (json.postedToPlatform) {
        toast.success("Reply posted to platform!", {
          description: `Your reply was published on ${PLATFORMS[selected.platform].name}.`,
        });
      } else {
        toast.success("Reply saved", {
          description: json.error ?? json.message ?? "Stored locally — platform API not configured.",
        });
      }
      setReplyText("");
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not send — try again");
    }
  };

  // ---------- Bulk actions ----------
  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearChecks = () => setCheckedIds(new Set());

  const bulkMarkRead = async () => {
    setBulkBusy(true);
    try {
      await Promise.all(
        Array.from(checkedIds).map((id) =>
          fetch("/api/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, replied: true }),
          })
        )
      );
      toast.success(`Marked ${checkedIds.size} read`);
      clearChecks();
      reload();
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkArchive = async () => {
    setBulkBusy(true);
    try {
      await Promise.all(
        Array.from(checkedIds).map((id) =>
          fetch("/api/inbox", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, replied: true, assigneeId: null }),
          })
        )
      );
      toast.success(`Archived ${checkedIds.size}`);
      clearChecks();
      reload();
    } catch {
      toast.error("Bulk archive failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${checkedIds.size} conversations? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        Array.from(checkedIds).map((id) =>
          fetch(`/api/inbox/${id}`, { method: "DELETE" })
        )
      );
      toast.success(`Deleted ${checkedIds.size}`);
      clearChecks();
      if (selectedId && checkedIds.has(selectedId)) {
        setSelectedId(null);
        setMobileShowDetail(false);
      }
      reload();
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkAssign = () => {
    // Open the assignee popover by piggy-backing on the first selected row.
    const firstChecked = Array.from(checkedIds)[0];
    if (firstChecked) {
      setAssignOpenFor(firstChecked);
      toast.info("Pick a team member to assign all selected");
    }
  };

  // ---------- Derived: clear filters ----------
  const clearAllFilters = () => {
    setSentiment("all");
    setPlatformFilter(new Set());
    setShowMentions(false);
    setShowUnanswered(false);
    setPriority("all");
    setDateRange("all");
    setSortBy("newest");
    setQuery("");
  };

  const activeFilterCount =
    (sentiment !== "all" ? 1 : 0) +
    platformFilter.size +
    (showMentions ? 1 : 0) +
    (showUnanswered ? 1 : 0) +
    (priority !== "all" ? 1 : 0) +
    (dateRange !== "all" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const anyChecked = checkedIds.size > 0;

  if (loading && !data) return <InboxSkeleton />;

  return (
    <div className="space-y-3 pb-20">
      <ProgressToolbar
        completion={completion}
        unreadCount={unreadCount}
        refreshing={refreshing}
        onRefresh={refreshNow}
        onMarkAllRead={markAllRead}
      />

      <HelpText module="inbox">
        <strong className="text-foreground">Inbox</strong> collects comments, messages, and mentions from every connected account. Pick a conversation to reply.
      </HelpText>

      {/* Top metrics strip */}
      <MetricRow metrics={metrics} />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* ============ MASTER LIST ============ */}
        <div
          className={cn(
            "flex flex-col gap-3",
            // On mobile, hide when the detail panel is showing.
            mobileShowDetail && "hidden lg:flex"
          )}
        >
          {/* Top filter pills (quick filters) */}
          <GlassCard className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto scroll-liquid">
                {TOP_FILTERS.map((f) => {
                  const Icon = f.icon;
                  const active = filter === f.id;
                  const showBadge = f.id === "unread" && unreadCount > 0;
                  return (
                    <button
                      key={f.id}
                      onClick={() => handleFilterChange(f.id)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {f.label}
                      {showBadge && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 text-[9px] font-bold",
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary/20 text-primary"
                          )}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Mobile: filters trigger button */}
              <button
                onClick={() => setShowFiltersMobile(true)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
                aria-label="Open filters"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search author, text or handle…"
                aria-label="Search conversations"
                className="w-full rounded-lg border border-border/60 bg-background/60 py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </GlassCard>

          {/* FilterPanel — desktop */}
          <div className="hidden lg:block">
            <FilterPanel
              sentiment={sentiment}
              onSentimentChange={setSentiment}
              platformFilter={platformFilter}
              onPlatformToggle={(p) =>
                setPlatformFilter((prev) => {
                  const next = new Set(prev);
                  if (next.has(p)) next.delete(p);
                  else next.add(p);
                  return next;
                })
              }
              showMentions={showMentions}
              onToggleMentions={() => setShowMentions((v) => !v)}
              showUnanswered={showUnanswered}
              onToggleUnanswered={() => setShowUnanswered((v) => !v)}
              priority={priority}
              onPriorityChange={setPriority}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              platformCounts={platformCounts}
              activeCount={activeFilterCount}
              onClear={clearAllFilters}
            />
          </div>

          {/* Conversation list card */}
          <GlassCard className="flex min-h-[480px] flex-1 flex-col overflow-hidden p-0">
            <SectionHeader
              title="Conversations"
              desc="Comments, messages & mentions"
              icon={InboxIcon}
              className="mb-0 border-b border-border/40 px-3 py-2.5"
              action={
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  {unreadCount} unread
                </span>
              }
            />
            <SentimentStream comments={visible} />

            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {visible.length} {visible.length === 1 ? "conversation" : "conversations"}
              </span>
              {anyChecked && (
                <button
                  onClick={clearChecks}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  Clear selection
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto scroll-liquid">
              {all.length === 0 ? (
                <EmptyState
                  icon={InboxIcon}
                  title="No messages yet"
                  desc="When people comment on your posts, their messages will appear here."
                />
              ) : visible.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No matches"
                  desc="No conversations match your current filters."
                  action={
                    <button
                      onClick={clearAllFilters}
                      className="liquid-pill rounded-xl px-3 py-1.5 text-xs font-semibold"
                    >
                      Clear filters
                    </button>
                  }
                />
              ) : (
                visible.map((c) => {
                  const isSelected = selected?.id === c.id;
                  const isCheckboxShown = anyChecked;
                  const canDelete =
                    !c.assigneeName || c.assigneeName === currentUserName;
                  return (
                    <div key={c.id} className="relative">
                      <ConversationRow
                        c={c}
                        isSelected={isSelected}
                        isCheckboxShown={isCheckboxShown}
                        isChecked={checkedIds.has(c.id)}
                        onPick={() => selectRow(c)}
                        onToggleCheck={() => toggleCheck(c.id)}
                        onToggleRead={() => markReplied(c, !c.replied)}
                        onArchive={() => archiveConversation(c)}
                        onDelete={() => deleteConversation(c)}
                        canDelete={canDelete}
                        onAssignOpen={(e) => {
                          e.stopPropagation();
                          setAssignOpenFor(assignOpenFor === c.id ? null : c.id);
                          setEmojiOpenFor(null);
                        }}
                        onReactOpen={(e) => {
                          e.stopPropagation();
                          setEmojiOpenFor(emojiOpenFor === c.id ? null : c.id);
                          setAssignOpenFor(null);
                        }}
                        query={query}
                        currentUserName={currentUserName}
                      />
                      {assignOpenFor === c.id && (
                        <AssigneePopover
                          members={members}
                          currentAssignee={c.assigneeName}
                          onPick={(m) => assignTo(c, m?.id ?? null, m?.name ?? null)}
                          onClose={() => setAssignOpenFor(null)}
                        />
                      )}
                      {emojiOpenFor === c.id && (
                        <EmojiPopover
                          onPick={(emo) => quickReact(c, emo)}
                          onClose={() => setEmojiOpenFor(null)}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

        {/* ============ DETAIL PANEL ============ */}
        <GlassCard
          className={cn(
            "flex flex-col overflow-hidden p-0",
            // On mobile, hide when no row is selected yet.
            !mobileShowDetail && "hidden lg:flex"
          )}
        >
          {!selected ? (
            <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                <InboxIcon className="h-7 w-7" />
              </div>
              <div>
                <div className="text-base font-semibold">Select a conversation</div>
                <div className="text-sm text-muted-foreground">
                  Pick something on the left to read and reply.
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[70vh] flex-col">
              {/* Detail header */}
              <div className="flex items-start gap-3 border-b border-border/40 p-4 sm:p-5">
                <button
                  onClick={backToList}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-foreground transition hover:bg-muted lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <NameAvatar
                  name={selected.author}
                  src={selected.authorAvatar}
                  className="h-11 w-11 text-sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-bold">{selected.author}</span>
                    <Pill color={sentimentPillColor(selected.sentiment)} className="capitalize">
                      {selected.sentiment}
                    </Pill>
                    {selected.replied && (
                      <Pill color="green">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Replied
                      </Pill>
                    )}
                    {isMentionForUser(selected, currentUserName) && (
                      <Pill color="violet">
                        <AtSign className="h-2.5 w-2.5" /> Mention
                      </Pill>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <PlatformPill platform={selected.platform} handle={selected.handle} />
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {timeAgo(selected.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto scroll-liquid p-4 sm:p-5">
                {/* Threaded timeline */}
                <ThreadedTimeline comment={selected} />

                {/* Inline metadata */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Posted
                    </span>
                    <span className="text-foreground">
                      {new Date(selected.createdAt).toLocaleString()}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Assigned
                    </span>
                    {selected.assigneeName ? (
                      <span className="inline-flex items-center gap-1">
                        <NameAvatar
                          name={selected.assigneeName}
                          className="h-4 w-4 text-[7px]"
                        />
                        <span className="font-semibold text-foreground">
                          {selected.assigneeName}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
                        <Circle className="h-2.5 w-2.5" /> Unassigned
                      </span>
                    )}
                  </span>
                </div>

                {/* AI reply drafts */}
                <AISuggestions
                  comment={selected}
                  tone="Friendly"
                  onApply={(draft) => {
                    setReplyText(draft);
                    toast.success("Draft added to reply box");
                  }}
                />

                {/* Reply composer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      Your reply
                    </div>
                    {replyText.length > 0 && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {replyText.length} chars
                      </span>
                    )}
                  </div>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply…"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border/60 bg-background/60 p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => markReplied(selected, !selected.replied)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
                          selected.replied
                            ? "bg-muted/60 text-foreground hover:bg-muted"
                            : "bg-emerald-500/10 text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400"
                        )}
                      >
                        {selected.replied ? (
                          <>
                            <Circle className="h-3.5 w-3.5" /> Mark unread
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark read
                          </>
                        )}
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setAssignOpenFor(assignOpenFor === selected.id ? null : selected.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {selected.assigneeName ? "Reassign" : "Assign"}
                        </button>
                        {assignOpenFor === selected.id && (
                          <AssigneePopover
                            members={members}
                            currentAssignee={selected.assigneeName}
                            onPick={(m) => assignTo(selected, m?.id ?? null, m?.name ?? null)}
                            onClose={() => setAssignOpenFor(null)}
                          />
                        )}
                      </div>
                      <button
                        onClick={() => archiveConversation(selected)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                      <button
                        onClick={() => deleteConversation(selected)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                    <button
                      onClick={sendReply}
                      className="liquid-pill ml-auto inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold"
                    >
                      <Send className="h-3.5 w-3.5" /> Send reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ============ Mobile filter sheet ============ */}
      {showFiltersMobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowFiltersMobile(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-border/60 bg-popover p-4 scroll-liquid">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold">Filters</span>
              <button
                onClick={() => setShowFiltersMobile(false)}
                className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-muted-foreground"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <FilterPanel
              sentiment={sentiment}
              onSentimentChange={setSentiment}
              platformFilter={platformFilter}
              onPlatformToggle={(p) =>
                setPlatformFilter((prev) => {
                  const next = new Set(prev);
                  if (next.has(p)) next.delete(p);
                  else next.add(p);
                  return next;
                })
              }
              showMentions={showMentions}
              onToggleMentions={() => setShowMentions((v) => !v)}
              showUnanswered={showUnanswered}
              onToggleUnanswered={() => setShowUnanswered((v) => !v)}
              priority={priority}
              onPriorityChange={setPriority}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              platformCounts={platformCounts}
              activeCount={activeFilterCount}
              onClear={clearAllFilters}
              defaultOpen
            />
          </div>
        </div>
      )}

      {/* ============ Bulk action bar ============ */}
      <BulkActionBar
        count={checkedIds.size}
        onClear={clearChecks}
        onMarkRead={bulkMarkRead}
        onArchive={bulkArchive}
        onAssign={bulkAssign}
        onDelete={bulkDelete}
        busy={bulkBusy}
      />
    </div>
  );
}

/* ============================================================
   InboxSkeleton — loading state.
   ============================================================ */
function InboxSkeleton() {
  return (
    <div className="space-y-3">
      <div className="shimmer h-12 rounded-2xl" />
      <div className="shimmer h-16 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="shimmer h-[80vh] rounded-3xl" />
        <div className="shimmer h-[80vh] rounded-3xl" />
      </div>
    </div>
  );
}
