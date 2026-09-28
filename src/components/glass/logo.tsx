"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SYNQUE Logo — animated, interactive text wordmark.
 *
 * Features:
 * - "SYN" in solid foreground color
 * - "QUE" in animated gradient (primary → gold → primary, shifts on hover)
 * - Letter-by-letter entrance animation (staggered fade-up on mount)
 * - Hover: each letter scales slightly + gradient shifts
 * - Shimmer effect: a light sweep passes across the text every 4s
 * - Center-aligned by default
 */

// Letter data for staggered animation
const LETTERS = ["S", "Y", "N", "Q", "U", "E"];
// First 3 letters (SYN) are solid, last 3 (QUE) are gradient
const GRADIENT_START = 3;

export function Logo({
  size = 36,
  withTile = true,
  className,
  tileClassName,
  animated = true,
}: {
  size?: number;
  withTile?: boolean;
  className?: string;
  tileClassName?: string;
  animated?: boolean;
}) {
  const fontSize =
    size <= 20 ? "text-[13px]" :
    size <= 28 ? "text-[15px]" :
    size <= 36 ? "text-[17px]" :
    size <= 48 ? "text-[22px]" :
    size <= 64 ? "text-[28px]" :
    "text-[34px]";

  const mark = (
    <div
      className={cn("sf-logo flex items-center font-extrabold tracking-tight leading-none", fontSize, animated && "logo-animated", className)}
      aria-label="SYNQUE"
    >
      {LETTERS.map((letter, i) => (
        <span
          key={i}
          className={cn("logo-letter inline-block", animated && "logo-letter-enter")}
          style={animated ? { animationDelay: `${i * 80}ms` } : undefined}
        >
          {i >= GRADIENT_START ? (
            <span
              className="bg-clip-text text-transparent logo-gradient-text"
            >
              {letter}
            </span>
          ) : (
            <span className="text-foreground">{letter}</span>
          )}
        </span>
      ))}
      {/* Shimmer sweep overlay */}
      {animated && <span className="logo-shimmer" />}
    </div>
  );

  if (!withTile) return mark;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-xl",
        tileClassName
      )}
      style={{ width: "auto", height: size + 4, padding: "0 6px" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/8 to-[var(--gold)]/8" />
      <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-[var(--primary)]/10" />
      <div className="relative">{mark}</div>
    </div>
  );
}

/**
 * SYNQUE wordmark — animated logo text + slogan below it.
 * Center-aligned, with staggered letter animation + gradient shimmer.
 */
export function LogoWordmark({
  className,
  size = "text-base",
  showLogo = true,
  logoSize = 28,
  animated = true,
}: {
  className?: string;
  size?: string;
  showLogo?: boolean;
  logoSize?: number;
  animated?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 text-center", className)}>
      {showLogo && (
        <div
          className={cn("flex items-center justify-center font-extrabold tracking-tight leading-none", size, animated && "logo-animated")}
          aria-label="SYNQUE"
        >
          {LETTERS.map((letter, i) => (
            <span
              key={i}
              className={cn("logo-letter inline-block", animated && "logo-letter-enter")}
              style={animated ? { animationDelay: `${i * 80}ms` } : undefined}
            >
              {i >= GRADIENT_START ? (
                <span className="bg-clip-text text-transparent logo-gradient-text">
                  {letter}
                </span>
              ) : (
                <span className="text-foreground">{letter}</span>
              )}
            </span>
          ))}
          {animated && <span className="logo-shimmer" />}
        </div>
      )}
      <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
        Orchestrate Your Social
      </div>
    </div>
  );
}
