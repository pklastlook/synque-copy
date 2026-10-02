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
import { Pill, SectionHeader } from "@/components/glass/dense-ui";
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
  chat: { title: "Team Chat", subtitle: "Message your team and share files" },
  tasks: { title: "Tasks", subtitle: "Assign work, write content, and send tasks to the composer" },
  "team-performance": { title: "Performance", subtitle: "Team content activity — posts, tweets, comments & engagement" },
  admin: { title: "Admin Panel", subtitle: "Team performance, workflow & oversight" },
  owner: { title: "Owner Panel", subtitle: "Clients, invoices, serial keys, devices, finance & API keys" },
};

// Role → dense-ui Pill color mapping. Admin uses `blue` (matches primary accent in
// app-sidebar.tsx user card). Manager gets `violet` for visual distinction. Editor gets
// `green`. Member/Viewer get `neutral` (muted).
const ROLE_BADGE: Record<string, { label: string; pill: "blue" | "violet" | "green" | "neutral" }> = {
  admin: { label: "Admin", pill: "blue" },
  manager: { label: "Manager", pill: "violet" },
  editor: { label: "Editor", pill: "green" },
  member: { label: "Member", pill: "neutral" },
  viewer: { label: "Viewer", pill: "neutral" },
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
  const t = TITLES[view] ?? { title: "SYNQUE", subtitle: "" };

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
    <header className="sticky top-0 z-30 px-2 pt-2 sm:px-5 sm:pt-3 lg:px-6">
      {/* Header bar — solid white (frosted via /80 + backdrop-blur-xl), rounded-xl, hairline border.
          Mobile: minimal — only menu, title, bell, avatar. Desktop: full toolbar. */}
      <div className="glass-topbar mx-auto flex w-full max-w-[1340px] items-center gap-1.5 rounded-xl px-2 py-2 sm:gap-2 sm:px-4">
        <button
          onClick={onMenu}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition hover:bg-[#E8E8ED] dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:hover:bg-white/[0.10] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight sm:text-lg">{t.title}</h1>
          <p className="hidden truncate text-[11px] text-muted-foreground lg:block">{t.subtitle}</p>
        </div>

        {/* Search — opens command palette. Hidden on mobile (use menu instead). */}
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden items-center gap-2 rounded-lg border border-black/[0.06] bg-[#F5F5F7] px-2.5 py-1.5 text-sm text-[#86868B] transition hover:bg-[#E8E8ED] dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-[#98989D] dark:hover:bg-white/[0.10] xl:flex"
        >
          <Search className="h-4 w-4" />
          <span>Search…</span>
          <kbd className="ml-3 flex items-center gap-0.5 rounded bg-black/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-[#86868B] dark:bg-white/[0.08] dark:text-[#98989D]">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        {/* Quick compose button — hidden on mobile (use FAB or menu). */}
        <button
          onClick={() => setView("composer")}
          className="hidden items-center gap-1.5 rounded-lg bg-[#0071E3] px-2.5 py-1.5 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(0,113,227,0.30)] transition hover:bg-[#0061cb] dark:bg-[#0A84FF] dark:hover:bg-[#0071E3] lg:flex"
          title="Compose with AI"
        >
          <PenLine className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Compose</span>
        </button>

        {/* Admin / Member scope toggle — hidden on mobile (use dropdown). */}
        <div className="hidden items-center rounded-lg bg-[#F5F5F7] p-0.5 dark:bg-white/[0.06] lg:flex" title={adminMode ? "Viewing all team data" : "Viewing only your data"}>
          <button
            onClick={() => setAdminMode(true)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition",
              adminMode ? "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]" : "text-[#86868B] dark:text-[#98989D]"
            )}
          >
            All team
          </button>
          <button
            onClick={() => setAdminMode(false)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition",
              !adminMode ? "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]" : "text-[#86868B] dark:text-[#98989D]"
            )}
          >
            My work
          </button>
        </div>

        {/* Connection status — hidden on mobile */}
        <div className="hidden lg:block">
          <ConnectionStatus />
        </div>

        {/* Notification bell — always visible */}
        <NotificationsBell onNavigate={() => setView("inbox")} />

        {/* Theme toggle — visible on all screens (mobile + desktop) */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition hover:bg-[#E8E8ED] dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:hover:bg-white/[0.10] sm:h-9 sm:w-9"
          aria-label="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          ) : (
            <Moon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          )}
        </button>

        {/* Log out — hidden on mobile (use user dropdown) */}
        <button
          onClick={logout}
          className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:hover:bg-[#FF453A]/15 dark:hover:text-[#FF453A] lg:grid"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>

        {/* User avatar — always visible */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex shrink-0 items-center rounded-lg p-0.5 transition hover:bg-[#F5F5F7] dark:hover:bg-white/[0.06]">
              <NameAvatar name={user?.name ?? "User"} color="blue" src={user?.avatar ?? undefined} className="h-8 w-8 text-xs sm:h-9 sm:w-9" ring />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <NameAvatar name={user?.name ?? "User"} color="blue" src={user?.avatar ?? undefined} className="h-8 w-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{user?.name ?? "User"}</span>
                    <span className="block text-xs font-normal text-muted-foreground truncate">{user?.email ?? ""}</span>
                  </div>
                </div>
                <Pill color={roleBadge.pill} className="mt-1 uppercase tracking-wide">{roleBadge.label}</Pill>
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
            <DropdownMenuItem className="cursor-pointer sm:hidden" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer sm:hidden" onClick={() => setView("composer")}>
              <PenLine className="mr-2 h-4 w-4" /> Compose
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
      {/* WhatsApp status — dense-ui Pill replaces custom status divs.
          Pill doesn't accept `title`, so wrap in a span to preserve the tooltip. */}
      {conn?.connected ? (
        <span title={`WhatsApp connected${conn.phone ? ` — ${conn.phone}` : ""}`}>
          <Pill color="green">
            <Wifi className="h-3 w-3" />
            <span className="hidden xl:inline">WA</span>
          </Pill>
        </span>
      ) : conn?.serviceOffline ? (
        <span title="WhatsApp service not running">
          <Pill color="neutral">
            <WifiOff className="h-3 w-3" />
            <span className="hidden xl:inline">WA</span>
          </Pill>
        </span>
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
        <button className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition hover:bg-[#E8E8ED] dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:hover:bg-white/[0.10]" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {totalAlerts > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF3B30] px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#2C2C2E]">
              {totalAlerts > 9 ? "9+" : totalAlerts}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/* Header — dense-ui SectionHeader with Pill action showing alert count.
            SectionHeader is wrapped in DropdownMenuLabel (p-0) to inherit Radix semantics
            while still rendering SectionHeader's flex layout. */}
        <DropdownMenuLabel className="p-0">
          <SectionHeader
            title="Notifications"
            action={totalAlerts > 0 ? <Pill color="blue">{totalAlerts} new</Pill> : undefined}
            className="mb-0 px-2 py-1.5"
          />
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
              {/* Count Pill — dense-ui replacement for the bare red dot.
                  Shows the actual failure count for scannability. */}
              <Pill color="rose" className="mt-0.5 shrink-0">{failedPosts}</Pill>
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
        <DropdownMenuItem className="justify-center text-xs font-medium text-[#0071E3] cursor-pointer dark:text-[#0A84FF]" onClick={onNavigate}>
          View all in inbox
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
