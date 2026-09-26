"use client";

import * as React from "react";
import {
  Mail,
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox as InboxIcon,
  Send,
  Star,
  Trash2,
  Search,
  Shield,
  HardDrive,
  UserPlus,
  Mailbox,
  Wifi,
  Lock,
  CornerDownLeft,
  SquarePen,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
import { HelpText } from "@/components/glass/help-text";
import {
  MetricRow,
  SectionHeader,
  ListRow,
  Pill,
  NavCard,
  type Metric,
} from "@/components/glass/dense-ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

interface MailServerData {
  servers: ServerInfo[];
  totalMessages: number;
}
interface ServerInfo {
  id: string;
  name: string;
  provider: string;
  domain: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  status: "pending" | "connected" | "error";
  lastCheck: string | null;
  createdAt: string;
  mailboxCount: number;
  usedMb: number;
  totalQuotaMb: number;
  mailboxes: MailboxInfo[];
}
interface MailboxInfo {
  id: string;
  email: string;
  displayName: string;
  quotaMb: number;
  usedMb: number;
  ownerId: string;
  ownerName: string | null;
  ownerColor: string | null;
  status: "active" | "suspended" | "creating";
  role: "admin" | "member";
  unread: number;
  createdAt: string;
}
interface MessageInfo {
  id: string;
  mailboxId: string;
  mailboxEmail: string;
  fromAddr: string;
  toAddr: string;
  subject: string;
  body: string;
  direction: "in" | "out";
  folder: string;
  isRead: boolean;
  isStarred: boolean;
  date: string;
}

const PROVIDERS = [
  { id: "hostinger", name: "Hostinger", imap: "imap.hostinger.com", smtp: "smtp.hostinger.com", hint: "imap.hostinger.com:993 · smtp.hostinger.com:465" },
  { id: "cpanel", name: "cPanel / Web Host", imap: "mail.yourdomain.com", smtp: "mail.yourdomain.com", hint: "Uses your hosting's mail server" },
  { id: "zoho", name: "Zoho Mail", imap: "imap.zoho.com", smtp: "smtp.zoho.com", hint: "imap.zoho.com:993 · smtp.zoho.com:465" },
  { id: "mailgun", name: "Mailgun", imap: "", smtp: "smtp.mailgun.org", hint: "SMTP relay service" },
  { id: "custom", name: "Custom / Other", imap: "", smtp: "", hint: "Enter your own IMAP & SMTP settings" },
];

const STATUS_PILL: Record<ServerInfo["status"], { color: "green" | "amber" | "rose"; icon: typeof CheckCircle2 }> = {
  connected: { color: "green", icon: CheckCircle2 },
  pending: { color: "amber", icon: Loader2 },
  error: { color: "rose", icon: AlertCircle },
};

// ============================================================================
// MailView — dense master-detail layout (single GlassCard replaces 13 cards).
// Top: SectionHeader toolbar + MetricRow (mail servers / mailboxes / unread / messages).
// Below: ONE master-detail GlassCard with 3 columns:
//   1. Servers + mailboxes sidebar (NavCard per server, ListRow per mailbox)
//   2. Message list (folder tabs + ListRow items)
//   3. Message detail preview OR server connection summary
// ============================================================================

export function MailView() {
  const { data, loading, reload } = useApi<MailServerData>("/api/mail");
  const [serverOpen, setServerOpen] = React.useState(false);
  const [mailboxOpen, setMailboxOpen] = React.useState(false);
  const [composing, setComposing] = React.useState(false);
  const [activeServerId, setActiveServerId] = React.useState<string | null>(null);
  const [activeMailboxId, setActiveMailboxId] = React.useState<string | null>(null);
  const [expandedServers, setExpandedServers] = React.useState<Set<string>>(new Set());
  const [testing, setTesting] = React.useState<string | null>(null);

  // Lifted from old MailboxInbox — message list state lives at the top so the
  // detail panel can read the selected message without prop-drilling reload().
  const [folder, setFolder] = React.useState<string>("inbox");
  const [selectedMsgId, setSelectedMsgId] = React.useState<string | null>(null);

  const servers = data?.servers ?? [];
  const activeServer = servers.find((s) => s.id === activeServerId) ?? servers[0] ?? null;
  const activeMailbox =
    activeServer?.mailboxes.find((m) => m.id === activeMailboxId) ?? null;

  // Fetch messages for the active mailbox (null endpoint = skip fetch).
  const messagesEndpoint = activeMailboxId
    ? `/api/mail/messages?mailboxId=${activeMailboxId}`
    : null;
  const { data: messages, reload: reloadMessages } = useApi<MessageInfo[] | null>(messagesEndpoint);
  const allMessages = messages ?? [];
  const filteredMessages =
    folder === "all" ? allMessages : allMessages.filter((m) => m.folder === folder);
  const selectedMsg = filteredMessages.find((m) => m.id === selectedMsgId) ?? null;
  const unreadCount = allMessages.filter((m) => m.folder === "inbox" && !m.isRead).length;

  // Default to first server + auto-expand once data loads.
  React.useEffect(() => {
    if (!activeServerId && servers[0]) {
      setActiveServerId(servers[0].id);
      setExpandedServers(new Set([servers[0].id]));
    }
  }, [servers, activeServerId]);

  // Reset selected message when mailbox or folder changes — stale selection
  // would otherwise show a message from a different mailbox.
  React.useEffect(() => {
    setSelectedMsgId(null);
  }, [activeMailboxId, folder]);

  const testConnection = async (serverId: string) => {
    setTesting(serverId);
    try {
      const res = await fetch("/api/mail/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Mail server connected", { description: json.message });
        reload();
      } else toast.error(json.error ?? "Connection failed");
    } catch {
      toast.error("Network error");
    } finally {
      setTesting(null);
    }
  };

  const markRead = async (id: string) => {
    await fetch("/api/mail/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isRead: true }),
    });
    reloadMessages();
  };

  const toggleServer = (id: string) => {
    setActiveServerId(id);
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectMailbox = (serverId: string, mailboxId: string) => {
    setActiveServerId(serverId);
    setActiveMailboxId(mailboxId);
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-10 rounded-xl" />
        <div className="shimmer h-14 rounded-xl" />
        <div className="shimmer h-[560px] rounded-xl" />
      </div>
    );
  }

  const totalMailboxes = servers.reduce((s, x) => s + x.mailboxCount, 0);
  const totalUsedMb = servers.reduce((s, x) => s + x.usedMb, 0);
  const activeServers = servers.filter((s) => s.status === "connected").length;
  const totalUnread = servers.reduce(
    (s, x) => s + x.mailboxes.reduce((ms, m) => ms + m.unread, 0),
    0
  );

  // Sparkline series derived from real data — never fabricate trends.
  const serversSpark = servers.map((s) => Math.max(1, s.mailboxCount));
  const allMailboxes = servers.flatMap((s) => s.mailboxes);
  const mailboxesSpark = allMailboxes.slice(0, 12).map((m) => Math.max(1, m.usedMb));
  const unreadSpark = allMailboxes.slice(0, 12).map((m) => Math.max(0, m.unread));

  const metrics: Metric[] = [
    { label: "Mail servers", value: servers.length, spark: serversSpark, color: "oklch(0.7 0.24 14)" },
    { label: "Mailboxes", value: totalMailboxes, spark: mailboxesSpark, color: "oklch(0.74 0.18 165)" },
    { label: "Unread", value: totalUnread, spark: unreadSpark, color: "oklch(0.66 0.22 305)" },
    { label: "Messages", value: data.totalMessages, color: "oklch(0.78 0.18 75)" },
  ];

  return (
    <div className="space-y-4">
      <HelpText module="mail">
        <strong className="text-foreground">Mail</strong> — host your team&apos;s
        email on a custom domain. Connect a mail server, provision mailboxes,
        send &amp; receive — no Google or third-party accounts needed.
      </HelpText>

      {/* Toolbar — SectionHeader + actions (no card) */}
      <SectionHeader
        title="Mail server"
        desc={
          activeServer
            ? `${activeServer.name} · @${activeServer.domain} · ${activeServer.mailboxCount} mailboxes`
            : "No mail server connected"
        }
        icon={Mail}
        action={
          <div className="flex items-center gap-2">
            {servers.length > 0 && (
              <button
                onClick={() => setMailboxOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs font-semibold transition hover:bg-muted"
              >
                <UserPlus className="h-3.5 w-3.5" /> New mailbox
              </button>
            )}
            <button
              onClick={() => setServerOpen(true)}
              className="liquid-pill glow-ring flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
            >
              <Server className="h-3.5 w-3.5" /> Connect server
            </button>
          </div>
        }
      />

      {/* Dense metric strip */}
      <MetricRow metrics={metrics} />

      {/* Master-detail GlassCard (1 card replaces 13) */}
      {servers.length === 0 ? (
        <GlassCard className="p-12">
          <div className="grid place-items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Server className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No mail server connected</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Connect your own mail server (Hostinger, cPanel, Zoho or any
              provider) on your custom domain to start creating team mailboxes.
            </p>
            <button
              onClick={() => setServerOpen(true)}
              className="liquid-pill glow-ring mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Connect your first server
            </button>
          </div>
        </GlassCard>
      ) : (
        <GlassCard strong className="overflow-hidden p-0">
          {/* Card toolbar — active context + status + compose */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border/40 px-4 py-2.5">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-sm">
              <Mailbox className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">
                {activeMailbox ? activeMailbox.email : activeServer?.name ?? "Select a mailbox"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {activeMailbox
                  ? `${activeMailbox.ownerName ? `Owner ${activeMailbox.ownerName}` : "Unassigned"} · ${fmt(activeMailbox.usedMb)} MB used`
                  : `${servers.length} servers · ${totalMailboxes} mailboxes · ${totalUnread} unread`}
              </div>
            </div>
            {activeServer && (
              <Pill color={STATUS_PILL[activeServer.status].color}>
                {activeServer.status === "pending" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                {activeServer.status}
              </Pill>
            )}
            {activeMailboxId && (
              <button
                onClick={() => setComposing(true)}
                className="liquid-pill glow-ring flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              >
                <SquarePen className="h-3.5 w-3.5" /> Compose
              </button>
            )}
          </div>

          {/* 3-column master-detail grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[240px_320px_1fr]">
            {/* ============= Sidebar — servers + mailboxes ============= */}
            <div className="scroll-liquid max-h-[640px] overflow-y-auto border-b border-border/40 p-2 lg:border-b-0 lg:border-r">
              <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Servers
              </div>
              <div className="space-y-1.5">
                {servers.map((s) => {
                  const expanded = expandedServers.has(s.id);
                  const accent =
                    s.status === "connected"
                      ? "oklch(0.74 0.18 165)"
                      : s.status === "error"
                      ? "oklch(0.62 0.24 27)"
                      : "oklch(0.78 0.18 75)";
                  return (
                    <div key={s.id}>
                      <NavCard
                        icon={Server}
                        title={s.name}
                        desc={`@${s.domain}`}
                        count={s.mailboxCount}
                        accent={accent}
                        active={expanded || activeServerId === s.id}
                        onClick={() => toggleServer(s.id)}
                      />
                      {expanded && s.mailboxes.length > 0 && (
                        <div className="mt-1 ml-3 space-y-0.5 border-l border-border/40 pl-2">
                          {s.mailboxes.map((m) => (
                            <ListRow
                              key={m.id}
                              onClick={() => selectMailbox(s.id, m.id)}
                              active={activeMailboxId === m.id}
                              className="px-2 py-2"
                            >
                              <NameAvatar
                                name={m.displayName}
                                color={m.ownerColor}
                                className="h-7 w-7 text-[10px]"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="truncate text-xs font-semibold">
                                    {m.email}
                                  </span>
                                  {m.role === "admin" && (
                                    <Pill color="violet" className="px-1 py-0 text-[9px]">
                                      Admin
                                    </Pill>
                                  )}
                                  {m.status === "creating" && (
                                    <Pill color="amber" className="px-1 py-0 text-[9px]">
                                      <Loader2 className="h-2 w-2 animate-spin" />
                                      Provisioning
                                    </Pill>
                                  )}
                                </div>
                                <div className="truncate text-[10px] text-muted-foreground">
                                  {m.ownerName ?? "Unassigned"} · {fmt(m.usedMb)} MB
                                </div>
                              </div>
                              {m.unread > 0 && (
                                <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                                  {m.unread}
                                </span>
                              )}
                            </ListRow>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ============= Message list ============= */}
            <div className="flex flex-col border-b border-border/40 lg:border-b-0 lg:border-r">
              {activeMailboxId ? (
                <>
                  {/* Folder tabs */}
                  <div className="flex items-center gap-0.5 border-b border-border/40 px-2 py-1.5">
                    {[
                      { id: "inbox", label: "Inbox", icon: InboxIcon, count: unreadCount },
                      { id: "starred", label: "Starred", icon: Star, count: allMessages.filter((m) => m.folder === "starred").length },
                      { id: "sent", label: "Sent", icon: Send, count: allMessages.filter((m) => m.folder === "sent").length },
                    ].map((f) => {
                      const Icon = f.icon;
                      const active = folder === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => setFolder(f.id)}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition",
                            active
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {f.label}
                          {f.count > 0 && (
                            <span className="tabular-nums text-[10px] opacity-70">{f.count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Messages */}
                  <div className="scroll-liquid max-h-[580px] overflow-y-auto">
                    {filteredMessages.length === 0 ? (
                      <div className="grid place-items-center py-12 text-center text-xs text-muted-foreground">
                        <InboxIcon className="mb-2 h-8 w-8 opacity-40" />
                        No messages in {folder}
                      </div>
                    ) : (
                      filteredMessages.map((m) => (
                        <ListRow
                          key={m.id}
                          onClick={() => {
                            setSelectedMsgId(m.id);
                            if (!m.isRead) markRead(m.id);
                          }}
                          active={selectedMsgId === m.id}
                          className={cn(
                            "flex-col items-stretch gap-0.5 px-3 py-2.5",
                            !m.isRead && m.direction === "in" && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {!m.isRead && m.direction === "in" && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            )}
                            {m.isStarred && (
                              <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                            )}
                            <span className="truncate text-xs font-semibold">
                              {m.direction === "out" ? `To: ${m.toAddr}` : m.fromAddr}
                            </span>
                            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                              {timeAgo(m.date)}
                            </span>
                          </div>
                          <div className="truncate text-[11px] font-medium">{m.subject}</div>
                          <div className="truncate text-[10px] text-muted-foreground">
                            {m.body.replace(/\n/g, " ").slice(0, 90)}
                          </div>
                        </ListRow>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="grid h-full min-h-[280px] place-items-center p-8 text-center">
                  <div>
                    <Mailbox className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Select a mailbox on the left to view messages
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ============= Detail panel ============= */}
            <div className="min-h-[400px]">
              {selectedMsg ? (
                <div className="flex h-full flex-col">
                  <div className="border-b border-border/40 p-4">
                    <div className="flex items-center gap-2">
                      <NameAvatar name={selectedMsg.fromAddr} className="h-9 w-9 text-[11px]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{selectedMsg.fromAddr}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          to {selectedMsg.toAddr}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {timeAgo(selectedMsg.date)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold">{selectedMsg.subject}</h3>
                  </div>
                  <div className="scroll-liquid flex-1 overflow-y-auto p-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                      {selectedMsg.body}
                    </pre>
                  </div>
                  <div className="flex gap-2 border-t border-border/40 p-3">
                    <button
                      onClick={() => setComposing(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted"
                    >
                      <CornerDownLeft className="h-3.5 w-3.5" /> Reply
                    </button>
                    <button className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted">
                      <Star className="h-3.5 w-3.5" /> Star
                    </button>
                    <button className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ) : activeServer ? (
                <ServerSummary
                  server={activeServer}
                  testing={testing === activeServer.id}
                  onTest={() => testConnection(activeServer.id)}
                  onCreateMailbox={() => setMailboxOpen(true)}
                />
              ) : (
                <div className="grid h-full min-h-[280px] place-items-center p-8 text-center">
                  <div>
                    <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">Select a message to read</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Dialogs (modals — not counted as cards) */}
      <AddServerDialog
        open={serverOpen}
        onOpenChange={setServerOpen}
        onCreated={() => {
          setServerOpen(false);
          reload();
        }}
      />
      <CreateMailboxDialog
        open={mailboxOpen}
        onOpenChange={setMailboxOpen}
        servers={servers}
        onCreated={() => {
          setMailboxOpen(false);
          reload();
        }}
      />
      {activeMailboxId && (
        <ComposeDialog
          open={composing}
          onOpenChange={setComposing}
          mailboxId={activeMailboxId}
          onSent={() => {
            setComposing(false);
            reloadMessages();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// ServerSummary — inline detail panel shown when no message is selected.
// Replaces the old per-server GlassCard with a compact connection summary.
// ============================================================================

function ServerSummary({
  server,
  testing,
  onTest,
  onCreateMailbox,
}: {
  server: ServerInfo;
  testing: boolean;
  onTest: () => void;
  onCreateMailbox: () => void;
}) {
  const usedPct = server.totalQuotaMb
    ? Math.round((server.usedMb / server.totalQuotaMb) * 100)
    : 0;

  return (
    <div className="p-4">
      <SectionHeader
        title="Connection"
        desc={`${server.provider} · @${server.domain} · ${server.mailboxCount} mailboxes`}
        icon={Server}
        action={
          <button
            onClick={onTest}
            disabled={testing}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Test
          </button>
        }
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <Lock className="h-3 w-3" /> IMAP
          </span>
          <span className="font-mono">
            {server.imapHost}:{server.imapPort}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <Send className="h-3 w-3" /> SMTP
          </span>
          <span className="font-mono">
            {server.smtpHost}:{server.smtpPort}
          </span>
        </div>
        <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3 w-3" /> Storage
            </span>
            <span className="tabular-nums">
              {fmt(server.usedMb)} MB / {fmt(server.totalQuotaMb)} MB ({usedPct}%)
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--gold)]"
              style={{ width: `${Math.min(usedPct, 100)}%` }}
            />
          </div>
        </div>
        <button
          onClick={onCreateMailbox}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          <UserPlus className="h-3.5 w-3.5" /> Provision new mailbox on @{server.domain}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ComposeDialog — send a new message from the active mailbox.
// ============================================================================

function ComposeDialog({
  open,
  onOpenChange,
  mailboxId,
  onSent,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  mailboxId: string;
  onSent: () => void;
}) {
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    if (!to || !subject) return toast.error("Recipient and subject required");
    setSending(true);
    try {
      const res = await fetch("/api/mail/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailboxId, toAddr: to, subject, body }),
      });
      if (res.ok) {
        toast.success("Message sent", { description: `Delivered to ${to}` });
        setTo("");
        setSubject("");
        setBody("");
        onSent();
      } else toast.error("Failed to send");
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" /> Compose new mail
          </DialogTitle>
          <DialogDescription>Send from this mailbox to any address.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">To</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              className="mt-1 min-h-[140px] w-full resize-y rounded-xl border border-border/50 bg-muted/30 p-3 text-sm outline-none focus:border-primary/50"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// AddServerDialog — connect a new mail server (Hostinger, cPanel, Zoho, custom).
// ============================================================================

function AddServerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreated: () => void;
}) {
  const [provider, setProvider] = React.useState("hostinger");
  const [form, setForm] = React.useState({
    name: "SocialFlow Primary Mail",
    domain: "prism.co",
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    username: "admin@prism.co",
    password: "",
    fromName: "SocialFlow Team",
    fromEmail: "hello@prism.co",
  });
  const [creating, setCreating] = React.useState(false);

  const onProviderChange = (v: string) => {
    setProvider(v);
    const p = PROVIDERS.find((x) => x.id === v);
    if (p && (p.imap || p.smtp)) {
      setForm((f) => ({
        ...f,
        imapHost: p.imap || f.imapHost,
        smtpHost: p.smtp || f.smtpHost,
      }));
    }
  };

  const create = async () => {
    if (!form.domain || !form.imapHost || !form.smtpHost || !form.username || !form.password) {
      return toast.error("Fill all required fields");
    }
    setCreating(true);
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, provider, imapSecure: true, smtpSecure: true }),
      });
      if (res.ok) {
        toast.success("Mail server added", { description: "Running connection test…" });
        onCreated();
      } else toast.error("Failed to add server");
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" /> Connect mail server
          </DialogTitle>
          <DialogDescription>
            Configure your own mail server on a custom domain. No Google accounts
            — host your team&apos;s email on Hostinger, cPanel, Zoho, or any
            provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Provider</Label>
            <Select value={provider} onValueChange={onProviderChange}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.hint}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Server name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Domain" value={form.domain} onChange={(v) => setForm({ ...form, domain: v })} placeholder="prism.co" />
          </div>

          <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Lock className="h-3 w-3" /> IMAP (incoming mail)
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_100px]">
              <Field label="IMAP host" value={form.imapHost} onChange={(v) => setForm({ ...form, imapHost: v })} />
              <NumberField label="Port" value={form.imapPort} onChange={(v) => setForm({ ...form, imapPort: v })} />
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Send className="h-3 w-3" /> SMTP (outgoing mail)
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_100px]">
              <Field label="SMTP host" value={form.smtpHost} onChange={(v) => setForm({ ...form, smtpHost: v })} />
              <NumberField label="Port" value={form.smtpPort} onChange={(v) => setForm({ ...form, smtpPort: v })} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Admin username" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
            <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From name" value={form.fromName} onChange={(v) => setForm({ ...form, fromName: v })} />
            <Field label="From email" value={form.fromEmail} onChange={(v) => setForm({ ...form, fromEmail: v })} />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-[11px] text-muted-foreground">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>
              Credentials are stored encrypted for this workspace. SocialFlow
              uses this connection to provision and manage mailboxes on your
              domain.
            </span>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={creating}
            className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Connect &amp; test
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// CreateMailboxDialog — provision a new mailbox on a connected server.
// ============================================================================

interface TeamMemberLite {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
  status: string;
}

function CreateMailboxDialog({
  open,
  onOpenChange,
  servers,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  servers: ServerInfo[];
  onCreated: () => void;
}) {
  const { data: team } = useApi<TeamMemberLite[]>("/api/team");
  const [serverId, setServerId] = React.useState(servers[0]?.id ?? "");
  const [localPart, setLocalPart] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [quotaMb, setQuotaMb] = React.useState(2048);
  const [ownerId, setOwnerId] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const domain = servers.find((s) => s.id === serverId)?.domain ?? "";
  const fullEmail = localPart ? `${localPart}@${domain}` : `name@${domain}`;

  React.useEffect(() => {
    if (!serverId && servers[0]) setServerId(servers[0].id);
  }, [servers, serverId]);

  const create = async () => {
    if (!localPart || !password) return toast.error("Local part and password required");
    setCreating(true);
    try {
      const res = await fetch("/api/mail/mailboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId,
          localPart,
          displayName,
          password,
          quotaMb,
          ownerId: ownerId && ownerId !== "none" ? ownerId : null,
        }),
      });
      if (res.ok) {
        toast.success("Mailbox created", {
          description: `${localPart}@${domain} is being provisioned`,
        });
        setLocalPart("");
        setDisplayName("");
        setPassword("");
        onCreated();
      } else {
        const j = await res.json();
        toast.error(j.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Create new mailbox
          </DialogTitle>
          <DialogDescription>
            Provision a new email account on your custom domain for a team member.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Mail server</Label>
            <Select value={serverId} onValueChange={setServerId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · @{s.domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Email address</Label>
            <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-border/50 bg-muted/30">
              <input
                value={localPart}
                onChange={(e) =>
                  setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))
                }
                placeholder="daniel"
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              />
              <span className="border-l border-border/50 bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                @{domain}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Preview: <span className="font-mono">{fullEmail}</span>
            </div>
          </div>
          <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Daniel Cho" />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quota (MB)</Label>
              <Input
                type="number"
                value={quotaMb}
                onChange={(e) => setQuotaMb(parseInt(e.target.value) || 2048)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-xs">Assign to</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(team ?? [])
                    .filter((m) => m.status !== "suspended")
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={creating}
            className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create mailbox
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Form field helpers
// ============================================================================

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="mt-1.5"
      />
    </div>
  );
}
