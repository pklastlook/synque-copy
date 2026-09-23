"use client";

import * as React from "react";
import { Search, Bell, Moon, Sun, Menu, Command, LogOut, Settings, User, ChevronDown, MessageCircle, CalendarClock, ShieldAlert, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { NameAvatar } from "@/components/glass/name-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  admin: { title: "Admin Panel", subtitle: "Team performance, workflow & oversight" },
  owner: { title: "Owner Panel", subtitle: "Clients, invoices, serial keys, devices, finance & API keys" },
};

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { view, adminMode, setAdminMode, setView } = useNav();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const t = TITLES[view] ?? { title: "SocialFlow", subtitle: "" };

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

        {/* Search */}
        <button className="hidden items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/60 xl:flex">
          <Search className="h-4 w-4" />
          <span>Search…</span>
          <kbd className="ml-3 flex items-center gap-0.5 rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>

        {/* Admin / Member scope toggle */}
        <div className="hidden items-center rounded-xl bg-muted/40 p-0.5 sm:flex">
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

        {/* Notification bell — functional dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/50 text-foreground transition hover:bg-muted" aria-label="Notifications">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">3 new</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NOTIFICATIONS.map((n, i) => (
              <DropdownMenuItem key={i} className="flex items-start gap-2.5 py-2.5 cursor-pointer">
                <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", n.color)}>
                  <n.icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{n.title}</div>
                  <div className="text-[11px] text-muted-foreground">{n.desc}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</div>
                </div>
                {!n.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-xs font-medium text-primary cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted/50 text-foreground transition hover:bg-rose-500/15 hover:text-rose-500"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>

        {/* User avatar — functional dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex shrink-0 items-center gap-1.5 rounded-xl p-0.5 transition hover:bg-muted/50">
              <NameAvatar name={user?.name ?? "User"} color="blue" className="h-9 w-9 text-xs" ring />
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{user?.name ?? "User"}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email ?? ""}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => setView("settings")}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setView("settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-rose-500 focus:text-rose-500" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

const NOTIFICATIONS = [
  { icon: MessageCircle, title: "New comment on your post", desc: "@user1: 'This is exactly what I needed!'", time: "5m ago", read: false, color: "bg-blue-500/15 text-blue-500" },
  { icon: CalendarClock, title: "Scheduled post published", desc: "'Launch Teaser' went live on 5 accounts", time: "1h ago", read: false, color: "bg-emerald-500/15 text-emerald-500" },
  { icon: ShieldAlert, title: "Account health warning", desc: "@yourbrand on Threads has elevated risk", time: "2h ago", read: false, color: "bg-amber-500/15 text-amber-500" },
  { icon: Zap, title: "AI captions generated", desc: "5 platform-specific variants ready to publish", time: "8h ago", read: true, color: "bg-violet-500/15 text-violet-500" },
];
