"use client";

import * as React from "react";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  BarChart3,
  Calendar,
  Wand2,
  Check,
  Mail,
  Loader2,
  Lock,
  Mail as MailIcon,
  Eye,
  EyeOff,
  Sparkles,
  Rocket,
  Layers,
  TrendingUp,
  Clock,
  ShieldAlert,
  MessageCircle,
  Star,
  CreditCard,
  Building2,
  PhoneCall,
  Play,
  ChevronDown,
  Send,
  LayoutDashboard,
  PenSquare,
  Inbox,
  CheckCircle2,
  Twitter,
  Linkedin,
  Github,
  Sun,
  Moon,
  LogIn,
  type LucideIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { Logo, LogoWordmark } from "@/components/glass/logo";
import { BiometricAuth } from "@/components/biometric-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Mode = "landing" | "login" | "trial";

/* ============================================================================
   Cinematic Aurora 2.0 — Theme-aware Design Tokens
   ----------------------------------------------------------------------------
   Near-black void base (dark) / soft cloud white (light).
   Electric blue / violet / teal aurora mesh behind.
   Sections separated by generous padding + hairlines — never by color shifts.
   ============================================================================ */

const DARK_COLORS = {
  bg:        "#030308",
  surface:   "#0A0C14",
  surface2:  "#11142A",
  footer:    "#030308",
  textHead:  "#F8FAFC",
  textBody:  "#94A3B8",
  textMuted: "#64748B",
  border:    "rgba(148,163,184,0.14)",
  cardBg:    "rgba(148,163,184,0.04)",
  cardHover: "rgba(148,163,184,0.08)",
  accent:    "#3B82F6",
  accentA:   (a: number) => `rgba(59,130,246,${a})`,
  violet:    "#8B5CF6",
  violetA:   (a: number) => `rgba(139,92,246,${a})`,
  teal:      "#06B6D4",
  tealA:     (a: number) => `rgba(6,182,212,${a})`,
  pink:      "#EC4899",
  pinkA:     (a: number) => `rgba(236,72,153,${a})`,
  emerald:   "#10B981",
  emeraldA:  (a: number) => `rgba(16,185,129,${a})`,
  gold:      "#F59E0B",
  goldA:     (a: number) => `rgba(245,158,11,${a})`,
  rose:      "#F43F5E",
  roseA:     (a: number) => `rgba(244,63,94,${a})`,
  // Surface variants for nav / cards / mockups
  navBg:       "rgba(10,12,20,0.78)",
  statBg:      "rgba(10,12,20,0.7)",
  stepBg:      "rgba(10,12,20,0.9)",
  mockupBg:    "rgba(16,18,24,0.85)",
  mockupDark:  "rgba(0,0,0,0.2)",
  mockupSide:  "rgba(0,0,0,0.15)",
  mockupBorder:"rgba(255,255,255,0.10)",
  mockupSubtle:"rgba(255,255,255,0.06)",
  mockupSurf:  "rgba(255,255,255,0.03)",
  mockupSkel1: "rgba(255,255,255,0.15)",
  mockupSkel2: "rgba(255,255,255,0.08)",
  vignette:    "rgba(3,3,8,0.85)",
  hoverText:   "#ffffff",
  orbOpacity:  0.65,
};

const LIGHT_COLORS = {
  bg:        "#FAFBFC",
  surface:   "#FFFFFF",
  surface2:  "#F1F5F9",
  footer:    "#F8FAFC",
  textHead:  "#0F172A",
  textBody:  "#475569",
  textMuted: "#94A3B8",
  border:    "rgba(15,23,42,0.10)",
  cardBg:    "rgba(255,255,255,0.85)",
  cardHover: "rgba(255,255,255,0.95)",
  accent:    "#3B82F6",
  accentA:   (a: number) => `rgba(59,130,246,${a})`,
  violet:    "#8B5CF6",
  violetA:   (a: number) => `rgba(139,92,246,${a})`,
  teal:      "#06B6D4",
  tealA:     (a: number) => `rgba(6,182,212,${a})`,
  pink:      "#EC4899",
  pinkA:     (a: number) => `rgba(236,72,153,${a})`,
  emerald:   "#10B981",
  emeraldA:  (a: number) => `rgba(16,185,129,${a})`,
  gold:      "#F59E0B",
  goldA:     (a: number) => `rgba(245,158,11,${a})`,
  rose:      "#F43F5E",
  roseA:     (a: number) => `rgba(244,63,94,${a})`,
  navBg:       "rgba(255,255,255,0.85)",
  statBg:      "rgba(255,255,255,0.75)",
  stepBg:      "rgba(255,255,255,0.95)",
  mockupBg:    "rgba(255,255,255,0.9)",
  mockupDark:  "rgba(241,245,249,0.5)",
  mockupSide:  "rgba(241,245,249,0.4)",
  mockupBorder:"rgba(15,23,42,0.08)",
  mockupSubtle:"rgba(15,23,42,0.06)",
  mockupSurf:  "rgba(15,23,42,0.025)",
  mockupSkel1: "rgba(15,23,42,0.10)",
  mockupSkel2: "rgba(15,23,42,0.06)",
  vignette:    "rgba(250,251,252,0.55)",
  hoverText:   "#0F172A",
  orbOpacity:  0.5,
};

type ColorTokens = typeof DARK_COLORS;

/**
 * useColors — returns the active color palette based on resolvedTheme.
 * Defaults to dark until mounted to avoid SSR/hydration mismatch.
 */
function useColors(): ColorTokens {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme !== "light";
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}

export function LandingPage() {
  const [mode, setMode] = React.useState<Mode>("landing");

  if (mode === "login") {
    return <LoginScreen onBack={() => setMode("landing")} />;
  }
  return (
    <>
      <Landing onTrial={() => setMode("trial")} onSignIn={() => setMode("login")} />
      <TrialDialog
        open={mode === "trial"}
        onOpenChange={(b) => { if (!b) setMode("landing"); }}
        onActivated={() => { /* auth store handles transition to app */ }}
      />
    </>
  );
}

/* ============================================================================
   Cinematic Aurora 2.0 — Inline Keyframes
   ============================================================================ */

const LANDING_KEYFRAMES = `
/* Aurora blob drifts — slow movement over 20-30s */
@keyframes auroraDrift1 {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(18%, 12%) scale(1.18); }
}
@keyframes auroraDrift2 {
  0%   { transform: translate(0, 0) scale(1.1); }
  100% { transform: translate(-14%, 10%) scale(0.92); }
}
@keyframes auroraDrift3 {
  0%   { transform: translate(0, 0) scale(0.95); }
  100% { transform: translate(12%, -14%) scale(1.16); }
}
@keyframes auroraDrift4 {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-12%, -10%) scale(1.12); }
}

/* Vibrant orb drift for the final CTA */
@keyframes orbDrift1 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.45; }
  50%      { transform: translate(20%, -18%) scale(1.25); opacity: 0.7; }
}
@keyframes orbDrift2 {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.35; }
  50%      { transform: translate(-18%, 20%) scale(0.85); opacity: 0.6; }
}
@keyframes orbDrift3 {
  0%, 100% { transform: translate(0, 0) scale(0.9); opacity: 0.4; }
  50%      { transform: translate(15%, 15%) scale(1.15); opacity: 0.65; }
}

/* Gradient text background-position shift */
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}

/* Gentle vertical float for hero mockup */
@keyframes floatY {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}

/* Subtle floating for cards — very subtle ±2px */
@keyframes cardFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-2px); }
}

/* Breathing scale pulse for the central hub */
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

/* Light sweep that crosses the hero periodically (8s) */
@keyframes shimmerSweep {
  0%   { transform: translateX(-120%) skewX(-12deg); opacity: 0; }
  10%  { opacity: 0.7; }
  90%  { opacity: 0.7; }
  100% { transform: translateX(120%) skewX(-12deg); opacity: 0; }
}

/* 360° rotation for icon tiles on hover */
@keyframes iconSpin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Animated bar chart — bars grow from bottom when scrolled into view */
@keyframes barGrowScroll {
  0%   { transform: scaleY(0); }
  100% { transform: scaleY(1); }
}

/* Pulsing glow for CTA buttons */
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 30px -8px var(--glow, rgba(59,130,246,0.5)); opacity: 0.92; }
  50%      { box-shadow: 0 0 70px 0 var(--glow, rgba(59,130,246,0.75)); opacity: 1; }
}

/* Shimmer sweep on glass cards — used via inner div + group-hover */
@keyframes shimmer {
  0%   { transform: translateX(-150%); }
  100% { transform: translateX(150%); }
}

/* Scroll-down indicator bounce */
@keyframes scrollDown {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50%      { transform: translateY(8px); opacity: 1; }
}

/* Solution viz — scattered dots converging to a flow line */
@keyframes dotConverge {
  0%   { transform: translate(var(--from-x, 0), var(--from-y, 0)) scale(0.6); opacity: 0; }
  20%  { opacity: 1; }
  70%  { opacity: 0.9; transform: translate(0, 0) scale(1); }
  100% { opacity: 0; transform: translate(0, 0) scale(0.8); }
}
@keyframes flowDash {
  0%   { stroke-dashoffset: 400; }
  100% { stroke-dashoffset: 0; }
}

/* Workflow connector shimmer */
@keyframes lineShimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Pulse ring for workflow step badges */
@keyframes pulseRing {
  0%   { transform: scale(0.85); opacity: 0.8; }
  100% { transform: scale(1.8); opacity: 0; }
}

/* Subtle gradient-text shift for hero headline */
@keyframes heroGradientShift {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}

/* Stat number subtle pulse */
@keyframes statGlow {
  0%, 100% { text-shadow: 0 0 30px -10px rgba(59,130,246,0.4); }
  50%      { text-shadow: 0 0 50px -5px rgba(59,130,246,0.7); }
}

/* Scroll progress bar — fills from left to right as user scrolls */
@keyframes scrollProgress {
  0%   { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}

/* Marquee for the logo strip — infinite horizontal scroll */
@keyframes marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* FAQ accordion content expand — max-height + opacity */
@keyframes faqOpen {
  0%   { max-height: 0; opacity: 0; }
  100% { max-height: 400px; opacity: 1; }
}

/* Glow border for feature cards on hover — rotates slowly */
@keyframes glowRotate {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Parallax float for hero orbs — different speeds than floatY */
@keyframes orbFloat1 {
  0%, 100% { transform: translate(0, 0); }
  33%      { transform: translate(30px, -40px); }
  66%      { transform: translate(-20px, 30px); }
}
@keyframes orbFloat2 {
  0%, 100% { transform: translate(0, 0); }
  33%      { transform: translate(-40px, 20px); }
  66%      { transform: translate(30px, -30px); }
}

/* Count-up reveal for big stats */
@keyframes countReveal {
  0%   { opacity: 0; transform: translateY(20px) scale(0.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* Gradient border rotation for highlighted pricing card */
@keyframes borderSpin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Staggered hero entrance — clip-path reveal for headline, fade-up for others */
@keyframes heroEntrance {
  0%   { opacity: 0; transform: translateY(40px); clip-path: inset(100% 0 0 0); }
  100% { opacity: 1; transform: translateY(0); clip-path: inset(0 0 0 0); }
}
@keyframes fadeUp {
  0%   { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes scaleIn {
  0%   { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}

/* Orbit ring rotation */
@keyframes spin {
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Animated bar chart — bars grow from bottom on scroll into view */
@keyframes barGrow {
  0%   { transform: scaleY(0); }
  100% { transform: scaleY(1); }
}

/* Section divider — animated gradient sweep across hairlines */
@keyframes dividerSweep {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Glow trail pulse — for orbit badge halos */
@keyframes glowTrail {
  0%, 100% { opacity: 0.3; transform: scale(2.2); }
  50%      { opacity: 0.6; transform: scale(2.8); }
}

/* Animated line draw — SVG stroke-dashoffset for path drawing */
@keyframes lineDraw {
  0%   { stroke-dashoffset: 1000; }
  100% { stroke-dashoffset: 0; }
}

/* Number ticker for problem stats */
@keyframes ticker {
  0%   { transform: translateY(100%); opacity: 0; }
  50%  { opacity: 1; }
  100% { transform: translateY(0); opacity: 1; }
}
`;

/* ============================================================================
   Aurora Background — fixed full-screen animated gradient mesh
   ----------------------------------------------------------------------------
   4 slowly-drifting radial-gradient blobs (blue / violet / teal / pink) at
   elevated opacity for visible cinematic motion. Adapts to light/dark mode.
   Pure CSS animations — 60fps, no JS animation loops. */
function AuroraBg() {
  const COLOR = useColors();
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Deep void base */}
      <div className="absolute inset-0" style={{ background: COLOR.bg }} />

      {/* Aurora blob 1 — electric blue, top-left */}
      <div
        className="absolute rounded-full"
        style={{
          left: "-20%", top: "-15%",
          width: "65vw", height: "65vh",
          background: `radial-gradient(circle, ${COLOR.accentA(0.42)}, transparent 65%)`,
          filter: "blur(70px)",
          opacity: 0.7,
          animation: "auroraDrift1 22s ease-in-out infinite alternate",
        }}
      />
      {/* Aurora blob 2 — violet, top-right */}
      <div
        className="absolute rounded-full"
        style={{
          right: "-18%", top: "-5%",
          width: "60vw", height: "60vh",
          background: `radial-gradient(circle, ${COLOR.violetA(0.38)}, transparent 65%)`,
          filter: "blur(75px)",
          opacity: 0.65,
          animation: "auroraDrift2 28s ease-in-out infinite alternate",
        }}
      />
      {/* Aurora blob 3 — teal, bottom-left */}
      <div
        className="absolute rounded-full"
        style={{
          left: "-12%", bottom: "-20%",
          width: "58vw", height: "58vh",
          background: `radial-gradient(circle, ${COLOR.tealA(0.34)}, transparent 65%)`,
          filter: "blur(65px)",
          opacity: 0.6,
          animation: "auroraDrift3 25s ease-in-out infinite alternate",
        }}
      />
      {/* Aurora blob 4 — pink, bottom-right */}
      <div
        className="absolute rounded-full"
        style={{
          right: "-15%", bottom: "-18%",
          width: "55vw", height: "55vh",
          background: `radial-gradient(circle, ${COLOR.pinkA(0.28)}, transparent 65%)`,
          filter: "blur(60px)",
          opacity: 0.55,
          animation: "auroraDrift4 26s ease-in-out infinite alternate",
        }}
      />

      {/* Subtle grain / noise overlay — tiny SVG turbulence */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          opacity: 0.035,
          mixBlendMode: "overlay",
        }}
      />

      {/* Edge vignette — darken corners so foreground text stays crisp */}
      <div
        className="absolute inset-0"
        style={{
          background:
            `radial-gradient(ellipse at center, transparent 45%, ${COLOR.vignette} 100%)`,
        }}
      />
    </div>
  );
}

/* ============================================================================
   Hooks & Primitives
   ============================================================================ */

function useInView<T extends HTMLElement>(opts?: IntersectionObserverInit) {
  const ref = React.useRef<T>(null);
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px", ...opts },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
};

function Reveal({ children, className, delay = 0, y = 24, once = true }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("transition-all duration-700 ease-out will-change-transform", className)}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  );
}

/* Eyebrow pill — small uppercase label with icon */
function Eyebrow({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const COLOR = useColors();
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md"
      style={{
        background: COLOR.accentA(0.1),
        borderColor: COLOR.accentA(0.3),
        color: COLOR.accent,
      }}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

/* Primary glow CTA button */
function GlowCTA({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const COLOR = useColors();
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-7 py-3.5 text-sm font-bold tracking-tight text-white transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]",
        className,
      )}
      style={{
        background: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.violet})`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 30px -8px ${COLOR.accentA(0.6)}, 0 0 0 1px rgba(255,255,255,0.1)`,
      }}
    >
      {/* Sheen sweep */}
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full"
        style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)" }}
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </button>
  );
}

/* Secondary outline CTA */
function OutlineCTA({
  children,
  onClick,
  className,
}: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  const COLOR = useColors();
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border bg-white/5 px-6 py-3.5 text-sm font-semibold backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10",
        className,
      )}
      style={{ borderColor: COLOR.border, color: COLOR.textHead }}
    >
      {children}
    </button>
  );
}

/* Glassmorphic card with hover lift + shimmer sweep.
   Optional `float` prop adds a continuous subtle floating animation via
   an inner wrapper — avoids transform conflicts with the hover lift. */
function GlassCard({
  children,
  className,
  accent,
  glow = false,
  float = false,
  floatDelay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string;
  glow?: boolean;
  float?: boolean;
  floatDelay?: number;
}) {
  const COLOR = useColors();
  const card = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-white/20",
        className,
      )}
      style={{
        background: COLOR.cardBg,
        borderColor: COLOR.border,
        boxShadow: glow ? `0 8px 32px -8px rgba(0,0,0,0.5)` : undefined,
      }}
    >
      {/* Top accent hairline */}
      {accent && (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-px opacity-70 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `linear-gradient(to right, transparent, ${accent}, transparent)` }}
        />
      )}
      {/* Accent glow that appears on hover — radiates from the accent hairline */}
      {accent && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(ellipse at top, ${accent}15, transparent 70%)` }}
        />
      )}
      {/* Shimmer sweep on hover */}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-1000 group-hover:translate-x-full"
        style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%)" }}
      />
      <div className="relative">{children}</div>
    </div>
  );
  if (!float) return card;
  // Wrap in a floating container — the inner card keeps its hover lift.
  return (
    <div style={{ animation: "cardFloat 6s ease-in-out infinite", animationDelay: `${floatDelay}s` }}>
      {card}
    </div>
  );
}

/* Icon tile with colored gradient circle background.
   Rotates 360° on hover (group-hover) for a playful interaction. */
function IconTile({
  icon: Icon,
  color,
  size = "md",
}: {
  icon: LucideIcon;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const ic = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div
      className={cn("relative grid place-items-center rounded-xl transition-transform duration-500 group-hover:rotate-[360deg]", dims)}
      style={{
        background: `${color}1f`,
        border: `1px solid ${color}55`,
      }}
    >
      <Icon className={ic} style={{ color, filter: "brightness(1.15)" }} />
    </div>
  );
}

/* ============================================================================
   Scroll Progress Bar — thin gradient bar at the very top that fills as the
   user scrolls. Cinematic touch that gives a sense of progression through the
   story. Uses requestAnimationFrame for 60fps smooth updates.
   ============================================================================ */

function ScrollProgressBar() {
  const COLOR = useColors();
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    let raf = 0;
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
      setProgress(pct);
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5 pointer-events-none">
      <div
        className="h-full origin-left transition-transform duration-100 ease-out"
        style={{
          transform: `scaleX(${progress})`,
          background: `linear-gradient(90deg, ${COLOR.accent}, ${COLOR.violet}, ${COLOR.teal})`,
          boxShadow: `0 0 12px ${COLOR.accent}80`,
        }}
      />
    </div>
  );
}

/* ============================================================================
   Landing — Cinematic Acts
   ============================================================================ */

function Landing({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  const COLOR = useColors();
  return (
    <div
      className="relative min-h-screen overflow-x-hidden antialiased selection:bg-[var(--primary)]/30"
      style={{ background: COLOR.bg, color: COLOR.textHead, scrollBehavior: "smooth" }}
    >
      <style>{LANDING_KEYFRAMES}</style>
      {/* Page-wide aurora background — fixed, persists throughout the whole page */}
      <AuroraBg />
      {/* Scroll progress bar — thin gradient at the very top */}
      <ScrollProgressBar />
      {/* Content — above the fixed background */}
      <div className="relative z-10">
        <CinematicNav onTrial={onTrial} onSignIn={onSignIn} />
        <Act1Hero onTrial={onTrial} onSignIn={onSignIn} />
        <Act2Problem />
        <Act3Solution />
        <Act4Features />
        <Act5Workflow onTrial={onTrial} />
        <Act6SocialProof />
        <Act7Compare />
        <Act8Pricing onTrial={onTrial} />
        <Act9FAQ />
        <Act10FinalCTA onTrial={onTrial} />
        <Act11Footer />
      </div>
    </div>
  );
}

/* --------------------------------- Nav ---------------------------------- */

function CinematicNav({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  const COLOR = useColors();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    { href: "#features", label: "Features" },
    { href: "#workflow", label: "Workflow" },
    { href: "#pricing", label: "Pricing" },
    { href: "#social-proof", label: "Customers" },
  ];
  return (
    <nav
      className={cn(
        "fixed left-1/2 top-3 z-50 w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2 rounded-2xl px-4 py-3 transition-all duration-300 sm:w-[calc(100%-2rem)] sm:px-5",
        "border",
        scrolled
          ? "shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          : "sm:border-transparent sm:shadow-none sm:backdrop-blur-none",
      )}
      style={{
        ["--nav-bg" as string]: COLOR.navBg,
        ["--nav-solid-bg" as string]: COLOR.navBg.replace(/[\d.]+\)$/, "1)"),
        ["--nav-border" as string]: COLOR.border,
        borderColor: "var(--nav-border)",
        background: "var(--nav-solid-bg)",
      } as React.CSSProperties}
      data-mobile-solid="true"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 transition-transform duration-300 hover:scale-105">
          <Logo size={28} withTile={false} />
        </div>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm transition hover:opacity-80"
              style={{ color: COLOR.textBody }}
              onMouseEnter={(e) => (e.currentTarget.style.color = COLOR.textHead)}
              onMouseLeave={(e) => (e.currentTarget.style.color = COLOR.textBody)}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="grid h-9 w-9 place-items-center rounded-xl border transition hover:bg-white/5"
              style={{ borderColor: COLOR.border, color: COLOR.textBody }}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}
          {/* Desktop: "Sign in" text link + "Start trial" button */}
          <button
            onClick={onSignIn}
            className="hidden min-h-10 items-center rounded-xl px-3 text-sm font-medium transition hover:opacity-80 sm:flex"
            style={{ color: COLOR.textBody }}
          >
            Sign in
          </button>
          <GlowCTA onClick={onTrial} className="hidden px-5 py-2.5 text-[13px] sm:inline-flex">
            <Rocket className="h-4 w-4" /> Start trial
          </GlowCTA>
          {/* Mobile: compact "Sign in" button replaces the desktop "Start trial" CTA */}
          <button
            onClick={onSignIn}
            className="flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold sm:hidden"
            style={{ color: COLOR.textBody }}
          >
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </button>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="grid h-10 w-10 place-items-center rounded-xl border md:hidden"
            style={{ borderColor: COLOR.border, color: COLOR.textHead }}
            aria-label="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="mt-3 flex flex-col gap-1 border-t pt-3 md:hidden" style={{ borderColor: COLOR.border }}>
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2 text-sm transition hover:bg-white/5"
              style={{ color: COLOR.textBody }}
            >
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { setMobileOpen(false); onSignIn(); }}
            className="rounded-lg px-3 py-2 text-left text-sm transition hover:bg-white/5"
            style={{ color: COLOR.textBody }}
          >
            Sign in
          </button>
        </div>
      )}
    </nav>
  );
}

/* ============================================================================
   CountUpStat — a stat number that animates from 0 to target when it scrolls
   into view. Uses IntersectionObserver + requestAnimationFrame for 60fps.
   ============================================================================ */

function CountUpStat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const COLOR = useColors();
  const [val, setVal] = React.useState(0);
  const [started, setStarted] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVal(target);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            setStarted(true);
            const duration = 1800;
            const startTime = performance.now();
            const tick = (now: number) => {
              const elapsed = now - startTime;
              const t = Math.min(1, elapsed / duration);
              const eased = 1 - Math.pow(1 - t, 3);
              setVal(target * eased);
              if (t < 1) requestAnimationFrame(tick);
              else setVal(target);
            };
            requestAnimationFrame(tick);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, started]);

  const formatted = target % 1 === 0
    ? Math.round(val).toLocaleString()
    : val.toFixed(1);

  return (
    <div
      ref={ref}
      className="px-4 py-5 text-center backdrop-blur-md"
      style={{ background: COLOR.statBg }}
    >
      <div
        className="text-2xl font-bold tabular-nums sm:text-3xl"
        style={{ color: COLOR.textHead, textShadow: `0 0 30px ${COLOR.accent}30` }}
      >
        {formatted}{suffix}
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: COLOR.textBody }}>
        {label}
      </div>
    </div>
  );
}

/* ============================================================================
   PlatformOrbit — 7 animated platform badges orbiting in a circle.
   FIXED: outer div handles positioning (left/top + translate(-50%, -50%)),
   inner div handles the floatY animation so transforms don't conflict.
   Central hub now has a continuous "breathe" pulse.
   Orbit rings made more visible (border opacity 0.25+). */
function PlatformOrbit() {
  const COLOR = useColors();
  const platforms = [
    { label: "Instagram", color: "#E1306C", delay: "0s" },
    { label: "TikTok", color: "#00F2EA", delay: "0.8s" },
    { label: "LinkedIn", color: "#0A66C2", delay: "1.6s" },
    { label: "X", color: "#1DA1F2", delay: "2.4s" },
    { label: "Facebook", color: "#1877F2", delay: "3.2s" },
    { label: "YouTube", color: "#FF0000", delay: "4.0s" },
    { label: "Threads", color: "#94A3B8", delay: "4.8s" },
  ];
  return (
    <div className="relative mt-16 flex h-72 w-full items-center justify-center sm:h-80" aria-hidden>
      {/* Central glow pulse — continuous breathing */}
      <div
        className="absolute h-24 w-24 rounded-full opacity-50 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${COLOR.accent}, transparent 70%)`,
          animation: "breathe 3s ease-in-out infinite",
        }}
      />
      {/* Central hub — SYNQUE logo with breathing scale + glow */}
      <div
        className="absolute z-10 grid h-20 w-20 place-items-center rounded-2xl border backdrop-blur-xl"
        style={{
          background: `linear-gradient(135deg, ${COLOR.accent}20, ${COLOR.violet}20)`,
          borderColor: `${COLOR.accent}60`,
          boxShadow: `0 0 50px -8px ${COLOR.accent}80, inset 0 0 20px -4px ${COLOR.violet}40`,
          animation: "breathe 4s ease-in-out infinite",
          ["--glow" as string]: `${COLOR.accent}80`,
        }}
      >
        <Logo size={32} withTile={false} />
      </div>
      {/* Orbit rings — now more visible */}
      <div
        className="absolute h-64 w-64 rounded-full border sm:h-72 sm:w-72"
        style={{ borderColor: `${COLOR.accent}40`, animation: "spin 40s linear infinite" }}
      />
      <div
        className="absolute h-48 w-48 rounded-full border sm:h-56 sm:w-56"
        style={{ borderColor: `${COLOR.violet}40`, animation: "spin 30s linear infinite reverse" }}
      />
      {/* Platform badges positioned around the orbit.
          Outer div = positioning; inner div = floatY animation. */}
      {platforms.map((p, i) => {
        const angle = (i / platforms.length) * Math.PI * 2;
        const radius = 128;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <div
            key={p.label}
            className="absolute"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Glow trail behind badge — larger, softer colored halo */}
            <div
              className="absolute inset-0 rounded-full opacity-50 blur-lg"
              style={{
                background: `radial-gradient(circle, ${p.color}80, transparent 70%)`,
                transform: "scale(2.5)",
                animation: "glowTrail 3s ease-in-out infinite",
              }}
            />
            <div
              className="relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 backdrop-blur-md transition-transform duration-300 hover:scale-110"
              style={{
                background: `${p.color}1f`,
                borderColor: `${p.color}66`,
                animation: "floatY 4s ease-in-out infinite",
                animationDelay: p.delay,
                boxShadow: `0 4px 14px -4px ${p.color}60, 0 0 20px -6px ${p.color}80`,
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: p.color, boxShadow: `0 0 10px ${p.color}, 0 0 16px ${p.color}80` }}
              />
              <span className="text-[11px] font-semibold" style={{ color: COLOR.textHead }}>{p.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Act 1: Hero ------------------------------ */

function Act1Hero({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  const COLOR = useColors();
  const { loginAsDemo } = useAuth();
  const [demoLoading, setDemoLoading] = React.useState(false);
  const [parallax, setParallax] = React.useState({ x: 0, y: 0 });
  const heroRef = React.useRef<HTMLElement | null>(null);

  const startDemo = async () => {
    setDemoLoading(true);
    const ok = await loginAsDemo();
    if (!ok) {
      setDemoLoading(false);
      window.location.href = "/login";
    }
  };

  // Parallax mouse-tracking — orbs drift opposite to the cursor for depth.
  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setParallax({ x, y });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen w-full overflow-hidden" style={{ background: "transparent" }}>
      {/* Signature futuristic moment — 3 parallax floating gradient orbs that
          drift opposite to the cursor. Opacity bumped to 0.6-0.7, blur reduced
          to 60px so the orbs are clearly visible against the void. */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div
          className="absolute h-[28rem] w-[28rem] rounded-full blur-[60px]"
          style={{
            background: `radial-gradient(circle, ${COLOR.accent}, transparent 70%)`,
            top: "8%", left: "10%",
            opacity: 0.7,
            transform: `translate(${parallax.x * -30}px, ${parallax.y * -20}px)`,
            transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            animation: "orbFloat1 12s ease-in-out infinite",
          }}
        />
        <div
          className="absolute h-[32rem] w-[32rem] rounded-full blur-[70px]"
          style={{
            background: `radial-gradient(circle, ${COLOR.violet}, transparent 70%)`,
            top: "30%", right: "5%",
            opacity: 0.65,
            transform: `translate(${parallax.x * 40}px, ${parallax.y * 30}px)`,
            transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            animation: "orbFloat2 15s ease-in-out infinite",
          }}
        />
        <div
          className="absolute h-[24rem] w-[24rem] rounded-full blur-[55px]"
          style={{
            background: `radial-gradient(circle, ${COLOR.teal}, transparent 70%)`,
            bottom: "5%", left: "35%",
            opacity: 0.6,
            transform: `translate(${parallax.x * -20}px, ${parallax.y * -35}px)`,
            transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
            animation: "orbFloat1 18s ease-in-out infinite reverse",
          }}
        />
      </div>

      {/* Periodic shimmer sweep — a soft light band that crosses the hero every 8s */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-y-0 -left-1/3 w-1/3"
          style={{
            background: `linear-gradient(90deg, transparent, ${COLOR.accent}14, transparent)`,
            filter: "blur(30px)",
            animation: "shimmerSweep 8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Bottom hairline */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-px"
        style={{ background: COLOR.border }}
      />

      {/* Animated SVG line graph behind the headline — draws itself on load
          using stroke-dasharray + stroke-dashoffset (lineDraw keyframe).
          Subtle, glassy, adds depth without dominating. */}
      <svg
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 hidden -translate-x-1/2 -translate-y-1/2 sm:block"
        width="900"
        height="320"
        viewBox="0 0 900 320"
        fill="none"
        aria-hidden
        style={{ opacity: 0.18 }}
      >
        <defs>
          <linearGradient id="heroLineGrad" x1="0" y1="0" x2="900" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={COLOR.accent} />
            <stop offset="50%" stopColor={COLOR.violet} />
            <stop offset="100%" stopColor={COLOR.teal} />
          </linearGradient>
          <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={COLOR.accent} stopOpacity="0.30" />
            <stop offset="100%" stopColor={COLOR.accent} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area under the line */}
        <path
          d="M0,260 C100,240 180,180 260,200 C340,220 420,140 500,120 C580,100 660,150 740,90 C800,50 860,40 900,30 L900,320 L0,320 Z"
          fill="url(#heroAreaGrad)"
        />
        {/* Line that draws itself on load */}
        <path
          d="M0,260 C100,240 180,180 260,200 C340,220 420,140 500,120 C580,100 660,150 740,90 C800,50 860,40 900,30"
          stroke="url(#heroLineGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 1400,
            strokeDashoffset: 1400,
            animation: "lineDraw 2.4s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards",
          }}
        />
        {/* Subtle dots along the line */}
        {[
          { x: 260, y: 200 },
          { x: 500, y: 120 },
          { x: 740, y: 90 },
          { x: 900, y: 30 },
        ].map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill={COLOR.accent}
            style={{ opacity: 0, animation: `fadeUp 0.5s ease-out ${1.4 + i * 0.25}s forwards` }}
          />
        ))}
      </svg>

      <div className="relative z-20 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 pt-28 pb-20 text-center sm:px-6 lg:px-8">
        <Reveal>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-md"
            style={{
              borderColor: COLOR.accentA(0.3),
              background: COLOR.accentA(0.08),
              color: COLOR.accent,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            The enterprise command center
          </span>
        </Reveal>

        {/* Enhanced eyebrow — "Orchestrate your social..." with blue→violet
            gradient text + fade-in animation on load. Larger font than before. */}
        <Reveal delay={80}>
          <p
            className="mt-7 max-w-2xl bg-clip-text text-lg font-semibold tracking-tight text-transparent sm:text-xl"
            style={{
              backgroundImage: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.violet})`,
              backgroundSize: "200% 200%",
              animation: "heroGradientShift 8s ease-in-out infinite, fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both",
            }}
          >
            Orchestrate your social. The enterprise command center for modern social teams.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <h1
            className="mt-7 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            style={{
              color: COLOR.textHead,
              animation: "heroEntrance 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
              animationDelay: "0.15s",
            }}
          >
            <span className="block">One flow.</span>
            <span
              className="mt-2 block bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.violet})`,
                backgroundSize: "200% 200%",
                animation: "heroGradientShift 8s ease-in-out infinite",
              }}
            >
              Every platform.
            </span>
            <span className="mt-2 block" style={{ color: COLOR.textHead }}>Zero chaos.</span>
          </h1>
        </Reveal>

        <Reveal delay={240}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: COLOR.textBody }}>
            Your team posts to 7+ platforms every day. Switching tabs, copy-pasting captions,
            praying nothing gets suspended. SYNQUE turns that chaos into one calm, AI-powered flow —
            so your team ships more, faster.
          </p>
        </Reveal>

        <Reveal delay={360}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GlowCTA onClick={onTrial} className="min-w-[260px]">
              <Rocket className="h-4 w-4" /> Start 15-day free trial
            </GlowCTA>
            <OutlineCTA onClick={startDemo} className="min-w-[200px]">
              {demoLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading demo…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Live Demo
                </>
              )}
            </OutlineCTA>
          </div>
        </Reveal>

        <Reveal delay={440}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px]" style={{ color: COLOR.textBody }}>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> 25GB free media storage</span>
          </div>
        </Reveal>

        {/* === Trust stats bar — with count-up animation === */}
        <Reveal delay={560}>
          <div
            className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4"
            style={{
              borderColor: COLOR.border,
              background: COLOR.border,
            }}
          >
            {[
              { value: 2400, suffix: "+", label: "Teams onboarded" },
              { value: 1.8, suffix: "M", label: "Posts published" },
              { value: 7, suffix: "", label: "Platforms unified" },
              { value: 99.9, suffix: "%", label: "Uptime SLA" },
            ].map((s) => (
              <CountUpStat key={s.label} target={s.value} suffix={s.suffix} label={s.label} />
            ))}
          </div>
        </Reveal>

        {/* === Animated platform orbit — 7 floating platform badges === */}
        <Reveal delay={680} y={40}>
          <PlatformOrbit />
        </Reveal>

        {/* Scroll indicator */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2">
          <ChevronDown
            className="h-6 w-6"
            style={{ color: COLOR.textBody, animation: "scrollDown 1.8s ease-in-out infinite" }}
          />
        </div>
      </div>
    </section>
  );
}

/* =================== Hero Dashboard Mockup ===================
   A CSS/JSX-built mini dashboard that shows what the app looks like.
   Glassmorphic crystal card with: sidebar, KPI row, chart, post grid.
   Currently unused in the hero (the orbit takes its place) but kept for
   potential future use. Theme-aware. */

function HeroDashboardMockup() {
  const COLOR = useColors();
  const kpis = [
    { label: "Followers", value: "48.2K", delta: "+4.2K", color: COLOR.accent },
    { label: "Impressions", value: "1.24M", delta: "+8.4%", color: COLOR.gold },
    { label: "Engagement", value: "12.4%", delta: "+0.3pp", color: COLOR.emerald },
    { label: "Posts", value: "186", delta: "+24", color: COLOR.accent },
  ];
  const bars = [38, 52, 41, 65, 58, 72, 49, 81, 63, 88, 74, 92, 68, 95];
  const platforms = ["instagram", "tiktok", "linkedin", "twitter", "facebook"];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border shadow-2xl"
      style={{
        borderColor: COLOR.mockupBorder,
        background: COLOR.mockupBg,
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        boxShadow: "0 24px 64px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
        animation: "floatY 6s ease-in-out infinite",
      }}
    >
      {/* Top bar — traffic lights + title */}
      <div
        className="flex items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: COLOR.mockupSubtle, background: COLOR.mockupDark }}
      >
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FF5F57" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#28C840" }} />
        </div>
        <div className="mx-auto flex items-center gap-2 text-[11px] font-medium" style={{ color: COLOR.textBody }}>
          <div className="h-3.5 w-3.5 rounded" style={{ background: `linear-gradient(135deg, ${COLOR.accent}, ${COLOR.violet})` }} />
          SYNQUE — Command Center
        </div>
      </div>

      <div className="flex">
        {/* Mini sidebar — hidden on mobile */}
        <div
          className="hidden w-40 shrink-0 flex-col gap-1 border-r p-3 sm:flex"
          style={{ borderColor: COLOR.mockupSubtle, background: COLOR.mockupSide }}
        >
          {[
            { icon: LayoutDashboard, label: "Dashboard", active: true },
            { icon: PenSquare, label: "Composer" },
            { icon: Calendar, label: "Calendar" },
            { icon: Inbox, label: "Inbox" },
            { icon: BarChart3, label: "Analytics" },
            { icon: Users, label: "Team" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition"
                style={{
                  background: item.active ? COLOR.accentA(0.15) : "transparent",
                  color: item.active ? COLOR.accent : COLOR.textBody,
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </div>
            );
          })}
          <div className="mt-auto rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: COLOR.textBody }}>
              Storage
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: "62%", background: `linear-gradient(90deg, ${COLOR.accent}, ${COLOR.violet})` }} />
            </div>
            <div className="mt-1 text-[9px]" style={{ color: COLOR.textBody }}>15.5 / 25 GB</div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4">
          {/* Greeting */}
          <div className="mb-4 flex items-center justify-between">
            <div className="text-left">
              <div className="text-sm font-bold" style={{ color: COLOR.textHead }}>Good day, Maya</div>
              <div className="text-[10px]" style={{ color: COLOR.textBody }}>11 posts · 5 published this week</div>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold"
              style={{ background: COLOR.accentA(0.15), color: COLOR.accent }}
            >
              <Sparkles className="h-3 w-3" /> Compose with AI
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border p-2.5 text-left"
                style={{
                  borderColor: COLOR.mockupSubtle,
                  background: COLOR.mockupSurf,
                }}
              >
                <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: COLOR.textBody }}>
                  {kpi.label}
                </div>
                <div className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: COLOR.textHead }}>
                  {kpi.value}
                </div>
                <div className="text-[10px] font-semibold" style={{ color: kpi.color }}>
                  {kpi.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Chart + side panel */}
          <div className="mt-2.5 grid grid-cols-3 gap-2.5">
            {/* Area chart */}
            <div
              className="col-span-2 rounded-xl border p-3"
              style={{ borderColor: COLOR.mockupSubtle, background: COLOR.mockupSurf }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-semibold" style={{ color: COLOR.textHead }}>
                  Follower Growth
                </div>
                <div className="flex gap-1">
                  {["7D", "30D", "90D"].map((t, i) => (
                    <div
                      key={t}
                      className="rounded px-1.5 py-0.5 text-[8px] font-medium"
                      style={{
                        background: i === 1 ? COLOR.accentA(0.2) : "transparent",
                        color: i === 1 ? COLOR.accent : COLOR.textBody,
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              {/* SVG area chart */}
              <svg viewBox="0 0 280 80" className="w-full" preserveAspectRatio="none" style={{ height: 80 }}>
                <defs>
                  <linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR.accent} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={COLOR.accent} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M0,${80 - bars[0]} ${bars.map((h, i) => `L${(i / (bars.length - 1)) * 280},${80 - h}`).join(" ")} L280,80 L0,80 Z`}
                  fill="url(#heroChartGrad)"
                />
                <path
                  d={`M0,${80 - bars[0]} ${bars.map((h, i) => `L${(i / (bars.length - 1)) * 280},${80 - h}`).join(" ")}`}
                  fill="none"
                  stroke={COLOR.accent}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx={280} cy={80 - bars[bars.length - 1]} r="3" fill={COLOR.accent} />
              </svg>
            </div>

            {/* Side: platforms */}
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: COLOR.mockupSubtle, background: COLOR.mockupSurf }}
            >
              <div className="mb-2 text-[10px] font-semibold" style={{ color: COLOR.textHead }}>Connected</div>
              <div className="space-y-1.5">
                {platforms.map((p, i) => (
                  <div key={p} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-4 w-4 rounded"
                        style={{ background: [COLOR.accent, COLOR.violet, COLOR.emerald, COLOR.teal, COLOR.rose][i] }}
                      />
                      <span className="text-[9px] font-medium capitalize" style={{ color: COLOR.textBody }}>{p}</span>
                    </div>
                    <div className="text-[9px] font-semibold tabular-nums" style={{ color: COLOR.textHead }}>
                      {["24.1K", "14.8K", "9.3K", "7.2K", "5.1K"][i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent posts strip */}
          <div className="mt-2.5 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 overflow-hidden rounded-lg border"
                style={{ borderColor: COLOR.mockupSubtle, background: COLOR.mockupSurf }}
              >
                <div className="h-10" style={{ background: `linear-gradient(135deg, ${[COLOR.accent, COLOR.violet, COLOR.emerald, COLOR.teal][i]}40, transparent)` }} />
                <div className="p-1.5">
                  <div className="h-1 w-3/4 rounded-full" style={{ background: COLOR.mockupSkel1 }} />
                  <div className="mt-1 h-1 w-1/2 rounded-full" style={{ background: COLOR.mockupSkel2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Act 2: Problem ----------------------------- */

function Act2Problem() {
  const COLOR = useColors();
  const problems = [
    {
      icon: Layers,
      t: "7 tabs open",
      d: "Instagram, X, LinkedIn, TikTok… each its own tab. Copy-paste fatigue is real. Context-switching kills deep work.",
      accent: COLOR.rose,
    },
    {
      icon: ShieldAlert,
      t: "Accounts suspended",
      d: "Your team posts too fast, uses banned hashtags, gets flagged — and gone. Recovery takes weeks of CS emails.",
      accent: COLOR.rose,
    },
    {
      icon: Clock,
      t: "Content stuck",
      d: "Drafts live in DMs, spreadsheets, and half-written Notes apps. Nobody knows what's actually ready to publish.",
      accent: COLOR.rose,
    },
  ];
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: "transparent" }}>
      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLOR.accent}40, ${COLOR.violet}40, transparent)`, backgroundSize: "200% 100%", animation: "dividerSweep 8s linear infinite" }} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={ShieldAlert} label="The chaos is real" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Social media is <span style={{ color: COLOR.rose }}>broken</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              Teams waste hours every day context-switching between tools. Accounts get suspended.
              Content gets lost. Here&apos;s what your team deals with right now:
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {problems.map((p, i) => (
            <Reveal key={p.t} delay={i * 120}>
              <GlassCard accent={p.accent} float floatDelay={i * 0.5} className="h-full p-6">
                <IconTile icon={p.icon} color={p.accent} size="lg" />
                <h3 className="mt-5 text-lg font-bold" style={{ color: COLOR.textHead }}>{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: COLOR.textBody }}>{p.d}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>

        {/* Pain stat strip — animated count-up style */}
        <Reveal delay={500}>
          <div
            className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border sm:grid-cols-4"
            style={{ background: COLOR.border, borderColor: COLOR.border }}
          >
            {[
              { v: "11 hrs", l: "Lost weekly per teammate to tab-switching", num: 11, suffix: " hrs" },
              { v: "1 in 4",  l: "Accounts suspended in their first 90 days", num: 0, suffix: "" },
              { v: "$3.2K",   l: "Average cost per missed campaign deadline", num: 0, suffix: "" },
              { v: "62%",     l: "Of DMs go unanswered within 24 hours", num: 62, suffix: "%" },
            ].map((s) => (
              <div
                key={s.l}
                className="p-6 text-center backdrop-blur-md"
                style={{
                  background: COLOR.statBg,
                  animation: "ticker 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
                }}
              >
                <div className="text-3xl font-bold sm:text-4xl" style={{ color: COLOR.rose, textShadow: `0 0 30px ${COLOR.rose}40` }}>{s.v}</div>
                <div className="mt-2 text-[11px] uppercase tracking-wider" style={{ color: COLOR.textBody }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------- Act 3: Solution ---------------------------- */

function Act3Solution() {
  const COLOR = useColors();
  const bullets = [
    "Write once, publish everywhere — one brief, 7 platform-native posts",
    "AI-powered per-account captions respecting tone, length & hashtags",
    "Never miss a comment — unified inbox across every platform",
  ];
  const platforms = ["IG", "TT", "LI", "X", "FB", "YT"];
  const platformColors = ["#E1306C", "#00F2EA", "#0A66C2", "#1DA1F2", "#1877F2", "#FF0000"];

  return (
    <section
      id="features"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "transparent" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLOR.accent}40, ${COLOR.violet}40, transparent)`, backgroundSize: "200% 100%", animation: "dividerSweep 8s linear infinite" }} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — copy */}
          <div>
            <Reveal>
              <Eyebrow icon={Sparkles} label="The SYNQUE way" />
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
                Turn chaos into{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.violet})`,
                    backgroundSize: "200% 200%",
                    animation: "heroGradientShift 8s ease-in-out infinite",
                  }}
                >
                  flow
                </span>
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-5 text-base sm:text-lg" style={{ color: COLOR.textBody }}>
                One calm workspace where every platform, every caption, and every comment lives in sync.
                Your team stops juggling tabs and starts shipping — without the suspension risk.
              </p>
            </Reveal>
            <div className="mt-8 space-y-3">
              {bullets.map((b, i) => (
                <Reveal key={b} delay={i * 120}>
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                      style={{ background: COLOR.emeraldA(0.15), border: `1px solid ${COLOR.emeraldA(0.4)}` }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: COLOR.emerald }} />
                    </span>
                    <span className="text-sm leading-relaxed sm:text-base" style={{ color: COLOR.textHead }}>
                      {b}
                    </span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={500}>
              <div className="mt-9">
                <GlowCTA onClick={() => { const el = document.getElementById("workflow"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}>
                  See how it works <ArrowRight className="h-4 w-4" />
                </GlowCTA>
              </div>
            </Reveal>
          </div>

          {/* Right — Chaos → Flow transformation visualization. */}
          <Reveal delay={300} y={40}>
            <div className="relative mx-auto w-full max-w-md">
              <div
                className="relative overflow-hidden rounded-3xl border backdrop-blur-xl"
                style={{
                  background: COLOR.cardBg,
                  borderColor: COLOR.border,
                }}
              >
                {/* === BEFORE: Chaos — scattered, overlapping, jittery icons === */}
                <div className="relative h-44 overflow-hidden border-b p-4" style={{ borderColor: COLOR.border }}>
                  <div className="absolute left-3 top-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: COLOR.rose }}>
                    ✕ Chaos
                  </div>
                  {/* Scattered platform icons with jitter animation */}
                  <div className="relative h-full w-full">
                    {platforms.map((p, i) => {
                      const positions = [
                        { x: "15%", y: "20%", rot: "-12deg" },
                        { x: "55%", y: "15%", rot: "8deg" },
                        { x: "30%", y: "50%", rot: "-5deg" },
                        { x: "70%", y: "45%", rot: "15deg" },
                        { x: "10%", y: "65%", rot: "22deg" },
                        { x: "60%", y: "68%", rot: "-18deg" },
                      ];
                      const pos = positions[i];
                      return (
                        <div
                          key={p}
                          className="absolute grid h-9 w-9 place-items-center rounded-lg border text-[10px] font-bold"
                          style={{
                            left: pos.x,
                            top: pos.y,
                            transform: `rotate(${pos.rot})`,
                            background: `${platformColors[i]}20`,
                            borderColor: `${platformColors[i]}50`,
                            color: platformColors[i],
                            animation: `chaosJitter${i} 3s ease-in-out infinite`,
                          }}
                        >
                          {p}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* === Arrow: transformation indicator === */}
                <div className="relative flex items-center justify-center py-3">
                  <div
                    className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold"
                    style={{
                      background: `linear-gradient(90deg, ${COLOR.accent}15, ${COLOR.violet}15)`,
                      borderColor: `${COLOR.accent}40`,
                      color: COLOR.accent,
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    SYNQUE transforms it
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* === AFTER: Flow — organized horizontal stream === */}
                <div className="relative h-32 overflow-hidden p-4">
                  <div className="absolute left-3 top-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: COLOR.emerald }}>
                    ✓ Flow
                  </div>
                  {/* Flow line */}
                  <svg className="absolute inset-x-0 bottom-8 h-1 w-full" viewBox="0 0 400 4" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="flowLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLOR.accent} stopOpacity="0" />
                        <stop offset="20%" stopColor={COLOR.accent} stopOpacity="0.8" />
                        <stop offset="80%" stopColor={COLOR.violet} stopOpacity="0.8" />
                        <stop offset="100%" stopColor={COLOR.violet} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="2" x2="400" y2="2" stroke="url(#flowLine)" strokeWidth="2" strokeDasharray="4 4" style={{ animation: "flowDash 2s linear infinite" }} />
                  </svg>
                  {/* Organized platform icons flowing in a line */}
                  <div className="relative flex h-full items-center justify-center gap-2 pt-3">
                    {platforms.map((p, i) => (
                      <div
                        key={p}
                        className="grid h-8 w-8 place-items-center rounded-lg border text-[9px] font-bold"
                        style={{
                          background: `${platformColors[i]}20`,
                          borderColor: `${platformColors[i]}60`,
                          color: platformColors[i],
                          animation: `flowFloat 3s ease-in-out infinite`,
                          animationDelay: `${i * 0.2}s`,
                        }}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Chaos jitter keyframes — each icon gets its own subtle random movement */}
      <style>{`
        @keyframes chaosJitter0 { 0%,100%{transform:rotate(-12deg)translate(0,0)} 50%{transform:rotate(-8deg)translate(3px,-2px)} }
        @keyframes chaosJitter1 { 0%,100%{transform:rotate(8deg)translate(0,0)} 50%{transform:rotate(12deg)translate(-2px,3px)} }
        @keyframes chaosJitter2 { 0%,100%{transform:rotate(-5deg)translate(0,0)} 50%{transform:rotate(-2deg)translate(4px,1px)} }
        @keyframes chaosJitter3 { 0%,100%{transform:rotate(15deg)translate(0,0)} 50%{transform:rotate(10deg)translate(-3px,-2px)} }
        @keyframes chaosJitter4 { 0%,100%{transform:rotate(22deg)translate(0,0)} 50%{transform:rotate(18deg)translate(2px,3px)} }
        @keyframes chaosJitter5 { 0%,100%{transform:rotate(-18deg)translate(0,0)} 50%{transform:rotate(-22deg)translate(-4px,-1px)} }
        @keyframes flowFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      `}</style>
    </section>
  );
}

/* --------------------------- Act 4: Features ---------------------------- */

function Act4Features() {
  const COLOR = useColors();
  const features = [
    {
      icon: Wand2,         title: "AI Composer",
      desc: "Generate distinct, platform-native captions for every account from one brief — respecting tone, length, and hashtag conventions.",
      accent: COLOR.violet,
      span: "lg:col-span-2",
    },
    {
      icon: ShieldCheck,  title: "Account Safety",
      desc: "Anti-suspension guards: posting cadence limits, banned-hashtag blocker, smart cooldowns, and a risk advisor.",
      accent: COLOR.emerald,
      span: "",
    },
    {
      icon: BarChart3,    title: "Advanced Analytics",
      desc: "Deep insights across every platform — impressions, reach, engagement, audience growth, per-account comparison.",
      accent: COLOR.accent,
      span: "",
    },
    {
      icon: Calendar,     title: "Content Calendar",
      desc: "Plan and schedule your entire content pipeline with a visual month grid and drag-friendly scheduling. Never miss a beat.",
      accent: COLOR.teal,
      span: "lg:col-span-2",
    },
    {
      icon: MessageCircle,title: "Unified Inbox",
      desc: "Comments and DMs from every account in one inbox. Sentiment-tagged, assignable, reply-ready.",
      accent: COLOR.pink,
      span: "lg:col-span-2",
    },
    {
      icon: Users,        title: "Team Workflow",
      desc: "Roles, approvals, and collaboration across every workspace.",
      accent: COLOR.gold,
      span: "",
    },
  ];
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: "transparent" }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLOR.accent}40, ${COLOR.violet}40, transparent)`, backgroundSize: "200% 100%", animation: "dividerSweep 8s linear infinite" }} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Zap} label="Capabilities" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Everything your team needs
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              From ideation to publishing to protection — one premium platform, integrated end-to-end.
              Built for teams that ship daily.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100} className={f.span}>
              <GlassCard accent={f.accent} float floatDelay={i * 0.6} className="h-full p-6">
                <div className="flex items-start justify-between">
                  <IconTile icon={f.icon} color={f.accent} size="lg" />
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full border transition group-hover:bg-white/10"
                    style={{ borderColor: COLOR.border, color: COLOR.textBody }}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold" style={{ color: COLOR.textHead }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: COLOR.textBody }}>{f.desc}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Act 5: Workflow ---------------------------- */

function Act5Workflow({ onTrial }: { onTrial: () => void }) {
  const COLOR = useColors();
  const steps = [
    { n: "01", icon: PenSquare,    t: "Create",  d: "Drop your media. Write one brief — that's it.",                accent: COLOR.accent },
    { n: "02", icon: CheckCircle2, t: "Approve", d: "Team review with phone-style previews per platform.",          accent: COLOR.violet },
    { n: "03", icon: Send,         t: "Publish", d: "One click sends it everywhere — or queues it for later.",     accent: COLOR.teal },
    { n: "04", icon: BarChart3,    t: "Analyze", d: "Track reach, engagement, and growth across every account.",    accent: COLOR.emerald },
  ];
  return (
    <section
      id="workflow"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "transparent" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLOR.accent}40, ${COLOR.violet}40, transparent)`, backgroundSize: "200% 100%", animation: "dividerSweep 8s linear infinite" }} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Zap} label="The SYNQUE flow" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              From idea to published in <span style={{ color: COLOR.accent }}>4 steps</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              One brief. Four steps. Seven platforms. Zero chaos.
            </p>
          </Reveal>
        </div>

        {/* Desktop horizontal flow */}
        <Reveal delay={300}>
          <div className="mt-16 hidden lg:block">
            <div className="relative">
              {/* Animated gradient connector line */}
              <div className="absolute left-0 right-0 top-7 h-0.5 overflow-hidden rounded-full" style={{ background: "rgba(148,163,184,0.1)" }}>
                <div
                  className="absolute inset-0 h-full"
                  style={{
                    background: `linear-gradient(to right, ${COLOR.accentA(0.2)}, ${COLOR.violetA(0.6)}, ${COLOR.tealA(0.6)}, ${COLOR.emeraldA(0.2)})`,
                    backgroundSize: "200% 100%",
                    animation: "lineShimmer 4s linear infinite",
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-5">
                {steps.map((s, i) => (
                  <Reveal key={s.n} delay={i * 120}>
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        {/* Pulse ring — expands and fades continuously */}
                        <span
                          className="absolute inset-0 rounded-2xl"
                          style={{
                            border: `1px solid ${s.accent}`,
                            animation: "pulseRing 2.5s ease-out infinite",
                            animationDelay: `${i * 0.5}s`,
                          }}
                        />
                        <div
                          className="relative grid h-14 w-14 place-items-center rounded-2xl border backdrop-blur-xl"
                          style={{
                            background: COLOR.stepBg,
                            borderColor: `${s.accent}`,
                            boxShadow: `0 0 28px -8px ${s.accent}80`,
                            animation: "floatY 4s ease-in-out infinite",
                            animationDelay: `${i * 0.3}s`,
                          }}
                        >
                          <s.icon className="h-6 w-6" style={{ color: s.accent }} />
                        </div>
                      </div>
                      <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: s.accent }}>{s.n}</div>
                      <div className="mt-1 text-sm font-bold" style={{ color: COLOR.textHead }}>{s.t}</div>
                      <div className="mt-1 text-xs leading-relaxed" style={{ color: COLOR.textBody }}>{s.d}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Mobile vertical step flow */}
        <div className="mt-12 lg:hidden">
          <div className="relative space-y-4 pl-8">
            {/* Vertical gradient connector */}
            <div
              className="absolute left-[26px] top-2 bottom-2 w-0.5 overflow-hidden rounded-full"
              style={{ background: "rgba(148,163,184,0.1)" }}
            >
              <div
                className="absolute inset-0 w-full"
                style={{
                  background: `linear-gradient(to bottom, ${COLOR.accentA(0.6)}, ${COLOR.violetA(0.6)}, ${COLOR.tealA(0.6)}, ${COLOR.emeraldA(0.6)})`,
                  backgroundSize: "100% 200%",
                  animation: "lineShimmer 4s linear infinite",
                }}
              />
            </div>
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="relative flex items-start gap-4">
                  <div
                    className="absolute -left-8 grid h-12 w-12 place-items-center rounded-2xl border backdrop-blur-xl"
                    style={{
                      background: COLOR.stepBg,
                      borderColor: s.accent,
                      boxShadow: `0 0 24px -6px ${s.accent}80`,
                    }}
                  >
                    <s.icon className="h-5 w-5" style={{ color: s.accent }} />
                  </div>
                  <div className="ml-4 flex-1 rounded-2xl border p-4 backdrop-blur-sm" style={{ background: COLOR.cardBg, borderColor: COLOR.border }}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: s.accent }}>{s.n}</div>
                    <div className="text-sm font-bold" style={{ color: COLOR.textHead }}>{s.t}</div>
                    <div className="mt-1 text-xs leading-relaxed" style={{ color: COLOR.textBody }}>{s.d}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={500}>
          <div className="mt-14 flex justify-center">
            <GlowCTA onClick={onTrial}>
              <Wand2 className="h-4 w-4" /> Try the composer
            </GlowCTA>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================================
   AnimatedBarChart — bars grow from 0 height to target when scrolled into
   view. Pure CSS transition (no JS animation loop), staggered via delay.
   ============================================================================ */

function AnimatedBarChart({
  data,
  color,
  height = 140,
  labels,
}: {
  data: number[];
  color: string;
  height?: number;
  labels?: string[];
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const maxVal = Math.max(...data);
  return (
    <div ref={ref} className="flex w-full items-end gap-2" style={{ height }}>
      {data.map((val, i) => {
        const h = (val / maxVal) * 100;
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className="w-full rounded-t-md"
              style={{
                height: inView ? `${h}%` : "0%",
                background: `linear-gradient(to top, ${color}, ${color}66)`,
                transition: `height 1.2s cubic-bezier(0.22, 1, 0.36, 1) ${i * 80}ms`,
                transformOrigin: "bottom",
                boxShadow: `0 -2px 12px -4px ${color}66`,
              }}
            />
            {labels && (
              <div className="text-[9px] font-medium uppercase tracking-wider opacity-70">
                {labels[i]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------- Act 6: Social Proof ------------------------- */

function Act6SocialProof() {
  const COLOR = useColors();
  const stats = [
    { v: "2,400+",    l: "Teams onboarded",  icon: Users,       accent: COLOR.accent },
    { v: "1.8M",      l: "Posts published",  icon: Send,        accent: COLOR.violet },
    { v: "48M",       l: "Monthly impressions", icon: TrendingUp, accent: COLOR.teal },
    { v: "99.9%",     l: "Uptime SLA",       icon: ShieldCheck,  accent: COLOR.emerald },
  ];
  const testimonials = [
    {
      initials: "MR", name: "Maya Reyes", role: "Head of Social, Prism Studio",
      accent: COLOR.accent,
      quote: "SYNQUE turned our 7-platform chaos into one calm flow. We ship 3x faster and our accounts have never been safer.",
    },
    {
      initials: "DC", name: "David Chen", role: "CMO, Northwind",
      accent: COLOR.violet,
      quote: "The AI composer alone saves my team 8 hours a week. Per-account captions are spot on — no more copy-paste fatigue.",
    },
    {
      initials: "AP", name: "Aisha Patel", role: "Social Lead, Brightwave",
      accent: COLOR.teal,
      quote: "Zero suspensions in 6 months. The account protection is unreal — it's like having a safety net we didn't know we needed.",
    },
  ];
  const logos = ["Northwind", "PRISM", "Brightwave", "LUMEN", "Vertex", "Quanta"];
  // Growth chart data — impressions growth over the last 12 months
  const growthData = [22, 28, 35, 42, 48, 58, 64, 72, 80, 88, 94, 100];
  const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  return (
    <section
      id="social-proof"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "transparent" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLOR.accent}40, ${COLOR.violet}40, transparent)`, backgroundSize: "200% 100%", animation: "dividerSweep 8s linear infinite" }} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Big stats */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.l} delay={i * 100}>
              <GlassCard accent={s.accent} float floatDelay={i * 0.5} className="h-full p-6 text-center">
                <div className="mx-auto mb-4 w-fit">
                  <IconTile icon={s.icon} color={s.accent} />
                </div>
                <div
                  className="text-4xl font-bold tabular-nums sm:text-5xl"
                  style={{ color: COLOR.textHead, animation: "statGlow 4s ease-in-out infinite" }}
                >
                  {s.v}
                </div>
                <div className="mt-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: COLOR.textBody }}>
                  {s.l}
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>

        {/* Animated growth chart — bars grow when scrolled into view */}
        <Reveal delay={200}>
          <div className="mt-12">
            <GlassCard accent={COLOR.accent} glow className="p-6 sm:p-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLOR.textBody }}>
                    Customer growth · last 12 months
                  </div>
                  <div className="mt-1 text-2xl font-bold sm:text-3xl" style={{ color: COLOR.textHead }}>
                    +3,400<span style={{ color: COLOR.accent }}>%</span> reach growth
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR.accent, boxShadow: `0 0 8px ${COLOR.accent}` }} />
                  <span className="text-xs font-medium" style={{ color: COLOR.textBody }}>Monthly active teams</span>
                </div>
              </div>
              <AnimatedBarChart
                data={growthData}
                color={COLOR.accent}
                height={160}
                labels={monthLabels}
              />
            </GlassCard>
          </div>
        </Reveal>

        {/* Testimonials */}
        <div className="mt-20 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: COLOR.textHead }}>
              Loved by teams that ship daily
            </h2>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 120}>
              <GlassCard accent={t.accent} float floatDelay={i * 0.7} className="h-full p-6">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="h-4 w-4 fill-current" style={{ color: COLOR.gold }} />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: COLOR.textHead }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div
                    className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold"
                    style={{
                      background: `${t.accent}26`,
                      border: `1px solid ${t.accent}55`,
                      color: t.accent,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: COLOR.textHead }}>{t.name}</div>
                    <div className="text-[11px]" style={{ color: COLOR.textBody }}>{t.role}</div>
                  </div>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>

        {/* Company logos row — marquee scroll */}
        <Reveal delay={300}>
          <div className="mt-20 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLOR.textMuted }}>
              Trusted by teams at
            </div>
            <div className="relative mt-6 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)" }}>
              <div
                className="flex items-center gap-x-10 gap-y-4"
                style={{ animation: "marquee 25s linear infinite", width: "max-content" }}
              >
                {[...logos, ...logos, ...logos].map((l, i) => (
                  <span
                    key={i}
                    className="text-lg font-bold tracking-tight transition"
                    style={{ color: COLOR.textMuted, opacity: 0.7 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = COLOR.textHead; e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = COLOR.textMuted; e.currentTarget.style.opacity = "0.7"; }}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------- Act 7: Compare ----------------------------- */

function Act7Compare() {
  const COLOR = useColors();
  const competitors = ["SYNQUE", "Hootsuite", "Buffer", "Sprout Social"];
  const features: { label: string; synque: string | boolean; hootsuite: string | boolean; buffer: string | boolean; sprout: string | boolean; }[] = [
    { label: "AI per-account caption generation", synque: true, hootsuite: false, buffer: false, sprout: false },
    { label: "Anti-suspension account safety", synque: true, hootsuite: "Partial", buffer: false, sprout: "Partial" },
    { label: "Unified inbox + sentiment tagging", synque: true, hootsuite: true, buffer: false, sprout: true },
    { label: "Multi-platform publishing", synque: "7 platforms", hootsuite: "7 platforms", buffer: "5 platforms", sprout: "7 platforms" },
    { label: "Team roles + approval workflow", synque: true, hootsuite: "Premium only", buffer: false, sprout: true },
    { label: "Content calendar (drag & drop)", synque: true, hootsuite: true, buffer: true, sprout: true },
    { label: "Media storage (free tier)", synque: "25 GB", hootsuite: "0 GB", buffer: "0 GB", sprout: "0 GB" },
    { label: "Starting price", synque: "$0/mo", hootsuite: "$99/mo", buffer: "$6/mo", sprout: "$249/mo" },
  ];
  function Check({ value }: { value: string | boolean }) {
    if (value === true) return <span className="text-lg font-bold" style={{ color: COLOR.emerald }}>✓</span>;
    if (value === false) return <span style={{ color: COLOR.textMuted }}>—</span>;
    return <span className="text-xs font-medium" style={{ color: COLOR.textBody }}>{value}</span>;
  }
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: "transparent" }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLOR.accent}40, ${COLOR.violet}40, transparent)`, backgroundSize: "200% 100%", animation: "dividerSweep 8s linear infinite" }} />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal><Eyebrow icon={Layers} label="The Difference" /></Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Why teams switch to <span style={{ backgroundImage: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.violet})`, backgroundSize: "200% 200%", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent", animation: "gradientShift 6s ease-in-out infinite" }}>SYNQUE</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              The same capabilities — minus the chaos, minus the bloated price tag.
            </p>
          </Reveal>
        </div>

        <Reveal delay={300}>
          <div className="mt-14 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th className="px-4 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: COLOR.textBody }}>Feature</th>
                  {competitors.map((c, i) => (
                    <th
                      key={c}
                      className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider"
                      style={i === 0 ? {
                        color: COLOR.textHead,
                        background: `linear-gradient(135deg, ${COLOR.accent}15, ${COLOR.violet}15)`,
                        borderLeft: `2px solid ${COLOR.accent}`,
                        borderRight: `2px solid ${COLOR.accent}`,
                        borderTop: `1px solid ${COLOR.accent}40`,
                        borderTopLeftRadius: i === 0 ? 12 : 0,
                        borderTopRightRadius: i === 0 ? 12 : 0,
                      } : { color: COLOR.textBody }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((row, i) => (
                  <tr
                    key={row.label}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: `1px solid ${COLOR.border}` }}
                  >
                    <td className="px-4 py-3.5 font-medium" style={{ color: COLOR.textHead }}>{row.label}</td>
                    <td
                      className="px-4 py-3.5 text-center"
                      style={{
                        background: `linear-gradient(135deg, ${COLOR.accent}08, ${COLOR.violet}08)`,
                        borderLeft: `2px solid ${COLOR.accent}40`,
                        borderRight: `2px solid ${COLOR.accent}40`,
                      }}
                    >
                      <Check value={row.synque} />
                    </td>
                    <td className="px-4 py-3.5 text-center"><Check value={row.hootsuite} /></td>
                    <td className="px-4 py-3.5 text-center"><Check value={row.buffer} /></td>
                    <td className="px-4 py-3.5 text-center"><Check value={row.sprout} /></td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} style={{ height: 0, borderTop: "none", borderBottom: "none", padding: 0 }}>
                    <div
                      style={{
                        height: 2,
                        background: `linear-gradient(to right, transparent, ${COLOR.accent}, ${COLOR.violet}, transparent)`,
                        opacity: 0.4,
                      }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------- Act 8: Pricing -------------------------- */

function Act8Pricing({ onTrial }: { onTrial: () => void }) {
  const COLOR = useColors();
  return (
    <section
      id="pricing"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "transparent" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLOR.accent}40, ${COLOR.violet}40, transparent)`, backgroundSize: "200% 100%", animation: "dividerSweep 8s linear infinite" }} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={CreditCard} label="Pricing" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Simple, transparent pricing
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              Start with a 15-day free trial. No card to explore. Pick a plan when you&apos;re ready. Cancel anytime.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid items-stretch gap-5 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const featured = p.featured;
            return (
              <Reveal key={p.name} delay={i * 120} className={featured ? "lg:-mt-4 lg:mb-4" : ""}>
                <div
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-3xl border p-7 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5",
                  )}
                  style={
                    featured
                      ? {
                          borderColor: "transparent",
                          background: `linear-gradient(to bottom, ${COLOR.accentA(0.12)}, ${COLOR.violetA(0.06)})`,
                          boxShadow: `0 30px 80px -30px ${COLOR.accentA(0.5)}`,
                        }
                      : {
                          borderColor: COLOR.border,
                          background: COLOR.cardBg,
                        }
                  }
                >
                  {/* Gradient border wrapper for featured card */}
                  {featured && (
                    <>
                      <div
                        className="pointer-events-none absolute inset-0 rounded-3xl opacity-100"
                        style={{
                          padding: "1px",
                          background: `linear-gradient(135deg, ${COLOR.accent}, ${COLOR.violet})`,
                          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                          WebkitMaskComposite: "xor",
                          maskComposite: "exclude",
                        }}
                      />
                      {/* Continuous glow pulse behind the featured card */}
                      <div
                        className="pointer-events-none absolute -inset-px rounded-3xl opacity-40 blur-2xl"
                        style={{ background: `linear-gradient(135deg, ${COLOR.accentA(0.4)}, ${COLOR.violetA(0.2)})`, animation: "pulseGlow 4s ease-in-out infinite" }}
                      />
                      <div
                        className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ background: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.violet})` }}
                      >
                        <Star className="h-3 w-3 fill-current" /> Most popular
                      </div>
                    </>
                  )}
                  <div className="relative flex h-full flex-col">
                    <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: COLOR.textBody }}>{p.name}</div>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span
                        className="text-5xl font-bold tabular-nums transition-all duration-300 group-hover:scale-105"
                        style={{ color: COLOR.textHead }}
                      >
                        {p.price}
                      </span>
                      {p.price !== "Custom" && <span className="text-sm" style={{ color: COLOR.textBody }}>/mo</span>}
                    </div>
                    <p className="mt-3 text-sm" style={{ color: COLOR.textBody }}>{p.desc}</p>

                    <ul className="mt-6 flex-1 space-y-2.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: COLOR.textHead }}>
                          <span
                            className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                            style={{
                              background: featured ? COLOR.accentA(0.2) : COLOR.accentA(0.15),
                              color: COLOR.accent,
                            }}
                          >
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={onTrial}
                      className={cn(
                        "mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5",
                      )}
                      style={
                        featured
                          ? {
                              background: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.violet})`,
                              color: "white",
                              boxShadow: `0 12px 30px -8px ${COLOR.accentA(0.6)}`,
                            }
                          : {
                              border: `1px solid ${COLOR.border}`,
                              background: "rgba(255,255,255,0.04)",
                              color: COLOR.textHead,
                            }
                      }
                    >
                      Start 15-day trial <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={500}>
          <p className="mt-10 text-center text-xs" style={{ color: COLOR.textBody }}>
            All plans include the full SYNQUE module suite during your 15-day trial.
            <br className="sm:hidden" /> Need a custom plan? <button onClick={onTrial} className="font-semibold underline-offset-4 hover:underline" style={{ color: COLOR.accent }}>Talk to sales →</button>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ Act 9: FAQ ------------------------------ */

function Act9FAQ() {
  const COLOR = useColors();
  const [open, setOpen] = React.useState<number | null>(0);
  const faqs = [
    { q: "How is SYNQUE different from Hootsuite or Buffer?", a: "SYNQUE is built for teams, not solo creators. We include AI per-account caption generation (no other tool does this), anti-suspension account safety guards, a unified inbox with sentiment tagging, and a full approval workflow — all in one calm interface. Hootsuite charges $99/mo for features we include free." },
    { q: "Do I need a credit card to start the trial?", a: "No. The 15-day trial gives you full access to every module — composer, calendar, inbox, analytics, approvals, team roles — without a credit card. We'll send you a reminder before it expires, and you can downgrade to the free Starter plan anytime." },
    { q: "Which social platforms are supported?", a: "Seven platforms: Instagram, TikTok, LinkedIn, X (Twitter), Facebook, YouTube, and Threads. Each gets its own optimized caption via AI — respecting tone, length, and hashtag conventions per platform." },
    { q: "How does the anti-suspension protection work?", a: "SYNQUE monitors your posting cadence, blocks banned hashtags, enforces smart cooldowns between posts, and flags risky content before you publish. It's like having a compliance officer built into your scheduler — so your accounts stay safe." },
    { q: "Can my team collaborate on content?", a: "Yes. SYNQUE includes full team workflow: roles (Owner, Manager, Member), approval queues with phone-style previews, comment assignment, and per-member activity tracking. Everyone sees what they need to — nothing more." },
    { q: "What happens to my data if I cancel?", a: "You can export all your posts, analytics, and media at any time via CSV/JSON. If you cancel, your data stays accessible for 30 days, then is permanently deleted. No lock-in, ever." },
    { q: "Is there a free plan?", a: "Yes — the Starter plan is free forever. It includes 1 social account, 25 GB media storage, and core publishing features. Upgrade to Pro ($49/mo) for unlimited accounts, AI composer, and team workflow." },
  ];
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: "transparent" }}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${COLOR.accent}40, ${COLOR.violet}40, transparent)`, backgroundSize: "200% 100%", animation: "dividerSweep 8s linear infinite" }} />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal><Eyebrow icon={MessageCircle} label="Questions" /></Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: COLOR.textHead }}>
              Frequently asked questions
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              Everything you need to know before you start.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * 60}>
                <div
                  className="overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300"
                  style={{
                    background: isOpen ? `linear-gradient(135deg, ${COLOR.accent}08, ${COLOR.violet}08)` : COLOR.cardBg,
                    borderColor: isOpen ? `${COLOR.accent}40` : COLOR.border,
                  }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-base font-semibold sm:text-lg" style={{ color: COLOR.textHead }}>
                      {faq.q}
                    </span>
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-transform duration-300"
                      style={{
                        borderColor: isOpen ? COLOR.accent : COLOR.border,
                        color: isOpen ? COLOR.accent : COLOR.textBody,
                        transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-300 ease-out"
                    style={{
                      maxHeight: isOpen ? 400 : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                  >
                    <p className="px-5 pb-5 text-sm leading-relaxed sm:text-base" style={{ color: COLOR.textBody }}>
                      {faq.a}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Act 10: Final CTA --------------------------- */

function Act10FinalCTA({ onTrial }: { onTrial: () => void }) {
  const COLOR = useColors();
  return (
    <section className="relative w-full overflow-hidden py-32 sm:py-40" style={{ background: "transparent" }}>
      {/* Vibrant aurora orbs — more intense than the page bg */}
      <div className="absolute inset-0" aria-hidden>
        <div
          className="absolute left-1/4 top-1/2 h-[60vh] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${COLOR.accentA(0.5)}, transparent 70%)`,
            animation: "orbDrift1 18s ease-in-out infinite",
          }}
        />
        <div
          className="absolute right-1/4 top-1/2 h-[55vh] w-[55vw] -translate-y-1/2 rounded-full opacity-45 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${COLOR.violetA(0.5)}, transparent 70%)`,
            animation: "orbDrift2 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[45vh] w-[45vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${COLOR.tealA(0.45)}, transparent 70%)`,
            animation: "orbDrift3 20s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <span
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur-md"
            style={{
              borderColor: COLOR.accentA(0.3),
              background: COLOR.accentA(0.08),
              color: COLOR.accent,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" /> The finale
          </span>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="mt-7 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.violet}, ${COLOR.teal})`,
                backgroundSize: "200% 200%",
                animation: "heroGradientShift 8s ease-in-out infinite",
              }}
            >
              Ready to orchestrate
            </span>
            <br />
            <span style={{ color: COLOR.textHead }}>your social?</span>
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
            Join 2,400+ teams using SYNQUE to publish smarter, protect their accounts, and beat the competition.
            Start your 15-day trial — full access, no card to explore.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GlowCTA
              onClick={onTrial}
              className="min-w-[280px] px-8 py-4 text-base"
            >
              <Rocket className="h-5 w-5" /> Start your 15-day trial
            </GlowCTA>
          </div>
        </Reveal>
        <Reveal delay={480}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px]" style={{ color: COLOR.textBody }}>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> Full access for 15 days</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ Act 11: Footer -------------------------- */

function Act11Footer() {
  const COLOR = useColors();
  // Mobile collapsible footer columns — all collapsed on mobile, expanded on
  // desktop (desktop uses `sm:` to always show). Tracked by column title so
  // each column toggles independently.
  const [openCol, setOpenCol] = React.useState<string | null>(null);
  const toggle = (title: string) => setOpenCol((cur) => (cur === title ? null : title));
  return (
    <footer
      className="relative w-full overflow-hidden pt-20 pb-10"
      style={{ background: COLOR.footer, color: COLOR.textHead }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, rgba(148,163,184,0.25), transparent)" }}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo size={28} withTile={false} />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ color: COLOR.textBody }}>
              Orchestrate your social. The enterprise command center for modern social teams.
            </p>
            <div
              className="mt-5 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] backdrop-blur-md"
              style={{ borderColor: COLOR.border, background: COLOR.cardBg, color: COLOR.textBody }}
            >
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: COLOR.accent }} />
              Encrypted · 2FA · SOC2-ready
            </div>
            {/* Social icons */}
            <div className="mt-6 flex gap-2">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-xl border transition"
                  style={{ borderColor: COLOR.border, background: COLOR.cardBg, color: COLOR.textBody }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLOR.accentA(0.4); e.currentTarget.style.color = COLOR.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLOR.border; e.currentTarget.style.color = COLOR.textBody; }}
                  aria-label="social link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <FooterCol title="Product" links={["Features|/features", "Pricing|/pricing", "Compare|/compare", "Integrations|/integrations"]} open={openCol === "Product"} onToggle={() => toggle("Product")} />
          <FooterCol title="Company" links={["About|/about", "Blog|/blog", "Careers|/careers", "Contact|/contact"]} open={openCol === "Company"} onToggle={() => toggle("Company")} />
          <FooterCol title="Resources" links={["Docs|/docs", "Help|/help", "Status|/status", "Changelog|/changelog"]} open={openCol === "Resources"} onToggle={() => toggle("Resources")} />
          <FooterCol title="Legal" links={["Privacy|/privacy", "Terms|/terms", "Security|/security", "DPA|/dpa"]} open={openCol === "Legal"} onToggle={() => toggle("Legal")} />
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row" style={{ borderColor: COLOR.border, color: COLOR.textBody }}>
          <span>© 2026 SYNQUE · Orchestrate Your Social</span>
          <div className="flex gap-5">
            <a href="/privacy" className="transition hover:opacity-80">Privacy</a>
            <a href="/terms" className="transition hover:opacity-80">Terms</a>
            <a href="/security" className="transition hover:opacity-80">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  open,
  onToggle,
}: {
  title: string;
  links: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const COLOR = useColors();
  return (
    <div>
      {/* Mobile: button header that toggles expand/collapse.
          Desktop: static heading, no toggle. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left sm:cursor-default sm:pointer-events-none"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: COLOR.textBody }}>{title}</span>
        {/* Chevron rotates when expanded — only shown on mobile (sm:hidden) */}
        <ChevronDown
          className="h-4 w-4 transition-transform duration-300 sm:hidden"
          style={{
            color: COLOR.textBody,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {/* Links — use 'footer-links' class which is styled in globals.css:
          - Mobile (max-width:639px): collapsible via max-height/opacity
          - Desktop (sm: and up): always visible (max-height:none, opacity:1) */}
      <ul
        className="footer-links mt-4 space-y-2.5"
        data-open={open ? "1" : "0"}
      >
        {links.map((l) => {
          const [text, href] = l.includes("|") ? l.split("|") : [l, "#"];
          return (
            <li key={text}>
              <a href={href} className="text-sm transition hover:opacity-80" style={{ color: COLOR.textBody }}>{text}</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============================================================================
   Trial Activation Dialog — KEPT UNCHANGED
   ============================================================================ */

function TrialDialog({ open, onOpenChange, onActivated }: { open: boolean; onOpenChange: (b: boolean) => void; onActivated: () => void }) {
  const { signup } = useAuth();
  const [step, setStep] = React.useState<"details" | "payment" | "activating" | "done">("details");
  const [form, setForm] = React.useState({
    name: "", email: "", company: "", teamSize: "5-10", phone: "", password: "",
    cardName: "", cardNumber: "", expiry: "", cvc: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setStep("details");
      setErrors({});
    }
  }, [open]);

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.company.trim()) e.company = "Company is required";
    if (!form.password.trim()) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePayment = () => {
    const e: Record<string, string> = {};
    if (!form.cardName.trim()) e.cardName = "Name on card required";
    if (!form.cardNumber.trim()) e.cardNumber = "Card number required";
    else if (form.cardNumber.replace(/\s/g, "").length < 15) e.cardNumber = "Invalid card number";
    if (!form.expiry.trim()) e.expiry = "Expiry required";
    else if (!/^\d{2}\/\d{2}$/.test(form.expiry)) e.expiry = "MM/YY";
    if (!form.cvc.trim()) e.cvc = "CVC required";
    else if (form.cvc.length < 3) e.cvc = "Invalid CVC";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const activate = async () => {
    if (!validatePayment()) return;
    setStep("activating");
    const success = await signup(form.name.trim(), form.email.trim(), form.password);
    if (success) {
      setStep("done");
      setTimeout(onActivated, 1400);
    } else {
      setStep("payment");
      toast.error("Failed to create account. This email may already be registered.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[92vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto p-5 sm:p-6">
        {/* Step indicator */}
        <div className="mb-2 flex items-center gap-2">
          <StepDot n={1} active={step === "details"} done={step !== "details"} />
          <div className={cn("h-px flex-1 transition", step !== "details" ? "bg-[var(--gold)]" : "bg-border")} />
          <StepDot n={2} active={step === "payment" || step === "activating"} done={step === "activating" || step === "done"} />
          <div className={cn("h-px flex-1 transition", step === "done" ? "bg-[var(--gold)]" : "bg-border")} />
          <StepDot n={3} active={step === "done"} done={step === "done"} />
        </div>

        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Rocket className="h-5 w-5 text-[var(--gold)]" /> Start your 15-day trial
              </DialogTitle>
              <DialogDescription>
                Full access to every module. No charge for 15 days. Tell us about your team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Field icon={<Users className="h-3.5 w-3.5" />} label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Maya Reyes" error={errors.name} />
              <Field icon={<MailIcon className="h-3.5 w-3.5" />} label="Work email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="maya@yourcompany.com" error={errors.email} />
              <Field icon={<Building2 className="h-3.5 w-3.5" />} label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Your Company Inc." error={errors.company} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Team size</Label>
                  <Select value={form.teamSize} onValueChange={(v) => setForm({ ...form, teamSize: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-4">1–4 members</SelectItem>
                      <SelectItem value="5-10">5–10 members</SelectItem>
                      <SelectItem value="11-25">11–25 members</SelectItem>
                      <SelectItem value="26-50">26–50 members</SelectItem>
                      <SelectItem value="50+">50+ members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field icon={<PhoneCall className="h-3.5 w-3.5" />} label="Phone (optional)" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1 555 0100" />
              </div>
              <Field icon={<Lock className="h-3.5 w-3.5" />} label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Min 6 characters" error={errors.password} />
              <div className="flex items-start gap-2 rounded-xl bg-[var(--gold)]/5 p-3 text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
                <span>Your card won&apos;t be charged today. You&apos;ll get a reminder 3 days before the trial ends. Cancel anytime.</span>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => onOpenChange(false)} className="min-h-11 rounded-xl border border-border/50 px-4 py-2.5 text-sm font-medium hover:bg-muted sm:w-auto w-full">Cancel</button>
              <button onClick={() => validateDetails() && setStep("payment")} className="liquid-gold glow-ring flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold sm:w-auto">
                Continue to payment <ArrowRight className="h-4 w-4" />
              </button>
            </DialogFooter>
          </>
        )}

        {step === "payment" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-[var(--gold)]" /> Add a payment method
              </DialogTitle>
              <DialogDescription>
                Required to activate your trial. <b className="text-foreground">You won&apos;t be charged</b> for 15 days.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Field icon={<Users className="h-3.5 w-3.5" />} label="Name on card" value={form.cardName} onChange={(v) => setForm({ ...form, cardName: v })} placeholder="Maya Reyes" error={errors.cardName} />
              <div>
                <Label className="text-xs"><span className="flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Card number</span></Label>
                <Input
                  value={form.cardNumber}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
                    setForm({ ...form, cardNumber: v });
                  }}
                  placeholder="4242 4242 4242 4242"
                  className={cn("mt-1.5 font-mono", errors.cardNumber && "border-rose-500/50")}
                />
                {errors.cardNumber && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.cardNumber}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Expiry</Label>
                  <Input
                    value={form.expiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                      setForm({ ...form, expiry: v });
                    }}
                    placeholder="MM/YY"
                    className={cn("mt-1.5", errors.expiry && "border-rose-500/50")}
                  />
                  {errors.expiry && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.expiry}</p>}
                </div>
                <div>
                  <Label className="text-xs"><span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> CVC</span></Label>
                  <Input
                    value={form.cvc}
                    onChange={(e) => setForm({ ...form, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    placeholder="123"
                    className={cn("mt-1.5", errors.cvc && "border-rose-500/50")}
                  />
                  {errors.cvc && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.cvc}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
                <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
                Payments are encrypted (AES-256) and PCI-DSS compliant. We never store your full card number.
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => setStep("details")} className="min-h-11 w-full rounded-xl border border-border/50 px-4 py-2.5 text-sm font-medium hover:bg-muted sm:w-auto">Back</button>
              <button onClick={activate} className="liquid-gold glow-ring flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold sm:w-auto">
                <ShieldCheck className="h-4 w-4" /> Activate trial
              </button>
            </DialogFooter>
          </>
        )}

        {step === "activating" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--gold)]" />
            <h3 className="mt-5 text-lg font-semibold">Activating your trial…</h3>
            <p className="mt-1 text-sm text-muted-foreground">Provisioning workspace, syncing modules</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative mb-4">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
            </div>
            <h3 className="text-xl font-bold">Trial activated! Welcome to SYNQUE.</h3>
            <p className="mt-1 text-sm text-muted-foreground">Account created successfully. Entering your workspace…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={cn(
      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition",
      done ? "bg-[var(--gold)] text-[var(--gold-foreground)]" : active ? "bg-[var(--gold)]/15 text-[var(--gold)] ring-2 ring-[var(--gold)]/30" : "bg-muted text-muted-foreground"
    )}>
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
    </div>
  );
}

function Field({ icon, label, value, onChange, placeholder, error, type = "text" }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; type?: string;
}) {
  return (
    <div>
      <Label className="text-xs"><span className="flex items-center gap-1.5">{icon}{label}</span></Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn("mt-1.5", error && "border-rose-500/50 focus-visible:ring-rose-500/30")} />
      {error && <p className="mt-1 text-[11px] font-medium text-rose-500">{error}</p>}
    </div>
  );
}

/* ============================================================================
   Login Screen — KEPT UNCHANGED
   ============================================================================ */

/* ============================================================================
   LoginAuroraBg — animated gradient mesh background for the login screen.
   Same aesthetic as the landing page AuroraBg but simplified — 3 drifting
   blobs + a subtle grid overlay for depth. Theme-aware (softer in light mode).
   ============================================================================ */

function LoginAuroraBg() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* 3 drifting gradient blobs */}
      <div
        className="absolute rounded-full blur-[100px]"
        style={{
          width: "40rem",
          height: "40rem",
          top: "-10%",
          left: "-5%",
          background: `radial-gradient(circle, ${isDark ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.20)"}, transparent 70%)`,
          animation: "auroraDrift1 25s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute rounded-full blur-[120px]"
        style={{
          width: "35rem",
          height: "35rem",
          bottom: "-10%",
          right: "-5%",
          background: `radial-gradient(circle, ${isDark ? "rgba(139,92,246,0.30)" : "rgba(139,92,246,0.18)"}, transparent 70%)`,
          animation: "auroraDrift2 30s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute rounded-full blur-[90px]"
        style={{
          width: "28rem",
          height: "28rem",
          top: "40%",
          left: "40%",
          background: `radial-gradient(circle, ${isDark ? "rgba(6,182,212,0.20)" : "rgba(6,182,212,0.12)"}, transparent 70%)`,
          animation: "auroraDrift3 28s ease-in-out infinite alternate",
        }}
      />
      {/* Subtle vignette for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at center, transparent 30%, rgba(3,3,8,0.6) 100%)"
            : "radial-gradient(ellipse at center, transparent 30%, rgba(250,251,252,0.4) 100%)",
        }}
      />
    </div>
  );
}

function LoginScreen({ onBack }: { onBack: () => void }) {
  const { login, loginAsDemo, isAuthenticated } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [autoBiometricAttempted, setAutoBiometricAttempted] = React.useState(false);

  // Auto-prompt biometric on page load if supported
  React.useEffect(() => {
    if (typeof window === "undefined" || autoBiometricAttempted) return;
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(async (available) => {
          if (available) {
            try {
              const optsRes = await fetch("/api/webauthn/authenticate/options", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              });
              if (!optsRes.ok) return;
              const options = await optsRes.json();
              const { startAuthentication } = await import("@simplewebauthn/browser");
              const authResp = await startAuthentication({ optionsJSON: options });
              const verifyRes = await fetch("/api/webauthn/authenticate/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ response: authResp }),
              });
              if (verifyRes.ok) {
                const result = await verifyRes.json();
                if (result.verified && result.token) {
                  const existing = JSON.parse(localStorage.getItem("socialflow-auth") || "{}");
                  existing.state = existing.state || {};
                  existing.state.token = result.token;
                  existing.state.user = result.user;
                  existing.state.isAuthenticated = true;
                  existing.version = 0;
                  localStorage.setItem("socialflow-auth", JSON.stringify(existing));
                  // Force reload to pick up auth state
                  window.location.href = "/";
                }
              }
            } catch {
              // User cancelled or no credential
            }
            setAutoBiometricAttempted(true);
          }
        })
        .catch(() => {});
    }
  }, [autoBiometricAttempted]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const success = await login(email.trim(), password);
      if (!success) {
        setError("Invalid email or password. If you're new, start a free trial.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startDemo = async () => {
    setDemoLoading(true);
    setError("");
    try {
      const ok = await loginAsDemo();
      if (!ok) {
        setError("Could not start the demo session. Please try again.");
      }
    } catch {
      setError("Could not start the demo session. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated aurora gradient background — matches landing page aesthetic */}
      <LoginAuroraBg />
      {/* Legacy retaina-bg kept for fallback */}
      <div className="retaina-bg" aria-hidden style={{ display: "none" }}>
        <div className="blob-3" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl lg:grid-cols-2">
          {/* Left — brand panel */}
          <div className="glass-strong crystal-in relative hidden flex-col justify-between p-10 lg:flex">
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[var(--gold)]/15 blur-3xl" />
            <div className="relative">
              <LogoWordmark size="text-xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold leading-tight tracking-tight">
                Welcome back to your <span className="gold-text">command center.</span>
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Sign in to manage your team, publish across every platform, and keep your accounts safe.
              </p>
              <ul className="mt-6 space-y-2.5">
                {["17 integrated modules", "AI per-account content generation", "Account suspension protection", "Custom domain mail server"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--gold)]" />
              Encrypted at rest · 2FA supported · SOC2-ready
            </div>
          </div>

          {/* Right — login form (no role buttons) */}
          <div className="glass crystal-in login-form-container flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            {/* Logo — text only, no tile */}
            <div className="mb-6 flex justify-center">
              <LogoWordmark size="text-xl" />
            </div>

            <button onClick={onBack} className="mb-4 -ml-2 flex min-h-11 items-center gap-1.5 px-2 text-xs text-muted-foreground transition hover:text-foreground">
              <ArrowRight className="h-3 w-3 rotate-180" /> Back to home
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-center">Sign in to SYNQUE</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">Enter your credentials to continue</p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div>
                <label className="label-caps text-muted-foreground">Email</label>
                <div className="relative mt-1.5">
                  <MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--primary)]/50 focus:bg-background/50"
                    placeholder="you@yourcompany.com"
                  />
                </div>
              </div>

              <div>
                <label className="label-caps text-muted-foreground">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-border/50 bg-muted/30 py-3 pl-10 pr-12 text-sm outline-none transition focus:border-[var(--primary)]/50 focus:bg-background/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="accent-[var(--primary)]" defaultChecked /> Remember me
                </label>
                <button type="button" className="min-h-11 px-2 font-medium text-[var(--primary)] hover:underline">Forgot password?</button>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
                  <ShieldAlert className="h-3.5 w-3.5" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="liquid-pill glow-ring flex min-h-11 w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Biometric authentication — Face ID / Fingerprint / Touch ID */}
            <div className="flex flex-col items-center gap-2">
              <BiometricAuth
                mode="login"
                email={email.trim() || undefined}
                onBiometricSuccess={() => {
                  window.location.href = "/";
                }}
              />
            </div>

            {/* Demo credentials — one-click demo login */}
            <button
              type="button"
              onClick={startDemo}
              disabled={demoLoading}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-left transition hover:bg-primary/10 disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary)]/15 text-[var(--primary)]">
                  {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-primary">Try Live Demo</p>
                  <p className="text-[11px] text-muted-foreground">Browse every module as a viewer — no signup needed.</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   Data — Pricing plans
   ============================================================================ */

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    desc: "For solo creators & small teams getting started.",
    features: ["3 social accounts", "1 user", "AI composer (100/mo)", "Basic analytics", "Email support"],
    featured: false,
  },
  {
    name: "Pro",
    price: "$49",
    desc: "For growing teams that publish daily.",
    features: ["15 social accounts", "5 users", "Unlimited AI composer", "Advanced analytics", "Account protection", "Priority support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For large teams with custom needs.",
    features: ["Unlimited accounts", "Unlimited users", "Custom domain mail server", "SSO + SAML", "Dedicated success manager", "99.9% SLA"],
    featured: false,
  },
];
