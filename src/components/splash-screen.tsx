"use client";

import * as React from "react";
import { Logo } from "@/components/glass/logo";

/**
 * SplashScreen — animated SYNQUE intro overlay shown on first visit
 * per browser session (uses sessionStorage so it replays on a new tab/window
 * but never on route changes or refreshes inside the same session).
 *
 * Animation sequence (when prefers-reduced-motion is NOT set):
 *   0ms     → fade in   (0.5s, splashFadeIn)
 *   500ms   → hold      (1.5s)
 *   2000ms  → fade out  (0.5s, splashFadeOut)
 *   2500ms  → unmount
 *
 * With prefers-reduced-motion: briefly visible (~600ms) then unmounts
 * with no animation.
 *
 * This component is purely a visual intro — it does NOT gate data loading.
 * The underlying LandingPage / AppShell renders immediately underneath;
 * the splash simply sits on top (z-[9999]) until it fades away.
 *
 * The splash renders only ONCE per session — sessionStorage is checked
 * before the animation is kicked off, so subsequent visits inside the
 * same tab session skip the splash entirely (no flash).
 */
const SESSION_KEY = "synque:splash-seen";

/** Use layout effect on the client (no SSR warning, runs before paint). */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

type Phase = "in" | "out" | "done";

export function SplashScreen() {
  const [phase, setPhase] = React.useState<Phase>("in");

  useIsomorphicLayoutEffect(() => {
    // sessionStorage check — skip splash entirely if already shown.
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage unavailable (e.g., private mode, sandboxed iframe) —
      // skip the splash so we never trap the user behind a frozen overlay.
      seen = true;
    }

    if (seen) {
      setPhase("done");
      return;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      // Show briefly without animation, then hide.
      const t = setTimeout(() => {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* noop */
        }
        setPhase("done");
      }, 600);
      return () => clearTimeout(t);
    }

    // Animated sequence: 0.5s fade-in → 1.5s hold → 0.5s fade-out → done.
    const tOut = setTimeout(() => setPhase("out"), 2000);
    const tDone = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* noop */
      }
      setPhase("done");
    }, 2500);

    return () => {
      clearTimeout(tOut);
      clearTimeout(tDone);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className={["splash-screen", phase === "out" ? "splash-screen--exit" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
      role="presentation"
    >
      <div className="splash-screen-content">
        <div className="splash-screen-logo">
          <Logo size={128} withTile={false} />
        </div>

        <div className="splash-screen-title">
          SYN<span className="splash-screen-title-accent">QUE</span>
        </div>
        <div className="splash-screen-subtitle">Orchestrate Your Social</div>

        <div className="splash-screen-progress" aria-hidden="true">
          <div className="splash-screen-progress-fill" />
        </div>
      </div>
    </div>
  );
}
