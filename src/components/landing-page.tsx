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
} from "lucide-react";
import { useAuth, type AuthRole } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import { Logo, LogoWordmark } from "@/components/glass/logo";

type Mode = "landing" | "login" | "splash";

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
  return <Landing onGetStarted={() => setMode("login")} />;
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
        {/* Animated logo mark — large, breathing */}
        <div className="crystal-in relative mb-8" style={{ animationDelay: "0.05s" }}>
          <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-[var(--primary)]/20 blur-3xl" />
          <Logo size={88} />
        </div>

        {/* Wordmark */}
        <div className="crystal-in text-center" style={{ animationDelay: "0.15s" }}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Sync<span className="retaina-text">wave</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Social Command Center</p>
        </div>

        {/* Progress bar */}
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

        {/* Loading dots */}
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

/* ===================== Landing ===================== */
function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Ambient background */}
      <div className="retaina-bg" aria-hidden>
        <div className="blob-3" />
      </div>

      {/* Nav */}
      <nav className="glass-topbar sticky top-0 z-50 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-2xl px-5 py-3 sm:w-[calc(100%-3rem)]">
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <LogoWordmark />
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition hover:text-foreground">Features</a>
          <a href="#workflow" className="text-sm text-muted-foreground transition hover:text-foreground">Workflow</a>
          <a href="#stats" className="text-sm text-muted-foreground transition hover:text-foreground">Why Syncwave</a>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onGetStarted} className="hidden rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:block">
            Sign in
          </button>
          <button onClick={onGetStarted} className="liquid-gold glow-ring flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="text-center">
          <div className="crystal-in mb-6 inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/30 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--gold)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--gold)]" />
            </span>
            The enterprise platform for social media teams
          </div>

          <h1 className="crystal-in mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl" style={{ animationDelay: "0.1s" }}>
            One flow.
            <br />
            <span className="gold-text">Every platform.</span>
            <br />
            Zero chaos.
          </h1>

          <p className="crystal-in mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg" style={{ animationDelay: "0.2s" }}>
            Publish to every social account in one flow with AI-generated, platform-native content.
            Protect your accounts from suspension. Track your team&apos;s performance. All in one
            premium, crystal-clear workspace.
          </p>

          <div className="crystal-in mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: "0.3s" }}>
            <button onClick={onGetStarted} className="liquid-pill glow-ring flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold">
              <Wand2 className="h-4 w-4" />
              Start free — no card needed
            </button>
            <button onClick={onGetStarted} className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-muted/60">
              See live demo
            </button>
          </div>

          {/* Trust line */}
          <div className="crystal-in mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground" style={{ animationDelay: "0.4s" }}>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[var(--gold)]" /> Account protection built-in</span>
            <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-[var(--gold)]" /> AI per-account content</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[var(--gold)]" /> Team roles & permissions</span>
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section id="stats" className="mx-auto max-w-6xl px-4 pb-16">
        <div className="glass-strong crystal-in grid grid-cols-2 gap-px overflow-hidden rounded-3xl md:grid-cols-4" style={{ animationDelay: "0.5s" }}>
          {[
            { v: "17", l: "Integrated modules" },
            { v: "7+", l: "Social platforms" },
            { v: "2.4M", l: "Impressions tracked" },
            { v: "99.9%", l: "Account safety score" },
          ].map((s) => (
            <div key={s.l} className="bg-background/40 p-6 text-center">
              <div className="num-display text-3xl font-bold text-[var(--gold)] sm:text-4xl">{s.v}</div>
              <div className="label-caps mt-2 text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="crystal-in text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your team needs to <span className="gold-text">win social</span>
          </h2>
          <p className="crystal-in mt-3 text-muted-foreground" style={{ animationDelay: "0.1s" }}>
            From ideation to publishing to protection — one premium platform.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6"
              style={{ animationDelay: `${0.05 * i + 0.1}s` }}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[var(--primary)]/10 blur-2xl transition group-hover:bg-[var(--gold)]/15" />
              <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-lg">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow section */}
      <section id="workflow" className="mx-auto max-w-6xl px-4 py-16">
        <div className="glass-strong crystal-in overflow-hidden rounded-3xl p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
                <Zap className="h-3 w-3" /> The Syncwave flow
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Write once. Publish <span className="gold-text">everywhere.</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Compose one brief. Our AI generates distinct, platform-native captions for every
                account — respecting each platform&apos;s tone, length, and hashtag conventions.
                Review, approve, and publish to all in a single flow.
              </p>
              <ul className="mt-6 space-y-3">
                {["AI generates distinct captions per platform", "Multi-account publishing in one click", "Approval workflows before anything goes live", "Account health + suspension protection"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <button onClick={onGetStarted} className="liquid-gold glow-ring mt-8 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold">
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

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="crystal-in glass-strong relative overflow-hidden rounded-3xl p-10 sm:p-14">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--gold)]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-[var(--primary)]/20 blur-3xl" />
          <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to <span className="gold-text">elevate</span> your social team?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
            Join the teams using Syncwave to publish smarter, protect their accounts, and beat the competition.
          </p>
          <button onClick={onGetStarted} className="liquid-gold glow-ring relative mt-6 flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold mx-auto">
            Get started free <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={22} />
            <span>Syncwave · Enterprise command center for social teams</span>
          </div>
          <span>© 2026 Syncwave · Liquid retina premium</span>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  { icon: Wand2, title: "AI Composer", desc: "Generate distinct, platform-native captions for every account from one brief — respecting tone, length & hashtag conventions." },
  { icon: ShieldCheck, title: "Account Protection", desc: "Anti-suspension guards: posting cadence limits, banned-hashtag blocker, behavior caps, smart cooldowns, and a suspension advisor." },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Deep insights across every platform — impressions, reach, engagement, audience growth, per-account comparison." },
  { icon: Users, title: "Team & Roles", desc: "Granular permissions per user — admin, manager, editor, member, viewer. Designations, departments, and access control." },
  { icon: Calendar, title: "Content Calendar", desc: "Plan and schedule your entire content pipeline with a visual month grid and drag-friendly scheduling." },
  { icon: Mail, title: "Mail Server", desc: "Host your team's email on your own domain — Hostinger, cPanel, Zoho or any provider. Create mailboxes, no Google needed." },
];

/* ===================== Login ===================== */
function LoginScreen({ onBack, onEnter }: { onBack: () => void; onEnter: (role: AuthRole) => void }) {
  const [email, setEmail] = React.useState("maya@prism.co");
  const [password, setPassword] = React.useState("prism2026");
  const [showPw, setShowPw] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = (role?: AuthRole) => {
    setLoading(true);
    setTimeout(() => {
      onEnter(role ?? "admin");
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
            <div className="relative flex items-center gap-2.5">
              <Logo size={38} />
              <LogoWordmark size="text-lg" />
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

          {/* Right — login form */}
          <div className="glass crystal-in flex flex-col justify-center p-8 sm:p-10" style={{ animationDelay: "0.15s" }}>
            <button onClick={onBack} className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
              <ArrowRight className="h-3 w-3 rotate-180" /> Back to home
            </button>

            <h1 className="text-2xl font-bold tracking-tight">Sign in to Prism</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => { e.preventDefault(); submit(); }}
            >
              <div>
                <label className="label-caps text-muted-foreground">Email</label>
                <div className="relative mt-1.5">
                  <MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-muted/30 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[var(--primary)]/50 focus:bg-background/50"
                    placeholder="you@prism.co"
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

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or continue as</span>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            {/* Quick role login */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { r: "admin" as AuthRole, label: "Admin", icon: ShieldCheck },
                { r: "manager" as AuthRole, label: "Manager", icon: Users },
                { r: "editor" as AuthRole, label: "Editor", icon: Wand2 },
                { r: "member" as AuthRole, label: "Member", icon: Mail },
              ]).map(({ r, label, icon: Icon }) => (
                <button
                  key={r}
                  onClick={() => submit(r)}
                  disabled={loading}
                  className="lift-hover flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-xs font-semibold transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5 text-[var(--gold)]" />
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              New to Prism?{" "}
              <button onClick={onBack} className="font-medium text-[var(--primary)] hover:underline">
                Explore features
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
