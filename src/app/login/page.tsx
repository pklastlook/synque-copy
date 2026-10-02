"use client";

import * as React from "react";
import { ArrowRight, ShieldCheck, Check, Lock, Mail as MailIcon, Eye, EyeOff, Loader2, ShieldAlert, Sparkles, Zap, BarChart3, Play } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { LogoWordmark } from "@/components/glass/logo";
import Link from "next/link";

export default function LoginPage() {
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
      // On success, auth-store updates isAuthenticated and page.tsx swaps to AppShell
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
      // On success, auth-store updates isAuthenticated and page.tsx swaps to AppShell
    } catch {
      setError("Could not start the demo session. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background glow — subtle, premium */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-[var(--gold)]/6 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="grid w-full max-w-[1020px] overflow-hidden rounded-[20px] lg:grid-cols-[1.1fr_1fr]" style={{ boxShadow: "0 25px 60px -15px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)" }}>

          {/* === LEFT — Brand Panel === */}
          <div className="relative hidden flex-col justify-between p-10 lg:flex bg-card border-r border-border">
            {/* Ambient glow inside the panel */}
            <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-primary/8 blur-[80px]" />

            {/* Logo — static, no animation, square tile */}
            <div className="relative">
              <Link href="/" className="inline-block">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                  <span className="text-lg font-extrabold italic tracking-tight text-primary-foreground">S</span>
                </div>
                <LogoWordmark size="text-lg" logoSize={30} static className="mt-3" />
              </Link>
            </div>

            {/* Hero text */}
            <div className="relative">
              <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Social Media Management
              </div>
              <h2 className="text-[32px] font-bold leading-[1.15] tracking-tight">
                Welcome back to your<br />
                <span className="retaina-text">command center.</span>
              </h2>
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-muted-foreground">
                Sign in to manage your team, publish across every platform, and keep your accounts safe — all from one beautiful workspace.
              </p>

              {/* Feature list — clean, generous spacing */}
              <div className="mt-8 space-y-3.5">
                {[
                  { icon: Zap, text: "AI per-account content generation" },
                  { icon: ShieldCheck, text: "Account suspension protection" },
                  { icon: BarChart3, text: "Real-time analytics & insights" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[13px] font-medium text-foreground/80">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security badges — pill style */}
            <div className="relative flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                Encrypted
              </div>
              <div className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                2FA Ready
              </div>
              <div className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                SOC2
              </div>
            </div>
          </div>

          {/* === RIGHT — Login Form === */}
          <div className="flex flex-col justify-center bg-card px-8 py-10 sm:px-12">

            {/* Mobile logo — static square tile (hidden on desktop, left panel has it) */}
            <div className="mb-6 flex flex-col items-center lg:hidden">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
                <span className="text-lg font-extrabold italic tracking-tight text-primary-foreground">S</span>
              </div>
              <LogoWordmark size="text-lg" logoSize={30} static className="mt-2" />
            </div>

            {/* Back link */}
            <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
              <ArrowRight className="h-3 w-3 rotate-180" /> Back to home
            </Link>

            {/* Form */}
            <div className="max-w-sm">
              <h1 className="text-[22px] font-bold tracking-tight">Sign in</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">Enter your credentials to continue</p>

              <form className="mt-8 space-y-5" onSubmit={submit}>
                {/* Email */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Email</label>
                  <div className="relative mt-2">
                    <MailIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm outline-none transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                      placeholder="you@yourcompany.com"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Password</label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm outline-none transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition hover:text-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember + forgot */}
                <div className="flex items-center justify-between text-[12px]">
                  <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                    <input type="checkbox" className="h-3.5 w-3.5 rounded accent-primary" defaultChecked />
                    Remember me
                  </label>
                  <button type="button" className="font-medium text-primary transition hover:underline">Forgot password?</button>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2.5 text-[12px] font-medium text-rose-600 dark:text-rose-400">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Submit — solid, tactile */}
                <button
                  type="submit"
                  disabled={loading}
                  className="liquid-pill flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>

              {/* Divider */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Live Demo — one click, no signup */}
              <button
                type="button"
                onClick={startDemo}
                disabled={demoLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/10 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {demoLoading ? "Loading demo…" : "Try Live Demo"}
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Browse every module as a read-only viewer — no account needed.
              </p>

              {/* Trial CTA */}
              <Link
                href="/"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/50 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sparkles className="h-4 w-4 text-primary" />
                Start a 15-day free trial
              </Link>

              <p className="mt-6 text-center text-[12px] text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/" className="font-medium text-primary hover:underline">Contact your admin</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
