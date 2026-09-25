"use client";
import * as React from "react";
import { ShieldCheck, Lock, AlertTriangle, Gauge, CalendarClock, KeyRound, Check } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const PROTECTIONS = [
  { icon: Gauge, title: "Daily Post Limits", desc: "Set maximum posts per day per account to prevent spam triggers.", accent: "oklch(0.68 0.22 145)" },
  { icon: AlertTriangle, title: "Hashtag Safety Checker", desc: "Automatically flag banned hashtags before publishing. Editable custom blocklist.", accent: "oklch(0.7 0.2 25)" },
  { icon: CalendarClock, title: "Warm-Up Mode", desc: "Gradually increase posting frequency for new accounts. Auto-ramps over 14 days.", accent: "oklch(0.72 0.18 75)" },
  { icon: KeyRound, title: "2FA Enforcement", desc: "Require two-factor authentication for all team members on sensitive actions.", accent: "oklch(0.66 0.18 200)" },
  { icon: Lock, title: "Behavior Caps", desc: "Per-day caps on DMs, follows, comments — prevents automated-pattern detection.", accent: "oklch(0.62 0.22 300)" },
  { icon: ShieldCheck, title: "Smart Cooldown", desc: "Auto-pauses posting the moment a platform warns you. Resumes when health returns.", accent: "oklch(0.55 0.2 255)" },
];

const RISK_LEVELS = [
  { level: "Safe", color: "oklch(0.68 0.22 145)", desc: "All signals green. Posting at normal cadence.", accounts: "@yourbrand.ig · @yourbrand.x · /yourbrand", value: 12 },
  { level: "Elevated", color: "oklch(0.72 0.18 75)", desc: "Hashtag warnings or follower churn detected. Cooldown active for 30 min.", accounts: "@yourbrand.tiktok", value: 52 },
  { level: "High risk", color: "oklch(0.62 0.24 25)", desc: "Platform warning received. Auto-paused. Action required.", accounts: "@yourbrand.threads", value: 84 },
];

export default function ProtectionPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <ShieldCheck className="h-3 w-3" /> Account Protection
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Never get <span className="gold-text">suspended</span> again
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Automated safeguards that watch every account, every minute. When risk rises, SocialFlow tells you exactly what to fix — and auto-enforces the guardrails for you.
          </p>
        </div>

        {/* Shield hero card */}
        <div className="crystal-in glass-strong relative mt-8 overflow-hidden rounded-3xl p-8 sm:p-10" style={{ animationDelay: "0.25s" }}>
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[var(--gold)]/10 blur-3xl" />
          <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-xl">
                <ShieldCheck className="h-8 w-8" />
                <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-4 ring-background">
                  ✓
                </span>
              </div>
              <div>
                <div className="text-base font-semibold">Account Health: Protected</div>
                <div className="text-xs text-muted-foreground">All guards active · last scan 12 seconds ago</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="num-display text-2xl font-bold text-[var(--gold)]">7</div>
                <div className="label-caps text-[10px] text-muted-foreground">Accounts guarded</div>
              </div>
              <div>
                <div className="num-display text-2xl font-bold text-[var(--gold)]">0</div>
                <div className="label-caps text-[10px] text-muted-foreground">Suspensions (12 mo)</div>
              </div>
              <div>
                <div className="num-display text-2xl font-bold text-[var(--gold)]">99.9%</div>
                <div className="label-caps text-[10px] text-muted-foreground">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protection cards */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROTECTIONS.map((p, i) => (
            <div key={p.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: p.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${p.accent}, oklch(0.45 0.16 258))` }}>
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{p.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Risk levels */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Risk <span className="gold-text">levels we monitor</span></h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Every account is scored in real time across 12 signals.</p>
        <div className="mt-8 space-y-3">
          {RISK_LEVELS.map((r, i) => (
            <div key={r.level} className="crystal-in glass rounded-2xl p-5" style={{ animationDelay: `${0.08 * i + 0.1}s` }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                  <span className="text-sm font-bold uppercase tracking-wide" style={{ color: r.color }}>{r.level}</span>
                  <span className="text-xs text-muted-foreground">{r.accounts}</span>
                </div>
                <span className="num-display text-lg font-bold" style={{ color: r.color }}>{r.value}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{r.desc}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.value}%`, background: r.color }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="crystal-in glass-strong rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight">Every account gets <span className="gold-text">all guards on</span></h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Posting cadence limits (no more rapid-fire spam)",
              "Banned-hashtag blocker with custom lists",
              "Behavior caps on DMs, follows, comments",
              "Smart cooldown auto-pauses on warnings",
              "2FA enforcement for team members",
              "Warm-up mode for new accounts (14-day ramp)",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Protect your <span className="gold-text">accounts</span> today</h2>
          <p className="mt-3 text-muted-foreground">15-day free trial — every guard is on by default for every connected account.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
