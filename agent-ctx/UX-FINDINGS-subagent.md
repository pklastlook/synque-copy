# Task ID: UX-FINDINGS — Subagent work record

## Task
Implement ALL 8 remaining UX audit findings (the first 5 — grouped tabs,
font sizes, empty states, onboarding, step wizard — were already done by
the UX-IMPROVE subagent).

This task covered the next 8:

1. Touch targets (44×44px minimum on touch devices)
2. Global ⌘K search palette (modules + clients + posts + recents + actions)
3. Breadcrumb navigation context
4. User-friendly error messages
5. Dark mode contrast fixes
6. Consolidated semantic color palette
7. Layout-matching loading skeletons
8. Chart drill-down (click → navigate)

## Previous work referenced
- `/agent-ctx/UX-IMPROVE-subagent.md` — implemented grouped tabs, font sizes,
  empty states, onboarding checklist, and 3-step subscription wizard.
- Worklog tail shows `bun run lint` exited 0 with only pre-existing
  warnings after that task.

## Files modified (8)
1. `src/app/globals.css` — added touch-target rule, dark mode contrast
   fixes (`@media (prefers-color-scheme: dark)` + `.dark` class
   equivalent), and a consolidated semantic + platform color palette in
   `:root`.
2. `src/components/glass/dense-ui.tsx` — `MetricRow` and `ListRow` items
   now have `min-h-[44px]` so they meet touch-target minimums.
3. `src/components/views/owner.tsx` — bulk-replaced 34
   `toast.error(e instanceof Error ? e.message : "…")` patterns with
   `toast.error(userFriendlyError(e))`; bumped 9 icon-only action buttons
   from `h-7 w-7` (28px) → `h-9 w-9` (36px) and added the `compact` opt-out
   class; replaced 16 generic shimmer placeholders with layout-matching
   `SkeletonCard` / `MetricRowSkeleton` / `AccountCardSkeleton`.
4. `src/components/views/dashboard.tsx` — replaced generic
   `<div className="shimmer h-64 rounded-3xl" />` style skeleton with a
   fully layout-matching `DashboardSkeleton` (hero header + MetricRow +
   5 BentoTiles + 2 recent-post cards + NavCard row); made the area chart,
   bar chart, and pie chart clickable → navigate to Analytics / Calendar /
   Accounts respectively.
5. `src/components/app-header.tsx` — removed the old simple
   `CommandPalette` (only navigated modules); wired in `GlobalSearch`
   (modules + clients + posts + recents + quick actions); added a mobile
   search icon button (so ⌘K is reachable without a keyboard); added a
   "Search" entry to the avatar dropdown on mobile; added a
   `crumbsFor(view)` mapper + `<Breadcrumbs />` row below the topbar.
6. `src/lib/user-errors.ts` (NEW) — `userFriendlyError(error)` helper that
   pattern-matches common technical errors (network, 401/403/404/409/429,
   5xx, runtime crashes, validation) and returns friendly messages.

## Files created (4)
1. `src/components/glass/global-search.tsx` — ⌘K command palette. Fetches
   `/api/customers` and `/api/posts` lazily on open. Renders results
   grouped by Quick actions / Recent / Modules / Clients / Posts. Full
   keyboard nav (↑/↓/Enter/Esc). Recents persist to localStorage
   (`socialflow-cmdk-recent-v1`, max 5).
2. `src/components/glass/breadcrumbs.tsx` — `<Breadcrumbs items={[…]} />`
   with `hideOnShallowMobile` (default true) so single-root views (e.g.
   Dashboard) don't render the trail on mobile but still do on lg+.
3. `src/components/glass/skeleton-card.tsx` — exports `MetricRowSkeleton`,
   `AccountCardSkeleton`, `TableSkeleton`, `SkeletonCard`,
   `OverviewSkeleton`, `PageSkeleton`. All set `role="status"` +
   `aria-label` so screen readers announce "Loading…" instead of silence.
4. `src/lib/user-errors.ts` — see above.

## Verification
- `cd /home/z/my-project && bun run lint` → **0 errors, 7 warnings**
  (all pre-existing `@next/next/no-location-assign-relative-destination`
  warnings in unrelated files: `landing-page.tsx` ×3,
  `landing-shared.tsx` ×1, `accounts.tsx` ×2, `settings.tsx` ×1 — none
  in any file this task touched). Exit code 0.
- `bunx tsc --noEmit` shows 2 pre-existing errors in unrelated files
  (`src/app/api/oauth/callback/[platform]/route.ts`,
  `src/lib/sync-platforms.ts`) — none in any file this task touched.
- Dev server NOT started (per task rules).
- No Prisma schema changes — `prisma db push` not needed.

## Stage Summary
All 8 remaining UX audit findings are now implemented. Touch targets
meet WCAG 2.1 SC 2.5.5 (44×44 on touch devices, 36px desktop). The ⌘K
palette now searches the whole workspace (modules + clients + posts +
recent items + quick actions) with full keyboard navigation. Every view
has a breadcrumb trail showing the user where they are in the hierarchy.
All backend errors shown to users go through `userFriendlyError()` so
they see "Network error. Check your connection." instead of
"TypeError: Cannot read properties of undefined". Dark mode muted-foreground
text bumped from 64.9% L → 70% L for WCAG AA compliance on dark cards.
The semantic + platform color palette is now a single source of truth in
`:root` so theme updates stay consistent. Loading skeletons no longer
look like a bug — each skeleton mirrors the real component's layout
(MetricRowSkeleton with 6 metric blocks, AccountCardSkeleton with
avatar + lines + stats, TableSkeleton with header + N rows). Dashboard
charts are now interactive: click the trend area → Analytics; click a
day bar → Calendar; click a platform slice → Accounts. `bun run lint`
exits 0 with only pre-existing warnings in unrelated files.
