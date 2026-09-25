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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Contact Us</h1>
          <p className="mt-4 text-lg text-muted-foreground">We'd love to hear from you</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="Sales" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Sales</h3>
                <p className="mt-1 text-sm text-muted-foreground">Interested in SocialFlow for your team? Let's talk.</p>
              </div>
            </div>
          </div>
          <div key="Support" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Support</h3>
                <p className="mt-1 text-sm text-muted-foreground">Our team is here 24/7 to help you.</p>
              </div>
            </div>
          </div>
          <div key="Partnerships" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Partnerships</h3>
                <p className="mt-1 text-sm text-muted-foreground">Let's build something great together.</p>
              </div>
            </div>
          </div>
          <div key="Press" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Press</h3>
                <p className="mt-1 text-sm text-muted-foreground">Media inquiries and press kit requests.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
