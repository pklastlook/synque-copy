"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Syncwave logo mark — two interlocking arcs forming an abstract "S"/wave.
 * Premium, scalable, distinctive. The arcs carry a living gradient and a
 * subtle continuous motion (the wave breathes).
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
      viewBox="0 0 48 48"
      className={cn("syncwave-mark", className)}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="sw-grad-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--accent-strong, oklch(0.6 0.16 200))" />
        </linearGradient>
        <linearGradient id="sw-grad-b" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--accent-strong, oklch(0.6 0.16 200))" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
        <filter id="sw-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#sw-glow)">
        {/* Upper arc — flows left-to-right, evokes the first wave */}
        <path
          className="sw-arc sw-arc-a"
          d="M10 30 C 10 16, 24 10, 38 14"
          stroke="url(#sw-grad-a)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Lower arc — flows right-to-left, completes the sync loop */}
        <path
          className="sw-arc sw-arc-b"
          d="M38 18 C 38 32, 24 38, 10 34"
          stroke="url(#sw-grad-b)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Center node — the sync point */}
        <circle className="sw-node" cx="24" cy="24" r="3" fill="var(--primary)" />
      </g>
    </svg>
  );

  if (!withTile) return mark;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-2xl shadow-lg",
        tileClassName
      )}
      style={{ width: size + 10, height: size + 10 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-[oklch(0.4_0.06_260)] to-[var(--primary)]" />
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      <div className="relative">{mark}</div>
    </div>
  );
}

/**
 * SocialFlow wordmark — name only (no logo mark). Work-related, interactive.
 */
export function LogoWordmark({
  className,
  size = "text-base",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <div className={cn("leading-tight", className)}>
      <div className={cn("font-bold tracking-tight", size)}>
        Social<span className="retaina-text">Flow</span>
      </div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Social, Simplified</div>
    </div>
  );
}
