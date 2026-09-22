"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Syncwave logo — three color-changing dots arranged in a triangle.
 * Each dot cycles through premium retina hues with a staggered phase,
 * giving a living, liquid feel. The dots sit inside an optional rounded tile.
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
  const dot = Math.round(size * 0.26);
  // Triangle geometry — apex top, base bottom-left + bottom-right
  const r = size * 0.34; // circumradius
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const top = { x: cx, y: cy - r };
  const bl = { x: cx - r * Math.sin((2 * Math.PI) / 3), y: cy - r * Math.cos((2 * Math.PI) / 3) };
  const br = { x: cx + r * Math.sin((2 * Math.PI) / 3), y: cy - r * Math.cos((2 * Math.PI) / 3) };

  const dots = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("logo-triangle", className)}
      aria-hidden
    >
      <defs>
        <radialGradient id="lg-d1" cx="35%" cy="35%">
          <stop offset="0%" stopColor="oklch(0.85 0.16 230)" />
          <stop offset="100%" stopColor="oklch(0.6 0.2 250)" />
        </radialGradient>
        <radialGradient id="lg-d2" cx="35%" cy="35%">
          <stop offset="0%" stopColor="oklch(0.82 0.15 190)" />
          <stop offset="100%" stopColor="oklch(0.62 0.17 200)" />
        </radialGradient>
        <radialGradient id="lg-d3" cx="35%" cy="35%">
          <stop offset="0%" stopColor="oklch(0.78 0.18 280)" />
          <stop offset="100%" stopColor="oklch(0.58 0.22 300)" />
        </radialGradient>
        <filter id="lg-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#lg-glow)">
        <circle className="logo-dot logo-dot-1" cx={top.x} cy={top.y} r={dot} fill="url(#lg-d1)" />
        <circle className="logo-dot logo-dot-2" cx={bl.x} cy={bl.y} r={dot} fill="url(#lg-d2)" />
        <circle className="logo-dot logo-dot-3" cx={br.x} cy={br.y} r={dot} fill="url(#lg-d3)" />
      </g>
    </svg>
  );

  if (!withTile) return dots;

  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-[28%] bg-gradient-to-br from-[oklch(0.62_0.19_255)] via-[oklch(0.66_0.16_230)] to-[oklch(0.6_0.2_290)] shadow-lg",
        tileClassName
      )}
      style={{ width: size + 8, height: size + 8 }}
    >
      {dots}
      <span className="pointer-events-none absolute inset-0 rounded-[28%] ring-1 ring-inset ring-white/25" />
    </div>
  );
}

/** Wordmark — "Syncwave" with an animated gradient on "wave". */
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
        Sync<span className="retaina-text">wave</span>
      </div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Social Command</div>
    </div>
  );
}
