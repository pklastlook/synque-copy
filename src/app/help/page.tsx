"use client";
import * as React from "react";
import { LifeBuoy, CreditCard, Send, BarChart3, Plug, Lock, Search, ChevronDown } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";
import { cn } from "@/lib/utils";

const TOPICS = [
  { icon: LifeBuoy, title: "Getting Started", desc: "New to SocialFlow? Onboarding, first publish, account setup.", accent: "oklch(0.55 0.2 255)" },
  { icon: CreditCard, title: "Account & Billing", desc: "Plans, invoices, payment methods, switching tiers.", accent: "oklch(0.7 0.2 25)" },
  { icon: Send, title: "Publishing", desc: "Composer, scheduling, multi-account variants, drafts.", accent: "oklch(0.62 0.22 300)" },
  { icon: BarChart3, title: "Analytics", desc: "Reading metrics, building reports, comparing accounts.", accent: "oklch(0.66 0.18 200)" },
  { icon: Plug, title: "Integrations", desc: "Cloudinary, WhatsApp, Mail Server, webhook setup.", accent: "oklch(0.68 0.22 145)" },
  { icon: Lock, title: "Security", desc: "2FA, role permissions, account protection, audit logs.", accent: "oklch(0.72 0.18 75)" },
];

const FAQS = [
  { q: "How do I connect my first social account?", a: "Head to Accounts → Connect, pick a platform, and follow the OAuth flow. Each account connects independently — you can mix Instagram, X, LinkedIn, TikTok, YouTube, Facebook, and Threads in any combination." },
  { q: "Why are my posts going out as drafts?", a: "Most likely an approval workflow is active, or your role is Editor/Viewer rather than Admin/Manager. Check Settings → Roles, or ask your workspace admin to bump your permission level." },
  { q: "How do I activate account protection?", a: "Account Protection is on by default for every connected account. You can tune limits (daily post cap, hashtag bans, cooldown) from each account's Protection tab." },
  { q: "Can I cancel anytime?", a: "Yes — Settings → Billing → Cancel. You keep access until the end of your billing period and your data is retained for 30 days after cancellation." },
  { q: "How does AI composer billing work?", a: "Starter gets 100 generations/month, Growth is unlimited. Enterprise is also unlimited with custom model routing available." },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <LifeBuoy className="h-3 w-3" /> Help Center
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Find answers, <span className="gold-text">get unblocked</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Browse help topics by category, search the knowledge base, or open a ticket. Our support team replies 24/7.
          </p>
        </div>

        <div className="crystal-in mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3" style={{ animationDelay: "0.25s" }}>
          <Search className="h-4 w-4 text-muted-foreground" />
          <input placeholder="Search the help center…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((t, i) => (
            <div key={t.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: t.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${t.accent}, oklch(0.45 0.16 258))` }}>
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{t.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ accordion */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked <span className="gold-text">questions</span></h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="crystal-in glass rounded-2xl overflow-hidden" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-3 p-5 text-left">
                <span className="text-sm font-semibold">{f.q}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", openFaq === i && "rotate-180")} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Still <span className="gold-text">stuck?</span></h2>
          <p className="mt-3 text-muted-foreground">Start a trial and our team will personally walk you through the first publish.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
