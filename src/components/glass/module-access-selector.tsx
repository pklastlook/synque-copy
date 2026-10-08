"use client";

/**
 * ModuleAccessSelector — glass morphism picker for per-user module rights.
 *
 * Renders all available modules grouped by category (Overview, Content,
 * Communication, Insights, Workspace, Admin) with a checkbox per module
 * and Select-all / Deselect-all chips per group.
 *
 * Used inside the create/edit user dialogs in:
 *   - src/components/views/owner.tsx  → ClientUsersTab
 *   - src/components/views/team.tsx   → Add Member dialog
 *
 * The component is fully controlled — the parent owns the `permissions`
 * array and patches it via `onChange`.
 */
import * as React from "react";
import { Check, ShieldCheck, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MODULE_GROUPS,
  ALL_MODULE_IDS,
  isAllModules,
  type ModuleId,
} from "@/lib/module-permissions";

interface ModuleAccessSelectorProps {
  /** Currently selected module IDs (or `["*"]` for all). */
  permissions: string[];
  /** Called with the new array on every change. */
  onChange: (next: string[]) => void;
  /** Optional — disables the whole picker (e.g. for non-admin viewers). */
  disabled?: boolean;
  /** Visual density — "compact" hides the per-group icons. */
  compact?: boolean;
}

export function ModuleAccessSelector({
  permissions: rawPermissions,
  onChange,
  disabled = false,
  compact = false,
}: ModuleAccessSelectorProps) {
  // Safety: ensure permissions is always a string[] even if the parent
  // passes undefined (e.g. during form state transitions)
  const permissions = rawPermissions ?? ["*"];
  const all = isAllModules(permissions);

  function toggleModule(id: ModuleId) {
    if (all) {
      // Wildcard currently set — switching to explicit: pre-select every
      // module EXCEPT the one being toggled off, then exit wildcard mode.
      const next = ALL_MODULE_IDS.filter((m) => m !== id);
      onChange(next);
      return;
    }
    if (permissions.includes(id)) {
      onChange(permissions.filter((p) => p !== id));
    } else {
      // If they tick the last missing module, auto-upgrade to ["*"] for
      // simplicity (and so admins round-trip cleanly through the API).
      const next = [...permissions, id];
      if (next.length === ALL_MODULE_IDS.length) {
        onChange(["*"]);
      } else {
        onChange(next);
      }
    }
  }

  function selectAllInGroup(groupModules: ModuleId[]) {
    if (all) return;
    const next = Array.from(new Set([...permissions, ...groupModules]));
    if (next.length === ALL_MODULE_IDS.length) {
      onChange(["*"]);
    } else {
      onChange(next);
    }
  }

  function deselectAllInGroup(groupModules: ModuleId[]) {
    if (all) {
      // From "all" → drop just this group's modules.
      onChange(ALL_MODULE_IDS.filter((m) => !groupModules.includes(m)));
      return;
    }
    // `permissions` is string[] (may contain "*" or legacy "module:action"
    // entries); cast so .includes() accepts the broader input.
    const groupSet: string[] = groupModules;
    onChange(permissions.filter((p) => !groupSet.includes(p)));
  }

  function selectEveryModule() {
    onChange(["*"]);
  }

  function clearAllModules() {
    onChange([]);
  }

  return (
    <div className={cn("space-y-3", disabled && "pointer-events-none opacity-60")}>
      {/* Header row — Select all / Clear all + summary count */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <Layers className="h-3.5 w-3.5" />
          <span>
            {all
              ? "All modules selected"
              : permissions.length === 0
                ? "No modules selected"
                : `${permissions.length} module${permissions.length === 1 ? "" : "s"} selected`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={selectEveryModule}
            className="rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary transition hover:bg-primary/20"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearAllModules}
            className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground transition hover:bg-muted/80"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Module groups */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {MODULE_GROUPS.map((group) => {
          const groupIds = group.modules.map((m) => m.id);
          const selectedInGroup = all
            ? groupIds.length
            : groupIds.filter((id) => permissions.includes(id)).length;
          const allSelected = all || selectedInGroup === groupIds.length;
          const noneSelected = !all && selectedInGroup === 0;

          return (
            <div
              key={group.id}
              className="crystal-in rounded-2xl border border-border/40 bg-background/40 p-3"
            >
              {/* Group header — name + select/deselect all chips */}
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {!compact && (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: group.accent }}
                    />
                  )}
                  <span className="text-[11px] font-bold uppercase tracking-wide text-foreground/70">
                    {group.label}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    ({selectedInGroup}/{groupIds.length})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => selectAllInGroup(groupIds)}
                    disabled={all}
                    className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-40"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => deselectAllInGroup(groupIds)}
                    disabled={noneSelected}
                    className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-40"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Module checkboxes */}
              <div className="space-y-1">
                {group.modules.map((m) => {
                  const checked = all || permissions.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={cn(
                        "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] transition",
                        checked
                          ? "bg-primary/5 text-foreground"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleModule(m.id)}
                        disabled={disabled}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="flex-1 truncate">{m.label}</span>
                      {checked && all && (
                        <ShieldCheck className="h-3 w-3 text-primary/60" />
                      )}
                    </label>
                  );
                })}
              </div>

              {/* Group is fully selected — show a subtle "all in this group" indicator */}
              {allSelected && !all && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Check className="h-3 w-3" />
                  All {group.label.toLowerCase()} modules
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Wildcard hint */}
      {all && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-2.5 text-[10px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            This user has the <code className="font-mono text-foreground">{"*"}</code> wildcard — they
            can access every module, including future ones added to the platform.
          </span>
        </div>
      )}
    </div>
  );
}
