# Task ID 6 — Agent: approvals & competitors views

**Agent name**: views-builder-approvals-competitors
**Task**: Build two `"use client"` view components — `ApprovalsView` (`/api/approvals`) and `CompetitorsView` (`/api/competitors`) — matching the existing macOS-27 liquid-glass aesthetic established by `dashboard.tsx`. No new API routes or pages were created; both views consume existing infrastructure (existing `/api/approvals` GET/PATCH and `/api/competitors` GET/POST routes).

## Files created
1. `src/components/views/approvals.tsx` — exports `ApprovalsView`
2. `src/components/views/competitors.tsx` — exports `CompetitorsView`

Both were verified against the actual API route shapes (`src/app/api/approvals/route.ts` and `src/app/api/competitors/route.ts`) — `ApprovalsView` consumes the full `Approval` array (incl. `authorColor`, `priority`, `dueAt`, `resolvedAt`); `CompetitorsView` consumes the full `Competitor` array incl. nested `series[]` snapshots.

## Work log
- Read prior work records in `/agent-ctx/` (Tasks 7 & 8) and `/home/z/my-project/worklog.md` (Tasks 7, 8, 9, 14) to learn the established visual language and confirm design-system imports.
- Read `dashboard.tsx`, `team.tsx`, `accounts.tsx`, `analytics.tsx` to match exact GlassCard / KpiCard / Dialog / Select / sparkline patterns.
- Confirmed `/api/approvals` returns the array shape documented in the task (and PATCH `{ id, status, comment }` returns `{ ok }`). Confirmed `/api/competitors` GET returns `series[]` and POST accepts `{ name, handle, platform, notes }` and returns `{ id, ok }`.

### ApprovalsView (`src/components/views/approvals.tsx`)
- Hero `GlassCard strong glass-sheen` with primary blur blob + `ShieldCheck` eyebrow, h2 "Approvals", workflow explanation paragraph, and a `liquid-pill glow-ring` "Request approval" button.
- "Request approval" Dialog: title input, author Select (loaded from `/api/team`), approver Select (defaults to first admin), priority Select (low/normal/high/urgent), dueAt date input. Per task spec, POST is not required — on submit it just `toast.success("Approval requested")` and `reload()`s the approvals list.
- KPI strip (4 × `KpiCard`): Pending (amber), Approved (green), Rejected (rose = `var(--primary)`), Changes requested (magenta). Each KPI shows the matching count + a hint.
- "Resolution ratio" stats card: a horizontal stacked bar made of 4 absolutely-widthed div segments (approved/changes_requested/rejected/pending) coloured per the vibrant palette, plus a legend row with counts.
- Two-column layout (`lg:grid-cols-2`):
  - **Left**: Pending queue (GlassCard, `max-h-[640px] overflow-y-auto scroll-liquid`). Pending approvals sorted by priority (urgent → high → normal → low via `PRIORITY_RANK`). Each `PendingCard` has a left color bar (`PRIORITY_COLOR`), `NameAvatar` of author (uses `authorColor`), title, priority pill, "requested {timeAgo}", due date with red highlight + `AlertTriangle` icon when overdue. Action buttons: **Approve** (green), **Request changes** (amber), **Reject** (rose) — clicking opens an inline card with a `Textarea` and a Confirm button that PATCHes `/api/approvals` with `{ id, status, comment }`, then `reload()`s.
  - **Right**: History of resolved approvals (sorted by `resolvedAt` desc). `ResolvedCard` shows the same header + status badge (`STATUS_META` palette) + the reviewer's comment in a quoted muted card + "by {approverName}" and "resolved {timeAgo}".
- Empty states for both columns (`CheckCircle2` "All caught up" / `ClipboardCheck` "No history yet").
- Loading skeleton uses the `shimmer` class and matches dashboard's spacing.

### CompetitorsView (`src/components/views/competitors.tsx`)
- Hero `GlassCard strong glass-sheen` with primary blur blob + `Crosshair` eyebrow, h2 "Competitors", explanation paragraph, and `liquid-pill glow-ring` "Add competitor" button.
- "Add competitor" Dialog: name input, handle input, platform Select (uses `PLATFORM_LIST`), notes Textarea. Submits POST `/api/competitors` with `{ name, handle, platform, notes }`; on success `toast.success("Competitor added")`, closes dialog, `reload()`s.
- KPI strip (4 × `KpiCard`): Competitors tracked (rose), Total reach (teal, sum followers + `fmt`), Avg engagement (magenta, %), Avg growth (amber, %).
- **Comparison chart** (GlassCard, 280px): multi-line `LineChart` plotting `followers` over `series[].date` for the top 4 competitors (sorted by followers). Each line uses a distinct colour from `LINE_COLORS` (`var(--primary)`, teal, magenta, amber). Built a merged dataset keyed by date (each row keyed by competitor id, with `connectNulls` so sparse snapshots render correctly). Legend in the SectionTitle action: small PlatformBadge + name per line.
- **Comparison table** (GlassCard, `max-h-[460px] overflow-y-auto scroll-liquid`): columns Competitor (PlatformBadge + name + handle), Followers (`fmt`, tabular-nums, right-aligned), Engagement (%), Growth (% with TrendingUp/TrendingDown icon + green/rose pill), Posts/wk, Status (Play/Pause pill), Actions (View ghost button). Sticky glass header, hover row highlight (`hover:bg-muted/40`). Sorted by followers desc by default.
- **Status filter pills** (All / Tracking / Paused) with counts.
- **Detail card grid** (`grid gap-4 lg:grid-cols-2`): each `CompetitorCard` shows:
  - PlatformBadge (44px) + name + status pill + PlatformPill + big follower count.
  - Tiny 64px-tall `LineChart` sparkline from `series[].followers` (colored green if growth positive, rose if negative). Fallback to a single-point series if competitor has no snapshots yet (so freshly-added competitors don't crash).
  - 3-stat grid: Engagement %, Growth % (with up/down tone coloring), Posts/wk.
  - **"Benchmark vs us"** card: gradient bar from rose→magenta with width = `min(100, rival / OUR_FOLLOWERS × 100)`. Shows absolute delta (with +/− sign) ahead of / behind our mock top-account value (184,300). "X rival / Y us" labels under the bar.
  - Notes quoted block (if present).
  - Footer: "View profile" ghost button + `Sparkles` decoration.
- Loading skeleton uses `shimmer`; wrapper has `animate-rise`.

## Quality checks
- TypeScript strict throughout, **no `any`** used anywhere.
- Both components marked `"use client"`.
- All interactive elements use `rounded-xl`/`rounded-2xl` + hover transitions.
- No `<img>` elements were used directly (`PlatformBadge` / `NameAvatar` handle any image rendering internally) — so no `@next/next/no-img-element` directives needed.
- Responsive mobile-first: grids collapse to single column under `lg:`; queue + history stack vertically; comparison chart and table scroll horizontally if needed.
- Loading skeletons use `shimmer` class; top wrapper has `animate-rise`.
- Reused design-system primitives only: `GlassCard`, `KpiCard`, `SectionTitle`, `PlatformBadge`, `PlatformPill`, `NameAvatar`, `useApi`, `fmt`, `timeAgo`, `cn`, shadcn `Dialog`/`Select`/`Input`/`Label`/`Textarea`/`Button`.
- Verified exports of `@/components/ui/dialog`, `select`, `input`, `label`, `textarea`, `button` before importing.
- Recharts tooltips styled with `var(--popover)` / `var(--border)` to match the glass aesthetic of `dashboard.tsx`.
- Palette strictly follows the spec: rose `var(--primary)`, teal `oklch(0.74 0.18 165)`, magenta `oklch(0.66 0.22 305)`, amber `oklch(0.78 0.18 75)`, green `oklch(0.76 0.18 145)`.

## Lint result
`bun run lint` → **0 errors, 4 warnings** (all in `media-library.tsx` — a pre-existing file outside Task 6's scope; 4 unused-`@next/next/no-img-element`-directive warnings). **0 warnings, 0 errors introduced by `approvals.tsx` or `competitors.tsx`.**

## Stage summary
Both views are now resolvable by `app-shell.tsx` (which already imports `ApprovalsView` from `@/components/views/approvals` and `CompetitorsView` from `@/components/views/competitors`). Switching to `view="approvals"` or `view="competitors"` will render fully-functional, polished UIs against the existing API routes. The only remaining `dev.log` error is `Module not found: '@/components/views/reports'` (Task ID ≠ 6, not in scope).
