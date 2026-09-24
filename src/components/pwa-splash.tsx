"use client";

import * as React from "react";

/**
 * PWA Splash Screen — iOS/Android native app launch animation.
 * Shows the SocialFlow logo with ripple effects, title, subtitle,
 * and a loading bar. Fades out after 2s.
 */
export function PwaSplashScreen({ onComplete }: { onComplete: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pwa-splash">
      {/* Logo with ripple effects */}
      <div className="pwa-splash-logo">
        <div className="pwa-splash-ripple" />
        <div className="pwa-splash-ripple" />
        <div className="pwa-splash-logo-bg" />
        <div className="pwa-splash-logo-text">SF</div>
      </div>

      {/* Title */}
      <div className="pwa-splash-title">SocialFlow</div>
      <div className="pwa-splash-subtitle">Social, Simplified</div>

      {/* Loading bar */}
      <div className="pwa-splash-bar">
        <div className="pwa-splash-bar-fill" />
      </div>
    </div>
  );
}
