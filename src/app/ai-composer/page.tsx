"use client";
import * as React from "react";
import { Wand2, Sparkles, Brain, Zap, Target, Languages, ArrowRight } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const USE_CASES = [
  { icon: Wand2, title: "Multi-Platform Variants", desc: "AI generates platform-native captions for Instagram, X, LinkedIn, TikTok, Threads & more — from one brief.", accent: "oklch(0.55 0.2 255)" },
  { icon: Sparkles, title: "AI Content Writer", desc: "Chat conversationally to draft and refine captions. Click to apply to any account.", accent: "oklch(0.7 0.2 25)" },
  { icon: Brain, title: "Per-Account Tone Memory", desc: "The composer remembers each account's preferred voice, slang, and emoji style.", accent: "oklch(0.62 0.22 300)" },
  { icon: Zap, title: "8 Tones, One Click", desc: "Professional, Friendly, Energetic, Inspirational, Witty, Bold, Calm, Storyteller — switch instantly.", accent: "oklch(0.72 0.18 75)" },
  { icon: Target, title: "Hashtag Intelligence", desc: "AI generates relevant hashtags per platform with engagement optimization and shadowban detection.", accent: "oklch(0.68 0.22 145)" },
  { icon: Languages, title: "Multilingual", desc: "Generate the same brief in 25+ languages with platform-appropriate idioms and length caps.", accent: "oklch(0.66 0.18 200)" },
];

const BEFORE_AFTER = [
  {
    platform: "Instagram",
    color: "oklch(0.68 0.24 25)",
    before: "New collection live now. Buy today.",
    after: "For creators who move fast. 🚀 Built to last, made to inspire. New collection just dropped — link in bio.",
  },
  {
    platform: "X",
    color: "oklch(0.2 0 0)",
    before: "New collection live now. Buy today.",
    after: "Move fast, create faster. New collection live now. 🚀",
  },
  {
    platform: "LinkedIn",
    color: "oklch(0.5 0.16 250)",
    before: "New collection live now. Buy today.",
    after: "We're excited to introduce our latest collection — engineered for teams that ship and creators who build.",
  },
  {
    platform: "TikTok",
    color: "oklch(0.3 0.02 250)",
    before: "New collection live now. Buy today.",
    after: "IT'S HERE!!! ✨ New drop just went live for creators who hustle — go go go 🏃‍♀️",
  },
];

const STEPS = [
  { n: "01", t: "Write one brief", d: "Paste a sentence or a full campaign brief. Any language, any tone hint." },
  { n: "02", t: "Pick accounts", d: "Select 1–7 accounts. Each gets its own platform-native variant." },
  { n: "03", t: "Tune & approve", d: "Edit any variant inline. Tone switch, hashtag adjust, length-tune in one click." },
];

export default function AiComposerPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Wand2 className="h-3 w-3" /> AI Composer
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Write once. Publish <span className="gold-text">everywhere.</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            One brief becomes platform-native captions for every account — respecting tone, length, hashtags, and emoji conventions. Powered by AI.
          </p>
        </div>
      </section>

      {/* Use case grid */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u, i) => (
            <div key={u.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: u.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${u.accent}, oklch(0.45 0.16 258))` }}>
                <u.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{u.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{u.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Before / after */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--gold)]" />
            <h2 className="text-2xl font-bold tracking-tight">Before <span className="text-muted-foreground">→</span> <span className="gold-text">after</span></h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Same brief, four platforms. The composer handles tone, length, hashtags, and emoji per platform.</p>

          <div className="mt-6 space-y-3">
            {BEFORE_AFTER.map((b, i) => (
              <div key={b.platform} className="crystal-in grid items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]" style={{ animationDelay: `${0.08 * i + 0.1}s` }}>
                <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Brief input</div>
                  <p className="mt-1 text-sm text-foreground/80">{b.before}</p>
                </div>
                <div className="hidden items-center justify-center sm:flex">
                  <ArrowRight className="h-4 w-4 text-[var(--gold)]" />
                </div>
                <div className="rounded-2xl border border-border/50 p-4" style={{ background: `${b.color.replace(")", " / 0.08)")}` }}>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: b.color }}>{b.platform}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/90">{b.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Three steps to <span className="gold-text">seven posts</span></h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="crystal-in glass lift-hover rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <span className="num-display text-3xl font-bold text-[var(--gold)]">{s.n}</span>
              <h3 className="mt-2 text-base font-semibold">{s.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Try the <span className="gold-text">composer</span> free</h2>
          <p className="mt-3 text-muted-foreground">15 days, unlimited AI generations on Growth plan trial.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
