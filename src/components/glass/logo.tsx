"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SocialFlow logo — an interactive "flow wave" mark.
 * Three layered wave bars that animate continuously, representing
 * the flow of content across multiple platforms. Each bar has a
 * different gradient and staggered animation phase.
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
  const barW = size * 0.62;
  const barH = size * 0.13;
  const gap = size * 0.08;
  const totalH = barH * 3 + gap * 2;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("sf-logo", className)}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="sf-bar-1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
        <linearGradient id="sf-bar-2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
        <linearGradient id="sf-bar-3" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="50%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
        <filter id="sf-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#sf-glow)" transform={`translate(${(size - barW) / 2}, ${(size - totalH) / 2})`}>
        {/* Bar 1 — top wave, widest */}
        <rect
          className="sf-bar sf-bar-1"
          x="0"
          y="0"
          width={barW}
          height={barH}
          rx={barH / 2}
          fill="url(#sf-bar-1)"
        />
        {/* Bar 2 — middle wave, medium */}
        <rect
          className="sf-bar sf-bar-2"
          x={barW * 0.08}
          y={barH + gap}
          width={barW * 0.84}
          height={barH}
          rx={barH / 2}
          fill="url(#sf-bar-2)"
        />
        {/* Bar 3 — bottom wave, shortest, flows right */}
        <rect
          className="sf-bar sf-bar-3"
          x={barW * 0.16}
          y={(barH + gap) * 2}
          width={barW * 0.68}
          height={barH}
          rx={barH / 2}
          fill="url(#sf-bar-3)"
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
 * SocialFlow wordmark — logo + name with enhanced typography.
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
          Social<span className="retaina-text">Flow</span>
        </div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Social, Simplified</div>
      </div>
    </div>
  );
}
