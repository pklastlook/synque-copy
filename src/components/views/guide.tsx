"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, LayoutGrid, Info, Share2, HelpCircle, Shield,
  Sparkles, Plug, Wand2, CalendarClock, Send, ChevronDown,
  ChevronRight, Lock, KeyRound, Boxes, Fingerprint, Eye,
  Zap, Layers, CheckCircle2, Crown, Users, UserCog,
  LayoutDashboard, PenSquare, CalendarDays, Inbox, MessageCircle,
  ListTodo, Megaphone, ListChecks, QrCode, Hash, Images, Radio,
  Crosshair, Star, BarChart3, FileBarChart, AtSign, ShieldCheck,
  Mail, Building2, Settings as SettingsIcon, Database,
  Server, Network, Cpu, FileText, type LucideIcon,
} from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { SectionHeader, Pill, ListRow } from "@/components/glass/dense-ui";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  InstagramIcon, FacebookIcon, XIcon, LinkedinIcon,
  TiktokIcon, YoutubeIcon, ThreadsIcon,
} from "@/components/brand-icons";
import type { ViewId } from "@/lib/types";

/* ============================================================================
   Types
   ============================================================================ */
type GuideTab =
  | "getting-started"
  | "modules"
  | "about"
  | "cross-posting"
  | "faq"
  | "security";

type Module = {
  id: ViewId | string;
  name: string;
  icon: LucideIcon;
  what: string;
  steps: string[];
  accent: string;
  group: "Overview" | "Content" | "Insights" | "Workspace";
};

/* ============================================================================
   Data — 24 modules, getting started, FAQs, security
   ============================================================================ */
const MODULES: Module[] = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, accent: "oklch(0.55 0.2 255)", group: "Overview",
    what: "A single-pane overview of your social performance across every connected account.",
    steps: ["Open the Dashboard from the sidebar.", "Glance at KPI cards (followers, reach, engagement).", "Filter by account or time range using the top bar.", "Drill into per-platform breakdowns and recent activity."] },
  { id: "composer", name: "Composer", icon: PenSquare, accent: "oklch(0.7 0.2 25)", group: "Overview",
    what: "Create AI-optimized posts and publish them to multiple platforms in one flow.",
    steps: ["Click New Post in the sidebar.", "Select one or more destination accounts.", "Write or generate a caption with AI.", "Attach media and preview per-platform variants.", "Publish now, schedule, or save as a draft."] },
  { id: "calendar", name: "Calendar", icon: CalendarDays, accent: "oklch(0.68 0.2 145)", group: "Overview",
    what: "A monthly grid view of every scheduled and published post across all accounts.",
    steps: ["Open Calendar from the sidebar.", "Switch between Month / Week / Day views.", "Drag-and-drop posts to reschedule.", "Click any post card to edit details.", "Spot gaps in your content pipeline at a glance."] },
  { id: "inbox", name: "Inbox", icon: Inbox, accent: "oklch(0.66 0.18 200)", group: "Overview",
    what: "Unified inbox for comments, mentions, and DMs across every connected platform.",
    steps: ["Open Inbox from the sidebar.", "Filter by platform, sentiment, or assignee.", "Reply inline or assign to a teammate.", "Mark threads resolved to keep the queue clean.", "Use AI suggested replies for faster response."] },
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, accent: "oklch(0.78 0.18 145)", group: "Overview",
    what: "Mirror WhatsApp Business chats into SYNQUE so you can publish messages from groups.",
    steps: ["Connect your WhatsApp account via QR code.", "Pick a conversation or group.", "Paste or compose the message.", "Send immediately or schedule for later.", "Track delivery status in the inbox view."] },
  { id: "chat", name: "Team Chat", icon: MessageCircle, accent: "oklch(0.66 0.22 305)", group: "Overview",
    what: "Internal real-time messaging for your team with channels and direct messages.",
    steps: ["Open Team Chat from the sidebar.", "Create channels for projects or clients.", "Mention @teammates to notify them.", "Share files and media inline.", "Pin important messages for the team."] },
  { id: "tasks", name: "Tasks", icon: ListTodo, accent: "oklch(0.7 0.18 165)", group: "Overview",
    what: "Assign content tasks to teammates and track them through to completion.",
    steps: ["Open Tasks from the sidebar.", "Create a task and assign an owner.", "Add a brief, due date, and priority.", "Push the task to the Composer when ready.", "Mark complete when published."] },
  { id: "campaigns", name: "Campaigns", icon: Megaphone, accent: "oklch(0.7 0.2 25)", group: "Content",
    what: "Group multiple posts into a campaign and measure aggregate performance.",
    steps: ["Create a new campaign with a goal and budget.", "Attach existing or scheduled posts.", "Set start and end dates.", "Monitor aggregated reach and engagement.", "Compare campaign ROI vs. previous runs."] },
  { id: "approvals", name: "Approvals", icon: ListChecks, accent: "oklch(0.74 0.18 165)", group: "Content",
    what: "Multi-tier content approval workflow so nothing publishes without sign-off.",
    steps: ["Editors submit drafts for review.", "Managers receive an approval request.", "Approve, request changes, or reject.", "Authors are notified of the decision.", "Approved posts auto-publish on schedule."] },
  { id: "utm", name: "UTM Builder", icon: QrCode, accent: "oklch(0.66 0.18 200)", group: "Content",
    what: "Generate branded UTM tracking links for every post and campaign.",
    steps: ["Open UTM Builder from the sidebar.", "Paste your destination URL.", "Pick source, medium, and campaign names.", "Generate the tagged link.", "Copy and use it in your post or bio."] },
  { id: "hashtags", name: "Hashtags", icon: Hash, accent: "oklch(0.66 0.18 200)", group: "Content",
    what: "Research trending hashtags, save groups, and insert them in the Composer.",
    steps: ["Search a topic or keyword.", "See trend volume and difficulty scores.", "Save hashtags into named groups.", "Insert a group with one click in the Composer.", "Track which hashtags drive engagement."] },
  { id: "media", name: "Media Library", icon: Images, accent: "oklch(0.62 0.22 300)", group: "Content",
    what: "Centralized asset vault for images, videos, and audio used across posts.",
    steps: ["Upload media via drag-and-drop.", "Tag and organize into folders.", "Preview and edit metadata.", "Insert assets directly into the Composer.", "Track usage across your campaigns."] },
  { id: "listening", name: "Listening", icon: Radio, accent: "oklch(0.7 0.2 25)", group: "Insights",
    what: "Monitor brand mentions, keywords, and sentiment across the open web.",
    steps: ["Set up keywords and brand mentions.", "Choose platforms and languages to monitor.", "Review the live mention feed.", "Reply, assign, or escalate mentions.", "Analyze sentiment trends over time."] },
  { id: "competitors", name: "Competitors", icon: Crosshair, accent: "oklch(0.62 0.22 300)", group: "Insights",
    what: "Benchmark your accounts against competitors' growth and engagement.",
    steps: ["Add a competitor handle or URL.", "Sync their latest posts and stats.", "Compare follower growth side-by-side.", "Identify their top-performing content.", "Set alerts for spikes in their activity."] },
  { id: "influencers", name: "Influencers", icon: Star, accent: "oklch(0.78 0.18 75)", group: "Insights",
    what: "Discover influencers, manage outreach, and track campaign performance.",
    steps: ["Search influencers by niche or audience size.", "View their engagement and reach metrics.", "Add them to a campaign shortlist.", "Send outreach and track responses.", "Measure their content's performance."] },
  { id: "analytics", name: "Analytics", icon: BarChart3, accent: "oklch(0.55 0.2 255)", group: "Insights",
    what: "Deep-dive analytics across every platform with custom KPI breakdowns.",
    steps: ["Pick an account and time range.", "Review impressions, reach, and engagement.", "Compare periods to spot growth trends.", "Drill into top posts and audience demographics.", "Export charts for stakeholder reports."] },
  { id: "reports", name: "Reports", icon: FileBarChart, accent: "oklch(0.72 0.18 75)", group: "Insights",
    what: "Build, schedule, and export custom PDF reports for clients and stakeholders.",
    steps: ["Create a new report template.", "Add charts and KPIs by dragging widgets.", "Choose the date range and accounts.", "Schedule recurring delivery to recipients.", "Export to PDF or share a live link."] },
  { id: "accounts", name: "Accounts", icon: AtSign, accent: "oklch(0.68 0.2 145)", group: "Workspace",
    what: "Connect and manage every social account, with health and token status.",
    steps: ["Open Accounts from the sidebar.", "Click Connect and pick a platform.", "Complete the OAuth flow to authorize.", "Review token health and refresh status.", "Disconnect or reauth any account anytime."] },
  { id: "account-safety", name: "Account Safety", icon: Shield, accent: "oklch(0.74 0.18 145)", group: "Workspace",
    what: "Anti-suspension protection that throttles publish rate and rotates behavior.",
    steps: ["Open Account Safety from the sidebar.", "Review the protection score per account.", "Tune daily post caps and cooldown windows.", "Ban risky hashtags and link patterns.", "Watch live suspension risk alerts."] },
  { id: "vpn", name: "VPN", icon: ShieldCheck, accent: "oklch(0.55 0.2 255)", group: "Workspace",
    what: "Secure, region-locked browsing so each account operates from its origin IP.",
    steps: ["Open VPN from the sidebar.", "Pick a server region matching the account.", "Connect with one click.", "Verify your new public IP address.", "Publish safely through the secure tunnel."] },
  { id: "mail", name: "Mail Server", icon: Mail, accent: "oklch(0.66 0.18 200)", group: "Workspace",
    what: "Custom domain mailboxes for your team — connect Hostinger, cPanel, or Zoho.",
    steps: ["Open Mail Server from the sidebar.", "Add a provider and connect with IMAP/SMTP.", "Create team mailboxes under your domain.", "Send and receive mail from inside SYNQUE.", "Forward and route messages with rules."] },
  { id: "organization", name: "Organization", icon: Building2, accent: "oklch(0.7 0.18 165)", group: "Workspace",
    what: "Workspace settings — users, teams, roles, departments, and designations.",
    steps: ["Open Organization from the sidebar.", "Invite users and assign roles.", "Create departments and designations.", "Configure team structure and reporting.", "Audit changes in the activity log."] },
  { id: "owner", name: "Owner Panel", icon: Crown, accent: "oklch(0.78 0.18 75)", group: "Workspace",
    what: "Admin-only control panel for clients, subscriptions, serial keys, and finance.",
    steps: ["Open Owner Panel (admin role required).", "Manage client tenants and their plans.", "Generate serial keys for activation.", "Review finance summaries and invoices.", "Audit API keys and device bindings."] },
  { id: "settings", name: "Settings", icon: SettingsIcon, accent: "oklch(0.62 0.22 300)", group: "Workspace",
    what: "Profile, security, integrations, and workspace-wide preferences.",
    steps: ["Open Settings from the sidebar.", "Edit profile, name, and avatar.", "Configure 2FA and biometric login.", "Connect integrations (Cloudinary, etc.).", "Manage billing, plan, and notifications."] },
];

const GETTING_STARTED = [
  { icon: Sparkles, title: "Welcome to SYNQUE", accent: "oklch(0.62 0.22 300)",
    body: "SYNQUE is your enterprise command center for social media. Connect accounts, draft with AI, schedule across 7 platforms, and measure everything — all from one liquid-glass interface." },
  { icon: Plug, title: "Connect your first social account", accent: "oklch(0.68 0.2 145)",
    body: "Go to Accounts → Connect, pick a platform (Instagram, Facebook, X, LinkedIn, TikTok, YouTube, or Threads), and complete the OAuth flow. You can mix and match up to your plan's account limit." },
  { icon: Wand2, title: "Create your first post with AI", accent: "oklch(0.7 0.2 25)",
    body: "Hit New Post, select one or more destination accounts, then click Generate with AI. SYNQUE writes a unique caption optimized for each platform's tone and character limit. Tweak, attach media, and preview." },
  { icon: CalendarClock, title: "Schedule posts", accent: "oklch(0.66 0.18 200)",
    body: "From the Composer, switch Publish → Schedule, pick a date and time, and SYNQUE queues each variant per platform. Open the Calendar to drag-and-drop, see gaps, and balance your content pipeline." },
];

const FAQS = [
  { q: "How many accounts can I connect?",
    a: "It depends on your plan: Starter allows 3 social accounts, Growth allows 15, and Enterprise is unlimited. You can mix and match any of the 7 supported platforms in any combination." },
  { q: "How many profiles can I select for one post?",
    a: "You can select up to your plan's account limit per post — meaning a single Composer session can fan out to every connected account at once. Each profile receives an AI-optimized variant tailored to its platform." },
  { q: "Which platforms are supported?",
    a: "Seven platforms: Instagram, Facebook, X (Twitter), LinkedIn, TikTok, YouTube, and Threads. WhatsApp Business is also available as a messaging channel inside the Inbox." },
  { q: "How does AI caption generation work?",
    a: "The Composer sends your brief, selected accounts, and chosen tone to SYNQUE's LLM. It returns a distinct caption per platform — respecting each platform's character limits, hashtag norms, and tone — which you can edit before publishing." },
  { q: "Is my data secure?",
    a: "Yes. All data is encrypted at rest with AES-256. Passwords are bcrypt-hashed. We enforce JWT auth with short-lived access tokens, support 2FA and biometric login, and every tenant is isolated at the database level — each client gets their own Neon PostgreSQL database." },
  { q: "How do I invite team members?",
    a: "Go to Organization → Users → Invite. Enter their email and pick a role (Admin, Manager, Editor, Member, or Viewer). They receive an invite link and join your workspace with their assigned permissions." },
  { q: "Can I schedule posts?",
    a: "Yes. From the Composer, switch the publish mode from Publish now to Schedule. Pick a date and time, and SYNQUE queues each platform-optimized variant. The Calendar view shows every scheduled post in a monthly grid." },
  { q: "What happens to my data if I cancel?",
    a: "You keep access until the end of your billing period, and your data is retained for 30 days after cancellation in case you change your mind. After that, your per-tenant database is permanently deprovisioned and its data is unrecoverable." },
];

const SECURITY = [
  { icon: Lock, title: "AES-256 encryption at rest", accent: "oklch(0.55 0.2 255)",
    body: "Every database record, uploaded media file, and credential is encrypted with AES-256. Tokens for connected platforms are stored in a separate vault and rotated automatically." },
  { icon: KeyRound, title: "JWT authentication", accent: "oklch(0.7 0.2 25)",
    body: "Short-lived access tokens (15 min) and rotating refresh tokens. Every API request is signed and validated server-side. Sessions can be revoked instantly from the sessions panel." },
  { icon: Boxes, title: "Tenant isolation", accent: "oklch(0.68 0.2 145)",
    body: "Each workspace is a fully isolated tenant with its own Neon PostgreSQL database. Cross-tenant data access is impossible at the database layer, not just in the API. Per-tenant encryption keys add another layer of separation." },
  { icon: Shield, title: "Two-factor authentication (2FA)", accent: "oklch(0.66 0.18 200)",
    body: "Enable 2FA from Settings → Security. We support TOTP apps (1Password, Authy, Google Authenticator). Backup codes are generated on enrollment so you never lose access." },
  { icon: Fingerprint, title: "Biometric WebAuthn login", accent: "oklch(0.78 0.18 145)",
    body: "On supported devices, Face ID or fingerprint unlock replaces your password using WebAuthn passkeys. No biometric data ever leaves your device — only a cryptographic challenge response." },
  { icon: Eye, title: "Session management", accent: "oklch(0.62 0.22 300)",
    body: "See every active session by device and location. Revoke any session with one click. Suspicious logins trigger an email alert and require step-up 2FA verification." },
];

const PLAN_LIMITS = [
  { name: "Starter", accounts: "3 accounts", users: "1 user", desc: "For solo creators testing the waters.", color: "oklch(0.62 0.22 300)" },
  { name: "Growth", accounts: "15 accounts", users: "5 users", desc: "For growing teams publishing daily.", color: "oklch(0.68 0.2 145)", featured: true },
  { name: "Enterprise", accounts: "Unlimited", users: "Unlimited", desc: "For large teams with custom needs.", color: "oklch(0.7 0.2 25)" },
];

const PLATFORM_SPECS = [
  { name: "Instagram", Icon: InstagramIcon, color: "#E1306C", limit: "2,200 chars (caption)", note: "Hashtags in caption or first comment" },
  { name: "Facebook",  Icon: FacebookIcon,  color: "#1877F2", limit: "63,206 chars",         note: "Albums up to 1,000 photos" },
  { name: "X",         Icon: XIcon,         color: "#1DA1F2", limit: "280 chars",            note: "Threaded replies" },
  { name: "LinkedIn",  Icon: LinkedinIcon,  color: "#0A66C2", limit: "3,000 chars (post)",   note: "Articles up to 110,000 chars" },
  { name: "TikTok",     Icon: TiktokIcon,    color: "#FE2C55", limit: "2,200 chars (caption)", note: "Video up to 10 min" },
  { name: "YouTube",   Icon: YoutubeIcon,   color: "#FF0000", limit: "5,000 chars (desc)",   note: "Community posts 100 chars" },
  { name: "Threads",   Icon: ThreadsIcon,   color: "#9B9B9B", limit: "500 chars",            note: "Replies threaded" },
];

const TEAM_ROLES = [
  { icon: Crown,    name: "Owner",   accent: "oklch(0.78 0.18 75)",  desc: "Billing owner. Full control over the workspace, subscription, and all data. Cannot be removed by other members." },
  { icon: UserCog,  name: "Admin",   accent: "oklch(0.55 0.2 255)",  desc: "Manages users, roles, integrations, and account-wide settings. Can invite and remove members." },
  { icon: Users,    name: "Manager", accent: "oklch(0.66 0.22 305)", desc: "Approves content, oversees campaigns, and views all analytics. Cannot manage billing or roles." },
  { icon: PenSquare,name: "Editor",  accent: "oklch(0.7 0.2 25)",    desc: "Creates and schedules posts, manages media library, replies to inbox. Cannot approve others' work." },
  { icon: Eye,      name: "Viewer",   accent: "oklch(0.62 0 0)",      desc: "Read-only access to analytics, reports, and the content calendar. Cannot create or publish." },
];

const CROSS_PLATFORMS = [
  { id: "instagram", Icon: InstagramIcon, color: "#E1306C", angle: 0 },
  { id: "facebook",  Icon: FacebookIcon,  color: "#1877F2", angle: 51 },
  { id: "x",         Icon: XIcon,         color: "#1DA1F2", angle: 102 },
  { id: "linkedin",  Icon: LinkedinIcon,  color: "#0A66C2", angle: 154 },
  { id: "tiktok",    Icon: TiktokIcon,    color: "#FE2C55", angle: 206 },
  { id: "youtube",   Icon: YoutubeIcon,   color: "#FF0000", angle: 257 },
  { id: "threads",   Icon: ThreadsIcon,   color: "#9B9B9B", angle: 308 },
];

/* ============================================================================
   Guide view — in-app, rendered inside AppShell.
   Six sub-tabs: Getting Started, Modules, About System, Cross-Posting, FAQ, Security.
   ============================================================================ */
export function GuideView() {
  const [tab, setTab] = React.useState<GuideTab>("getting-started");
  return (
    <div className="animate-rise space-y-4">
      <GuideHeader />

      {/* Tab navigation — horizontal scroll on mobile, full row on desktop */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as GuideTab)} className="space-y-4">
        <div className="sticky top-0 z-10 -mx-1">
          <div className="glass rounded-2xl border border-border/40 p-1.5">
            <TabsList className="scroll-liquid flex h-auto w-full overflow-x-auto rounded-xl bg-transparent p-0">
              {GUIDE_TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className={cn(
                      "h-9 flex-1 gap-1.5 rounded-lg border border-transparent px-3 text-xs font-semibold whitespace-nowrap transition sm:text-sm",
                      "data-[state=active]:shadow-sm",
                      !active && "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="truncate">{t.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <TabsContent value={tab} className="mt-0">
              {tab === "getting-started" && <GettingStartedTab />}
              {tab === "modules" && <ModulesTab />}
              {tab === "about" && <AboutTab />}
              {tab === "cross-posting" && <CrossPostingTab />}
              {tab === "faq" && <FaqTab />}
              {tab === "security" && <SecurityTab />}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

const GUIDE_TABS: { id: GuideTab; label: string; icon: LucideIcon }[] = [
  { id: "getting-started", label: "Getting Started", icon: Rocket },
  { id: "modules",         label: "Modules",          icon: LayoutGrid },
  { id: "about",           label: "About System",     icon: Info },
  { id: "cross-posting",   label: "Cross-Posting",    icon: Share2 },
  { id: "faq",             label: "FAQ",              icon: HelpCircle },
  { id: "security",        label: "Security",         icon: Shield },
];

/* ============================================================================
   Header — title + summary, no hero (this is an in-app view)
   ============================================================================ */
function GuideHeader() {
  return (
    <GlassCard className="overflow-hidden p-5 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary sm:h-12 sm:w-12">
          <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold tracking-tight sm:text-xl">Guide</h2>
            <Pill color="blue"><Sparkles className="h-2.5 w-2.5" />Help · About · How-to</Pill>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Onboarding guides, every module explained, the architecture behind SYNQUE,
            cross-posting walkthroughs, security practices, and the answers to the questions we hear most.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

/* ============================================================================
   Tab 1 — Getting Started
   ============================================================================ */
function GettingStartedTab() {
  const { setView } = useNav();
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Welcome to SYNQUE"
        desc="Four steps to your first multi-platform post."
        icon={Sparkles}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GETTING_STARTED.map((g, i) => {
          const Icon = g.icon;
          return (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard hover className="group relative h-full overflow-hidden p-5">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.10] blur-2xl transition-opacity duration-500 group-hover:opacity-25"
                  style={{ background: g.accent }}
                />
                <div className="relative flex items-center gap-2.5">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white shadow"
                    style={{ background: g.accent }}
                  >
                    {i + 1}
                  </span>
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${g.accent}, oklch(0.4 0.16 258))` }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="relative mt-3 text-sm font-semibold">{g.title}</h3>
                <p className="relative mt-1.5 text-xs leading-relaxed text-muted-foreground">{g.body}</p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* CTA row — quick navigation into the modules */}
      <GlassCard className="p-4 sm:p-5">
        <SectionHeader
          title="Jump back in"
          desc="Pick up where you left off — these are the modules most users open after onboarding."
          icon={Zap}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <QuickLink label="Connect an account" icon={AtSign} accent="oklch(0.68 0.2 145)" onClick={() => setView("accounts")} />
          <QuickLink label="Compose with AI" icon={PenSquare} accent="oklch(0.7 0.2 25)" onClick={() => setView("composer")} />
          <QuickLink label="Open Calendar" icon={CalendarDays} accent="oklch(0.68 0.2 145)" onClick={() => setView("calendar")} />
        </div>
      </GlassCard>
    </div>
  );
}

function QuickLink({ label, icon: Icon, accent, onClick }: {
  label: string; icon: LucideIcon; accent: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-border/40 bg-background/50 p-3 text-left transition-all hover:border-primary/30 hover:bg-muted/30"
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${accent}14` }}>
        <Icon className="h-4 w-4" style={{ color: accent }} />
      </div>
      <span className="flex-1 text-xs font-semibold">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

/* ============================================================================
   Tab 2 — Modules (24 modules grouped, expandable)
   ============================================================================ */
function ModulesTab() {
  const [search, setSearch] = React.useState("");
  const { setView } = useNav();

  const filtered = React.useMemo(() => {
    if (!search.trim()) return MODULES;
    const q = search.toLowerCase();
    return MODULES.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.what.toLowerCase().includes(q) ||
      m.steps.some((s) => s.toLowerCase().includes(q)) ||
      m.group.toLowerCase().includes(q),
    );
  }, [search]);

  const grouped = React.useMemo(() => {
    const g: Record<string, Module[]> = {};
    for (const m of filtered) {
      if (!g[m.group]) g[m.group] = [];
      g[m.group].push(m);
    }
    return g;
  }, [filtered]);

  const groupOrder: Module["group"][] = ["Overview", "Content", "Insights", "Workspace"];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="All 24 modules"
        desc="Every module in SYNQUE, explained with a one-line summary and step-by-step walkthrough."
        icon={LayoutGrid}
        action={
          <div className="hidden items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 sm:flex">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search modules…"
              className="w-44 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-[10px] text-muted-foreground hover:text-foreground">
                Clear
              </button>
            )}
          </div>
        }
      />

      {/* Mobile search */}
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2.5 py-1.5 sm:hidden">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules…"
          className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-[10px] text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <GlassCard className="p-8 text-center text-sm text-muted-foreground">
          No modules matched <span className="font-semibold text-foreground">"{search}"</span>.
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {groupOrder.map((group) => {
            const mods = grouped[group];
            if (!mods || mods.length === 0) return null;
            return (
              <div key={group}>
                <div className="mb-2.5 flex items-center gap-3 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                    {group} · {mods.length}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mods.map((m) => (
                    <ModuleCard key={m.id} module={m} onOpen={() => setView(m.id as ViewId)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ module, onOpen }: { module: Module; onOpen: () => void }) {
  const [open, setOpen] = React.useState(false);
  const Icon = module.icon;
  return (
    <GlassCard hover className="group relative overflow-hidden p-0">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.08] blur-2xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: module.accent }}
      />
      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow"
            style={{ background: `linear-gradient(135deg, ${module.accent}, oklch(0.4 0.16 258))` }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{module.name}</h3>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">{module.group}</p>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse details" : "Expand details"}
            aria-expanded={open}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted/40 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </button>
        </div>
        <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground/80">What it does — </span>
          {module.what}
        </p>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="relative mt-3 border-t border-border/30 pt-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  <Zap className="h-3 w-3" style={{ color: module.accent }} />
                  How to use it
                </div>
                <ol className="space-y-1.5">
                  {module.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span
                        className="grid h-4 w-4 shrink-0 place-items-center rounded-md text-[9px] font-bold text-white"
                        style={{ background: module.accent }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-foreground/80">{s}</span>
                    </li>
                  ))}
                </ol>
                <button
                  onClick={onOpen}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-foreground transition hover:bg-muted"
                >
                  Open module <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}

/* ============================================================================
   Tab 3 — About System (NEW)
   ============================================================================ */
function AboutTab() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="About SYNQUE"
        desc="The architecture, isolation, and platform support behind the product."
        icon={Info}
      />

      {/* Architecture overview */}
      <GlassCard className="p-4 sm:p-5">
        <SectionHeader
          title="Multi-tenant architecture"
          desc="A main registry database plus one isolated PostgreSQL database per client."
          icon={Database}
        />
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <ArchRow
              icon={Database}
              accent="oklch(0.55 0.2 255)"
              title="Main database (shared)"
              points={[
                "Customer registry — every tenant's metadata, plan, and limits.",
                "Authentication — user accounts, bcrypt password hashes, JWT signing keys.",
                "Audit log — security events across all tenants for compliance.",
                "Subscription & billing state — Stripe sync, invoices, plan tier.",
              ]}
            />
            <ArchRow
              icon={Boxes}
              accent="oklch(0.68 0.2 145)"
              title="Per-client isolated databases (Neon PostgreSQL)"
              points={[
                "Every tenant gets its own dedicated Neon PostgreSQL database.",
                "Workspace data — posts, variants, accounts, comments — never mixes across tenants.",
                "Database-level isolation: even a SQL bug cannot leak data across clients.",
                "Per-tenant encryption keys add another cryptographic boundary.",
              ]}
            />
            <ArchRow
              icon={Network}
              accent="oklch(0.7 0.2 25)"
              title="Edge gateway & API"
              points={[
                "Single Caddy gateway routes API traffic by tenant context.",
                "Stateless Next.js API routes resolve the tenant from the JWT.",
                "Connection pooler dispatches queries to the correct Neon branch.",
              ]}
            />
          </div>
          <ArchitectureDiagram />
        </div>
      </GlassCard>

      {/* Data isolation callout */}
      <GlassCard className="p-4 sm:p-5" strong>
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Data isolation by design</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Your workspace data lives in a database that only your tenant can reach.
              We do not share schemas, tables, or connection pools across tenants.
              If you cancel, your database is deprovisioned and its data is unrecoverable.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Security */}
      <GlassCard className="p-4 sm:p-5">
        <SectionHeader
          title="Security stack"
          desc="Defense-in-depth: encryption, auth, isolation, transport, and audit."
          icon={Shield}
        />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <SecurityChip icon={Lock}         accent="oklch(0.55 0.2 255)" label="AES-256 at rest" />
          <SecurityChip icon={KeyRound}     accent="oklch(0.7 0.2 25)"   label="bcrypt + JWT auth" />
          <SecurityChip icon={Shield}       accent="oklch(0.66 0.18 200)" label="2FA (TOTP)" />
          <SecurityChip icon={Fingerprint} accent="oklch(0.78 0.18 145)" label="Biometric WebAuthn" />
          <SecurityChip icon={Boxes}        accent="oklch(0.68 0.2 145)" label="Tenant isolation" />
          <SecurityChip icon={Eye}          accent="oklch(0.62 0.22 300)" label="Audit logging" />
          <SecurityChip icon={Zap}           accent="oklch(0.7 0.2 25)"   label="Rate limiting" />
          <SecurityChip icon={Network}      accent="oklch(0.55 0.2 255)" label="CSP + secure headers" />
          <SecurityChip icon={Server}       accent="oklch(0.62 0 0)"     label="Session management" />
        </div>
      </GlassCard>

      {/* Account limits */}
      <GlassCard className="p-4 sm:p-5">
        <SectionHeader
          title="Account limits & plans"
          desc="Cross-posting to all 7 platforms in one click — limited by your plan."
          icon={Crown}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_LIMITS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border/40 bg-background/50 p-4 transition-all hover:border-primary/30",
                p.featured && "ring-2 ring-primary/40",
              )}
            >
              {p.featured && (
                <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  Most popular
                </span>
              )}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{p.name}</div>
              <div className="num-display mt-1.5 text-2xl font-bold tabular-nums" style={{ color: p.color }}>{p.accounts}</div>
              <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">{p.users}</div>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Supported platforms */}
      <GlassCard className="p-4 sm:p-5">
        <SectionHeader
          title="Supported platforms"
          desc="Seven social platforms with per-platform character limits."
          icon={Share2}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                <th className="px-2 py-2">Platform</th>
                <th className="px-2 py-2">Character limit</th>
                <th className="px-2 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_SPECS.map((p) => (
                <tr key={p.name} className="border-b border-border/20 transition-colors hover:bg-muted/30">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${p.color}14` }}>
                        <p.Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-muted-foreground">{p.limit}</td>
                  <td className="px-2 py-2.5 text-muted-foreground">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Cross-posting summary + team roles */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-4 sm:p-5">
          <SectionHeader
            title="Cross-posting"
            desc="One post becomes 7 AI-optimized variants."
            icon={Share2}
          />
          <ol className="space-y-2">
            {[
              { icon: Layers,  body: "Write one post and select destination accounts.", accent: "oklch(0.55 0.2 255)" },
              { icon: Wand2,   body: "AI rewrites the caption for each platform's tone and limit.", accent: "oklch(0.7 0.2 25)" },
              { icon: Send,    body: "One click publishes every variant simultaneously.", accent: "oklch(0.68 0.2 145)" },
              { icon: BarChart3, body: "Per-variant metrics roll up into a single campaign view.", accent: "oklch(0.66 0.18 200)" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={i} className="flex items-start gap-2.5 rounded-lg bg-muted/20 p-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-white" style={{ background: s.accent }}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="text-xs leading-snug text-foreground/80">
                    <span className="font-semibold">{i + 1}.</span> {s.body}
                  </span>
                </li>
              );
            })}
          </ol>
        </GlassCard>

        <GlassCard className="p-4 sm:p-5">
          <SectionHeader
            title="Team roles"
            desc="Five roles control who can do what."
            icon={Users}
          />
          <div className="space-y-1.5">
            {TEAM_ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.name} className="flex items-start gap-2.5 rounded-lg border border-border/30 bg-background/40 p-2.5">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${r.accent}14` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: r.accent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold">{r.name}</div>
                    <p className="text-[11px] leading-snug text-muted-foreground">{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ArchRow({ icon: Icon, accent, title, points }: {
  icon: LucideIcon; accent: string; title: string; points: string[];
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${accent}14` }}>
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        </div>
        <h4 className="text-xs font-bold">{title}</h4>
      </div>
      <ul className="mt-2 space-y-1">
        {points.map((p, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" style={{ color: accent }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SecurityChip({ icon: Icon, accent, label }: { icon: LucideIcon; accent: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-background/40 p-2.5">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: `${accent}14` }}>
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
        Architecture
      </div>
      {/* Main DB row */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-primary">
          <Database className="h-3 w-3" /> Main DB
        </div>
        <div className="text-[10px] text-muted-foreground">Customers · Auth · Audit</div>
      </div>

      {/* Connection lines */}
      <div className="my-1 flex justify-center">
        <div className="h-4 w-px bg-border/60" />
      </div>

      {/* Gateway */}
      <div className="rounded-lg border border-border/40 bg-background/60 p-2 text-center">
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold">
          <Network className="h-3 w-3 text-muted-foreground" /> Gateway / API
        </div>
        <div className="text-[9px] text-muted-foreground">JWT → resolve tenant</div>
      </div>

      <div className="my-1 flex justify-center gap-4">
        <div className="h-3 w-px bg-border/60" />
        <div className="h-3 w-px bg-border/60" />
        <div className="h-3 w-px bg-border/60" />
      </div>

      {/* Tenant DBs */}
      <div className="grid grid-cols-3 gap-1.5">
        {["Tenant A", "Tenant B", "Tenant C"].map((label, i) => (
          <div key={label} className="rounded-lg border border-border/40 bg-background/40 p-1.5 text-center">
            <Boxes className="mx-auto h-3 w-3 text-muted-foreground" />
            <div className="mt-0.5 text-[9px] font-semibold">{label}</div>
            <div className="text-[8px] text-muted-foreground/70">Neon PG</div>
            {/* tiny index marker */}
            <span className="sr-only">{i}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[10px] leading-snug text-muted-foreground">
        Each tenant's data lives in a separate database — physically isolated.
      </p>
    </div>
  );
}

/* ============================================================================
   Tab 4 — Cross-Posting
   ============================================================================ */
function CrossPostingTab() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Cross-posting, solved"
        desc="Write once, publish everywhere — each platform gets an AI-optimized variant."
        icon={Share2}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <CrossPostingIllustration />
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            One post → 7 platform-optimized variants, published simultaneously.
          </p>
        </GlassCard>

        <div className="space-y-3">
          {[
            { icon: Layers,    title: "1 · Select multiple accounts", body: "Pick any combination across Instagram, Facebook, X, LinkedIn, TikTok, YouTube, and Threads — up to your plan's account limit.", accent: "oklch(0.55 0.2 255)" },
            { icon: Wand2,     title: "2 · AI optimizes per platform", body: "SYNQUE's LLM rewrites your caption for each platform's tone, length, and hashtag norms. You review every variant before publishing.", accent: "oklch(0.7 0.2 25)" },
            { icon: Send,      title: "3 · Publish simultaneously",  body: "One click queues all variants. SYNQUE publishes each on its optimal schedule and respects per-platform rate limits.", accent: "oklch(0.68 0.2 145)" },
            { icon: BarChart3, title: "4 · Measure per platform",    body: "Each variant's impressions, reach, engagement, and clicks are tracked separately — then rolled up into one campaign view.", accent: "oklch(0.66 0.18 200)" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <GlassCard key={i} hover className="flex items-start gap-3 p-3">
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow"
                  style={{ background: `linear-gradient(135deg, ${s.accent}, oklch(0.4 0.16 258))` }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold">{s.title}</h4>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.body}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Plan limits */}
      <GlassCard className="p-4 sm:p-5">
        <SectionHeader
          title="Plan limits"
          desc="How many accounts you can cross-post to."
          icon={Crown}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {PLAN_LIMITS.map((p) => (
            <div
              key={p.name}
              className={cn(
                "relative overflow-hidden rounded-xl border border-border/40 bg-background/50 p-4",
                p.featured && "ring-2 ring-primary/40",
              )}
            >
              {p.featured && (
                <span className="absolute right-2 top-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  Most popular
                </span>
              )}
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{p.name}</div>
              <div className="num-display mt-1.5 text-2xl font-bold tabular-nums" style={{ color: p.color }}>{p.accounts}</div>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Character limits */}
      <GlassCard className="p-4 sm:p-5">
        <SectionHeader
          title="Platform character limits"
          desc="What the AI respects when generating variants."
          icon={FileText}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                <th className="px-2 py-2">Platform</th>
                <th className="px-2 py-2">Limit</th>
                <th className="px-2 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORM_SPECS.map((p) => (
                <tr key={p.name} className="border-b border-border/20 transition-colors hover:bg-muted/30">
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${p.color}14` }}>
                        <p.Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums text-muted-foreground">{p.limit}</td>
                  <td className="px-2 py-2.5 text-muted-foreground">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

function CrossPostingIllustration() {
  const [pulse, setPulse] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setPulse((p) => (p + 1) % CROSS_PLATFORMS.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      <div className="absolute inset-0 rounded-full border border-dashed border-border/40" />
      <div className="absolute inset-8 rounded-full border border-border/30" />
      <div className="absolute inset-16 rounded-full border border-border/20" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400">
        {CROSS_PLATFORMS.map((p, i) => {
          const rad = (p.angle * Math.PI) / 180;
          const x = 200 + 150 * Math.cos(rad);
          const y = 200 + 150 * Math.sin(rad);
          const isActive = pulse === i;
          return (
            <line
              key={p.id}
              x1="200" y1="200" x2={x} y2={y}
              stroke={p.color}
              strokeWidth={isActive ? 2.5 : 1}
              strokeOpacity={isActive ? 0.9 : 0.18}
              strokeDasharray="4 4"
              className="transition-all duration-300"
            >
              {isActive && (
                <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="0.6s" repeatCount="indefinite" />
              )}
            </line>
          );
        })}
      </svg>
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl text-white shadow-2xl"
        style={{ background: "linear-gradient(135deg, var(--primary), oklch(0.5 0.18 277))" }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-center">
          <Send className="mx-auto h-6 w-6" />
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider">One Post</span>
        </div>
      </motion.div>
      {CROSS_PLATFORMS.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = `calc(50% + ${150 * Math.cos(rad)}px)`;
        const y = `calc(50% + ${150 * Math.sin(rad)}px)`;
        const isActive = pulse === i;
        return (
          <motion.div
            key={p.id}
            className="absolute z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border bg-background/80 backdrop-blur"
            style={{ left: x, top: y, borderColor: isActive ? p.color : "var(--border)" }}
            animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <p.Icon className="h-5 w-5" />
            {isActive && (
              <motion.span
                className="absolute inset-0 rounded-2xl"
                style={{ boxShadow: `0 0 0 3px ${p.color}55` }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ============================================================================
   Tab 5 — FAQ (Accordion)
   ============================================================================ */
function FaqTab() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Frequently asked questions"
        desc="The questions we hear most from new teams."
        icon={HelpCircle}
      />
      <GlassCard className="p-2 sm:p-3">
        <Accordion type="single" collapsible defaultValue="faq-0" className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-lg border-b border-border/30 px-3 last:border-b-0 hover:bg-muted/20"
            >
              <AccordionTrigger className="py-3.5 text-sm font-semibold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="pb-3.5 text-xs leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </GlassCard>
    </div>
  );
}

/* ============================================================================
   Tab 6 — Security
   ============================================================================ */
function SecurityTab() {
  const { setView } = useNav();
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Security & privacy"
        desc="Built for enterprise — every layer is hardened and auditable."
        icon={Shield}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECURITY.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: (i % 3) * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard hover className="group relative h-full overflow-hidden p-4">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.08] blur-2xl transition-opacity group-hover:opacity-20"
                  style={{ background: s.accent }}
                />
                <div
                  className="relative grid h-9 w-9 place-items-center rounded-xl text-white shadow"
                  style={{ background: `linear-gradient(135deg, ${s.accent}, oklch(0.4 0.16 258))` }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="relative mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="relative mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* 2FA + biometric setup mini-guide */}
      <GlassCard className="overflow-hidden p-0" strong>
        <div className="grid gap-5 p-5 sm:grid-cols-[1.4fr_1fr] sm:p-6">
          <div>
            <Pill color="green"><Shield className="h-2.5 w-2.5" /> 2FA quick setup</Pill>
            <h3 className="mt-3 text-base font-bold sm:text-lg">Harden your account in 4 steps</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Two-factor authentication takes 2 minutes and reduces account-takeover risk by 99.9%. Pair it with
              biometric login for true passwordless sign-in.
            </p>
            <ol className="mt-4 space-y-2">
              {[
                "Open Settings → Security from the sidebar.",
                "Click Enable 2FA and scan the QR code with your TOTP app.",
                "Enter the 6-digit code to verify enrollment.",
                "Save your backup codes somewhere safe — done!",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-[10px] font-bold text-emerald-500">
                    {i + 1}
                  </span>
                  <span className="text-foreground/80">{step}</span>
                </li>
              ))}
            </ol>
            <button
              onClick={() => setView("settings")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Go to Security <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative grid h-40 w-40 place-items-center rounded-3xl bg-muted/30">
              <motion.div
                className="absolute inset-0 rounded-3xl border-2 border-dashed border-emerald-500/40"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              />
              <div className="text-center">
                <Fingerprint className="mx-auto h-9 w-9 text-emerald-500" />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Face ID · Fingerprint
                </p>
                <p className="text-[9px] text-muted-foreground/70">WebAuthn passkeys</p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Session management quick-link */}
      <GlassCard className="p-4 sm:p-5">
        <SectionHeader
          title="Session management"
          desc="See and revoke active sessions across all your devices."
          icon={Eye}
        />
        <ListRow
          onClick={() => setView("settings")}
          className="cursor-pointer rounded-xl border border-border/30 bg-background/40 px-3 hover:bg-muted/30"
        >
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Eye className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">View active sessions</div>
            <div className="truncate text-[11px] text-muted-foreground">Settings → Security → Sessions</div>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </ListRow>
      </GlassCard>
    </div>
  );
}
