"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * EmptyState — reusable placeholder for empty lists/grids.
 *
 * Replaces the bespoke "icon + label + tiny CTA" patterns scattered across
 * the dashboard and owner panel with one consistent, accessible component.
 *
 * - Centered layout, soft icon tile (16x16 rounded-2xl), title + description
 * - Optional CTA button rendered as a `liquid-pill` so it matches the rest
 *   of the app's primary action affordance.
 * - Accepts an optional `className` for size overrides (e.g. tighter `py-6`
 *   when nested inside a card).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted/40">
        <Icon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="liquid-pill rounded-xl px-4 py-2 text-xs font-semibold transition hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
