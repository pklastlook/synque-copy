"use client";

import * as React from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * HelpText — a dismissible info banner for guiding new users.
 * Usage: <HelpText module="analytics">Brief explanation of what this section does.</HelpText>
 *
 * Each module's help text is stored in localStorage so dismissal persists.
 * To reset, the user can pass `force` or clear localStorage.
 */
const DISMISS_KEY = "socialflow-help-dismissed";

export function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function setDismissed(modules: string[]) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(modules));
  } catch {
    /* ignore */
  }
}

export function HelpText({
  module,
  children,
  className,
}: {
  module: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [dismissed, setDismissedState] = React.useState(false);

  React.useEffect(() => {
    setDismissedState(getDismissed().includes(module));
  }, [module]);

  if (dismissed) return null;

  const dismiss = () => {
    const updated = [...getDismissed(), module];
    setDismissed(updated);
    setDismissedState(true);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3 text-[12px] leading-relaxed",
        className
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="flex-1 text-muted-foreground">{children}</div>
      <button
        onClick={dismiss}
        className="shrink-0 rounded-md p-0.5 text-muted-foreground/50 transition hover:bg-muted hover:text-foreground"
        aria-label="Dismiss help"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * HelpTooltip — a small inline tooltip for field-level help.
 * Hover to reveal. No dismissal needed.
 */
export function HelpTooltip({ text }: { text: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <Info className="h-3 w-3 cursor-help text-muted-foreground/60" />
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-1.5 w-48 -translate-x-1/2 rounded-lg bg-popover px-2.5 py-1.5 text-[11px] leading-snug text-popover-foreground shadow-lg ring-1 ring-border">
          {text}
        </span>
      )}
    </span>
  );
}
