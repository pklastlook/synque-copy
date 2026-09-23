"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileEdit,
  Plus,
  RotateCw,
} from "lucide-react";
import { useApi } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Post } from "@/lib/types";

type StatusFilter = "all" | "scheduled" | "published" | "draft";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All",
  scheduled: "Scheduled",
  published: "Published",
  draft: "Drafts",
};

/**
 * Effective calendar date for a post.
 * - published → first variant's publishedAt
 * - scheduled → scheduledAt
 * - draft → createdAt (so drafts can be browsed when filter=draft)
 */
function postDate(p: Post): Date | null {
  if (p.status === "published") {
    const publishedAt = p.variants.find((v) => v.publishedAt)?.publishedAt;
    if (publishedAt) return new Date(publishedAt);
  }
  if (p.scheduledAt) return new Date(p.scheduledAt);
  if (p.status === "draft") return new Date(p.createdAt);
  return null;
}

export function CalendarView() {
  const { data, loading } = useApi<Post[]>("/api/posts");
  const { openComposer, openComposerWithPost } = useNav();

  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => startOfMonth(new Date()));
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [selectedDay, setSelectedDay] = React.useState<Date>(() => new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const allPosts = data ?? [];

  const filtered = React.useMemo(() => {
    if (statusFilter === "all") return allPosts;
    return allPosts.filter((p) => p.status === statusFilter);
  }, [allPosts, statusFilter]);

  const postsByDay = React.useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of filtered) {
      const d = postDate(p);
      if (!d) continue;
      if (!isSameMonth(d, currentMonth)) continue;
      const key = format(d, "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    // sort each day's posts chronologically
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const da = postDate(a)?.getTime() ?? 0;
        const db = postDate(b)?.getTime() ?? 0;
        return da - db;
      });
    }
    return map;
  }, [filtered, currentMonth]);

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

  const selectedDayKey = format(selectedDay, "yyyy-MM-dd");
  const selectedDayPosts = postsByDay.get(selectedDayKey) ?? [];

  if (loading || !data) return <CalendarSkeleton />;

  return (
    <div className="space-y-4">
      <HelpText module="calendar"><strong className="text-foreground">Calendar</strong> shows your scheduled and published posts. Click any day to see what's planned.</HelpText>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard
          label="Scheduled this month"
          value={scheduledCount}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="oklch(0.78 0.18 75)"
          hint={format(currentMonth, "MMMM yyyy")}
        />
        <KpiCard
          label="Published this month"
          value={publishedCount}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
        />
        <KpiCard
          label="Drafts"
          value={draftCount}
          icon={<FileEdit className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="across workspace"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Calendar */}
        <GlassCard strong className="glass-sheen relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <SectionTitle
            title={format(currentMonth, "MMMM yyyy")}
            desc="Your content pipeline — click a day to inspect"
            action={
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const t = new Date();
                    setCurrentMonth(startOfMonth(t));
                    setSelectedDay(t);
                  }}
                  className="rounded-xl bg-muted/60 px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
                >
                  Today
                </button>
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
                <button
                  onClick={() => openComposer()}
                  className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> New Post
                </button>
              </div>
            }
          />

          {/* Status filter pills */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  statusFilter === f
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          {/* Calendar grid — horizontal scroll on small screens */}
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
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const posts = postsByDay.get(key) ?? [];
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const isSelected = isSameDay(day, selectedDay);
                  const visible = posts.slice(0, 3);
                  const overflow = posts.length - visible.length;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "min-h-[96px] rounded-xl border border-border/30 bg-muted/20 p-1.5 text-left transition hover:bg-muted/40",
                        !inMonth && "opacity-40",
                        isSelected && "ring-2 ring-primary",
                        today && "border-primary"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "grid h-6 w-6 place-items-center rounded-full text-xs font-semibold",
                            today
                              ? "bg-primary text-primary-foreground"
                              : isSelected
                                ? "bg-foreground text-background"
                                : "text-foreground/80"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {posts.length > 0 && (
                          <span className="rounded-full bg-muted px-1.5 text-[9px] font-semibold text-muted-foreground">
                            {posts.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 space-y-1">
                        {visible.map((p) => {
                          const platform = p.variants[0]?.platform;
                          const dt = postDate(p);
                          return (
                            <div
                              key={p.id}
                              className="flex items-center gap-1 rounded-lg bg-background/70 px-1 py-0.5"
                            >
                              {platform && <PlatformBadge platform={platform} size={12} />}
                              <span className="truncate text-[10px] font-medium">{p.title}</span>
                              {dt && (
                                <span className="ml-auto shrink-0 text-[9px] text-muted-foreground">
                                  {format(dt, "HH:mm")}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {overflow > 0 && (
                          <div className="px-1 text-[9px] font-semibold text-primary">+{overflow} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Day detail sidebar */}
        <GlassCard className="p-5">
          <SectionTitle
            title={format(selectedDay, "EEEE")}
            desc={format(selectedDay, "MMM d, yyyy")}
            action={
              <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {selectedDayPosts.length} posts
              </span>
            }
          />

          <div className="max-h-[70vh] space-y-2 overflow-y-auto scroll-liquid pr-1">
            {selectedDayPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div className="text-sm text-muted-foreground">Nothing scheduled for this day.</div>
                <button
                  onClick={() => openComposer()}
                  className="liquid-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" /> Schedule one
                </button>
              </div>
            ) : (
              selectedDayPosts.map((p) => {
                const dt = postDate(p);
                const canRepublish = p.status === "draft" || p.status === "failed";
                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-border/40 bg-muted/20 p-3 transition hover:bg-muted/40"
                  >
                    <div className="flex gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {p.mediaUrl ? (
                          <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-muted-foreground">
                            <CalendarClock className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{p.title}</div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{p.caption}</div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <NameAvatar name={p.authorName} className="h-6 w-6 text-[9px]" />
                      <span className="text-[11px] text-muted-foreground">{p.authorName}</span>
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {dt ? format(dt, "HH:mm") : "—"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {p.variants.map((v) => (
                        <PlatformBadge key={v.id} platform={v.platform} size={20} />
                      ))}
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize",
                          p.status === "published"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : p.status === "scheduled"
                              ? "bg-primary/15 text-primary"
                              : p.status === "failed"
                                ? "bg-rose-500/15 text-rose-500"
                                : "bg-muted text-muted-foreground"
                        )}
                      >
                        {p.status}
                      </span>
                    </div>

                    {(canRepublish || p.status === "scheduled") && (
                      <button
                        onClick={() => {
                          openComposerWithPost(p);
                          toast.info(`Loaded "${p.title}" into composer`, {
                            description: canRepublish
                              ? "Edit and republish when ready."
                              : "Reschedule or publish now.",
                          });
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-foreground transition hover:bg-primary hover:text-primary-foreground"
                      >
                        <RotateCw className="h-3 w-3" />
                        {canRepublish ? "Republish draft" : "Edit & reschedule"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shimmer h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="shimmer h-[640px] rounded-3xl" />
        <div className="shimmer h-[640px] rounded-3xl" />
      </div>
    </div>
  );
}
