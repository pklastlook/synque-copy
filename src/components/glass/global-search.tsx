"use client";

import * as React from "react";
import {
  Search, Command, CornerDownLeft, ArrowUp, ArrowDown, FileText,
  Users, LayoutDashboard, Plus, Hash, ChevronRight, Clock,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/lib/hooks";
import { useNav } from "@/lib/store";
import type { ViewId } from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================================
// Global Search — ⌘K command palette
// ----------------------------------------------------------------------------
// Fetches results from existing APIs and presents them grouped by category.
// Keyboard navigation: ↑/↓ to move, Enter to select, Esc to close.
// Recent items persist to localStorage so frequently-used entities are
// one shortcut away.
// ============================================================================

interface ModuleEntry {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  group: string;
}

const MODULES: ModuleEntry[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Modules" },
  { id: "composer", label: "Composer", icon: Plus, group: "Modules" },
  { id: "calendar", label: "Calendar", icon: Hash, group: "Modules" },
  { id: "analytics", label: "Analytics", icon: LayoutDashboard, group: "Modules" },
  { id: "inbox", label: "Inbox", icon: Hash, group: "Modules" },
  { id: "accounts", label: "Accounts", icon: Users, group: "Modules" },
  { id: "team", label: "Team", icon: Users, group: "Modules" },
  { id: "reports", label: "Reports", icon: FileText, group: "Modules" },
  { id: "settings", label: "Settings", icon: Hash, group: "Modules" },
];

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  hint: string;
  view: ViewId;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "create-post", label: "Create Post", icon: Plus, hint: "Open AI composer", view: "composer" },
  { id: "add-client", label: "Add Client", icon: Users, hint: "Owner Panel → Clients", view: "owner" },
  { id: "view-dashboard", label: "View Dashboard", icon: LayoutDashboard, hint: "Back to overview", view: "dashboard" },
];

// Result union type — every row rendered in the dropdown becomes one of these.
type Result =
  | { kind: "module"; id: ViewId; label: string; sub: string; icon: LucideIcon }
  | { kind: "client"; id: string; label: string; sub: string }
  | { kind: "post"; id: string; label: string; sub: string; status?: string }
  | { kind: "action"; id: string; label: string; sub: string; icon: LucideIcon; view: ViewId }
  | { kind: "recent"; id: string; label: string; sub: string; payload: RecentEntry };

interface RecentEntry {
  type: "module" | "client" | "post";
  id: string;
  label: string;
  sub?: string;
  view?: ViewId;
}

const RECENT_KEY = "socialflow-cmdk-recent-v1";
const RECENT_MAX = 5;

function loadRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(entry: RecentEntry) {
  try {
    const prev = loadRecent().filter((e) => !(e.type === entry.type && e.id === entry.id));
    const next = [entry, ...prev].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* no-op — localStorage may be unavailable in private mode */
  }
}

export interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Allow parent (app-header) to forward module navigations
   *  through the central nav store. */
  onNavigate?: (view: ViewId) => void;
}

export function GlobalSearch({ open, onOpenChange, onNavigate }: GlobalSearchProps) {
  const { setView } = useNav();
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch the search corpora lazily so the palette stays snappy to open.
  // These requests run in the background; results stream in once ready.
  const { data: clients } = useApi<{ id: string; name: string; email: string; status: string }[] | null>(
    open ? "/api/customers" : null,
  );
  const { data: posts } = useApi<{ id: string; title: string; status: string; authorName: string }[] | null>(
    open ? "/api/posts" : null,
  );

  const recent = React.useMemo(() => (open ? loadRecent() : []), [open]);

  // Build a flat, ordered result list for keyboard navigation.
  // Empty query → show quick actions + recents + a few module shortcuts.
  // Otherwise filter every category by the (case-insensitive) query.
  const results = React.useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const flat: Result[] = [];
      flat.push(...QUICK_ACTIONS.map((a) => ({
        kind: "action" as const,
        id: a.id,
        label: a.label,
        sub: a.hint,
        icon: a.icon,
        view: a.view,
      })));
      if (recent.length > 0) {
        flat.push(...recent.map((r) => ({
          kind: "recent" as const,
          id: r.id,
          label: r.label,
          sub: r.sub ?? "Recent",
          payload: r,
        })));
      }
      flat.push(...MODULES.slice(0, 5).map((m) => ({
        kind: "module" as const,
        id: m.id,
        label: m.label,
        sub: "Module",
        icon: m.icon,
      })));
      return flat;
    }

    const flat: Result[] = [];
    // Modules first (nav is the most common intent)
    for (const m of MODULES) {
      if (m.label.toLowerCase().includes(q)) {
        flat.push({ kind: "module", id: m.id, label: m.label, sub: "Module", icon: m.icon });
      }
    }
    // Quick actions
    for (const a of QUICK_ACTIONS) {
      if (a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q)) {
        flat.push({ kind: "action", id: a.id, label: a.label, sub: a.hint, icon: a.icon, view: a.view });
      }
    }
    // Clients (max 5)
    const clientMatches = (clients ?? [])
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 5)
      .map((c) => ({ kind: "client" as const, id: c.id, label: c.name, sub: c.email }));
    flat.push(...clientMatches);
    // Posts (max 5) — filter by title or author
    const postMatches = (posts ?? [])
      .filter((p) => (p.title || "Untitled").toLowerCase().includes(q) || (p.authorName || "").toLowerCase().includes(q))
      .slice(0, 5)
      .map((p) => ({
        kind: "post" as const,
        id: p.id,
        label: p.title || "Untitled post",
        sub: p.authorName ? `by ${p.authorName}` : "Post",
        status: p.status,
      }));
    flat.push(...postMatches);
    return flat;
  }, [query, clients, posts, recent]);

  // Reset cursor to top whenever the result set changes.
  React.useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  // Auto-focus the input on open; reset query on close.
  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const select = React.useCallback((r: Result) => {
    let entry: RecentEntry | null = null;
    const go = (view: ViewId) => {
      if (onNavigate) onNavigate(view);
      else setView(view);
    };
    if (r.kind === "module") {
      const view = r.id;
      go(view);
      entry = { type: "module", id: view, label: r.label, sub: "Module", view };
    } else if (r.kind === "action") {
      go(r.view);
      entry = { type: "module", id: r.view, label: r.label, sub: r.sub, view: r.view };
    } else if (r.kind === "recent") {
      const p = r.payload;
      if (p.view) {
        go(p.view);
      } else if (p.type === "client") {
        // Owner Panel handles client drill-down; just open the panel.
        go("owner");
      } else if (p.type === "post") {
        // Posts open in the Composer via openComposerWithPost — but we don't
        // have the full Post object here, so route to composer for creation.
        go("composer");
      }
      return; // recent entries don't re-save themselves
    } else if (r.kind === "client") {
      // Best we can do is open the Owner Panel (the customer tab is the default).
      go("owner");
      entry = { type: "client", id: r.id, label: r.label, sub: r.sub };
    } else if (r.kind === "post") {
      go("composer");
      entry = { type: "post", id: r.id, label: r.label, sub: r.sub };
    }
    if (entry) saveRecent(entry);
    onOpenChange(false);
  }, [onNavigate, onOpenChange, setView]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) select(r);
    }
  };

  // Group results for display: Quick actions / Recent / Modules / Clients / Posts.
  // We render groups in a stable order; the flat `results` array preserves
  // the in-group order so keyboard index mapping is straightforward.
  const groups = React.useMemo(() => {
    const order: Result["kind"][] = ["action", "recent", "module", "client", "post"];
    const labels: Record<Result["kind"], string> = {
      action: "Quick actions",
      recent: "Recent",
      module: "Modules",
      client: "Clients",
      post: "Posts",
    };
    return order
      .map((kind) => ({ kind, label: labels[kind], items: results.filter((r) => r.kind === kind) }))
      .filter((g) => g.items.length > 0);
  }, [results]);

  // Track absolute index across groups so keyboard nav matches what's visible.
  let cursor = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Global search</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search modules, clients, posts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="global-search-listbox"
            role="combobox"
          />
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
        </div>

        <div
          id="global-search-listbox"
          role="listbox"
          aria-label="Search results"
          className="scroll-liquid max-h-[420px] overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Search className="mx-auto mb-2 h-5 w-5 opacity-40" />
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.kind} className="mb-1.5 last:mb-0">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </div>
                {g.items.map((r) => {
                  const idx = cursor++;
                  const active = idx === activeIndex;
                  return (
                    <button
                      key={`${r.kind}-${r.id}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => select(r)}
                      role="option"
                      aria-selected={active}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition",
                        active ? "bg-primary/10 text-foreground" : "hover:bg-muted/60",
                      )}
                    >
                      <ResultIcon result={r} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.label}</div>
                        <div className="truncate text-[12px] text-muted-foreground">{r.sub}</div>
                      </div>
                      {"status" in r && r.status ? (
                        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          {r.status.slice(0, 4)}
                        </span>
                      ) : null}
                      {active ? (
                        <CornerDownLeft className="h-3 w-3 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/40 px-4 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K to open · ESC to close · Type to search
          </span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              navigate
            </span>
            <span className="flex items-center gap-0.5">
              <CornerDownLeft className="h-3 w-3" /> select
            </span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultIcon({ result }: { result: Result }) {
  if (result.kind === "module" || result.kind === "action") {
    const Icon = result.icon;
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (result.kind === "recent") {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (result.kind === "client") {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Users className="h-3.5 w-3.5" />
      </span>
    );
  }
  // post
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
      <FileText className="h-3.5 w-3.5" />
    </span>
  );
}
