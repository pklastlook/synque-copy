# A11Y-1 — a11y-fix-agent

## Task
Add ARIA semantics to two large view files that previously had ZERO
`aria-*` / `role` / `sr-only` / `alt` attributes:

1. `src/components/views/admin-panel.tsx` (1317 lines)
2. `src/components/views/team-performance.tsx` (1756 lines)

Goal: improve screen-reader navigation without changing any visual
behavior. Only ADD attributes — no existing code was removed or
rewritten.

## Files changed
1. `src/components/views/admin-panel.tsx` — +28 ARIA attribute instances
2. `src/components/views/team-performance.tsx` — +53 ARIA attribute instances

## What was added (admin-panel.tsx)

### Charts (recharts BarChart)
- `TaskBoardTile` distribution chart container `<div>` wrapped with
  `role="img" aria-label="Task status distribution chart — counts of
  tasks in each workflow stage: To Do, In Progress, Review, Done,
  Blocked"`. CartesianGrid (decorative grid lines) given `aria-hidden`.
- `DepartmentTile` horizontal BarChart wrapped in
  `role="img" aria-label="Department engagement comparison chart —
  horizontal bars showing engagement by department"`. CartesianGrid
  given `aria-hidden`.

### Data lists (role="list" / role="listitem")
- `TeamPerformanceTile` scrollable list → `role="list"
  aria-label="Team members list"`. Each `TeamListRow` (via `ListRow`
  spread props) → `role="listitem"`.
- `TaskBoardTile` top tasks list → `role="list" aria-label="Top
  priority tasks"`. Each `TaskListRow` → `role="listitem"`.
- `AccountHealthTile` top accounts list → `role="list"
  aria-label="At-risk accounts ranked by risk score"`. Each
  `AccountHealthListRow` → `role="listitem"`.
- `ActivityTile` activity feed → `role="list" aria-label="Recent
  workspace activity feed"`. Each `ActivityListRow` → `role="listitem"`.
- `ProfileBody` stats grid → `role="list" aria-label="Member
  statistics"`. Each stat card → `role="listitem"`.
- `ProfileBody` permissions flex container → `role="list"
  aria-label="Member permissions"`.
- `DepartmentTile` mini legend grid → `role="list" aria-label=
  "Department engagement legend"`. Each legend entry →
  `role="listitem"`.

### Live counts (role="status" / aria-live)
- `TaskBoardTile` SectionHeader action wrapper (status count pills) →
  `role="status" aria-live="polite" aria-label="Task counts by
  status"` so the count pills are announced when the data refreshes.

## What was added (team-performance.tsx)

### Tables (shadcn <Table>)
- `LeaderboardSection` Table → `aria-label="Team leaderboard — members
  ranked by content activity"`. All 9 `<TableHead>` elements →
  `scope="col"`. First `<TableCell>` (Rank) in each data row →
  `scope="row"`. ColSpan rows (empty state + expanded detail) left
  untouched.
- `PostsListView` Table → `aria-label="Posts list — sortable by title,
  engagement, and date"`. All 6 `<TableHead>` elements → `scope="col"`.
  First `<TableCell>` (Post title) in each data row → `scope="row"`.

### Tabs (shadcn <Tabs>)
- `PostsKanbanSection` TabsList → `aria-label="Posts board view
  toggle"`. Each TabsTrigger got a descriptive `aria-label` ("Kanban
  view" / "List view") to disambiguate the icon+text combo.

### Custom chart (ActivityHeatmap)
- Outer container `<div>` → `role="img" aria-label="90-day activity
  heatmap — N total activities across M active days"` (computed
  dynamically).
- Legend gradient swatches (decorative) → `aria-hidden="true"`.
- Inner week strip wrapper → `role="presentation"`.

### Risk gauge SVG (AccountHealthCompact)
- The inline SVG risk-score gauge is decorative (the numeric score is
  shown as text right next to it) — the wrapping
  `<div className="relative h-7 w-7 shrink-0">` got `aria-hidden="true"`
  so screen readers don't get a duplicate reading.

### Interactive buttons
- `AccountHealthCompact` expand/collapse `<button>` got
  `aria-expanded={isOpen}`, `aria-controls=...detail-${acc.id}`, and
  a descriptive `aria-label` announcing account name, risk score,
  status, and expand/collapse intent.
- The expanded detail panel got `role="region"` + `aria-label="Details
  for ${acc.displayName}"` + matching `id` so `aria-controls` resolves.

### Data lists (role="list" / role="listitem")
- `MemberExpandedDetails` per-platform breakdown → `role="list"
  aria-label="Per-platform breakdown"`. Each platform row →
  `role="listitem"`.
- `PipelineSection` posts-by-platform list → `role="list"
  aria-label="Posts by platform"`. Each platform row → `role="listitem"`.
- `PipelineSection` comment-types flex container → `role="list"
  aria-label="Comment types"`. Each comment-type chip → `role="listitem"`.
- `TopContributorsSection` podium columns → `role="list" aria-label=
  "${tile.title} podium"`. Each member row → `role="listitem"`.
- `AccountHealthCompact` main list → `role="list" aria-label="Account
  health list"`. Each account item → `role="listitem"`.
- `AccountHealthCompact` comment-load scrollable list → `role="list"
  aria-label="Account comment load"`. Each comment-load row →
  `role="listitem"`.
- `RecentActivityCompact` activity scrollable list → `role="list"
  aria-label="Recent activity feed"`. Each activity row →
  `role="listitem"`.

### Live counts (role="status" / aria-live)
- `LeaderboardSection` "Showing N members · …" footer → `role="status"
  aria-live="polite"`.
- `PostsListView` "Showing N posts · …" footer → `role="status"
  aria-live="polite"`.
- `PostsKanbanSection` KPI summary strip → `role="status"
  aria-live="polite" aria-label="Posts board summary"`.

## Verification
- `bun run lint` → exit 0, **0 errors / 0 warnings**.
- `bunx tsc --noEmit` (filtered to the two files) → 0 errors.
- `dev.log` shows no new compilation errors after edits — Next.js
  recompiled cleanly.

## Stage summary
Both views now have comprehensive ARIA coverage:

- All `<Table>` elements have `aria-label`.
- All `<TableHead>` elements have `scope="col"`.
- First `<TableCell>` in each data row has `scope="row"`.
- All chart containers have `role="img" aria-label="..."`.
- Decorative SVG/grid elements have `aria-hidden`.
- TabsList has `aria-label`.
- TabsTriggers with icons have descriptive `aria-label`.
- Data lists have `role="list"` + `role="listitem"`.
- Live count regions have `role="status"` + `aria-live="polite"`.
- Expand/collapse buttons have `aria-expanded` + `aria-controls` +
  descriptive `aria-label`.

Zero visual changes — only ARIA attributes were added. No existing code
was removed.
