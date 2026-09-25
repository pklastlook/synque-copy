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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Blog</h1>
          <p className="mt-4 text-lg text-muted-foreground">Insights, tips, and stories from the social media frontier</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="How AI is Transforming Social Media" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">How AI is Transforming Social Media</h3>
                <p className="mt-1 text-sm text-muted-foreground">The future of content creation is here.</p>
              </div>
            </div>
          </div>
          <div key="5 Ways to Prevent Account Suspensions" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">5 Ways to Prevent Account Suspensions</h3>
                <p className="mt-1 text-sm text-muted-foreground">Protect your accounts with automated safeguards.</p>
              </div>
            </div>
          </div>
          <div key="Building Multi-Tenant SaaS" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Building Multi-Tenant SaaS</h3>
                <p className="mt-1 text-sm text-muted-foreground">How SocialFlow isolates client data with dedicated databases.</p>
              </div>
            </div>
          </div>
          <div key="Hashtag Strategy Guide" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Hashtag Strategy Guide</h3>
                <p className="mt-1 text-sm text-muted-foreground">Maximize your reach with data-driven hashtag selection.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
