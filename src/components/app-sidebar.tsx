"use client";

import * as React from "react";
import {
  LayoutDashboard,
  PenSquare,
  CalendarDays,
  BarChart3,
  Inbox,
  Users,
  AtSign,
  Settings,
  ChevronRight,
  ChevronDown,
  Megaphone,
  Images,
  Image as ImageIcon,
  Video,
  Music,
  Radio,
  Hash,
  Crosshair,
  FileBarChart,
  Link2,
  Mail,
  ShieldCheck,
  Briefcase,
  CircleUserRound,
  CreditCard,
  FileText,
  FileSignature,
  Smartphone,
  Lock,
  Landmark,
  DollarSign,
  MessageCircle,
  ListTodo,
  Share2,
  Building2,
  BadgeCheck,
  Crown,
  ListChecks,
  QrCode,
  Star,
  Shield,
  BookOpen,
  Database,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import type { ViewId } from "@/lib/types";
import { hasModuleAccess } from "@/lib/module-permissions";
import { SETTINGS_TABS, type SettingsTab } from "@/components/views/settings";
import { ORG_TABS, type OrgTab } from "@/components/views/organization";
import { NameAvatar } from "@/components/glass/name-avatar";
import { LogoWordmark } from "@/components/glass/logo";
import { WhatsappIcon } from "@/components/brand-icons";
import { ListRow, Pill } from "@/components/glass/dense-ui";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { NameAvatar as NA } from "@/components/glass/name-avatar";
import { Loader2, Check, UserCheck, Ban, ShieldOff } from "lucide-react";

type NavRole = "admin" | "manager" | "editor" | "member" | "viewer";
const NAV: { id: ViewId; label: string; icon: React.ElementType; group: string; badge?: string; accent: string; roles?: NavRole[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview", accent: "oklch(0.55 0.2 255)" },
  { id: "composer", label: "Composer", icon: PenSquare, group: "Overview", accent: "oklch(0.7 0.2 25)" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, group: "Overview", accent: "oklch(0.68 0.2 145)" },
  { id: "inbox", label: "Inbox", icon: Inbox, group: "Overview", accent: "oklch(0.66 0.18 200)" },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsappIcon, group: "Overview", accent: "oklch(0.78 0.18 145)" },
  { id: "chat", label: "Team Chat", icon: MessageCircle, group: "Overview", accent: "oklch(0.66 0.22 305)" },
  { id: "tasks", label: "Tasks", icon: ListTodo, group: "Overview", accent: "oklch(0.7 0.18 165)" },
  // Performance (team-wide metrics) — managers+ only
  { id: "team-performance", label: "Performance", icon: BarChart3, group: "Overview", accent: "oklch(0.55 0.2 255)", roles: ["admin", "manager"] },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, group: "Content", accent: "oklch(0.7 0.2 25)" },
  { id: "approvals", label: "Approvals", icon: ListChecks, group: "Content", accent: "oklch(0.74 0.18 165)" },
  { id: "utm", label: "UTM Builder", icon: QrCode, group: "Content", accent: "oklch(0.66 0.18 200)" },
  { id: "hashtags", label: "Hashtags", icon: Hash, group: "Content", accent: "oklch(0.66 0.18 200)" },
  { id: "linkbio", label: "Link in Bio", icon: Link2, group: "Content", accent: "oklch(0.68 0.2 145)" },
  { id: "listening", label: "Listening", icon: Radio, group: "Insights", accent: "oklch(0.7 0.2 25)" },
  { id: "competitors", label: "Competitors", icon: Crosshair, group: "Insights", accent: "oklch(0.62 0.22 300)" },
  { id: "influencers", label: "Influencers", icon: Star, group: "Insights", accent: "oklch(0.78 0.18 75)" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Insights", accent: "oklch(0.55 0.2 255)" },
  { id: "reports", label: "Reports", icon: FileBarChart, group: "Insights", accent: "oklch(0.72 0.18 75)" },
  { id: "accounts", label: "Accounts", icon: AtSign, group: "Workspace", accent: "oklch(0.68 0.2 145)" },
  { id: "account-safety", label: "Account Safety", icon: Shield, group: "Workspace", accent: "oklch(0.74 0.18 145)" },
  { id: "vpn", label: "VPN", icon: ShieldCheck, group: "Workspace", accent: "oklch(0.55 0.2 255)" },
  // Organization module (Users / Team / Roles / Departments / Designations) — managers+ only.
  // Rendered as an expandable parent below (see <OrganizationGroup /> inside
  // the Workspace group render). No flat NAV entry is needed.
  { id: "mail", label: "Mail Server", icon: Mail, group: "Workspace", accent: "oklch(0.66 0.18 200)" },
  // Guide — in-app help/about/how-to view (replaces the old /help route).
  { id: "guide", label: "Guide", icon: BookOpen, group: "Workspace", accent: "oklch(0.62 0 22 258)" },
  // Owner Panel + Settings are rendered as expandable parent groups below
  // (see <MediaGroup /> inside the Content group render) — it is no
  // longer a flat NAV entry so it can expand into its sub-sections.
  // Note: "Settings" is rendered as an expandable parent group below
  // (see <SettingsGroup /> inside the Workspace group render) — it is no
  // longer a flat NAV entry so it can expand into its sub-sections.
];

/** Sub-items for the Media Library expandable parent. */
const MEDIA_SUBITEMS: {
  id: "all" | "images" | "videos" | "audio";
  label: string;
  icon: React.ElementType;
  accent: string;
}[] = [
  { id: "all", label: "All Media", icon: Images, accent: "oklch(0.62 0.22 300)" },
  { id: "images", label: "Images", icon: ImageIcon, accent: "oklch(0.68 0.2 145)" },
  { id: "videos", label: "Videos", icon: Video, accent: "oklch(0.7 0.2 25)" },
  { id: "audio", label: "Audio", icon: Music, accent: "oklch(0.66 0.18 165)" },
];

/**
 * Map an oklch accent color string to the nearest dense-ui Pill color so
 * sidebar badges use the same Pill vocabulary as the rest of the app.
 *
 * oklch hue ranges (approximate):
 *   rose    — 330–360, 0–30
 *   amber   — 30–90
 *   green   — 90–180
 *   blue    — 180–285  (cyan/teal/blue all collapse here)
 *   violet  — 285–330
 */
function accentToPillColor(accent: string):
  | "neutral" | "green" | "amber" | "rose" | "blue" | "violet" {
  const m = accent.match(/oklch\(\s*[^,]+,\s*[^,]+,\s*([\d.]+)\s*\)/);
  if (!m) return "neutral";
  const hue = parseFloat(m[1]);
  if (hue >= 330 || hue < 30) return "rose";
  if (hue < 90) return "amber";
  if (hue < 180) return "green";
  if (hue < 285) return "blue";
  return "violet";
}

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const {
    view,
    setView,
    settingsTab,
    settingsExpanded,
    toggleSettings,
    setSettingsTab,
    mediaTab,
    mediaExpanded,
    toggleMedia,
    setMediaTab,
    ownerTab,
    ownerExpanded,
    toggleOwner,
    setOwnerTab,
    orgTab,
    orgExpanded,
    toggleOrg,
    setOrgTab,
  } = useNav();
  const { user } = useAuth();
  // Owner Panel is gated by role === "admin" (admins are the workspace owner).
  // This is real role-based access control — no hardcoded email check.
  const isOwner = user?.role === "admin" || user?.role === "owner";
  const isManager = user?.role === "admin" || user?.role === "manager";
  // Filter nav items by role — items without `roles` are visible to everyone.
  // Items with `roles` are only shown to users with a matching role.
  const userRole = (user?.role ?? "member") as NavRole;
  // Module rights — hide nav items the current user has no permission to see.
  // Empty/null permissions means "no restriction" (backward compat for
  // users created before the module rights feature shipped).
  const userPermissions = user?.permissions;
  const visibleNav = NAV.filter((n) => {
    // Role-based gate (e.g. Performance is managers+ only).
    if (n.roles && !n.roles.includes(userRole)) return false;
    // Module rights gate (per-user permission grants/revokes).
    if (!hasModuleAccess(userPermissions, n.id)) return false;
    return true;
  });
  const groups = Array.from(new Set(visibleNav.map((n) => n.group)));
  const settingsActive = view === "settings";
  const mediaActive = view === "media";
  const ownerActive = view === "owner";
  const orgActive = view === "organization";

  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      {/* Brand — animated logo centered + slogan below */}
      <div className="px-1 pb-1 pt-0 flex justify-center">
        <LogoWordmark size="text-[18px]" logoSize={30} />
      </div>

      {/* New Post — prominent primary action.
          Hidden when the current user has no `composer` module access. */}
      {hasModuleAccess(userPermissions, "composer") && (
        <button
          onClick={() => {
            setView("composer");
            onNavigate?.();
          }}
          className="liquid-pill glow-ring crystal-sweep mb-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          <PenSquare className="h-4 w-4" />
          New Post
        </button>
      )}

      {/* Nav groups */}
      <nav className="scroll-liquid mt-1 flex-1 space-y-3 overflow-y-auto pr-1">
        {/* Owner Panel — only for owner (and the user must have `owner` module access). */}
        {isOwner && hasModuleAccess(userPermissions, "owner") && (
          <div>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Owner
            </div>
            <OwnerGroup
              active={ownerActive}
              expanded={ownerExpanded}
              toggle={toggleOwner}
              currentTab={ownerTab}
              setTab={(t) => { setOwnerTab(t); setView("owner"); }}
              onNavigate={onNavigate}
            />
          </div>
        )}
        {groups.map((g) => (
          <div key={g} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/50">
              {g}
            </div>
            <div className="space-y-0.5">
              {visibleNav.filter((n) => n.group === g).map((n) => {
                const Icon = n.icon;
                const active = view === n.id;
                return (
                  <ListRow
                    key={n.id}
                    onClick={() => {
                      setView(n.id);
                      onNavigate?.();
                    }}
                    className={cn(
                      "group crystal-sweep relative w-full rounded-lg border-b-0 border-l-0 px-2.5 py-2 gap-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "font-semibold text-foreground hover:bg-transparent"
                        : "text-foreground/55 hover:bg-muted/50 hover:text-foreground"
                    )}
                    style={active ? ({ ["--section-accent" as string]: n.accent } as React.CSSProperties) : undefined}
                  >
                    {/* Active: bold accent-colored left bar */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full"
                        style={{ background: n.accent, boxShadow: `0 0 8px ${n.accent}` }}
                      />
                    )}
                    {/* Active: accent-tinted background */}
                    {active && (
                      <span
                        className="absolute inset-0 rounded-lg"
                        style={{ background: n.accent, opacity: 0.12 }}
                      />
                    )}
                    <Icon
                      className={cn("relative h-[18px] w-[18px] shrink-0 transition-transform", !active && "group-hover:scale-110")}
                      style={{ color: n.accent, opacity: active ? 1 : 0.85 }}
                    />
                    <span className="relative flex-1 min-w-0 truncate">{n.label}</span>
                    {n.badge && (
                      <Pill color={accentToPillColor(n.accent)} className="relative ml-auto">
                        {n.badge}
                      </Pill>
                    )}
                    {active && !n.badge && <ChevronRight className="relative ml-auto h-3.5 w-3.5" style={{ color: n.accent }} />}
                  </ListRow>
                );
              })}

              {/* Expandable Media Library parent — rendered at the end of the Content group.
                  Hidden when the current user has no `media` module access. */}
              {g === "Content" && hasModuleAccess(userPermissions, "media") && (
                <MediaGroup
                  active={mediaActive}
                  expanded={mediaExpanded}
                  toggle={toggleMedia}
                  setView={setView}
                  mediaTab={mediaTab}
                  setMediaTab={setMediaTab}
                  onNavigate={onNavigate}
                />
              )}

              {/* Expandable Settings + Organization parents — managers+ only,
                  AND the user must have the corresponding module access. */}
              {g === "Workspace" && isManager && (
                <>
                  {hasModuleAccess(userPermissions, "organization") && (
                    <OrganizationGroup
                      active={orgActive}
                      expanded={orgExpanded}
                      toggle={toggleOrg}
                      setView={setView}
                      orgTab={orgTab}
                      setOrgTab={setOrgTab}
                      onNavigate={onNavigate}
                    />
                  )}
                  {hasModuleAccess(userPermissions, "settings") && (
                    <SettingsGroup
                      active={settingsActive}
                      expanded={settingsExpanded}
                      toggle={toggleSettings}
                      setView={setView}
                      settingsTab={settingsTab}
                      setSettingsTab={setSettingsTab}
                      onNavigate={onNavigate}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="mt-1 flex items-center gap-2.5 rounded-2xl border border-border/30 bg-muted/30 p-2.5">
        <NameAvatar name={user?.name ?? "User"} color="blue" src={user?.avatar ?? undefined} gender={(user as any)?.gender ?? undefined} className="h-9 w-9 text-xs" ring />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">{user?.name ?? "User"}</span>
            {user?.role === "admin" && (
              <Pill color="blue" className="uppercase tracking-wide">Admin</Pill>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{user?.title ?? "Team Member"}</div>
        </div>
        {/* Settings gear — managers+ only AND user must have settings module access. */}
        {isManager && hasModuleAccess(userPermissions, "settings") && (
        <button
          onClick={() => {
            setView("settings");
            // Expand the tree so the user sees where they are.
            if (!settingsExpanded) toggleSettings();
            onNavigate?.();
          }}
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className={cn("h-4 w-4", settingsActive && "text-primary")} />
        </button>
        )}
      </div>
      <ShareWorkspaceButton />
    </div>
  );
}

// ============ Share Workspace Button + Dialog ============
function ShareWorkspaceButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-1 flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-[11px] font-semibold text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share workspace
      </button>
      <ShareWorkspaceDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function ShareWorkspaceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth();
  const [members, setMembers] = React.useState<{ id: string; name: string; email: string; avatar: string | null; color: string | null; role: string; title: string | null }[]>([]);
  const [shares, setShares] = React.useState<{ sent: any[]; received: any[]; myWorkspaceName: string | null }>({ sent: [], received: [], myWorkspaceName: null });
  const [selectedUser, setSelectedUser] = React.useState("");
  const [permission, setPermission] = React.useState("view");
  const [loading, setLoading] = React.useState(false);
  const [tab, setTab] = React.useState<"share" | "received">("share");

  function getToken() {
    try { return JSON.parse(localStorage.getItem("socialflow-auth") ?? "{}")?.state?.token ?? null; }
    catch { return null; }
  }

  async function loadData() {
    const token = getToken();
    const [membersRes, sharesRes] = await Promise.all([
      fetch("/api/workspace/members", { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
      fetch("/api/workspace/share", { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
    ]);
    if (membersRes.ok) {
      const data = await membersRes.json();
      setMembers(data.members ?? []);
    }
    if (sharesRes.ok) {
      const data = await sharesRes.json();
      setShares(data);
    }
  }

  React.useEffect(() => {
    if (open) loadData();
  }, [open]);

  async function share() {
    if (!selectedUser) { toast.error("Select a team member"); return; }
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/workspace/share", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sharedWithUserId: selectedUser, permission }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Workspace shared", { description: `Shared with ${json.sharedWith}` });
        setSelectedUser("");
        loadData();
      } else {
        toast.error(json.error ?? "Failed to share");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function acceptShare(shareId: string) {
    const token = getToken();
    await fetch("/api/workspace/share", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ shareId, action: "accept" }),
    });
    toast.success("Workspace share accepted");
    loadData();
  }

  async function revokeShare(shareId: string) {
    const token = getToken();
    await fetch("/api/workspace/share", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ shareId, action: "revoke" }),
    });
    toast.success("Sharing stopped");
    loadData();
  }

  async function stopAllSharing() {
    if (!confirm("Stop sharing your workspace with everyone? They will lose access to your content immediately.")) return;
    const token = getToken();
    try {
      const res = await fetch("/api/workspace/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ scope: "sent" }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Stopped all sharing", { description: `${json.deleted} share(s) removed` });
        loadData();
      } else {
        toast.error("Failed to stop sharing");
      }
    } catch {
      toast.error("Network error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Workspace sharing
          </DialogTitle>
          <DialogDescription>
            Share your workspace with teammates or accept shares from others. Shared workspaces merge content into your dashboard.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-muted/40 p-1">
          <button
            onClick={() => setTab("share")}
            className={cn("flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition", tab === "share" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Share mine ({shares.sent.length})
          </button>
          <button
            onClick={() => setTab("received")}
            className={cn("flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition", tab === "received" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Received ({shares.received.length})
          </button>
        </div>

        {tab === "share" && (
          <div className="space-y-3">
            {/* Share form */}
            <div className="space-y-2 rounded-xl border border-border/40 bg-muted/10 p-3">
              <label className="text-xs font-semibold">Share with</label>
              {members.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No team members available to share with.</p>
              ) : (
                <div className="grid gap-1.5">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedUser(m.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2 text-left text-xs transition",
                        selectedUser === m.id ? "border-primary/40 bg-primary/10" : "border-border/40 hover:bg-muted/30"
                      )}
                    >
                      <NA name={m.name} color={(m.color as any) ?? "blue"} className="h-6 w-6 text-[9px]" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{m.name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{m.title ?? m.role}</div>
                      </div>
                      {selectedUser === m.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-semibold text-muted-foreground">Permission:</label>
                  <select value={permission} onChange={(e) => setPermission(e.target.value)} className="rounded-md border border-border/40 bg-background px-2 py-1 text-[10px]">
                    <option value="view">View only</option>
                    <option value="edit">Edit</option>
                  </select>
                </div>
              )}
              <button
                onClick={share}
                disabled={loading || !selectedUser}
                className="liquid-pill flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                Share workspace
              </button>
            </div>

            {/* Already shared */}
            {shares.sent.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Currently shared with</div>
                  <button
                    onClick={stopAllSharing}
                    className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400"
                  >
                    <ShieldOff className="h-2.5 w-2.5" />
                    Stop all
                  </button>
                </div>
                {shares.sent.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/10 p-2.5">
                    <NA name={s.sharedWith.name} color={(s.sharedWith.color as any) ?? "blue"} className="h-7 w-7 text-[10px]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">{s.sharedWith.name}</div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={cn("rounded px-1 py-0.5 font-medium", s.status === "accepted" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
                          {s.status}
                        </span>
                        <span>·</span>
                        <span>{s.permission}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeShare(s.id)}
                      className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/5 px-2.5 py-1.5 text-[9px] font-bold text-rose-600 transition hover:bg-rose-500/15 dark:text-rose-400"
                    >
                      <Ban className="h-2.5 w-2.5" />
                      Stop
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "received" && (
          <div className="space-y-2">
            {shares.received.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <UserCheck className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No workspace shares received yet</p>
              </div>
            ) : (
              shares.received.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/10 p-2.5">
                  <NA name={s.sharedBy.name} color={(s.sharedBy.color as any) ?? "blue"} className="h-7 w-7 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{s.sharedBy.name}'s workspace</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className={cn("rounded px-1 py-0.5 font-medium", s.status === "accepted" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400")}>
                        {s.status}
                      </span>
                      <span>·</span>
                      <span>{s.permission}</span>
                    </div>
                  </div>
                  {s.status === "pending" ? (
                    <button onClick={() => acceptShare(s.id)} className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[9px] font-bold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-400">
                      Accept
                    </button>
                  ) : null}
                  <button
                    onClick={() => revokeShare(s.id)}
                    className="flex items-center gap-1 rounded-lg border border-border/40 px-2.5 py-1.5 text-[9px] font-bold text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-500"
                    title="Leave this shared workspace"
                  >
                    <Ban className="h-2.5 w-2.5" />
                    Leave
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface MediaGroupProps {
  active: boolean;
  expanded: boolean;
  toggle: () => void;
  setView: (v: ViewId) => void;
  mediaTab: string;
  setMediaTab: (tab: string) => void;
  onNavigate?: () => void;
}

/**
 * Expandable "Media Library" parent in the main sidebar.
 *
 * - Clicking the parent row toggles `mediaExpanded` and switches the
 *   view to "media" (so the right pane always reflects the active
 *   media sub-section).
 * - When expanded, the sub-items (All Media, Images, Videos, Audio)
 *   render below with a smooth max-height + opacity transition.
 * - The chevron rotates 180° when expanded.
 * - Each sub-item carries its own accent color (emerald for images,
 *   amber for videos, emerald-teal for audio, violet for all).
 * - Parent shows as active (violet accent) when `view === "media"`.
 */
function MediaGroup({
  active,
  expanded,
  toggle,
  setView,
  mediaTab,
  setMediaTab,
  onNavigate,
}: MediaGroupProps) {
  const parentAccent = "oklch(0.62 0.22 300)";

  const handleParentClick = () => {
    setView("media");
    toggle();
    onNavigate?.();
  };

  const handleSubClick = (id: "all" | "images" | "videos" | "audio") => {
    setView("media");
    setMediaTab(id);
    // Keep expanded — user is drilling into a sub-section.
    onNavigate?.();
  };

  return (
    <div className="space-y-0.5">
      {/* Parent row */}
      <ListRow
        onClick={handleParentClick}
        aria-expanded={expanded}
        aria-controls="media-subnav"
        className={cn(
          "group crystal-sweep relative w-full rounded-lg border-b-0 border-l-0 px-2.5 py-2 gap-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "font-semibold text-foreground hover:bg-transparent"
            : "text-foreground/55 hover:bg-muted/50 hover:text-foreground"
        )}
        style={active ? ({ ["--section-accent" as string]: parentAccent } as React.CSSProperties) : undefined}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full shadow-[0_0_8px_var(--section-accent)]"
            style={{ background: parentAccent }}
          />
        )}
        {active && (
          <span
            className="absolute inset-0 rounded-lg"
            style={{ background: parentAccent, opacity: 0.12 }}
          />
        )}
        <Images
          className={cn(
            "relative h-[18px] w-[18px] shrink-0 transition-transform",
            !active && "group-hover:scale-110"
          )}
          style={{ color: parentAccent }}
        />
        <span className="relative flex-1 min-w-0 truncate">Media Library</span>
        <ChevronDown
          className={cn(
            "relative ml-auto h-4 w-4 transition-transform duration-300 ease-out",
            active ? "" : "text-muted-foreground",
            expanded && "rotate-180"
          )}
          style={active ? { color: parentAccent } : undefined}
        />
      </ListRow>

      {/* Sub-items — animated via max-height + opacity */}
      <div
        id="media-subnav"
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          expanded ? "max-h-[320px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="crystal-in mt-0.5 space-y-0.5 rounded-xl border border-border/30 bg-muted/20 p-1.5">
          {MEDIA_SUBITEMS.map((t) => {
            const Icon = t.icon;
            const subActive = active && mediaTab === t.id;
            return (
              <ListRow
                key={t.id}
                onClick={() => handleSubClick(t.id)}
                aria-current={subActive ? "page" : undefined}
                className={cn(
                  "group relative w-full rounded-lg border-b-0 border-l-0 pl-7 pr-2.5 py-1.5 gap-2.5 text-[13px] font-medium transition-all duration-200",
                  subActive
                    ? "font-semibold text-foreground hover:bg-transparent"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                style={
                  subActive
                    ? ({ ["--section-accent" as string]: t.accent } as React.CSSProperties)
                    : undefined
                }
              >
                {subActive && (
                  <span
                    className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full"
                    style={{ background: t.accent }}
                  />
                )}
                {subActive && (
                  <span
                    className="absolute inset-0 rounded-lg"
                    style={{ background: t.accent, opacity: 0.10 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative h-3.5 w-3.5 shrink-0 transition-transform",
                    !subActive && "group-hover:scale-110"
                  )}
                  style={{ color: t.accent }}
                />
                <span className="relative flex-1 min-w-0 truncate">{t.label}</span>
              </ListRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface SettingsGroupProps {
  active: boolean;
  expanded: boolean;
  toggle: () => void;
  setView: (v: ViewId) => void;
  settingsTab: string;
  setSettingsTab: (tab: string) => void;
  onNavigate?: () => void;
}

/**
 * Expandable "Settings" parent in the main sidebar.
 *
 * - Clicking the parent row toggles `settingsExpanded` and switches the
 *   view to "settings" (so the right pane always reflects the active
 *   settings sub-section).
 * - When expanded, the sub-items (Profile, Workspace, Appearance, Team
 *   Roles, Notifications, Security, Platforms, Integrations, Billing,
 *   Data & Privacy, Danger Zone) render below with a smooth max-height
 *   + opacity transition.
 * - The chevron rotates 180° when expanded.
 * - Parent shows as active (emerald) when `view === "settings"`.
 */
function SettingsGroup({
  active,
  expanded,
  toggle,
  setView,
  settingsTab,
  setSettingsTab,
  onNavigate,
}: SettingsGroupProps) {
  const handleParentClick = () => {
    setView("settings");
    toggle();
    onNavigate?.();
  };

  const handleSubClick = (id: SettingsTab) => {
    setView("settings");
    setSettingsTab(id);
    // Keep expanded — user is drilling into a sub-section.
    onNavigate?.();
  };

  return (
    <div className="space-y-0.5">
      {/* Parent row */}
      <ListRow
        onClick={handleParentClick}
        aria-expanded={expanded}
        aria-controls="settings-subnav"
        className={cn(
          "group crystal-sweep relative w-full rounded-lg border-b-0 border-l-0 px-2.5 py-2 gap-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "font-semibold text-primary hover:bg-transparent"
            : "text-foreground/60 hover:bg-muted/50 hover:text-foreground"
        )}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_var(--ring)]"
          />
        )}
        {active && (
          <span
            className="absolute inset-0 rounded-lg bg-primary"
            style={{ opacity: 0.12 }}
          />
        )}
        <Settings
          className={cn(
            "relative h-[18px] w-[18px] shrink-0 transition-transform",
            active && "text-primary",
            !active && "group-hover:scale-110"
          )}
        />
        <span className="relative flex-1 min-w-0 truncate">Settings</span>
        <ChevronDown
          className={cn(
            "relative ml-auto h-4 w-4 transition-transform duration-300 ease-out",
            active ? "text-primary" : "text-muted-foreground",
            expanded && "rotate-180"
          )}
        />
      </ListRow>

      {/* Sub-items — animated via max-height + opacity */}
      <div
        id="settings-subnav"
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          expanded ? "max-h-[820px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="crystal-in mt-0.5 space-y-0.5 rounded-xl border border-border/30 bg-muted/20 p-1.5">
          {SETTINGS_TABS.map((t) => {
            const Icon = t.icon;
            const subActive = active && settingsTab === t.id;
            const isDanger = t.id === "danger";
            return (
              <ListRow
                key={t.id}
                onClick={() => handleSubClick(t.id)}
                aria-current={subActive ? "page" : undefined}
                className={cn(
                  "group relative w-full rounded-lg border-b-0 border-l-0 pl-7 pr-2.5 py-1.5 gap-2.5 text-[13px] font-medium transition-all duration-200",
                  subActive
                    ? isDanger
                      ? "font-semibold text-rose-500 hover:bg-transparent"
                      : "font-semibold text-primary hover:bg-transparent"
                    : isDanger
                      ? "text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-500"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {subActive && (
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full",
                      isDanger ? "bg-rose-500" : "bg-primary"
                    )}
                  />
                )}
                {subActive && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-lg",
                      isDanger ? "bg-rose-500" : "bg-primary"
                    )}
                    style={{ opacity: 0.12 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative h-3.5 w-3.5 shrink-0 transition-transform",
                    !subActive && "group-hover:scale-110",
                    subActive && !isDanger && "text-primary",
                    subActive && isDanger && "text-rose-500"
                  )}
                />
                <span className="relative flex-1 min-w-0 truncate">{t.label}</span>
              </ListRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Owner Group — expandable with sub-items (owner-only)
// ============================================================================

// Owner Panel sub-items — grouped visually into 3 categories.
// Order matches OWNER_SECTIONS in views/owner.tsx so the sidebar and the
// mobile dropdown stay in sync. A small label is inserted at the start of
// each new group inside the rendering loop (look for `prev?.category`).
const OWNER_SUBITEMS = [
  // ---- Dashboard group ----
  { id: "overview",       label: "Overview",        icon: Briefcase,       accent: "oklch(0.72 0.18 75)",  category: "dashboard" },
  { id: "reports",        label: "Reports",           icon: BarChart3,       accent: "oklch(0.7 0.2 25)",    category: "dashboard" },
  { id: "finance",        label: "Finance",           icon: DollarSign,      accent: "oklch(0.55 0.2 255)",  category: "dashboard" },
  // ---- Clients group ----
  { id: "customers",      label: "Clients",           icon: Users,           accent: "oklch(0.55 0.2 255)",  category: "clients" },
  { id: "subscriptions",  label: "Subscriptions",    icon: CreditCard,      accent: "oklch(0.68 0.22 145)", category: "clients" },
  { id: "invoices",       label: "Invoices",           icon: FileText,        accent: "oklch(0.72 0.18 75)",  category: "clients" },
  { id: "quotations",     label: "Quotations",         icon: FileSignature,   accent: "oklch(0.7 0.2 25)",    category: "clients" },
  { id: "users",          label: "Client Users",      icon: CircleUserRound, accent: "oklch(0.62 0.22 300)", category: "clients" },
  // ---- System group ----
  { id: "databases",      label: "Databases",         icon: Database,        accent: "oklch(0.62 0.22 300)", category: "system" },
  { id: "devices",        label: "Devices",            icon: Smartphone,      accent: "oklch(0.62 0.22 300)", category: "system" },
  { id: "apikeys",        label: "API Keys",            icon: Lock,            accent: "oklch(0.72 0.18 75)",  category: "system" },
  { id: "bank",           label: "Bank Accounts",       icon: Landmark,        accent: "oklch(0.68 0.22 145)", category: "system" },
  { id: "activity",       label: "Activity Log",       icon: Activity,        accent: "oklch(0.7 0.2 25)",    category: "system" },
] as const;

const OWNER_GROUP_LABELS: Record<string, { label: string; accent: string }> = {
  dashboard: { label: "Dashboard", accent: "oklch(0.72 0.18 75)" },
  clients:   { label: "Clients",   accent: "oklch(0.55 0.2 255)" },
  system:    { label: "System",    accent: "oklch(0.62 0.22 300)" },
};

function OwnerGroup({
  active,
  expanded,
  toggle,
  currentTab,
  setTab,
  onNavigate,
}: {
  active: boolean;
  expanded: boolean;
  toggle: () => void;
  currentTab: string;
  setTab: (tab: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <ListRow
        onClick={() => { toggle(); if (!active) { setTab(currentTab); } }}
        aria-expanded={expanded}
        className={cn(
          "group crystal-sweep relative w-full rounded-lg border-b-0 border-l-0 px-2.5 py-2 gap-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "font-semibold text-foreground hover:bg-transparent"
            : "text-foreground/60 hover:bg-muted/50 hover:text-foreground"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_var(--ring)]" />
        )}
        {active && (
          <span
            className="absolute inset-0 rounded-lg bg-primary"
            style={{ opacity: 0.12 }}
          />
        )}
        <Briefcase
          className={cn(
            "relative h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110",
            active && "text-primary"
          )}
          style={{ color: active ? "var(--primary)" : undefined }}
        />
        <span className="relative flex-1 min-w-0 truncate">Owner Panel</span>
        <ChevronDown
          className={cn(
            "relative ml-auto h-3.5 w-3.5 transition-transform duration-200",
            active ? "text-primary" : "text-muted-foreground",
            expanded && "rotate-180"
          )}
        />
      </ListRow>

      <div
        className="crystal-in overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? "820px" : "0px", opacity: expanded ? 1 : 0 }}
      >
        <div className="space-y-0.5 pl-3 pt-1">
          {OWNER_SUBITEMS.map((item, idx) => {
            const Icon = item.icon;
            const isActive = active && currentTab === item.id;
            const prev = OWNER_SUBITEMS[idx - 1];
            const showGroupHeader = !prev || (prev as { category: string }).category !== item.category;
            const meta = OWNER_GROUP_LABELS[item.category];
            return (
              <React.Fragment key={item.id}>
                {showGroupHeader && meta && (
                  <div
                    className="flex items-center gap-1.5 px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
                    aria-hidden
                  >
                    <span
                      className="h-1 w-1 rounded-full"
                      style={{ background: meta.accent }}
                    />
                    {meta.label}
                  </div>
                )}
                <ListRow
                  onClick={() => { setTab(item.id); onNavigate?.(); }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative w-full rounded-lg border-b-0 border-l-0 px-3 py-1.5 gap-2.5 text-xs font-medium transition-all",
                    isActive
                      ? "font-semibold text-primary hover:bg-transparent"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full"
                      style={{ background: item.accent }}
                    />
                  )}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{ background: item.accent, opacity: 0.10 }}
                    />
                  )}
                  <Icon
                    className="relative h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110"
                    style={{ color: item.accent }}
                  />
                  <span className="relative flex-1 min-w-0 truncate">{item.label}</span>
                </ListRow>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Organization Group — expandable with sub-items (managers+ only)
// Sub-items: Overview, Users, Team, Roles, Departments, Designations
// ============================================================================

interface OrganizationGroupProps {
  active: boolean;
  expanded: boolean;
  toggle: () => void;
  setView: (v: ViewId) => void;
  orgTab: string;
  setOrgTab: (tab: string) => void;
  onNavigate?: () => void;
}

function OrganizationGroup({
  active,
  expanded,
  toggle,
  setView,
  orgTab,
  setOrgTab,
  onNavigate,
}: OrganizationGroupProps) {
  const parentAccent = "oklch(0.62 0.22 300)";

  const handleParentClick = () => {
    setView("organization");
    toggle();
    onNavigate?.();
  };

  const handleSubClick = (id: OrgTab) => {
    setView("organization");
    setOrgTab(id);
    // Keep expanded — user is drilling into a sub-section.
    onNavigate?.();
  };

  return (
    <div className="space-y-0.5">
      {/* Parent row */}
      <ListRow
        onClick={handleParentClick}
        aria-expanded={expanded}
        aria-controls="organization-subnav"
        className={cn(
          "group crystal-sweep relative w-full rounded-lg border-b-0 border-l-0 px-2.5 py-2 gap-2.5 text-sm font-medium transition-all duration-200",
          active
            ? "font-semibold text-foreground hover:bg-transparent"
            : "text-foreground/55 hover:bg-muted/50 hover:text-foreground"
        )}
        style={active ? ({ ["--section-accent" as string]: parentAccent } as React.CSSProperties) : undefined}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full shadow-[0_0_8px_var(--section-accent)]"
            style={{ background: parentAccent }}
          />
        )}
        {active && (
          <span
            className="absolute inset-0 rounded-lg"
            style={{ background: parentAccent, opacity: 0.12 }}
          />
        )}
        <Building2
          className={cn(
            "relative h-[18px] w-[18px] shrink-0 transition-transform",
            !active && "group-hover:scale-110"
          )}
          style={{ color: parentAccent }}
        />
        <span className="relative flex-1 min-w-0 truncate">Organization</span>
        <ChevronDown
          className={cn(
            "relative ml-auto h-4 w-4 transition-transform duration-300 ease-out",
            active ? "" : "text-muted-foreground",
            expanded && "rotate-180"
          )}
          style={active ? { color: parentAccent } : undefined}
        />
      </ListRow>

      {/* Sub-items — animated via max-height + opacity */}
      <div
        id="organization-subnav"
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          expanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="crystal-in mt-0.5 space-y-0.5 rounded-xl border border-border/30 bg-muted/20 p-1.5">
          {ORG_TABS.map((t) => {
            const Icon = t.icon;
            const subActive = active && orgTab === t.id;
            const subAccent = ORG_TAB_ACCENTS[t.id] ?? parentAccent;
            return (
              <ListRow
                key={t.id}
                onClick={() => handleSubClick(t.id)}
                aria-current={subActive ? "page" : undefined}
                className={cn(
                  "group relative w-full rounded-lg border-b-0 border-l-0 pl-7 pr-2.5 py-1.5 gap-2.5 text-[13px] font-medium transition-all duration-200",
                  subActive
                    ? "font-semibold text-foreground hover:bg-transparent"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                style={
                  subActive
                    ? ({ ["--section-accent" as string]: subAccent } as React.CSSProperties)
                    : undefined
                }
              >
                {subActive && (
                  <span
                    className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full"
                    style={{ background: subAccent }}
                  />
                )}
                {subActive && (
                  <span
                    className="absolute inset-0 rounded-lg"
                    style={{ background: subAccent, opacity: 0.10 }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative h-3.5 w-3.5 shrink-0 transition-transform",
                    !subActive && "group-hover:scale-110"
                  )}
                  style={{ color: subAccent }}
                />
                <span className="relative flex-1 min-w-0 truncate">{t.label}</span>
              </ListRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ORG_TAB_ACCENTS: Record<OrgTab, string> = {
  organisation: "oklch(0.55 0.2 25)",
  overview: "oklch(0.55 0.2 255)",
  users: "oklch(0.62 0.22 300)",
  team: "oklch(0.7 0.18 165)",
  roles: "oklch(0.66 0.18 200)",
  departments: "oklch(0.68 0.2 145)",
  designations: "oklch(0.72 0.18 75)",
};
