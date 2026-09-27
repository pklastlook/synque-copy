"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SYNQUE logo — the "Sync Pulse" mark.
 *
 * Two concentric radar rings expand outward and fade in sequence,
 * broadcasting a continuous sync signal. The inner gradient disc
 * (blue → gold) is the queue core; a single white "S" stroke flows
 * through it — the continuous sync motion. A soft radial highlight
 * on the disc adds the "liquid glass" feel.
 *
 * Concept: SYNC (radar pulse rings) + QUEUE (gradient core holding
 * the S flow). Clean, geometric, premium — reads instantly from a
 * 16px favicon to a 512px PWA splash, on both light (#F5F5F7) and
 * dark (#0A0B0F) backgrounds. Uses CSS custom properties so the
 * mark adapts to the active theme automatically.
 *
 * Animation:
 *   - `.sf-pulse-1` / `.sf-pulse-2` — outer rings, scale + fade
 *   - `.sf-disc`   — inner gradient disc, gentle breathe
 *   - `.sf-s`      — the "S" stroke, soft shimmer
 *   Hover speeds up the signal slightly. `prefers-reduced-motion`
 *   disables all motion.
 */
export function Logo({
  size = 36,
  withTile = true,
  className,
  tileClassName,
}: {
  size?: number;
  withTile?: boolean;
  className?: string;
  tileClassName?: string;
}) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("sf-logo", className)}
      fill="none"
      aria-hidden
    >
      <defs>
        {/* Disc gradient — blue (top-left) → gold/violet (bottom-right). */}
        <linearGradient id="sf-disc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
        {/* Radial highlight — "liquid glass" light catch on the disc. */}
        <radialGradient id="sf-disc-shine" cx="0.32" cy="0.28" r="0.85">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
          <stop offset="55%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        {/* Subtle outer bloom for the disc. */}
        <filter id="sf-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={0.7} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer radar pulse rings — sync signal radiating outward. */}
      <circle
        className="sf-pulse-ring sf-pulse-1"
        cx="32"
        cy="32"
        r="22"
        stroke="var(--primary)"
        strokeWidth={1.3}
      />
      <circle
        className="sf-pulse-ring sf-pulse-2"
        cx="32"
        cy="32"
        r="22"
        stroke="var(--gold)"
        strokeWidth={1.3}
      />

      {/* Static thin orbit ring — frames the pulse. */}
      <circle
        className="sf-orbit"
        cx="32"
        cy="32"
        r="22"
        stroke="var(--primary)"
        strokeOpacity={0.22}
        strokeWidth={0.9}
      />

      {/* Inner gradient disc — the "queue core" with sync glow. */}
      <g filter="url(#sf-glow)">
        <circle
          className="sf-disc"
          cx="32"
          cy="32"
          r="15"
          fill="url(#sf-disc)"
        />
        <circle cx="32" cy="32" r="15" fill="url(#sf-disc-shine)" />
        {/* The "S" overlay — continuous sync flow stroke. */}
        <path
          className="sf-s"
          d="M 38 24 C 38 16, 22 16, 24 32 C 24 36, 40 28, 40 32 C 42 48, 26 48, 26 40"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );

  if (!withTile) return mark;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-xl shadow-md",
        tileClassName
      )}
      style={{ width: size + 8, height: size + 8 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/15 to-[var(--gold)]/15" />
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-[var(--primary)]/20" />
      <div className="relative">{mark}</div>
    </div>
  );
}

/**
 * SYNQUE wordmark — logo + name with enhanced typography.
 */
export function LogoWordmark({
  className,
  size = "text-base",
  showLogo = true,
  logoSize = 28,
}: {
  className?: string;
  size?: string;
  showLogo?: boolean;
  logoSize?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {showLogo && <Logo size={logoSize} />}
      <div className="leading-tight">
        <div className={cn("font-bold tracking-tight", size)}>
          SYN<span className="retaina-text">QUE</span>
        </div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Sync Your Social
        </div>
      </div>
    </div>
  );
}
