"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SYNQUE Logo — text-only wordmark (no SVG icon).
 *
 * The `Logo` component now renders a stylized text mark instead of an
 * SVG graphic. "SYN" is solid, "QUE" uses a gradient. This is used
 * in the sidebar, header, splash, landing nav, and footer.
 *
 * Props are preserved for backward compatibility (size, withTile,
 * className, tileClassName) — withTile controls whether the text is
 * wrapped in a rounded tile container.
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
  // Map numeric size to font-size classes
  const fontSize =
    size <= 20 ? "text-[13px]" :
    size <= 28 ? "text-[15px]" :
    size <= 36 ? "text-[17px]" :
    size <= 48 ? "text-[22px]" :
    size <= 64 ? "text-[28px]" :
    "text-[34px]";

  const mark = (
    <div
      className={cn("sf-logo font-extrabold tracking-tight leading-none", fontSize, className)}
      aria-label="SYNQUE"
    >
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
 * SYNQUE wordmark — text logo + brand name + slogan.
 * No SVG icon — purely typographic.
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
    <div className={cn("flex items-center gap-2", className)}>
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
