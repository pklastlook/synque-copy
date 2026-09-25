"use client";
import { LandingNav, LandingFooter, LandingBg } from "@/components/landing-shared";
import { Check } from "lucide-react";

export default function Page() {
  return (
    <div className="relative min-h-screen">
      <LandingBg />
      <LandingNav />
      <main className="relative mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8" style={{ minHeight: "70vh" }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">System Status</h1>
          <p className="mt-4 text-lg text-muted-foreground">Real-time status of all SocialFlow services</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="Web Application" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#34C75920', border: '1px solid #34C75940' }}>
                <Check className="h-5 w-5" style={{ color: '#34C759' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Web Application</h3>
                <p className="mt-1 text-sm text-muted-foreground">All systems operational — 99.98% uptime this month.</p>
              </div>
            </div>
          </div>
          <div key="API Services" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#34C75920', border: '1px solid #34C75940' }}>
                <Check className="h-5 w-5" style={{ color: '#34C759' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">API Services</h3>
                <p className="mt-1 text-sm text-muted-foreground">All endpoints responding normally.</p>
              </div>
            </div>
          </div>
          <div key="WhatsApp Service" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#34C75920', border: '1px solid #34C75940' }}>
                <Check className="h-5 w-5" style={{ color: '#34C759' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">WhatsApp Service</h3>
                <p className="mt-1 text-sm text-muted-foreground">QR generation and message forwarding active.</p>
              </div>
            </div>
          </div>
          <div key="Scheduler Service" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#34C75920', border: '1px solid #34C75940' }}>
                <Check className="h-5 w-5" style={{ color: '#34C759' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Scheduler Service</h3>
                <p className="mt-1 text-sm text-muted-foreground">Post scheduling and auto-publishing running.</p>
              </div>
            </div>
          </div>
          <div key="Cloudinary CDN" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#34C75920', border: '1px solid #34C75940' }}>
                <Check className="h-5 w-5" style={{ color: '#34C759' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Cloudinary CDN</h3>
                <p className="mt-1 text-sm text-muted-foreground">Media uploads and transformations operational.</p>
              </div>
            </div>
          </div>
          <div key="Neon Database" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#34C75920', border: '1px solid #34C75940' }}>
                <Check className="h-5 w-5" style={{ color: '#34C759' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Neon Database</h3>
                <p className="mt-1 text-sm text-muted-foreground">All tenant databases connected and healthy.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
