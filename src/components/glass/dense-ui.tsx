"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, ChevronRight, type LucideIcon } from "lucide-react";

/**
 * Modern dense UI primitives — card-light, high information density.
 *
 * Design philosophy:
 * - Cards group DISTINCT concepts, not every single metric
 * - Charts earn their space (trends + comparisons only)
 * - Dense rows > tall cards for KPIs
 * - Bento grid for asymmetric, intentional layout
 *
 * These coexist with GlassCard/KpiCard/SectionTitle — old views keep working,
 * new views use these primitives for a modern feel.
 */

// ============================================================================
// Sparkline — tiny inline trend, no axes, no tooltip. Just a shape.
// ============================================================================

export function Sparkline({
  data,
  width = 64,
  height = 20,
  color = "var(--primary)",
  strokeWidth = 1.5,
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
}) {
  const gradId = React.useId();
  if (!data || data.length < 2) {
    return <span style={{ width, height, display: "inline-block" }} />;
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradId})`} />
        </>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================================
// MetricRow — dense horizontal metrics with inline sparklines.
// Replaces a 4-card KPI strip (~480px tall) with one ~56px row.
// ============================================================================

export interface Metric {
  label: string;
  value: string | number;
  delta?: number;
  spark?: number[];
  color?: string;
}

export function MetricRow({ metrics, className }: { metrics: Metric[]; className?: string }) {
  return (
    <div className={cn(
      "scroll-liquid flex gap-2 overflow-x-auto rounded-xl border border-border/40 bg-muted/20 p-2 sm:grid sm:grid-cols-2 sm:gap-px sm:overflow-hidden sm:bg-border/40 sm:p-0 lg:flex lg:items-stretch lg:overflow-x-auto lg:bg-border/40 lg:p-0",
      className
    )}>
      {metrics.map((m, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-lg bg-muted/20 px-3 py-2.5 sm:min-w-[140px] sm:flex-1 sm:gap-3 sm:rounded-none sm:px-4",
            i < metrics.length - 1 && "sm:border-r sm:border-border/40"
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="num-display text-base font-bold leading-none tabular-nums sm:text-lg">
                {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
              </span>
              {m.delta !== undefined && (
                <span
                  className={cn(
                    "text-[10px] font-semibold tabular-nums",
                    m.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  {m.delta >= 0 ? "+" : ""}{m.delta}%
                </span>
              )}
            </div>
            <div className="label-caps mt-1 truncate text-[9px] text-muted-foreground sm:text-[10px]">{m.label}</div>
          </div>
          {m.spark && m.spark.length > 1 && (
            <Sparkline data={m.spark} color={m.color ?? "var(--primary)"} width={36} height={18} />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// BentoGrid — asymmetric grid for intentional, varied tile sizes.
// ============================================================================

export function BentoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid auto-rows-[minmax(120px,auto)] grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {children}
    </div>
  );
}

export function BentoTile({
  children,
  className,
  span = "1x1",
  hover = false,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  span?: "1x1" | "1x2" | "2x1" | "2x2" | "3x1" | "1x3";
  hover?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  const spanClass = {
    "1x1": "col-span-1 sm:col-span-1 sm:row-span-1",
    "1x2": "col-span-1 sm:col-span-1 sm:row-span-2",
    "2x1": "col-span-1 sm:col-span-2 sm:row-span-1",
    "2x2": "col-span-1 sm:col-span-2 sm:row-span-2",
    "3x1": "col-span-1 sm:col-span-3 sm:row-span-1",
    "1x3": "col-span-1 sm:col-span-1 sm:row-span-3",
  }[span];

  return (
    <div
      className={cn(
        "glass rounded-xl p-4 transition-all duration-300",
        hover && "lift-hover cursor-pointer",
        spanClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// SectionHeader — compact, replaces SectionTitle. Inline action, no description noise.
// ============================================================================

export function SectionHeader({
  title,
  desc,
  action,
  icon: Icon,
  className,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold tracking-tight">{title}</h2>
          {desc && <p className="truncate text-[11px] text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ============================================================================
// HeroChart — full-bleed chart container, no card padding waste.
// ============================================================================

export function HeroChart({
  children,
  className,
  title,
  desc,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("glass rounded-xl", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-2.5">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-bold tracking-tight">{title}</h3>}
            {desc && <p className="truncate text-[11px] text-muted-foreground">{desc}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}

// ============================================================================
// ListRow — dense list item, replaces card grids for scannable lists.
// ============================================================================

export function ListRow({
  children,
  onClick,
  active = false,
  className,
  ...props
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 border-b border-border/30 px-3 py-2.5 transition-colors",
        onClick && "cursor-pointer hover:bg-muted/40",
        active && "bg-primary/5 border-l-2 border-l-primary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// DeltaBadge — inline trend indicator, not a full card.
// ============================================================================

export function DeltaBadge({ delta, className }: { delta?: number; className?: string }) {
  if (delta === undefined) return null;
  const up = delta >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        up ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        className
      )}
    >
      {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {Math.abs(delta)}%
    </span>
  );
}

// ============================================================================
// Pill — tiny inline status/tag, replaces Badge for most uses.
// ============================================================================

export function Pill({
  children,
  color = "neutral",
  className,
}: {
  children: React.ReactNode;
  color?: "neutral" | "green" | "amber" | "rose" | "blue" | "violet";
  className?: string;
}) {
  const colors = {
    neutral: "bg-muted text-muted-foreground",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", colors[color], className)}>
      {children}
    </span>
  );
}

// ============================================================================
// NavCard — drill-down navigation item (for Owner Panel, Settings sidebar).
// ============================================================================

export function NavCard({
  icon: Icon,
  title,
  desc,
  count,
  accent,
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  count?: number | string;
  accent?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-background/50 p-3 text-left transition-all",
        "hover:border-primary/30 hover:bg-muted/30",
        active && "border-primary/40 bg-primary/5"
      )}
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `${accent ?? "var(--primary)"}14` }}
      >
        <Icon className="h-4 w-4" style={{ color: accent ?? "var(--primary)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold">{title}</div>
        {desc && <div className="truncate text-[10px] text-muted-foreground">{desc}</div>}
      </div>
      {count !== undefined && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
