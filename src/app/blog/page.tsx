"use client";
import * as React from "react";
import { FileText, TrendingUp, Hash, PenLine, ArrowRight, Clock } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const ARTICLES = [
  {
    icon: PenLine,
    category: "AI",
    title: "How AI is Transforming Social Media",
    desc: "The future of content creation is here.",
    author: "Maya Chen",
    date: "Mar 12, 2025",
    read: "6 min",
    accent: "oklch(0.55 0.2 255)",
  },
  {
    icon: FileText,
    category: "Protection",
    title: "5 Ways to Prevent Account Suspensions",
    desc: "Protect your accounts with automated safeguards.",
    author: "Devon Pierce",
    date: "Mar 04, 2025",
    read: "8 min",
    accent: "oklch(0.68 0.22 145)",
  },
  {
    icon: TrendingUp,
    category: "Engineering",
    title: "Building Multi-Tenant SaaS",
    desc: "How SYNQUE isolates client data with dedicated databases.",
    author: "Priya Anand",
    date: "Feb 22, 2025",
    read: "11 min",
    accent: "oklch(0.62 0.22 300)",
  },
  {
    icon: Hash,
    category: "Strategy",
    title: "Hashtag Strategy Guide",
    desc: "Maximize your reach with data-driven hashtag selection.",
    author: "Jordan Reyes",
    date: "Feb 10, 2025",
    read: "7 min",
    accent: "oklch(0.7 0.2 25)",
  },
  {
    icon: FileText,
    category: "Workflow",
    title: "The 5-Step Publishing Flow",
    desc: "From one brief to seven platform-native posts — inside the composer.",
    author: "Maya Chen",
    date: "Jan 28, 2025",
    read: "5 min",
    accent: "oklch(0.66 0.18 200)",
  },
  {
    icon: TrendingUp,
    category: "Analytics",
    title: "Engagement Rate, Demystified",
    desc: "The only metric that actually predicts follower growth.",
    author: "Priya Anand",
    date: "Jan 15, 2025",
    read: "9 min",
    accent: "oklch(0.72 0.18 75)",
  },
];

export default function BlogPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <PenLine className="h-3 w-3" /> Blog
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Insights from the <span className="gold-text">social frontier</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Tips, deep dives, and stories from the team building SYNQUE — covering AI, account safety, analytics, and modern social media workflow.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((a, i) => (
            <div key={a.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: a.accent }} />
              <div className="relative flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${a.accent}, oklch(0.45 0.16 258))` }}>
                  <a.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${a.accent.replace(")", " / 0.15)")}`, color: a.accent }}>
                  {a.category}
                </span>
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{a.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
              <div className="relative mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{a.author}</span>
                <span>·</span>
                <span>{a.date}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {a.read}</span>
              </div>
              <div className="relative mt-3 flex items-center gap-1 text-xs font-medium text-[var(--primary)] opacity-0 transition group-hover:opacity-100">
                Read article <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Build your own <span className="gold-text">story</span></h2>
          <p className="mt-3 text-muted-foreground">Try SYNQUE free for 15 days and put these insights to work.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
