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
        hover && "lift-hover",
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
    <GlassCard hover className="glass-sheen relative overflow-hidden p-6">
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.12] blur-2xl transition group-hover:opacity-20"
        style={{ background: accent ?? "var(--primary)" }}
      />
      <div className="relative flex items-start justify-between">
        <div
          className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-lg"
          style={{ background: accent ?? "var(--primary)" }}
        >
          {icon}
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums",
              up ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="relative mt-5">
        <div className="num-display text-[32px] font-semibold leading-none tracking-tight">{value}</div>
        <div className="label-caps mt-2 text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/60">{hint}</div>}
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
