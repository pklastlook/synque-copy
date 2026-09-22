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
  ClipboardCheck,
  Hash,
  Crosshair,
  FileBarChart,
  Link2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import type { ViewId } from "@/lib/types";
import { SETTINGS_TABS, type SettingsTab } from "@/components/views/settings";
import { NameAvatar } from "@/components/glass/name-avatar";
import { LogoWordmark } from "@/components/glass/logo";

const NAV: { id: ViewId; label: string; icon: React.ElementType; group: string; badge?: string; accent: string }[] = [
  { id: "admin", label: "Admin Panel", icon: ShieldCheck, group: "Overview", accent: "oklch(0.62 0.22 300)" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview", accent: "oklch(0.55 0.2 255)" },
  { id: "composer", label: "Composer", icon: PenSquare, group: "Overview", accent: "oklch(0.7 0.2 25)" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, group: "Overview", accent: "oklch(0.68 0.2 145)" },
  { id: "inbox", label: "Inbox", icon: Inbox, group: "Overview", badge: "3", accent: "oklch(0.66 0.18 200)" },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck, group: "Overview", badge: "2", accent: "oklch(0.72 0.18 75)" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, group: "Content", accent: "oklch(0.7 0.2 25)" },
  { id: "hashtags", label: "Hashtags", icon: Hash, group: "Content", accent: "oklch(0.66 0.18 200)" },
  { id: "linkbio", label: "Link in Bio", icon: Link2, group: "Content", accent: "oklch(0.68 0.2 145)" },
  { id: "listening", label: "Listening", icon: Radio, group: "Insights", accent: "oklch(0.7 0.2 25)" },
  { id: "competitors", label: "Competitors", icon: Crosshair, group: "Insights", accent: "oklch(0.62 0.22 300)" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Insights", accent: "oklch(0.55 0.2 255)" },
  { id: "reports", label: "Reports", icon: FileBarChart, group: "Insights", accent: "oklch(0.72 0.18 75)" },
  { id: "accounts", label: "Accounts", icon: AtSign, group: "Workspace", accent: "oklch(0.68 0.2 145)" },
  { id: "team", label: "Team", icon: Users, group: "Workspace", accent: "oklch(0.62 0.22 300)" },
  { id: "mail", label: "Mail Server", icon: Mail, group: "Workspace", accent: "oklch(0.66 0.18 200)" },
  // Note: "Media Library" is rendered as an expandable parent group below
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

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const {
    view,
    setView,
    adminMode,
    currentUserId,
    settingsTab,
    settingsExpanded,
    toggleSettings,
    setSettingsTab,
    mediaTab,
    mediaExpanded,
    toggleMedia,
    setMediaTab,
  } = useNav();
  const { user } = useAuth();
  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  const settingsActive = view === "settings";
  const mediaActive = view === "media";

  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      {/* Brand — name only, no logo mark */}
      <div className="px-2 pb-1 pt-2">
        <LogoWordmark size="text-[17px]" />
      </div>

      {/* New Post button */}
      <button
        onClick={() => {
          setView("composer");
          onNavigate?.();
        }}
        className="liquid-pill glow-ring crystal-sweep mb-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
      >
        <PenSquare className="h-4 w-4" />
        New Post
      </button>

      {/* Nav groups */}
      <nav className="scroll-liquid mt-1 flex-1 space-y-3 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g}>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
                      "group crystal-sweep relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_var(--ring)]"
                        : "text-foreground/55 hover:bg-muted/50 hover:text-foreground"
                    )}
                    style={active ? ({ ["--section-accent" as string]: n.accent } as React.CSSProperties) : undefined}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full shadow-[0_0_8px_var(--section-accent)]"
                        style={{ background: n.accent }}
                      />
                    )}
                    <Icon
                      className={cn("h-[18px] w-[18px] shrink-0 transition-transform", !active && "group-hover:scale-110")}
                      style={{ color: n.accent }}
                    />
                    <span className="truncate">{n.label}</span>
                    {n.badge && (
                      <span
                        className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: n.accent }}
                      >
                        {n.badge}
                      </span>
                    )}
                    {active && !n.badge && <ChevronRight className="ml-auto h-3.5 w-3.5" style={{ color: n.accent }} />}
                  </button>
                );
              })}

              {/* Expandable Media Library parent — rendered at the end of the Content group */}
              {g === "Content" && (
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

              {/* Expandable Settings parent — rendered at the end of the Workspace group */}
              {g === "Workspace" && (
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
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="mt-1 flex items-center gap-2.5 rounded-2xl border border-border/30 bg-muted/30 p-2.5">
        <NameAvatar name={user?.name ?? "User"} color="blue" className="h-9 w-9 text-xs" ring />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">{user?.name ?? "User"}</span>
            {user?.role === "admin" && (
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                Admin
              </span>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{user?.title ?? "Team Member"}</div>
        </div>
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
      </div>
      <span className="hidden">{currentUserId}</span>
    </div>
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
      <button
        onClick={handleParentClick}
        aria-expanded={expanded}
        aria-controls="media-subnav"
        style={active ? ({ ["--section-accent" as string]: parentAccent } as React.CSSProperties) : undefined}
        className={cn(
          "group crystal-sweep relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
          active
            ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_var(--ring)]"
            : "text-foreground/55 hover:bg-muted/50 hover:text-foreground"
        )}
      >
        {active && (
          <span
            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full shadow-[0_0_8px_var(--section-accent)]"
            style={{ background: parentAccent }}
          />
        )}
        <Images
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-transform",
            !active && "group-hover:scale-110"
          )}
          style={{ color: parentAccent }}
        />
        <span className="truncate">Media Library</span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform duration-300 ease-out",
            active ? "" : "text-muted-foreground",
            expanded && "rotate-180"
          )}
          style={active ? { color: parentAccent } : undefined}
        />
      </button>

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
              <button
                key={t.id}
                onClick={() => handleSubClick(t.id)}
                aria-current={subActive ? "page" : undefined}
                style={
                  subActive
                    ? ({ ["--section-accent" as string]: t.accent } as React.CSSProperties)
                    : undefined
                }
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-lg pl-7 pr-2.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                  subActive
                    ? "bg-primary/12 text-foreground shadow-[inset_0_0_0_1px_var(--ring)]"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    !subActive && "group-hover:scale-110"
                  )}
                  style={{ color: t.accent }}
                />
                <span className="truncate">{t.label}</span>
              </button>
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
      <button
        onClick={handleParentClick}
        aria-expanded={expanded}
        aria-controls="settings-subnav"
        className={cn(
          "group crystal-sweep relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
          active
            ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--ring)]"
            : "text-foreground/60 hover:bg-muted/50 hover:text-foreground"
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_8px_var(--ring)]" />
        )}
        <Settings
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-transform",
            active && "text-primary",
            !active && "group-hover:scale-110"
          )}
        />
        <span className="truncate">Settings</span>
        <ChevronDown
          className={cn(
            "ml-auto h-4 w-4 transition-transform duration-300 ease-out",
            active ? "text-primary" : "text-muted-foreground",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Sub-items — animated via max-height + opacity */}
      <div
        id="settings-subnav"
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          expanded ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="crystal-in mt-0.5 space-y-0.5 rounded-xl border border-border/30 bg-muted/20 p-1.5">
          {SETTINGS_TABS.map((t) => {
            const Icon = t.icon;
            const subActive = active && settingsTab === t.id;
            const isDanger = t.id === "danger";
            return (
              <button
                key={t.id}
                onClick={() => handleSubClick(t.id)}
                aria-current={subActive ? "page" : undefined}
                className={cn(
                  "group flex w-full items-center gap-2.5 rounded-lg pl-7 pr-2.5 py-1.5 text-[13px] font-medium transition-all duration-200",
                  subActive
                    ? isDanger
                      ? "bg-rose-500/15 text-rose-500 shadow-[inset_0_0_0_1px_oklch(0.65_0.2_25)]"
                      : "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--ring)]"
                    : isDanger
                      ? "text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-500"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    !subActive && "group-hover:scale-110"
                  )}
                />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
