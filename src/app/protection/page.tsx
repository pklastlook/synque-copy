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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Account Protection</h1>
          <p className="mt-4 text-lg text-muted-foreground">Never get suspended again — automated safeguards</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="Daily Post Limits" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F43F5E20', border: '1px solid #F43F5E40' }}>
                <Check className="h-5 w-5" style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Daily Post Limits</h3>
                <p className="mt-1 text-sm text-muted-foreground">Set maximum posts per day per account to prevent spam triggers.</p>
              </div>
            </div>
          </div>
          <div key="Hashtag Safety Checker" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F43F5E20', border: '1px solid #F43F5E40' }}>
                <Check className="h-5 w-5" style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Hashtag Safety Checker</h3>
                <p className="mt-1 text-sm text-muted-foreground">Automatically flag banned hashtags before publishing.</p>
              </div>
            </div>
          </div>
          <div key="Warm-Up Mode" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F43F5E20', border: '1px solid #F43F5E40' }}>
                <Check className="h-5 w-5" style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Warm-Up Mode</h3>
                <p className="mt-1 text-sm text-muted-foreground">Gradually increase posting frequency for new accounts.</p>
              </div>
            </div>
          </div>
          <div key="2FA Enforcement" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F43F5E20', border: '1px solid #F43F5E40' }}>
                <Check className="h-5 w-5" style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">2FA Enforcement</h3>
                <p className="mt-1 text-sm text-muted-foreground">Require two-factor authentication for all team members.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
