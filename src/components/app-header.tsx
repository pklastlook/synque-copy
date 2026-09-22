"use client";

import * as React from "react";
import { Search, Bell, Moon, Sun, Menu, Command } from "lucide-react";
import { useTheme } from "next-themes";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import { NameAvatar } from "@/components/glass/name-avatar";

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
  approvals: { title: "Approvals", subtitle: "Review content before it goes live" },
  hashtags: { title: "Hashtag Manager", subtitle: "Save, group and research high-performing tags" },
  competitors: { title: "Competitors", subtitle: "Benchmark against rival accounts" },
  reports: { title: "Reports", subtitle: "Build, schedule and export custom reports" },
  linkbio: { title: "Link in Bio", subtitle: "Your shoppable link-in-bio page" },
  mail: { title: "Mail Server", subtitle: "Custom domain mailboxes for your team" },
};

export function AppHeader({ onMenu }: { onMenu: () => void }) {
  const { view, adminMode, setAdminMode } = useNav();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const t = TITLES[view] ?? { title: "Prism", subtitle: "" };

  return (
    <header className="glass-strong sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 px-4 py-3 sm:px-6">
      <button
        onClick={onMenu}
        className="grid h-9 w-9 place-items-center rounded-xl bg-muted/50 text-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{t.title}</h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{t.subtitle}</p>
      </div>

      {/* Search */}
      <button className="hidden items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/70 md:flex">
        <Search className="h-4 w-4" />
        <span>Search…</span>
        <kbd className="ml-6 flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Admin / Member scope toggle */}
      <div className="hidden items-center rounded-xl bg-muted/50 p-0.5 sm:flex">
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

      <button className="relative grid h-9 w-9 place-items-center rounded-xl bg-muted/50 text-foreground transition hover:bg-muted" aria-label="Notifications">
        <Bell className="h-[18px] w-[18px]" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
      </button>

      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="grid h-9 w-9 place-items-center rounded-xl bg-muted/50 text-foreground transition hover:bg-muted"
        aria-label="Toggle theme"
      >
        {mounted && resolvedTheme === "dark" ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )}
      </button>

      <NameAvatar name="Maya Reyes" color="rose" className="h-9 w-9 text-xs" ring />
    </header>
  );
}
