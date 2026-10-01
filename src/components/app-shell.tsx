"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { RetinaBg } from "@/components/glass/retina-bg";
import { SectionHeader, Pill } from "@/components/glass/dense-ui";
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
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { OrganizationView } from "@/components/views/organization";
import { UTMBuilderView } from "@/components/views/utm-builder";
import { ApprovalsView } from "@/components/views/approvals";
import { InfluencersView } from "@/components/views/influencers";
import { AccountSafetyView } from "@/components/views/account-safety";
import {
  LayoutDashboard, PenSquare, Inbox as InboxIcon, BarChart3, MoreHorizontal,
  Calendar, MessageCircle as WhatsAppIcon, MessageSquare, CheckSquare,
  Link2, Image as ImageIcon, FileBarChart, Megaphone, Settings as SettingsIcon,
  Building2, TrendingUp, Briefcase, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// === Mobile bottom tab bar items — role-based ===
// Editors: Home, Inbox, Compose, Calendar, More
// Managers/Admins: Home, Inbox, Compose, Stats, More
const EDITOR_TABS: { id: string; label: string; icon: LucideIcon; accent: string }[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, accent: "#5856D6" },
  { id: "inbox", label: "Inbox", icon: InboxIcon, accent: "#34C759" },
  { id: "composer", label: "Compose", icon: PenSquare, accent: "#FF9500" },
  { id: "calendar", label: "Calendar", icon: Calendar, accent: "#FF3B30" },
  { id: "settings", label: "More", icon: MoreHorizontal, accent: "#8E8E93" },
];

const MANAGER_TABS: { id: string; label: string; icon: LucideIcon; accent: string }[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, accent: "#5856D6" },
  { id: "analytics", label: "Stats", icon: BarChart3, accent: "#007AFF" },
  { id: "reports", label: "Reports", icon: FileBarChart, accent: "#FF2D55" },
  { id: "approvals", label: "Approvals", icon: CheckSquare, accent: "#FF9500" },
  { id: "settings", label: "More", icon: MoreHorizontal, accent: "#8E8E93" },
];

// === "More" sheet items — colorful iOS-style icons ===
const MORE_NAV_ITEMS: { id: string; label: string; icon: LucideIcon; color: string }[] = [
  { id: "calendar", label: "Calendar", icon: Calendar, color: "#FF3B30" },
  { id: "whatsapp", label: "WhatsApp", icon: WhatsAppIcon, color: "#34C759" },
  { id: "chat", label: "Chat", icon: MessageSquare, color: "#5856D6" },
  { id: "tasks", label: "Tasks", icon: CheckSquare, color: "#FF9500" },
  { id: "accounts", label: "Accounts", icon: Link2, color: "#007AFF" },
  { id: "media", label: "Media", icon: ImageIcon, color: "#AF52DE" },
  { id: "reports", label: "Reports", icon: FileBarChart, color: "#FF2D55" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, color: "#FF6B00" },
];

const MORE_ADMIN_ITEMS_MEMBER: { id: string; label: string; icon: LucideIcon; color: string }[] = [
  { id: "settings", label: "Settings", icon: SettingsIcon, color: "#8E8E93" },
  { id: "organization", label: "Org", icon: Building2, color: "#5AC8FA" },
  { id: "team-performance", label: "Performance", icon: TrendingUp, color: "#FF9500" },
];

const MORE_ADMIN_ITEMS_OWNER: { id: string; label: string; icon: LucideIcon; color: string }[] = [
  { id: "owner", label: "Owner", icon: Briefcase, color: "#FFD60A" },
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
          <main className="scroll-liquid flex-1 overflow-y-auto overflow-x-hidden">
            <div
              key={view}
              className="animate-ios-fade-scale mx-auto w-full max-w-[1400px] px-3 pt-3 pb-28 sm:px-6 sm:pt-4 lg:px-8 lg:pb-8 mobile-content"
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
              {view === "utm" && <UTMBuilderView />}
              {view === "approvals" && <ApprovalsView />}
              {view === "influencers" && <InfluencersView />}
              {view === "account-safety" && <AccountSafetyView />}
              {view === "settings" && <SettingsView />}
            </div>
          </main>
          <AppFooter />
        </div>
      </div>

      {/* Mobile bottom tab bar — iOS 18 / macOS 27 style.
          Solid #F0F0F2, flat top edge, dot indicator below active icon. */}
      {showMobileTabs && (
        <div className="mobile-only">
          <nav
            className={cn(
              "apple-tab-bar apple-glass-heavy apple-font select-none antialiased",
              "fixed bottom-0 left-0 right-0 z-50 flex items-stretch",
              "min-h-[49px] pb-[env(safe-area-inset-bottom,0px)]",
            )}
            aria-label="Primary"
          >
            {(user && (user.role === "admin" || user.role === "manager") ? MANAGER_TABS : EDITOR_TABS).map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.id || (tab.id === "settings" && showMoreSheet);
              const isCompose = tab.id === "composer";
              return (
                <button
                  key={tab.id}
                  onClick={() => handleMobileTab(tab.id)}
                  className={cn(
                    "apple-tab-item touch-button transition-colors duration-200",
                    isActive && "active",
                    isCompose && "apple-compose-tab",
                  )}
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className="tab-icon h-6 w-6"
                    strokeWidth={isActive ? 2.4 : 2}
                    style={{ color: isActive ? tab.accent : undefined }}
                  />
                  <span className="tab-label block leading-none" style={{ color: isActive ? tab.accent : undefined }}>{tab.label}</span>
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
          {/* Sheet — solid white, rounded-t-xl (NOT 3xl), flat Apple style */}
          <div
            className={cn(
              "apple-glass-heavy apple-font animate-ios-slide-up",
              "fixed bottom-0 left-0 right-0 z-[70] max-h-[85vh] overflow-y-auto scroll-liquid",
              "rounded-t-xl border-t border-black/[0.06] pb-[calc(env(safe-area-inset-bottom,0px)+12px)] dark:border-white/[0.08]",
              "shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.18)]",
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
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-black/[0.05] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>

            {/* Primary navigation grid — colorful iOS-style icons */}
            <div className="grid grid-cols-4 gap-2.5 px-4 pb-4">
              {MORE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id as any); setShowMoreSheet(false); }}
                    className={cn(
                      "apple-pill touch-button flex flex-col items-center gap-1.5 rounded-xl p-3",
                      active && "!border-primary/50",
                    )}
                  >
                    <span
                      className="grid h-10 w-10 place-items-center rounded-xl"
                      style={{
                        background: active ? item.color : `${item.color}1A`,
                        color: active ? "#fff" : item.color,
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
              <div className="border-t border-black/[0.06] px-4 pb-4 pt-4 dark:border-white/[0.08]">
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
                          "apple-pill touch-button flex flex-col items-center gap-1.5 rounded-xl p-3",
                          active && "!border-primary/50",
                        )}
                      >
                        <span
                          className="grid h-10 w-10 place-items-center rounded-xl"
                          style={{
                            background: active ? item.color : `${item.color}1A`,
                            color: active ? "#fff" : item.color,
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

      {/* PWA Install Prompt — cross-browser install notification */}
      <PWAInstallPrompt />
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
    <footer className="mt-auto px-4 pb-3 pt-1 sm:px-6 lg:px-8 safe-bottom">
      <SectionHeader
        title="All systems operational"
        desc={`${accountCount} ${accountCount === 1 ? "account" : "accounts"} connected`}
        className={cn(
          "glass-topbar mx-auto mb-0 w-full max-w-[1400px] rounded-xl px-3 py-1.5",
          "text-[11px] text-muted-foreground",
          "[&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground/90",
          "[&_p]:text-[10px] [&_p]:text-muted-foreground",
        )}
        action={
          <div className="flex items-center gap-2">
            <Pill color="green">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </Pill>
            <span className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
              <span>SYNQUE · v1.0</span>
              <Pill color="neutral">Crystal UI</Pill>
            </span>
          </div>
        }
      />
    </footer>
  );
}
