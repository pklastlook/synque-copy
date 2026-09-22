"use client";

import * as React from "react";
import { ArrowRight, Zap, Check, Wand2, Rocket } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";
import Link from "next/link";

const STEPS = [
  { n: "01", t: "Select accounts", d: "Pick from Instagram, X, LinkedIn, TikTok, YouTube, Facebook, Threads. Multi-select with one click.", icon: "📁" },
  { n: "02", t: "Write your brief", d: "One caption + tone. Our AI generates distinct, platform-native captions for each account automatically.", icon: "✍️" },
  { n: "03", t: "Upload media", d: "Drop your image or video once. We adapt it for each platform's format requirements.", icon: "🖼️" },
  { n: "04", t: "Preview & approve", d: "See per-account variants in phone-style previews. Edit any before publishing.", icon: "👁️" },
  { n: "05", t: "Publish or schedule", d: "One click sends it to every account — or queues it for the optimal time.", icon: "🚀" },
];

export default function WorkflowPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-6xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Zap className="h-3 w-3" /> Workflow
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Write once. Publish <span className="gold-text">everywhere.</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            The SocialFlow flow turns multi-platform publishing into a single, guided 5-step wizard. No more copy-pasting between tabs — one brief goes in, platform-native posts come out.
          </p>
        </div>
      </section>

      {/* Steps timeline */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className="crystal-in glass lift-hover flex items-start gap-4 rounded-3xl p-6" style={{ animationDelay: `${0.1 * i + 0.1}s` }}>
              <div className="flex flex-col items-center">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-lg font-bold text-white shadow-lg">
                  {s.n}
                </span>
                {i < STEPS.length - 1 && <div className="mt-2 h-12 w-px bg-border/40" />}
              </div>
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{s.icon}</span>
                  <h3 className="text-lg font-semibold">{s.t}</h3>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI composer demo */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="crystal-in glass-strong rounded-3xl p-8">
          <div className="flex items-center gap-2 border-b border-border/40 pb-3">
            <Wand2 className="h-4 w-4 text-[var(--gold)]" />
            <span className="text-sm font-semibold">AI Composer Preview</span>
            <span className="ml-auto rounded-full bg-[var(--gold)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--gold)]">5 accounts</span>
          </div>
          <div className="mt-3 space-y-2">
            {[
              { p: "Instagram", c: "For creators who move fast. 🚀 Built to last, made to inspire...", color: "oklch(0.68 0.24 25)" },
              { p: "X", c: "Move fast, create faster. New collection, live now. 🚀", color: "oklch(0.2 0 0)" },
              { p: "LinkedIn", c: "We're excited to introduce our latest collection engineered for...", color: "oklch(0.5 0.16 250)" },
              { p: "TikTok", c: "IT'S HERE!!! ✨ New drop just went live for creators who hustle", color: "oklch(0.3 0.02 250)" },
              { p: "Threads", c: "New collection just dropped. Tap in. 🔥", color: "oklch(0.25 0 0)" },
            ].map((v, i) => (
              <div key={v.p} className="crystal-in flex items-start gap-2.5 rounded-xl bg-muted/30 p-2.5" style={{ animationDelay: `${0.15 * i + 0.3}s` }}>
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: v.color }} />
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--gold)]">{v.p}</div>
                  <div className="truncate text-xs text-muted-foreground">{v.c}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Experience the <span className="gold-text">flow</span> yourself</h2>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
