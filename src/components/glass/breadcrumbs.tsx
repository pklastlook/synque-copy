"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { useNav } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ViewId } from "@/lib/types";

// ============================================================================
// Breadcrumbs — contextual navigation trail
// ----------------------------------------------------------------------------
// Shows the user where they are in the app hierarchy:
//   Dashboard > Posts > Recent
//   Owner Panel > Clients > Client Detail
//   Settings > Security
//
// The last item is the current page (not clickable). All previous items are
// buttons that call setView(view). On mobile we only render the trail when
// depth > 1 so single-screen views don't waste vertical space.
// ============================================================================

export interface Crumb {
  label: string;
  /** Optional destination — when omitted, the crumb is informational only
   *  (e.g. an "Owner Panel" root that lives in the same view). */
  view?: ViewId;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  /** When true (default), the trail hides on mobile when there is only the
   *  current page (depth ≤ 1). Pass `false` to always show the trail. */
  hideOnShallowMobile?: boolean;
  className?: string;
}

export function Breadcrumbs({ items, hideOnShallowMobile = true, className }: BreadcrumbsProps) {
  const { setView } = useNav();

  if (!items || items.length === 0) return null;
  if (hideOnShallowMobile && items.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-0.5 overflow-x-auto whitespace-nowrap text-[12px] text-muted-foreground scroll-liquid",
        className,
      )}
    >
      <ol className="flex items-center gap-0.5">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const clickable = !isLast && !!item.view;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-0.5">
              {clickable ? (
                <button
                  type="button"
                  onClick={() => item.view && setView(item.view)}
                  className={cn(
                    "rounded-md px-1.5 py-1 font-medium text-muted-foreground transition",
                    "hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={cn(
                    "px-1.5 py-1",
                    isLast ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
