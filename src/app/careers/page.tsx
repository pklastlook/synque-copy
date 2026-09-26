"use client";
import * as React from "react";
import { Briefcase, MapPin, Clock, Users, Heart, TrendingUp, ArrowRight } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const OPENINGS = [
  { icon: Briefcase, title: "Senior Full-Stack Engineer", team: "Engineering", location: "Remote · Global", type: "Full-time", accent: "oklch(0.55 0.2 255)" },
  { icon: Briefcase, title: "Product Designer", team: "Design", location: "Remote · EU/Americas", type: "Full-time", accent: "oklch(0.62 0.22 300)" },
  { icon: Briefcase, title: "AI/ML Engineer", team: "AI", location: "Remote · Global", type: "Full-time", accent: "oklch(0.7 0.2 25)" },
  { icon: Briefcase, title: "Customer Success Manager", team: "Success", location: "Remote · Americas", type: "Full-time", accent: "oklch(0.68 0.22 145)" },
];

const BENEFITS = [
  { icon: Heart, title: "Health, dental, vision", desc: "Premium coverage for you and your dependents, fully paid by SYNQUE.", accent: "oklch(0.68 0.22 145)" },
  { icon: Clock, title: "Flexible hours", desc: "Work when you do your best. Async by default across 9 time zones.", accent: "oklch(0.72 0.18 75)" },
  { icon: Users, title: "Remote-first", desc: "We've been distributed since day one. Twice-yearly team retreats.", accent: "oklch(0.55 0.2 255)" },
  { icon: TrendingUp, title: "Growth budget", desc: "$2,500/yr for courses, conferences, books, or coaching.", accent: "oklch(0.7 0.2 25)" },
];

const VALUES = [
  "Build for teams, not personas",
  "Ship small, ship often",
  "Default to transparent",
  "Protect the user's accounts like they're our own",
];

export default function CareersPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Briefcase className="h-3 w-3" /> Careers
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Build the future of <span className="gold-text">social media</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Join us in building the future of social media management. Remote-first, async by default, and obsessed with protecting our customers' accounts.
          </p>
        </div>
      </section>

      {/* Culture / values */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight">How we <span className="gold-text">work</span></h2>
          <p className="mt-3 text-sm text-muted-foreground">A small team with big opinions about what good software looks like.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v} className="flex items-center gap-3 rounded-2xl bg-muted/30 px-4 py-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--gold)]/15 text-[var(--gold)]">
                  <Heart className="h-3 w-3" />
                </span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Benefits & <span className="gold-text">perks</span></h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <div key={b.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: b.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${b.accent}, oklch(0.45 0.16 258))` }}>
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-base font-semibold">{b.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open positions */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Open <span className="gold-text">positions</span></h2>
          <span className="text-sm text-muted-foreground">{OPENINGS.length} roles</span>
        </div>
        <div className="space-y-3">
          {OPENINGS.map((o, i) => (
            <div key={o.title} className="crystal-in glass lift-hover group relative flex flex-wrap items-center gap-4 overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: o.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${o.accent}, oklch(0.45 0.16 258))` }}>
                <o.icon className="h-5 w-5" />
              </div>
              <div className="relative min-w-0 flex-1">
                <h3 className="text-lg font-semibold">{o.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {o.team}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.location}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {o.type}</span>
                </div>
              </div>
              <button className="relative inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-4 py-2 text-xs font-semibold transition hover:bg-muted group-hover:text-[var(--gold)]">
                Apply <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Don't see your <span className="gold-text">role?</span></h2>
          <p className="mt-3 text-muted-foreground">Email careers@synque.cloud — we hire from the inbound pile all the time.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" label="Try SYNQUE" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
