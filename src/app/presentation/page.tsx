"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Shield,
  Sparkles,
  Calendar,
  Inbox,
  Users,
  BarChart3,
  Eye,
  Lock,
  Zap,
  Globe,
  Check,
  X,
  Maximize,
  Minimize,
  Play,
  Pause,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Database,
  Server,
  Layers,
  Activity,
  Hash,
  Clock,
  AlertTriangle,
  KeyRound,
  Fingerprint,
  FileCheck,
  ScrollText,
  Crown,
  Pencil,
  ChevronRight,
  Rocket,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Snowflake,
  CircleDot,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ============================================================================
   Design tokens — dark glass + gold
   ============================================================================ */
const C = {
  bg: "#0A0B0F",
  surface: "rgba(255,255,255,0.04)",
  surfaceStrong: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.10)",
  borderGold: "rgba(212,175,55,0.30)",
  text: "#F5F5F7",
  textMuted: "#9999A0",
  textDim: "#6E6E73",
  gold: "oklch(0.78 0.16 80)",
  goldSoft: "rgba(212,175,55,0.18)",
  emerald: "#34D399",
  rose: "#F43F5E",
  blue: "#60A5FA",
} as const;

/* ============================================================================
   Helpers
   ============================================================================ */
const TOTAL_SLIDES = 15;

const stagger = (i: number, base = 0.08) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: base * i + 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80, scale: 0.98 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -80 : 80, scale: 0.98 }),
};

function GlassCard({
  className,
  gold = false,
  children,
  style,
}: {
  className?: string;
  gold?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl backdrop-blur-xl",
        gold ? "ring-1 ring-[var(--gold)]/40" : "ring-1 ring-white/10",
        className,
      )}
      style={{
        background: gold ? C.surfaceStrong : C.surface,
        boxShadow: gold
          ? "0 8px 40px -12px rgba(212,175,55,0.25), inset 0 1px 0 rgba(255,255,255,0.06)"
          : "0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function GoldText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={className}
      style={{
        background: "linear-gradient(135deg, oklch(0.85 0.16 80) 0%, oklch(0.72 0.18 70) 60%, oklch(0.65 0.20 60) 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================================
   Animated background — floating particles + mesh gradient
   ============================================================================ */
function PresentationBg() {
  const prefersReduced = useReducedMotion();
  const particles = React.useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        x: (i * 53) % 100,
        y: (i * 37) % 100,
        size: 1 + (i % 3),
        delay: (i % 6) * 0.7,
        dur: 8 + (i % 5) * 2,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ background: C.bg, zIndex: -2 }}>
      {/* Mesh gradient blobs */}
      <motion.div
        className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(212,175,55,0.10), transparent 60%)" }}
        animate={prefersReduced ? undefined : { x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent 60%)" }}
        animate={prefersReduced ? undefined : { x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.06), transparent 60%)" }}
        animate={prefersReduced ? undefined : { scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Floating particles */}
      {!prefersReduced &&
        particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size * 2,
              height: p.size * 2,
              background: "rgba(212,175,55,0.5)",
              boxShadow: "0 0 8px rgba(212,175,55,0.6)",
            }}
            animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

/* ============================================================================
   Slide shell — wraps each slide with consistent layout
   ============================================================================ */
function SlideShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center px-6 py-12 sm:px-12 md:px-16", className)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}

function SlideKicker({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
      style={{ borderColor: C.borderGold, background: C.goldSoft, color: C.gold }}
    >
      <CircleDot className="h-3 w-3" />
      {children}
    </motion.div>
  );
}

function SlideTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className={cn("text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl", className)}
      style={{ color: C.text }}
    >
      {children}
    </motion.h2>
  );
}

function SlideSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12 }}
      className="mt-3 max-w-2xl text-base sm:text-lg"
      style={{ color: C.textMuted }}
    >
      {children}
    </motion.p>
  );
}

/* ============================================================================
   SLIDE 1 — Title
   ============================================================================ */
function Slide1() {
  return (
    <SlideShell className="text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotateX: 60 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 inline-flex items-center justify-center"
      >
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, oklch(0.78 0.16 80), oklch(0.65 0.20 60))",
            boxShadow: "0 0 60px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <Sparkles className="h-8 w-8 text-black" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 30, letterSpacing: "0.2em" }}
        animate={{ opacity: 1, y: 0, letterSpacing: "-0.02em" }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="text-6xl font-black tracking-tight sm:text-7xl md:text-8xl"
        style={{ color: C.text }}
      >
        <GoldText>SYNQUE</GoldText>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
        className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl"
        style={{ color: C.text }}
      >
        Orchestrate Your Social
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.75 }}
        className="mx-auto mt-3 max-w-xl text-sm sm:text-base"
        style={{ color: C.textMuted }}
      >
        The Enterprise Command Center for Modern Social Teams
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="mt-10 flex items-center justify-center gap-3"
      >
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs" style={{ borderColor: C.border, background: C.surface }}>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">←</kbd>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">→</kbd>
          <span style={{ color: C.textMuted }}>to navigate</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs" style={{ borderColor: C.border, background: C.surface }}>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">F</kbd>
          <span style={{ color: C.textMuted }}>fullscreen</span>
        </div>
      </motion.div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 2 — Problem
   ============================================================================ */
const PAIN_POINTS = [
  { icon: Layers, title: "Scattered platforms", desc: "7 platforms. 7 logins. 7 dashboards. Context-switching kills 12+ hours per week.", stat: "7", statLabel: "platforms" },
  { icon: ShieldAlert, title: "No safety net", desc: "Accounts get suspended without warning. Banned hashtags. Risky posts. No safety net.", stat: "23%", statLabel: "suspension rate" },
  { icon: Eye, title: "No insights", desc: "You can't see what competitors are posting. Blind to what's working in your market.", stat: "0", statLabel: "visibility" },
];

function ShieldAlert(props: React.SVGProps<SVGSVGElement>) {
  return <AlertTriangle {...props} />;
}

function Slide2() {
  return (
    <SlideShell>
      <SlideKicker>The Problem</SlideKicker>
      <SlideTitle>
        Social media is <GoldText>broken</GoldText>
      </SlideTitle>
      <SlideSubtitle>Teams are drowning in tabs, alerts, and disconnected tools. The cost? Hours lost, accounts suspended, opportunities missed.</SlideSubtitle>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {PAIN_POINTS.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div key={p.title} {...stagger(i, 0.15)}>
              <GlassCard className="h-full p-6">
                <div
                  className="mb-4 grid h-12 w-12 place-items-center rounded-xl"
                  style={{ background: "rgba(244,63,94,0.12)", color: C.rose, boxShadow: "inset 0 0 0 1px rgba(244,63,94,0.25)" }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-4xl font-black" style={{ color: C.text }}>
                  {p.stat}
                </div>
                <div className="text-xs uppercase tracking-wider" style={{ color: C.textDim }}>
                  {p.statLabel}
                </div>
                <h3 className="mt-4 text-lg font-semibold" style={{ color: C.text }}>
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: C.textMuted }}>
                  {p.desc}
                </p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 3 — Solution
   ============================================================================ */
const SOLUTIONS = [
  { icon: Globe, title: "Unified publishing", desc: "One compose flow publishes to all 7 platforms simultaneously. Write once, ship everywhere." },
  { icon: Sparkles, title: "AI captions per platform", desc: "AI rewrites your message natively for each platform — emoji-heavy on IG, professional on LinkedIn." },
  { icon: ShieldCheck, title: "Anti-suspension built-in", desc: "Cadence monitoring, banned hashtag blocking, and smart cooldowns keep your accounts safe." },
];

function Slide3() {
  return (
    <SlideShell>
      <SlideKicker>The Solution</SlideKicker>
      <SlideTitle>
        One flow. Every platform. <GoldText>Zero chaos.</GoldText>
      </SlideTitle>
      <SlideSubtitle>SYNQUE replaces your patchwork of tools with one command center — built for speed, safety, and scale.</SlideSubtitle>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {SOLUTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.title} {...stagger(i, 0.15)}>
              <GlassCard gold={i === 1} className="h-full p-6">
                <motion.div
                  className="mb-4 grid h-12 w-12 place-items-center rounded-xl"
                  style={{
                    background: i === 1 ? "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))" : "rgba(212,175,55,0.12)",
                    color: C.gold,
                    boxShadow: i === 1 ? "0 0 30px rgba(212,175,55,0.4)" : "inset 0 0 0 1px rgba(212,175,55,0.2)",
                  }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Icon className="h-6 w-6" />
                </motion.div>
                <h3 className="text-lg font-semibold" style={{ color: C.text }}>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: C.textMuted }}>
                  {s.desc}
                </p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-10 flex items-center justify-center gap-3 text-sm"
        style={{ color: C.textMuted }}
      >
        <ArrowRight className="h-4 w-4" style={{ color: C.gold }} />
        <span>
          Built for teams that ship daily — without the <span style={{ color: C.rose }}>suspension roulette</span>.
        </span>
      </motion.div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 4 — Feature grid (8 cards)
   ============================================================================ */
const FEATURES = [
  { icon: Sparkles, title: "AI Composer", desc: "Platform-native captions in one click." },
  { icon: Globe, title: "Multi-platform publishing", desc: "Post to 7 platforms simultaneously." },
  { icon: Inbox, title: "Unified inbox", desc: "Comments & DMs in one stream." },
  { icon: Calendar, title: "Content calendar", desc: "Visual planning with drag & drop." },
  { icon: ShieldCheck, title: "Account safety", desc: "Anti-suspension protection built-in." },
  { icon: Users, title: "Team workflows", desc: "Roles, approvals, and activity tracking." },
  { icon: BarChart3, title: "Analytics", desc: "Deep performance & engagement metrics." },
  { icon: Eye, title: "Competitor tracking", desc: "See what's working in your market." },
];

function Slide4() {
  return (
    <SlideShell>
      <SlideKicker>Feature Tour</SlideKicker>
      <SlideTitle>
        Everything you need. <GoldText>Nothing you don't.</GoldText>
      </SlideTitle>
      <SlideSubtitle>Eight core modules, one unified workspace — each engineered for the speed of modern social teams.</SlideSubtitle>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div key={f.title} {...stagger(i, 0.06)} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300 }}>
              <GlassCard className="group h-full p-5">
                <div
                  className="mb-3 grid h-10 w-10 place-items-center rounded-lg transition-all duration-300 group-hover:scale-110"
                  style={{ background: C.goldSoft, color: C.gold }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                  {f.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: C.textMuted }}>
                  {f.desc}
                </p>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 5 — Supported platforms
   ============================================================================ */
const PLATFORMS = [
  { name: "Instagram", limit: "2,200", color: "#E1306C", icon: Instagram },
  { name: "Facebook", limit: "63,206", color: "#1877F2", icon: Facebook },
  { name: "X (Twitter)", limit: "280", color: "#1DA1F2", icon: Twitter },
  { name: "LinkedIn", limit: "3,000", color: "#0A66C2", icon: Linkedin },
  { name: "TikTok", limit: "2,200", color: "#FE2C55", icon: Hash },
  { name: "YouTube", limit: "5,000", color: "#FF0000", icon: Youtube },
  { name: "Threads", limit: "500", color: "#FFFFFF", icon: Hash },
];

function Slide5() {
  return (
    <SlideShell>
      <SlideKicker>Supported Platforms</SlideKicker>
      <SlideTitle>
        Seven platforms. <GoldText>One click.</GoldText>
      </SlideTitle>
      <SlideSubtitle>Post to all 7 major social platforms from a single compose window — with AI-tuned captions and character limits respected automatically.</SlideSubtitle>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {PLATFORMS.map((p, i) => {
          const Icon = p.icon;
          return (
            <motion.div key={p.name} {...stagger(i, 0.08)} whileHover={{ y: -4 }}>
              <GlassCard className="flex items-center gap-3 p-4">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                  style={{ background: `${p.color}22`, color: p.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: C.text }}>
                    {p.name}
                  </div>
                  <div className="text-[11px]" style={{ color: C.textMuted }}>
                    Limit: {p.limit} chars
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
        <motion.div {...stagger(7, 0.08)} whileHover={{ y: -4 }}>
          <GlassCard gold className="flex h-full min-h-[88px] flex-col items-center justify-center gap-1 p-4 text-center">
            <Zap className="h-5 w-5" style={{ color: C.gold }} />
            <div className="text-sm font-bold" style={{ color: C.text }}>
              Post to all 7
            </div>
            <div className="text-[11px]" style={{ color: C.textMuted }}>
              in one click
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 6 — Cross-posting killer feature
   ============================================================================ */
function Slide6() {
  const platforms = ["Instagram", "LinkedIn", "X", "TikTok", "Facebook", "YouTube", "Threads"];
  const tones = ["emoji-rich", "professional", "punchy", "trendy", "community", "descriptive", "conversational"];
  return (
    <SlideShell>
      <SlideKicker>The Killer Feature</SlideKicker>
      <SlideTitle>
        Write once. AI generates <GoldText>7 variants.</GoldText>
      </SlideTitle>
      <SlideSubtitle>One post becomes seven platform-native captions — each with the right tone, hashtags, and length. Then publish to all with a single click.</SlideSubtitle>

      <div className="mt-10 grid gap-6 md:grid-cols-[1fr_2fr] md:items-center">
        {/* Source post */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <GlassCard gold className="p-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.gold }}>
              Your Draft
            </div>
            <p className="text-sm leading-relaxed" style={{ color: C.text }}>
              "Launching our new sustainable line tomorrow. Every piece made from recycled materials."
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: C.textMuted }}>
              <Sparkles className="h-3.5 w-3.5" style={{ color: C.gold }} />
              AI rewrites this 7 ways
            </div>
          </GlassCard>
        </motion.div>

        {/* Arrow + variants */}
        <div className="space-y-2">
          {platforms.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
              className="flex items-center gap-3"
            >
              <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: C.gold }} />
              <div className="flex w-28 shrink-0 items-center gap-1.5 text-xs font-semibold" style={{ color: C.text }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.gold }} />
                {p}
              </div>
              <div className="flex-1 truncate text-xs" style={{ color: C.textMuted }}>
                <span className="rounded px-1.5 py-0.5" style={{ background: C.goldSoft, color: C.gold }}>
                  {tones[i]}
                </span>{" "}
                · adapted tone, hashtags & length
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-8 flex justify-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold" style={{ background: "linear-gradient(135deg, oklch(0.78 0.16 80), oklch(0.65 0.20 60))", color: "#000" }}>
          <Rocket className="h-4 w-4" />
          Publish to all 7 in one click
        </div>
      </motion.div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 7 — Plan limits table
   ============================================================================ */
const PLAN_ROWS: { label: string; starter: string | boolean; growth: string | boolean; enterprise: string | boolean }[] = [
  { label: "Social Accounts", starter: "3", growth: "15", enterprise: "Unlimited" },
  { label: "Users", starter: "1", growth: "5", enterprise: "Unlimited" },
  { label: "AI Composer", starter: "100/mo", growth: "Unlimited", enterprise: "Unlimited" },
  { label: "Analytics", starter: "Basic", growth: "Advanced", enterprise: "Custom" },
  { label: "Account Protection", starter: true, growth: true, enterprise: true },
  { label: "Priority Support", starter: false, growth: true, enterprise: true },
  { label: "SSO + SAML", starter: false, growth: false, enterprise: true },
  { label: "Custom Mail Server", starter: false, growth: false, enterprise: true },
  { label: "Dedicated Manager", starter: false, growth: false, enterprise: true },
  { label: "SLA", starter: false, growth: false, enterprise: "99.9%" },
];

const PLAN_HEADERS = [
  { name: "Starter", price: "$299/mo", featured: false },
  { name: "Growth", price: "$499/mo", featured: true },
  { name: "Enterprise", price: "Custom", featured: false },
];

function CellValue({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="h-4 w-4" style={{ color: C.emerald }} strokeWidth={3} />;
  if (v === false) return <X className="h-4 w-4" style={{ color: C.textDim }} />;
  return <span className="text-sm font-medium" style={{ color: C.text }}>{v}</span>;
}

function Slide7() {
  return (
    <SlideShell>
      <SlideKicker>Account & Plan Limits</SlideKicker>
      <SlideTitle>
        Plans that scale <GoldText>with you</GoldText>
      </SlideTitle>
      <SlideSubtitle>From solo creators to enterprise teams. Every plan includes the AI composer and account protection.</SlideSubtitle>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 overflow-hidden rounded-2xl ring-1 ring-white/10"
        style={{ background: C.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr style={{ background: C.surfaceStrong }}>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>
                  Feature
                </th>
                {PLAN_HEADERS.map((h) => (
                  <th key={h.name} className="px-5 py-4 text-center" style={{ color: C.text }}>
                    <div className={cn("text-sm font-bold", h.featured && "gold-text")}>{h.name}</div>
                    <div className="mt-0.5 text-[11px] font-normal" style={{ color: C.textMuted }}>
                      {h.price}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_ROWS.map((row, i) => (
                <motion.tr
                  key={row.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                  className="border-t"
                  style={{ borderColor: C.border }}
                >
                  <td className="px-5 py-3 text-sm" style={{ color: C.text }}>
                    {row.label}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <CellValue v={row.starter} />
                  </td>
                  <td className="px-5 py-3 text-center" style={{ background: "rgba(212,175,55,0.05)" }}>
                    <CellValue v={row.growth} />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <CellValue v={row.enterprise} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 8 — Multi-workspace architecture
   ============================================================================ */
function Slide8() {
  return (
    <SlideShell>
      <SlideKicker>Multi-Workspace Architecture</SlideKicker>
      <SlideTitle>
        Every client gets an <GoldText>isolated database</GoldText>
      </SlideTitle>
      <SlideSubtitle>Your data never mixes with anyone else's. Each tenant runs on a dedicated Neon PostgreSQL database — fully isolated, fully yours.</SlideSubtitle>

      <div className="mt-10 flex flex-col items-center gap-6">
        {/* Main DB */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard gold className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.1))", color: C.gold }}>
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: C.text }}>
                Main Database
              </div>
              <div className="text-xs" style={{ color: C.textMuted }}>
                Customer registry · Auth · Audit logs
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Connector lines */}
        <svg width="100%" height="40" viewBox="0 0 400 40" className="max-w-md" preserveAspectRatio="none">
          <motion.path
            d="M200 0 L200 12 M60 12 L340 12 M60 12 L60 30 M200 12 L200 30 M340 12 L340 30"
            stroke="rgba(212,175,55,0.4)"
            strokeWidth="1.5"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </svg>

        {/* Tenant DBs */}
        <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {["Tenant A", "Tenant B", "Tenant C"].map((t, i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 + i * 0.15 }}>
              <GlassCard className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Server className="h-4 w-4" style={{ color: C.emerald }} />
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>
                    {t}
                  </div>
                </div>
                <div className="text-sm font-bold" style={{ color: C.text }}>
                  Neon PostgreSQL
                </div>
                <div className="mt-1 text-[11px]" style={{ color: C.textMuted }}>
                  Isolated · Encrypted · Dedicated
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[10px]" style={{ color: C.emerald }}>
                  <Lock className="h-3 w-3" />
                  Data-isolated
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-center text-sm"
          style={{ color: C.textMuted }}
        >
          <Lock className="mr-1 inline h-3.5 w-3.5" style={{ color: C.gold }} />
          Every client gets an isolated database — your data never mixes with anyone else's.
        </motion.p>
      </div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 9 — AI Composer
   ============================================================================ */
const AI_SAMPLES = [
  { platform: "Instagram", tone: "emoji-rich, hashtag-heavy", text: "Sustainable living just got a glow-up ♻️✨ Our new line drops tomorrow — every piece crafted from 100% recycled materials. 🌍💚 #sustainability #ecofashion #newdrop" },
  { platform: "LinkedIn", tone: "professional, long-form", text: "We're proud to announce our new sustainable product line, launching tomorrow. Every item is manufactured using 100% recycled materials — a meaningful step toward responsible production at scale." },
  { platform: "X (Twitter)", tone: "concise, punchy", text: "Recycled. Responsible. Ready. Our new sustainable line drops tomorrow. ♻️" },
];

function Slide9() {
  return (
    <SlideShell>
      <SlideKicker>AI Composer</SlideKicker>
      <SlideTitle>
        One brief. <GoldText>Native everywhere.</GoldText>
      </SlideTitle>
      <SlideSubtitle>The AI studies each platform's conventions and rewrites your message to fit — tone, length, hashtags, and emoji included.</SlideSubtitle>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {AI_SAMPLES.map((s, i) => (
          <motion.div key={s.platform} {...stagger(i, 0.15)} whileHover={{ y: -4 }}>
            <GlassCard className="flex h-full flex-col p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: C.text }}>
                  {s.platform}
                </span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: C.goldSoft, color: C.gold }}>
                  {s.tone}
                </span>
              </div>
              <TypewriterText text={s.text} delay={i * 0.6 + 0.5} />
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
}

function TypewriterText({ text, delay }: { text: string; delay: number }) {
  const [shown, setShown] = React.useState("");
  React.useEffect(() => {
    let i = 0;
    let raf: number;
    let timer: ReturnType<typeof setTimeout>;
    timer = setTimeout(() => {
      const tick = () => {
        i += 2;
        setShown(text.slice(0, i));
        if (i < text.length) raf = requestAnimationFrame(tick);
      };
      tick();
    }, delay * 1000);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, delay]);
  return (
    <p className="min-h-[120px] text-xs leading-relaxed" style={{ color: C.textMuted }}>
      {shown}
      <span className="ml-0.5 inline-block h-3 w-1 animate-pulse" style={{ background: C.gold }} />
    </p>
  );
}

/* ============================================================================
   SLIDE 10 — Account Safety
   ============================================================================ */
const SAFETY = [
  { icon: Clock, title: "Posting cadence monitoring", desc: "We learn each platform's safe posting rhythm and prevent you from exceeding it." },
  { icon: Hash, title: "Banned hashtag blocking", desc: "Real-time list of platform-banned hashtags, automatically stripped before publish." },
  { icon: Snowflake, title: "Smart cooldowns", desc: "Adaptive delays between posts per account, mimicking human behavior." },
  { icon: AlertTriangle, title: "Risky content flags", desc: "AI scans drafts for content that historically triggers suspensions." },
];

function Slide10() {
  return (
    <SlideShell>
      <SlideKicker>Account Safety</SlideKicker>
      <SlideTitle>
        Anti-suspension <GoldText>protection</GoldText>
      </SlideTitle>
      <SlideSubtitle>Accounts get suspended without warning. SYNQUE's safety layer prevents that — automatically, before you hit publish.</SlideSubtitle>

      <div className="mt-10 grid items-center gap-8 md:grid-cols-[1fr_2fr]">
        {/* Shield visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center"
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: "radial-gradient(circle, rgba(52,211,153,0.4), transparent 70%)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="relative grid h-40 w-40 place-items-center rounded-3xl"
              style={{
                background: "linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.05))",
                boxShadow: "0 0 60px rgba(52,211,153,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                border: "1px solid rgba(52,211,153,0.3)",
              }}
            >
              <Shield className="h-20 w-20" style={{ color: C.emerald }} strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        {/* Safety cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {SAFETY.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.title} {...stagger(i, 0.1)}>
                <GlassCard className="h-full p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "rgba(52,211,153,0.15)", color: C.emerald }}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: C.text }}>
                      {s.title}
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: C.textMuted }}>
                    {s.desc}
                  </p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 11 — Security & Compliance
   ============================================================================ */
const SECURITY = [
  { icon: Lock, label: "AES-256 encryption at rest" },
  { icon: KeyRound, label: "bcrypt password hashing (cost 12)" },
  { icon: ShieldCheck, label: "JWT + httpOnly cookies" },
  { icon: Fingerprint, label: "2FA / WebAuthn / Biometric auth" },
  { icon: Activity, label: "Rate limiting (auth + AI + writes)" },
  { icon: ScrollText, label: "Audit logging" },
  { icon: FileCheck, label: "CSP + security headers" },
  { icon: Layers, label: "Tenant data isolation" },
];

function Slide11() {
  return (
    <SlideShell>
      <SlideKicker>Security & Compliance</SlideKicker>
      <SlideTitle>
        Security that <GoldText>enterprises trust</GoldText>
      </SlideTitle>
      <SlideSubtitle>Built to enterprise standards from day one. SOC2-ready, audit-grade logging, and defense-in-depth at every layer.</SlideSubtitle>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SECURITY.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} {...stagger(i, 0.07)} whileHover={{ y: -4 }}>
              <GlassCard className="flex h-full items-center gap-3 p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: C.goldSoft, color: C.gold }}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium leading-snug" style={{ color: C.text }}>
                  {s.label}
                </span>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-8 flex justify-center"
      >
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs" style={{ borderColor: C.borderGold, background: C.goldSoft, color: C.gold }}>
          <ShieldCheck className="h-3.5 w-3.5" />
          SOC2-ready · GDPR-compliant · Audit-grade
        </div>
      </motion.div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 12 — Team collaboration
   ============================================================================ */
const ROLES = [
  { icon: Crown, name: "Owner", color: C.gold, desc: "Full access" },
  { icon: Shield, name: "Manager", color: C.blue, desc: "Manage team" },
  { icon: Pencil, name: "Editor", color: C.emerald, desc: "Create & edit" },
  { icon: Users, name: "Member", color: C.text, desc: "Publish approved" },
  { icon: Eye, name: "Viewer", color: C.textMuted, desc: "Read-only" },
];

function Slide12() {
  return (
    <SlideShell>
      <SlideKicker>Team Collaboration</SlideKicker>
      <SlideTitle>
        Roles, approvals, <GoldText>visibility</GoldText>
      </SlideTitle>
      <SlideSubtitle>Built for teams that need oversight without bottlenecks. Approvals, audit trails, and role-based access — out of the box.</SlideSubtitle>

      <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-center">
        {/* Roles */}
        <div className="space-y-2">
          {ROLES.map((r, i) => {
            const Icon = r.icon;
            return (
              <motion.div key={r.name} {...stagger(i, 0.1)}>
                <GlassCard className="flex items-center gap-3 p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${r.color}22`, color: r.color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: C.text }}>
                      {r.name}
                    </div>
                    <div className="text-[11px]" style={{ color: C.textMuted }}>
                      {r.desc}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: C.textDim }} />
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* Approval flow diagram */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard gold className="p-6">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: C.gold }}>
              Approval Workflow
            </div>
            <div className="space-y-3">
              {[
                { step: "Draft", actor: "Editor", color: C.emerald },
                { step: "Review", actor: "Manager", color: C.blue },
                { step: "Approve", actor: "Owner", color: C.gold },
                { step: "Publish", actor: "Auto", color: C.text },
              ].map((s, i) => (
                <motion.div
                  key={s.step}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.15 }}
                  className="flex items-center gap-3"
                >
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold" style={{ background: `${s.color}22`, color: s.color }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold" style={{ color: C.text }}>
                      {s.step}
                    </div>
                    <div className="text-[11px]" style={{ color: C.textMuted }}>
                      by {s.actor}
                    </div>
                  </div>
                  {i < 3 && <ArrowRight className="h-3.5 w-3.5" style={{ color: C.textDim }} />}
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 border-t pt-3 text-[11px]" style={{ borderColor: C.border, color: C.textMuted }}>
              <Activity className="h-3 w-3" style={{ color: C.gold }} />
              Every action tracked in audit log
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 13 — Analytics with Recharts
   ============================================================================ */
const REVENUE_DATA = [
  { m: "Jan", v: 28 },
  { m: "Feb", v: 36 },
  { m: "Mar", v: 42 },
  { m: "Apr", v: 55 },
  { m: "May", v: 68 },
  { m: "Jun", v: 84 },
  { m: "Jul", v: 102 },
  { m: "Aug", v: 118 },
];

const PLATFORM_DIST = [
  { name: "Instagram", value: 38, color: "#E1306C" },
  { name: "LinkedIn", value: 24, color: "#0A66C2" },
  { name: "X", value: 18, color: "#1DA1F2" },
  { name: "TikTok", value: 12, color: "#FE2C55" },
  { name: "Others", value: 8, color: "#6E6E73" },
];

const ENGAGEMENT_DATA = [
  { p: "IG", likes: 4200, comments: 880 },
  { p: "FB", likes: 1800, comments: 320 },
  { p: "X", likes: 2900, comments: 540 },
  { p: "LI", likes: 1500, comments: 410 },
  { p: "TT", likes: 3800, comments: 720 },
];

function Slide13() {
  return (
    <SlideShell>
      <SlideKicker>Analytics & Reports</SlideKicker>
      <SlideTitle>
        Insights that <GoldText>drive decisions</GoldText>
      </SlideTitle>
      <SlideSubtitle>Real-time dashboards across every platform — revenue trends, audience distribution, and engagement deep-dives, all in one view.</SlideSubtitle>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {/* Revenue area */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="md:col-span-2">
          <GlassCard className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: C.gold }} />
                <span className="text-sm font-semibold" style={{ color: C.text }}>
                  Revenue Trend
                </span>
              </div>
              <span className="text-xs" style={{ color: C.emerald }}>
                +321% YoY
              </span>
            </div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.gold} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="m" tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#111318", border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text }}
                  />
                  <Area type="monotone" dataKey="v" stroke={C.gold} strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Platform distribution pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <GlassCard className="h-full p-5">
            <div className="mb-3 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" style={{ color: C.gold }} />
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                Platform Mix
              </span>
            </div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PLATFORM_DIST} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} stroke="none">
                    {PLATFORM_DIST.map((e) => (
                      <Cell key={e.name} fill={e.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111318", border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Engagement bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="md:col-span-3">
          <GlassCard className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <BarChartIcon className="h-4 w-4" style={{ color: C.gold }} />
              <span className="text-sm font-semibold" style={{ color: C.text }}>
                Engagement by Platform
              </span>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ENGAGEMENT_DATA} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="p" tick={{ fill: C.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#111318", border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 12, color: C.text }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="likes" fill={C.gold} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="comments" fill={C.emerald} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 14 — Pricing
   ============================================================================ */
const PRICING = [
  { name: "Starter", price: "$299", period: "/mo", desc: "For solo creators & small teams getting started.", features: ["3 social accounts", "1 user", "AI composer (100/mo)", "Basic analytics", "Email support"], featured: false },
  { name: "Growth", price: "$499", period: "/mo", desc: "For growing teams that publish daily.", features: ["15 social accounts", "5 users", "Unlimited AI composer", "Advanced analytics", "Account protection", "Priority support"], featured: true },
  { name: "Enterprise", price: "Custom", period: "", desc: "For large teams with custom needs.", features: ["Unlimited accounts", "Unlimited users", "Custom domain mail server", "SSO + SAML", "Dedicated success manager", "99.9% SLA"], featured: false },
];

function Slide14() {
  return (
    <SlideShell>
      <SlideKicker>Pricing</SlideKicker>
      <SlideTitle>
        Start with a <GoldText>15-day free trial</GoldText>
      </SlideTitle>
      <SlideSubtitle>No card to explore. Pick a plan when you're ready. Cancel anytime. All plans include the AI composer, account protection, and real-time analytics.</SlideSubtitle>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {PRICING.map((p, i) => (
          <motion.div key={p.name} {...stagger(i, 0.15)} whileHover={{ y: -6 }}>
            <GlassCard gold={p.featured} className="relative h-full p-6">
              {p.featured && (
                <div className="absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: C.gold, color: "#000" }}>
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-bold" style={{ color: C.text }}>
                {p.name}
              </h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-black" style={{ color: C.text }}>
                  {p.price}
                </span>
                {p.period && (
                  <span className="text-sm" style={{ color: C.textMuted }}>
                    {p.period}
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs" style={{ color: C.textMuted }}>
                {p.desc}
              </p>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: C.text }}>
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full" style={{ background: "rgba(52,211,153,0.15)", color: C.emerald }}>
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={cn(
                  "mt-6 w-full justify-center rounded-xl py-2.5 text-sm font-semibold transition",
                  p.featured ? "text-black hover:brightness-110" : "border border-white/10 hover:bg-white/5",
                )}
                style={
                  p.featured
                    ? { background: "linear-gradient(135deg, oklch(0.78 0.16 80), oklch(0.65 0.20 60))" }
                    : { color: C.text }
                }
              >
                Start 15-day trial
              </button>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </SlideShell>
  );
}

/* ============================================================================
   SLIDE 15 — CTA
   ============================================================================ */
function Slide15() {
  return (
    <SlideShell className="text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]"
        style={{ borderColor: C.borderGold, background: C.goldSoft, color: C.gold }}
      >
        <Rocket className="h-3.5 w-3.5" />
        Get started
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="mx-auto max-w-3xl text-4xl font-black tracking-tight sm:text-6xl"
        style={{ color: C.text }}
      >
        Start Your <GoldText>Free Trial</GoldText>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mx-auto mt-5 max-w-xl text-base sm:text-lg"
        style={{ color: C.textMuted }}
      >
        Full access for 15 days. No card to explore. Cancel anytime.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
        className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
      >
        <Link
          href="/"
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-8 py-4 text-base font-bold text-black transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, oklch(0.85 0.16 80) 0%, oklch(0.72 0.18 70) 60%, oklch(0.65 0.20 60) 100%)",
            boxShadow: "0 0 60px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full" style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)" }} />
          <Rocket className="relative h-5 w-5" />
          <span className="relative">Start 15-day trial</span>
          <ArrowRight className="relative h-5 w-5" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border px-8 py-4 text-base font-semibold transition hover:bg-white/5"
          style={{ borderColor: C.border, color: C.text }}
        >
          See pricing
          <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs"
        style={{ color: C.textMuted }}
      >
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" style={{ color: C.emerald }} /> No credit card required
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" style={{ color: C.emerald }} /> Cancel anytime
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" style={{ color: C.emerald }} /> 7 platforms included
        </span>
      </motion.div>
    </SlideShell>
  );
}

/* ============================================================================
   Slides registry
   ============================================================================ */
const SLIDES: React.FC[] = [
  Slide1,
  Slide2,
  Slide3,
  Slide4,
  Slide5,
  Slide6,
  Slide7,
  Slide8,
  Slide9,
  Slide10,
  Slide11,
  Slide12,
  Slide13,
  Slide14,
  Slide15,
];

/* ============================================================================
   Main page — navigation, controls, layout
   ============================================================================ */
export default function PresentationPage() {
  const [index, setIndex] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [autoPlay, setAutoPlay] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const go = React.useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_SLIDES - 1, next));
      setDir(clamped > index ? 1 : -1);
      setIndex(clamped);
    },
    [index],
  );

  const nextSlide = React.useCallback(() => {
    setDir(1);
    setIndex((i) => (i + 1) % TOTAL_SLIDES);
  }, []);
  const prevSlide = React.useCallback(() => {
    setDir(-1);
    setIndex((i) => (i - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
  }, []);

  // Keyboard nav
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ":
          e.preventDefault();
          nextSlide();
          break;
        case "ArrowLeft":
          e.preventDefault();
          prevSlide();
          break;
        case "Escape":
          if (document.fullscreenElement) document.exitFullscreen();
          break;
        case "f":
        case "F":
          if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
          else document.exitFullscreen();
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            const n = parseInt(e.key, 10);
            if (n <= TOTAL_SLIDES) go(n - 1);
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextSlide, prevSlide, go]);

  // Auto-advance
  React.useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => {
      setDir(1);
      setIndex((i) => (i + 1) % TOTAL_SLIDES);
    }, 6000);
    return () => clearInterval(t);
  }, [autoPlay]);

  // Fullscreen sync
  React.useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen();
  };

  const CurrentSlide = SLIDES[index];
  const progress = ((index + 1) / TOTAL_SLIDES) * 100;

  return (
    <div ref={containerRef} className="relative h-screen w-screen overflow-hidden bg-[#0A0B0F]" style={{ color: C.text }}>
      <PresentationBg />

      {/* Progress bar */}
      <div className="absolute left-0 right-0 top-0 z-30 h-0.5 bg-white/5">
        <motion.div
          className="h-full"
          style={{ background: "linear-gradient(to right, oklch(0.78 0.16 80), oklch(0.65 0.20 60))" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Top-right controls */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        <button
          onClick={() => setAutoPlay((v) => !v)}
          className="grid h-9 w-9 place-items-center rounded-lg border backdrop-blur-md transition hover:bg-white/10"
          style={{ borderColor: C.border, background: C.surface, color: C.text }}
          aria-label={autoPlay ? "Pause auto-advance" : "Play auto-advance"}
          title={autoPlay ? "Pause (auto-advance on)" : "Auto-advance"}
        >
          {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={toggleFullscreen}
          className="grid h-9 w-9 place-items-center rounded-lg border backdrop-blur-md transition hover:bg-white/10"
          style={{ borderColor: C.border, background: C.surface, color: C.text }}
          aria-label="Toggle fullscreen"
          title="Fullscreen (F)"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {/* Top-left brand */}
      <div className="absolute left-4 top-4 z-30 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: "linear-gradient(135deg, oklch(0.78 0.16 80), oklch(0.65 0.20 60))" }}>
          <Sparkles className="h-4 w-4 text-black" />
        </div>
        <span className="text-sm font-bold tracking-tight" style={{ color: C.text }}>
          SYNQUE
        </span>
      </div>

      {/* Slide area */}
      <div className="relative z-10 h-full w-full">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={index}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              opacity: { duration: 0.3 },
              x: prefersReduced ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
              scale: prefersReduced ? { duration: 0 } : { duration: 0.4 },
            }}
            className="h-full w-full"
          >
            <CurrentSlide />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Click zones (left/right) */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-0 top-0 z-20 hidden h-full w-1/4 cursor-w-resize md:block"
        style={{ background: "transparent" }}
      />
      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-0 top-0 z-20 hidden h-full w-1/4 cursor-e-resize md:block"
        style={{ background: "transparent" }}
      />

      {/* Side arrows */}
      <button
        onClick={prevSlide}
        aria-label="Previous"
        className="absolute left-2 top-1/2 z-30 hidden -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md transition hover:bg-white/10 md:grid"
        style={{ borderColor: C.border, background: C.surface, color: C.text }}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        onClick={nextSlide}
        aria-label="Next"
        className="absolute right-2 top-1/2 z-30 hidden -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border backdrop-blur-md transition hover:bg-white/10 md:grid"
        style={{ borderColor: C.border, background: C.surface, color: C.text }}
      >
        <ArrowRight className="h-4 w-4" />
      </button>

      {/* Bottom: counter + dots */}
      <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center gap-3 pb-4">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="group relative flex items-center"
            >
              <span
                className={cn("block rounded-full transition-all duration-300", i === index ? "h-2 w-6" : "h-2 w-2 group-hover:scale-110")}
                style={{
                  background: i === index ? "linear-gradient(to right, oklch(0.78 0.16 80), oklch(0.65 0.20 60))" : "rgba(255,255,255,0.25)",
                }}
              />
            </button>
          ))}
        </div>
        {/* Counter */}
        <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium backdrop-blur-md" style={{ borderColor: C.border, background: C.surface, color: C.textMuted }}>
          <span style={{ color: C.text }}>{String(index + 1).padStart(2, "0")}</span>
          <span>/</span>
          <span>{String(TOTAL_SLIDES).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  );
}
