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
  Heart,
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
} from "lucide-react";
import { useAuth, type AuthRole } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { LogoWordmark } from "@/components/glass/logo";
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

type Mode = "landing" | "login" | "splash" | "trial";

export function LandingPage() {
  const { login } = useAuth();
  const [mode, setMode] = React.useState<Mode>("landing");
  const [pendingRole, setPendingRole] = React.useState<AuthRole>("admin");

  if (mode === "splash") {
    return <SplashScreen onComplete={() => login(pendingRole)} />;
  }
  if (mode === "login") {
    return (
      <LoginScreen
        onBack={() => setMode("landing")}
        onEnter={(role) => {
          setPendingRole(role);
          setMode("splash");
        }}
      />
    );
  }
  return (
    <>
      <Landing onTrial={() => setMode("trial")} onSignIn={() => setMode("login")} />
      <TrialDialog
        open={mode === "trial"}
        onOpenChange={(b) => { if (!b) setMode("landing"); }}
        onActivated={() => { setMode("splash"); setPendingRole("admin"); }}
      />
    </>
  );
}

/* ===================== Splash Screen ===================== */
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = React.useState(0);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 14 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setProgress(100);
        setTimeout(() => setDone(true), 350);
        setTimeout(onComplete, 1100);
      } else {
        setProgress(Math.floor(p));
      }
    }, 180);
    return () => clearInterval(iv);
  }, [onComplete]);

  return (
    <div className={cn("relative min-h-screen overflow-hidden transition-opacity duration-500", done && "opacity-0")}>
      <div className="retaina-bg" aria-hidden>
        <div className="blob-3" />
      </div>
      <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <div className="crystal-in relative mb-2 text-center" style={{ animationDelay: "0.05s" }}>
          <div className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full bg-[var(--primary)]/20 blur-3xl" />
          <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">
            Social<span className="retaina-text">Flow</span>
          </h1>
        </div>
        <div className="crystal-in text-center" style={{ animationDelay: "0.15s" }}>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Social, Simplified</p>
        </div>

        <div className="crystal-in mt-10 w-full max-w-xs" style={{ animationDelay: "0.3s" }}>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--gold)] transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              {progress < 30 ? "Initializing workspace…" : progress < 60 ? "Loading modules…" : progress < 90 ? "Syncing accounts…" : "Almost there…"}
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>

        <div className="crystal-in mt-8 flex items-center gap-1.5" style={{ animationDelay: "0.4s" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
              style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.15}s infinite` }}
            />
          ))}
        </div>
      </div>
      <style>{`@keyframes dotPulse { 0%,80%,100% { opacity: 0.2; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }`}</style>
    </div>
  );
}

/* ===================== Landing — Story Teller ===================== */
function Landing({ onTrial, onSignIn }: { onTrial: () => void; onSignIn: () => void }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="retaina-bg" aria-hidden>
        <div className="blob-3" />
      </div>

      {/* Nav */}
      <nav className="glass-topbar sticky top-0 z-50 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-2xl px-5 py-3 sm:w-[calc(100%-3rem)]">
        <LogoWordmark size="text-base" />
        <div className="hidden items-center gap-6 md:flex">
          <a href="#story" className="text-sm text-muted-foreground transition hover:text-foreground">The Story</a>
          <a href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">Features</a>
          <a href="#workflow" className="text-sm text-muted-foreground transition hover:text-foreground">Workflow</a>
          <a href="#testimonials" className="text-sm text-muted-foreground transition hover:text-foreground">Customers</a>
          <a href="#pricing" className="text-sm text-muted-foreground transition hover:text-foreground">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onSignIn} className="hidden rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:block">
            Sign in
          </button>
          <button onClick={onTrial} className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold">
            Start 15-day trial <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* ===== Story Act 1: The Problem ===== */}
      <section id="story" className="relative mx-auto max-w-6xl px-4 pt-20 pb-16 sm:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="crystal-in mb-6 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/30 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gold)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--gold)]" />
              </span>
              The enterprise platform for social media teams
            </div>
            <h1 className="crystal-in text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl" style={{ animationDelay: "0.1s" }}>
              One flow.
              <br />
              <span className="gold-text">Every platform.</span>
              <br />
              Zero chaos.
            </h1>
            <p className="crystal-in mt-6 max-w-xl text-base text-muted-foreground sm:text-lg" style={{ animationDelay: "0.2s" }}>
              Your team posts to 7+ platforms every day. Switching tabs, copy-pasting captions,
              praying nothing gets suspended. SocialFlow turns that chaos into one calm, AI-powered flow —
              so your dissemination team ships more, faster.
            </p>
            <div className="crystal-in mt-8 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.3s" }}>
              <button onClick={onTrial} className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold">
                <Rocket className="h-4 w-4" />
                Start 15-day trial
              </button>
              <button onClick={onSignIn} className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-muted/60">
                Sign in
              </button>
            </div>
            <div className="crystal-in mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground" style={{ animationDelay: "0.4s" }}>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> No card to explore</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> 15 days full access</span>
            </div>
          </div>
          {/* Animated dashboard preview */}
          <div className="crystal-in relative" style={{ animationDelay: "0.25s" }}>
            <div className="glass-strong rounded-3xl p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[10px] text-muted-foreground">socialflow.app/dashboard</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: "Followers", v: "1.6M", c: "oklch(0.55 0.2 255)", d: "+1%" },
                  { l: "Impressions", v: "2.4M", c: "oklch(0.62 0.22 300)", d: "+18%" },
                  { l: "Engagement", v: "191K", c: "oklch(0.7 0.2 25)", d: "+4%" },
                ].map((k, i) => (
                  <div key={k.l} className="crystal-card glass rounded-2xl p-3" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                    <div className="grid h-7 w-7 place-items-center rounded-lg text-white" style={{ background: k.c }}>
                      <BarChart3 className="h-3.5 w-3.5" />
                    </div>
                    <div className="mt-2 num-display text-lg font-bold">{k.v}</div>
                    <div className="text-[9px] text-muted-foreground">{k.l}</div>
                    <div className="text-[9px] font-semibold text-emerald-500">{k.d}</div>
                  </div>
                ))}
              </div>
              {/* mini animated chart */}
              <div className="mt-3 crystal-card glass rounded-2xl p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold">Performance trend</span>
                  <span className="text-[9px] text-muted-foreground">14 days</span>
                </div>
                <div className="flex h-16 items-end gap-1">
                  {[35, 48, 42, 58, 65, 52, 70, 78, 68, 82, 75, 90, 85, 95].map((h, i) => (
                    <span
                      key={i}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${h}%`,
                        background: "linear-gradient(to top, var(--primary), var(--gold))",
                        animation: `sparkRise 0.6s cubic-bezier(0.34,1.56,0.64,1) ${0.5 + i * 0.04}s both`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-[var(--primary)]/10 blur-2xl" />
          </div>
        </div>
      </section>

      {/* ===== Story Act 2: The Pain (before/after) ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-500">
              <ShieldAlert className="h-3 w-3" /> The old way
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Social media management is <span className="text-rose-500">broken</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Teams waste hours every day context-switching between tools. Accounts get suspended.
              Approvals get lost. Here&apos;s what your team deals with right now:
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Layers, t: "7 tabs open", d: "Instagram, X, LinkedIn, TikTok… each its own tab. Copy-paste fatigue." },
              { icon: ShieldAlert, t: "Accounts suspended", d: "Your team posts too fast, uses banned hashtags, gets flagged." },
              { icon: Clock, t: "Approvals stuck", d: "Content waits in DMs and spreadsheets. Nobody knows what's approved." },
              { icon: MessageCircle, t: "Inbox chaos", d: "Comments scattered across 10 accounts. Half go unanswered." },
            ].map((p, i) => (
              <div key={p.t} className="crystal-in glass rounded-2xl p-5 lift-hover" style={{ animationDelay: `${0.1 * i + 0.1}s` }}>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold">{p.t}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Story Act 3: The Solution (features) ===== */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Zap className="h-3 w-3" /> The SocialFlow way
          </span>
          <h2 className="crystal-in mt-4 text-3xl font-bold tracking-tight sm:text-4xl" style={{ animationDelay: "0.1s" }}>
            Everything your team needs to <span className="gold-text">win social</span>
          </h2>
          <p className="crystal-in mt-3 text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            From ideation to publishing to protection — one premium platform, 17 integrated modules.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="crystal-in crystal-card glass lift-hover group relative overflow-hidden rounded-3xl p-6"
              style={{ animationDelay: `${0.05 * i + 0.1}s` }}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[var(--primary)]/10 blur-2xl transition group-hover:bg-[var(--gold)]/15" />
              <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              <div className="relative mt-3 flex items-center gap-1 text-xs font-medium text-[var(--primary)] opacity-0 transition group-hover:opacity-100">
                Learn more <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Story Act 4: The Workflow ===== */}
      <section id="workflow" className="mx-auto max-w-6xl px-4 py-16">
        <div className="crystal-in glass-strong overflow-hidden rounded-3xl p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
                <Zap className="h-3 w-3" /> The SocialFlow flow
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Write once. Publish <span className="gold-text">everywhere.</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Compose one brief. Our AI generates distinct, platform-native captions for every
                account — respecting each platform&apos;s tone, length, and hashtag conventions.
                Review, approve, and publish to all in a single flow.
              </p>
              {/* Steps */}
              <div className="mt-6 space-y-4">
                {[
                  { n: "01", t: "Select accounts", d: "Pick from Instagram, X, LinkedIn, TikTok, YouTube, Facebook, Threads." },
                  { n: "02", t: "Write your brief", d: "One caption + tone. AI does the rest per platform." },
                  { n: "03", t: "Upload media", d: "Drop your image or video once. We adapt it." },
                  { n: "04", t: "Preview & approve", d: "See per-account variants in phone-style previews." },
                  { n: "05", t: "Publish or schedule", d: "One click sends it to every account — or queues it." },
                ].map((s, i) => (
                  <div key={s.n} className="crystal-in flex items-start gap-3" style={{ animationDelay: `${0.1 * i + 0.2}s` }}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-xs font-bold text-white">
                      {s.n}
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{s.t}</div>
                      <div className="text-xs text-muted-foreground">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={onTrial} className="liquid-gold glow-ring mt-8 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold">
                Try the composer <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <div className="glass rounded-3xl p-5">
                <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                  <Wand2 className="h-4 w-4 text-[var(--gold)]" />
                  <span className="text-sm font-semibold">AI Composer</span>
                  <span className="ml-auto rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--gold)]">5 accounts</span>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { p: "Instagram", c: "For creators who move fast. 🚀 Built to last, made to inspire..." },
                    { p: "X", c: "Move fast, create faster. New collection, live now. 🚀" },
                    { p: "LinkedIn", c: "We're excited to introduce our latest collection engineered for..." },
                    { p: "TikTok", c: "IT'S HERE!!! ✨ New drop just went live for creators who hustle" },
                    { p: "Threads", c: "New collection just dropped. Tap in. 🔥" },
                  ].map((v, i) => (
                    <div key={v.p} className="crystal-in flex items-start gap-2.5 rounded-xl bg-muted/30 p-2.5" style={{ animationDelay: `${0.15 * i + 0.3}s` }}>
                      <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--gold)]" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--gold)]">{v.p}</div>
                        <div className="truncate text-xs text-muted-foreground">{v.c}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Story Act 5: Protection ===== */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="glass rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Account Health</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">Healthy</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { n: "@prism.studio", r: "safe", v: 12, c: "oklch(0.55 0.2 255)" },
                    { n: "@prismhq", r: "elevated", v: 52, c: "oklch(0.72 0.18 75)" },
                    { n: "@prism", r: "high", v: 61, c: "oklch(0.7 0.2 25)" },
                    { n: "/prism-studio", r: "safe", v: 9, c: "oklch(0.68 0.2 145)" },
                  ].map((a, i) => (
                    <div key={a.n} className="crystal-in flex items-center gap-3" style={{ animationDelay: `${0.1 * i + 0.2}s` }}>
                      <span className="w-28 truncate text-xs text-muted-foreground">{a.n}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${a.v}%`, background: a.c }} />
                      </div>
                      <span className="w-12 text-right text-xs font-bold tabular-nums" style={{ color: a.c }}>{a.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
                <ShieldCheck className="h-3 w-3" /> Account protection
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Never get <span className="gold-text">suspended</span> again
              </h2>
              <p className="mt-3 text-muted-foreground">
                SocialFlow monitors every account&apos;s health in real time. When risk rises —
                from spam flags, report spikes, or aggressive engagement — we tell you exactly what
                to fix and auto-enforce guards so your team can&apos;t accidentally trigger a suspension.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Posting cadence limits (no more rapid-fire spam)",
                  "Banned-hashtag blocker with custom lists",
                  "Behavior caps on DMs, follows, comments",
                  "Smart cooldown auto-pauses on warnings",
                  "2FA enforcement + warm-up for new accounts",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Story Act 6: Stats band ===== */}
      <section id="stats" className="mx-auto max-w-6xl px-4 py-16">
        <div className="crystal-in glass-strong grid grid-cols-2 gap-px overflow-hidden rounded-3xl md:grid-cols-4">
          {[
            { v: "17", l: "Integrated modules", icon: Layers },
            { v: "7+", l: "Social platforms", icon: Globe },
            { v: "2.4M", l: "Impressions tracked", icon: BarChart3 },
            { v: "99.9%", l: "Account safety score", icon: ShieldCheck },
          ].map((s, i) => (
            <div key={s.l} className="crystal-in relative p-6 text-center" style={{ animationDelay: `${0.08 * i + 0.1}s` }}>
              <s.icon className="mx-auto h-6 w-6 text-[var(--gold)]" />
              <div className="num-display mt-3 text-3xl font-bold text-[var(--gold)] sm:text-4xl">{s.v}</div>
              <div className="label-caps mt-2 text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Story Act 7: Testimonials ===== */}
      <section id="testimonials" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Star className="h-3 w-3" /> Loved by teams
          </span>
          <h2 className="crystal-in mt-4 text-3xl font-bold tracking-tight sm:text-4xl" style={{ animationDelay: "0.1s" }}>
            Teams ship <span className="gold-text">3× faster</span> with SocialFlow
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className="crystal-in crystal-card glass lift-hover rounded-3xl p-6" style={{ animationDelay: `${0.08 * i + 0.1}s` }}>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/80">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-xs font-bold text-white">
                  {t.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-[11px] text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Story Act 8: Pricing ===== */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <CreditCard className="h-3 w-3" /> Simple pricing
          </span>
          <h2 className="crystal-in mt-4 text-3xl font-bold tracking-tight sm:text-4xl" style={{ animationDelay: "0.1s" }}>
            Start with a <span className="gold-text">15-day free trial</span>
          </h2>
          <p className="crystal-in mt-3 text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            No card to explore. Pick a plan when you&apos;re ready. Cancel anytime.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <div
              key={p.name}
              className={cn(
                "crystal-in crystal-card relative overflow-hidden rounded-3xl p-6 lift-hover",
                p.featured ? "glass-strong ring-2 ring-[var(--gold)]" : "glass"
              )}
              style={{ animationDelay: `${0.1 * i + 0.1}s` }}
            >
              {p.featured && (
                <div className="absolute right-4 top-4 rounded-full bg-[var(--gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--gold-foreground)]">
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="num-display text-4xl font-bold">{p.price}</span>
                {p.price !== "Custom" && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.desc}</p>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onTrial}
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
                  p.featured ? "liquid-gold glow-ring" : "border border-border/50 bg-muted/40 hover:bg-muted"
                )}
              >
                Start 15-day trial <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Story Act 9: Final CTA ===== */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="crystal-in glass-strong crystal-card relative overflow-hidden rounded-3xl p-10 sm:p-14">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--gold)]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[var(--primary)]/20 blur-3xl" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to <span className="gold-text">simplify</span> your social team?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
            Join the teams using SocialFlow to publish smarter, protect their accounts, and beat the competition.
          </p>
          <button onClick={onTrial} className="liquid-gold glow-ring relative mt-6 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold mx-auto">
            <Rocket className="h-4 w-4" /> Start your 15-day trial <ArrowRight className="h-4 w-4" />
          </button>
          <p className="relative mt-3 text-[11px] text-muted-foreground">No card to explore · Cancel anytime · Full access for 15 days</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 px-4 py-10">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="text-sm font-bold tracking-tight">Social<span className="retaina-text">Flow</span></span>
            <p className="mt-2 text-xs text-muted-foreground">Social, Simplified. The enterprise command center for modern social teams.</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--gold)]" /> Encrypted · 2FA · SOC2-ready
            </div>
          </div>
          <FooterCol title="Product" links={["Features", "Workflow", "Pricing", "AI Composer", "Account Protection"]} />
          <FooterCol title="Company" links={["About", "Customers", "Blog", "Careers", "Contact"]} />
          <FooterCol title="Resources" links={["Documentation", "API Reference", "Help Center", "Status", "Changelog"]} />
        </div>
        <div className="mx-auto mt-8 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© 2026 SocialFlow · Social, Simplified</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Security</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l}><a href="#" className="text-xs text-muted-foreground transition hover:text-foreground">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}

/* ===================== Trial Activation Dialog ===================== */
function TrialDialog({ open, onOpenChange, onActivated }: { open: boolean; onOpenChange: (b: boolean) => void; onActivated: () => void }) {
  const [step, setStep] = React.useState<"details" | "payment" | "activating" | "done">("details");
  const [form, setForm] = React.useState({
    name: "", email: "", company: "", teamSize: "5-10", phone: "",
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
    await new Promise((r) => setTimeout(r, 2200));
    setStep("done");
    setTimeout(onActivated, 1400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-h-[92vh] max-w-lg overflow-y-auto">
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
              <div className="flex items-start gap-2 rounded-xl bg-[var(--gold)]/5 p-3 text-[11px] text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />
                <span>Your card won&apos;t be charged today. You&apos;ll get a reminder 3 days before the trial ends. Cancel anytime.</span>
              </div>
            </div>
            <DialogFooter>
              <button onClick={() => onOpenChange(false)} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={() => validateDetails() && setStep("payment")} className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold">
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
              <button onClick={() => setStep("details")} className="rounded-xl border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted">Back</button>
              <button onClick={activate} className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold">
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
            <p className="mt-1 text-sm text-muted-foreground">Your 15-day trial is now live. Entering your workspace…</p>
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

/* ===================== Login (no role buttons) ===================== */
function LoginScreen({ onBack, onEnter }: { onBack: () => void; onEnter: (role: AuthRole) => void }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter your email and password");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      onEnter("admin");
    }, 700);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="retaina-bg" aria-hidden>
        <div className="blob-3" />
      </div>

      <div className="flex min-h-screen items-center justify-center px-4 py-8">
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
          <div className="glass crystal-in flex flex-col justify-center p-8 sm:p-10" style={{ animationDelay: "0.15s" }}>
            <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
              <ArrowRight className="h-3 w-3 rotate-180" /> Back to home
            </button>

            <h1 className="text-2xl font-bold tracking-tight">Sign in to SocialFlow</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div>
                <label className="label-caps text-muted-foreground">Email</label>
                <div className="relative mt-1.5">
                  <MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-muted/30 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--primary)]/50 focus:bg-background/50"
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
                    className="w-full rounded-xl border border-border/50 bg-muted/30 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[var(--primary)]/50 focus:bg-background/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="accent-[var(--primary)]" defaultChecked /> Remember me
                </label>
                <button type="button" className="font-medium text-[var(--primary)] hover:underline">Forgot password?</button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="liquid-pill glow-ring flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              New to SocialFlow?{" "}
              <button onClick={onBack} className="font-medium text-[var(--primary)] hover:underline">
                Start a free trial
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Data ===================== */
const FEATURES = [
  { icon: Wand2, title: "AI Composer", desc: "Generate distinct, platform-native captions for every account from one brief — respecting tone, length & hashtag conventions." },
  { icon: ShieldCheck, title: "Account Protection", desc: "Anti-suspension guards: posting cadence limits, banned-hashtag blocker, behavior caps, smart cooldowns, and a suspension advisor." },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Deep insights across every platform — impressions, reach, engagement, audience growth, per-account comparison." },
  { icon: Users, title: "Team & Roles", desc: "Granular permissions per user — admin, manager, editor, member, viewer. Designations, departments, and access control." },
  { icon: Calendar, title: "Content Calendar", desc: "Plan and schedule your entire content pipeline with a visual month grid and drag-friendly scheduling." },
  { icon: Server, title: "Mail Server", desc: "Host your team's email on your own domain — Hostinger, cPanel, Zoho or any provider. Create mailboxes, no Google needed." },
  { icon: MessageCircle, title: "Unified Inbox", desc: "Comments and DMs from every account in one inbox. Sentiment-tagged, assignable, reply-ready." },
  { icon: Target, title: "Competitor Tracking", desc: "Benchmark rivals with follower-growth charts, engagement comparisons, and posting-frequency insights." },
  { icon: Hash, title: "Hashtag Manager", desc: "Save reusable hashtag groups per platform, track trending tags, and block shadowbanned hashtags." },
];

const TESTIMONIALS = [
  { name: "Maya Reyes", role: "Head of Social, Lumen Labs", quote: "We cut our publishing time by 70%. One brief goes in, 5 platform-native posts come out. The AI is uncanny." },
  { name: "Daniel Cho", role: "Content Lead, Northwind", quote: "No more suspended accounts. The health monitor flagged a risk before we even knew it existed. Lifesaver." },
  { name: "Priya Nair", role: "Community Manager, Vista", quote: "Finally, one inbox for all 10 accounts. My team replies 3× faster and nothing falls through the cracks." },
  { name: "Leo Marchetti", role: "Creator, solo", quote: "The composer wizard is genius. Accounts → content → media → preview → post. Done in 2 minutes." },
  { name: "Sara Okafor", role: "Paid Social, Brightline", quote: "The analytics are real, not vanity. I finally know which platform actually drives conversions." },
  { name: "Tom Becker", role: "Copywriter, Folk", quote: "As a writer I was skeptical of AI captions. SocialFlow's per-platform variants are genuinely distinct, not reformatted." },
];

const PLANS = [
  { name: "Starter", price: "$29", desc: "For solo creators & small teams getting started.", features: ["3 social accounts", "1 user", "AI composer (100/mo)", "Basic analytics", "Email support"], featured: false },
  { name: "Growth", price: "$89", desc: "For growing teams that publish daily.", features: ["15 social accounts", "5 users", "Unlimited AI composer", "Advanced analytics", "Account protection", "Approval workflows", "Priority support"], featured: true },
  { name: "Enterprise", price: "Custom", desc: "For large teams with custom needs.", features: ["Unlimited accounts", "Unlimited users", "Custom domain mail server", "SSO + SAML", "Dedicated success manager", "99.9% SLA"], featured: false },
];

// keep AuthRole import used
void (null as unknown as AuthRole);
