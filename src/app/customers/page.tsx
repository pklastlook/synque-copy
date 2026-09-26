"use client";
import * as React from "react";
import { Building2, TrendingUp, Users, Star, Quote, Award } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const STORIES = [
  {
    logo: "SC",
    company: "Social Media Cell",
    industry: "Agency",
    accent: "oklch(0.55 0.2 255)",
    quote: "Reduced posting time by 73% across 7+ platforms with AI-generated variants.",
    metric: "73%",
    metricLabel: "less time posting",
    author: "Lena Park",
    role: "Head of Social",
  },
  {
    logo: "LL",
    company: "LastLook Studios",
    industry: "Production",
    accent: "oklch(0.68 0.22 145)",
    quote: "Eliminated account suspensions with automated protection rules.",
    metric: "0",
    metricLabel: "suspensions in 9 mo.",
    author: "Marco Vidale",
    role: "Studio Director",
  },
  {
    logo: "BC",
    company: "Brand Collective",
    industry: "DTC",
    accent: "oklch(0.62 0.22 300)",
    quote: "Increased engagement by 240% using AI-optimized posting schedules.",
    metric: "240%",
    metricLabel: "more engagement",
    author: "Priya Shah",
    role: "Growth Lead",
  },
  {
    logo: "CH",
    company: "Creative Hub",
    industry: "Creative agency",
    accent: "oklch(0.7 0.2 25)",
    quote: "Unified 12 team members into one collaborative workflow.",
    metric: "12",
    metricLabel: "creators, one inbox",
    author: "Devon Yu",
    role: "Founder",
  },
];

const STATS = [
  { v: "1,200+", l: "Teams onboarded" },
  { v: "7M+", l: "Posts published" },
  { v: "99.97%", l: "Uptime" },
  { v: "4.9/5", l: "Avg. customer rating" },
];

const BADGES = ["SOC2-ready", "GDPR", "AES-256 at rest", "bcrypt + 2FA"];

export default function CustomersPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Award className="h-3 w-3" /> Customers
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Teams that transformed their <span className="gold-text">social workflow</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            From agencies to direct-to-consumer brands — here's what changes when SYNQUE runs your social stack.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="crystal-in glass-strong grid grid-cols-2 gap-px overflow-hidden rounded-3xl md:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={s.l} className="crystal-in p-6 text-center" style={{ animationDelay: `${0.08 * i + 0.1}s` }}>
              <div className="num-display text-3xl font-bold text-[var(--gold)]">{s.v}</div>
              <div className="label-caps mt-2 text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {STORIES.map((s, i) => (
            <div key={s.company} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: s.accent }} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl text-sm font-bold text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${s.accent}, oklch(0.45 0.16 258))` }}>
                    {s.logo}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{s.company}</div>
                    <div className="text-xs text-muted-foreground">{s.industry}</div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
                  ))}
                </div>
              </div>

              <div className="relative mt-4 flex gap-2">
                <Quote className="h-5 w-5 shrink-0 text-[var(--gold)]" />
                <p className="text-sm leading-relaxed text-foreground/90">{s.quote}</p>
              </div>

              <div className="relative mt-5 flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
                <div>
                  <div className="num-display text-2xl font-bold text-[var(--gold)]">{s.metric}</div>
                  <div className="label-caps text-[10px] text-muted-foreground">{s.metricLabel}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold">{s.author}</div>
                  <div className="text-[10px] text-muted-foreground">{s.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust badges */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="crystal-in glass-strong rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" /> Trusted & compliant:
            </span>
            {BADGES.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 px-3 py-1 text-xs font-medium">
                <Award className="h-3 w-3 text-[var(--gold)]" /> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Join 1,200+ teams <span className="gold-text">already winning</span></h2>
          <p className="mt-3 text-muted-foreground">15-day free trial. No card to explore. Cancel anytime.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
