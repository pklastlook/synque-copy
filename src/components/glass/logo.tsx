"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SYNQUE Logo — creative, interactive text wordmark.
 *
 * Design:
 * - "SYN" in solid foreground color
 * - "QUE" in gradient (primary → gold)
 * - On hover: gradient animates (shifts) — subtle, smooth
 * - Creative font styling: italic + tight tracking + bold weight
 * - Center-aligned
 * - No entrance animations, no shimmer, no letter-by-letter effects
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
  const fontSize =
    size <= 20 ? "text-[13px]" :
    size <= 28 ? "text-[15px]" :
    size <= 36 ? "text-[17px]" :
    size <= 48 ? "text-[22px]" :
    size <= 64 ? "text-[28px]" :
    "text-[34px]";

  const mark = (
    <div
      className={cn("sf-logo flex items-center leading-none", fontSize, "logo-creative", className)}
      aria-label="SYNQUE"
    >
      <span className="logo-syn">SYN</span>
      <span className="logo-que">QUE</span>
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
 * SYNQUE wordmark — creative logo text + slogan below it.
 * Center-aligned, gradient hover animation.
 */
export function LogoWordmark({
  className,
  size = "text-base",
  showLogo = true,
  logoSize = 28,
  static: isStatic = false,
}: {
  className?: string;
  size?: string;
  showLogo?: boolean;
  logoSize?: number;
  static?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 text-center", className)}>
      {showLogo && (
        <div
          className={cn(
            "flex items-center justify-center leading-none",
            size,
            isStatic ? "logo-static" : "logo-creative"
          )}
          aria-label="SYNQUE"
        >
          <span className="logo-syn">SYN</span>
          <span className="logo-que">QUE</span>
        </div>
      )}
      <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
        Orchestrate Your Social
      </div>
    </div>
  );
}
