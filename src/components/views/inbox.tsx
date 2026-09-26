"use client";

import * as React from "react";
import {
  AtSign,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Frown,
  Inbox as InboxIcon,
  Mail,
  MessageSquare,
  Search,
  Send,
  Smile,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useApi, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { PlatformBadge, PlatformPill } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { ListRow, SectionHeader, Pill } from "@/components/glass/dense-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import type { Comment } from "@/lib/types";

/**
 * Inbox — master-detail split layout (Apple Mail / Linear style).
 *
 * Left column (~340px): filter pills + search + dense ListRow of conversations.
 * Right column (fills width): selected conversation body, inline metadata,
 * reply textarea, action buttons (Send / Assign / Mark read-unread / Delete).
 *
 * On mobile: master list fills width; tapping a row navigates to detail
 * (state-driven, no router). Back button returns to the list.
 *
 * API surface preserved:
 *   GET  /api/inbox?filter=unread        (server-side unread filter)
 *   GET  /api/inbox                       (all conversations)
 *   GET  /api/team                        (assignee picker)
 *   POST /api/inbox/[id]/reply            (send reply — posts to platform or saves locally)
 *   PATCH /api/inbox { id, replied }      (mark read / unread)
 *   PATCH /api/inbox { id, assigneeId }    (assign / unassign)
 *   DELETE /api/inbox/[id]                (delete conversation)
 */

type FilterId = "all" | "unread" | "mention" | "positive" | "negative" | "mine";

const FILTERS: { id: FilterId; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: InboxIcon },
  { id: "unread", label: "Unread", icon: Circle },
  { id: "mention", label: "Mentions", icon: AtSign },
  { id: "positive", label: "Positive", icon: Smile },
  { id: "negative", label: "Negative", icon: Frown },
  { id: "mine", label: "Assigned to me", icon: UserPlus },
];

const TYPE_ICON: Record<Comment["type"], React.ElementType> = {
  comment: MessageSquare,
  message: Mail,
  mention: AtSign,
};

const SUGGESTED_REPLIES = [
  "Thanks so much for the love! 💛 Stay tuned for more drops coming this week.",
  "Appreciate you flagging this — our team is on it and will follow up shortly.",
];

interface TeamMemberLite {
  id: string;
  name: string;
  avatar: string | null;
}

function sentimentPillColor(s: Comment["sentiment"]): "green" | "rose" | "neutral" {
  if (s === "positive") return "green";
  if (s === "negative") return "rose";
  return "neutral";
}

function sentimentDotClass(s: Comment["sentiment"]) {
  if (s === "positive") return "bg-emerald-500";
  if (s === "negative") return "bg-rose-500";
  return "bg-muted-foreground/50";
}

export function InboxView() {
  const [filter, setFilter] = React.useState<FilterId>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [query, setQuery] = React.useState("");
  // Mobile: tapping a row reveals the detail panel full-width.
  const [mobileShowDetail, setMobileShowDetail] = React.useState(false);
  // Assignee picker popover.
  const [assignPickerOpen, setAssignPickerOpen] = React.useState(false);

  // Current user — for "Assigned to me" filter and "Reassign" highlighting.
  const currentUserName = useAuth((s) => s.user?.name ?? null);

  // Only "unread" filters server-side (preserves original URL behaviour).
  const url = filter === "unread" ? "/api/inbox?filter=unread" : "/api/inbox";
  const { data, loading, reload } = useApi<Comment[]>(url);

  // Lazy-load team only when assignee picker is opened.
  const { data: team } = useApi<TeamMemberLite[]>(assignPickerOpen ? "/api/team" : null);
  const members = team ?? [];

  const all = data ?? [];

  // Client-side filter + search.
  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((c) => {
      if (q) {
        const hay = `${c.author}\n${c.text}\n${c.handle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "all" || filter === "unread") return true;
      if (filter === "mention") return c.type === "mention";
      if (filter === "positive") return c.sentiment === "positive";
      if (filter === "negative") return c.sentiment === "negative";
      if (filter === "mine") return currentUserName ? c.assigneeName === currentUserName : false;
      return true;
    });
  }, [all, filter, query, currentUserName]);

  const unreadCount = React.useMemo(() => all.filter((c) => !c.replied).length, [all]);

  // Selected comment is looked up against `all` (not `visible`) so the detail
  // panel keeps showing it even while search is narrowing — that matches the
  // Apple Mail "I'm still reading this" experience.
  const selected = React.useMemo(
    () => (selectedId ? all.find((c) => c.id === selectedId) ?? null : null),
    [all, selectedId]
  );

  const handleFilterChange = (f: FilterId) => {
    setFilter(f);
    setSelectedId(null);
    setReplyText("");
    setMobileShowDetail(false);
    setAssignPickerOpen(false);
  };

  const selectRow = (c: Comment) => {
    setSelectedId(c.id);
    setReplyText("");
    setMobileShowDetail(true);
    setAssignPickerOpen(false);
  };

  const backToList = () => setMobileShowDetail(false);

  const markReplied = async (c: Comment, replied = true) => {
    try {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, replied }),
      });
      if (!res.ok) throw new Error("patch failed");
      if (replied) toast.success("Marked as replied");
      else toast.success("Marked unread");
      reload();
    } catch {
      toast.error("Could not update — try again");
    }
  };

  const markAllRead = async () => {
    try {
      await Promise.all(
        visible
          .filter((c) => !c.replied)
          .map((c) =>
            fetch("/api/inbox", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: c.id, replied: true }),
            })
          )
      );
      toast.success("All marked read");
      reload();
    } catch {
      toast.error("Could not update all");
    }
  };

  const assignTo = async (c: Comment, memberId: string | null, memberName: string | null) => {
    try {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, assigneeId: memberId }),
      });
      if (!res.ok) throw new Error("assign failed");
      toast.success(memberName ? `Assigned to ${memberName}` : "Assignment cleared");
      setAssignPickerOpen(false);
      reload();
    } catch {
      toast.error("Could not assign — try again");
    }
  };

  const deleteConversation = async (c: Comment) => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/inbox/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      toast.success("Conversation deleted");
      setSelectedId(null);
      setMobileShowDetail(false);
      setReplyText("");
      setAssignPickerOpen(false);
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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to reply");

      if (json.postedToPlatform) {
        toast.success("Reply posted to platform!", {
          description: `Your reply was published on ${selected.platform}.`,
        });
      } else {
        toast.success("Reply saved", {
          description: json.error ?? "Reply stored locally — platform API not configured.",
        });
      }
      setReplyText("");
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not send — try again");
    }
  };

  if (loading && !data) return <InboxSkeleton />;

  return (
    <div className="space-y-4">
      <HelpText module="inbox">
        <strong className="text-foreground">Inbox</strong> collects comments, messages, and mentions from every connected account. Pick a conversation to reply.
      </HelpText>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* ============ MASTER LIST ============ */}
        <GlassCard
          className={cn(
            "flex flex-col overflow-hidden p-0",
            // On mobile, hide when the detail panel is showing.
            mobileShowDetail && "hidden lg:flex"
          )}
        >
          {/* Header strip */}
          <div className="border-b border-border/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <SectionHeader
                title="Conversations"
                desc="Comments, messages & mentions"
                icon={InboxIcon}
                className="mb-0 flex-1"
              />
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                {unreadCount} unread
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pt-3">
            <div className="relative">
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
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const active = filter === f.id;
              const showBadge = f.id === "unread" && unreadCount > 0;
              return (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
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
                        active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/20 text-primary"
                      )}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* List meta row + list */}
          <div className="min-h-0 flex-1 overflow-y-auto scroll-liquid">
            <div className="flex items-center justify-between px-3 pb-1 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {visible.length} {visible.length === 1 ? "conversation" : "conversations"}
              </span>
              {visible.some((c) => !c.replied) && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-3 py-12 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <InboxIcon className="h-4 w-4" />
                </div>
                <div className="text-xs text-muted-foreground">
                  Nothing here. You&apos;re all caught up! ✨
                </div>
              </div>
            ) : (
              visible.map((c) => {
                const TypeIcon = TYPE_ICON[c.type];
                const isSelected = selected?.id === c.id;
                const isUnread = !c.replied;
                return (
                  <ListRow
                    key={c.id}
                    onClick={() => selectRow(c)}
                    active={isSelected}
                    className="gap-2.5 py-2.5"
                  >
                    {/* avatar with sentiment dot */}
                    <div className="relative shrink-0">
                      <PlatformBadge platform={c.platform} size={28} />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background",
                          sentimentDotClass(c.sentiment)
                        )}
                      />
                    </div>

                    {/* content */}
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
                        {c.text}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="truncate text-[10px] text-muted-foreground">
                          @{c.handle}
                        </span>
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
                  </ListRow>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* ============ DETAIL PANEL ============ */}
        <GlassCard
          className={cn(
            "overflow-hidden p-0",
            // On mobile, hide when no row is selected yet.
            !mobileShowDetail && "hidden lg:block"
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
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <PlatformPill platform={selected.platform} handle={selected.handle} />
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" /> {timeAgo(selected.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body + actions scrollable */}
              <div className="min-h-0 flex-1 overflow-y-auto scroll-liquid p-4 sm:p-5">
                {/* Comment body — readable block, not a card */}
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {React.createElement(TYPE_ICON[selected.type], { className: "h-3 w-3" })}
                  {selected.type}
                </div>
                <p className="mt-2 text-sm leading-relaxed">{selected.text}</p>

                {/* Inline metadata */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Account
                    </span>
                    <PlatformPill platform={selected.platform} handle={selected.handle} />
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Sentiment
                    </span>
                    <Pill color={sentimentPillColor(selected.sentiment)} className="capitalize">
                      {selected.sentiment}
                    </Pill>
                  </span>
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

                {/* Suggested replies */}
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Suggested replies
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SUGGESTED_REPLIES.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => setReplyText(r)}
                        className="rounded-xl border border-border/40 bg-muted/30 p-3 text-left text-xs leading-relaxed transition hover:-translate-y-0.5 hover:bg-muted/60"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reply composer — inline textarea, not a card */}
                <div className="mt-4 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply…"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border/60 bg-background/60 p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {/* Secondary actions */}
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

                      {/* Assign + picker popover */}
                      <div className="relative">
                        <button
                          onClick={() => setAssignPickerOpen((v) => !v)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {selected.assigneeName ? "Reassign" : "Assign"}
                        </button>
                        {assignPickerOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setAssignPickerOpen(false)}
                            />
                            <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-56 overflow-y-auto rounded-xl border border-border/60 bg-popover/95 p-1 shadow-xl backdrop-blur-xl scroll-liquid">
                              <button
                                onClick={() => assignTo(selected, null, null)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted"
                              >
                                <Circle className="h-3 w-3 text-muted-foreground" />
                                <span>Unassign</span>
                              </button>
                              {members.length === 0 ? (
                                <div className="px-2.5 py-1.5 text-[10px] text-muted-foreground">
                                  No team members
                                </div>
                              ) : (
                                members.map((m) => (
                                  <button
                                    key={m.id}
                                    onClick={() => assignTo(selected, m.id, m.name)}
                                    className={cn(
                                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-muted",
                                      selected.assigneeName === m.name && "bg-primary/5"
                                    )}
                                  >
                                    <NameAvatar
                                      name={m.name}
                                      src={m.avatar}
                                      className="h-5 w-5 text-[8px]"
                                    />
                                    <span className="truncate">{m.name}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => deleteConversation(selected)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>

                    {/* Primary: Send reply */}
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
    </div>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-24 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="shimmer h-[80vh] rounded-3xl" />
        <div className="shimmer h-[80vh] rounded-3xl" />
      </div>
    </div>
  );
}
