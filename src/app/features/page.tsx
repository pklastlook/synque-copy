"use client";

import * as React from "react";
import { ArrowRight, ShieldCheck, Zap, Users, BarChart3, Calendar, Wand2, Mail, Server, MessageCircle, Target, Hash, Check, Rocket } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";
import { GlassCard } from "@/components/glass/glass-card";
import Link from "next/link";

const FEATURES = [
  { icon: Wand2, title: "AI Composer", desc: "Generate distinct, platform-native captions for every account from one brief — respecting tone, length & hashtag conventions.", accent: "oklch(0.55 0.2 255)" },
  { icon: ShieldCheck, title: "Account Protection", desc: "Anti-suspension guards: posting cadence limits, banned-hashtag blocker, behavior caps, smart cooldowns, and a suspension advisor.", accent: "oklch(0.68 0.22 145)" },
  { icon: BarChart3, title: "Advanced Analytics", desc: "Deep insights across every platform — impressions, reach, engagement, audience growth, per-account comparison.", accent: "oklch(0.62 0.22 300)" },
  { icon: Users, title: "Team & Roles", desc: "Granular permissions per user — admin, manager, editor, member, viewer. Designations, departments, and access control.", accent: "oklch(0.7 0.2 25)" },
  { icon: Calendar, title: "Content Calendar", desc: "Plan and schedule your entire content pipeline with a visual month grid and drag-friendly scheduling.", accent: "oklch(0.66 0.18 200)" },
  { icon: Server, title: "Mail Server", desc: "Host your team's email on your own domain — Hostinger, cPanel, Zoho or any provider. Create mailboxes, no Google needed.", accent: "oklch(0.72 0.18 75)" },
  { icon: MessageCircle, title: "Unified Inbox", desc: "Comments and DMs from every account in one inbox. Sentiment-tagged, assignable, reply-ready.", accent: "oklch(0.62 0.22 300)" },
  { icon: Target, title: "Competitor Tracking", desc: "Benchmark rivals with follower-growth charts, engagement comparisons, and posting-frequency insights.", accent: "oklch(0.55 0.2 255)" },
  { icon: Hash, title: "Hashtag Manager", desc: "Save reusable hashtag groups per platform, track trending tags, and block shadowbanned hashtags.", accent: "oklch(0.68 0.22 145)" },
];

export default function FeaturesPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-6xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Zap className="h-3 w-3" /> Features
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Everything your team needs to <span className="gold-text">win social</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            From ideation to publishing to protection — 17 integrated modules in one premium platform. Each one designed to eliminate a specific pain point in your social media workflow.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="crystal-in crystal-card glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: f.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${f.accent}, oklch(0.45 0.16 258))` }}>
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

      {/* Protection deep-dive */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
                <ShieldCheck className="h-3 w-3" /> Account Protection
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">Never get <span className="gold-text">suspended</span> again</h2>
              <p className="mt-3 text-muted-foreground">
                SocialFlow monitors every account's health in real time. When risk rises — from spam flags, report spikes, or aggressive engagement — we tell you exactly what to fix and auto-enforce guards.
              </p>
              <ul className="mt-6 space-y-3">
                {["Posting cadence limits (no more rapid-fire spam)", "Banned-hashtag blocker with custom lists", "Behavior caps on DMs, follows, comments", "Smart cooldown auto-pauses on warnings", "2FA enforcement + warm-up for new accounts"].map((t) => (
                  <li key={t} className="flex items-center gap-2.5 text-sm">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="glass rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Account Health</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">Healthy</span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { n: "@yourbrand.ig", r: "safe", v: 12, c: "oklch(0.55 0.2 255)" },
                    { n: "@yourbrand", r: "elevated", v: 52, c: "oklch(0.72 0.18 75)" },
                    { n: "/yourbrand", r: "safe", v: 9, c: "oklch(0.68 0.22 145)" },
                  ].map((a, i) => (
                    <div key={a.n} className="crystal-in flex items-center gap-3" style={{ animationDelay: `${0.1 * i + 0.2}s` }}>
                      <span className="w-28 truncate text-xs text-muted-foreground">{a.n}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${a.v}%`, background: a.c }} />
                      </div>
                      <span className="w-8 text-right text-xs font-bold tabular-nums" style={{ color: a.c }}>{a.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Ready to <span className="gold-text">get started?</span></h2>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
