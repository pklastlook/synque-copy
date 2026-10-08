"use client";

import * as React from "react";
import {
  Search, Bell, Moon, Sun, Menu, Command, LogOut, Settings, User,
  MessageCircle, CheckCircle2, PenLine, Inbox as InboxIcon,
  Calendar, BarChart3, Users, AtSign, Megaphone, Radio, Hash, Crosshair,
  FileBarChart, Link2, Mail, MessageCircle as WhatsAppIcon, Globe, Zap,
  Activity, Clock, Wifi, WifiOff, HelpCircle, type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { useApi, timeAgo } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { NameAvatar } from "@/components/glass/name-avatar";
import { PlatformBadge } from "@/components/glass/platform-badge";
import { Pill, SectionHeader } from "@/components/glass/dense-ui";
import { GlobalSearch } from "@/components/glass/global-search";
import { Breadcrumbs, type Crumb } from "@/components/glass/breadcrumbs";
import { NotificationBell } from "@/components/glass/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  guide: { title: "Guide", subtitle: "Help · About · How-to — onboarding, modules, architecture & FAQs" },
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

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { view, adminMode, setAdminMode, setView } = useNav();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const t = TITLES[view] ?? { title: "SYNQUE", subtitle: "" };

  // ⌘K shortcut to open the global search palette
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

  // Breadcrumb trail — derived from the current view. Each branch carries
  // its parent context so the user always knows where they are in the app
  // hierarchy. Single-root views (Dashboard, Composer) suppress the trail
  // automatically via <Breadcrumbs hideOnShallowMobile />.
  const crumbs = crumbsFor(view);

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

        {/* Search — opens the global command palette. Hidden on desktop xl-;
            on smaller screens a dedicated icon button is rendered below. */}
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

        {/* Search icon — visible on mobile/tablet so ⌘K is reachable without a keyboard. */}
        <button
          onClick={() => setCmdOpen(true)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition hover:bg-[#E8E8ED] dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:hover:bg-white/[0.10] xl:hidden"
          aria-label="Open search"
          title="Search"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Notification bell — placed next to the search icon so it's
            always visible (mobile + desktop). Polls /api/notifications
            every 60s for the unread count, shows a red badge when > 0. */}
        <NotificationBell />

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

        {/* Guide — opens the in-app Guide view (help · about · how-to) */}
        <button
          onClick={() => setView("guide")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F5F5F7] text-[#1D1D1F] transition hover:bg-[#E8E8ED] dark:bg-white/[0.06] dark:text-[#F5F5F7] dark:hover:bg-white/[0.10]"
          aria-label="Open the Guide"
          title="Open the Guide"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </button>

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
            <DropdownMenuItem className="cursor-pointer sm:hidden" onClick={() => setCmdOpen(true)}>
              <Search className="mr-2 h-4 w-4" /> Search
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-rose-500 focus:text-rose-500" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Breadcrumbs — sits below the topbar so the user always sees where
          they are in the app hierarchy. Hidden on shallow single-root views
          (Dashboard, Composer, etc.) on mobile, but rendered on lg+ whenever
          there's a meaningful parent. */}
      {crumbs.length > 0 && (
        <div className="mx-auto mt-1.5 w-full max-w-[1340px] px-2 sm:px-4">
          <Breadcrumbs items={crumbs} />
        </div>
      )}

      {/* Global search palette (⌘K) — searches modules, clients, and posts. */}
      <GlobalSearch open={cmdOpen} onOpenChange={setCmdOpen} onNavigate={(v) => setView(v)} />
    </header>
  );
}

// ============ Breadcrumb map ============
// Maps a ViewId → ordered list of crumbs (parent → child). The final crumb
// is always the current page (no `view` so it renders non-clickable).
// Returns `[]` for top-level views with no parent context (Dashboard, etc.).
function crumbsFor(view: ViewId): Crumb[] {
  switch (view) {
    case "dashboard":
      return [{ label: "Dashboard" }];
    case "composer":
      return [{ label: "Workspace" }, { label: "Composer" }];
    case "calendar":
      return [{ label: "Workspace" }, { label: "Calendar" }];
    case "inbox":
      return [{ label: "Workspace" }, { label: "Inbox" }];
    case "analytics":
      return [{ label: "Insights" }, { label: "Analytics" }];
    case "reports":
      return [{ label: "Insights" }, { label: "Reports" }];
    case "listening":
      return [{ label: "Insights" }, { label: "Listening" }];
    case "competitors":
      return [{ label: "Insights" }, { label: "Competitors" }];
    case "accounts":
      return [{ label: "Workspace" }, { label: "Accounts" }];
    case "team":
      return [{ label: "Workspace" }, { label: "Team" }];
    case "team-performance":
      return [{ label: "Workspace" }, { label: "Team" }, { label: "Performance" }];
    case "settings":
      return [{ label: "Workspace" }, { label: "Settings" }];
    case "campaigns":
      return [{ label: "Content" }, { label: "Campaigns" }];
    case "hashtags":
      return [{ label: "Content" }, { label: "Hashtags" }];
    case "linkbio":
      return [{ label: "Content" }, { label: "Link in Bio" }];
    case "media":
      return [{ label: "Workspace" }, { label: "Media Library" }];
    case "mail":
      return [{ label: "Workspace" }, { label: "Mail Server" }];
    case "whatsapp":
      return [{ label: "Workspace" }, { label: "WhatsApp Inbox" }];
    case "chat":
      return [{ label: "Workspace" }, { label: "Team Chat" }];
    case "tasks":
      return [{ label: "Workspace" }, { label: "Tasks" }];
    case "admin":
      return [{ label: "Workspace" }, { label: "Admin Panel" }];
    case "owner":
      return [{ label: "Workspace" }, { label: "Owner Panel" }];
    case "guide":
      return [{ label: "Workspace" }, { label: "Guide" }];
    case "organization":
      return [{ label: "Workspace" }, { label: "Organization" }];
    case "utm":
      return [{ label: "Content" }, { label: "UTM Builder" }];
    case "approvals":
      return [{ label: "Content" }, { label: "Approvals" }];
    case "influencers":
      return [{ label: "Insights" }, { label: "Influencers" }];
    case "account-safety":
      return [{ label: "Workspace" }, { label: "Account Safety" }];
    case "vpn":
      return [{ label: "Workspace" }, { label: "VPN" }];
    default:
      return [];
  }
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
