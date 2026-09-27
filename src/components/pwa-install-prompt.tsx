"use client";

import * as React from "react";
import { Download, X, Share, Plus, Check, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "socialflow-pwa-install-dismissed";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 30000; // 30 seconds

/**
 * PWA Install Prompt — cross-browser install notification.
 *
 * - Chrome/Edge/Brave: captures `beforeinstallprompt` event, shows custom banner
 * - Safari iOS: detects iOS + not standalone, shows "Add to Home Screen" instructions
 * - Firefox/other: shows manual install instructions
 * - Dismissed state saved to localStorage for 7 days
 * - Only shows after 30s on the page (non-intrusive)
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = React.useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);

  // Check if already installed (standalone mode)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }
  }, []);

  // Capture beforeinstallprompt (Chrome/Edge)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    function handler(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Detect iOS Safari (not standalone)
  const isIOS = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    return isIOSDevice && isSafari;
  }, []);

  // Show after delay (if not dismissed recently + not installed)
  React.useEffect(() => {
    if (installed) return;
    if (typeof window === "undefined") return;

    // Check dismissed state
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const daysSince = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_DAYS) return; // still dismissed
      }
    } catch { /* ignore */ }

    // Show after delay
    const timer = setTimeout(() => {
      // Only show if we have a deferred prompt OR we're on iOS
      if (deferredPrompt || isIOS) {
        setShow(true);
        if (isIOS && !deferredPrompt) {
          setShowIOSInstructions(true);
        }
      }
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [deferredPrompt, isIOS, installed]);

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice) => {
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
        setDeferredPrompt(null);
        setShow(false);
      });
    }
  }

  function handleDismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch { /* ignore */ }
  }

  if (!show || installed) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        onClick={handleDismiss}
        className="fixed inset-0 z-[90] animate-ios-fade-scale bg-black/20 backdrop-blur-sm"
        aria-label="Close install prompt"
      />

      {/* Prompt card */}
      <div
        className={cn(
          "glass-strong glass-sheen apple-font animate-ios-slide-up",
          "fixed bottom-4 left-4 right-4 z-[100] sm:bottom-6 sm:left-auto sm:right-6 sm:w-[380px]",
          "rounded-3xl border border-border/40 p-5 shadow-2xl",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Install SYNQUE app"
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-3">
          {/* App icon */}
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--gold, #FFD60A))",
            }}
          >
            <span className="text-lg font-extrabold text-white">S</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">Install SYNQUE</div>
            <div className="text-[11px] text-muted-foreground">
              Add to your {isIOS ? "Home Screen" : "device"} for quick access
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-1.5 pb-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Check className="h-3 w-3 shrink-0 text-emerald-500" />
            Full-screen experience, no browser chrome
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Check className="h-3 w-3 shrink-0 text-emerald-500" />
            Faster launch with offline support
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Check className="h-3 w-3 shrink-0 text-emerald-500" />
            Push notifications for new messages
          </div>
        </div>

        {/* iOS instructions */}
        {showIOSInstructions ? (
          <div className="space-y-2 rounded-2xl bg-muted/40 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              How to install on iOS:
            </div>
            <div className="flex items-center gap-2 text-[11px] text-foreground/80">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">1</span>
              Tap the <Share className="inline h-3 w-3" /> Share button
            </div>
            <div className="flex items-center gap-2 text-[11px] text-foreground/80">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">2</span>
              Tap "Add to Home Screen"
            </div>
            <div className="flex items-center gap-2 text-[11px] text-foreground/80">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">3</span>
              Tap "Add" to confirm
            </div>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {!showIOSInstructions && (
            <button
              onClick={handleInstall}
              className="liquid-pill glow-ring flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
            >
              <Download className="h-4 w-4" />
              Install
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/50 bg-muted/40 px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {showIOSInstructions ? "Got it" : "Not now"}
          </button>
        </div>
      </div>
    </>
  );
}
