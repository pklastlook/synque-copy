"use client";

import * as React from "react";
import {
  MessageCircle, Send, Trash2, Archive, Check, Inbox as InboxIcon,
  Users, Clock, Plus, Search, Copy, CheckCheck,
  MessageSquare, Radio, Sparkles, ChevronRight, X, Wifi,
  QrCode, Loader2, Smartphone, RefreshCw, ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { useApi, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  MetricRow, SectionHeader, ListRow, Pill,
  type Metric,
} from "@/components/glass/dense-ui";

// ============ Types ============

interface WhatsAppMessage {
  id: string;
  source: string;
  senderName: string;
  senderPhone: string | null;
  groupName: string | null;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  status: string;
  postId: string | null;
  savedByName: string | null;
  savedByColor: string | null;
  isLive: boolean;
  createdAt: string;
}

interface ConnectionStatus {
  connected: boolean;
  qr: string | null;
  phone: string | null;
  serviceOffline?: boolean;
  dbStatus?: string;
}

type StatusFilter = "all" | "new" | "used" | "archived";

const SOURCE_META: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  group: { label: "Group", icon: Users, color: "text-blue-500", bg: "bg-blue-500/15" },
  chat: { label: "Chat", icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-500/15" },
  broadcast: { label: "Broadcast", icon: Radio, color: "text-amber-500", bg: "bg-amber-500/15" },
  channel: { label: "Channel", icon: MessageCircle, color: "text-purple-500", bg: "bg-purple-500/15" },
};

const STATUS_META: Record<string, { label: string; color: "green" | "blue" | "neutral" }> = {
  new: { label: "New", color: "green" },
  used: { label: "Used", color: "blue" },
  archived: { label: "Archived", color: "neutral" },
};

// ============ Conversation grouping ============

interface Conversation {
  id: string;
  name: string;       // group / channel / chat name (display title)
  subtitle: string;   // secondary: "From {sender}" for groups, or phone for direct
  source: string;
  count: number;
  newCount: number;
  lastMessage: WhatsAppMessage;
  messages: WhatsAppMessage[];
}

function groupByConversation(messages: WhatsAppMessage[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const isGroup = m.source === "group" || m.source === "channel" || m.source === "broadcast";
    const key = isGroup
      ? `g:${m.groupName ?? m.senderName}`
      : `c:${m.senderPhone ?? m.senderName}`;
    const name = isGroup ? (m.groupName ?? m.senderName) : m.senderName;
    const subtitle = isGroup ? `From ${m.senderName}` : (m.senderPhone ?? "");

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        name,
        subtitle,
        source: m.source,
        count: 0,
        newCount: 0,
        lastMessage: m,
        messages: [],
      });
    }
    const convo = map.get(key)!;
    convo.count++;
    if (m.status === "new") convo.newCount++;
    if (new Date(m.createdAt).getTime() > new Date(convo.lastMessage.createdAt).getTime()) {
      convo.lastMessage = m;
    }
    convo.messages.push(m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );
}

function last7DayHistogram(messages: WhatsAppMessage[]): number[] {
  const days = Array(7).fill(0);
  const now = Date.now();
  for (const m of messages) {
    const diffDays = Math.floor((now - new Date(m.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      days[6 - diffDays]++;
    }
  }
  return days;
}

// ============ Main view ============

export function WhatsAppView() {
  const { data, loading, reload } = useApi<WhatsAppMessage[]>("/api/whatsapp");
  const { openComposer } = useNav();
  const { user, token } = useAuth();
  const ownerId = user?.id ?? "";

  // Helper: build auth headers (Bearer token from auth store)
  const authHeaders = React.useMemo(() => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }, [token]);

  const [showPasteForm, setShowPasteForm] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // === Master-detail state ===
  const [selectedConvoId, setSelectedConvoId] = React.useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = React.useState(false);

  // === WhatsApp live connection state ===
  const [connection, setConnection] = React.useState<ConnectionStatus | null>(null);
  const [showQR, setShowQR] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);

  // Initial connection fetch (mount-only) — so the status shows immediately
  // instead of waiting for the first poll interval.
  React.useEffect(() => {
    if (!ownerId || !token) return;
    let cancelled = false;
    fetch(`/api/whatsapp/connection`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json: ConnectionStatus) => { if (!cancelled) setConnection(json); })
      .catch(() => { if (!cancelled) setConnection({ connected: false, qr: null, phone: null, serviceOffline: true }); });
    return () => { cancelled = true; };
  }, [ownerId, token]);

  // Poll connection status every 2s when modal is open OR when not connected.
  // Uses refs for showQR/connected so the interval isn't torn down on every
  // state change (which caused an infinite re-poll loop → transient
  // serviceOffline flashes).
  const showQRRef = React.useRef(showQR);
  React.useEffect(() => { showQRRef.current = showQR; }, [showQR]);

  React.useEffect(() => {
    if (!ownerId || !token) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/whatsapp/connection`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setConnection({ connected: false, qr: null, phone: null, serviceOffline: true });
          return;
        }
        const json: ConnectionStatus = await res.json();
        if (!cancelled) {
          setConnection(json);
          // Auto-close QR modal when connected
          if (json.connected && showQRRef.current) {
            setShowQR(false);
            toast.success("WhatsApp connected!", {
              description: `Now receiving live messages from ${json.phone ?? "your phone"}.`,
            });
            reload({ silent: true });
          }
        }
      } catch {
        if (!cancelled) setConnection({ connected: false, qr: null, phone: null, serviceOffline: true });
      }
    }

    // Don't call poll() synchronously here — the interval handles it.
    // Calling it inline caused a re-render → effect cleanup → re-run loop.
    // Poll every 2s while modal open OR not connected, else every 10s.
    const fast = showQR || !connection?.connected;
    const interval = setInterval(poll, fast ? 2000 : 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ownerId, token, showQR, connection?.connected]);

  async function handleStartConnection() {
    if (!ownerId) {
      toast.error("Sign in to connect WhatsApp");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/connection", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action: "start" }),
      });
      const json = await res.json();
      if (!res.ok) {
        // On Vercel/serverless, the WhatsApp service isn't running — guide the user to manual mode
        toast.info("Live connection unavailable", {
          description: "WhatsApp QR scanning needs the WhatsApp service running on the server. You can still paste messages manually below.",
          duration: 8000,
        });
      } else {
        setShowQR(true);
        toast.info("Generating QR code...", {
          description: "Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → scan the QR.",
        });
      }
    } catch {
      toast.info("Live connection unavailable", {
        description: "You can still paste messages manually below to send them to the composer.",
        duration: 8000,
      });
    } finally {
      setConnecting(false);
    }
  }

  async function handleLogout() {
    if (!ownerId) return;
    try {
      await fetch("/api/whatsapp/connection", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action: "logout" }),
      });
      toast.success("WhatsApp disconnected");
      setConnection({ connected: false, qr: null, phone: null });
      reload();
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  const allMessages = data ?? [];

  const filtered = React.useMemo(() => {
    let list = allMessages;
    if (statusFilter !== "all") {
      list = list.filter((m) => m.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          (m.groupName ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allMessages, statusFilter, search]);

  const stats = React.useMemo(() => {
    return {
      total: allMessages.length,
      new: allMessages.filter((m) => m.status === "new").length,
      used: allMessages.filter((m) => m.status === "used").length,
      archived: allMessages.filter((m) => m.status === "archived").length,
    };
  }, [allMessages]);

  // === Conversation grouping (for master-detail) ===
  const conversations = React.useMemo(
    () => groupByConversation(filtered),
    [filtered]
  );

  const selectedConvo = React.useMemo(
    () => conversations.find((c) => c.id === selectedConvoId) ?? null,
    [conversations, selectedConvoId]
  );

  // Auto-select first conversation when none is selected (or selection lost).
  React.useEffect(() => {
    if (conversations.length === 0) return;
    if (!selectedConvoId || !conversations.some((c) => c.id === selectedConvoId)) {
      setSelectedConvoId(conversations[0].id);
    }
  }, [conversations, selectedConvoId]);

  // === Sparkline data (7-day histogram) ===
  const messagesSpark = React.useMemo(() => last7DayHistogram(allMessages), [allMessages]);
  const newSpark = React.useMemo(
    () => last7DayHistogram(allMessages.filter((m) => m.status === "new")),
    [allMessages]
  );
  const usedSpark = React.useMemo(
    () => last7DayHistogram(allMessages.filter((m) => m.status === "used")),
    [allMessages]
  );
  // Connected spark — fake stable line based on connected state (1 if connected, 0 if not).
  const connectedSpark = React.useMemo(
    () => allMessages.length > 0 ? messagesSpark.map((n) => Math.max(1, n)) : [0, 1, 0, 1, 0, 1, 1],
    [messagesSpark, allMessages.length]
  );

  const metrics: Metric[] = React.useMemo(() => [
    {
      label: "Messages",
      value: stats.total,
      spark: messagesSpark,
      color: "oklch(0.78 0.18 145)",
    },
    {
      label: "Conversations",
      value: conversations.length,
      spark: messagesSpark,
      color: "oklch(0.7 0.16 230)",
    },
    {
      label: "Unread",
      value: stats.new,
      spark: newSpark,
      color: "oklch(0.74 0.18 165)",
    },
    {
      label: "Connection",
      value: connection?.connected ? "Live" : connection?.serviceOffline ? "Manual" : "Off",
      spark: connectedSpark,
      color: connection?.connected ? "oklch(0.74 0.18 145)" : "oklch(0.72 0.16 75)",
    },
  ], [stats, conversations.length, messagesSpark, newSpark, connectedSpark, connection]);

  async function handleCopy(msg: WhatsAppMessage) {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  function handleSendToComposer(msg: WhatsAppMessage) {
    // Pre-fill the composer with the WhatsApp message content
    openComposer(msg.content);
    // Mark as used
    fetch(`/api/whatsapp/${msg.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "used" }),
    }).then(() => reload());
    toast.success("Sent to Composer", {
      description: "The message is now in your composer — generate AI variants & publish.",
    });
  }

  async function handleArchive(msg: WhatsAppMessage) {
    await fetch(`/api/whatsapp/${msg.id}`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ status: "archived" }),
    });
    reload();
    toast.success("Archived");
  }

  async function handleDelete(msg: WhatsAppMessage) {
    await fetch(`/api/whatsapp/${msg.id}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    reload();
    toast.success("Deleted");
  }

  function selectConversation(convo: Conversation) {
    setSelectedConvoId(convo.id);
    setMobileShowDetail(true);
  }

  function backToList() {
    setMobileShowDetail(false);
  }

  if (loading) return <WhatsAppSkeleton />;

  return (
    <div className="space-y-4">
      <HelpText module="whatsapp">
        <strong className="text-foreground">WhatsApp Inbox</strong> — connect your WhatsApp (scan QR, just like WhatsApp Web)
        to auto-receive messages from groups & chats. Or paste manually. Then send any message to the AI Composer.
      </HelpText>

      {/* === Dense metric strip (replaces 4 KPI cards) === */}
      <MetricRow metrics={metrics} className="crystal-in" />

      {/* === Connection status — compact banner with Pill === */}
      <ConnectionStatusBar
        connection={connection}
        connecting={connecting}
        onConnect={handleStartConnection}
        onDisconnect={handleLogout}
        onShowQR={() => setShowQR(true)}
      />

      {/* === QR MODAL === */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Scan WhatsApp QR
            </DialogTitle>
            <DialogClose asChild>
              <button className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </DialogHeader>
          <QRCodeDisplay connection={connection} />
        </DialogContent>
      </Dialog>

      {/* === Master-detail split — Contacts | Messages === */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* ===== MASTER: Conversation list ===== */}
        <GlassCard
          className={cn(
            "flex flex-col overflow-hidden p-0",
            mobileShowDetail && "hidden lg:flex"
          )}
        >
          {/* Header strip */}
          <div className="border-b border-border/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <SectionHeader
                title="Inbox"
                desc={`${conversations.length} conversations`}
                icon={MessageCircle}
                className="mb-0 flex-1"
              />
              {stats.new > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {stats.new} new
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sender, group or text…"
                aria-label="Search WhatsApp messages"
                className="w-full rounded-lg border border-border/60 bg-background/60 py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2.5">
            {(["all", "new", "used", "archived"] as StatusFilter[]).map((f) => {
              const active = statusFilter === f;
              const meta = STATUS_META[f];
              const count = f === "all"
                ? stats.total
                : f === "new" ? stats.new : f === "used" ? stats.used : stats.archived;
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {f === "all" ? "All" : meta?.label ?? f}
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[9px] font-bold",
                        active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
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
                {conversations.length} {conversations.length === 1 ? "conversation" : "conversations"}
              </span>
              <button
                onClick={() => setShowPasteForm(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
              >
                <Plus className="h-2.5 w-2.5" /> Paste
              </button>
            </div>

            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-3 py-12 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats.total === 0 ? "No messages yet — paste one to start." : "No conversations match your filter."}
                </div>
              </div>
            ) : (
              conversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  convo={c}
                  active={selectedConvoId === c.id}
                  onClick={() => selectConversation(c)}
                />
              ))
            )}
          </div>
        </GlassCard>

        {/* ===== DETAIL: Messages panel ===== */}
        <GlassCard
          className={cn(
            "flex flex-col overflow-hidden p-0",
            !mobileShowDetail && "hidden lg:flex"
          )}
        >
          {!selectedConvo ? (
            <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted/60 text-muted-foreground">
                <MessageCircle className="h-7 w-7" />
              </div>
              <div>
                <div className="text-base font-semibold">Select a conversation</div>
                <div className="text-sm text-muted-foreground">
                  Pick a chat or group on the left to read its messages.
                </div>
              </div>
            </div>
          ) : (
            <ConversationDetail
              convo={selectedConvo}
              copiedId={copiedId}
              onBack={backToList}
              onCopy={handleCopy}
              onSendToComposer={handleSendToComposer}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          )}
        </GlassCard>
      </div>

      {/* === Paste form (collapsible) === */}
      <GlassCard className="crystal-in p-4">
        <SectionHeader
          title="Paste from WhatsApp"
          desc="Copy a message from WhatsApp, then paste it here to publish on social media"
          icon={Plus}
          action={
            <button
              onClick={() => setShowPasteForm(!showPasteForm)}
              className="liquid-pill flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              {showPasteForm ? <Archive className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showPasteForm ? "Close" : "Paste message"}
            </button>
          }
        />
        {showPasteForm && (
          <PasteForm
            userId={user?.id ?? null}
            authHeaders={authHeaders}
            onSaved={() => {
              setShowPasteForm(false);
              reload();
            }}
          />
        )}
      </GlassCard>
    </div>
  );
}

// ============ Conversation Row (master list item) ============
function ConversationRow({
  convo,
  active,
  onClick,
}: {
  convo: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const sourceMeta = SOURCE_META[convo.source] ?? SOURCE_META.group;
  const SourceIcon = sourceMeta.icon;
  const last = convo.lastMessage;
  const isUnread = convo.newCount > 0;

  return (
    <ListRow onClick={onClick} active={active} className="gap-2.5 py-2.5">
      {/* Source icon */}
      <div className={cn("relative grid h-9 w-9 shrink-0 place-items-center rounded-xl", sourceMeta.bg, sourceMeta.color)}>
        <SourceIcon className="h-4 w-4" />
        {convo.newCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
            {convo.newCount}
          </span>
        )}
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
            {convo.name}
          </span>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
            {timeAgo(last.createdAt)}
          </span>
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-[11px]",
            isUnread ? "text-foreground/80" : "text-muted-foreground"
          )}
        >
          {last.content}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="truncate text-[10px] text-muted-foreground">
            {convo.subtitle || sourceMeta.label}
          </span>
          <span className="ml-auto shrink-0 text-[10px] font-medium text-muted-foreground">
            {convo.count} {convo.count === 1 ? "msg" : "msgs"}
          </span>
        </div>
      </div>
    </ListRow>
  );
}

// ============ Conversation Detail (messages panel) ============
function ConversationDetail({
  convo,
  copiedId,
  onBack,
  onCopy,
  onSendToComposer,
  onArchive,
  onDelete,
}: {
  convo: Conversation;
  copiedId: string | null;
  onBack: () => void;
  onCopy: (m: WhatsAppMessage) => void;
  onSendToComposer: (m: WhatsAppMessage) => void;
  onArchive: (m: WhatsAppMessage) => void;
  onDelete: (m: WhatsAppMessage) => void;
}) {
  const sourceMeta = SOURCE_META[convo.source] ?? SOURCE_META.group;
  const SourceIcon = sourceMeta.icon;

  // Display oldest → newest (chat order)
  const ordered = React.useMemo(
    () => [...convo.messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
    [convo.messages]
  );

  return (
    <div className="flex h-full min-h-[70vh] flex-col">
      {/* Detail header */}
      <div className="flex items-start gap-3 border-b border-border/40 p-4">
        <button
          onClick={onBack}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-foreground transition hover:bg-muted lg:hidden"
          aria-label="Back to conversations"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <NameAvatar name={convo.name} className="h-10 w-10 text-xs" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold">{convo.name}</span>
            <Pill color={sourceMeta.color === "text-blue-500" ? "blue" : sourceMeta.color === "text-emerald-500" ? "green" : sourceMeta.color === "text-amber-500" ? "amber" : "violet"}>
              <SourceIcon className="h-2.5 w-2.5" />
              {sourceMeta.label}
            </Pill>
            {convo.newCount > 0 && (
              <Pill color="green">{convo.newCount} new</Pill>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {convo.subtitle || `${convo.count} messages`}
            {convo.lastMessage && (
              <> · last {timeAgo(convo.lastMessage.createdAt)}</>
            )}
          </div>
        </div>
      </div>

      {/* Messages list (chronological) */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 scroll-liquid">
        {ordered.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            copied={copiedId === msg.id}
            onCopy={() => onCopy(msg)}
            onSendToComposer={() => onSendToComposer(msg)}
            onArchive={() => onArchive(msg)}
            onDelete={() => onDelete(msg)}
          />
        ))}
      </div>
    </div>
  );
}

// ============ Message Bubble (single message in detail panel) ============
function MessageBubble({
  msg,
  copied,
  onCopy,
  onSendToComposer,
  onArchive,
  onDelete,
}: {
  msg: WhatsAppMessage;
  copied: boolean;
  onCopy: () => void;
  onSendToComposer: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const statusMeta = STATUS_META[msg.status] ?? STATUS_META.new;

  return (
    <div className="group rounded-xl border border-border/40 bg-background/40 p-3 transition hover:border-border/60">
      {/* Sender + meta */}
      <div className="mb-2 flex items-center gap-2">
        <NameAvatar name={msg.senderName} className="h-6 w-6 text-[10px]" />
        <span className="truncate text-xs font-bold">{msg.senderName}</span>
        {msg.isLive && (
          <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        )}
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
          {timeAgo(msg.createdAt)}
        </span>
        <Pill color={statusMeta.color}>{statusMeta.label}</Pill>
      </div>

      {/* Content */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className={cn("whitespace-pre-wrap text-xs text-foreground/90", !expanded && "line-clamp-4")}>
          {msg.content}
        </div>
      </button>
      {expanded && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {msg.content.length} characters · {msg.content.split("\n").length} lines
        </div>
      )}

      {/* Media preview */}
      {msg.mediaUrl && (
        <div className="mt-2 overflow-hidden rounded-lg border border-border/40">
          <img src={msg.mediaUrl} alt="" className="max-h-48 w-full object-cover" />
        </div>
      )}

      {/* Action row */}
      <div className="mt-2 flex items-center gap-1.5 opacity-100 transition lg:opacity-60 lg:group-hover:opacity-100">
        <button
          onClick={onSendToComposer}
          className="liquid-pill flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold"
        >
          <Sparkles className="h-3 w-3" />
          Send to Composer
          <ChevronRight className="h-3 w-3" />
        </button>
        <button
          onClick={onCopy}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Copy content"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onArchive}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Archive"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============ Paste Form ============
function PasteForm({
  userId,
  authHeaders,
  onSaved,
}: {
  userId: string | null;
  authHeaders: Record<string, string>;
  onSaved: () => void;
}) {
  const [source, setSource] = React.useState("group");
  const [senderName, setSenderName] = React.useState("");
  const [groupName, setGroupName] = React.useState("");
  const [content, setContent] = React.useState("");
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit() {
    if (!content.trim()) {
      toast.error("Paste some content first");
      return;
    }
    if (!senderName.trim()) {
      toast.error("Enter the sender's name");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          source,
          senderName: senderName.trim(),
          groupName: groupName.trim() || null,
          content: content.trim(),
          mediaUrl: mediaUrl.trim() || null,
          savedById: userId,
        }),
      });
      if (res.ok) {
        toast.success("Message saved");
        setSenderName("");
        setGroupName("");
        setContent("");
        setMediaUrl("");
        onSaved();
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setContent(text);
        toast.success("Pasted from clipboard");
      } else {
        toast.info("Clipboard is empty");
      }
    } catch {
      toast.error("Couldn't access clipboard — paste manually with Ctrl+V");
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border/40 bg-muted/20 p-4">
      {/* Source + sender */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Source type
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(SOURCE_META).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => setSource(key)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
                  source === key ? cn(meta.bg, meta.color) : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <meta.icon className="h-3 w-3" />
                {meta.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Sender name *
          </label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="e.g. Sarah Khan"
            className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-sm outline-none transition focus:border-primary/50"
          />
        </div>
      </div>

      {/* Group name */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {source === "group" ? "Group name" : source === "channel" ? "Channel name" : "Chat name (optional)"}
        </label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={source === "group" ? "e.g. Marketing Team" : source === "channel" ? "e.g. Company Updates" : "e.g. John Doe"}
          className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-sm outline-none transition focus:border-primary/50"
        />
      </div>

      {/* Content */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Message content *
          </label>
          <button
            onClick={handlePasteFromClipboard}
            className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
          >
            <Copy className="h-3 w-3" /> Paste from clipboard
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste the WhatsApp message here... (Ctrl+V or click 'Paste from clipboard' above)"
          rows={5}
          className="w-full resize-y rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm outline-none transition focus:border-primary/50"
        />
        {content && (
          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{content.length} characters</span>
            {content.length > 280 && (
              <span className="text-amber-500">
                {Math.ceil(content.length / 280)} tweets worth of content
              </span>
            )}
          </div>
        )}
      </div>

      {/* Media URL (optional) */}
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          Media URL (optional)
        </label>
        <input
          type="url"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-sm outline-none transition focus:border-primary/50"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setSenderName("");
            setGroupName("");
            setContent("");
            setMediaUrl("");
          }}
          className="rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted"
        >
          Clear
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !content.trim() || !senderName.trim()}
          className="liquid-pill flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {saving ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {saving ? "Saving..." : "Save message"}
        </button>
      </div>
    </div>
  );
}

// ============ Connection Status Bar — compact, Pill-based ============
function ConnectionStatusBar({
  connection,
  connecting,
  onConnect,
  onDisconnect,
  onShowQR,
}: {
  connection: ConnectionStatus | null;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onShowQR: () => void;
}) {
  const isOffline = connection?.serviceOffline;
  const isConnected = connection?.connected;
  const hasQR = connection?.qr;

  // Status pill
  let pillColor: "green" | "amber" | "rose" | "blue" = "amber";
  let pillLabel = "Connecting…";
  let PillIcon: LucideIcon = Loader2;
  if (isOffline) {
    pillColor = "amber";
    pillLabel = "Manual mode";
    PillIcon = Smartphone;
  } else if (isConnected) {
    pillColor = "green";
    pillLabel = "Connected";
    PillIcon = Wifi;
  } else if (hasQR) {
    pillColor = "blue";
    pillLabel = "QR ready";
    PillIcon = QrCode;
  }

  const subtitle = isOffline
    ? "Paste messages manually — WhatsApp service isn't running."
    : isConnected
      ? (connection?.phone ? `+${connection.phone}` : "Live") + " — auto-receiving messages"
      : "Scan a QR code with your phone — just like WhatsApp Web.";

  return (
    <GlassCard className="crystal-in p-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status icon */}
        <div className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
          isConnected ? "bg-emerald-500/15 text-emerald-500" : isOffline ? "bg-amber-500/15 text-amber-500" : "bg-amber-500/15 text-amber-500"
        )}>
          <PillIcon className={cn("h-4 w-4", (pillLabel === "Connecting…" || connecting) && "animate-spin")} />
        </div>

        {/* Title + subtitle */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">WhatsApp Connection</span>
            <Pill color={pillColor}>
              <PillIcon className="h-2.5 w-2.5" />
              {pillLabel}
            </Pill>
            {isConnected && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {isOffline && (
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          )}
          {!isOffline && !isConnected && (
            <>
              <button
                onClick={onConnect}
                disabled={connecting}
                className="liquid-pill flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                {connecting ? "Starting…" : "Scan QR"}
              </button>
              {hasQR && (
                <button
                  onClick={onShowQR}
                  className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
                >
                  <QrCode className="h-3.5 w-3.5" /> Show QR
                </button>
              )}
            </>
          )}
          {isConnected && (
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
            >
              <X className="h-3.5 w-3.5" /> Disconnect
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ============ QR Code Display — scan to connect ============
function QRCodeDisplay({ connection }: { connection: ConnectionStatus | null }) {
  const qr = connection?.qr;
  const isConnected = connection?.connected;

  if (isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500">
          <Check className="h-8 w-8" />
        </div>
        <div className="text-sm font-bold text-emerald-500">Connected!</div>
        <div className="text-[11px] text-muted-foreground">You can close this window.</div>
      </div>
    );
  }

  if (!qr) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-sm font-semibold">Generating QR code...</div>
        <div className="text-[11px] text-muted-foreground">
          If this takes more than 10 seconds, the WhatsApp service may be starting up.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="rounded-2xl border-2 border-primary/20 bg-white p-3">
        <img src={qr} alt="WhatsApp QR Code" className="h-56 w-56" />
      </div>
      <div className="max-w-xs space-y-1 text-center">
        <div className="text-sm font-bold">Scan with your phone</div>
        <div className="text-[11px] text-muted-foreground">
          Open WhatsApp → tap the 3-dot menu (Android) or Settings (iOS) →
          <strong className="text-foreground"> Linked Devices</strong> →{" "}
          <strong className="text-foreground">Link a Device</strong> → scan this QR code.
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Waiting for scan...
      </div>
    </div>
  );
}

// ============ Skeleton ============
function WhatsAppSkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-12 rounded-xl" />
      <div className="shimmer h-16 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="shimmer h-96 rounded-xl" />
        <div className="shimmer h-96 rounded-xl" />
      </div>
    </div>
  );
}
