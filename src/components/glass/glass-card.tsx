"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function GlassCard({
  className,
  children,
  hover = false,
  strong = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; strong?: boolean }) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-3xl",
        hover && "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  icon,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  accent?: string;
  hint?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <GlassCard hover className="glass-sheen relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-25 blur-2xl"
        style={{ background: accent ?? "var(--primary)" }}
      />
      <div className="flex items-start justify-between">
        <div
          className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-md"
          style={{ background: accent ?? "var(--primary)" }}
        >
          {icon}
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
              up ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-[28px] font-bold leading-none tracking-tight">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div>}
      </div>
    </GlassCard>
  );
}

export function SectionTitle({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground sm:text-sm">{desc}</p>}
      </div>
      {action}
    </div>
  );
}
