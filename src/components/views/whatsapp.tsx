"use client";

import * as React from "react";
import {
  MessageCircle, Send, Trash2, Archive, Check, Inbox as InboxIcon,
  Users, Clock, Plus, Search, Filter, Copy, CheckCheck,
  Phone, MessageSquare, Radio, Sparkles, ChevronRight, X, Wifi, WifiOff,
  QrCode, Loader2, Smartphone, RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";

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

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  new: { label: "New", color: "text-emerald-500", bg: "bg-emerald-500/15", icon: InboxIcon },
  used: { label: "Used", color: "text-blue-500", bg: "bg-blue-500/15", icon: CheckCheck },
  archived: { label: "Archived", color: "text-muted-foreground", bg: "bg-muted", icon: Archive },
};

// ============ Main view ============

export function WhatsAppView() {
  const { data, loading, reload } = useApi<WhatsAppMessage[]>("/api/whatsapp");
  const { openComposer } = useNav();
  const { user } = useAuth();
  const ownerId = user?.id ?? "";

  const [showPasteForm, setShowPasteForm] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // === WhatsApp live connection state ===
  const [connection, setConnection] = React.useState<ConnectionStatus | null>(null);
  const [showQR, setShowQR] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);

  // Poll connection status every 2s when modal is open OR when not connected
  React.useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/whatsapp/connection?ownerId=${ownerId}`);
        const json = await res.json();
        if (!cancelled) {
          setConnection(json);
          // Auto-close QR modal when connected
          if (json.connected && showQR) {
            setShowQR(false);
            toast.success("WhatsApp connected!", {
              description: `Now receiving live messages from ${json.phone ?? "your phone"}.`,
            });
            reload();
          }
        }
      } catch {
        if (!cancelled) setConnection({ connected: false, qr: null, phone: null, serviceOffline: true });
      }
    }

    poll();
    // Poll every 2s while modal open OR not connected
    const interval = setInterval(poll, showQR || !connection?.connected ? 2000 : 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ownerId, showQR, connection?.connected]);

  async function handleStartConnection() {
    if (!ownerId) {
      toast.error("Sign in to connect WhatsApp");
      return;
    }
    setConnecting(true);
    try {
      const res = await fetch("/api/whatsapp/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", ownerId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error("WhatsApp service unavailable", {
          description: json.error ?? "Ask the admin to start the WhatsApp mini-service.",
          duration: 8000,
        });
      } else {
        setShowQR(true);
        toast.info("Generating QR code...", {
          description: "Open WhatsApp on your phone → Settings → Linked Devices → Link a Device → scan the QR.",
        });
      }
    } catch {
      toast.error("Network error");
    } finally {
      setConnecting(false);
    }
  }

  async function handleLogout() {
    if (!ownerId) return;
    try {
      await fetch("/api/whatsapp/connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout", ownerId }),
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "used" }),
    }).then(() => reload());
    toast.success("Sent to Composer", {
      description: "The message is now in your composer — generate AI variants & publish.",
    });
  }

  async function handleArchive(msg: WhatsAppMessage) {
    await fetch(`/api/whatsapp/${msg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    reload();
    toast.success("Archived");
  }

  async function handleDelete(msg: WhatsAppMessage) {
    await fetch(`/api/whatsapp/${msg.id}`, { method: "DELETE" });
    reload();
    toast.success("Deleted");
  }

  if (loading) return <WhatsAppSkeleton />;

  return (
    <div className="space-y-5">
      <HelpText module="whatsapp">
        <strong className="text-foreground">WhatsApp Inbox</strong> — connect your WhatsApp (scan QR, just like WhatsApp Web)
        to auto-receive messages from groups & chats. Or paste manually. Then send any message to the AI Composer.
      </HelpText>

      {/* === CONNECTION BANNER (NEW) — live WhatsApp connection === */}
      <ConnectionBanner
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

      {/* === KPI strip === */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Messages"
          value={stats.total}
          icon={<MessageCircle className="h-5 w-5" />}
          accent="oklch(0.78 0.18 145)"
          hint="pasted from WhatsApp"
          delay={50}
        />
        <KpiCard
          label="New"
          value={stats.new}
          icon={<InboxIcon className="h-5 w-5" />}
          accent="oklch(0.74 0.18 165)"
          hint="waiting to be published"
          delay={120}
        />
        <KpiCard
          label="Used"
          value={stats.used}
          icon={<CheckCheck className="h-5 w-5" />}
          accent="oklch(0.62 0.22 255)"
          hint="sent to composer"
          delay={190}
        />
        <KpiCard
          label="Archived"
          value={stats.archived}
          icon={<Archive className="h-5 w-5" />}
          accent="oklch(0.66 0.22 305)"
          hint="no longer needed"
          delay={260}
        />
      </div>

      {/* === Paste form === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.30s" }}>
        <SectionTitle
          title="Paste from WhatsApp"
          desc="Copy a message from WhatsApp, then paste it here to publish on social media"
          action={
            <button
              onClick={() => setShowPasteForm(!showPasteForm)}
              className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
            >
              {showPasteForm ? <Archive className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showPasteForm ? "Close" : "Paste message"}
            </button>
          }
        />
        {showPasteForm && (
          <PasteForm
            userId={user?.id ?? null}
            onSaved={() => {
              setShowPasteForm(false);
              reload();
            }}
          />
        )}
      </GlassCard>

      {/* === Messages list === */}
      <GlassCard className="crystal-in p-5" style={{ animationDelay: "0.38s" }}>
        <SectionTitle
          title="Saved messages"
          desc={`${filtered.length} of ${stats.total} messages`}
          action={
            <div className="flex items-center gap-1.5">
              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-32 rounded-lg border border-border/50 bg-background/60 py-1.5 pl-7 pr-2 text-xs outline-none transition focus:border-primary/50 sm:w-48"
                />
              </div>
            </div>
          }
        />

        {/* Status filter pills */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {(["all", "new", "used", "archived"] as StatusFilter[]).map((f) => (
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
              {f === "all" ? "All" : STATUS_META[f]?.label ?? f}
              {f !== "all" && stats[f] > 0 && (
                <span className="ml-1.5 text-[10px] opacity-70">({stats[f]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="scroll-liquid max-h-[600px] space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {stats.total === 0 ? "No messages yet" : "No messages match your filter"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {stats.total === 0
                    ? "Paste a message from WhatsApp to get started"
                    : "Try a different filter or search term"}
                </p>
              </div>
              {stats.total === 0 && (
                <button
                  onClick={() => setShowPasteForm(true)}
                  className="rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
                >
                  Paste message
                </button>
              )}
            </div>
          ) : (
            filtered.map((msg, i) => (
              <MessageCard
                key={msg.id}
                msg={msg}
                copied={copiedId === msg.id}
                onCopy={() => handleCopy(msg)}
                onSendToComposer={() => handleSendToComposer(msg)}
                onArchive={() => handleArchive(msg)}
                onDelete={() => handleDelete(msg)}
                delay={i * 0.03}
              />
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ============ Paste Form ============
function PasteForm({ userId, onSaved }: { userId: string | null; onSaved: () => void }) {
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
        headers: { "Content-Type": "application/json" },
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
        toast.error("Failed to save");
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
    <div className="mt-4 space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
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

// ============ Message Card ============
function MessageCard({
  msg,
  copied,
  onCopy,
  onSendToComposer,
  onArchive,
  onDelete,
  delay,
}: {
  msg: WhatsAppMessage;
  copied: boolean;
  onCopy: () => void;
  onSendToComposer: () => void;
  onArchive: () => void;
  onDelete: () => void;
  delay: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const sourceMeta = SOURCE_META[msg.source] ?? SOURCE_META.group;
  const statusMeta = STATUS_META[msg.status] ?? STATUS_META.new;
  const SourceIcon = sourceMeta.icon;
  const StatusIcon = statusMeta.icon;

  return (
    <div
      className="crystal-in glass rounded-2xl border border-border/40 p-3 transition hover:lift-hover"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", sourceMeta.bg, sourceMeta.color)}>
          <SourceIcon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold">{msg.senderName}</span>
            <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase", statusMeta.bg, statusMeta.color)}>
              {statusMeta.label}
            </span>
            {msg.isLive && (
              <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            {msg.groupName && <span className="truncate">{msg.groupName}</span>}
            {msg.groupName && <span>·</span>}
            <span>{timeAgo(msg.createdAt)}</span>
            {msg.savedByName && (
              <>
                <span>·</span>
                <span>by {msg.savedByName}</span>
              </>
            )}
          </div>
        </div>
        <span className={cn("flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold", sourceMeta.bg, sourceMeta.color)}>
          <SourceIcon className="h-2.5 w-2.5" />
          {sourceMeta.label}
        </span>
      </div>

      {/* Content */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 w-full text-left"
      >
        <div className={cn("text-sm text-foreground/90", !expanded && "line-clamp-3")}>
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
        <div className="mt-2 overflow-hidden rounded-xl border border-border/40">
          <img src={msg.mediaUrl} alt="" className="max-h-48 w-full object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex items-center gap-1.5">
        {/* Primary: Send to Composer */}
        <button
          onClick={onSendToComposer}
          className="liquid-pill flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Send to Composer
          <ChevronRight className="h-3 w-3" />
        </button>

        {/* Copy */}
        <button
          onClick={onCopy}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Copy content"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>

        {/* Archive */}
        <button
          onClick={onArchive}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border/50 bg-background/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          title="Archive"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>

        {/* Delete */}
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

// ============ Connection Banner — live WhatsApp status ============
function ConnectionBanner({
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

  // Service offline — show error state
  if (isOffline) {
    return (
      <GlassCard className="crystal-in border-rose-500/30 p-4" style={{ animationDelay: "0.15s" }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-500">
            <WifiOff className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">WhatsApp service is not running</div>
            <div className="text-[11px] text-muted-foreground">
              The admin needs to start the WhatsApp mini-service:
              <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">cd mini-services/whatsapp-service && bun run dev</code>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-semibold transition hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      </GlassCard>
    );
  }

  // Connected — show success state
  if (isConnected) {
    return (
      <GlassCard className="crystal-in border-emerald-500/30 bg-emerald-500/5 p-4" style={{ animationDelay: "0.15s" }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <Wifi className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-75" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              WhatsApp Connected
              <Check className="h-3.5 w-3.5" />
            </div>
            <div className="text-[11px] text-muted-foreground">
              {connection?.phone ? `+${connection.phone}` : "Live"} — auto-receiving messages from groups & chats
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
          >
            <X className="h-3.5 w-3.5" /> Disconnect
          </button>
        </div>
      </GlassCard>
    );
  }

  // Disconnected — show connect button
  return (
    <GlassCard className="crystal-in border-amber-500/30 bg-amber-500/5 p-4" style={{ animationDelay: "0.15s" }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">Connect your WhatsApp</div>
          <div className="text-[11px] text-muted-foreground">
            Scan a QR code with your phone — just like WhatsApp Web. Messages from groups & chats will appear here automatically.
          </div>
        </div>
        <button
          onClick={onConnect}
          disabled={connecting}
          className="liquid-pill flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
          {connecting ? "Starting..." : "Scan QR Code"}
        </button>
        {hasQR && (
          <button
            onClick={onShowQR}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            <QrCode className="h-3.5 w-3.5" /> Show QR
          </button>
        )}
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
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="shimmer h-32 rounded-3xl" />)}
      </div>
      <div className="shimmer h-48 rounded-3xl" />
      <div className="shimmer h-96 rounded-3xl" />
    </div>
  );
}
