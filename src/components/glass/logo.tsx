"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SYNQUE logo — a "convergence flow" mark.
 *
 * Three streams (representing multiple social platforms) converge from
 * the left into a single prism-arrowhead on the right — the unified
 * queue node, with its extended right tip suggesting forward flow /
 * publishing. The asymmetric diamond doubles as a rightward arrowhead.
 *
 * Concept: SYNC (multiple streams → one node) + QUEUE (sequential flow
 * core + direction) + MULTI-PLATFORM (three colored inputs).
 *
 * Designed to render crisply from 16px (favicon) to 512px (PWA splash),
 * on both light (#F5F5F7) and dark (#1D1D1F) backgrounds. Uses CSS
 * custom properties (`--primary`, `--gold`) so the mark adapts to the
 * active theme automatically.
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
        {/* Stream gradients — fade in left → right, suggesting flow toward the prism. */}
        <linearGradient id="sf-stream-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
        <linearGradient id="sf-stream-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
        <linearGradient id="sf-stream-c" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
          <stop offset="60%" stopColor="var(--gold)" stopOpacity={0.85} />
          <stop offset="100%" stopColor="var(--gold)" />
        </linearGradient>
        {/* Prism gradient — vibrant diagonal blend of both brand colors. */}
        <linearGradient id="sf-prism" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="55%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
        {/* Glass highlight on the prism's upper facet — "liquid glass" feel. */}
        <linearGradient id="sf-prism-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.55} />
          <stop offset="60%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
        <filter id="sf-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.6} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#sf-glow)">
        {/* Three converging streams — top, middle, bottom (multi-platform inputs). */}
        <path
          className="sf-bar sf-bar-1"
          d="M 7 13 C 22 13 26 23 32 30"
          stroke="url(#sf-stream-a)"
          strokeWidth={4.2}
          strokeLinecap="round"
        />
        <path
          className="sf-bar sf-bar-2"
          d="M 7 32 L 32 32"
          stroke="url(#sf-stream-b)"
          strokeWidth={4.2}
          strokeLinecap="round"
        />
        <path
          className="sf-bar sf-bar-3"
          d="M 7 51 C 22 51 26 41 32 34"
          stroke="url(#sf-stream-c)"
          strokeWidth={4.2}
          strokeLinecap="round"
        />

        {/* Prism / arrowhead — the unified queue node + forward tip. */}
        <path
          className="sf-prism"
          d="M 32 32 L 38 22 L 56 32 L 38 42 Z"
          fill="url(#sf-prism)"
        />
        {/* Glass highlight on the upper facet of the prism. */}
        <path
          className="sf-prism-shine"
          d="M 32 32 L 38 22 L 56 32 Z"
          fill="url(#sf-prism-shine)"
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
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Sync Your Social</div>
      </div>
    </div>
  );
}
