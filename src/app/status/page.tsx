"use client";
import * as React from "react";
import { Server, Database, Cloud, Zap, Globe, Activity } from "lucide-react";
import { LandingNav, LandingFooter, LandingBg, TrialCTA } from "@/components/landing-shared";
import { cn } from "@/lib/utils";

type Status = "operational" | "degraded" | "outage";

const SERVICES: { icon: typeof Server; title: string; desc: string; status: Status; uptime: string; accent: string }[] = [
  { icon: Globe, title: "Web Application", desc: "All systems operational — 99.98% uptime this month.", status: "operational", uptime: "99.98%", accent: "oklch(0.68 0.22 145)" },
  { icon: Server, title: "API Services", desc: "All endpoints responding normally.", status: "operational", uptime: "99.99%", accent: "oklch(0.55 0.2 255)" },
  { icon: Activity, title: "WhatsApp Service", desc: "QR generation and message forwarding active.", status: "operational", uptime: "99.95%", accent: "oklch(0.66 0.18 200)" },
  { icon: Zap, title: "Scheduler Service", desc: "Post scheduling and auto-publishing running.", status: "operational", uptime: "99.97%", accent: "oklch(0.72 0.18 75)" },
  { icon: Cloud, title: "Cloudinary CDN", desc: "Media uploads and transformations operational.", status: "degraded", uptime: "99.42%", accent: "oklch(0.7 0.2 25)" },
  { icon: Database, title: "Neon Database", desc: "All tenant databases connected and healthy.", status: "operational", uptime: "99.99%", accent: "oklch(0.62 0.22 300)" },
];

const STATUS_META: Record<Status, { label: string; color: string; ring: string }> = {
  operational: { label: "Operational", color: "oklch(0.68 0.22 145)", ring: "bg-emerald-500/15 text-emerald-500" },
  degraded: { label: "Degraded", color: "oklch(0.72 0.18 75)", ring: "bg-amber-500/15 text-amber-500" },
  outage: { label: "Outage", color: "oklch(0.62 0.24 25)", ring: "bg-rose-500/15 text-rose-500" },
};

const INCIDENTS = [
  { date: "Mar 18, 2025", title: "Cloudinary media upload latency", status: "Monitoring", desc: "Some media uploads are taking longer than usual. Engineers are monitoring Cloudinary's CDN edge." },
  { date: "Feb 04, 2025", title: "Scheduled maintenance — scheduler", status: "Resolved", desc: "Scheduler service restarted with new queue backend. No missed posts." },
];

export default function StatusPage() {
  const allOk = SERVICES.every((s) => s.status === "operational");

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <LandingBg />
      <LandingNav />

      <section className="relative mx-auto max-w-4xl px-4 pt-20 pb-8 sm:pt-28">
        <div className="text-center">
          <span className="crystal-in inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-semibold text-[var(--gold)]">
            <Activity className="h-3 w-3" /> Status
          </span>
          <h1 className="crystal-in mt-4 text-4xl font-bold tracking-tight sm:text-6xl" style={{ animationDelay: "0.1s" }}>
            System <span className="gold-text">status</span>
          </h1>
          <p className="crystal-in mx-auto mt-4 max-w-2xl text-muted-foreground" style={{ animationDelay: "0.2s" }}>
            Real-time status of every SocialFlow service. Updates every 60 seconds.
          </p>
        </div>

        {/* Overall banner */}
        <div className="crystal-in glass-strong mt-8 flex items-center justify-between rounded-3xl p-6" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center gap-3">
            <span className={cn("relative h-3 w-3 rounded-full", allOk ? "bg-emerald-500" : "bg-amber-500")}>
              <span className={cn("absolute inset-0 animate-ping rounded-full", allOk ? "bg-emerald-500" : "bg-amber-500")} />
            </span>
            <div>
              <div className="text-base font-semibold">{allOk ? "All systems operational" : "Partial degradation"}</div>
              <div className="text-xs text-muted-foreground">Last updated just now · refreshed every 60s</div>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-2xl font-bold text-[var(--gold)]">99.97%</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">30-day uptime</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => {
            const meta = STATUS_META[s.status];
            return (
              <div key={s.title} className="crystal-in glass lift-hover group relative overflow-hidden rounded-3xl p-6" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
                <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.1] blur-2xl transition group-hover:opacity-20" style={{ background: s.accent }} />
                <div className="relative flex items-start justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" style={{ background: `linear-gradient(135deg, ${s.accent}, oklch(0.45 0.16 258))` }}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", meta.ring)}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                    {meta.label}
                  </span>
                </div>
                <h3 className="relative mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="relative mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                <div className="relative mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">30-day uptime</span>
                  <span className="font-bold text-[var(--gold)]">{s.uptime}</span>
                </div>
                {/* uptime bars */}
                <div className="relative mt-3 flex gap-0.5">
                  {Array.from({ length: 30 }).map((_, d) => {
                    const degraded = s.status === "degraded" && d > 20 && d < 25;
                    return (
                      <span key={d} className="h-6 flex-1 rounded-sm" style={{ background: degraded ? "oklch(0.72 0.18 75)" : "oklch(0.68 0.22 145)", opacity: degraded ? 0.7 : 0.85 }} />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Incident history */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">Recent <span className="gold-text">incidents</span></h2>
        <div className="mt-8 space-y-3">
          {INCIDENTS.map((inc, i) => (
            <div key={inc.title} className="crystal-in glass rounded-2xl p-5" style={{ animationDelay: `${0.05 * i + 0.1}s` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{inc.date}</span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", inc.status === "Resolved" ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500")}>
                  {inc.status}
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold">{inc.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{inc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="crystal-in glass-strong rounded-3xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold tracking-tight">Reliability you can <span className="gold-text">count on</span></h2>
          <p className="mt-3 text-muted-foreground">Try SocialFlow risk-free for 15 days — backed by 99.9% uptime SLA.</p>
          <div className="mt-6 mx-auto w-fit">
            <TrialCTA className="liquid-gold glow-ring" />
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
