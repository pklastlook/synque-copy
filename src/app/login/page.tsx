"use client";

import * as React from "react";
import { ArrowRight, ShieldCheck, Check, Lock, Mail as MailIcon, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-store";
import { LogoWordmark } from "@/components/glass/logo";
import Link from "next/link";

export default function LoginPage() {
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
              <Link href="/"><LogoWordmark size="text-xl" /></Link>
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
            <Link href="/" className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground">
              <ArrowRight className="h-3 w-3 rotate-180" /> Back to home
            </Link>

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
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
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

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
                  <ShieldAlert className="h-3.5 w-3.5" /> {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="liquid-pill glow-ring flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Don&apos;t have an account? Contact your workspace admin to get invited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
