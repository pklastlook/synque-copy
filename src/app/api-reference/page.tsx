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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">API Reference</h1>
          <p className="mt-4 text-lg text-muted-foreground">Complete REST API for developers</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="Authentication" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Authentication</h3>
                <p className="mt-1 text-sm text-muted-foreground">JWT-based auth with Bearer tokens and cookie support.</p>
              </div>
            </div>
          </div>
          <div key="Posts API" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Posts API</h3>
                <p className="mt-1 text-sm text-muted-foreground">Create, schedule, publish, and analyze posts across platforms.</p>
              </div>
            </div>
          </div>
          <div key="Analytics API" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Analytics API</h3>
                <p className="mt-1 text-sm text-muted-foreground">Retrieve engagement metrics, follower growth, and reach data.</p>
              </div>
            </div>
          </div>
          <div key="Media API" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Media API</h3>
                <p className="mt-1 text-sm text-muted-foreground">Upload, manage, and serve media via Cloudinary CDN.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
