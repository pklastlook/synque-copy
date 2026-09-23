"use client";

import * as React from "react";
import { ArrowRight, Rocket, Globe, ShieldCheck, Zap, Users } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";
import { GlassCard } from "@/components/glass/glass-card";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Users className="h-3 w-3" /> About
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            We're building the <span className="gold-text">future</span> of social media management
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            SocialFlow was born from a simple frustration: managing 7+ social platforms is chaos. Teams waste hours copy-pasting, accounts get suspended, and nobody has a clear picture of what's working. We set out to fix that.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight">Our mission</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Every social media team deserves tools that work as hard as they do. We believe the future of social media management isn't about more features — it's about fewer tools doing more, intelligently. One platform that writes your content, protects your accounts, measures your impact, and keeps your entire team in sync. That's SocialFlow.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We started with a simple question: what if you could write one brief and have AI generate distinct, platform-native captions for every account? What if those captions respected each platform's tone, length, and hashtag conventions? What if your accounts never got suspended because the platform itself prevented the patterns that trigger suspensions? That's what we built.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">What we <span className="gold-text">stand for</span></h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, title: "Speed over complexity", desc: "Every feature must make your team faster, not add more steps. If it doesn't save time, we don't ship it." },
            { icon: ShieldCheck, title: "Safety first", desc: "Your accounts are your livelihood. Every feature is designed to protect them, not put them at risk." },
            { icon: Globe, title: "Open by default", desc: "We support 7 platforms and counting. Your data is yours — export it, delete it, control it." },
            { icon: Users, title: "Built for teams", desc: "Real collaboration: roles, permissions, approvals, and a shared workspace that actually works." },
          ].map((v, i) => (
            <div key={v.title} className="crystal-in glass lift-hover rounded-3xl p-6" style={{ animationDelay: `${0.08 * i + 0.1}s` }}>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-lg">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{v.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="crystal-in glass-strong grid grid-cols-2 gap-px overflow-hidden rounded-3xl md:grid-cols-4">
          {[
            { v: "17", l: "Integrated modules" },
            { v: "7+", l: "Social platforms" },
            { v: "100%", l: "Real-time data" },
            { v: "24/7", l: "Account protection" },
          ].map((s, i) => (
            <div key={s.l} className="crystal-in p-6 text-center" style={{ animationDelay: `${0.08 * i + 0.1}s` }}>
              <div className="num-display text-3xl font-bold text-[var(--gold)]">{s.v}</div>
              <div className="label-caps mt-2 text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Join the <span className="gold-text">movement</span></h2>
          <p className="mt-3 text-muted-foreground">Start your 15-day trial and see why teams switch to SocialFlow.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
