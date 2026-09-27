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

/* ============================================================================
   Unified Design Tokens
   ----------------------------------------------------------------------------
   ONE base background throughout. Sections differentiated by subtle elevation,
   borders, and small accent icons — NOT by background color changes.
   ============================================================================ */

const COLOR = {
  bg:        "#0A0B0F", // base canvas — near-black with subtle blue tint
  surface:   "#111318", // raised section — very subtle elevation
  footer:    "#08090C", // footer — slightly darker than sections
  textHead:  "#F5F5F7", // headings — Apple white
  textBody:  "#9999A0", // body — muted gray
  border:    "rgba(255,255,255,0.08)",
  cardBg:    "rgba(255,255,255,0.04)",
  cardHover: "rgba(255,255,255,0.06)",
  accent:    "oklch(0.581 0.189 256)", // primary blue (brand --primary)
  accentA:   (a: number) => `oklch(0.581 0.189 256 / ${a})`,
  gold:      "oklch(0.588 0.209 277)", // secondary gold (--gold)
  goldA:     (a: number) => `oklch(0.588 0.209 277 / ${a})`,
  rose:      "#FB7185", // rose-400 for problem icons
  roseA:     (a: number) => `rgba(251,113,133,${a})`,
  emerald:   "#34D399", // emerald-400 for "trust" check icons
} as const;

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
   Cinematic Landing — Story Teller (11 Acts) — Unified Design
   ----------------------------------------------------------------------------
   Each act uses the same #0A0B0F background. Sections are separated by
   1px hairlines or generous vertical padding — never by color shifts.
   Scroll-triggered reveals use a tiny IntersectionObserver hook.
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
  colors = [COLOR.accent, COLOR.gold],
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
    const colors = [COLOR.accent, COLOR.gold, "#5EEAD4", "#FBBF24", "#F472B6", "#34D399"];
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
          borderRight: `2px solid ${COLOR.accentA(0.9)}`,
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
  color = `linear-gradient(to top, ${COLOR.accent}, ${COLOR.gold})`,
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

/* Animated aurora/nebula hero background — ONE subtle blue glow only */
function AuroraHero() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base — same as page bg, no per-section color */}
      <div className="absolute inset-0" style={{ background: COLOR.bg }} />
      {/* Single aurora glow — top center, blue-tinted */}
      <div
        className="absolute -top-[15%] left-1/2 h-[55vh] w-[70vw] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background: `radial-gradient(circle, ${COLOR.accentA(0.55)}, transparent 65%)`,
          animation: "sfAuroraDrift 22s ease-in-out infinite",
        }}
      />
      {/* Subtle shimmer sweep */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgba(94,159,255,0.18) 50%, transparent 70%)",
          backgroundSize: "200% 200%",
          animation: "sfShimmerSweep 9s ease-in-out infinite",
        }}
      />
      {/* Subtle starfield */}
      <ParticleField count={32} colors={[COLOR.accent, COLOR.gold]} size={[1.5, 3]} />
    </div>
  );
}

/* Eyebrow pill — single primary blue accent throughout */
function Eyebrow({
  icon: Icon,
  label,
}: { icon: LucideIcon; label: string }) {
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

/* Unified card — subtle white tint + hairline border. No per-card accent glow. */
function MysticCard({
  accent,
  children,
  className,
  glow = false,
}: {
  accent?: string;
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-white/15",
        className,
      )}
      style={{
        background: COLOR.cardBg,
        borderColor: COLOR.border,
        boxShadow: glow ? `0 4px 24px -4px rgba(0,0,0,0.4)` : undefined,
      }}
    >
      {/* Subtle accent line at top-left when accent provided */}
      {accent && (
        <div
          className="pointer-events-none absolute left-0 top-0 h-8 w-px"
          style={{ background: accent }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/* Icon tile with colored circle background — defaults to primary blue */
function IconTile({
  icon: Icon,
  color = COLOR.accent,
  size = "md",
}: {
  icon: LucideIcon;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const ic = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  // Parse the color into a soft tint background and brighter border
  const tint = color.startsWith("oklch")
    ? color.replace(")", " / 0.15)").replace("oklch(", "oklch(")
    : color;
  return (
    <div
      className={cn("relative grid place-items-center rounded-xl", dims)}
      style={{
        background: color.startsWith("oklch") ? tint : `${color}26`,
        border: `1px solid ${color.startsWith("oklch") ? color.replace(")", " / 0.3)") : `${color}55`}`,
      }}
    >
      <Icon className={cn("relative", ic)} style={{ color, filter: `brightness(1.15)` }} />
    </div>
  );
}

/* Primary glow CTA button — single blue accent throughout */
function GlowCTA({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-7 py-3.5 text-sm font-bold tracking-tight text-white transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]",
        className,
      )}
      style={{
        background: COLOR.accent,
        boxShadow: `0 1px 0 rgba(255,255,255,0.2) inset, 0 8px 30px -8px ${COLOR.accentA(0.6)}, 0 0 0 1px rgba(255,255,255,0.1)`,
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
        "inline-flex items-center justify-center gap-2 rounded-2xl border bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10",
        className,
      )}
      style={{ borderColor: COLOR.border }}
    >
      {children}
    </button>
  );
}

/* ============================================================================
   Landing — 11 Cinematic Acts (Unified Design)
   ============================================================================ */

function Landing({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden antialiased selection:bg-[var(--primary)]/30"
      style={{ background: COLOR.bg, color: COLOR.textHead }}
    >
      <style>{LANDING_KEYFRAMES}</style>
      <CinematicNav onTrial={onTrial} onSignIn={onSignIn} />
      <Act1Hero onTrial={onTrial} onSignIn={onSignIn} />
      <Act2Problem />
      <Act3Solution />
      <Act4Workflow onTrial={onTrial} />
      <Act5Protection />
      <Act6AIAssistant />
      <Act7Analytics onTrial={onTrial} />
      <Act8Comparison />
      <Act9Pricing onTrial={onTrial} />
      <Act10FinalCTA onTrial={onTrial} />
      <Act11Footer />
    </div>
  );
}

/* --------------------------------- Nav ---------------------------------- */

function CinematicNav({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    { href: "#features", label: "Features" },
    { href: "#workflow", label: "Workflow" },
    { href: "#pricing", label: "Pricing" },
    { href: "#compare", label: "Compare" },
  ];
  return (
    <nav
      className={cn(
        "fixed left-1/2 top-3 z-50 w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2 rounded-2xl px-4 py-3 transition-all duration-300 sm:w-[calc(100%-2rem)] sm:px-5",
        scrolled
          ? "border shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          : "border border-transparent bg-transparent",
      )}
      style={scrolled ? { background: "rgba(10,11,15,0.8)", borderColor: COLOR.border } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={28} withTile={false} />
          <span className="text-base font-bold tracking-tight" style={{ color: COLOR.textHead }}>SYNQUE</span>
        </div>
        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm transition hover:text-white" style={{ color: COLOR.textBody }}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSignIn}
            className="hidden min-h-10 items-center rounded-xl px-3 text-sm font-medium transition hover:text-white sm:flex"
            style={{ color: COLOR.textBody }}
          >
            Sign in
          </button>
          <GlowCTA onClick={onTrial} className="px-5 py-2.5 text-[13px]">
            <Rocket className="h-4 w-4" /> Start trial
          </GlowCTA>
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
        </div>
      )}
    </nav>
  );
}

/* ----------------------------- Act 1: Hero ------------------------------ */

function Act1Hero({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  const { loginAsDemo } = useAuth();
  const [demoLoading, setDemoLoading] = React.useState(false);

  const startDemo = async () => {
    setDemoLoading(true);
    const ok = await loginAsDemo();
    if (!ok) {
      setDemoLoading(false);
      // Fallback to /login if the demo endpoint fails
      window.location.href = "/login";
    }
    // On success, auth-store updates isAuthenticated and page.tsx swaps to AppShell
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden" style={{ background: COLOR.bg }}>
      <AuroraHero />
      {/* Subtle bottom hairline into Act 2 (no color gradient) */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-px"
        style={{ background: COLOR.border }}
      />

      <div className="relative z-20 mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 pt-24 pb-32 text-center sm:px-6 lg:px-8">
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
            The enterprise command center for social teams
          </span>
        </Reveal>

        <Reveal delay={120}>
          <h1 className="mt-8 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" style={{ color: COLOR.textHead }}>
            <span className="block">One flow.</span>
            <span
              className="mt-2 block bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.gold})`,
                backgroundSize: "200% 200%",
                animation: "sfGradientText 8s ease-in-out infinite",
              }}
            >
              Every platform.
            </span>
            <span className="mt-2 block" style={{ color: COLOR.textHead }}>Zero chaos.</span>
          </h1>
        </Reveal>

        <Reveal delay={240}>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: COLOR.textBody }}>
            Your team posts to 7+ platforms every day. Switching tabs, copy-pasting captions,
            praying nothing gets suspended. SYNQUE turns that chaos into one calm, AI-powered flow —
            so your team ships more, faster.
          </p>
        </Reveal>

        <Reveal delay={360}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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

        <Reveal delay={480}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px]" style={{ color: COLOR.textBody }}>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: COLOR.emerald }} /> 25GB free media storage</span>
          </div>
        </Reveal>

        {/* Scroll indicator */}
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2">
          <ChevronDown
            className="h-6 w-6"
            style={{ color: COLOR.textBody, animation: "sfChevronBounce 1.8s ease-in-out infinite" }}
          />
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Act 2: Problem ----------------------------- */

function Act2Problem() {
  const problems = [
    { icon: Layers,        t: "7 tabs open",       d: "Instagram, X, LinkedIn, TikTok… each its own tab. Copy-paste fatigue is real.", accent: COLOR.rose },
    { icon: ShieldAlert,   t: "Accounts suspended", d: "Your team posts too fast, uses banned hashtags, gets flagged — and gone.",         accent: COLOR.rose },
    { icon: Clock,          t: "Content stuck",    d: "Drafts live in DMs and spreadsheets. Nobody knows what's ready to publish.",   accent: COLOR.rose },
    { icon: MessageCircle, t: "Inbox chaos",       d: "Comments scattered across 10 accounts. Half of them go unanswered.",          accent: COLOR.rose },
  ];
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: COLOR.bg }}>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={ShieldAlert} label="The old way" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Social media management is <span style={{ color: COLOR.rose }}>broken</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              Teams waste hours every day context-switching between tools. Accounts get suspended.
              Content gets lost. Here&apos;s what your team deals with right now:
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p, i) => (
            <Reveal key={p.t} delay={i * 120}>
              <MysticCard accent={p.accent} className="h-full p-6">
                <IconTile icon={p.icon} color={p.accent} size="lg" />
                <h3 className="mt-5 text-lg font-bold" style={{ color: COLOR.textHead }}>{p.t}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: COLOR.textBody }}>{p.d}</p>
              </MysticCard>
            </Reveal>
          ))}
        </div>

        {/* Pain stat strip */}
        <Reveal delay={500}>
          <div
            className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border sm:grid-cols-4"
            style={{ background: COLOR.border, borderColor: COLOR.border }}
          >
            {[
              { v: "11 hrs",  l: "Lost weekly per teammate to tab-switching" },
              { v: "1 in 4",  l: "Accounts suspended in their first 90 days" },
              { v: "$3.2K",   l: "Average cost per missed campaign deadline" },
              { v: "62%",     l: "Of DMs go unanswered within 24 hours" },
            ].map((s) => (
              <div key={s.l} className="p-6 text-center" style={{ background: COLOR.bg }}>
                <div className="text-3xl font-bold sm:text-4xl" style={{ color: COLOR.rose }}>{s.v}</div>
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
  return (
    <section
      id="features"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: COLOR.bg }}
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Sparkles} label="The SYNQUE way" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Everything your team needs to <span style={{ color: COLOR.accent }}>win social</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              From ideation to publishing to protection — one premium platform, 9 integrated modules.
              Each built for teams that ship daily.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <MysticCard accent={COLOR.accent} className="h-full p-6">
                <div className="flex items-start justify-between">
                  <IconTile icon={f.icon} color={COLOR.accent} />
                  <span
                    className="grid h-7 w-7 place-items-center rounded-full border transition group-hover:bg-white/10"
                    style={{ borderColor: COLOR.border, color: COLOR.textBody }}
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold" style={{ color: COLOR.textHead }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: COLOR.textBody }}>{f.desc}</p>
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
    { n: "01", icon: Edit3,    t: "Write brief",            d: "One caption, tone, and goal — that's it.",        accent: COLOR.accent },
    { n: "02", icon: Wand2,    t: "AI generates variants",  d: "Distinct, platform-native captions per account.", accent: COLOR.accent },
    { n: "03", icon: ImageIcon, t: "Add media",              d: "Drop your image or video once. We adapt it.",    accent: COLOR.accent },
    { n: "04", icon: Eye,      t: "Review",                  d: "Phone-style previews per platform before publish.", accent: COLOR.accent },
    { n: "05", icon: Send,     t: "Publish",                 d: "One click sends it everywhere — or queues it.",  accent: COLOR.accent },
  ];
  return (
    <section
      id="workflow"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: COLOR.bg }}
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Zap} label="The SYNQUE flow" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Write once. Publish <span style={{ color: COLOR.accent }}>everywhere.</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              Compose one brief. Our AI generates distinct, platform-native captions for every account —
              respecting each platform&apos;s tone, length, and hashtag conventions.
            </p>
          </Reveal>
        </div>

        {/* Horizontal step flow */}
        <Reveal delay={300}>
          <div className="mt-16 hidden lg:block">
            <div className="relative">
              {/* Connecting line — subtle hairline */}
              <div className="absolute left-0 right-0 top-7 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
              <div className="grid grid-cols-5 gap-3">
                {steps.map((s, i) => (
                  <Reveal key={s.n} delay={i * 120}>
                    <div className="flex flex-col items-center text-center">
                      <div
                        className="relative grid h-14 w-14 place-items-center rounded-2xl border"
                        style={{
                          background: COLOR.bg,
                          borderColor: `${COLOR.accent}`,
                          boxShadow: `0 0 24px -8px ${COLOR.accentA(0.6)}`,
                        }}
                      >
                        <s.icon className="h-6 w-6" style={{ color: COLOR.accent }} />
                      </div>
                      <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: COLOR.textBody }}>{s.n}</div>
                      <div className="mt-1 text-sm font-bold" style={{ color: COLOR.textHead }}>{s.t}</div>
                      <div className="mt-1 text-xs" style={{ color: COLOR.textBody }}>{s.d}</div>
                      {/* Progress bar */}
                      <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: COLOR.accent,
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
            <div className="absolute left-[26px] top-2 bottom-2 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div className="relative flex items-start gap-4">
                  <div
                    className="absolute -left-8 grid h-12 w-12 place-items-center rounded-2xl border"
                    style={{
                      background: COLOR.bg,
                      borderColor: COLOR.accent,
                      boxShadow: `0 0 20px -6px ${COLOR.accentA(0.6)}`,
                    }}
                  >
                    <s.icon className="h-5 w-5" style={{ color: COLOR.accent }} />
                  </div>
                  <div className="ml-4 flex-1 rounded-2xl border p-4 backdrop-blur-sm" style={{ background: COLOR.cardBg, borderColor: COLOR.border }}>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: COLOR.textBody }}>{s.n}</div>
                    <div className="text-sm font-bold" style={{ color: COLOR.textHead }}>{s.t}</div>
                    <div className="mt-1 text-xs" style={{ color: COLOR.textBody }}>{s.d}</div>
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

/* --------------------------- Act 5: Protection -------------------------- */

function Act5Protection() {
  const features = [
    { icon: CalendarClock, t: "Daily post limits",     d: "Hard caps per account per platform. Auto-pause when threshold approaches." },
    { icon: Hash,          t: "Hashtag safety checker", d: "Every caption scanned against shadowbanned tag lists before publish." },
    { icon: Gauge,         t: "Warm-up mode",           d: "New accounts ramp activity gradually to build trust and avoid flags." },
    { icon: KeyRound,      t: "2FA enforcement",         d: "Require two-factor auth for every team member. No exceptions." },
  ];
  return (
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: COLOR.bg }}>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — shield animation */}
          <Reveal>
            <div className="relative mx-auto flex aspect-square max-w-md items-center justify-center">
              {/* Pulsing rings — primary blue */}
              {[0, 1, 2].map((r) => (
                <div
                  key={r}
                  className="absolute rounded-full border"
                  style={{
                    width: `${40 + r * 22}%`,
                    height: `${40 + r * 22}%`,
                    borderColor: COLOR.accentA(0.25),
                    animation: `sfPulseRing 3s ease-out infinite ${r * 0.6}s`,
                  }}
                />
              ))}
              {/* Glow — primary blue */}
              <div
                className="absolute h-72 w-72 rounded-full opacity-50 blur-3xl"
                style={{ background: `radial-gradient(circle, ${COLOR.accentA(0.5)}, transparent 70%)` }}
              />
              {/* Shield — primary blue */}
              <div
                className="relative grid h-44 w-44 place-items-center rounded-[2.5rem] border backdrop-blur-xl"
                style={{
                  background: COLOR.cardBg,
                  borderColor: COLOR.accentA(0.4),
                  animation: "sfShieldPulse 3.5s ease-in-out infinite",
                }}
              >
                <ShieldCheck className="h-20 w-20" strokeWidth={1.5} style={{ color: COLOR.accent }} />
              </div>
              {/* Floating tags — primary blue family */}
              <FloatingTag className="left-2 top-10"        icon={Hash}          label="No shadowbans" color={COLOR.accent} delay={0} />
              <FloatingTag className="right-2 top-24"        icon={Gauge}         label="Warm-up safe"  color={COLOR.accent} delay={1} />
              <FloatingTag className="bottom-8 left-6"       icon={KeyRound}      label="2FA enforced"  color={COLOR.accent} delay={2} />
              <FloatingTag className="bottom-12 right-4"     icon={CalendarClock} label="Cadence cap"   color={COLOR.accent} delay={1.5} />
            </div>
          </Reveal>

          {/* Right — copy + features */}
          <div>
            <Reveal>
              <Eyebrow icon={ShieldCheck} label="Account protection" />
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: COLOR.textHead }}>
                Never get <span style={{ color: COLOR.accent }}>suspended</span> again
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-5 text-base sm:text-lg" style={{ color: COLOR.textBody }}>
                SYNQUE monitors every account&apos;s health in real time. When risk rises —
                from spam flags, report spikes, or aggressive engagement — we tell you exactly what
                to fix and auto-enforce guards so your team can&apos;t accidentally trigger a suspension.
              </p>
            </Reveal>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {features.map((f, i) => (
                <Reveal key={f.t} delay={i * 100}>
                  <div
                    className="group flex items-start gap-3 rounded-2xl border p-4 backdrop-blur-sm transition hover:border-white/20"
                    style={{ background: COLOR.cardBg, borderColor: COLOR.border }}
                  >
                    <IconTile icon={f.icon} color={COLOR.accent} size="sm" />
                    <div>
                      <div className="text-sm font-bold" style={{ color: COLOR.textHead }}>{f.t}</div>
                      <div className="mt-0.5 text-xs" style={{ color: COLOR.textBody }}>{f.d}</div>
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
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: COLOR.bg }}>
      <ParticleField count={20} colors={[COLOR.accent, COLOR.gold]} size={[2, 3]} />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — copy */}
          <div>
            <Reveal>
              <Eyebrow icon={Bot} label="AI Assistant" />
            </Reveal>
            <Reveal delay={100}>
              <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
                Your AI-powered <span style={{ color: COLOR.accent }}>command center</span>
              </h2>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-5 text-base sm:text-lg" style={{ color: COLOR.textBody }}>
                Ask SYNQUE anything about your accounts. Get instant answers — performance,
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
                  <div
                    className="rounded-2xl border p-4 backdrop-blur-sm transition hover:border-white/20"
                    style={{ background: COLOR.cardBg, borderColor: COLOR.border }}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: COLOR.accent }}>
                      <Bot className="h-3.5 w-3.5" /> You asked
                      <span style={{ color: COLOR.textBody }}>— “{c.q}”</span>
                    </div>
                    <div className="mt-2 flex items-start gap-2 text-sm" style={{ color: COLOR.textHead }}>
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: COLOR.accent }} />
                      <span>{c.a}</span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Right — chat mockup (same card style) */}
          <Reveal delay={300}>
            <div className="relative">
              {/* Floating AI badge */}
              <div
                className="absolute -right-4 -top-4 z-10 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold backdrop-blur-md"
                style={{
                  borderColor: COLOR.accentA(0.4),
                  background: COLOR.accentA(0.1),
                  color: COLOR.accent,
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: COLOR.accent }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COLOR.accent }} />
                </span>
                AI Online
              </div>

              <div
                className="relative overflow-hidden rounded-3xl border backdrop-blur-xl"
                style={{
                  background: COLOR.cardBg,
                  borderColor: COLOR.border,
                  boxShadow: `0 30px 80px -20px ${COLOR.accentA(0.3)}`,
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: COLOR.border }}>
                  <div className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: COLOR.accent }}>
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: COLOR.textHead }}>SYNQUE AI</div>
                    <div className="text-[11px]" style={{ color: COLOR.textBody }}>Workspace · Prism Studio</div>
                  </div>
                  <div className="ml-auto flex gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLOR.roseA(0.7) }} />
                    <span className="h-2 w-2 rounded-full" style={{ background: "#FBBF24" }} />
                    <span className="h-2 w-2 rounded-full" style={{ background: COLOR.emerald }} />
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 p-5">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div
                      className="max-w-[80%] rounded-2xl rounded-tr-sm border px-4 py-2.5 text-sm"
                      style={{ background: "rgba(255,255,255,0.06)", borderColor: COLOR.border, color: COLOR.textHead }}
                    >
                      How many posts did we publish this week?
                    </div>
                  </div>
                  {/* AI typing message */}
                  <div className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white" style={{ background: COLOR.accent }}>
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div
                      className="max-w-[85%] rounded-2xl rounded-tl-sm border px-4 py-3 text-sm"
                      style={{ background: COLOR.accentA(0.08), borderColor: COLOR.accentA(0.2), color: COLOR.textHead }}
                    >
                      <TypingBubble
                        text="You published 12 posts across 3 platforms this week — 7 on Instagram, 3 on X, 2 on LinkedIn. Engagement is up 18% vs. last week. Top performer: your Tuesday Reel."
                        durationMs={5200}
                      />
                    </div>
                  </div>

                  {/* Suggested chips */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["Show me chart", "Draft next week", "Flag risky account"].map((s) => (
                      <span
                        key={s}
                        className="rounded-full border px-3 py-1 text-[11px] font-medium"
                        style={{ borderColor: COLOR.accentA(0.3), background: COLOR.accentA(0.06), color: COLOR.accent }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 border-t p-3" style={{ borderColor: COLOR.border }}>
                  <div className="flex-1 rounded-xl border px-4 py-2.5 text-sm" style={{ background: "rgba(255,255,255,0.04)", borderColor: COLOR.border, color: COLOR.textBody }}>
                    Ask anything about your social presence…
                  </div>
                  <button
                    className="grid h-10 w-10 place-items-center rounded-xl text-white"
                    style={{ background: COLOR.accent }}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Floating KPI chips */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { l: "Posts", v: "12",       c: COLOR.accent },
                  { l: "Reach", v: "2.4M",     c: COLOR.gold },
                  { l: "Engagement", v: "+18%", c: COLOR.emerald },
                ].map((k) => (
                  <div key={k.l} className="rounded-2xl border p-3 text-center backdrop-blur-md" style={{ background: COLOR.cardBg, borderColor: COLOR.border }}>
                    <div className="text-lg font-bold" style={{ color: k.c }}>{k.v}</div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: COLOR.textBody }}>{k.l}</div>
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
    <section className="relative w-full overflow-hidden py-24 sm:py-32" style={{ background: COLOR.bg }}>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Activity} label="Analytics" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              See your growth in <span style={{ color: COLOR.accent }}>real-time</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              Track followers, reach, and engagement across every platform — unified, beautiful, alive.
            </p>
          </Reveal>
        </div>

        {/* KPI cards */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { l: "Followers",   v: "1.62M", d: "+1.2%",  icon: Users,      color: COLOR.accent },
            { l: "Reach",       v: "2.41M", d: "+18%",   icon: EyeIcon,    color: COLOR.accent },
            { l: "Engagement",  v: "191K",  d: "+4.5%",  icon: TrendingUp, color: COLOR.accent },
            { l: "Posts",       v: "342",   d: "+12",    icon: Layers,     color: COLOR.accent },
          ].map((k, i) => (
            <Reveal key={k.l} delay={i * 100}>
              <MysticCard accent={COLOR.accent} className="h-full p-5">
                <div className="flex items-center justify-between">
                  <IconTile icon={k.icon} color={k.color} size="sm" />
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: COLOR.accentA(0.15), color: COLOR.accent }}>
                    {k.d}
                  </span>
                </div>
                <div className="mt-4 text-3xl font-bold tabular-nums" style={{ color: COLOR.textHead }}>{k.v}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider" style={{ color: COLOR.textBody }}>{k.l}</div>
              </MysticCard>
            </Reveal>
          ))}
        </div>

        {/* Chart mockup */}
        <Reveal delay={400}>
          <MysticCard accent={COLOR.accent} className="mt-6 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold" style={{ color: COLOR.textHead }}>Performance trend</div>
                <div className="text-[11px]" style={{ color: COLOR.textBody }}>Last 14 days · all platforms</div>
              </div>
              <div className="flex gap-2">
                {["7d", "14d", "30d", "90d"].map((p, i) => (
                  <span
                    key={p}
                    className={cn("rounded-full px-3 py-1 text-[11px] font-semibold")}
                    style={
                      i === 1
                        ? { background: COLOR.accentA(0.2), color: COLOR.accent }
                        : { background: "rgba(255,255,255,0.05)", color: COLOR.textBody }
                    }
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
                color={`linear-gradient(to top, ${COLOR.accent}, ${COLOR.gold})`}
                className="h-full"
              />
            </div>
            {/* X-axis */}
            <div className="mt-2 flex justify-between text-[10px]" style={{ color: COLOR.textBody }}>
              {["Mon", "Wed", "Fri", "Sun", "Tue", "Thu", "Sat"].map((d, i) => (
                <span key={d + i}>{d}</span>
              ))}
            </div>

            {/* Platform breakdown */}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { l: "Instagram", v: "1.1M", c: COLOR.accent, w: 78 },
                { l: "X / Twitter", v: "620K", c: COLOR.gold,  w: 55 },
                { l: "LinkedIn", v: "690K",   c: COLOR.emerald, w: 61 },
              ].map((p) => (
                <div key={p.l} className="rounded-2xl border p-4" style={{ background: COLOR.cardBg, borderColor: COLOR.border }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold" style={{ color: COLOR.textHead }}>{p.l}</span>
                    <span className="font-bold tabular-nums" style={{ color: p.c }}>{p.v}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
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
            <GlowCTA onClick={onTrial}>
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
  const competitors = ["SYNQUE", "Hootsuite", "Buffer", "Sprout Social"];
  return (
    <section
      id="compare"
      className="relative w-full overflow-hidden py-24 sm:py-32"
      style={{ background: COLOR.bg }}
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={Target} label="Competitor comparison" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Why settle for <span style={{ color: COLOR.accent }}>less?</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
              The only platform that combines AI content, multi-tenant isolation, and account protection in one workspace.
            </p>
          </Reveal>
        </div>

        <Reveal delay={300}>
          <div
            className="mt-14 overflow-hidden rounded-3xl border backdrop-blur-xl"
            style={{ background: COLOR.cardBg, borderColor: COLOR.border }}
          >
            {/* Header row */}
            <div className="grid grid-cols-5 border-b" style={{ background: "rgba(255,255,255,0.02)", borderColor: COLOR.border }}>
              <div className="px-4 py-5 text-xs font-semibold uppercase tracking-wider sm:px-6" style={{ color: COLOR.textBody }}>
                Capability
              </div>
              {competitors.map((c, i) => (
                <div
                  key={c}
                  className={cn("relative px-2 py-5 text-center sm:px-6")}
                  style={i === 0 ? { borderColor: COLOR.accent, borderLeft: `1px solid ${COLOR.accent}`, borderRight: `1px solid ${COLOR.accent}` } : undefined}
                >
                  <div
                    className={cn("text-xs font-bold sm:text-sm")}
                    style={{ color: i === 0 ? COLOR.accent : COLOR.textHead }}
                  >
                    {c}
                  </div>
                  {i === 0 && (
                    <div
                      className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: COLOR.accentA(0.2), color: COLOR.accent }}
                    >
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
                className="grid grid-cols-5 items-center border-b last:border-b-0"
                style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent", borderColor: COLOR.border }}
              >
                <div className="flex items-center gap-2 px-4 py-4 text-sm font-medium sm:px-6" style={{ color: COLOR.textHead }}>
                  <r.icon className="h-4 w-4 shrink-0" style={{ color: COLOR.textBody }} />
                  <span className="hidden sm:inline">{r.label}</span>
                  <span className="sm:hidden">{r.short}</span>
                </div>
                {r.values.map((v, i) => (
                  <div
                    key={i}
                    className="px-2 py-4 text-center sm:px-6"
                    style={i === 0 ? { background: COLOR.accentA(0.06), borderLeft: `1px solid ${COLOR.border}`, borderRight: `1px solid ${COLOR.border}` } : undefined}
                  >
                    {v === true ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: COLOR.accentA(0.15), color: COLOR.accent }}>
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    ) : v === false ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" }}>
                        <Minus className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: COLOR.textBody }}>{v}</span>
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
      style={{ background: COLOR.bg }}
    >
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Reveal>
            <Eyebrow icon={CreditCard} label="Pricing" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: COLOR.textHead }}>
              Start with a <span style={{ color: COLOR.accent }}>15-day free trial</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
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
                  )}
                  style={
                    featured
                      ? {
                          borderColor: COLOR.accent,
                          background: `linear-gradient(to bottom, ${COLOR.accentA(0.1)}, ${COLOR.accentA(0.02)})`,
                          boxShadow: `0 30px 80px -30px ${COLOR.accentA(0.5)}`,
                        }
                      : {
                          borderColor: COLOR.border,
                          background: COLOR.cardBg,
                        }
                  }
                >
                  {featured && (
                    <>
                      <div
                        className="pointer-events-none absolute -inset-px rounded-3xl opacity-50 blur-2xl"
                        style={{ background: `linear-gradient(135deg, ${COLOR.accentA(0.4)}, ${COLOR.accentA(0.1)})` }}
                      />
                      <div
                        className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ background: COLOR.accent }}
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
                            style={
                              featured
                                ? { background: COLOR.accentA(0.2), color: COLOR.accent }
                                : { background: COLOR.accentA(0.15), color: COLOR.accent }
                            }
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
                              background: COLOR.accent,
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

/* --------------------------- Act 10: Final CTA -------------------------- */

function Act10FinalCTA({ onTrial }: { onTrial: () => void }) {
  return (
    <section className="relative w-full overflow-hidden py-32 sm:py-40" style={{ background: COLOR.bg }}>
      {/* Single subtle blue glow at bottom — no multi-color aurora */}
      <div className="absolute inset-0" aria-hidden>
        <div
          className="absolute bottom-[-20%] left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{
            background: `radial-gradient(circle, ${COLOR.accentA(0.5)}, transparent 70%)`,
            animation: "sfAuroraDrift 22s ease-in-out infinite",
          }}
        />
        <ConfettiField count={48} />
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
            <Sparkles className="h-3.5 w-3.5" /> Aurora finale
          </span>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="mt-7 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(120deg, ${COLOR.accent}, ${COLOR.gold})`,
                backgroundSize: "200% 200%",
                animation: "sfGradientText 8s ease-in-out infinite",
              }}
            >
              Ready to simplify
            </span>
            <br />
            <span style={{ color: COLOR.textHead }}>your social team?</span>
          </h2>
        </Reveal>
        <Reveal delay={240}>
          <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg" style={{ color: COLOR.textBody }}>
            Join the teams using SYNQUE to publish smarter, protect their accounts, and beat the competition.
            Start your 15-day trial — full access, no card to explore.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <GlowCTA onClick={onTrial} className="min-w-[280px] px-8 py-4 text-base">
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

/* ------------------------------ Act 11: Footer ------------------------- */

function Act11Footer() {
  return (
    <footer className="relative w-full overflow-hidden pt-20 pb-10" style={{ background: COLOR.footer, color: COLOR.textHead }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)" }}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo size={28} withTile={false} />
              <span className="text-base font-bold tracking-tight" style={{ color: COLOR.textHead }}>SYNQUE</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ color: COLOR.textBody }}>
              Sync Your Social. The enterprise command center for modern social teams.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px]" style={{ borderColor: COLOR.border, background: COLOR.cardBg, color: COLOR.textBody }}>
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: COLOR.accent }} />
              Encrypted · 2FA · SOC2-ready
            </div>
            {/* Social icons */}
            <div className="mt-6 flex gap-2">
              {[Globe, MessageCircle, Send, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-xl border transition"
                  style={{ borderColor: COLOR.border, background: COLOR.cardBg, color: COLOR.textBody }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLOR.accentA(0.4); e.currentTarget.style.color = COLOR.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLOR.border; e.currentTarget.style.color = COLOR.textBody; }}
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
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row" style={{ borderColor: COLOR.border, color: COLOR.textBody }}>
          <span>© 2026 SYNQUE · Sync Your Social</span>
          <div className="flex gap-5">
            <a href="/privacy" className="transition hover:text-white">Privacy</a>
            <a href="/terms" className="transition hover:text-white">Terms</a>
            <a href="/protection" className="transition hover:text-white">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: COLOR.textBody }}>{title}</div>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => {
          const [text, href] = l.includes("|") ? l.split("|") : [l, "#"];
          return (
            <li key={text}>
              <a href={href} className="text-sm transition hover:text-white" style={{ color: COLOR.textBody }}>{text}</a>
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
  0%, 100% { box-shadow: 0 0 30px -10px var(--glow, rgba(0,113,227,0.4)); opacity: 0.6; }
  50%      { box-shadow: 0 0 70px 0 var(--glow, rgba(0,113,227,0.7)); opacity: 1; }
}
@keyframes sfShieldPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 25px rgba(0,113,227,0.5)); }
  50%      { transform: scale(1.04); filter: drop-shadow(0 0 50px rgba(0,113,227,0.8)); }
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
   Trial Activation Dialog
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
   Login Screen
   ============================================================================ */

function LoginScreen({ onBack }: { onBack: () => void }) {
  const { login, loginAsDemo } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState(false);
  const [error, setError] = React.useState("");

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
      // If success, the auth store updates isAuthenticated and page.tsx switches to AppShell
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
                  SQ
                </div>
              </div>
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

            <p className="mt-4 text-center text-xs text-muted-foreground">
              New to SYNQUE?{" "}
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
  { icon: Wand2,        title: "AI Composer",         desc: "Generate distinct, platform-native captions for every account from one brief — respecting tone, length & hashtag conventions." },
  { icon: ShieldCheck,  title: "Account Protection",  desc: "Anti-suspension guards: posting cadence limits, banned-hashtag blocker, behavior caps, smart cooldowns, and a suspension advisor." },
  { icon: BarChart3,    title: "Advanced Analytics",  desc: "Deep insights across every platform — impressions, reach, engagement, audience growth, per-account comparison." },
  { icon: Users,        title: "Team & Roles",        desc: "Granular permissions per user — admin, manager, editor, member, viewer. Designations, departments, and access control." },
  { icon: Calendar,     title: "Content Calendar",    desc: "Plan and schedule your entire content pipeline with a visual month grid and drag-friendly scheduling." },
  { icon: Server,       title: "Mail Server",         desc: "Host your team's email on your own domain — Hostinger, cPanel, Zoho or any provider. Create mailboxes, no Google needed." },
  { icon: MessageCircle,title: "Unified Inbox",       desc: "Comments and DMs from every account in one inbox. Sentiment-tagged, assignable, reply-ready." },
  { icon: Target,       title: "Competitor Tracking", desc: "Benchmark rivals with follower-growth charts, engagement comparisons, and posting-frequency insights." },
  { icon: Hash,         title: "Hashtag Manager",     desc: "Save reusable hashtag groups per platform, track trending tags, and block shadowbanned hashtags." },
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
