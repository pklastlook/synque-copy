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
        "crystal-card rounded-3xl",
        hover && "lift-hover",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Count-up animation for numeric values. */
function useCountUp(target: number, duration = 1100, delay = 0) {
  const [val, setVal] = React.useState(0);
  const startedRef = React.useRef(false);
  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      if (now < start) { raf = requestAnimationFrame(tick); return; }
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return val;
}

export function KpiCard({
  label,
  value,
  delta,
  icon,
  accent,
  hint,
  delay = 0,
  series,
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  accent?: string;
  hint?: string;
  delay?: number;
  /** Real data series for the bar chart at the bottom of the card */
  series?: number[];
}) {
  const up = (delta ?? 0) >= 0;
  const numeric = typeof value === "number" ? value : 0;
  const isNumeric = typeof value === "number";
  const counted = useCountUp(numeric, 1100, delay);
  const display = isNumeric ? Math.round(counted).toLocaleString() : value;

  // Use real series data if provided, otherwise show empty bars
  const hasRealData = series && series.length > 0 && series.some((v) => v > 0);
  const bars = hasRealData ? series! : [];
  const barMax = bars.length > 0 ? Math.max(...bars) : 1;
  const barMin = bars.length > 0 ? Math.min(...bars) : 0;
  const barRange = Math.max(barMax - barMin, 1);

  return (
    <GlassCard hover className="crystal-card glass-sheen crystal-in group relative overflow-hidden p-6" style={{ animationDelay: `${delay}ms` }}>
      {/* ambient gradient glow — subtle, controlled */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-[0.12] blur-2xl transition duration-500 group-hover:opacity-25"
        style={{ background: accent ?? "var(--primary)" }}
      />
      {/* shimmer sweep on hover */}
      <span className="crystal-sweep pointer-events-none absolute inset-0" />

      {/* Top row: label (tiny, uppercase, muted) + delta badge */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="grid h-9 w-9 place-items-center rounded-lg border backdrop-blur-md transition-transform duration-300 group-hover:scale-110"
            style={{
              background: `${accent ?? "var(--primary)"}12`,
              borderColor: `${accent ?? "var(--primary)"}25`,
            }}
          >
            <span style={{ color: accent ?? "var(--primary)" }} className="[&_svg]:h-4 [&_svg]:w-4">
              {icon}
            </span>
          </div>
          <span className="label-caps text-muted-foreground">{label}</span>
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition-transform duration-300 group-hover:scale-105",
              up ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
            )}
          >
            {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>

      {/* Massive number — the hero of the card (Apple-style typographic confidence) */}
      <div className="relative mt-4">
        <div className="num-display text-[40px] font-bold leading-none tracking-tight sm:text-[44px]">{display}</div>
        {hint && <div className="mt-1.5 text-[11px] font-medium text-muted-foreground">{hint}</div>}
      </div>

      {/* Real data bars — show actual time-series data from the database */}
      {bars.length > 0 && (
        <div className="relative mt-4 flex h-8 items-end gap-[2px]">
          {bars.map((v, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm transition-all duration-300"
              style={{
                height: `${((v - barMin) / barRange) * 100}%`,
                background: `linear-gradient(to top, ${accent ?? "var(--primary)"}, transparent)`,
                opacity: 0.35 + (i / bars.length) * 0.5,
                animation: `sparkRise 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay / 1000 + i * 0.03}s both`,
              }}
            />
          ))}
        </div>
      )}
      {bars.length === 0 && (
        <div className="relative mt-4 flex h-8 items-center gap-1.5 text-muted-foreground/50">
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
          <span className="text-[10px] font-medium">Awaiting data</span>
        </div>
      )}
      <style>{`@keyframes sparkRise { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }`}</style>
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
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold tracking-tight sm:text-lg">{title}</h2>
        {desc && <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}
