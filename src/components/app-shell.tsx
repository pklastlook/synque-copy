"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { RetinaBg } from "@/components/glass/retina-bg";
import { useNav } from "@/lib/store";
import { useAuth } from "@/lib/auth-store";
import { DashboardView } from "@/components/views/dashboard";
import { ComposerView } from "@/components/views/composer";
import { CalendarView } from "@/components/views/calendar";
import { AnalyticsView } from "@/components/views/analytics";
import { InboxView } from "@/components/views/inbox";
import { AccountsView } from "@/components/views/accounts";
import { TeamView } from "@/components/views/team";
import { SettingsView } from "@/components/views/settings";
import { CampaignsView } from "@/components/views/campaigns";
import { MediaLibraryView } from "@/components/views/media-library";
import { ListeningView } from "@/components/views/listening";
import { HashtagsView } from "@/components/views/hashtags";
import { CompetitorsView } from "@/components/views/competitors";
import { ReportsView } from "@/components/views/reports";
import { LinkBioView } from "@/components/views/link-bio";
import { MailView } from "@/components/views/mail";
import { WhatsAppView } from "@/components/views/whatsapp";
import { ChatView } from "@/components/views/chat";
import { TasksView } from "@/components/views/tasks";
import { AdminPanelView } from "@/components/views/admin-panel";
import { OwnerView } from "@/components/views/owner";
import { TeamPerformanceView } from "@/components/views/team-performance";
import { AIAssistantPanel } from "@/components/ai-assistant";
import { OrganizationView } from "@/components/views/organization";
import {
  LayoutDashboard, PenSquare, Inbox as InboxIcon, BarChart3, MoreHorizontal,
  Calendar, MessageCircle as WhatsAppIcon, MessageSquare, CheckSquare,
  Link2, Image as ImageIcon, FileBarChart, Megaphone, Settings as SettingsIcon,
  Building2, TrendingUp, Briefcase, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// === Mobile bottom tab bar items — iOS 18 SF Pro style ===
const MOBILE_TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "composer", label: "Compose", icon: PenSquare },
  { id: "analytics", label: "Stats", icon: BarChart3 },
  { id: "settings", label: "More", icon: MoreHorizontal },
];

// === "More" sheet items — categorized, SF Pro style Lucide icons ===
const MORE_NAV_ITEMS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "accounts", label: "Accounts", icon: Link2 },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "reports", label: "Reports", icon: FileBarChart },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
];

const MORE_ADMIN_ITEMS_MEMBER: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "organization", label: "Org", icon: Building2 },
  { id: "team-performance", label: "Performance", icon: TrendingUp },
];

const MORE_ADMIN_ITEMS_OWNER: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "owner", label: "Owner", icon: Briefcase },
];

export function AppShell() {
  const { view, setView } = useNav();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [showMoreSheet, setShowMoreSheet] = React.useState(false);
  const { isAuthenticated, fetchUser, user } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, []);

  // Role-based access guard
  React.useEffect(() => {
    if (!user) return;
    const isManager = user.role === "admin" || user.role === "manager";
    const isAdmin = user.role === "admin";
    const restrictedForMembers = ["settings", "team", "team-performance", "organization"];
    const restrictedForManagers = ["owner"];
    if (!isManager && restrictedForMembers.includes(view)) {
      setView("dashboard");
    } else if (!isAdmin && restrictedForManagers.includes(view)) {
      setView("dashboard");
    }
  }, [user, view, setView]);

  // Determine if bottom tab bar should show on mobile
  const showMobileTabs = !["owner", "settings", "organization"].includes(view);

  // Map "settings" tab to the More sheet on mobile
  function handleMobileTab(tabId: string) {
    if (tabId === "settings") {
      setShowMoreSheet(true);
    } else {
      setView(tabId as any);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <RetinaBg />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="glass-sidebar fixed top-0 left-0 z-40 hidden h-screen w-[272px] shrink-0 lg:block desktop-only">
          <AppSidebar />
        </aside>

        {/* Mobile sidebar (sheet) — opened via hamburger or More tab */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="glass-strong w-[300px] p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
            </SheetHeader>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col lg:ml-[272px]">
          <AppHeader onMenu={() => setMobileOpen(true)} />
          <main className="scroll-liquid flex-1 overflow-y-auto">
            <div
              key={view}
              className="animate-ios-fade-scale mx-auto w-full max-w-[1400px] px-3 pt-4 pb-24 sm:px-6 lg:px-8 lg:pb-8 mobile-content"
            >
              {view === "dashboard" && <DashboardView />}
              {view === "composer" && <ComposerView />}
              {view === "calendar" && <CalendarView />}
              {view === "analytics" && <AnalyticsView />}
              {view === "inbox" && <InboxView />}
              {view === "accounts" && <AccountsView />}
              {view === "team" && <TeamView />}
              {view === "campaigns" && <CampaignsView />}
              {view === "media" && <MediaLibraryView />}
              {view === "listening" && <ListeningView />}
              {view === "hashtags" && <HashtagsView />}
              {view === "competitors" && <CompetitorsView />}
              {view === "reports" && <ReportsView />}
              {view === "linkbio" && <LinkBioView />}
              {view === "mail" && <MailView />}
              {view === "whatsapp" && <WhatsAppView />}
              {view === "chat" && <ChatView />}
              {view === "tasks" && <TasksView />}
              {view === "admin" && <AdminPanelView />}
              {view === "owner" && <OwnerView />}
              {view === "team-performance" && <TeamPerformanceView />}
              {view === "organization" && <OrganizationView />}
              {view === "settings" && <SettingsView />}
            </div>
          </main>
          <AppFooter />
        </div>
      </div>

      {/* Mobile bottom tab bar — iOS 18 frosted glass + rounded top */}
      {showMobileTabs && (
        <div className="mobile-only">
          <nav
            className={cn(
              "apple-tab-bar apple-glass-heavy apple-font",
              "fixed bottom-0 left-0 right-0 z-50 flex items-stretch",
              "pb-[env(safe-area-inset-bottom,0px)]",
            )}
            style={{ minHeight: "60px" }}
            aria-label="Primary"
          >
            {MOBILE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.id || (tab.id === "settings" && showMoreSheet);
              const isCompose = tab.id === "composer";
              return (
                <button
                  key={tab.id}
                  onClick={() => handleMobileTab(tab.id)}
                  className={cn(
                    "apple-tab-item touch-button",
                    isActive && "active",
                    // Compose gets a subtle elevated pill (iOS primary action)
                    isCompose && "apple-compose-tab",
                  )}
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="tab-icon h-[22px] w-[22px]" strokeWidth={isActive ? 2.4 : 2} />
                  <span className="tab-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Mobile "More" bottom sheet — iOS 18 frosted, categorized, SF icons */}
      {showMoreSheet && (
        <div className="mobile-only">
          {/* Backdrop scrim */}
          <button
            onClick={() => setShowMoreSheet(false)}
            className="premium-scrim fixed inset-0 z-[60] animate-ios-fade-scale"
            aria-label="Close More menu"
          />
          {/* Sheet */}
          <div
            className={cn(
              "apple-glass-heavy apple-font animate-ios-slide-up",
              "fixed bottom-0 left-0 right-0 z-[70] max-h-[85vh] overflow-y-auto scroll-liquid",
              "rounded-t-[24px] border-t border-black/8 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] dark:border-white/10",
              "shadow-[0_-12px_48px_-12px_rgba(0,0,0,0.35)]",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
          >
            {/* Grabber + header */}
            <div className="flex flex-col items-center pt-2">
              <span className="h-1.5 w-9 rounded-full bg-black/20 dark:bg-white/20" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3 pt-3">
              <h2 className="text-[20px] font-semibold tracking-tight text-foreground">More</h2>
              <button
                onClick={() => setShowMoreSheet(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-black/5 text-muted-foreground transition hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Primary navigation grid — Lucide icons, SF-styled */}
            <div className="grid grid-cols-4 gap-2.5 px-4 pb-4">
              {MORE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id as any); setShowMoreSheet(false); }}
                    className={cn(
                      "apple-pill touch-button flex flex-col items-center gap-1.5 rounded-2xl p-3",
                      active && "!border-blue-500/50",
                    )}
                  >
                    <span
                      className="grid h-10 w-10 place-items-center rounded-full"
                      style={{
                        background: active ? "var(--apple-blue)" : "rgba(0,122,255,0.10)",
                        color: active ? "#fff" : "var(--apple-blue)",
                      }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <span className="text-[11px] font-medium text-foreground/80">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Admin / Manager items */}
            {user && (user.role === "admin" || user.role === "manager") && (
              <div className="border-t border-black/5 px-4 pb-4 pt-4 dark:border-white/10">
                <div className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Admin
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    ...MORE_ADMIN_ITEMS_MEMBER,
                    ...(user.role === "admin" ? MORE_ADMIN_ITEMS_OWNER : []),
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = view === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setView(item.id as any); setShowMoreSheet(false); }}
                        className={cn(
                          "apple-pill touch-button flex flex-col items-center gap-1.5 rounded-2xl p-3",
                          active && "!border-blue-500/50",
                        )}
                      >
                        <span
                          className="grid h-10 w-10 place-items-center rounded-full"
                          style={{
                            background: active ? "var(--apple-blue)" : "rgba(0,122,255,0.10)",
                            color: active ? "#fff" : "var(--apple-blue)",
                          }}
                        >
                          <Icon className="h-5 w-5" strokeWidth={2.2} />
                        </span>
                        <span className="text-[11px] font-medium text-foreground/80">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Assistant — floating chat widget available on every page */}
      <AIAssistantPanel />
    </div>
  );
}

function AppFooter() {
  const [accountCount, setAccountCount] = React.useState(0);
  React.useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setAccountCount(d.length); })
      .catch(() => {});
  }, []);
  return (
    <footer className="px-4 pb-4 pt-2 sm:px-6 lg:px-8 safe-bottom">
      <div className="glass-topbar mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          All systems operational · {accountCount} {accountCount === 1 ? "account" : "accounts"} connected
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span>SocialFlow · v1.0</span>
          <span>·</span>
          <span>Crystal UI</span>
        </div>
      </div>
    </footer>
  );
}
