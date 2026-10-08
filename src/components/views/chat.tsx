"use client";

import * as React from "react";
import {
  Send, Paperclip, FileText, Search, Users, Download, Radio,
} from "lucide-react";
import { useApi, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { ListRow, SectionHeader, Pill } from "@/components/glass/dense-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import { useWebSocket, dmRoom, tenantRoom } from "@/lib/use-websocket";

/**
 * Chat — master-detail split (Apple Messages / Linear style).
 *
 * Layout:
 *   grid lg:grid-cols-[300px_1fr]
 *   - LEFT  (GlassCard): SectionHeader + search + ListRow roster (group + DMs)
 *   - RIGHT (GlassCard): avatar + SectionHeader (status Pill) + message stream + composer
 *
 * Dense-ui primitives used: SectionHeader, ListRow, Pill.
 * Card count: 2 (member-list container + chat-area container).
 *
 * API surface preserved:
 *   GET    /api/chat        — messages[] + members[] + currentUserId
 *   POST   /api/chat        — send message (text or fileUrl)
 *   PATCH  /api/chat        — mark conversation read (receiverId: string|null)
 *
 * Real-time (P2-WEBSOCKET):
 *   - Messages received via the `chat:message` socket event are appended
 *     to a local `liveMessages` overlay (de-duped by id against the polled
 *     list) so the recipient sees them the instant they're sent — no 8s
 *     polling lag.
 *   - The sender emits `chat:message` after the POST succeeds so the rest
 *     of the room receives the broadcast. The sender itself doesn't get
 *     the echo (server uses `socket.to(room).emit`), so there's no risk
 *     of double-rendering.
 *   - Typing indicator: the input emits `chat:typing` (throttled to one
 *     event per 2s) and `chat:stop_typing` on send / blur / 3s of silence.
 *   - 8s polling is RETAINED as a fallback so messages still arrive if the
 *     WS is disconnected.
 */

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string | null;
  text: string;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  isRead: boolean;
  isMine: boolean;
  createdAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  color: string | null;
  role: string;
  title: string | null;
  lastActive: string | null;
}

interface ChatData {
  messages: ChatMessage[];
  members: TeamMember[];
  currentUserId: string;
}

// Active = lastActive within 5 min (matches the original dot logic)
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;

function isActive(lastActive: string | null): boolean {
  return !!lastActive && Date.now() - new Date(lastActive).getTime() < ACTIVE_WINDOW_MS;
}

export function ChatView() {
  const { data, loading, error, reload } = useApi<ChatData>("/api/chat");
  const [selectedMember, setSelectedMember] = React.useState<TeamMember | null>(null);
  const [messageText, setMessageText] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [urlInput, setUrlInput] = React.useState("");
  const [showFileForm, setShowFileForm] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // ─── Real-time overlay (P2-WEBSOCKET) ────────────────────────────────────
  // `liveMessages` holds messages delivered via the `chat:message` socket
  // event that are NOT yet in the polled `data.messages` list. They are
  // de-duped by id in the `allMessages` memo below so we never render
  // the same message twice (once from WS, once from the next poll).
  const [liveMessages, setLiveMessages] = React.useState<ChatMessage[]>([]);
  // typing users for the CURRENT conversation — Map<userId, name>. We
  // prune entries automatically after 4s of no renewed typing event so
  // a dropped `chat:stop_typing` (e.g. sender's tab closed mid-keystroke)
  // doesn't leave a phantom "typing..." forever.
  const [typingUsers, setTypingUsers] = React.useState<Map<string, string>>(new Map());

  // Current user / tenant — needed to derive the room name to broadcast to.
  const currentUserId = data?.currentUserId ?? "";
  const customerId = useAuth((s) => s.user?.customerId ?? null);
  const { socket, isConnected } = useWebSocket();

  // Compute the room name for the currently-selected conversation. Group
  // chat goes to `tenant:<customerId>`; DM goes to `dm:<a>:<b>`. Returns
  // null if we don't yet know who the current user is (initial load).
  const activeRoom = React.useMemo<string | null>(() => {
    if (!currentUserId) return null;
    if (!selectedMember) return tenantRoom(customerId);
    return dmRoom(currentUserId, selectedMember.id);
  }, [currentUserId, selectedMember, customerId]);

  // Polled messages + live overlay — de-duped by id.
  const allMessages = React.useMemo(() => {
    const polled = data?.messages ?? [];
    const seen = new Set(polled.map((m) => m.id));
    const fresh = liveMessages.filter((m) => !seen.has(m.id));
    // Sort by createdAt so newly-arrived live messages slot in at the
    // right position even if they came in slightly out of order.
    return [...polled, ...fresh].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [data, liveMessages]);

  const members = data?.members ?? [];

  // Filter messages for the selected conversation
  const conversationMessages = React.useMemo(() => {
    if (!selectedMember) {
      // Group chat: receiverId = null
      return allMessages.filter((m) => m.receiverId === null);
    }
    // DM: between current user and selected member
    return allMessages.filter(
      (m) =>
        (m.senderId === currentUserId && m.receiverId === selectedMember.id) ||
        (m.senderId === selectedMember.id && m.receiverId === currentUserId)
    );
  }, [allMessages, selectedMember, currentUserId]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages.length]);

  // Mark messages as read when viewing a conversation.
  // IMPORTANT: depends ONLY on [selectedMember?.id] — NOT on `data` or `reload`.
  // Including `data` would re-run this effect on every 8s poll, causing a
  // reload loop (PATCH → reload → new data → effect re-runs → PATCH again).
  const prevMarkedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const key = selectedMember?.id ?? "group";
    if (prevMarkedRef.current === key) return;
    prevMarkedRef.current = key;
    const token = typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
      : null;
    fetch("/api/chat", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ receiverId: selectedMember?.id ?? null }),
    }).catch(() => {/* silent — read-status is non-critical */});
  }, [selectedMember?.id]);

  // Poll for new messages every 8s — silent so the UI doesn't flash a skeleton.
  // 8s (not 5s) reduces server load in constrained environments.
  // RETAINED even with WS: covers the case where the WS is disconnected
  // (mobile background, corporate proxy, etc.) — messages still arrive,
  // just with up to 8s lag instead of instant.
  React.useEffect(() => {
    const interval = setInterval(() => reload({ silent: true }), 8000);
    return () => clearInterval(interval);
  }, [reload]);

  // ─── Real-time: listen for `chat:message` + `chat:typing` ─────────────────
  // Subscribed to the SHARED singleton socket. We filter incoming events
  // against the currently-selected conversation so a message in another
  // chat doesn't render into THIS one (it'll be picked up on next poll
  // when the user switches conversations).
  React.useEffect(() => {
    if (!socket) return;

    const onMessage = (msg: ChatMessage) => {
      if (!msg || !msg.id) return;
      // Recompute `isMine` defensively — the sender broadcasts the raw
      // payload which may carry `isMine: true` from their perspective.
      // On this client, `isMine` is true only if the sender is us.
      const normalized: ChatMessage = {
        ...msg,
        isMine: msg.senderId === currentUserId,
      };
      setLiveMessages((prev) => {
        if (prev.some((m) => m.id === normalized.id)) return prev;
        return [...prev, normalized];
      });
      // Once the next poll picks it up, prune from the overlay to avoid
      // double-counting. The de-dupe in `allMessages` already handles this
      // at render time, but pruning keeps the overlay small.
      // (No-op for now — pruned on the next `data` change via the memo.)
    };

    const onTyping = (payload: { userId: string; name?: string }) => {
      if (!payload?.userId || payload.userId === currentUserId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(payload.userId, payload.name ?? "Someone");
        return next;
      });
      // Auto-prune after 4s of silence — covers a dropped `chat:stop_typing`.
      window.setTimeout(() => {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          // Only remove if no newer typing event has come in since.
          // (We don't track timestamps here — a fresh event would have
          // re-set the entry, so the worst case is a 4s flicker, which
          // is acceptable.)
          next.delete(payload.userId);
          return next;
        });
      }, 4000);
    };

    const onStopTyping = (payload: { userId: string }) => {
      if (!payload?.userId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
    };

    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    socket.on("chat:stop_typing", onStopTyping);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
      socket.off("chat:stop_typing", onStopTyping);
    };
  }, [socket, currentUserId]);

  // When the polled `data` changes, prune any live messages that have
  // been absorbed into the canonical list. Keeps the overlay from
  // growing unbounded over a long session.
  React.useEffect(() => {
    if (!data?.messages) return;
    const polledIds = new Set(data.messages.map((m) => m.id));
    setLiveMessages((prev) => {
      const filtered = prev.filter((m) => !polledIds.has(m.id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [data]);

  // ─── Typing emit (throttled) ─────────────────────────────────────────────
  // We send at most one `chat:typing` event per 2s — sending on every
  // keystroke would spam the room. The 2s cadence matches the auto-prune
  // window on the receiver side (4s) so the indicator stays lit between
  // events while the user is actively typing.
  const lastTypingEmitRef = React.useRef<number>(0);
  const stopTypingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTyping = React.useCallback(() => {
    if (!socket || !activeRoom || !currentUserId || !isConnected) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 2000) return;
    lastTypingEmitRef.current = now;
    socket.emit("chat:typing", {
      room: activeRoom,
      userId: currentUserId,
      name: undefined, // server fills in from socket session if needed
    });
    // Reset the auto-stop timer — if the user stops typing for 3s, we
    // emit `chat:stop_typing` so the indicator clears promptly.
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(() => {
      if (!socket || !activeRoom || !currentUserId) return;
      socket.emit("chat:stop_typing", { room: activeRoom, userId: currentUserId });
    }, 3000);
  }, [socket, activeRoom, currentUserId, isConnected]);

  const emitStopTyping = React.useCallback(() => {
    if (stopTypingTimerRef.current) {
      clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = null;
    }
    if (!socket || !activeRoom || !currentUserId) return;
    socket.emit("chat:stop_typing", { room: activeRoom, userId: currentUserId });
  }, [socket, activeRoom, currentUserId]);

  // Build the broadcast payload for a freshly-sent message. We send the
  // raw message fields — the receiver recomputes `isMine` based on its
  // own currentUserId.
  const buildBroadcastPayload = React.useCallback(
    (created: { id: string }, text: string, fileUrl?: string | null, fileName?: string | null, fileType?: string | null): ChatMessage => {
      return {
        id: created.id,
        senderId: currentUserId,
        receiverId: selectedMember?.id ?? null,
        text,
        fileUrl: fileUrl ?? null,
        fileName: fileName ?? null,
        fileType: fileType ?? null,
        isRead: false,
        isMine: true, // sender's perspective — receiver overrides
        createdAt: new Date().toISOString(),
      };
    },
    [currentUserId, selectedMember]
  );

  const filteredMembers = members.filter(
    (m) =>
      !search.trim() ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  // Per-conversation unread counts — powers the Pills in the roster.
  // Group key "group" for the team chat; otherwise the sender's id.
  const unreadCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const m of allMessages) {
      if (m.isMine || m.isRead) continue;
      if (m.receiverId === null) {
        map.set("group", (map.get("group") ?? 0) + 1);
      } else if (m.receiverId === currentUserId) {
        map.set(m.senderId, (map.get(m.senderId) ?? 0) + 1);
      }
    }
    return map;
  }, [allMessages, currentUserId]);

  const activeCount = React.useMemo(
    () => members.filter((m) => isActive(m.lastActive)).length,
    [members]
  );

  async function sendMessage() {
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setSending(true);
    // Optimistic: clear input immediately so the user can type the next message
    setMessageText("");
    emitStopTyping();
    try {
      const token = JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          receiverId: selectedMember?.id ?? null,
          text,
        }),
      });
      if (res.ok) {
        // Broadcast to the rest of the room so other clients see the
        // message instantly (instead of waiting up to 8s for our poll).
        const created = await res.json().catch(() => ({ id: `tmp-${Date.now()}`, ok: true }));
        if (socket && activeRoom && created?.id) {
          const payload = buildBroadcastPayload(created, text);
          socket.emit("chat:message", { room: activeRoom, message: payload });
        }
        reload({ silent: true });
      } else {
        // Restore the text so the user doesn't lose their message
        setMessageText(text);
        toast.error("Failed to send message");
      }
    } catch {
      setMessageText(text);
      toast.error("Network error — message not sent");
    } finally {
      setSending(false);
    }
  }

  async function sendFile() {
    if (!urlInput.trim()) {
      toast.error("Enter a file URL");
      return;
    }
    setSending(true);
    emitStopTyping();
    try {
      const url = urlInput.trim();
      const fileName = url.split("/").pop() ?? "file";
      const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
      const fileType = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
        ? "image"
        : ["mp4", "webm", "mov"].includes(ext)
          ? "video"
          : ["mp3", "wav"].includes(ext)
            ? "audio"
            : "document";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token
            ? { "Authorization": `Bearer ${JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token}` }
            : {}),
        },
        body: JSON.stringify({
          receiverId: selectedMember?.id ?? null,
          text: "",
          fileUrl: url,
          fileName,
          fileType,
        }),
      });
      if (res.ok) {
        const created = await res.json().catch(() => ({ id: `tmp-${Date.now()}`, ok: true }));
        // Broadcast the file message to the rest of the room.
        if (socket && activeRoom && created?.id) {
          const payload = buildBroadcastPayload(created, "", url, fileName, fileType);
          socket.emit("chat:message", { room: activeRoom, message: payload });
        }
        setUrlInput("");
        setShowFileForm(false);
        reload({ silent: true });
        toast.success("File sent");
      }
    } catch {
      toast.error("Failed to send file");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <div className="shimmer h-[600px] rounded-xl" />
        <div className="shimmer h-[600px] rounded-xl" />
      </div>
    );
  }

  // Error state — show retry button instead of empty "No members" state
  if (error && !data) {
    return (
      <div className="grid place-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
            <Send className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold">Couldn&apos;t load chat</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => reload()}
            className="liquid-pill mt-4 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const groupUnread = unreadCounts.get("group") ?? 0;
  const selectedActive = selectedMember ? isActive(selectedMember.lastActive) : false;

  // Status Pill for the chat area header — depends on selectedMember state.
  const statusPill = selectedMember ? (
    selectedActive ? (
      <Pill color="green">Active now</Pill>
    ) : selectedMember.lastActive ? (
      <Pill color="neutral">Last seen {timeAgo(selectedMember.lastActive)}</Pill>
    ) : (
      <Pill color="neutral">Offline</Pill>
    )
  ) : (
    <Pill color="blue">{members.length + 1} members</Pill>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* ============================================================= */}
      {/* SIDEBAR — member list (GlassCard #1)                          */}
      {/* ============================================================= */}
      <GlassCard className="flex h-[calc(100vh-180px)] flex-col overflow-hidden p-0">
        <div className="border-b border-border/40 p-3">
          <SectionHeader
            title="Team Chat"
            desc="Direct & group"
            icon={Users}
            action={
              activeCount > 0 ? (
                <Pill color="green">{activeCount} online</Pill>
              ) : undefined
            }
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border/50 bg-background/60 py-1.5 pl-7 pr-2 text-xs outline-none transition focus:border-primary/50"
            />
          </div>
        </div>

        <div className="scroll-liquid flex-1 overflow-y-auto">
          {/* Group chat row */}
          <ListRow
            onClick={() => setSelectedMember(null)}
            active={!selectedMember}
            className="gap-2.5"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">Team Group</div>
              <div className="truncate text-[10px] text-muted-foreground">
                Everyone on the team
              </div>
            </div>
            {groupUnread > 0 && <Pill color="blue">{groupUnread}</Pill>}
          </ListRow>

          {filteredMembers.map((m) => {
            const memberActive = isActive(m.lastActive);
            const unread = unreadCounts.get(m.id) ?? 0;
            return (
              <ListRow
                key={m.id}
                onClick={() => setSelectedMember(m)}
                active={selectedMember?.id === m.id}
                className="gap-2.5"
              >
                <div className="relative shrink-0">
                  <NameAvatar
                    name={m.name}
                    color={m.color ?? "blue"}
                    src={m.avatar ?? undefined}
                    gender={(m as { gender?: "male" | "female" })?.gender ?? undefined}
                    className="h-9 w-9 text-xs"
                  />
                  {memberActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{m.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {m.title ?? m.role}
                  </div>
                </div>
                {unread > 0 ? (
                  <Pill color="blue">{unread}</Pill>
                ) : memberActive ? (
                  <Pill color="green">online</Pill>
                ) : null}
              </ListRow>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="py-6 text-center text-[11px] text-muted-foreground">
              No team members found
            </div>
          )}
        </div>
      </GlassCard>

      {/* ============================================================= */}
      {/* CHAT AREA — header + messages + composer (GlassCard #2)       */}
      {/* ============================================================= */}
      <GlassCard className="flex h-[calc(100vh-180px)] flex-col overflow-hidden p-0">
        {/* Header — avatar + SectionHeader (status Pill as action) */}
        <div className="flex items-center gap-3 border-b border-border/40 p-3">
          {selectedMember ? (
            <NameAvatar
              name={selectedMember.name}
              color={selectedMember.color ?? "blue"}
              src={selectedMember.avatar ?? undefined}
              gender={(selectedMember as { gender?: "male" | "female" })?.gender ?? undefined}
              className="h-10 w-10 shrink-0 text-sm"
            />
          ) : (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Users className="h-5 w-5" />
            </div>
          )}
          <SectionHeader
            title={selectedMember ? selectedMember.name : "Team Group"}
            desc={
              selectedMember
                ? selectedMember.title ?? selectedMember.role
                : "Everyone on the team"
            }
            className="mb-0 min-w-0 flex-1"
            action={statusPill}
          />
        </div>

          {/* Messages */}
        <div className="scroll-liquid flex-1 space-y-2 overflow-y-auto p-4">
          {conversationMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">No messages yet</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Start the conversation below</p>
              </div>
            </div>
          ) : (
            conversationMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.isMine ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2", msg.isMine ? "bg-primary text-primary-foreground" : "bg-muted/60")}>
                  {/* File attachment */}
                  {msg.fileUrl && (
                    <div className="mb-1.5">
                      {msg.fileType === "image" ? (
                        <img src={msg.fileUrl} alt={msg.fileName ?? ""} className="max-h-48 rounded-lg object-cover" />
                      ) : (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2 text-xs transition hover:bg-black/10",
                            msg.isMine ? "border-primary-foreground/30" : "border-border/40"
                          )}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{msg.fileName}</span>
                          <Download className="ml-auto h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                  {/* Text */}
                  {msg.text && (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                  )}
                  {/* Timestamp */}
                  <div className={cn("mt-0.5 text-[9px]", msg.isMine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {timeAgo(msg.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
          {/* Typing indicator — only for the OTHER user in a DM, or any
              non-self user in the group chat. Hidden for self-typing. */}
          {typingUsers.size > 0 && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl bg-muted/60 px-3.5 py-2">
                <span className="text-[11px] text-muted-foreground">
                  {Array.from(typingUsers.values()).slice(0, 2).join(", ")}{" "}
                  {typingUsers.size > 2 ? `+${typingUsers.size - 2} more` : ""}
                  {typingUsers.size === 1 ? "is" : "are"} typing
                </span>
                <span className="flex gap-0.5" aria-hidden>
                  <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.3s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.15s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground/70" />
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* File URL form (collapsible) */}
        {showFileForm && (
          <div className="border-t border-border/40 p-3">
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/file.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
                autoFocus
              />
              <button
                onClick={sendFile}
                disabled={sending}
                className="liquid-pill rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Send file
              </button>
              <button
                onClick={() => { setShowFileForm(false); setUrlInput(""); }}
                className="rounded-lg border border-border/50 px-3 py-2 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-border/40 p-3">
          {/* Live connection status — subtle, shown only when WS is down
              OR when it's the only signal of "live" presence. We hide it
              when connected to keep the chrome minimal. */}
          {!isConnected && (
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Radio className="h-3 w-3 text-amber-500" />
              <span>Live updates paused — falling back to 8s polling</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFileForm(!showFileForm)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Attach file by URL"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <input
              type="text"
              placeholder={selectedMember ? `Message ${selectedMember.name}...` : "Message the team..."}
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                if (e.target.value.trim()) emitTyping();
                else emitStopTyping();
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="flex-1 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !messageText.trim()}
              className="liquid-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-50"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
