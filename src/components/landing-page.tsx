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
  Globe,
  TrendingUp,
  Clock,
  ShieldAlert,
  Server,
  Target,
  MessageCircle,
  Star,
  CreditCard,
  Building2,
  PhoneCall,
  Hash,
  Play,
  ChevronDown,
  Send,
  Bot,
  Activity,
  Eye as EyeIcon,
  Gauge,
  KeyRound,
  CalendarClock,
  Minus,
  Edit3,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { Logo, LogoWordmark } from "@/components/glass/logo";
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
   Cinematic Landing — Story Teller (11 Acts)
   ----------------------------------------------------------------------------
   Each act is a full-bleed section with its own deep mystic background colour,
   separated by short gradient "Transition" bands that blend one act's palette
   into the next. Scroll-triggered reveals use a tiny IntersectionObserver hook.
   ============================================================================ */

/* ----------------------------- Hooks & primitives ----------------------- */

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
          obs.unobserve(entry.target);
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

/* CSS particle field — pure CSS animation, JS only generates the dots */
function ParticleField({
  count = 28,
  colors = ["#7DD3FC", "#22D3EE", "#5EEAD4", "#A78BFA"],
  size = [2, 4],
}: { count?: number; colors?: string[]; size?: [number, number] }) {
  const dots = React.useMemo(() => {
    const seed = 1337;
    const rand = (i: number) => {
      const x = Math.sin(seed + i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }).map((_, i) => {
      const s = size[0] + rand(i) * (size[1] - size[0]);
      return {
        left: rand(i * 7 + 1) * 100,
        top: rand(i * 11 + 3) * 100,
        size: s,
        delay: rand(i * 5 + 7) * -20,
        dur: 14 + rand(i * 3 + 9) * 18,
        color: colors[i % colors.length],
        drift: (rand(i * 13 + 2) - 0.5) * 60,
      };
    });
  }, [count, colors, size]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            background: d.color,
            boxShadow: `0 0 ${d.size * 3}px ${d.color}`,
            animation: `sfParticleFloat ${d.dur}s linear ${d.delay}s infinite`,
            ["--drift" as string]: `${d.drift}px`,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

/* Confetti — falling particles for the final CTA */
function ConfettiField({ count = 36 }: { count?: number }) {
  const pieces = React.useMemo(() => {
    const colors = ["#22D3EE", "#5EEAD4", "#A78BFA", "#FBBF24", "#F472B6", "#34D399"];
    const seed = 9001;
    const rand = (i: number) => {
      const x = Math.sin(seed + i * 7.91) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }).map((_, i) => ({
      left: rand(i + 1) * 100,
      delay: rand(i + 11) * -8,
      dur: 5 + rand(i + 21) * 6,
      size: 6 + rand(i + 31) * 8,
      color: colors[i % colors.length],
      rot: rand(i + 41) * 360,
    }));
  }, [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rot}deg)`,
            animation: `sfConfettiFall ${p.dur}s linear ${p.delay}s infinite`,
            opacity: 0.85,
          }}
        />
      ))}
    </div>
  );
}

/* Typing chat bubble — pure CSS steps() typing reveal */
function TypingBubble({
  text,
  durationMs = 4500,
  className,
}: { text: string; durationMs?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const chars = text.length;
  return (
    <div ref={ref} className={cn("relative", className)}>
      <span
        className="inline-block whitespace-pre-wrap align-top"
        style={{
          display: "inline-block",
          maxWidth: "100%",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
          borderRight: "2px solid rgba(167,139,250,0.9)",
          animation: inView
            ? `sfTyping ${durationMs}ms steps(${chars}, end) 0.2s both, sfBlink 0.9s step-end infinite`
            : "none",
        }}
      >
        {text}
      </span>
      <style>{`
        @keyframes sfTyping { from { width: 0; } to { width: 100%; } }
        @keyframes sfBlink { 50% { border-color: transparent; } }
      `}</style>
    </div>
  );
}

/* Growing chart bars — animated height on inView */
function GrowingBars({
  values,
  color = "linear-gradient(to top, #14B8A6, #5EEAD4)",
  className,
  barClassName,
}: {
  values: number[];
  color?: string;
  className?: string;
  barClassName?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("flex h-full items-end gap-1.5", className)}>
      {values.map((v, i) => (
        <span
          key={i}
          className={cn("flex-1 rounded-t-md", barClassName)}
          style={{
            background: color,
            height: inView ? `${v}%` : "0%",
            transition: `height 900ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 70}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* Animated aurora/nebula hero background — pure CSS drifting blobs */
function AuroraHero() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Deep base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, #0E2A4F 0%, #0A1A2F 35%, #050B16 75%, #03060C 100%)",
        }}
      />
      {/* Aurora layers — drifting */}
      <div
        className="absolute -top-[20%] left-[5%] h-[60vh] w-[60vw] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(45,212,191,0.55), transparent 65%)",
          animation: "sfAuroraDrift 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[10%] right-[0%] h-[55vh] w-[55vw] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.55), transparent 65%)",
          animation: "sfAuroraDrift 28s ease-in-out -4s infinite reverse",
        }}
      />
      <div
        className="absolute bottom-[-10%] left-[30%] h-[50vh] w-[60vw] rounded-full opacity-35 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)",
          animation: "sfAuroraDrift 26s ease-in-out -8s infinite",
        }}
      />
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(94,234,212,0.18) 50%, transparent 70%)",
          backgroundSize: "200% 200%",
          animation: "sfShimmerSweep 9s ease-in-out infinite",
        }}
      />
      {/* Subtle starfield */}
      <ParticleField count={36} colors={["#7DD3FC", "#5EEAD4", "#A78BFA", "#E0F2FE"]} size={[1.5, 3]} />
    </div>
  );
}

/* Gradient transition band between two acts */
function Transition({ from, to, height = 180 }: { from: string; to: string; height?: number }) {
  return (
    <div
      aria-hidden
      className="w-full"
      style={{ height, background: `linear-gradient(to bottom, ${from} 0%, ${from} 20%, ${to} 80%, ${to} 100%)` }}
    />
  );
}

/* Eyebrow pill used at the top of each act */
function Eyebrow({
  icon: Icon,
  label,
  color,
}: { icon: LucideIcon; label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md"
      style={{
        background: `${color}1A`,
        borderColor: `${color}40`,
        color,
      }}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

/* A glass card with subtle accent glow + hover lift, themed per act */
function MysticCard({
  accent,
  children,
  className,
  glow = false,
}: {
  accent: string;
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/25",
        className,
      )}
      style={{
        boxShadow: `0 4px 24px -4px rgba(0,0,0,0.3), 0 0 0 1px ${accent}15`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-[0.2] blur-3xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ background: accent }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* Icon tile with colored circle background — BRIGHTER colors for visibility */
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
      className={cn("relative grid place-items-center rounded-xl", dims)}
      style={{ background: `${color}30`, border: `1px solid ${color}50`, boxShadow: `0 4px 12px -4px ${color}40` }}
    >
      <Icon className={cn("relative", ic)} style={{ color, filter: `brightness(1.3)` }} />
    </div>
  );
}

/* Shared glow CTA button — teal/cyan accent */
function GlowCTA({
  children,
  onClick,
  className,
  tone = "teal",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  tone?: "teal" | "violet" | "amber" | "rose" | "emerald" | "indigo";
}) {
  const tones: Record<string, { bg: string; glow: string; text: string }> = {
    teal:    { bg: "linear-gradient(135deg, #14B8A6, #06B6D4)", glow: "rgba(45,212,191,0.65)", text: "#04181A" },
    violet:  { bg: "linear-gradient(135deg, #8B5CF6, #6366F1)", glow: "rgba(139,92,246,0.65)", text: "#11081F" },
    amber:   { bg: "linear-gradient(135deg, #F59E0B, #F97316)", glow: "rgba(251,191,36,0.6)",  text: "#1A1003" },
    rose:    { bg: "linear-gradient(135deg, #F43F5E, #EC4899)", glow: "rgba(244,63,94,0.6)",  text: "#1F0710" },
    emerald: { bg: "linear-gradient(135deg, #10B981, #059669)", glow: "rgba(16,185,129,0.6)", text: "#04140E" },
    indigo:  { bg: "linear-gradient(135deg, #6366F1, #818CF8)", glow: "rgba(99,102,241,0.6)", text: "#0A0A1F" },
  };
  const t = tones[tone];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-7 py-3.5 text-sm font-bold tracking-tight transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]",
        className,
      )}
      style={{
        background: t.bg,
        color: t.text,
        boxShadow: `0 1px 0 rgba(255,255,255,0.4) inset, 0 8px 30px -8px ${t.glow}, 0 0 0 1px rgba(255,255,255,0.1)`,
      }}
    >
      {/* Sheen sweep */}
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full"
        style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)" }}
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
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/10 hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ============================================================================
   Landing — 11 Cinematic Acts
   ============================================================================ */

function Landing({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#03060C] text-white antialiased selection:bg-cyan-400/30">
      <style>{LANDING_KEYFRAMES}</style>
      <CinematicNav onTrial={onTrial} onSignIn={onSignIn} />
      <Act1Hero onTrial={onTrial} onSignIn={onSignIn} />
      <Transition from="#03060C" to="#1A0A0A" />
      <Act2Problem />
      <Transition from="#1A0A0A" to="#0A1F1A" />
      <Act3Solution />
      <Transition from="#0A1F1A" to="#1A1505" />
      <Act4Workflow onTrial={onTrial} />
      <Transition from="#1A1505" to="#1F0A15" />
      <Act5Protection />
      <Transition from="#1F0A15" to="#150A1F" />
      <Act6AIAssistant />
      <Transition from="#150A1F" to="#0A1F1F" />
      <Act7Analytics onTrial={onTrial} />
      <Transition from="#0A1F1F" to="#0F1419" />
      <Act8Comparison />
      <Transition from="#0F1419" to="#0A0A2F" />
      <Act9Pricing onTrial={onTrial} />
      <Transition from="#0A0A2F" to="#03060C" />
      <Act10FinalCTA onTrial={onTrial} />
      <Act11Footer />
    </div>
  );
}

/* --------------------------------- Nav ---------------------------------- */

function CinematicNav({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={cn(
        "fixed left-1/2 top-3 z-50 w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2 rounded-2xl px-4 py-3 transition-all duration-300 sm:w-[calc(100%-2rem)] sm:px-5",
        scrolled
          ? "border border-white/10 bg-[#03060C]/80 backdrop-blur-xl shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)]"
          : "border border-transparent bg-transparent",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={28} withTile={false} />
          <span className="text-base font-bold tracking-tight">SocialFlow</span>
        </div>
        <div className="hidden items-center gap-7 md:flex">
          <a href="#features"  className="text-sm text-white/70 transition hover:text-white">Features</a>
          <a href="#workflow"   className="text-sm text-white/70 transition hover:text-white">Workflow</a>
          <a href="#pricing"    className="text-sm text-white/70 transition hover:text-white">Pricing</a>
          <a href="#compare"    className="text-sm text-white/70 transition hover:text-white">Compare</a>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSignIn}
            className="hidden min-h-10 items-center rounded-xl px-3 text-sm font-medium text-white/70 transition hover:text-white sm:flex"
          >
            Sign in
          </button>
          <GlowCTA onClick={onTrial} className="px-5 py-2.5 text-[13px]" tone="teal">
            <Rocket className="h-4 w-4" /> Start trial
          </GlowCTA>
        </div>
      </div>
    </nav>
  );
}

/* ----------------------------- Act 1: Hero ------------------------------ */

function Act1Hero({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      <AuroraHero />
      {/* Subtle bottom fade into Act 2 */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, #03060C)" }}
      />

      <div className="relative z-20 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 pt-24 pb-32 text-center sm:px-6 lg:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            The enterprise command center for social teams
          </span>
        </Reveal>

        <Reveal delay={120}>
          <h1 className="mt-8 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block text-white">One flow.</span>
            <span
              className="mt-2 block bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(120deg, #5EEAD4, #22D3EE 30%, #A78BFA 60%, #FBBF24 100%)",
                backgroundSize: "200% 200%",
                animation: "sfGradientText 8s ease-in-out infinite",
              }}
            >
              Every platform.
            </span>
            <span className="mt-2 block text-white/95">Zero chaos.</span>
          </h1>
        </Reveal>

        <Reveal delay={240}>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            Your team posts to 7+ platforms every day. Switching tabs, copy-pasting captions,
            praying nothing gets suspended. SocialFlow turns that chaos into one calm, AI-powered flow —
            so your team ships more, faster.
          </p>
        </Reveal>

        <Reveal delay={360}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GlowCTA onClick={onTrial} tone="teal" className="min-w-[260px]">
              <Rocket className="h-4 w-4" /> Start 15-day free trial
            </GlowCTA>
            <OutlineCTA onClick={() => window.location.href = "/login"} className="min-w-[200px]">
              <Play className="h-4 w-4" /> Live Demo
            </OutlineCTA>
          </div>
        </Reveal>

        <Reveal delay={480}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/60">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> 25GB free media storage</span>
          </div>
        </Reveal>

        {/* Scroll indicator */}
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2">
          <ChevronDown
            className="h-6 w-6 text-white/40"
            style={{ animation: "sfChevronBounce 1.8s ease-in-out infinite" }}
          />
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Act 2: Problem ----------------------------- */

function Act2Problem() {
  const problems = [
    { icon: Layers,       t: "7 tabs open",          d: "Instagram, X, LinkedIn, TikTok… each its own tab. Copy-paste fatigue is real.", accent: "#F87171" },
    { icon: ShieldAlert,  t: "Accounts suspended",  d: "Your team posts too fast, uses banned hashtags, gets flagged — and gone.",         accent: "#FB7185" },
    { icon: Clock,        t: "Content stuck",        d: "Drafts live in DMs and spreadsheets. Nobody knows what's ready to publish.",   accent: "#FBBF24" },
    { icon: MessageCircle,t: "Inbox chaos",          d: "Comments scattered across 10 accounts. Half of them go unanswered.",          accent: "#C084FC" },
  ];
  return (
    <section
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "linear-gradient(180deg, #1A0A0A 0%, #2A0A0A 50%, #1A0A0A 100%)" }}
    >
      {/* Faint red aurora */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(244,63,94,0.18), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(220,38,38,0.18), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={ShieldAlert} label="The old way" color="#F87171" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Social media management is <span className="text-rose-400">broken</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
              Teams waste hours every day context-switching between tools. Accounts get suspended.
              Content gets lost. Here&apos;s what your team deals with right now:
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p, i) => (
            <Reveal key={p.t} delay={i * 120}>
              <MysticCard accent={p.accent} glow className="h-full p-6">
                <div
                  className="absolute inset-0 -z-10 rounded-3xl opacity-50"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${p.accent}25, transparent 70%)`,
                    animation: "sfPulseGlow 3s ease-in-out infinite",
                    ["--glow" as string]: `${p.accent}40`,
                  }}
                />
                <IconTile icon={p.icon} color={p.accent} size="lg" />
                <h3 className="mt-5 text-lg font-bold text-white">{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{p.d}</p>
              </MysticCard>
            </Reveal>
          ))}
        </div>

        {/* Pain stat strip */}
        <Reveal delay={500}>
          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/5 sm:grid-cols-4">
            {[
              { v: "11 hrs",  l: "Lost weekly per teammate to tab-switching" },
              { v: "1 in 4",  l: "Accounts suspended in their first 90 days" },
              { v: "$3.2K",   l: "Average cost per missed campaign deadline" },
              { v: "62%",     l: "Of DMs go unanswered within 24 hours" },
            ].map((s) => (
              <div key={s.l} className="bg-black/30 p-6 text-center">
                <div className="text-3xl font-bold text-rose-400 sm:text-4xl">{s.v}</div>
                <div className="mt-2 text-[11px] uppercase tracking-wider text-white/55">{s.l}</div>
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
  return (
    <section
      id="features"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "linear-gradient(180deg, #0A1F1A 0%, #0D2820 50%, #0A1F1A 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 20% 30%, rgba(16,185,129,0.18), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(45,212,191,0.18), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Sparkles} label="The SocialFlow way" color="#34D399" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Everything your team needs to <span className="text-emerald-400">win social</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
              From ideation to publishing to protection — one premium platform, 9 integrated modules.
              Each built for teams that ship daily.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <MysticCard accent={f.accent} className="h-full p-6">
                <div className="flex items-start justify-between">
                  <IconTile icon={f.icon} color={f.accent} />
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-white/40 transition group-hover:bg-white/10 group-hover:text-white/80"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{f.desc}</p>
              </MysticCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Act 4: Workflow ---------------------------- */

function Act4Workflow({ onTrial }: { onTrial: () => void }) {
  const steps = [
    { n: "01", icon: Edit3, t: "Write brief",       d: "One caption, tone, and goal — that's it.",       accent: "#FBBF24" },
    { n: "02", icon: Wand2, t: "AI generates variants", d: "Distinct, platform-native captions per account.", accent: "#F59E0B" },
    { n: "03", icon: ImageIcon, t: "Add media",     d: "Drop your image or video once. We adapt it.",    accent: "#F97316" },
    { n: "04", icon: Eye,   t: "Review",            d: "Phone-style previews per platform before publish.", accent: "#FB923C" },
    { n: "05", icon: Send,  t: "Publish",           d: "One click sends it everywhere — or queues it.",  accent: "#22D3EE" },
  ];
  return (
    <section
      id="workflow"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "linear-gradient(180deg, #1A1505 0%, #2A1F0A 50%, #1A1505 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 25% 30%, rgba(251,191,36,0.18), transparent 60%), radial-gradient(ellipse at 75% 80%, rgba(249,115,22,0.15), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Zap} label="The SocialFlow flow" color="#FBBF24" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Write once. Publish <span className="text-amber-400">everywhere.</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
              Compose one brief. Our AI generates distinct, platform-native captions for every account —
              respecting each platform&apos;s tone, length, and hashtag conventions.
            </p>
          </Reveal>
        </div>

        {/* Horizontal step flow */}
        <Reveal delay={300}>
          <div className="mt-16 hidden lg:block">
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-0 right-0 top-7 h-px bg-gradient-to-r from-amber-500/10 via-amber-400/50 to-cyan-400/50" />
              <div className="grid grid-cols-5 gap-3">
                {steps.map((s, i) => (
                  <Reveal key={s.n} delay={i * 120}>
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="relative grid h-14 w-14 place-items-center rounded-2xl border backdrop-blur-md"
                        style={{
                          background: `${s.accent}1F`,
                          borderColor: `${s.accent}55`,
                          boxShadow: `0 0 30px -8px ${s.accent}80`,
                        }}
                      >
                        <s.icon className="h-6 w-6" style={{ color: s.accent }} />
                      </div>
                      <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{s.n}</div>
                      <div className="mt-1 text-sm font-bold text-white">{s.t}</div>
                      <div className="mt-1 text-xs text-white/60">{s.d}</div>
                      {/* Progress bar */}
                      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: s.accent,
                            animation: "sfBarGrow 1.2s cubic-bezier(0.34,1.56,0.64,1) both",
                            animationDelay: `${0.3 + i * 0.15}s`,
                            ["--target-w" as string]: `${(i + 1) * 20}%`,
                            width: `${(i + 1) * 20}%`,
                          }}
                        />
                      </div>
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
            <div className="absolute left-[26px] top-2 bottom-2 w-px bg-gradient-to-b from-amber-400/50 via-amber-500/30 to-cyan-400/50" />
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="relative flex items-start gap-4">
                  <div
                    className="absolute -left-8 grid h-12 w-12 place-items-center rounded-2xl border backdrop-blur-md"
                    style={{
                      background: `${s.accent}1F`,
                      borderColor: `${s.accent}55`,
                      boxShadow: `0 0 20px -6px ${s.accent}80`,
                    }}
                  >
                    <s.icon className="h-5 w-5" style={{ color: s.accent }} />
                  </div>
                  <div className="ml-4 flex-1 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{s.n}</div>
                    <div className="text-sm font-bold text-white">{s.t}</div>
                    <div className="mt-1 text-xs text-white/60">{s.d}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={500}>
          <div className="mt-14 flex justify-center">
            <GlowCTA onClick={onTrial} tone="amber">
              <Wand2 className="h-4 w-4" /> Try the composer
            </GlowCTA>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------- Act 5: Protection -------------------------- */

function Act5Protection() {
  const features = [
    { icon: CalendarClock, t: "Daily post limits",     d: "Hard caps per account per platform. Auto-pause when threshold approaches." },
    { icon: Hash,          t: "Hashtag safety checker", d: "Every caption scanned against shadowbanned tag lists before publish." },
    { icon: Gauge,         t: "Warm-up mode",           d: "New accounts ramp activity gradually to build trust and avoid flags." },
    { icon: KeyRound,      t: "2FA enforcement",         d: "Require two-factor auth for every team member. No exceptions." },
  ];
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: "linear-gradient(180deg, #1F0A15 0%, #2A0F1F 50%, #1F0A15 100%)" }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(244,63,94,0.2), transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(236,72,153,0.18), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — shield animation */}
          <Reveal>
            <div className="relative mx-auto flex aspect-square max-w-md items-center justify-center">
              {/* Pulsing rings */}
              {[0, 1, 2].map((r) => (
                <div
                  key={r}
                  className="absolute rounded-full border border-rose-400/30"
                  style={{
                    width: `${40 + r * 22}%`,
                    height: `${40 + r * 22}%`,
                    animation: `sfPulseRing 3s ease-out infinite ${r * 0.6}s`,
                  }}
                />
              ))}
              {/* Glow */}
              <div
                className="absolute h-72 w-72 rounded-full opacity-60 blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(244,63,94,0.6), transparent 70%)" }}
              />
              {/* Shield */}
              <div
                className="relative grid h-44 w-44 place-items-center rounded-[2.5rem] border border-rose-400/40 bg-rose-950/40 backdrop-blur-xl"
                style={{ animation: "sfShieldPulse 3.5s ease-in-out infinite" }}
              >
                <ShieldCheck className="h-20 w-20 text-rose-300" strokeWidth={1.5} />
              </div>
              {/* Floating tags */}
              <FloatingTag className="left-2 top-10" icon={Hash} label="No shadowbans" color="#FB7185" delay={0} />
              <FloatingTag className="right-2 top-24" icon={Gauge} label="Warm-up safe" color="#F472B6" delay={1} />
              <FloatingTag className="bottom-8 left-6" icon={KeyRound} label="2FA enforced" color="#C084FC" delay={2} />
              <FloatingTag className="bottom-12 right-4" icon={CalendarClock} label="Cadence cap" color="#F87171" delay={1.5} />
            </div>
          </Reveal>

          {/* Right — copy + features */}
          <div>
            <Reveal>
              <Eyebrow icon={ShieldCheck} label="Account protection" color="#F87171" />
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                Never get <span className="text-rose-400">suspended</span> again
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-5 text-base text-white/70 sm:text-lg">
                SocialFlow monitors every account&apos;s health in real time. When risk rises —
                from spam flags, report spikes, or aggressive engagement — we tell you exactly what
                to fix and auto-enforce guards so your team can&apos;t accidentally trigger a suspension.
              </p>
            </Reveal>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {features.map((f, i) => (
                <Reveal key={f.t} delay={i * 100}>
                  <div className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition hover:border-rose-400/30 hover:bg-rose-950/20">
                    <IconTile icon={f.icon} color="#F87171" size="sm" />
                    <div>
                      <div className="text-sm font-bold text-white">{f.t}</div>
                      <div className="mt-0.5 text-xs text-white/60">{f.d}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingTag({
  className,
  icon: Icon,
  label,
  color,
  delay,
}: {
  className?: string;
  icon: LucideIcon;
  label: string;
  color: string;
  delay: number;
}) {
  return (
    <div
      className={cn(
        "absolute flex items-center gap-1.5 rounded-full border bg-black/40 px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md",
        className,
      )}
      style={{ borderColor: `${color}55`, color, animation: `sfFloat3 4s ease-in-out ${delay}s infinite` }}
    >
      <Icon className="h-3 w-3" /> {label}
    </div>
  );
}

/* ------------------------- Act 6: AI Assistant -------------------------- */

function Act6AIAssistant() {
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: "linear-gradient(180deg, #150A1F 0%, #1F0A2A 50%, #150A1F 100%)" }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(139,92,246,0.2), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(168,85,247,0.18), transparent 60%)",
        }}
      />
      <ParticleField count={24} colors={["#A78BFA", "#C4B5FD", "#7DD3FC"]} size={[2, 3]} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — copy */}
          <div>
            <Reveal>
              <Eyebrow icon={Bot} label="AI Assistant" color="#A78BFA" />
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Your AI-powered <span className="text-violet-400">command center</span>
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-5 text-base text-white/70 sm:text-lg">
                Ask SocialFlow anything about your accounts. Get instant answers — performance,
                scheduling, recommendations. Your AI co-pilot lives right inside the dashboard.
              </p>
            </Reveal>
            <div className="mt-8 space-y-3">
              {[
                { q: "What should I post next?", a: "Based on your top content this week — try a behind-the-scenes Reel." },
                { q: "When does my audience engage most?", a: "Tuesday & Thursday 7–9pm in your audience's timezone." },
                { q: "Which account is at risk?", a: "@prismhq has elevated risk. Slow posting for 48h advised." },
              ].map((c, i) => (
                <Reveal key={c.q} delay={i * 120}>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition hover:border-violet-400/30">
                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                      <Bot className="h-3.5 w-3.5" /> You asked
                      <span className="text-white/70">— “{c.q}”</span>
                    </div>
                    <div className="mt-2 flex items-start gap-2 text-sm text-white/80">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                      <span>{c.a}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right — chat mockup */}
          <Reveal delay={300}>
            <div className="relative">
              {/* Floating AI badge */}
              <div className="absolute -right-4 -top-4 z-10 flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-950/60 px-3 py-1.5 text-[11px] font-bold text-violet-300 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400" />
                </span>
                AI Online
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#1B0F2E]/80 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(139,92,246,0.5)]">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">SocialFlow AI</div>
                    <div className="text-[11px] text-white/50">Workspace · Prism Studio</div>
                  </div>
                  <div className="ml-auto flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400/70" />
                    <span className="h-2 w-2 rounded-full bg-amber-400/70" />
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 p-5">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-white/10 bg-white/10 px-4 py-2.5 text-sm text-white/90">
                      How many posts did we publish this week?
                    </div>
                  </div>
                  {/* AI typing message */}
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-violet-400/20 bg-violet-950/40 px-4 py-3 text-sm text-violet-100">
                      <TypingBubble
                        text="You published 12 posts across 3 platforms this week — 7 on Instagram, 3 on X, 2 on LinkedIn. Engagement is up 18% vs. last week. Top performer: your Tuesday Reel."
                        durationMs={5200}
                      />
                    </div>
                  </div>

                  {/* Suggested chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Show me chart", "Draft next week", "Flag risky account"].map((s) => (
                      <span key={s} className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium text-violet-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 border-t border-white/10 p-3">
                  <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/40">
                    Ask anything about your social presence…
                  </div>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-xl text-white"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #6366F1)" }}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Floating KPI chips */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { l: "Posts", v: "12", c: "#A78BFA" },
                  { l: "Reach", v: "2.4M", c: "#22D3EE" },
                  { l: "Engagement", v: "+18%", c: "#34D399" },
                ].map((k) => (
                  <div key={k.l} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur-md">
                    <div className="text-lg font-bold" style={{ color: k.c }}>{k.v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-white/50">{k.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------- Act 7: Analytics ----------------------------- */

function Act7Analytics({ onTrial }: { onTrial: () => void }) {
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: "linear-gradient(180deg, #0A1F1F 0%, #0D2525 50%, #0A1F1F 100%)" }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 20% 30%, rgba(45,212,191,0.18), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(34,211,238,0.16), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Activity} label="Analytics" color="#2DD4BF" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              See your growth in <span className="text-teal-400">real-time</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
              Track followers, reach, and engagement across every platform — unified, beautiful, alive.
            </p>
          </Reveal>
        </div>

        {/* KPI cards */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "Followers",   v: "1.62M", d: "+1.2%",  icon: Users,      color: "#2DD4BF" },
            { l: "Reach",       v: "2.41M", d: "+18%",   icon: EyeIcon,    color: "#22D3EE" },
            { l: "Engagement",  v: "191K",  d: "+4.5%",  icon: TrendingUp, color: "#34D399" },
            { l: "Posts",       v: "342",   d: "+12",    icon: Layers,     color: "#5EEAD4" },
          ].map((k, i) => (
            <Reveal key={k.l} delay={i * 100}>
              <MysticCard accent={k.color} className="h-full p-5">
                <div className="flex items-center justify-between">
                  <IconTile icon={k.icon} color={k.color} size="sm" />
                  <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    {k.d}
                  </span>
                </div>
                <div className="mt-4 text-3xl font-bold text-white tabular-nums">{k.v}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-white/55">{k.l}</div>
              </MysticCard>
            </Reveal>
          ))}
        </div>

        {/* Chart mockup */}
        <Reveal delay={400}>
          <MysticCard accent="#2DD4BF" className="mt-6 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Performance trend</div>
                <div className="text-[11px] text-white/55">Last 14 days · all platforms</div>
              </div>
              <div className="flex gap-2">
                {["7d", "14d", "30d", "90d"].map((p, i) => (
                  <span
                    key={p}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-semibold",
                      i === 1 ? "bg-teal-400/20 text-teal-300" : "bg-white/5 text-white/50",
                    )}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
            {/* Bar chart */}
            <div className="mt-6 h-44">
              <GrowingBars
                values={[35, 48, 42, 58, 65, 52, 70, 78, 68, 82, 75, 90, 85, 95]}
                color="linear-gradient(to top, #0F766E, #2DD4BF, #5EEAD4)"
                className="h-full"
              />
            </div>
            {/* X-axis */}
            <div className="mt-2 flex justify-between text-[10px] text-white/40">
              {["Mon", "Wed", "Fri", "Sun", "Tue", "Thu", "Sat"].map((d, i) => (
                <span key={d + i}>{d}</span>
              ))}
            </div>

            {/* Platform breakdown */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { l: "Instagram", v: "1.1M", c: "#F472B6", w: 78 },
                { l: "X / Twitter", v: "620K", c: "#5EEAD4", w: 55 },
                { l: "LinkedIn", v: "690K", c: "#22D3EE", w: 61 },
              ].map((p) => (
                <div key={p.l} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/80">{p.l}</span>
                    <span className="font-bold tabular-nums" style={{ color: p.c }}>{p.v}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.w}%`,
                        background: p.c,
                        animation: "sfBarGrow 1.4s cubic-bezier(0.34,1.56,0.64,1) 0.4s both",
                        ["--target-w" as string]: `${p.w}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </MysticCard>
        </Reveal>

        <Reveal delay={600}>
          <div className="mt-10 flex justify-center">
            <GlowCTA onClick={onTrial} tone="teal">
              <BarChart3 className="h-4 w-4" /> Explore your analytics
            </GlowCTA>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------- Act 8: Comparison --------------------------- */

function Act8Comparison() {
  const rows = COMPARE_ROWS;
  const competitors = ["SocialFlow", "Hootsuite", "Buffer", "Sprout Social"];
  return (
    <section
      id="compare"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "linear-gradient(180deg, #0F1419 0%, #151B22 50%, #0F1419 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(45,212,191,0.16), transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(99,102,241,0.14), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Target} label="Competitor comparison" color="#5EEAD4" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Why settle for <span className="text-teal-400">less?</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
              The only platform that combines AI content, multi-tenant isolation, and account protection in one workspace.
            </p>
          </Reveal>
        </div>

        <Reveal delay={300}>
          <div className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
            {/* Header row */}
            <div className="grid grid-cols-5 border-b border-white/10 bg-white/[0.02]">
              <div className="px-4 py-5 text-xs font-semibold uppercase tracking-wider text-white/55 sm:px-6">
                Capability
              </div>
              {competitors.map((c, i) => (
                <div
                  key={c}
                  className={cn(
                    "px-2 py-5 text-center sm:px-6",
                    i === 0 && "bg-gradient-to-b from-teal-500/15 to-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "text-xs font-bold sm:text-sm",
                      i === 0 ? "text-teal-300" : "text-white/70",
                    )}
                  >
                    {c}
                  </div>
                  {i === 0 && (
                    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-teal-300">
                      <Star className="h-2.5 w-2.5" /> Best
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Body rows */}
            {rows.map((r, ri) => (
              <div
                key={r.label}
                className={cn(
                  "grid grid-cols-5 items-center border-b border-white/5 last:border-b-0",
                  ri % 2 === 0 ? "bg-white/[0.01]" : "",
                )}
              >
                <div className="flex items-center gap-2 px-4 py-4 text-sm font-medium text-white/85 sm:px-6">
                  <r.icon className="h-4 w-4 shrink-0 text-white/50" />
                  <span className="hidden sm:inline">{r.label}</span>
                  <span className="sm:hidden">{r.short}</span>
                </div>
                {r.values.map((v, i) => (
                  <div
                    key={i}
                    className={cn(
                      "px-2 py-4 text-center sm:px-6",
                      i === 0 && "bg-gradient-to-b from-teal-500/[0.06] to-transparent",
                    )}
                  >
                    {v === true ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-teal-400/15 text-teal-300">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    ) : v === false ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/30">
                        <Minus className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="text-xs text-white/50">{v}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------- Act 9: Pricing -------------------------- */

function Act9Pricing({ onTrial }: { onTrial: () => void }) {
  return (
    <section
      id="pricing"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: "linear-gradient(180deg, #0A0A2F 0%, #0F0F35 50%, #0A0A2F 100%)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.2), transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(139,92,246,0.18), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={CreditCard} label="Pricing" color="#818CF8" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Start with a <span className="text-indigo-300">15-day free trial</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base text-white/70 sm:text-lg">
              No card to explore. Pick a plan when you&apos;re ready. Cancel anytime.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid items-stretch gap-5 lg:grid-cols-3">
          {PLANS.map((p, i) => {
            const featured = p.featured;
            return (
              <Reveal key={p.name} delay={i * 120}>
                <div
                  className={cn(
                    "group relative flex h-full flex-col overflow-hidden rounded-3xl border p-7 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5",
                    featured
                      ? "border-indigo-400/40 bg-gradient-to-b from-indigo-500/15 to-violet-500/5 shadow-[0_30px_80px_-30px_rgba(99,102,241,0.6)]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20",
                  )}
                >
                  {featured && (
                    <>
                      <div
                        className="pointer-events-none absolute -inset-px rounded-3xl opacity-50 blur-2xl"
                        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.2))" }}
                      />
                      <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-indigo-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-950">
                        <Star className="h-3 w-3 fill-current" /> Most popular
                      </div>
                    </>
                  )}
                  <div className="relative flex h-full flex-col">
                    <div className="text-sm font-semibold uppercase tracking-wider text-white/60">{p.name}</div>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "text-5xl font-bold tabular-nums transition-all duration-300 group-hover:scale-105",
                          featured ? "text-white" : "text-white/95",
                        )}
                        style={{ textShadow: featured ? "0 0 30px rgba(129,140,248,0.5)" : undefined }}
                      >
                        {p.price}
                      </span>
                      {p.price !== "Custom" && <span className="text-sm text-white/50">/mo</span>}
                    </div>
                    <p className="mt-3 text-sm text-white/60">{p.desc}</p>

                    <ul className="mt-6 flex-1 space-y-2.5">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-white/85">
                          <span
                            className={cn(
                              "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                              featured ? "bg-indigo-400/20 text-indigo-300" : "bg-emerald-400/15 text-emerald-300",
                            )}
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
                        featured
                          ? "text-indigo-950 hover:brightness-110"
                          : "border border-white/20 bg-white/5 text-white hover:bg-white/10",
                      )}
                      style={
                        featured
                          ? { background: "linear-gradient(135deg, #818CF8, #6366F1)", boxShadow: "0 12px 30px -8px rgba(99,102,241,0.6)" }
                          : undefined
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
          <p className="mt-10 text-center text-xs text-white/50">
            All plans include the full SocialFlow module suite during your 15-day trial.
            <br className="sm:hidden" /> Need a custom plan? <button onClick={onTrial} className="font-semibold text-indigo-300 underline-offset-4 hover:underline">Talk to sales →</button>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------- Act 10: Final CTA -------------------------- */

function Act10FinalCTA({ onTrial }: { onTrial: () => void }) {
  return (
    <section className="relative w-full overflow-hidden py-32 sm:py-40">
      {/* Aurora finale background */}
      <div className="absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, #0A1A2F 0%, #0F2A4F 20%, #0E3A3D 40%, #1F0A2A 60%, #2A1F0A 80%, #0A1A2F 100%)",
            backgroundSize: "300% 300%",
            animation: "sfGradientText 14s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -top-20 left-1/4 h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(45,212,191,0.6), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.5), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.5), transparent 70%)" }}
        />
        <ConfettiField count={48} />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <span
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5" /> Aurora finale
          </span>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="mt-7 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(120deg, #5EEAD4, #22D3EE, #A78BFA, #FBBF24)",
                backgroundSize: "200% 200%",
                animation: "sfGradientText 8s ease-in-out infinite",
              }}
            >
              Ready to simplify
            </span>
            <br />
            <span className="text-white">your social team?</span>
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <p className="mx-auto mt-6 max-w-xl text-base text-white/75 sm:text-lg">
            Join the teams using SocialFlow to publish smarter, protect their accounts, and beat the competition.
            Start your 15-day trial — full access, no card to explore.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GlowCTA onClick={onTrial} tone="teal" className="min-w-[280px] px-8 py-4 text-base">
              <Rocket className="h-5 w-5" /> Start your 15-day trial
            </GlowCTA>
          </div>
        </Reveal>
        <Reveal delay={480}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-white/70">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-400" /> Full access for 15 days</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ Act 11: Footer ------------------------- */

function Act11Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-[#0A0A0A] pt-20 pb-10 text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, rgba(94,234,212,0.4), transparent)" }}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo size={28} withTile={false} />
              <span className="text-base font-bold tracking-tight">SocialFlow</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
              Social, Simplified. The enterprise command center for modern social teams.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/55">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
              Encrypted · 2FA · SOC2-ready
            </div>
            {/* Social icons */}
            <div className="mt-6 flex gap-2">
              {[Globe, MessageCircle, Send, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:border-teal-400/30 hover:bg-teal-400/10 hover:text-teal-300"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <FooterCol title="Product" links={["Features|/features", "Workflow|/workflow", "Pricing|/pricing", "AI Composer|/ai-composer", "Account Protection|/protection"]} />
          <FooterCol title="Company" links={["About|/about", "Customers|/customers", "Blog|/blog", "Careers|/careers", "Contact|/contact"]} />
          <FooterCol title="Resources" links={["Documentation|/docs", "API Reference|/api-reference", "Help Center|/help", "Status|/status", "Changelog|/changelog"]} />
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <span>© 2026 SocialFlow · Social, Simplified</span>
          <div className="flex gap-5">
            <a href="#" className="transition hover:text-white">Privacy</a>
            <a href="#" className="transition hover:text-white">Terms</a>
            <a href="#" className="transition hover:text-white">Security</a>
            <a href="#" className="transition hover:text-white">Legal</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">{title}</div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => {
          const [text, href] = l.includes("|") ? l.split("|") : [l, "#"];
          return (
            <li key={text}>
              <a href={href} className="text-sm text-white/70 transition hover:text-teal-300">{text}</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============================================================================
   Inline keyframes — injected once via <style> in the Landing wrapper.
   ============================================================================ */

const LANDING_KEYFRAMES = `
@keyframes sfAuroraDrift {
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(8%, -6%) scale(1.1); }
  66%  { transform: translate(-6%, 4%) scale(0.95); }
  100% { transform: translate(0, 0) scale(1); }
}
@keyframes sfShimmerSweep {
  0%   { background-position: 0% 50%; opacity: 0.15; }
  50%  { background-position: 100% 50%; opacity: 0.3; }
  100% { background-position: 0% 50%; opacity: 0.15; }
}
@keyframes sfGradientText {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
@keyframes sfParticleFloat {
  0%   { transform: translate(0, 0); opacity: 0; }
  10%  { opacity: 0.8; }
  90%  { opacity: 0.8; }
  100% { transform: translate(var(--drift, 20px), -120vh); opacity: 0; }
}
@keyframes sfPulseGlow {
  0%, 100% { box-shadow: 0 0 30px -10px var(--glow, rgba(244,63,94,0.4)); opacity: 0.6; }
  50%      { box-shadow: 0 0 70px 0 var(--glow, rgba(244,63,94,0.7)); opacity: 1; }
}
@keyframes sfShieldPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 25px rgba(244,63,94,0.5)); }
  50%      { transform: scale(1.04); filter: drop-shadow(0 0 50px rgba(244,63,94,0.8)); }
}
@keyframes sfPulseRing {
  0%   { transform: scale(0.8); opacity: 0.8; border-width: 1.5px; }
  100% { transform: scale(1.8); opacity: 0; border-width: 0.5px; }
}
@keyframes sfTyping { from { width: 0; } to { width: 100%; } }
@keyframes sfBlink { 50% { border-color: transparent; } }
@keyframes sfBarGrow {
  from { width: 0; height: var(--from-h, auto); }
  to   { width: var(--target-w, 100%); }
}
@keyframes sfChevronBounce {
  0%, 100% { transform: translateY(0); opacity: 0.4; }
  50%      { transform: translateY(8px); opacity: 1; }
}
@keyframes sfConfettiFall {
  0%   { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
@keyframes sfFloat3 {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-10px); }
}
@keyframes sfSpinSlow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

/* ============================================================================
   Trial Activation Dialog (unchanged from previous build)
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
    // Create the real user account via the signup API
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
            <h3 className="text-xl font-bold">Trial activated! Welcome to SocialFlow.</h3>
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
   Login Screen (unchanged from previous build)
   ============================================================================ */

function LoginScreen({ onBack }: { onBack: () => void }) {
  const { login } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    setError("");
    const success = await login(email.trim(), password);
    if (!success) {
      setError("Invalid email or password. If you're new, start a free trial.");
      setLoading(false);
    }
    // If success, the auth store updates isAuthenticated and page.tsx switches to AppShell
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="retaina-bg" aria-hidden>
        <div className="blob-3" />
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
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
            {/* Splash logo with ripple */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="login-splash-ripple" />
                <div className="login-splash-logo grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[oklch(0.55_0.2_280)] text-2xl font-extrabold text-white shadow-lg">
                  SF
                </div>
              </div>
            </div>

            <button onClick={onBack} className="mb-4 -ml-2 flex min-h-11 items-center gap-1.5 px-2 text-xs text-muted-foreground transition hover:text-foreground">
              <ArrowRight className="h-3 w-3 rotate-180" /> Back to home
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-center">Sign in to SocialFlow</h1>
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

            {/* Demo credentials */}
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-[11px] font-semibold text-primary">Want to try it first?</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Demo account: <span className="font-mono font-semibold">demo@socialflow.app</span> · Password: <span className="font-mono font-semibold">demo1234</span>
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              New to SocialFlow?{" "}
              <button onClick={onBack} className="inline-flex min-h-11 items-center px-2 font-medium text-[var(--primary)] hover:underline">
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   Data — Features, Plans, Comparison
   ============================================================================ */

const FEATURES = [
  { icon: Wand2,        title: "AI Composer",         desc: "Generate distinct, platform-native captions for every account from one brief — respecting tone, length & hashtag conventions.", accent: "#22D3EE" },
  { icon: ShieldCheck,  title: "Account Protection",  desc: "Anti-suspension guards: posting cadence limits, banned-hashtag blocker, behavior caps, smart cooldowns, and a suspension advisor.", accent: "#34D399" },
  { icon: BarChart3,   title: "Advanced Analytics",  desc: "Deep insights across every platform — impressions, reach, engagement, audience growth, per-account comparison.", accent: "#A78BFA" },
  { icon: Users,       title: "Team & Roles",         desc: "Granular permissions per user — admin, manager, editor, member, viewer. Designations, departments, and access control.", accent: "#F472B6" },
  { icon: Calendar,     title: "Content Calendar",    desc: "Plan and schedule your entire content pipeline with a visual month grid and drag-friendly scheduling.", accent: "#FBBF24" },
  { icon: Server,       title: "Mail Server",         desc: "Host your team's email on your own domain — Hostinger, cPanel, Zoho or any provider. Create mailboxes, no Google needed.", accent: "#5EEAD4" },
  { icon: MessageCircle,title: "Unified Inbox",       desc: "Comments and DMs from every account in one inbox. Sentiment-tagged, assignable, reply-ready.", accent: "#22D3EE" },
  { icon: Target,       title: "Competitor Tracking", desc: "Benchmark rivals with follower-growth charts, engagement comparisons, and posting-frequency insights.", accent: "#818CF8" },
  { icon: Hash,         title: "Hashtag Manager",     desc: "Save reusable hashtag groups per platform, track trending tags, and block shadowbanned hashtags.", accent: "#34D399" },
];

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    desc: "For solo creators & small teams getting started.",
    features: ["3 social accounts", "1 user", "AI composer (100/mo)", "Basic analytics", "Email support"],
    featured: false,
  },
  {
    name: "Growth",
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

type CompareRow = {
  label: string;
  short: string;
  icon: LucideIcon;
  values: [boolean | string, boolean | string, boolean | string, boolean | string];
};

const COMPARE_ROWS: CompareRow[] = [
  { label: "AI Writer (per-account)",          short: "AI Writer",          icon: Wand2,        values: [true,  false, false, "Add-on"] },
  { label: "Multi-tenant workspaces",           short: "Multi-tenant",       icon: Building2,    values: [true,  false, false, true] },
  { label: "WhatsApp integration",             short: "WhatsApp",           icon: MessageCircle,values: [true,  false, false, false] },
  { label: "Cloudinary CDN media",             short: "Cloudinary CDN",     icon: Layers,       values: [true,  false, false, true] },
  { label: "Custom roles & departments",        short: "Custom Roles",      icon: Users,        values: [true,  true,  false, true] },
  { label: "Tenant DB isolation",              short: "Tenant DB",          icon: Server,       values: [true,  false, false, true] },
  { label: "Dedicated scheduler service",       short: "Scheduler",         icon: CalendarClock,values: [true,  true,  true,  true] },
  { label: "Account suspension protection",    short: "Protection",        icon: ShieldCheck,  values: [true,  false, false, "Add-on"] },
  { label: "Unified inbox across platforms",   short: "Unified Inbox",     icon: Mail,         values: [true,  true,  false, true] },
  { label: "Custom domain mail server",         short: "Mail Server",       icon: Server,       values: [true,  false, false, false] },
];
