"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// SkeletonCard — layout-matching loading skeletons
// ----------------------------------------------------------------------------
// Generic shimmer bars look like a bug, not a loading state. Each skeleton
// here mirrors a real component's layout (MetricRow, account card, table)
// so users see "this card is loading its content" instead of "something
// broke". All shapes share the `.shimmer` class (defined in globals.css).
// ============================================================================

/** MetricRow skeleton — 6 metric-shaped blocks that line up with the real
 *  MetricRow's mobile-first horizontal scroll + desktop grid. */
export function MetricRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="scroll-liquid flex flex-nowrap gap-2 overflow-x-auto rounded-xl border border-border/40 bg-muted/20 p-2 sm:grid sm:grid-cols-2 sm:gap-px sm:overflow-hidden sm:bg-border/40 sm:p-0 lg:flex lg:flex-nowrap lg:overflow-x-auto"
      role="status"
      aria-label="Loading metrics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg bg-muted/20 px-3 py-2.5 sm:flex-1 sm:rounded-none sm:px-4"
        >
          <div className="min-w-0 flex-1">
            <div className="shimmer mb-2 h-5 w-16 rounded" />
            <div className="shimmer h-3 w-24 rounded" />
          </div>
          <div className="shimmer h-5 w-9 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Account card skeleton — avatar + display name/handle lines + small stats
 *  row. Mirrors the layout used by AccountsView and team cards. */
export function AccountCardSkeleton() {
  return (
    <div
      className="glass rounded-xl p-4"
      role="status"
      aria-label="Loading account"
    >
      <div className="flex items-center gap-3">
        <div className="shimmer h-10 w-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="shimmer h-3.5 w-32 rounded" />
          <div className="shimmer h-3 w-24 rounded" />
        </div>
        <div className="shimmer h-6 w-12 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/30 bg-muted/20 p-2 text-center">
            <div className="shimmer mx-auto h-4 w-10 rounded" />
            <div className="shimmer mx-auto mt-1.5 h-2.5 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table skeleton — header row + N data rows. Use inside the same scroll
 *  container the real table will occupy so widths match. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-border/40"
      role="status"
      aria-label="Loading table"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-3 py-2.5">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="shimmer h-3 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-2 border-b border-border/30 px-3 py-3 last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={cn(
                "shimmer h-3 flex-1 rounded",
                c === 0 && "h-4",
                c === cols - 1 && "w-12 flex-none",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Generic "card with header + body" skeleton — use when a view shows a
 *  single big card (e.g. an Overview tab) and you don't have a more
 *  specific layout to mirror. */
export function SkeletonCard({
  className,
  header = true,
  children,
}: {
  className?: string;
  header?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn("glass rounded-xl p-4", className)}
      role="status"
      aria-label="Loading content"
    >
      {header && (
        <div className="mb-3 flex items-center justify-between">
          <div className="space-y-2">
            <div className="shimmer h-3.5 w-32 rounded" />
            <div className="shimmer h-3 w-24 rounded" />
          </div>
          <div className="shimmer h-7 w-20 rounded-lg" />
        </div>
      )}
      <div className="space-y-2">
        {children ?? (
          <>
            <div className="shimmer h-3 w-full rounded" />
            <div className="shimmer h-3 w-5/6 rounded" />
            <div className="shimmer h-3 w-2/3 rounded" />
            <div className="shimmer mt-3 h-24 w-full rounded-lg" />
          </>
        )}
      </div>
    </div>
  );
}

/** Two-column overview skeleton — for Owner Panel dashboard tiles where the
 *  layout is "left KPIs + right chart". Renders as a 2-col grid on lg+. */
export function OverviewSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <SkeletonCard className="lg:col-span-1">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/30 bg-muted/20 p-3">
              <div className="shimmer h-4 w-12 rounded" />
              <div className="shimmer mt-2 h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard className="lg:col-span-2">
        <div className="shimmer h-[200px] w-full rounded-lg" />
      </SkeletonCard>
    </div>
  );
}

/** Full-page shimmer that fills the parent — used as a drop-in replacement
 *  for `<div className="shimmer h-64 rounded-3xl" />` in lazy-loaded tabs. */
export function PageSkeleton({ minHeight = "h-64" }: { minHeight?: string }) {
  return (
    <div
      className={cn("w-full rounded-3xl", minHeight)}
      role="status"
      aria-label="Loading"
    >
      <div className="space-y-3 p-4">
        <div className="shimmer h-4 w-40 rounded" />
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-5/6 rounded" />
        <div className="shimmer h-3 w-2/3 rounded" />
        <div className="shimmer mt-4 h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
