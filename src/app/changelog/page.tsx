"use client";
import * as React from "react";
import { GitBranch, Rocket, Wrench, Sparkles, Shield, Zap, Check } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const RELEASES = [
  {
    version: "v2.4.0",
    date: "Mar 18, 2025",
    tag: "Feature",
    icon: Sparkles,
    accent: "oklch(0.55 0.2 255)",
    summary: "AI-Powered Assistant",
    changes: [
      "Natural language commands with 18 tools — schedule posts, create tasks, and more.",
      "Per-account tone memory — the assistant remembers each account's preferred voice.",
      "Faster streaming responses with cancel-mid-generation support.",
    ],
  },
  {
    version: "v2.3.2",
    date: "Mar 04, 2025",
    tag: "Improvement",
    icon: Wrench,
    accent: "oklch(0.72 0.18 75)",
    summary: "Scheduler polish",
    changes: [
      "Auto-publish scheduled posts every 60 seconds (was 5 minutes).",
      "Calendar drag-and-drop now snaps to 15-minute grid.",
      "Fixed timezone drift on weekly recurring posts.",
    ],
  },
  {
    version: "v2.3.0",
    date: "Feb 22, 2025",
    tag: "Feature",
    icon: Rocket,
    accent: "oklch(0.7 0.2 25)",
    summary: "Multi-Tenant DB Isolation",
    changes: [
      "Each organisation gets its own dedicated PostgreSQL database.",
      "Migration wizard with zero-downtime cutover.",
      "Per-tenant backup export & restore.",
    ],
  },
  {
    version: "v2.2.1",
    date: "Feb 10, 2025",
    tag: "Feature",
    icon: Zap,
    accent: "oklch(0.66 0.18 200)",
    summary: "Cloudinary Integration",
    changes: [
      "CDN-backed media storage with auto image optimization.",
      "Inline transform presets — square, story, reel.",
      "Faster media library load (3.2s → 480ms).",
    ],
  },
  {
    version: "v2.2.0",
    date: "Jan 28, 2025",
    tag: "Feature",
    icon: GitBranch,
    accent: "oklch(0.62 0.22 300)",
    summary: "Organization Module",
    changes: [
      "Manage users, roles, departments, and designations with full CRUD.",
      "Granular per-module permissions (Admin / Manager / Editor / Member / Viewer).",
      "Audit log for all permission changes.",
    ],
  },
  {
    version: "v2.1.0",
    date: "Jan 15, 2025",
    tag: "Security",
    icon: Shield,
    accent: "oklch(0.68 0.22 145)",
    summary: "Account Protection v2",
    changes: [
      "WhatsApp Integration — scan QR to connect. Messages auto-forward to your inbox.",
      "Smart cooldown auto-pauses accounts on warning signals.",
      "Banned-hashtag blocker with editable custom lists.",
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  Feature: "bg-[var(--gold)]/15 text-[var(--gold)]",
  Improvement: "bg-amber-500/15 text-amber-500",
  Security: "bg-emerald-500/15 text-emerald-500",
};

export default function ChangelogPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <GitBranch className="h-3 w-3" /> Changelog
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            What's <span className="gold-text">new</span> in SocialFlow
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Every release — features, improvements, security, and fixes. Shipped continuously, documented honestly.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="relative space-y-4">
          {/* vertical rail */}
          <div className="pointer-events-none absolute left-[1.45rem] top-0 h-full w-px bg-border/40" />
          {RELEASES.map((r, i) => (
            <div key={r.version} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6 pl-20" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: r.accent }} />
              {/* node */}
              <div className="absolute left-4 top-6 grid h-10 w-10 place-items-center rounded-2xl text-white shadow-lg ring-4 ring-background" style={{ background: `linear-gradient(135deg, ${r.accent}, oklch(0.45 0.16 258))` }}>
                <r.icon className="h-4 w-4" />
              </div>

              <div className="relative flex flex-wrap items-center gap-2">
                <span className="num-display text-base font-bold">{r.version}</span>
                <span className="text-xs text-muted-foreground">{r.date}</span>
                <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TAG_STYLES[r.tag] ?? "bg-muted text-muted-foreground"}`}>
                  {r.tag}
                </span>
              </div>
              <h3 className="relative mt-2 text-lg font-semibold">{r.summary}</h3>
              <ul className="relative mt-3 space-y-2">
                {r.changes.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Get the <span className="gold-text">latest</span></h2>
          <p className="mt-3 text-muted-foreground">Start a 15-day trial and you're immediately on the newest build.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
