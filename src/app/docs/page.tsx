"use client";
import * as React from "react";
import { BookOpen, Code2, GraduationCap, Terminal, Boxes, Webhook, ArrowRight, Search } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const DOCS = [
  { icon: BookOpen, title: "Getting Started", desc: "Set up your workspace, connect accounts, and publish your first post.", accent: "oklch(0.55 0.2 255)" },
  { icon: Code2, title: "API Reference", desc: "Full REST API documentation with code examples.", accent: "oklch(0.62 0.22 300)" },
  { icon: GraduationCap, title: "Guides", desc: "Step-by-step walkthroughs for common workflows — publishing, scheduling, analytics.", accent: "oklch(0.68 0.22 145)" },
  { icon: Terminal, title: "Tutorials", desc: "Hands-on tutorials from first post to multi-account automation.", accent: "oklch(0.7 0.2 25)" },
  { icon: Boxes, title: "SDKs", desc: "Official SDKs for JavaScript, Python, and PHP. Community packages welcome.", accent: "oklch(0.66 0.18 200)" },
  { icon: Webhook, title: "Webhooks", desc: "Real-time event notifications for posts, analytics, and account health.", accent: "oklch(0.72 0.18 75)" },
];

const QUICK_LINKS = [
  { label: "Quickstart", href: "#" },
  { label: "Authentication", href: "/api-reference" },
  { label: "Posts API", href: "/api-reference" },
  { label: "Webhooks", href: "#" },
  { label: "Multi-tenant setup", href: "#" },
];

export default function DocsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <BookOpen className="h-3 w-3" /> Documentation
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Everything you need to <span className="gold-text">master SYNQUE</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            From your first post to multi-tenant deployments — guides, references, SDKs, and webhooks all in one place.
          </p>
        </div>

        {/* Search */}
        <div className="crystal-in mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3" style={{ animationDelay: "0.25s" }}>
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search the docs…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          <kbd className="hidden rounded-md border border-border/50 bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline">⌘K</kbd>
        </div>

        {/* Quick links */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {QUICK_LINKS.map((q) => (
            <a key={q.label} href={q.href} className="rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
              {q.label}
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS.map((d, i) => (
            <div key={d.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: d.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${d.accent}, oklch(0.45 0.16 258))` }}>
                <d.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{d.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{d.desc}</p>
              <div className="relative mt-3 flex items-center gap-1 text-xs font-medium text-[var(--primary)] opacity-0 transition group-hover:opacity-100">
                Browse <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Read the docs, then <span className="gold-text">try it live</span></h2>
          <p className="mt-3 text-muted-foreground">Every example in the docs works against your own 15-day trial workspace.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
