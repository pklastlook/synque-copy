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
  Settings2,
  Wifi,
  Lock,
  ArrowLeft,
  CornerDownLeft,
} from "lucide-react";
import { useApi, fmt, timeAgo } from "@/lib/hooks";
import { GlassCard, KpiCard, SectionTitle } from "@/components/glass/glass-card";
import { NameAvatar } from "@/components/glass/name-avatar";
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

export function MailView() {
  const { data, loading, reload } = useApi<MailServerData>("/api/mail");
  const [serverOpen, setServerOpen] = React.useState(false);
  const [mailboxOpen, setMailboxOpen] = React.useState(false);
  const [activeMailbox, setActiveMailbox] = React.useState<string | null>(null);
  const [testing, setTesting] = React.useState<string | null>(null);

  const servers = data?.servers ?? [];

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

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="shimmer h-28 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-32 rounded-3xl" />
          ))}
        </div>
        <div className="shimmer h-[500px] rounded-3xl" />
      </div>
    );
  }

  const totalMailboxes = servers.reduce((s, x) => s + x.mailboxCount, 0);
  const totalUsedMb = servers.reduce((s, x) => s + x.usedMb, 0);
  const activeServers = servers.filter((s) => s.status === "connected").length;

  return (
    <div className="space-y-5">
      {/* Hero */}
      <GlassCard strong className="glass-sheen relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[var(--primary)]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Mail className="h-3.5 w-3.5" />
              Custom domain mail · {servers[0]?.domain ?? "no domain configured"}
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Your team&apos;s <span className="retaina-text">mail server</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Host your own mailboxes on a custom domain — no Google or third-party accounts needed.
              Connect Hostinger, cPanel, Zoho or any provider, then create and assign mailboxes to your team.
            </p>
          </div>
          <button
            onClick={() => setServerOpen(true)}
            className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold"
          >
            <Server className="h-4 w-4" />
            Connect mail server
          </button>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Mail servers" value={servers.length} icon={<Server className="h-5 w-5" />} accent="oklch(0.7 0.24 14)" hint={`${activeServers} connected`} />
        <KpiCard label="Mailboxes" value={totalMailboxes} icon={<Mailbox className="h-5 w-5" />} accent="oklch(0.74 0.18 165)" hint="team accounts" />
        <KpiCard label="Storage used" value={fmt(totalUsedMb) + " MB"} icon={<HardDrive className="h-5 w-5" />} accent="oklch(0.66 0.22 305)" hint="across mailboxes" />
        <KpiCard label="Messages" value={data.totalMessages} icon={<InboxIcon className="h-5 w-5" />} accent="oklch(0.78 0.18 75)" hint="stored" />
      </div>

      {/* Servers + Mailboxes */}
      {servers.length === 0 ? (
        <GlassCard className="p-12">
          <div className="grid place-items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary">
              <Server className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No mail server connected</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Connect your own mail server (Hostinger, cPanel, Zoho or any provider) on your custom domain to start creating team mailboxes.
            </p>
            <button
              onClick={() => setServerOpen(true)}
              className="liquid-pill glow-ring mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Connect your first server
            </button>
          </div>
        </GlassCard>
      ) : (
        servers.map((s) => (
          <ServerCard
            key={s.id}
            server={s}
            testing={testing === s.id}
            onTest={() => testConnection(s.id)}
            onCreateMailbox={() => setMailboxOpen(true)}
            onOpenMailbox={(id) => setActiveMailbox(id)}
          />
        ))
      )}

      {/* Mailbox inbox view (drawer-like) */}
      {activeMailbox && (
        <MailboxInbox
          mailboxId={activeMailbox}
          onClose={() => setActiveMailbox(null)}
        />
      )}

      <AddServerDialog open={serverOpen} onOpenChange={setServerOpen} onCreated={() => { setServerOpen(false); reload(); }} />
      <CreateMailboxDialog
        open={mailboxOpen}
        onOpenChange={setMailboxOpen}
        servers={servers}
        onCreated={() => { setMailboxOpen(false); reload(); }}
      />
    </div>
  );
}

function ServerCard({
  server,
  testing,
  onTest,
  onCreateMailbox,
  onOpenMailbox,
}: {
  server: ServerInfo;
  testing: boolean;
  onTest: () => void;
  onCreateMailbox: () => void;
  onOpenMailbox: (id: string) => void;
}) {
  const statusColor =
    server.status === "connected"
      ? "bg-emerald-500/15 text-emerald-500"
      : server.status === "error"
      ? "bg-rose-500/15 text-rose-500"
      : "bg-amber-500/15 text-amber-500";
  const StatusIcon = server.status === "connected" ? CheckCircle2 : server.status === "error" ? AlertCircle : Loader2;
  const usedPct = server.totalQuotaMb ? Math.round((server.usedMb / server.totalQuotaMb) * 100) : 0;

  return (
    <GlassCard strong className="overflow-hidden">
      {/* Server header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 p-5">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-lg">
          <Server className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold">{server.name}</h3>
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize", statusColor)}>
              <StatusIcon className={cn("h-3 w-3", server.status === "pending" && "animate-spin")} />
              {server.status}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {server.provider} · @{server.domain} · {server.mailboxCount} mailboxes
          </div>
        </div>
        <button
          onClick={onTest}
          disabled={testing}
          className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium transition hover:bg-muted"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Test connection
        </button>
        <button
          onClick={onCreateMailbox}
          className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold"
        >
          <UserPlus className="h-3.5 w-3.5" /> Create mailbox
        </button>
      </div>

      {/* Connection details */}
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Lock className="h-3 w-3" /> IMAP (incoming)
          </div>
          <div className="mt-1.5 font-mono text-sm">{server.imapHost}:{server.imapPort}</div>
          <div className="text-[11px] text-muted-foreground">SSL/TLS: {server.imapSecure ? "Yes" : "No"}</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Send className="h-3 w-3" /> SMTP (outgoing)
          </div>
          <div className="mt-1.5 font-mono text-sm">{server.smtpHost}:{server.smtpPort}</div>
          <div className="text-[11px] text-muted-foreground">SSL/TLS: {server.smtpSecure ? "Yes" : "No"}</div>
        </div>
      </div>

      {/* Storage bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><HardDrive className="h-3 w-3" /> Storage</span>
          <span>{fmt(server.usedMb)} MB / {fmt(server.totalQuotaMb)} MB ({usedPct}%)</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--gold)]" style={{ width: `${Math.min(usedPct, 100)}%` }} />
        </div>
      </div>

      {/* Mailboxes list */}
      <div className="border-t border-border/40 p-5">
        <SectionTitle title="Mailboxes" desc={`${server.mailboxCount} email accounts on @${server.domain}`} />
        <div className="scroll-liquid max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {server.mailboxes.map((m) => {
            const pct = m.quotaMb ? Math.round((m.usedMb / m.quotaMb) * 100) : 0;
            return (
              <button
                key={m.id}
                onClick={() => onOpenMailbox(m.id)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-border/40 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <NameAvatar name={m.displayName} color={m.ownerColor} className="h-10 w-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{m.email}</span>
                    {m.role === "admin" && (
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">Admin</span>
                    )}
                    {m.status === "creating" && (
                      <span className="flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-500">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Provisioning
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {m.ownerName ? `Owned by ${m.ownerName}` : "Unassigned"} · {fmt(m.usedMb)} MB used
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                <div className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
                  <InboxIcon className="h-4 w-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

function MailboxInbox({ mailboxId, onClose }: { mailboxId: string; onClose: () => void }) {
  const { data: messages, reload } = useApi<MessageInfo[]>(`/api/mail/messages?mailboxId=${mailboxId}`);
  const [folder, setFolder] = React.useState("inbox");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [composing, setComposing] = React.useState(false);

  const all = messages ?? [];
  const filtered = folder === "all" ? all : all.filter((m) => m.folder === folder);
  const selectedMsg = filtered.find((m) => m.id === selected) ?? null;
  const unread = all.filter((m) => m.folder === "inbox" && !m.isRead).length;

  const markRead = async (id: string) => {
    await fetch("/api/mail/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isRead: true }) });
    reload();
  };

  const FOLDERS = [
    { id: "inbox", label: "Inbox", icon: InboxIcon, count: unread },
    { id: "starred", label: "Starred", icon: Star, count: all.filter((m) => m.folder === "starred").length },
    { id: "sent", label: "Sent", icon: Send, count: all.filter((m) => m.folder === "sent").length },
  ];

  return (
    <GlassCard strong className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/40 p-4">
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-muted/50 hover:bg-muted" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Mailbox inbox</div>
          <div className="text-[11px] text-muted-foreground">{unread} unread · {all.length} total</div>
        </div>
        <button onClick={() => setComposing(true)} className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold">
          <PenSquare className="h-3.5 w-3.5" /> Compose
        </button>
      </div>

      <div className="grid gap-0 lg:grid-cols-[200px_320px_1fr]">
        {/* Folders */}
        <div className="hidden border-r border-border/40 p-3 lg:block">
          {FOLDERS.map((f) => {
            const Icon = f.icon;
            const active = folder === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setFolder(f.id); setSelected(null); }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{f.label}</span>
                {f.count > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Message list */}
        <div className="scroll-liquid max-h-[500px] overflow-y-auto border-r border-border/40 lg:max-h-[600px]">
          {filtered.length === 0 ? (
            <div className="grid place-items-center py-12 text-center text-sm text-muted-foreground">
              <InboxIcon className="mb-2 h-8 w-8 opacity-40" />
              No messages in {folder}
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelected(m.id); if (!m.isRead) markRead(m.id); }}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border/30 p-3 text-left transition hover:bg-muted/40",
                  selected === m.id && "bg-primary/10",
                  !m.isRead && m.direction === "in" && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-2">
                  {!m.isRead && m.direction === "in" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  {m.isStarred && <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                  <span className="truncate text-sm font-medium">{m.direction === "out" ? `To: ${m.toAddr}` : m.fromAddr}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{timeAgo(m.date)}</span>
                </div>
                <div className="truncate text-xs font-medium">{m.subject}</div>
                <div className="truncate text-[11px] text-muted-foreground">{m.body.replace(/\n/g, " ").slice(0, 80)}</div>
              </button>
            ))
          )}
        </div>

        {/* Message preview */}
        <div className="hidden lg:block">
          {selectedMsg ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-border/40 p-4">
                <div className="flex items-center gap-2">
                  <NameAvatar name={selectedMsg.fromAddr} className="h-9 w-9 text-[11px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{selectedMsg.fromAddr}</div>
                    <div className="truncate text-[11px] text-muted-foreground">to {selectedMsg.toAddr}</div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(selectedMsg.date)}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold">{selectedMsg.subject}</h3>
              </div>
              <div className="scroll-liquid flex-1 overflow-y-auto p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">{selectedMsg.body}</pre>
              </div>
              <div className="flex gap-2 border-t border-border/40 p-3">
                <button
                  onClick={() => setComposing(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  <CornerDownLeft className="h-3.5 w-3.5" /> Reply
                </button>
                <button className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted">
                  <Star className="h-3.5 w-3.5" /> Star
                </button>
                <button className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-medium hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Mail className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ComposeDialog open={composing} onOpenChange={setComposing} mailboxId={mailboxId} onSent={() => { setComposing(false); reload(); }} />
    </GlassCard>
  );
}

function ComposeDialog({ open, onOpenChange, mailboxId, onSent }: { open: boolean; onOpenChange: (b: boolean) => void; mailboxId: string; onSent: () => void }) {
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
        setTo(""); setSubject(""); setBody("");
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
          <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Compose new mail</DialogTitle>
          <DialogDescription>Send from this mailbox to any address.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="mt-1" />
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
          <button onClick={() => onOpenChange(false)} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={send} disabled={sending} className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddServerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (b: boolean) => void; onCreated: () => void }) {
  const [provider, setProvider] = React.useState("hostinger");
  const [form, setForm] = React.useState({
    name: "Prism Primary Mail",
    domain: "prism.co",
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    username: "admin@prism.co",
    password: "",
    fromName: "Prism Team",
    fromEmail: "hello@prism.co",
  });
  const [creating, setCreating] = React.useState(false);

  const preset = PROVIDERS.find((p) => p.id === provider);
  const onProviderChange = (v: string) => {
    setProvider(v);
    const p = PROVIDERS.find((x) => x.id === v);
    if (p && (p.imap || p.smtp)) {
      setForm((f) => ({ ...f, imapHost: p.imap || f.imapHost, smtpHost: p.smtp || f.smtpHost }));
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
          <DialogTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> Connect mail server</DialogTitle>
          <DialogDescription>
            Configure your own mail server on a custom domain. No Google accounts — host your team&apos;s email on Hostinger, cPanel, Zoho, or any provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs font-medium">Provider</Label>
            <Select value={provider} onValueChange={onProviderChange}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
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
            <span>Credentials are stored encrypted for this workspace. Prism uses this connection to provision and manage mailboxes on your domain.</span>
          </div>
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={create} disabled={creating} className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
            Connect & test
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateMailboxDialog({ open, onOpenChange, servers, onCreated }: { open: boolean; onOpenChange: (b: boolean) => void; servers: ServerInfo[]; onCreated: () => void }) {
  const [serverId, setServerId] = React.useState(servers[0]?.id ?? "");
  const [localPart, setLocalPart] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [quotaMb, setQuotaMb] = React.useState(2048);
  const [ownerId, setOwnerId] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  const domain = servers.find((s) => s.id === serverId)?.domain ?? "";
  const fullEmail = localPart ? `${localPart}@${domain}` : "name@" + domain;

  React.useEffect(() => { if (!serverId && servers[0]) setServerId(servers[0].id); }, [servers, serverId]);

  const create = async () => {
    if (!localPart || !password) return toast.error("Local part and password required");
    setCreating(true);
    try {
      const res = await fetch("/api/mail/mailboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId, localPart, displayName, password, quotaMb, ownerId: ownerId && ownerId !== "none" ? ownerId : null }),
      });
      if (res.ok) {
        toast.success("Mailbox created", { description: `${localPart}@${domain} is being provisioned` });
        setLocalPart(""); setDisplayName(""); setPassword("");
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
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> Create new mailbox</DialogTitle>
          <DialogDescription>Provision a new email account on your custom domain for a team member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Mail server</Label>
            <Select value={serverId} onValueChange={setServerId}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} · @{s.domain}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Email address</Label>
            <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-border/50 bg-muted/30">
              <input
                value={localPart}
                onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                placeholder="daniel"
                className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              />
              <span className="border-l border-border/50 bg-muted/60 px-3 py-2 text-sm text-muted-foreground">@{domain}</span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">Preview: <span className="font-mono">{fullEmail}</span></div>
          </div>
          <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Daniel Cho" />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quota (MB)</Label>
              <Input type="number" value={quotaMb} onChange={(e) => setQuotaMb(parseInt(e.target.value) || 2048)} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Assign to</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  <SelectItem value="u-admin">Maya Reyes (Admin)</SelectItem>
                  <SelectItem value="u-1">Daniel Cho</SelectItem>
                  <SelectItem value="u-2">Priya Nair</SelectItem>
                  <SelectItem value="u-3">Leo Marchetti</SelectItem>
                  <SelectItem value="u-4">Sara Okafor</SelectItem>
                  <SelectItem value="u-5">Tom Becker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
          <button onClick={create} disabled={creating} className="liquid-pill glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create mailbox
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5" />
    </div>
  );
}
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value) || 0)} className="mt-1.5" />
    </div>
  );
}

function PenSquare({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
