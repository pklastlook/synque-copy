"use client";

import * as React from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { LogoWordmark } from "@/components/glass/logo";
import Link from "next/link";

export default function ActivatePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="retaina-bg" aria-hidden>
        <div className="blob-3" />
      </div>
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
        <div className="glass-strong crystal-in w-full max-w-md rounded-3xl p-8 sm:p-10 text-center">
          <div className="relative mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-lg">
            <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-50 blur-md" style={{ background: "var(--primary)" }} />
            <ShieldCheck className="relative h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to SYNQUE</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account has been created by your administrator. Sign in with your email and password to access your workspace.
          </p>
          <div className="mt-6 rounded-2xl border border-border/40 bg-muted/30 p-4 text-left">
            <div className="flex items-center gap-3">
              <LogoWordmark size="text-base" logoSize={28} static />
            </div>
            <p className="mt-3 text-sm font-medium">Sign in to get started</p>
            <p className="mt-1 text-xs text-muted-foreground">Use the email and password provided to you by your account manager.</p>
            <Link href="/login" className="liquid-pill glow-ring mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold">
              Go to sign in <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[var(--gold)]" /> Need help? Contact your account manager.
          </div>
        </div>
      </div>
    </div>
  );
}
