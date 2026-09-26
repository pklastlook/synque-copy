"use client";

import * as React from "react";
import {
  Send, Paperclip, FileText, Search, Users, Download,
} from "lucide-react";
import { useApi, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { ListRow, SectionHeader, Pill } from "@/components/glass/dense-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
 * Polling: every 8s, silent (no skeleton flash).
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

  const allMessages = data?.messages ?? [];
  const members = data?.members ?? [];
  const currentUserId = data?.currentUserId ?? "";

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
  React.useEffect(() => {
    const interval = setInterval(() => reload({ silent: true }), 8000);
    return () => clearInterval(interval);
  }, [reload]);

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
              onChange={(e) => setMessageText(e.target.value)}
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
