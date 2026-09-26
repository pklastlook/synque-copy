"use client";
import * as React from "react";
import { Mail, Phone, MessageCircle, Handshake, ArrowRight, Send } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";

const CHANNELS = [
  {
    icon: Handshake,
    title: "Sales",
    desc: "Interested in SYNQUE for your team? Let's talk.",
    email: "sales@synque.cloud",
    phone: "+1 (415) 555-0142",
    accent: "oklch(0.7 0.2 25)",
  },
  {
    icon: MessageCircle,
    title: "Support",
    desc: "Our team is here 24/7 to help you.",
    email: "support@synque.cloud",
    phone: "+1 (415) 555-0143",
    accent: "oklch(0.55 0.2 255)",
  },
  {
    icon: Mail,
    title: "Partnerships",
    desc: "Let's build something great together.",
    email: "partners@synque.cloud",
    phone: "+1 (415) 555-0144",
    accent: "oklch(0.62 0.22 300)",
  },
  {
    icon: Phone,
    title: "Press",
    desc: "Media inquiries and press kit requests.",
    email: "press@synque.cloud",
    phone: "+1 (415) 555-0145",
    accent: "oklch(0.66 0.18 200)",
  },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Mail className="h-3 w-3" /> Contact
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            We'd love to <span className="gold-text">hear from you</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Pick the channel that fits — sales, support, partnerships, or press — and a real human will get back to you within one business day.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((c, i) => (
            <div key={c.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: c.accent }} />
              <div className="relative grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${c.accent}, oklch(0.45 0.16 258))` }}>
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="relative mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
              <div className="relative mt-4 space-y-1.5 text-xs">
                <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 font-medium text-[var(--primary)] hover:underline">
                  <Mail className="h-3 w-3" /> {c.email}
                </a>
                <a href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  <Phone className="h-3 w-3" /> {c.phone}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact form */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight">Send us a <span className="gold-text">message</span></h2>
          <p className="mt-2 text-sm text-muted-foreground">Tell us a bit about what you need. We typically reply within a few hours.</p>
          {submitted ? (
            <div className="mt-6 rounded-2xl bg-emerald-500/10 px-4 py-6 text-center text-sm font-medium text-emerald-500">
              Thanks — your message is on its way. We'll be in touch shortly.
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">Name</span>
                  <input required type="text" placeholder="Jane Doe" className="mt-1 w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--gold)] focus:bg-background" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">Email</span>
                  <input required type="email" placeholder="jane@company.com" className="mt-1 w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--gold)] focus:bg-background" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Subject</span>
                <select className="mt-1 w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--gold)] focus:bg-background">
                  <option>Sales inquiry</option>
                  <option>Support request</option>
                  <option>Partnership</option>
                  <option>Press</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">Message</span>
                <textarea required rows={4} placeholder="How can we help?" className="mt-1 w-full resize-none rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--gold)] focus:bg-background" />
              </label>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[var(--gold)] px-5 py-2.5 text-sm font-semibold text-[var(--gold-foreground)] shadow-lg transition hover:opacity-90">
                <Send className="h-4 w-4" /> Send message <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
