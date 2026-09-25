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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">AI Composer</h1>
          <p className="mt-4 text-lg text-muted-foreground">Write once. Publish everywhere. Powered by AI.</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="Multi-Platform Variants" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Multi-Platform Variants</h3>
                <p className="mt-1 text-sm text-muted-foreground">AI generates platform-native captions for Instagram, X, LinkedIn, TikTok, and more.</p>
              </div>
            </div>
          </div>
          <div key="AI Content Writer" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Content Writer</h3>
                <p className="mt-1 text-sm text-muted-foreground">Chat conversationally to draft and refine captions. Click to apply.</p>
              </div>
            </div>
          </div>
          <div key="Tone Control" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Tone Control</h3>
                <p className="mt-1 text-sm text-muted-foreground">Choose from 8 tones</p>
              </div>
            </div>
          </div>
          <div key=" Professional, Friendly, Energetic, Inspirational, and more." className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground"> Professional, Friendly, Energetic, Inspirational, and more.</h3>
                <p className="mt-1 text-sm text-muted-foreground">Hashtag Intelligence</p>
              </div>
            </div>
          </div>
          <div key="AI generates relevant hashtags per platform with engagement optimization." className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#14B8A620', border: '1px solid #14B8A640' }}>
                <Check className="h-5 w-5" style={{ color: '#14B8A6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI generates relevant hashtags per platform with engagement optimization.</h3>
                <p className="mt-1 text-sm text-muted-foreground"></p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
