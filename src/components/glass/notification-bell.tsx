"use client";

/**
 * NotificationBell — bell icon + unread badge + dropdown panel showing
 * the user's most recent in-app notifications.
 *
 * Behaviour:
 *   - Polls `/api/notifications?unread=true` every 60s for the unread count
 *     (lightweight — single integer in the response). The badge updates
 *     without opening the panel.
 *   - When the panel is opened, fetches the full recent list via
 *     `/api/notifications?limit=20`.
 *   - Each notification row has an icon (varies by type), title, message,
 *     and relative time ("just now" / "5m ago" / "2h ago" / "3d ago").
 *   - Clicking a notification marks it as read + navigates to its actionView
 *     via the Zustand `useNav.setView` store.
 *   - "Mark all as read" button calls PATCH /api/notifications with
 *     `{ all: true }`.
 *   - Empty state shows a green check-circle "All caught up".
 *
 * Auth: the useApi hook auto-attaches the JWT from localStorage.
 */

import * as React from "react";
import {
  Bell,
  CheckCircle2,
  MessageCircle,
  CreditCard,
  CalendarClock,
  UserPlus,
  Send,
  AlertTriangle,
  CheckCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/hooks";
import { Pill, SectionHeader } from "@/components/glass/dense-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionView: string | null;
  actionId: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

interface UnreadCountResponse {
  unreadCount: number;
}

// ---------------------------------------------------------------------------
// Auth token — mirrors useApi's helper in src/lib/hooks.ts
// ---------------------------------------------------------------------------

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

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (init?.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Type → icon mapping. Falls back to a generic Bell for unknown types.
// ---------------------------------------------------------------------------

const TYPE_ICON: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  comment_received: {
    icon: MessageCircle,
    color: "text-blue-500",
    bg: "bg-blue-500/15",
  },
  trial_expiring: {
    icon: CalendarClock,
    color: "text-amber-500",
    bg: "bg-amber-500/15",
  },
  payment_received: {
    icon: CreditCard,
    color: "text-emerald-500",
    bg: "bg-emerald-500/15",
  },
  team_invite: {
    icon: UserPlus,
    color: "text-violet-500",
    bg: "bg-violet-500/15",
  },
  post_published: {
    icon: Send,
    color: "text-emerald-500",
    bg: "bg-emerald-500/15",
  },
  post_failed: {
    icon: AlertTriangle,
    color: "text-rose-500",
    bg: "bg-rose-500/15",
  },
  approval_requested: {
    icon: CheckCheck,
    color: "text-amber-500",
    bg: "bg-amber-500/15",
  },
};

function iconFor(type: string) {
  return TYPE_ICON[type] ?? { icon: Bell, color: "text-muted-foreground", bg: "bg-muted" };
}

// ---------------------------------------------------------------------------
// NotificationBell
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const { setView } = useNav();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [markingAll, setMarkingAll] = React.useState(false);

  // ---- Poll for unread count every 60s (and once on mount) ----
  // Lightweight: GET /api/notifications?unread=true returns just an integer.
  // Failures are silent — the bell just shows 0 unread if the API is down.
  const refreshUnreadCount = React.useCallback(async () => {
    try {
      const data = await apiFetch<UnreadCountResponse>("/api/notifications?unread=true");
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silent — best-effort polling.
    }
  }, []);

  React.useEffect(() => {
    refreshUnreadCount();
    const id = setInterval(refreshUnreadCount, 60_000); // 60 seconds
    // Re-poll when the tab regains focus (covers the case where the user
    // was away for a while — they get fresh notifications on return).
    const onFocus = () => refreshUnreadCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshUnreadCount]);

  // ---- Fetch the full notification list when the panel opens ----
  const refreshList = React.useCallback(async () => {
    try {
      const data = await apiFetch<NotificationsResponse>("/api/notifications?limit=20");
      setItems(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    if (open) refreshList();
  }, [open, refreshList]);

  // ---- Click a notification → navigate + mark as read ----
  const handleItemClick = React.useCallback(
    async (item: NotificationItem) => {
      // Optimistically mark as read in the UI.
      setItems((prev) =>
        prev?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? null
      );
      setUnreadCount((c) => Math.max(0, c - (item.read ? 0 : 1)));

      // Fire-and-forget — best-effort.
      apiFetch(`/api/notifications/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ read: true }),
      }).catch(() => {});

      // Navigate to the actionView if there is one.
      if (item.actionView) {
        const view = item.actionView as ViewId;
        try {
          setView(view);
        } catch {
          // Unknown view id — silently ignore.
        }
      }

      setOpen(false);
    },
    [setView]
  );

  // ---- Mark all as read ----
  const handleMarkAllRead = React.useCallback(async () => {
    if (markingAll) return;
    setMarkingAll(true);
    // Optimistic.
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
    setUnreadCount(0);
    try {
      await apiFetch("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // Re-fetch on failure so the UI matches the DB.
      refreshList();
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, refreshList]);

  // ---- Delete a single notification ----
  const handleDelete = React.useCallback(
    async (id: string) => {
      // Optimistic.
      const prevItems = items;
      setItems((prev) => prev?.filter((n) => n.id !== id) ?? null);
      try {
        await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      } catch {
        // Rollback on failure.
        setItems(prevItems);
      }
    },
    [items]
  );

  const notifications = items ?? [];
  const hasUnread = unreadCount > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition hover:bg-[#E8E8ED] dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:hover:bg-white/[0.10]"
          aria-label={`Notifications${hasUnread ? ` — ${unreadCount} unread` : ""}`}
          aria-expanded={open}
          title="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {/* Red dot/badge when unread count > 0. Shows the count up to 9,
              then "9+" for larger numbers (Apple HIG pattern). */}
          {hasUnread && (
            <span
              className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#2C2C2E]"
              aria-hidden
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {/* Subtle pulse when there are new unread notifications the user
              hasn't seen yet. Pure CSS — no JS animation cost. */}
          {hasUnread && (
            <span
              className="absolute -right-0.5 -top-0.5 h-4 w-4 animate-ping rounded-full bg-[#FF3B30] opacity-30"
              aria-hidden
            />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(92vw,360px)] max-h-[80vh] overflow-hidden p-0"
      >
        {/* Header — title + unread count + "Mark all as read" action */}
        <DropdownMenuLabel className="p-0">
          <SectionHeader
            title="Notifications"
            desc={hasUnread ? `${unreadCount} unread` : "You're all caught up"}
            action={
              hasUnread ? (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-500/20 disabled:opacity-50 dark:text-blue-400"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              ) : undefined
            }
            className="mb-0 px-2 py-1.5"
          />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* List — scrolls independently. Each notification row is a button
            inside DropdownMenuItem so keyboard navigation (↑↓ Enter) works. */}
        <div className="max-h-96 overflow-y-auto scroll-liquid">
          {items === null ? (
            // Loading skeleton — appears only on the very first open.
            <div className="space-y-1 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg px-1.5 py-2"
                >
                  <div className="h-7 w-7 shrink-0 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-full animate-pulse rounded bg-muted/70" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <div className="text-sm font-medium">All caught up</div>
              <div className="text-xs text-muted-foreground">
                No unread notifications
              </div>
            </div>
          ) : (
            notifications.map((n) => {
              const { icon: Icon, color, bg } = iconFor(n.type);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative flex items-start gap-2.5 px-2 py-2 transition",
                    !n.read && "bg-blue-500/[0.04]"
                  )}
                >
                  <DropdownMenuItem
                    className="flex flex-1 items-start gap-2.5 rounded-lg px-1.5 py-1.5 cursor-pointer focus:bg-muted/40"
                    onClick={() => handleItemClick(n)}
                  >
                    <div
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                        bg
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="text-xs font-semibold leading-tight">
                          {n.title}
                        </div>
                        {!n.read && (
                          <span
                            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {n.message}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground/60">
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  </DropdownMenuItem>
                  {/* Delete button — revealed on hover. Stops propagation
                      so it doesn't trigger the row's onClick. */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n.id);
                    }}
                    className="absolute right-1 top-1 hidden h-6 w-6 place-items-center rounded-md text-muted-foreground/60 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:grid"
                    aria-label="Delete notification"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer — count summary + a "View all" hint. */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <Pill color={hasUnread ? "blue" : "neutral"}>
                {unreadCount} unread
              </Pill>
              <span className="text-[10px] text-muted-foreground/70">
                Updates every 60s
              </span>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
