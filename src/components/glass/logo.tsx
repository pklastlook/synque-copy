"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SYNQUE logo — "Quantum Flow" mark.
 *
 * Three energy ribbons converge from the left into a diamond prism on
 * the right — representing multiple social platforms syncing into one
 * unified queue. The diamond is the "queue core" (a cut gem that
 * holds and processes the flows).
 *
 * Design: pure geometric shapes (no letters), animated with a
 * subtle "flow" pulse — the ribbons brighten in sequence like
 * data packets flowing through a pipeline.
 *
 * The mark is built with layered SVG paths using gradients that
 * adapt to the active theme (var(--primary) + var(--gold)).
 *
 * Animation:
 *   - `.sf-ribbon-*` — sequential brightness pulse (flow effect)
 *   - `.sf-diamond` — gentle scale breathe
 *   - `.sf-spark` — inner spark rotates slowly
 *   Hover speeds up the flow. `prefers-reduced-motion` disables all.
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
  const uid = React.useId().replace(/:/g, "");
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
        {/* Ribbon gradient — blue → gold, left to right */}
        <linearGradient id={`sf-ribbon-${uid}`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
          <stop offset="60%" stopColor="var(--primary)" stopOpacity={0.9} />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity={1} />
        </linearGradient>
        {/* Diamond gradient — gold → primary, top to bottom */}
        <linearGradient id={`sf-diamond-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
        {/* Diamond shine — top-left highlight */}
        <radialGradient id={`sf-shine-${uid}`} cx="0.3" cy="0.25" r="0.7">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.5} />
          <stop offset="60%" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
        {/* Glow filter */}
        <filter id={`sf-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={0.6} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* === Three energy ribbons — flowing left to right, converging === */}
      {/* Ribbon 1 (top) — thinner, blue-leaning */}
      <path
        className="sf-ribbon sf-ribbon-1"
        d="M 4 20 C 16 20, 24 20, 36 28 L 44 32"
        stroke={`url(#sf-ribbon-${uid})`}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />
      {/* Ribbon 2 (middle) — thickest, the main flow */}
      <path
        className="sf-ribbon sf-ribbon-2"
        d="M 2 32 C 14 32, 26 32, 40 32 L 44 32"
        stroke={`url(#sf-ribbon-${uid})`}
        strokeWidth={3}
        strokeLinecap="round"
        fill="none"
      />
      {/* Ribbon 3 (bottom) — thinner, gold-leaning */}
      <path
        className="sf-ribbon sf-ribbon-3"
        d="M 4 44 C 16 44, 24 44, 36 36 L 44 32"
        stroke={`url(#sf-ribbon-${uid})`}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
      />

      {/* === Diamond prism — the "queue core" === */}
      <g filter={`url(#sf-glow-${uid})`}>
        {/* Outer diamond */}
        <path
          className="sf-diamond"
          d="M 44 22 L 56 32 L 44 42 L 32 32 Z"
          fill={`url(#sf-diamond-${uid})`}
        />
        {/* Shine overlay */}
        <path
          d="M 44 22 L 56 32 L 44 42 L 32 32 Z"
          fill={`url(#sf-shine-${uid})`}
        />
        {/* Inner facet lines — gives the diamond a cut-gem look */}
        <path
          d="M 44 22 L 44 42 M 32 32 L 56 32"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={0.7}
          strokeLinecap="round"
        />
        {/* Center spark — small rotating star */}
        <circle
          className="sf-spark"
          cx="44"
          cy="32"
          r="2.5"
          fill="rgba(255,255,255,0.9)"
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
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/12 to-[var(--gold)]/12" />
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-[var(--primary)]/15" />
      <div className="relative">{mark}</div>
    </div>
  );
}

/**
 * SYNQUE wordmark — logo + brand name with creative typography.
 *
 * The wordmark uses a custom letter-spacing treatment:
 * - "SYN" in the primary foreground color (solid, grounding)
 * - "QUE" in the gradient accent (the "queue" — colorful, active)
 * - Slogan below in a compact, tracked-out caps style
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
        <div className={cn("font-extrabold tracking-tight", size)}>
          <span className="text-foreground">SYN</span>
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(120deg, var(--primary), var(--gold))",
            }}
          >
            QUE
          </span>
        </div>
        <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
          Orchestrate Your Social
        </div>
      </div>
    </div>
  );
}
