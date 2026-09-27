"use client";

import * as React from "react";
import { Logo } from "@/components/glass/logo";

/**
 * PWA Splash Screen — shown when the app is launched as an installed PWA
 * (iOS/Android native launch). Renders the same Logo + wordmark + progress
 * bar as the first-visit `SplashScreen`, using the same CSS classes and
 * keyframes — so install-launch and regular visits look identical.
 *
 * Animation sequence (matches SplashScreen):
 *   0ms     → fade in  (0.5s, splashFadeIn)
 *   500ms   → hold     (1.5s)
 *   2000ms  → fade out (0.5s, splashFadeOut)
 *   2500ms  → onComplete() — parent unmounts the splash
 *
 * With prefers-reduced-motion: visible for ~600ms, no animation, then
 * onComplete() fires.
 */
export function PwaSplashScreen({ onComplete }: { onComplete: () => void }) {
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // No animation — briefly visible, then hand control back to the parent.
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }

    // Start the fade-out after 0.5s in + 1.5s hold = 2.0s.
    const tExit = setTimeout(() => setExiting(true), 2000);
    // Notify parent after the 0.5s fade-out completes (2.5s total).
    const tDone = setTimeout(onComplete, 2500);

    return () => {
      clearTimeout(tExit);
      clearTimeout(tDone);
    };
  }, [onComplete]);

  return (
    <div
      className={["pwa-splash", exiting ? "pwa-splash--exit" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
      role="presentation"
    >
      <div className="pwa-splash-content">
        <div className="pwa-splash-logo">
          <Logo size={128} withTile={false} />
        </div>

        <div className="pwa-splash-title">
          SYN<span className="pwa-splash-title-accent">QUE</span>
        </div>
        <div className="pwa-splash-subtitle">Orchestrate Your Social</div>

        <div className="pwa-splash-bar" aria-hidden="true">
          <div className="pwa-splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}
