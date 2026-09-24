"use client";

import * as React from "react";
import {
  Send, Paperclip, Image as ImageIcon, FileText, Search, Users,
  Circle, ArrowLeft, Smile, Download, type LucideIcon,
} from "lucide-react";
import { useApi } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { timeAgo } from "@/lib/hooks";

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

export function ChatView() {
  const { data, loading, reload } = useApi<ChatData>("/api/chat");
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
  // Uses a ref so it only runs when the selection actually changes — NOT on
  // every data refresh from polling (which would cause a reload loop).
  const prevMarkedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!data) return;
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
    }).then(() => reload({ silent: true }));
  }, [selectedMember?.id, data, reload]);

  // Poll for new messages every 5s — silent so the UI doesn't flash a skeleton
  React.useEffect(() => {
    const interval = setInterval(() => reload({ silent: true }), 5000);
    return () => clearInterval(interval);
  }, [reload]);

  const filteredMembers = members.filter(
    (m) =>
      !search.trim() ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  async function sendMessage() {
    if (!messageText.trim()) return;
    setSending(true);
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
          text: messageText.trim(),
        }),
      });
      if (res.ok) {
        setMessageText("");
        reload({ silent: true });
      }
    } catch {
      toast.error("Failed to send");
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
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="shimmer h-[600px] rounded-2xl" />
        <div className="shimmer h-[600px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      {/* === Sidebar — member list === */}
      <GlassCard className="flex h-[calc(100vh-180px)] flex-col overflow-hidden p-0">
        <div className="border-b border-border/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">Team Chat</span>
          </div>
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

        <div className="scroll-liquid flex-1 overflow-y-auto p-2">
          {/* Group chat option */}
          <button
            onClick={() => setSelectedMember(null)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition",
              !selectedMember ? "bg-primary/10" : "hover:bg-muted/50"
            )}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">Team Group</div>
              <div className="text-[10px] text-muted-foreground">Everyone on the team</div>
            </div>
          </button>

          <div className="my-2 border-t border-border/30" />

          {filteredMembers.map((m) => {
            const isActive = m.lastActive && Date.now() - new Date(m.lastActive).getTime() < 5 * 60 * 1000;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition",
                  selectedMember?.id === m.id ? "bg-primary/10" : "hover:bg-muted/50"
                )}
              >
                <div className="relative shrink-0">
                  <NameAvatar name={m.name} color={m.color ?? "blue"} className="h-9 w-9 text-xs" />
                  {isActive && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{m.name}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {m.title ?? m.role}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="py-6 text-center text-[11px] text-muted-foreground">
              No team members found
            </div>
          )}
        </div>
      </GlassCard>

      {/* === Chat area === */}
      <GlassCard className="flex h-[calc(100vh-180px)] flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/40 p-4">
          {selectedMember ? (
            <>
              <NameAvatar name={selectedMember.name} color={selectedMember.color ?? "blue"} className="h-10 w-10 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{selectedMember.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {selectedMember.title ?? selectedMember.role}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold">Team Group</div>
                <div className="text-[11px] text-muted-foreground">{members.length + 1} members</div>
              </div>
            </>
          )}
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

        {/* File URL form */}
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

        {/* Input */}
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
