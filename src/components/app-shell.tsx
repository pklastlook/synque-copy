"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { RetinaBg } from "@/components/glass/retina-bg";
import { useNav } from "@/lib/store";
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
import { ApprovalsView } from "@/components/views/approvals";
import { HashtagsView } from "@/components/views/hashtags";
import { CompetitorsView } from "@/components/views/competitors";
import { ReportsView } from "@/components/views/reports";
import { LinkBioView } from "@/components/views/link-bio";
import { MailView } from "@/components/views/mail";

export function AppShell() {
  const { view } = useNav();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="relative flex min-h-screen flex-col">
      <RetinaBg />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <div className="glass sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-border/40 lg:block">
          <AppSidebar />
        </div>

        {/* Mobile sidebar (sheet) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="glass-strong w-[280px] p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
            </SheetHeader>
            <AppSidebar onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onMenu={() => setMobileOpen(true)} />
          <main className="scroll-liquid flex-1 overflow-y-auto">
            <div key={view} className="animate-rise mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
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
              {view === "approvals" && <ApprovalsView />}
              {view === "hashtags" && <HashtagsView />}
              {view === "competitors" && <CompetitorsView />}
              {view === "reports" && <ReportsView />}
              {view === "linkbio" && <LinkBioView />}
              {view === "mail" && <MailView />}
              {view === "settings" && <SettingsView />}
            </div>
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="glass-strong mt-auto border-t border-border/40 px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-1 text-[11px] text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          All systems operational · 10 accounts connected
        </div>
        <div className="flex items-center gap-3">
          <span>Prism Social · v1.0</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Liquid Glass UI</span>
        </div>
      </div>
    </footer>
  );
}
