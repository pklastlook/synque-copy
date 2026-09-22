"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PlatformGlyph, PLATFORMS, type PlatformId } from "@/lib/platforms";

/** A premium platform badge with glass tile, glow, and hover animation. */
export function PlatformBadge({
  platform,
  className,
  size = 36,
}: {
  platform: PlatformId;
  className?: string;
  size?: number;
}) {
  const p = PLATFORMS[platform];
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-[28%] text-white shadow-md transition-transform duration-300 hover:scale-110 hover:-rotate-3",
        p.gradient,
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Inner highlight */}
      <span className="pointer-events-none absolute inset-0 rounded-[28%] bg-gradient-to-br from-white/25 to-transparent" />
      {/* Border ring */}
      <span className="pointer-events-none absolute inset-0 rounded-[28%] ring-1 ring-inset ring-white/20" />
      {/* Glow */}
      <span
        className="pointer-events-none absolute inset-0 rounded-[28%] opacity-50 blur-md"
        style={{ background: p.color }}
      />
      <PlatformGlyph platform={platform} className="relative h-3/5 w-3/5" />
    </span>
  );
}

/** Small pill showing platform name + handle. */
export function PlatformPill({
  platform,
  handle,
  className,
}: {
  platform: PlatformId;
  handle?: string;
  className?: string;
}) {
  const p = PLATFORMS[platform];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        className
      )}
      style={{ background: `${p.color}15`, borderColor: `${p.color}30`, color: p.color }}
    >
      <span style={{ color: p.color }}>
        <PlatformGlyph platform={platform} className="h-3 w-3" />
      </span>
      {PLATFORMS[platform].name}
      {handle && <span className="opacity-60">{handle}</span>}
    </span>
  );
}

export function VerifiedTick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-3.5 w-3.5", className)} aria-label="Verified">
      <path
        d="M12 2l2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.6 2.6.6 2.6-2.3 1.4-1 2.5-2.7-.2L12 22l-2.2-1.6-2.7.2-1-2.5L3.8 16.7l.6-2.6L3.8 11.5l2.3-1.4 1-2.5 2.7.2L12 2z"
        fill="currentColor"
      />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.7" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
