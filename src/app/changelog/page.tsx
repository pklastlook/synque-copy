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
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Changelog</h1>
          <p className="mt-4 text-lg text-muted-foreground">What's new in SocialFlow</p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div key="AI-Powered Assistant" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI-Powered Assistant</h3>
                <p className="mt-1 text-sm text-muted-foreground">Natural language commands with 18 tools — schedule posts, create tasks, and more.</p>
              </div>
            </div>
          </div>
          <div key="Multi-Tenant DB Isolation" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Multi-Tenant DB Isolation</h3>
                <p className="mt-1 text-sm text-muted-foreground">Each organisation gets its own dedicated PostgreSQL database.</p>
              </div>
            </div>
          </div>
          <div key="Cloudinary Integration" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Cloudinary Integration</h3>
                <p className="mt-1 text-sm text-muted-foreground">CDN-backed media storage with auto image optimization.</p>
              </div>
            </div>
          </div>
          <div key="Organization Module" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Organization Module</h3>
                <p className="mt-1 text-sm text-muted-foreground">Manage users, roles, departments, and designations with full CRUD.</p>
              </div>
            </div>
          </div>
          <div key="WhatsApp Integration" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">WhatsApp Integration</h3>
                <p className="mt-1 text-sm text-muted-foreground">Scan QR code to connect. Messages auto-forward to your inbox.</p>
              </div>
            </div>
          </div>
          <div key="Scheduler Service" className="group relative overflow-hidden rounded-xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: '#8B5CF620', border: '1px solid #8B5CF640' }}>
                <Check className="h-5 w-5" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Scheduler Service</h3>
                <p className="mt-1 text-sm text-muted-foreground">Auto-publish scheduled posts every 60 seconds.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
