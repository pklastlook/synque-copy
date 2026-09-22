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
      // easeOutCubic
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

/** Deterministic mini sparkline from a seed. */
function sparkPoints(seed: string, n = 14): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  const base = 40 + (Math.abs(h) % 30);
  return Array.from({ length: n }, (_, i) => {
    const wave = Math.sin((i + h) * 0.7) * 10 + Math.cos((i + h) * 0.4) * 6;
    return Math.max(8, base + wave + (i / n) * 14);
  });
}

export function KpiCard({
  label,
  value,
  delta,
  icon,
  accent,
  hint,
  delay = 0,
  sparkSeed,
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  accent?: string;
  hint?: string;
  delay?: number;
  sparkSeed?: string;
}) {
  const up = (delta ?? 0) >= 0;
  const numeric = typeof value === "number" ? value : 0;
  const isNumeric = typeof value === "number";
  const counted = useCountUp(numeric, 1100, delay);
  const display = isNumeric ? Math.round(counted).toLocaleString() : value;
  const spark = React.useMemo(
    () => sparkPoints(sparkSeed ?? label, 14),
    [sparkSeed, label]
  );
  const sparkMax = Math.max(...spark);
  const sparkMin = Math.min(...spark);
  const sparkRange = Math.max(sparkMax - sparkMin, 1);

  return (
    <GlassCard hover className="crystal-card glass-sheen crystal-in group relative overflow-hidden p-6" style={{ animationDelay: `${delay}ms` }}>
      {/* ambient gradient glow — pulses subtly */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-[0.16] blur-2xl transition duration-500 group-hover:opacity-30 group-hover:scale-125"
        style={{ background: accent ?? "var(--primary)" }}
      />
      {/* shimmer sweep on hover */}
      <span className="crystal-sweep pointer-events-none absolute inset-0" />
      {/* premium animated icon tile */}
      <div className="relative flex items-start justify-between">
        <div className="relative">
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
            style={{ background: `linear-gradient(135deg, ${accent ?? "var(--primary)"}, oklch(0.45 0.16 258))` }}
          >
            {/* pulsing glow behind icon */}
            <span
              className="pointer-events-none absolute inset-0 rounded-2xl opacity-60 blur-md animate-pulse"
              style={{ background: accent ?? "var(--primary)" }}
            />
            <span className="relative transition-transform duration-300 group-hover:scale-110">{icon}</span>
          </div>
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums transition-transform duration-300 group-hover:scale-105",
              up ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"
            )}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div className="relative mt-5">
        <div className="num-display text-[32px] font-semibold leading-none tracking-tight">{display}</div>
        <div className="label-caps mt-2 text-muted-foreground">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-muted-foreground/60">{hint}</div>}
      </div>
      {/* mini animated sparkline */}
      <div className="relative mt-4 flex h-8 items-end gap-[2px]">
        {spark.map((v, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm transition-all duration-300"
            style={{
              height: `${((v - sparkMin) / sparkRange) * 100}%`,
              background: `linear-gradient(to top, ${accent ?? "var(--primary)"}, transparent)`,
              opacity: 0.45 + (i / spark.length) * 0.45,
              animation: `sparkRise 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay / 1000 + i * 0.03}s both`,
            }}
          />
        ))}
      </div>
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
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground sm:text-sm">{desc}</p>}
      </div>
      {action}
    </div>
  );
}
