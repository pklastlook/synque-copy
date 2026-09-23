"use client";

import * as React from "react";
import { KeyRound, Loader2, Check, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { LogoWordmark } from "@/components/glass/logo";
import Link from "next/link";

export default function ActivatePage() {
  const [key, setKey] = React.useState("");
  const [deviceName, setDeviceName] = React.useState("");
  const [phase, setPhase] = React.useState<"input" | "activating" | "success">("input");
  const [error, setError] = React.useState("");

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) { setError("Please enter your serial key"); return; }
    setError("");
    setPhase("activating");
    try {
      const res = await fetch("/api/serial-keys/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim(), deviceName: deviceName.trim() || navigator.userAgent.slice(0, 40) }),
      });
      const data = await res.json();
      if (res.ok) {
        setTimeout(() => setPhase("success"), 1800);
      } else {
        setError(data.error || "Activation failed");
        setPhase("input");
      }
    } catch {
      setError("Network error");
      setPhase("input");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="retaina-bg" aria-hidden>
        <div className="blob-3" />
      </div>
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8">
        {phase === "input" && (
          <div className="glass-strong crystal-in w-full max-w-md rounded-3xl p-8 sm:p-10">
            <div className="text-center">
              <div className="relative mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--gold)] text-white shadow-lg">
                <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-50 blur-md" style={{ background: "var(--primary)" }} />
                <KeyRound className="relative h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Activate Your Device</h1>
              <p className="mt-2 text-sm text-muted-foreground">Enter your serial key to activate SocialFlow on this device.</p>
            </div>
            <form onSubmit={activate} className="mt-6 space-y-4">
              <div>
                <label className="label-caps text-muted-foreground">Serial Key</label>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                    placeholder="SF-PRO-2026-XXXXX"
                    className="w-full rounded-xl border border-border/50 bg-muted/30 py-2.5 pl-10 pr-3 text-sm font-mono tracking-wide outline-none transition focus:border-[var(--primary)]/50 focus:bg-background/50"
                  />
                </div>
              </div>
              <div>
                <label className="label-caps text-muted-foreground">Device Name (optional)</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="My MacBook Pro"
                  className="mt-1.5 w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-sm outline-none transition focus:border-[var(--primary)]/50 focus:bg-background/50"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-500">
                  <ShieldCheck className="h-3.5 w-3.5" /> {error}
                </div>
              )}
              <button type="submit" className="liquid-pill glow-ring flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold">
                <KeyRound className="h-4 w-4" /> Activate Device
              </button>
            </form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Don&apos;t have a key? Contact your account manager.
            </p>
          </div>
        )}

        {phase === "activating" && (
          <div className="glass-strong crystal-in flex w-full max-w-md flex-col items-center rounded-3xl p-10 text-center">
            <div className="relative mb-6">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--primary)]/15 text-[var(--primary)]">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--primary)]/10" />
            </div>
            <h2 className="text-xl font-bold">Activating your device…</h2>
            <p className="mt-1 text-sm text-muted-foreground">Verifying serial key and registering device</p>
          </div>
        )}

        {phase === "success" && (
          <div className="glass-strong crystal-in flex w-full max-w-md flex-col items-center rounded-3xl p-10 text-center" style={{ animation: "successPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both" }}>
            <div className="relative mb-6">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/10" />
              <Sparkles className="absolute -right-2 -top-2 h-6 w-6 text-[var(--gold)] animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold">Successfully Activated!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your device has been registered. Welcome to SocialFlow.</p>
            <div className="mt-6 w-full rounded-2xl border border-border/40 bg-muted/30 p-5">
              <div className="flex items-center gap-3">
                <LogoWordmark size="text-base" logoSize={28} />
              </div>
              <p className="mt-3 text-sm font-medium">Welcome, you&apos;re all set!</p>
              <p className="mt-1 text-xs text-muted-foreground">Sign in with your credentials to access your workspace.</p>
              <Link href="/login" className="liquid-pill glow-ring mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold">
                Sign in <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes successPop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}
