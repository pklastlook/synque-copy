"use client";

import * as React from "react";
import { Download, X, Share, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "socialflow-pwa-install-dismissed";
const DISMISS_DAYS = 7;
const SHOW_DELAY_MS = 15000; // 15 seconds

/**
 * PWA Install Prompt — non-intrusive top toast.
 *
 * - Chrome/Edge/Brave: captures `beforeinstallprompt`, shows a small toast
 * - Safari iOS: detects iOS + not standalone, shows "Add to Home Screen" steps
 * - NO full-screen backdrop (doesn't block the page)
 * - Dismissed state saved to localStorage for 7 days
 * - Only shows after 15s on the page
 * - Slides in from the top, sits above the app header
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
    <div
      className={cn(
        "pwa-install-toast apple-font animate-ios-slide-down",
        "fixed left-1/2 top-2 z-[100] w-[calc(100%-16px)] max-w-[420px] -translate-x-1/2",
        "rounded-2xl border border-border/50 bg-background/95 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.25)] backdrop-blur-xl",
      )}
      role="dialog"
      aria-label="Install SYNQUE app"
    >
      {/* Collapsed: compact row — icon + title + Install button + close */}
      {!showIOSInstructions ? (
        <div className="flex items-center gap-3 p-2.5">
          {/* App icon */}
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{ background: "linear-gradient(135deg, var(--primary), var(--gold, #FFD60A))" }}
          >
            <span className="text-sm font-extrabold text-white">S</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-bold leading-tight">Install SYNQUE</div>
            <div className="truncate text-[10px] text-muted-foreground leading-tight">
              Add to home screen · works offline
            </div>
          </div>
          <button
            onClick={handleInstall}
            className="liquid-pill flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Expanded: iOS instructions (no backdrop, inline) */
        <div className="p-3">
          <div className="flex items-start gap-3 pb-2.5">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--primary), var(--gold, #FFD60A))" }}
            >
              <span className="text-sm font-extrabold text-white">S</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold leading-tight">Install SYNQUE</div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                Add to Home Screen
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1.5 rounded-xl bg-muted/40 p-2.5">
            <div className="flex items-center gap-2 text-[11px] text-foreground/80">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">1</span>
              Tap the <Share className="inline h-3 w-3" /> Share button
            </div>
            <div className="flex items-center gap-2 text-[11px] text-foreground/80">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">2</span>
              Tap &ldquo;Add to Home Screen&rdquo;
            </div>
            <div className="flex items-center gap-2 text-[11px] text-foreground/80">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">3</span>
              Tap &ldquo;Add&rdquo; to confirm
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="mt-2.5 w-full rounded-xl bg-primary/10 py-2 text-[12px] font-semibold text-primary transition hover:bg-primary/20"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
