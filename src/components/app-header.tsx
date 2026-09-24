"use client";

import * as React from "react";
import {
  Search, Bell, Moon, Sun, Menu, Command, LogOut, Settings, User,
  ChevronDown, MessageCircle, CheckCircle2, PenLine, Inbox as InboxIcon,
  Calendar, BarChart3, Users, AtSign, Megaphone, Radio, Hash, Crosshair,
  FileBarChart, Link2, Mail, MessageCircle as WhatsAppIcon, Globe, Zap,
  Activity, Clock, Wifi, WifiOff, type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { useApi, timeAgo } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { ViewId } from "@/lib/types";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Your social universe at a glance" },
  composer: { title: "Composer", subtitle: "Publish to every account in one flow with AI" },
  calendar: { title: "Calendar", subtitle: "Plan and schedule your content pipeline" },
  inbox: { title: "Inbox", subtitle: "Comments and messages across all accounts" },
  analytics: { title: "Analytics", subtitle: "Deep insights across every platform" },
  accounts: { title: "Accounts", subtitle: "Manage connected social profiles" },
  team: { title: "Team", subtitle: "Your dissemination team and workload" },
  settings: { title: "Settings", subtitle: "Workspace preferences" },
  campaigns: { title: "Campaigns", subtitle: "Group and measure multi-post campaigns" },
  media: { title: "Media Library", subtitle: "Your shared creative asset vault" },
  listening: { title: "Listening", subtitle: "Brand mentions, keywords & sentiment across the web" },
  hashtags: { title: "Hashtag Manager", subtitle: "Save, group and research high-performing tags" },
  competitors: { title: "Competitors", subtitle: "Benchmark against rival accounts" },
  reports: { title: "Reports", subtitle: "Build, schedule and export custom reports" },
  linkbio: { title: "Link in Bio", subtitle: "Your shoppable link-in-bio page" },
  mail: { title: "Mail Server", subtitle: "Custom domain mailboxes for your team" },
  whatsapp: { title: "WhatsApp Inbox", subtitle: "Paste content from groups & chats to publish" },
  "team-performance": { title: "Performance", subtitle: "Team content activity — posts, tweets, comments & engagement" },
  admin: { title: "Admin Panel", subtitle: "Team performance, workflow & oversight" },
  owner: { title: "Owner Panel", subtitle: "Clients, invoices, serial keys, devices, finance & API keys" },
};

const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: "Admin", color: "text-primary", bg: "bg-primary/15" },
  manager: { label: "Manager", color: "text-blue-500", bg: "bg-blue-500/15" },
  editor: { label: "Editor", color: "text-emerald-500", bg: "bg-emerald-500/15" },
  member: { label: "Member", color: "text-muted-foreground", bg: "bg-muted" },
  viewer: { label: "Viewer", color: "text-muted-foreground", bg: "bg-muted" },
};

const COMMAND_ITEMS: { id: ViewId; label: string; icon: LucideIcon; group: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, group: "Overview" },
  { id: "composer", label: "Composer", icon: PenLine, group: "Overview" },
  { id: "calendar", label: "Calendar", icon: Calendar, group: "Overview" },
  { id: "inbox", label: "Inbox", icon: InboxIcon, group: "Overview" },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon, group: "Overview" },
  { id: "team-performance", label: "Performance", icon: Activity, group: "Overview" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, group: "Content" },
  { id: "hashtags", label: "Hashtags", icon: Hash, group: "Content" },
  { id: "linkbio", label: "Link in Bio", icon: Link2, group: "Content" },
  { id: "listening", label: "Listening", icon: Radio, group: "Insights" },
  { id: "competitors", label: "Competitors", icon: Crosshair, group: "Insights" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Insights" },
  { id: "reports", label: "Reports", icon: FileBarChart, group: "Insights" },
  { id: "accounts", label: "Accounts", icon: AtSign, group: "Workspace" },
  { id: "team", label: "Team", icon: Users, group: "Workspace" },
  { id: "mail", label: "Mail Server", icon: Mail, group: "Workspace" },
  { id: "settings", label: "Settings", icon: Settings, group: "Workspace" },
];

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { view, adminMode, setAdminMode, setView } = useNav();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const t = TITLES[view] ?? { title: "SocialFlow", subtitle: "" };

  // ⌘K shortcut to open command palette
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const roleBadge = ROLE_BADGE[user?.role ?? "member"] ?? ROLE_BADGE.member;

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 lg:px-6">
      <div className="glass-topbar mx-auto flex w-full max-w-[1340px] items-center gap-2.5 rounded-2xl px-3 py-2.5 shadow-lg sm:px-4">
        <button
          onClick={onMenu}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/60 text-foreground transition hover:bg-muted lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{t.title}</h1>
          <p className="hidden truncate text-[11px] text-muted-foreground lg:block">{t.subtitle}</p>
        </div>

        {/* Search — opens command palette */}
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/60 xl:flex"
        >
          <Search className="h-4 w-4" />
          <span>Search…</span>
          <kbd className="ml-3 flex items-center gap-0.5 rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        {/* Quick compose button */}
        <button
          onClick={() => setView("composer")}
          className="hidden items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 sm:flex"
          title="Compose with AI"
        >
          <PenLine className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Compose</span>
        </button>

        {/* Admin / Member scope toggle */}
        <div className="hidden items-center rounded-xl bg-muted/40 p-0.5 sm:flex" title={adminMode ? "Viewing all team data" : "Viewing only your data"}>
          <button
            onClick={() => setAdminMode(true)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              adminMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            All team
          </button>
          <button
            onClick={() => setAdminMode(false)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              !adminMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            My work
          </button>
        </div>

        {/* Connection status indicator */}
        <ConnectionStatus />

        {/* Notification bell — fetches real unread comments */}
        <NotificationsBell onNavigate={() => setView("inbox")} />

        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/50 text-foreground transition hover:bg-muted"
          aria-label="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </button>

        <button
          onClick={logout}
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/50 text-foreground transition hover:bg-rose-500/15 hover:text-rose-500 sm:grid"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>

        {/* User avatar — functional dropdown with role badge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex shrink-0 items-center gap-1.5 rounded-xl p-0.5 transition hover:bg-muted/50">
              <NameAvatar name={user?.name ?? "User"} color="blue" className="h-9 w-9 text-xs" ring />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <NameAvatar name={user?.name ?? "User"} color="blue" className="h-8 w-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{user?.name ?? "User"}</span>
                    <span className="block text-xs font-normal text-muted-foreground truncate">{user?.email ?? ""}</span>
                  </div>
                </div>
                <span className={cn("mt-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", roleBadge.bg, roleBadge.color)}>
                  {roleBadge.label}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => setView("settings")}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setView("settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setView("team-performance")}>
              <Activity className="mr-2 h-4 w-4" /> My Activity
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-rose-500 focus:text-rose-500" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Command palette dialog */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} onNavigate={(v) => setView(v)} />
    </header>
  );
}

// ============ Command Palette — ⌘K search + navigate ============
function CommandPalette({
  open, onOpenChange, onNavigate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onNavigate: (view: ViewId) => void;
}) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query.trim()) return COMMAND_ITEMS;
    const q = query.toLowerCase();
    return COMMAND_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  const grouped = React.useMemo(() => {
    const groups: Record<string, typeof COMMAND_ITEMS> = {};
    for (const item of filtered) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Search and navigate</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            placeholder="Search modules, pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-[400px] overflow-y-auto scroll-liquid p-2">
          {Object.keys(grouped).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{group}</div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onOpenChange(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-muted/60"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                    <ChevronDown className="h-3 w-3 -rotate-90 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K to open · ESC to close · Type to search
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Connection Status — WhatsApp + scheduler indicators ============
function ConnectionStatus() {
  const { data: conn } = useApi<{ connected: boolean; phone: string | null; serviceOffline?: boolean } | null>(
    "/api/whatsapp/connection"
  );

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden items-center gap-2 lg:flex">
      {/* WhatsApp status */}
      {conn?.connected ? (
        <div className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-500" title={`WhatsApp connected${conn.phone ? ` — ${conn.phone}` : ""}`}>
          <Wifi className="h-3 w-3" />
          <span className="hidden xl:inline">WA</span>
        </div>
      ) : conn?.serviceOffline ? (
        <div className="flex items-center gap-1 rounded-lg bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground" title="WhatsApp service not running">
          <WifiOff className="h-3 w-3" />
          <span className="hidden xl:inline">WA</span>
        </div>
      ) : null}

      {/* Live clock */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Current time">
        <Clock className="h-3 w-3" />
        <span className="tabular-nums">{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    </div>
  );
}

// ============ Notifications Bell — real unread comments + failed posts ============
function NotificationsBell({ onNavigate }: { onNavigate: () => void }) {
  const { data: inbox } = useApi<{ id: string; author: string; text: string; platform: string; handle: string; sentiment: string }[]>("/api/inbox?filter=unread");
  const { data: dashboard } = useApi<{ kpis: { failed: number; pendingInbox: number } } | null>("/api/dashboard");
  const unread = inbox ?? [];
  const failedPosts = dashboard?.kpis?.failed ?? 0;
  const totalAlerts = unread.length + failedPosts;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/50 text-foreground transition hover:bg-muted" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {totalAlerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">
              {totalAlerts > 9 ? "9+" : totalAlerts}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {totalAlerts > 0 && (
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">{totalAlerts} new</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Failed posts alert */}
        {failedPosts > 0 && (
          <>
            <DropdownMenuItem className="flex items-start gap-2.5 py-2.5 cursor-pointer" onClick={onNavigate}>
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-500">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium">{failedPosts} failed publish {failedPosts > 1 ? "attempts" : "attempt"}</div>
                <div className="text-[11px] text-muted-foreground">Check the Composer to retry</div>
              </div>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Unread comments */}
        {unread.length > 0 ? (
          unread.slice(0, 6).map((c) => (
            <DropdownMenuItem key={c.id} className="flex items-start gap-2.5 py-2.5 cursor-pointer" onClick={onNavigate}>
              <div className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                c.sentiment === "positive" ? "bg-emerald-500/15 text-emerald-500" :
                c.sentiment === "negative" ? "bg-rose-500/15 text-rose-500" :
                "bg-blue-500/15 text-blue-500"
              )}>
                <MessageCircle className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium">{c.author}</div>
                <div className="truncate text-[11px] text-muted-foreground">{c.text}</div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">{c.handle}</div>
              </div>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            </DropdownMenuItem>
          ))
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
            All caught up — no unread notifications
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-xs font-medium text-primary cursor-pointer" onClick={onNavigate}>
          View all in inbox
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
