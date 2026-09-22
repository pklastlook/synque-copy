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
  Sparkles,
  ChevronRight,
  Megaphone,
  Images,
  Radio,
  ClipboardCheck,
  Hash,
  Crosshair,
  FileBarChart,
  Link2,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNav } from "@/lib/store";
import type { ViewId } from "@/lib/types";
import { NameAvatar } from "@/components/glass/name-avatar";

const NAV: { id: ViewId; label: string; icon: React.ElementType; group: string; badge?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { id: "composer", label: "Composer", icon: PenSquare, group: "Overview" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, group: "Overview" },
  { id: "inbox", label: "Inbox", icon: Inbox, group: "Overview", badge: "3" },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck, group: "Overview", badge: "2" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, group: "Content" },
  { id: "media", label: "Media Library", icon: Images, group: "Content" },
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

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView, adminMode, currentUserId } = useNav();
  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <aside className="flex h-full w-full flex-col gap-1 p-3">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 py-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-[28%] bg-gradient-to-br from-[oklch(0.7_0.24_14)] via-[oklch(0.66_0.22_305)] to-[oklch(0.74_0.18_165)] shadow-lg">
          <Sparkles className="h-4 w-4 text-white" />
          <span className="absolute -inset-1 -z-10 rounded-[32%] bg-[oklch(0.7_0.24_14/0.4)] blur-md" />
        </div>
        <div className="leading-tight">
          <div className="text-[15px] font-semibold tracking-tight">Prism</div>
          <div className="text-[11px] text-muted-foreground">Social Workflow</div>
        </div>
      </div>

      {/* New Post button */}
      <button
        onClick={() => {
          setView("composer");
          onNavigate?.();
        }}
        className="liquid-pill glow-ring mb-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
      >
        <PenSquare className="h-4 w-4" />
        New Post
      </button>

      {/* Nav groups */}
      <nav className="scroll-liquid mt-1 flex-1 space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g}>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {g}
            </div>
            <div className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map((n) => {
                const Icon = n.icon;
                const active = view === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      setView(n.id);
                      onNavigate?.();
                    }}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} />
                    <span className="truncate">{n.label}</span>
                    {n.badge && (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/90 text-primary-foreground"
                        )}
                      >
                        {n.badge}
                      </span>
                    )}
                    {active && !n.badge && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary/70" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-border/40 bg-muted/40 p-2.5">
        <NameAvatar name="Maya Reyes" color="rose" className="h-9 w-9 text-xs" ring />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">Maya Reyes</span>
            {adminMode && (
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                Admin
              </span>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">Head of Social</div>
        </div>
        <button
          onClick={() => {
            setView("settings");
            onNavigate?.();
          }}
          className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      {/* keep references used */}
      <span className="hidden">{currentUserId}</span>
    </aside>
  );
}
