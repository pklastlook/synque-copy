"use client";

import * as React from "react";
import { ArrowRight, Check, Rocket, CreditCard, Star } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PLANS = [
  { name: "Starter", price: "$29", desc: "For solo creators & small teams getting started.", features: ["3 social accounts", "1 user", "AI composer (100/mo)", "Basic analytics", "Email support"], featured: false },
  { name: "Growth", price: "$89", desc: "For growing teams that publish daily.", features: ["15 social accounts", "5 users", "Unlimited AI composer", "Advanced analytics", "Account protection", "Approval workflows", "Priority support"], featured: true },
  { name: "Enterprise", price: "Custom", desc: "For large teams with custom needs.", features: ["Unlimited accounts", "Unlimited users", "Custom domain mail server", "SSO + SAML", "Dedicated success manager", "99.9% SLA"], featured: false },
];

const FAQS = [
  { q: "Is there really a 15-day free trial?", a: "Yes. You get full access to every module for 15 days. No charge until the trial ends. You can cancel anytime." },
  { q: "Do I need a credit card to start?", a: "You need to add a card to activate the trial, but you won't be charged for 15 days. We'll send a reminder 3 days before." },
  { q: "Can I switch plans later?", a: "Absolutely. You can upgrade or downgrade at any time from Settings → Billing. Changes take effect immediately." },
  { q: "What platforms are supported?", a: "Instagram, Facebook, X (Twitter), LinkedIn, TikTok, YouTube, and Threads — all 7 major platforms." },
  { q: "Is my data secure?", a: "Yes. All data is encrypted at rest (AES-256), passwords are bcrypt-hashed, and we support 2FA. We're SOC2-ready." },
  { q: "Can I use my own mail server?", a: "Yes — the Enterprise plan includes a custom domain mail server module. Connect Hostinger, cPanel, Zoho, or any provider." },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-6xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <CreditCard className="h-3 w-3" /> Pricing
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            Start with a <span className="gold-text">15-day free trial</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            No card to explore. Pick a plan when you're ready. Cancel anytime. All plans include the AI composer, account protection, and real-time analytics.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <div key={p.name} className={cn("crystal-in crystal-card relative overflow-hidden rounded-3xl p-6 lift-hover", p.featured ? "glass-strong ring-2 ring-[var(--gold)]" : "glass")} style={{ animationDelay: `${0.1 * i + 0.1}s` }}>
              {p.featured && <div className="absolute right-4 top-4 rounded-full bg-[var(--gold)] px-2 py-0.5 text-[10px] font-bold text-[var(--gold-foreground)]">Most popular</div>}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="num-display text-4xl font-bold">{p.price}</span>
                {p.price !== "Custom" && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{p.desc}</p>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <TrialCTA className={cn("mt-6 w-full justify-center rounded-xl py-2.5", p.featured ? "liquid-gold glow-ring" : "border border-border/50 bg-muted/40 hover:bg-muted")} label="Start 15-day trial" />
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Frequently asked <span className="gold-text">questions</span></h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f, i) => (
            <div key={i} className="crystal-in glass rounded-2xl overflow-hidden" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between gap-3 p-5 text-left">
                <span className="text-sm font-semibold">{f.q}</span>
                <span className={cn("text-muted-foreground transition-transform", openFaq === i && "rotate-45")}>+</span>
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
          <h2 className="text-3xl font-bold tracking-tight">Still have <span className="gold-text">questions?</span></h2>
          <p className="mt-3 text-muted-foreground">Start your trial and explore everything risk-free for 15 days.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
