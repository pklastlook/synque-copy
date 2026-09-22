# Task ID: 8 — Analytics & Accounts Views

**Agent**: GLM frontend engineer (View-builder)
**Task**: Build two React view components (`AnalyticsView`, `AccountsView`) for the Prism social-media platform, matching the Apple macOS-27 "liquid glass" design language of the existing dashboard.

## Inputs (what I read)
- `/home/z/my-project/worklog.md` — project context
- `/home/z/my-project/src/components/views/dashboard.tsx` — visual reference for the glass aesthetic
- `/home/z/my-project/src/lib/hooks.ts` — `useApi<T>(url)`, `fmt(n)`, `timeAgo(iso)`
- `/home/z/my-project/src/lib/platforms.tsx` — `PLATFORMS`, `PlatformId`, `PlatformGlyph`, `PLATFORM_LIST`
- `/home/z/my-project/src/lib/store.ts` — `useNav({ view, setView, ... })`
- `/home/z/my-project/src/components/glass/{glass-card,platform-badge,name-avatar}.tsx`
- `/home/z/my-project/src/components/ui/{select,dialog}.tsx`
- `/home/z/my-project/src/app/api/{analytics,accounts}/route.ts` — exact response shapes
- `/home/z/my-project/src/app/globals.css` — `.glass`, `.glass-strong`, `.glass-sheen`, `.liquid-pill`, `.glow-ring`, `.scroll-liquid`, `.shimmer`, `.animate-rise`, `.retaina-text`, platform gradient classes

## Files created
1. `/home/z/my-project/src/components/views/analytics.tsx` — `AnalyticsView` (named export, `"use client"`)
2. `/home/z/my-project/src/components/views/accounts.tsx` — `AccountsView` (named export, `"use client"`)

## Work log

### AnalyticsView
- **Controls bar** (`GlassCard strong` + `glass-sheen`): a `Select` dropdown wired to `accountId` state (defaults to `"all"`) plus a 4-pill day-range toggle (7/14/30/90). URL rebuilt via `useMemo` and re-fetched by `useApi`.
- **KPI strip** (4 `KpiCard`s, computed from `perAccount` sums): Impressions, Reach, Engagement, Engagement Rate (= engagement/reach × 100, 1 decimal + `%`).
- **Main chart** (`lg:col-span-2`, height 300): `AreaChart` of `series.impressions` (rose, gradient `aImp`) vs `series.reach` (teal, gradient `aReach`), with `CartesianGrid`, `XAxis`/`YAxis` formatted via `fmt`, and a glass-styled `Tooltip`.
- **Follower chart** (height 220): smooth `LineChart` of `followerSeries.followers` (single primary-color line). Footer chip shows net change (last − first).
- **Per-account comparison** (`lg:col-span-2`): scrollable table (`max-h-96 overflow-y-auto scroll-liquid`) with sticky glass header. Columns: Account (PlatformBadge + name + @handle), Followers, Impressions, Reach, Engagement (with relative-width inline bar), Posts. Rows sorted by followers desc and hover-highlighted.
- **Engagement mix**: `RadarChart` (likes / comments / shares / saves normalized to 0–100) plus a 2×2 legend showing absolute counts.
- **Top content grid** (`sm:grid-cols-2 xl:grid-cols-4`): `TopContentCard` with media thumbnail (or icon fallback), platform badge overlay, relative `timeAgo`, title, author/handle, and an engagement/reach/impressions triple-stat footer.

### AccountsView
- **Header** (`GlassCard strong` + `glass-sheen`): title block + `liquid-pill glow-ring` "Connect account" button that opens a `Dialog` containing a `grid-cols-2 sm:grid-cols-3` of all `PLATFORM_LIST` options; each calls `toast.success(...)`.
- **KPI strip**: total accounts, total followers (sum), total impressions (sum), avg growth.
- **Filter pills**: "All" + one pill per platform present in the data, each with a count badge and (for platform pills) a small `PlatformBadge`. Active state uses primary fill.
- **Account grid** (`grid gap-4 sm:grid-cols-2 xl:grid-cols-3`): each `AccountCard` (a `GlassCard hover` with `glass-sheen`) contains:
  - large `PlatformBadge` (size 44) + displayName + `VerifiedTick` + handle + `PlatformPill`
  - owner row: small `NameAvatar` + "owns this account"
  - big follower stat + a deterministic mini `AreaChart` sparkline (color/curve driven by `followerGrowth` sign — green for up, rose for down)
  - growth delta pill (emerald/rose)
  - 3-col stat grid: Posts, Impr., Eng.
  - footer: "View analytics" (calls `setView("analytics")`) + ghost "Manage" icon button (fires `toast.message`)
- Default sort: followers desc (enforced client-side).

### Quality
- All TypeScript, strict; no `any`. Response shapes captured in interfaces (`AnalyticsResponse`, `PerAccount`, `TopContent`, `AccountData`).
- `// eslint-disable-next-line @next/next/no-img-element` placed before every `<img>` (consistent with dashboard.tsx style).
- Loading skeletons use the `shimmer` class. Each major section wrapped with `animate-rise`.
- Responsive: mobile-first grids (`grid-cols-2 lg:grid-cols-4` KPIs; `sm:grid-cols-2 xl:grid-cols-3` account grid; `lg:grid-cols-3` analytics layout). Tables wrap horizontally on small screens (`min-w-[640px]` inside scroll container).
- Chart colors match dashboard palette (`var(--primary)` rose, `oklch(0.74 0.18 165)` teal, `oklch(0.66 0.22 305)` magenta, `oklch(0.78 0.18 75)` amber, `oklch(0.76 0.18 145)` green). Tooltip `contentStyle` identical to dashboard.

## Lint result
`bun run lint` → **0 errors, 5 warnings** (all are unused `@next/next/no-img-element` directive warnings — same kind already present in `dashboard.tsx`, `composer.tsx`, and `name-avatar.tsx`; these directives are required by the task spec and kept for consistency).

## Stage summary
Both views are complete, integrate cleanly with the existing design system, type-check against the real API response shapes, and pass ESLint with zero errors. Ready for the shell to switch to `view="analytics"` or `view="accounts"`.
