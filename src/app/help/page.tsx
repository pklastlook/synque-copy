"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  LifeBuoy, Search, ChevronDown, ChevronRight, Sparkles, CalendarClock,
  Plug, Wand2, Send, Shield, Fingerprint, KeyRound, Lock, Eye,
  CheckCircle2, ArrowRight, Zap, Layers, Boxes,
  LayoutDashboard, PenSquare, CalendarDays, Inbox, MessageCircle, ListTodo,
  Megaphone, ListChecks, QrCode, Hash, Images, Radio, Crosshair, Star,
  BarChart3, FileBarChart, AtSign, ShieldCheck, Mail, Building2, Crown,
  Settings as SettingsIcon, HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";
import {
  InstagramIcon, FacebookIcon, XIcon, LinkedinIcon, TiktokIcon, YoutubeIcon,
  ThreadsIcon,
} from "@/components/brand-icons";
import { cn } from "@/lib/utils";

/* ============================================================================
   Data — 24 modules, getting started, FAQs, security
   ============================================================================ */

type Module = {
  id: string;
  name: string;
  icon: LucideIcon;
  what: string;
  steps: string[];
  accent: string;
  group: string;
};

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
    a: "Yes. All data is encrypted at rest with AES-256. Passwords are bcrypt-hashed. We enforce JWT auth with short-lived access tokens, support 2FA and biometric login, and every tenant is isolated at the database level." },
  { q: "How do I invite team members?",
    a: "Go to Organization → Users → Invite. Enter their email and pick a role (Admin, Manager, Editor, Member, or Viewer). They receive an invite link and join your workspace with their assigned permissions." },
  { q: "Can I schedule posts?",
    a: "Yes. From the Composer, switch the publish mode from Publish now to Schedule. Pick a date and time, and SYNQUE queues each platform-optimized variant. The Calendar view shows every scheduled post in a monthly grid." },
  { q: "Can I cancel anytime?",
    a: "Yes — Settings → Billing → Cancel. You keep access until the end of your billing period, and your data is retained for 30 days after cancellation in case you change your mind." },
];

const SECURITY = [
  { icon: Lock, title: "Encryption at rest", accent: "oklch(0.55 0.2 255)",
    body: "Every database record, uploaded media file, and credential is encrypted with AES-256. Tokens for connected platforms are stored in a separate vault and rotated automatically." },
  { icon: KeyRound, title: "JWT authentication", accent: "oklch(0.7 0.2 25)",
    body: "Short-lived access tokens (15 min) and rotating refresh tokens. Every API request is signed and validated server-side. Sessions can be revoked instantly from the sessions panel." },
  { icon: Boxes, title: "Tenant isolation", accent: "oklch(0.68 0.2 145)",
    body: "Each workspace is a fully isolated tenant. Cross-tenant data access is blocked at the database layer, not just in the API. Per-tenant encryption keys add another layer of separation." },
  { icon: Shield, title: "Two-factor authentication", accent: "oklch(0.66 0.18 200)",
    body: "Enable 2FA from Settings → Security. We support TOTP apps (1Password, Authy, Google Authenticator). Backup codes are generated on enrollment so you never lose access." },
  { icon: Fingerprint, title: "Biometric login", accent: "oklch(0.78 0.18 145)",
    body: "On supported devices, Face ID or fingerprint unlock replaces your password using WebAuthn passkeys. No biometric data ever leaves your device — only a cryptographic challenge response." },
  { icon: Eye, title: "Session management", accent: "oklch(0.62 0.22 300)",
    body: "See every active session by device and location. Revoke any session with one click. Suspicious logins trigger an email alert and require step-up 2FA verification." },
];

/* ============================================================================
   Helper: scroll-triggered fade/slide wrapper
   ============================================================================ */
function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================================
   Module card with auto-advancing step carousel
   ============================================================================ */
function ModuleCard({ module, index }: { module: Module; index: number }) {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const Icon = module.icon;
  const total = module.steps.length;

  // Auto-advance every 3.2s unless paused
  React.useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActive((p) => (p + 1) % total);
    }, 3200);
    return () => clearInterval(t);
  }, [paused, total]);

  return (
    <Reveal delay={(index % 3) * 0.05}>
      <div
        className="crystal-card glass lift-hover group relative flex h-full flex-col overflow-hidden rounded-3xl p-6"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Accent glow */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.10] blur-3xl transition-opacity duration-500 group-hover:opacity-25"
          style={{ background: module.accent }}
        />

        {/* Header: icon + name + group pill */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
              style={{ background: `linear-gradient(135deg, ${module.accent}, oklch(0.4 0.16 258))` }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-tight">{module.name}</h3>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {module.group}
              </p>
            </div>
          </div>
        </div>

        {/* What it does */}
        <p className="relative mt-4 text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground/80">What it does — </span>
          {module.what}
        </p>

        {/* Animated step carousel */}
        <div className="relative mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <Zap className="h-3 w-3" style={{ color: module.accent }} />
            How to use it
          </div>

          {/* Steps viewport */}
          <div className="relative h-24 overflow-hidden rounded-2xl border border-border/40 bg-muted/20 p-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-start gap-3"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white shadow"
                  style={{ background: module.accent }}
                >
                  {active + 1}
                </span>
                <p className="pt-0.5 text-sm leading-snug text-foreground/90">
                  {module.steps[active]}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Progress dots + bar */}
          <div className="mt-3 flex items-center gap-2">
            {module.steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="group/dot relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60"
                aria-label={`Step ${i + 1}`}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: module.accent,
                    width: i < active ? "100%" : i === active ? (paused ? "100%" : "100%") : "0%",
                    transition: "width 0.3s ease",
                  }}
                />
                {i === active && !paused && (
                  <motion.span
                    key={`progress-${active}`}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: module.accent, transformOrigin: "left" }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 3.2, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ============================================================================
   Cross-posting animated illustration
   ============================================================================ */
const CROSS_PLATFORMS = [
  { id: "instagram", Icon: InstagramIcon, color: "#E1306C", angle: 0 },
  { id: "facebook",  Icon: FacebookIcon,  color: "#1877F2", angle: 51 },
  { id: "x",         Icon: XIcon,         color: "#1DA1F2", angle: 102 },
  { id: "linkedin",  Icon: LinkedinIcon,  color: "#0A66C2", angle: 154 },
  { id: "tiktok",    Icon: TiktokIcon,    color: "#FE2C55", angle: 206 },
  { id: "youtube",   Icon: YoutubeIcon,   color: "#FF0000", angle: 257 },
  { id: "threads",   Icon: ThreadsIcon,   color: "#9B9B9B", angle: 308 },
];

function CrossPostingIllustration() {
  const [pulse, setPulse] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setPulse((p) => (p + 1) % CROSS_PLATFORMS.length), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md">
      {/* Background rings */}
      <div className="absolute inset-0 rounded-full border border-dashed border-border/40" />
      <div className="absolute inset-8 rounded-full border border-border/30" />
      <div className="absolute inset-16 rounded-full border border-border/20" />

      {/* SVG signal lines */}
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

      {/* Central post card */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl text-white shadow-2xl"
        style={{ background: "linear-gradient(135deg, var(--gold), oklch(0.5 0.18 277))" }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-center">
          <Send className="mx-auto h-6 w-6" />
          <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider">One Post</span>
        </div>
      </motion.div>

      {/* Platform nodes */}
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
            <p.Icon className="h-5 w-5" style={{ color: isActive ? p.color : "currentColor", opacity: isActive ? 1 : 0.6 }} />
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
   FAQ accordion item
   ============================================================================ */
function FaqItem({ q, a, i, open, setOpen }: { q: string; a: string; i: number; open: number | null; setOpen: (n: number | null) => void }) {
  const isOpen = open === i;
  return (
    <Reveal delay={i * 0.04}>
      <div className="crystal-in glass overflow-hidden rounded-2xl" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
        <button
          onClick={() => setOpen(isOpen ? null : i)}
          className="flex w-full items-center justify-between gap-3 p-5 text-left"
          aria-expanded={isOpen}
        >
          <span className="text-sm font-semibold">{q}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  );
}

/* ============================================================================
   Section heading
   ============================================================================ */
function SectionHeading({ eyebrow, title, accent }: { eyebrow: string; title: React.ReactNode; accent: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span
        className="crystal-in inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
        style={{ background: `${accent}1a`, color: accent }}
      >
        <Layers className="h-3 w-3" /> {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
    </Reveal>
  );
}

/* ============================================================================
   Page
   ============================================================================ */
export default function HelpPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [search, setSearch] = React.useState("");
  const searchRef = React.useRef<HTMLInputElement>(null);

  // Filtered modules for live search
  const filteredModules = React.useMemo(() => {
    if (!search.trim()) return MODULES;
    const q = search.toLowerCase();
    return MODULES.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.what.toLowerCase().includes(q) ||
        m.steps.some((s) => s.toLowerCase().includes(q)) ||
        m.group.toLowerCase().includes(q),
    );
  }, [search]);

  // Group modules by `group`
  const groupedModules = React.useMemo(() => {
    const groups: Record<string, Module[]> = {};
    for (const m of filteredModules) {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    }
    return groups;
  }, [filteredModules]);

  // ⌘K focus search
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      {/* ============================================================
          HERO
         ============================================================ */}
      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <LifeBuoy className="h-3 w-3" /> Help Center
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Master <span className="gold-text">SYNQUE</span> in minutes
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Onboarding guides, every module explained, cross-posting walkthroughs, security practices, and answers to the questions we hear most.
          </p>
        </div>

        {/* Search bar */}
        <div
          className="crystal-in mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3"
          style={{ animationDelay: "0.25s" }}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules, steps, FAQs…  (⌘ /)"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick jump pills */}
        <div className="crystal-in mt-6 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: "0.3s" }}>
          {[
            { label: "Getting Started", href: "#getting-started", icon: Sparkles },
            { label: "Module Guides", href: "#modules", icon: LayoutDashboard },
            { label: "Cross-posting", href: "#cross-posting", icon: Send },
            { label: "FAQ", href: "#faq", icon: HelpCircle },
            { label: "Security", href: "#security", icon: Shield },
          ].map((p) => (
            <a
              key={p.label}
              href={p.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-[var(--gold)]/40 hover:text-foreground"
            >
              <p.icon className="h-3 w-3" /> {p.label}
            </a>
          ))}
        </div>
      </section>

      {/* ============================================================
          SECTION 1 — GETTING STARTED
         ============================================================ */}
      <section id="getting-started" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:py-16">
        <SectionHeading
          eyebrow="Section 1 · Onboarding"
          title={<>Getting <span className="gold-text">started</span></>}
          accent="oklch(0.62 0.22 300)"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GETTING_STARTED.map((g, i) => {
            const Icon = g.icon;
            return (
              <Reveal key={g.title} delay={i * 0.05}>
                <div className="crystal-card glass lift-hover group relative h-full overflow-hidden rounded-3xl p-6">
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.10] blur-2xl transition-opacity group-hover:opacity-25"
                    style={{ background: g.accent }}
                  />
                  <div className="relative flex items-center gap-3">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-xl text-xs font-bold text-white shadow"
                      style={{ background: g.accent }}
                    >
                      {i + 1}
                    </span>
                    <div
                      className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `linear-gradient(135deg, ${g.accent}, oklch(0.4 0.16 258))` }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="relative mt-4 text-base font-semibold">{g.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{g.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — MODULE GUIDES
         ============================================================ */}
      <section id="modules" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:py-16">
        <SectionHeading
          eyebrow="Section 2 · All 24 modules"
          title={<>Module <span className="gold-text">guides</span></>}
          accent="oklch(0.7 0.2 25)"
        />
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          Every module in SYNQUE, explained with a one-line summary and a step-by-step walkthrough. Hover to pause the auto-advancing carousel.
        </p>

        {/* Module groups */}
        {Object.keys(groupedModules).length === 0 ? (
          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-border/50 p-10 text-center text-sm text-muted-foreground">
            No modules matched <span className="font-semibold text-foreground">"{search}"</span>.
            <button onClick={() => setSearch("")} className="mt-3 block w-full rounded-lg bg-muted/40 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">
              Clear search
            </button>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {Object.entries(groupedModules).map(([group, mods]) => (
              <div key={group}>
                <Reveal>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                      {group}
                    </span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                  </div>
                </Reveal>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {mods.map((m, i) => (
                    <ModuleCard key={m.id} module={m} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================
          SECTION 3 — CROSS-POSTING
         ============================================================ */}
      <section id="cross-posting" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:py-16">
        <SectionHeading
          eyebrow="Section 3 · Key feature"
          title={<>Cross-posting, <span className="gold-text">solved</span></>}
          accent="oklch(0.68 0.2 145)"
        />
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          Write once, publish everywhere. SYNQUE takes a single post and fans it out to all 7 platforms — each with a platform-optimized caption.
        </p>

        <div className="mt-12 grid items-center gap-8 lg:grid-cols-2">
          {/* Left: animated illustration */}
          <Reveal>
            <div className="crystal-card glass relative overflow-hidden rounded-3xl p-8">
              <CrossPostingIllustration />
              <p className="mt-4 text-center text-xs text-muted-foreground">
                One post → 7 platform-optimized variants, published simultaneously.
              </p>
            </div>
          </Reveal>

          {/* Right: 4-step flow */}
          <Reveal delay={0.1}>
            <div className="space-y-4">
              {[
                { icon: Layers, title: "1 · Select multiple accounts", body: "Pick any combination across Instagram, Facebook, X, LinkedIn, TikTok, YouTube, and Threads — up to your plan's account limit.", accent: "oklch(0.55 0.2 255)" },
                { icon: Wand2, title: "2 · AI optimizes per platform", body: "SYNQUE's LLM rewrites your caption for each platform's tone, length, and hashtag norms. You review every variant before publishing.", accent: "oklch(0.7 0.2 25)" },
                { icon: Send, title: "3 · Publish simultaneously", body: "One click queues all variants. SYNQUE publishes each on its optimal schedule and respects per-platform rate limits.", accent: "oklch(0.68 0.2 145)" },
                { icon: BarChart3, title: "4 · Measure per platform", body: "Each variant's impressions, reach, engagement, and clicks are tracked separately — then rolled up into one campaign view.", accent: "oklch(0.66 0.18 200)" },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="crystal-card glass lift-hover flex items-start gap-3 rounded-2xl p-4">
                    <div
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${s.accent}, oklch(0.4 0.16 258))` }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{s.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>

        {/* Plan limits */}
        <Reveal delay={0.15}>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { name: "Starter", limit: "3 accounts", desc: "For solo creators testing the waters.", color: "oklch(0.62 0.22 300)" },
              { name: "Growth", limit: "15 accounts", desc: "For growing teams publishing daily.", color: "oklch(0.68 0.2 145)", featured: true },
              { name: "Enterprise", limit: "Unlimited", desc: "For large teams with custom needs.", color: "oklch(0.7 0.2 25)" },
            ].map((p) => (
              <div
                key={p.name}
                className={cn(
                  "crystal-card glass lift-hover relative overflow-hidden rounded-3xl p-6 text-center",
                  p.featured && "ring-2 ring-[var(--gold)]",
                )}
              >
                {p.featured && (
                  <div className="absolute right-3 top-3 rounded-full bg-[var(--gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--gold-foreground)]">
                    Most popular
                  </div>
                )}
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{p.name}</div>
                <div className="num-display mt-2 text-3xl font-bold" style={{ color: p.color }}>{p.limit}</div>
                <p className="mt-2 text-xs text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ============================================================
          SECTION 4 — FAQ
         ============================================================ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-12 sm:py-16">
        <SectionHeading
          eyebrow="Section 4 · FAQ"
          title={<>Frequently asked <span className="gold-text">questions</span></>}
          accent="oklch(0.66 0.18 200)"
        />
        <div className="mt-8 space-y-3">
          {FAQS.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} i={i} open={openFaq} setOpen={setOpenFaq} />
          ))}
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — SECURITY & PRIVACY
         ============================================================ */}
      <section id="security" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:py-16">
        <SectionHeading
          eyebrow="Section 5 · Trust"
          title={<>Security & <span className="gold-text">privacy</span></>}
          accent="oklch(0.74 0.18 145)"
        />
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          SYNQUE is built for enterprise. Every layer — from your password to your data on disk — is hardened and auditable.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECURITY.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={(i % 3) * 0.05}>
                <div className="crystal-card glass lift-hover group relative h-full overflow-hidden rounded-3xl p-6">
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.10] blur-2xl transition-opacity group-hover:opacity-25"
                    style={{ background: s.accent }}
                  />
                  <div
                    className="relative grid h-11 w-11 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${s.accent}, oklch(0.4 0.16 258))` }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="relative mt-4 text-base font-semibold">{s.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* 2FA setup mini-guide */}
        <Reveal delay={0.1}>
          <div className="mt-8 crystal-card glass-strong overflow-hidden rounded-3xl">
            <div className="grid gap-6 p-6 sm:grid-cols-[1.2fr_1fr] sm:p-8">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
                  <Shield className="h-3 w-3" /> 2FA quick setup
                </div>
                <h3 className="mt-4 text-xl font-bold">Harden your account in 4 steps</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Two-factor authentication takes 2 minutes and reduces account-takeover risk by 99.9%. Pair it with biometric login for true passwordless sign-in.
                </p>
                <ol className="mt-5 space-y-2.5">
                  {[
                    "Open Settings → Security from the sidebar.",
                    "Click Enable 2FA and scan the QR code with your TOTP app.",
                    "Enter the 6-digit code to verify enrollment.",
                    "Save your backup codes somewhere safe — done!",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-500/15 text-[10px] font-bold text-emerald-500">
                        {i + 1}
                      </span>
                      <span className="text-foreground/80">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative grid h-44 w-44 place-items-center rounded-3xl bg-muted/30">
                  <motion.div
                    className="absolute inset-0 rounded-3xl border-2 border-dashed border-emerald-500/40"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="text-center">
                    <Fingerprint className="mx-auto h-10 w-10 text-emerald-500" />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Face ID · Fingerprint
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">WebAuthn passkeys</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============================================================
          CTA
         ============================================================ */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Reveal>
          <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
            <h2 className="text-3xl font-bold tracking-tight">Still have <span className="gold-text">questions?</span></h2>
            <p className="mt-3 text-muted-foreground">Start your 15-day trial and explore everything risk-free. Our team personally walks you through the first publish.</p>
            <div className="mt-6 mx-auto w-fit">
              <TrialCTA className="liquid-gold glow-ring" />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <Link href="/docs" className="inline-flex items-center gap-1.5 transition hover:text-foreground">
                <FileBarChart className="h-3.5 w-3.5" /> Browse docs
                <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="text-border">·</span>
              <Link href="/contact" className="inline-flex items-center gap-1.5 transition hover:text-foreground">
                <Mail className="h-3.5 w-3.5" /> Contact support
              </Link>
              <span className="text-border">·</span>
              <Link href="/status" className="inline-flex items-center gap-1.5 transition hover:text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" /> System status
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <LandingFooter />
    </div>
  );
}
