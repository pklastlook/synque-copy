"use client";

import * as React from "react";
import {
  AtSign,
  CheckCircle2,
  Circle,
  Clock,
  Inbox as InboxIcon,
  Mail,
  MessageSquare,
  Reply,
  Send,
  Sparkles,
} from "lucide-react";
import { useApi, timeAgo } from "@/lib/hooks";
import { GlassCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge, PlatformPill } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Comment } from "@/lib/types";

type FilterTab = "all" | "unread" | "comment" | "message" | "mention";

const TABS: { id: FilterTab; label: string; icon: React.ElementType }[] = [
  { id: "all", label: "All", icon: InboxIcon },
  { id: "unread", label: "Unread", icon: Circle },
  { id: "comment", label: "Comments", icon: MessageSquare },
  { id: "message", label: "Messages", icon: Mail },
  { id: "mention", label: "Mentions", icon: AtSign },
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

function sentimentChip(s: Comment["sentiment"]) {
  if (s === "positive") return "bg-emerald-500/15 text-emerald-500";
  if (s === "negative") return "bg-rose-500/15 text-rose-500";
  return "bg-muted text-muted-foreground";
}

function sentimentDot(s: Comment["sentiment"]) {
  if (s === "positive") return "bg-emerald-500";
  if (s === "negative") return "bg-rose-500";
  return "bg-muted-foreground/50";
}

export function InboxView() {
  const [tab, setTab] = React.useState<FilterTab>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");

  const url = tab === "unread" ? "/api/inbox?filter=unread" : "/api/inbox";
  const { data, loading, reload } = useApi<Comment[]>(url);

  const all = data ?? [];

  const visible = React.useMemo(() => {
    if (tab === "all" || tab === "unread") return all;
    return all.filter((c) => c.type === tab);
  }, [all, tab]);

  const unreadCount = React.useMemo(() => all.filter((c) => !c.replied).length, [all]);

  const selected = React.useMemo(
    () => (selectedId ? visible.find((c) => c.id === selectedId) ?? null : null),
    [visible, selectedId]
  );

  // reset selection when switching tabs (the previously selected id may not be in the new view)
  const handleTabChange = (t: FilterTab) => {
    setTab(t);
    setSelectedId(null);
    setReplyText("");
  };

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

  const sendReply = async () => {
    if (!selected) return;
    if (!replyText.trim()) {
      toast.error("Write a reply first");
      return;
    }
    try {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, replied: true }),
      });
      if (!res.ok) throw new Error("patch failed");
      toast.success("Reply sent");
      setReplyText("");
      reload();
    } catch {
      toast.error("Could not send — try again");
    }
  };

  if (loading && !data) return <InboxSkeleton />;

  return (
    <div className="space-y-4">
      <HelpText module="inbox"><strong className="text-foreground">Inbox</strong> collects comments, messages, and mentions from every connected account. Click a conversation to reply.</HelpText>
      {/* Top filter bar */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-4 sm:p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Conversations</h2>
            <p className="text-xs text-muted-foreground">Comments, messages & mentions across every connected account</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {unreadCount} unread
          </span>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  tab === t.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {t.id === "unread" && unreadCount > 0 && (
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 text-[10px] font-bold",
                      tab === t.id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/20 text-primary"
                    )}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Conversation list */}
        <GlassCard className="flex flex-col p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {visible.length} conversations
            </span>
            {visible.some((c) => !c.replied) && (
              <button
                onClick={() => {
                  Promise.all(
                    visible.filter((c) => !c.replied).map((c) =>
                      fetch("/api/inbox", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: c.id, replied: true }),
                      })
                    )
                  )
                    .then(() => {
                      toast.success("All marked replied");
                      reload();
                    })
                    .catch(() => toast.error("Could not update all"));
                }}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[70vh] space-y-1 overflow-y-auto scroll-liquid pr-1">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <InboxIcon className="h-5 w-5" />
                </div>
                <div className="text-sm text-muted-foreground">Nothing here. You&apos;re all caught up! ✨</div>
              </div>
            ) : (
              visible.map((c) => {
                const Icon = TYPE_ICON[c.type];
                const isSelected = selected?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setReplyText("");
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition hover:bg-muted/50",
                      isSelected && "bg-muted/40 ring-2 ring-primary"
                    )}
                  >
                    <div className="relative">
                      <PlatformBadge platform={c.platform} size={32} />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                          sentimentDot(c.sentiment)
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <NameAvatar name={c.author} src={c.authorAvatar} className="h-5 w-5 text-[8px]" />
                        <span className="truncate text-sm font-semibold">{c.author}</span>
                        {c.replied && <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />}
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.text}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate text-[10px] text-muted-foreground">@{c.handle}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* Detail pane */}
        <GlassCard className="p-5">
          {!selected ? (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
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
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start gap-3">
                <NameAvatar name={selected.author} src={selected.authorAvatar} className="h-11 w-11 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-semibold">{selected.author}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
                        sentimentChip(selected.sentiment)
                      )}
                    >
                      {selected.sentiment}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <PlatformPill platform={selected.platform} handle={selected.handle} />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {timeAgo(selected.createdAt)}
                </div>
              </div>

              {/* Message body */}
              <GlassCard className="bg-muted/30 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {React.createElement(TYPE_ICON[selected.type], { className: "h-3 w-3" })}
                  {selected.type}
                </div>
                <p className="text-sm leading-relaxed">{selected.text}</p>
              </GlassCard>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {selected.assigneeName ? (
                  <span className="inline-flex items-center gap-1.5">
                    <NameAvatar name={selected.assigneeName} className="h-5 w-5 text-[8px]" />
                    Assigned to <span className="font-semibold text-foreground">{selected.assigneeName}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5">
                    <Circle className="h-3 w-3" /> Unassigned
                  </span>
                )}
                {selected.replied && (
                  <span className="inline-flex items-center gap-1 text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" /> Replied
                  </span>
                )}
              </div>

              {/* Suggested replies */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Suggested replies
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTED_REPLIES.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setReplyText(r)}
                      className="rounded-2xl border border-border/40 bg-muted/30 p-3 text-left text-xs leading-relaxed transition hover:-translate-y-0.5 hover:bg-muted/60"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply composer */}
              <div className="space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply…"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-border/60 bg-background/60 p-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => markReplied(selected)}
                    disabled={selected.replied}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition",
                      selected.replied
                        ? "cursor-default bg-emerald-500/15 text-emerald-500"
                        : "bg-muted/60 text-foreground hover:bg-muted"
                    )}
                  >
                    {selected.replied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Reply className="h-3.5 w-3.5" />}
                    {selected.replied ? "Replied" : "Mark replied"}
                  </button>
                  <button
                    onClick={sendReply}
                    className="liquid-pill inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
                  >
                    <Send className="h-3.5 w-3.5" /> Send
                  </button>
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
      <div className="shimmer h-32 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <div className="shimmer h-[80vh] rounded-3xl" />
        <div className="shimmer h-[80vh] rounded-3xl" />
      </div>
    </div>
  );
}
