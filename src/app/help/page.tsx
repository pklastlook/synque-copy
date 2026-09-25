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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Help Center</h1>
          <p className="mt-4 text-lg text-muted-foreground">Find answers and get the most out of SocialFlow</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="Getting Started Guide" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F43F5E20', border: '1px solid #F43F5E40' }}>
                <Check className="h-5 w-5" style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Getting Started Guide</h3>
                <p className="mt-1 text-sm text-muted-foreground">New to SocialFlow? Start here with our step-by-step onboarding.</p>
              </div>
            </div>
          </div>
          <div key="AI Content Writer" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F43F5E20', border: '1px solid #F43F5E40' }}>
                <Check className="h-5 w-5" style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Content Writer</h3>
                <p className="mt-1 text-sm text-muted-foreground">Learn how to use the AI assistant to generate captions.</p>
              </div>
            </div>
          </div>
          <div key="Account Protection" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F43F5E20', border: '1px solid #F43F5E40' }}>
                <Check className="h-5 w-5" style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Account Protection</h3>
                <p className="mt-1 text-sm text-muted-foreground">Configure post limits, hashtag safety, and warm-up profiles.</p>
              </div>
            </div>
          </div>
          <div key="Multi-Tenant Setup" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F43F5E20', border: '1px solid #F43F5E40' }}>
                <Check className="h-5 w-5" style={{ color: '#F43F5E' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Multi-Tenant Setup</h3>
                <p className="mt-1 text-sm text-muted-foreground">Set up dedicated databases for each client organisation.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
