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
  LayoutDashboard, PenSquare, Inbox, BarChart3, Settings,
  Users, MoreHorizontal, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// === Mobile bottom tab bar items ===
const MOBILE_TABS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "composer", label: "Compose", icon: PenSquare },
  { id: "analytics", label: "Stats", icon: BarChart3 },
  { id: "settings", label: "More", icon: MoreHorizontal },
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

      {/* Mobile bottom tab bar — iOS-style */}
      {showMobileTabs && (
        <div className="mobile-tab-bar mobile-only">
          {MOBILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = view === tab.id || (tab.id === "settings" && showMoreSheet);
            return (
              <button
                key={tab.id}
                onClick={() => handleMobileTab(tab.id)}
                className={cn("mobile-tab-item touch-button", isActive && "active")}
              >
                <Icon className="tab-icon h-5 w-5" />
                <span className="tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile "More" bottom sheet — shows additional navigation */}
      {showMoreSheet && (
        <div className="mobile-sheet mobile-only" onClick={() => setShowMoreSheet(false)}>
          <div className="grid grid-cols-4 gap-3 p-4">
            {[
              { id: "calendar", label: "Calendar", icon: "📅" },
              { id: "whatsapp", label: "WhatsApp", icon: "💬" },
              { id: "chat", label: "Chat", icon: "💭" },
              { id: "tasks", label: "Tasks", icon: "✅" },
              { id: "accounts", label: "Accounts", icon: "🔗" },
              { id: "media", label: "Media", icon: "🖼️" },
              { id: "reports", label: "Reports", icon: "📊" },
              { id: "campaigns", label: "Campaigns", icon: "📣" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id as any); setShowMoreSheet(false); }}
                className="touch-button flex flex-col items-center gap-1.5 rounded-2xl bg-muted/30 p-3 transition hover:bg-muted/50"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
              </button>
            ))}
          </div>
          {/* Admin/Manager items */}
          {user && (user.role === "admin" || user.role === "manager") && (
            <div className="border-t border-border/30 p-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Admin</div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: "settings", label: "Settings", icon: "⚙️" },
                  { id: "organization", label: "Org", icon: "🏢" },
                  { id: "team-performance", label: "Performance", icon: "📈" },
                  ...(user.role === "admin" ? [{ id: "owner", label: "Owner", icon: "💼" }] : []),
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id as any); setShowMoreSheet(false); }}
                    className="touch-button flex flex-col items-center gap-1.5 rounded-2xl bg-muted/30 p-3 transition hover:bg-muted/50"
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
