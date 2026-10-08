"use client";

import * as React from "react";
import {
  CheckCircle2,
  Circle,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OnboardingChecklist — dismissible guided onboarding card.
 *
 * Renders at the top of the dashboard until the user completes all 4
 * steps OR clicks "Dismiss". The dismissed state is persisted to
 * localStorage so the card doesn't reappear on every visit.
 *
 * Each step:
 * - Has an icon, label, "completed" boolean, and a `view` to navigate
 *   to when clicked.
 * - The first incomplete step is the active one — clicking it navigates
 *   to the view that lets the user complete it.
 *
 * The progress bar uses the 0..1 ratio of completed / total.
 */
export interface OnboardingStep {
  id: string;
  icon: LucideIcon;
  label: string;
  /** Navigates to this view when the (incomplete) step is clicked. */
  view?: string;
  /** Whether this step is done. */
  done: boolean;
}

const STORAGE_KEY = "socialflow-onboarding-dismissed-v1";

export function OnboardingChecklist({
  steps,
  onNavigate,
}: {
  steps: OnboardingStep[];
  onNavigate?: (view: string) => void;
}) {
  const [dismissed, setDismissed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // Load dismissed flag from localStorage after mount (avoids SSR mismatch).
  React.useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setDismissed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const dismiss = React.useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Render nothing until hydration finishes (prevents SSR/CSR mismatch),
  // OR if the user dismissed it, OR if every step is complete.
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = total > 0 && completed === total;

  if (!hydrated || dismissed || allDone) return null;

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <section
      className="glass crystal-in rounded-2xl border border-border/50 p-4 sm:p-5"
      aria-label="Onboarding checklist"
    >
      {/* Header row: title + progress + dismiss */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight sm:text-base">
              Welcome — let&apos;s get you set up
            </h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold tabular-nums text-muted-foreground">
              {completed}/{total}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
            Complete these steps to get the most out of your workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss onboarding checklist"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Steps */}
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const clickable = !step.done && !!step.view && !!onNavigate;
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && step.view && onNavigate?.(step.view)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-left transition",
                  clickable && "cursor-pointer hover:border-primary/40 hover:bg-primary/5",
                  !clickable && "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-lg transition",
                    step.done
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span
                      className={cn(
                        "truncate text-xs font-semibold",
                        step.done && "text-muted-foreground line-through"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
                {step.done ? (
                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Done
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Start →
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
