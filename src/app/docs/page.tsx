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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Documentation</h1>
          <p className="mt-4 text-lg text-muted-foreground">Everything you need to integrate and master SocialFlow</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="Getting Started" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Getting Started</h3>
                <p className="mt-1 text-sm text-muted-foreground">Set up your workspace, connect accounts, and publish your first post.</p>
              </div>
            </div>
          </div>
          <div key="API Reference" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">API Reference</h3>
                <p className="mt-1 text-sm text-muted-foreground">Full REST API documentation with code examples.</p>
              </div>
            </div>
          </div>
          <div key="Webhooks" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Webhooks</h3>
                <p className="mt-1 text-sm text-muted-foreground">Real-time event notifications for posts and analytics.</p>
              </div>
            </div>
          </div>
          <div key="Multi-Tenant Setup" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Multi-Tenant Setup</h3>
                <p className="mt-1 text-sm text-muted-foreground">Configure dedicated databases for your clients.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
