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
import { VPNView } from "@/components/views/vpn";
import {
  LayoutDashboard, PenSquare, Inbox as InboxIcon, BarChart3, MoreHorizontal,
  CalendarDays, MessageCircle, ListTodo, AtSign,
  Images as ImageIcon, FileBarChart, Megaphone, Settings as SettingsIcon,
  Building2, Briefcase, X, Radio, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformBrandIcon } from "@/components/brand-icons";

// === Mobile bottom tab bar items — role-based ===
// Editors: Home, Inbox, Compose, Calendar, More
// Managers/Admins: Home, Inbox, Compose, Stats, More
// Visual style MATCHES the desktop sidebar: flat accent-colored lucide icon +
// label, NO tile background. Active = full-color icon + accent dot indicator.
type MobileTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: string; // oklch color (matches sidebar)
};

const EDITOR_TABS: MobileTab[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, accent: "oklch(0.55 0.2 255)" },
  { id: "inbox", label: "Inbox", icon: InboxIcon, accent: "oklch(0.66 0.18 200)" },
  { id: "composer", label: "Compose", icon: PenSquare, accent: "oklch(0.7 0.2 25)" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, accent: "oklch(0.68 0.2 145)" },
  { id: "settings", label: "More", icon: MoreHorizontal, accent: "oklch(0.62 0 0)" },
];

const MANAGER_TABS: MobileTab[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard, accent: "oklch(0.55 0.2 255)" },
  { id: "analytics", label: "Stats", icon: BarChart3, accent: "oklch(0.55 0.2 255)" },
  { id: "reports", label: "Reports", icon: FileBarChart, accent: "oklch(0.72 0.18 75)" },
  { id: "listening", label: "Insights", icon: Radio, accent: "oklch(0.7 0.2 25)" },
  { id: "settings", label: "More", icon: MoreHorizontal, accent: "oklch(0.62 0 0)" },
];

// === "More" sheet items ===
// Flat accent-colored icons matching the sidebar style. WhatsApp uses its real
// brand logo; other items use the same lucide glyph as the sidebar.
type MoreItem =
  | {
      id: string;
      label: string;
      icon: LucideIcon;
      accent: string;
      kind: "lucide";
    }
  | {
      id: string;
      label: string;
      accent: string;
      kind: "brand";
      brand:
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "x"
        | "linkedin"
        | "tiktok"
        | "youtube"
        | "threads";
    };

const MORE_NAV_ITEMS: MoreItem[] = [
  { id: "calendar", label: "Calendar", icon: CalendarDays, accent: "oklch(0.68 0.2 145)", kind: "lucide" },
  { id: "whatsapp", label: "WhatsApp", accent: "oklch(0.78 0.18 145)", kind: "brand", brand: "whatsapp" },
  { id: "chat", label: "Chat", icon: MessageCircle, accent: "oklch(0.66 0.22 305)", kind: "lucide" },
  { id: "tasks", label: "Tasks", icon: ListTodo, accent: "oklch(0.7 0.18 165)", kind: "lucide" },
  { id: "accounts", label: "Accounts", icon: AtSign, accent: "oklch(0.68 0.2 145)", kind: "lucide" },
  { id: "media", label: "Media", icon: ImageIcon, accent: "oklch(0.62 0.22 300)", kind: "lucide" },
  { id: "reports", label: "Reports", icon: FileBarChart, accent: "oklch(0.72 0.18 75)", kind: "lucide" },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, accent: "oklch(0.7 0.2 25)", kind: "lucide" },
];

const MORE_ADMIN_ITEMS_MEMBER: MoreItem[] = [
  { id: "settings", label: "Settings", icon: SettingsIcon, accent: "oklch(0.62 0 0)", kind: "lucide" },
  { id: "organization", label: "Org", icon: Building2, accent: "oklch(0.66 0.18 200)", kind: "lucide" },
  { id: "team-performance", label: "Performance", icon: BarChart3, accent: "oklch(0.55 0.2 255)", kind: "lucide" },
];

const MORE_ADMIN_ITEMS_OWNER: MoreItem[] = [
  { id: "owner", label: "Owner", icon: Briefcase, accent: "oklch(0.78 0.18 75)", kind: "lucide" },
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

  // Scroll to top whenever the view changes — so each module opens from the
  // top, not at whatever scroll position the previous view left the page at.
  React.useEffect(() => {
    // The main element may be the scroller OR the window may be the scroller
    // (depends on layout). Scroll both to be safe.
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view]);

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
          <main ref={mainRef} className="scroll-liquid flex-1 overflow-y-auto overflow-x-hidden">
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
              {view === "vpn" && <VPNView />}
              {view === "settings" && <SettingsView />}
            </div>
          </main>
          <AppFooter />
        </div>
      </div>

      {/* Mobile bottom tab bar — matches the desktop sidebar visual style.
          Flat accent-colored lucide icons + labels (NO tile background).
          Active = full-color icon + accent dot indicator above. */}
      {showMobileTabs && (
        <div className="mobile-only">
          <nav
            className={cn(
              "apple-tab-bar apple-tab-bar-dock apple-font select-none antialiased",
              "fixed bottom-0 left-0 right-0 z-50 flex items-stretch",
              "min-h-[64px] rounded-3xl",
            )}
            aria-label="Primary"
          >
            {(user && (user.role === "admin" || user.role === "manager") ? MANAGER_TABS : EDITOR_TABS).map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.id || (tab.id === "settings" && showMoreSheet);
              return (
                <button
                  key={tab.id}
                  onClick={() => handleMobileTab(tab.id)}
                  className={cn(
                    "apple-tab-item apple-tab-flat touch-button transition-colors duration-200",
                    isActive && "active",
                  )}
                  aria-label={tab.label}
                  aria-current={isActive ? "page" : undefined}
                  style={isActive ? { color: tab.accent } : undefined}
                >
                  <Icon
                    className="tab-icon h-[22px] w-[22px]"
                    strokeWidth={isActive ? 2.4 : 2}
                    style={{ color: tab.accent, opacity: isActive ? 1 : 0.7 }}
                  />
                  <span
                    className="tab-label block leading-none"
                    style={{ opacity: isActive ? 1 : 0.75 }}
                  >
                    {tab.label}
                  </span>
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

            {/* Primary navigation grid — flat accent-colored icons (sidebar style) */}
            <div className="grid grid-cols-4 gap-2 px-4 pb-4">
              {MORE_NAV_ITEMS.map((item) => {
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id as any); setShowMoreSheet(false); }}
                    className={cn(
                      "more-grid-item touch-button flex flex-col items-center gap-1.5 rounded-xl p-3 transition",
                      active ? "bg-primary/5" : "hover:bg-muted/40",
                    )}
                  >
                    {item.kind === "lucide" ? (
                      <item.icon
                        className="h-7 w-7"
                        strokeWidth={2}
                        style={{ color: item.accent, opacity: active ? 1 : 0.8 }}
                      />
                    ) : (
                      <PlatformBrandIcon
                        platform={item.brand}
                        className="h-7 w-7"
                      />
                    )}
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
                <div className="grid grid-cols-4 gap-2">
                  {[
                    ...MORE_ADMIN_ITEMS_MEMBER,
                    ...(user.role === "admin" ? MORE_ADMIN_ITEMS_OWNER : []),
                  ].map((item) => {
                    const active = view === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setView(item.id as any); setShowMoreSheet(false); }}
                        className={cn(
                          "more-grid-item touch-button flex flex-col items-center gap-1.5 rounded-xl p-3 transition",
                          active ? "bg-primary/5" : "hover:bg-muted/40",
                        )}
                      >
                        {item.kind === "lucide" ? (
                          <item.icon
                            className="h-7 w-7"
                            strokeWidth={2}
                            style={{ color: item.accent, opacity: active ? 1 : 0.8 }}
                          />
                        ) : (
                          <PlatformBrandIcon
                            platform={item.brand}
                            className="h-7 w-7"
                          />
                        )}
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
