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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Careers</h1>
          <p className="mt-4 text-lg text-muted-foreground">Join us in building the future of social media management</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="Senior Full-Stack Engineer" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F59E0B20', border: '1px solid #F59E0B40' }}>
                <Check className="h-5 w-5" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Senior Full-Stack Engineer</h3>
                <p className="mt-1 text-sm text-muted-foreground">Build the next generation of social media tools with Next.js and AI.</p>
              </div>
            </div>
          </div>
          <div key="Product Designer" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F59E0B20', border: '1px solid #F59E0B40' }}>
                <Check className="h-5 w-5" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Product Designer</h3>
                <p className="mt-1 text-sm text-muted-foreground">Shape the visual identity and user experience of SocialFlow.</p>
              </div>
            </div>
          </div>
          <div key="AI/ML Engineer" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F59E0B20', border: '1px solid #F59E0B40' }}>
                <Check className="h-5 w-5" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI/ML Engineer</h3>
                <p className="mt-1 text-sm text-muted-foreground">Develop intelligent content generation and analytics models.</p>
              </div>
            </div>
          </div>
          <div key="Customer Success Manager" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#F59E0B20', border: '1px solid #F59E0B40' }}>
                <Check className="h-5 w-5" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Customer Success Manager</h3>
                <p className="mt-1 text-sm text-muted-foreground">Help teams get the most out of SocialFlow.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
