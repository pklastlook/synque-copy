"use client";

import * as React from "react";

/**
 * PWA Splash Screen — iOS/Android native app launch animation.
 * Shows the SocialFlow logo SVG with liquid glass ripple effects,
 * title, subtitle, and a loading bar. Fades out after 2s.
 */
export function PwaSplashScreen({ onComplete }: { onComplete: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="pwa-splash">
      {/* Logo with liquid glass ripple effects */}
      <div className="pwa-splash-logo">
        {/* Expanding ripple rings */}
        <div className="pwa-splash-ripple" />
        <div className="pwa-splash-ripple" />

        {/* Glass background with gradient */}
        <div className="pwa-splash-logo-bg" />

        {/* System logo SVG — rendered inline for crisp scaling */}
        <div className="pwa-splash-logo-icon">
          <svg viewBox="0 0 512 512" width="72" height="72" fill="none">
            <defs>
              <linearGradient id="splashLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF" />
                <stop offset="100%" stop-color="#E0E0FF" />
              </linearGradient>
            </defs>
            {/* SF monogram */}
            <text
              x="256" y="256"
              font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              font-size="200" font-weight="800"
              fill="url(#splashLogoGrad)"
              text-anchor="middle" dominant-baseline="central"
              letter-spacing="-8"
            >
              SF
            </text>
          </svg>
        </div>
      </div>

      {/* Title with staggered fade */}
      <div className="pwa-splash-title">SocialFlow</div>
      <div className="pwa-splash-subtitle">Social, Simplified</div>

      {/* Liquid glass loading bar */}
      <div className="pwa-splash-bar">
        <div className="pwa-splash-bar-fill" />
      </div>
    </div>
  );
}
