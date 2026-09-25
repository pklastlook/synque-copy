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
        // Apple cards: 12px corners (rounded-xl), p-5 default padding (20px).
        "rounded-xl p-5",
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

  // Use real series data if provided, otherwise show empty state
  const hasRealData = series && series.length > 0 && series.some((v) => v > 0);
  const bars = hasRealData ? series! : [];
  const barMax = bars.length > 0 ? Math.max(...bars) : 1;
  const barMin = bars.length > 0 ? Math.min(...bars) : 0;
  const barRange = Math.max(barMax - barMin, 1);

  return (
    <GlassCard hover className="crystal-in group relative overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      {/* macOS 27: clean solid card. NO ambient glow, NO shimmer sweep.
          Color is semantic — only the icon is colored, the card is neutral. */}

      {/* Top row: icon tile + delta badge */}
      <div className="relative flex items-center justify-between gap-2">
        <div
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{
            background: `${accent ?? "var(--primary)"}14`,
          }}
        >
          <span style={{ color: accent ?? "var(--primary)" }} className="[&_svg]:h-[18px] [&_svg]:w-[18px]">
            {icon}
          </span>
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 text-[11px] font-semibold tabular-nums",
              up ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>

      {/* Massive number — Sonoma Large Title weight, the hero of the card */}
      <div className="relative mt-4">
        <div className="num-display text-[38px] font-bold leading-none tracking-tight">{display}</div>
        <div className="label-caps mt-2 text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{hint}</div>}
      </div>

      {/* Real data bars — subtle, accent-colored, fade to transparent */}
      {bars.length > 0 && (
        <div className="relative mt-4 flex h-6 items-end gap-[2px]">
          {bars.map((v, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm transition-all duration-300"
              style={{
                height: `${((v - barMin) / barRange) * 100}%`,
                background: accent ?? "var(--primary)",
                opacity: 0.25 + (i / bars.length) * 0.5,
                animation: `sparkRise 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay / 1000 + i * 0.03}s both`,
              }}
            />
          ))}
        </div>
      )}
      {bars.length === 0 && (
        <div className="relative mt-4 flex h-6 items-center gap-1.5 text-muted-foreground/40">
          <span className="h-1 w-1 rounded-full bg-current opacity-50" />
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
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
        {desc && <p className="mt-0.5 text-[12px] text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}
