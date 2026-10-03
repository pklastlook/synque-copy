# Task ID: MOBILE-FIX — Mobile alignment fix agent

**Scope**: Fix mobile alignment issues in SYNQUE dashboard (`dashboard.tsx`),
listening view (`listening.tsx`), and the global mobile CSS in `globals.css`.

## Files touched
1. `src/components/views/dashboard.tsx`
2. `src/components/views/listening.tsx`
3. `src/app/globals.css`

## Changes

### 1. Dashboard — ContentWorkflow stage cards (`dashboard.tsx`)
The horizontal-scroll stage flow (Posts / Drafts / Scheduled / Published / Shares)
used `w-[88px]` cards which were too tall and visually cramped on mobile.
Tightened everything one notch so 5 stages + 4 chevrons fit comfortably in a
scroll row on a 360–375px viewport:

| Token          | Before       | After        |
|----------------|--------------|--------------|
| card width     | `w-[88px]`   | `w-[72px]`   |
| card padding   | `p-2`        | `p-1.5`      |
| icon container | `h-6 w-6`    | `h-5 w-5`    |
| icon size      | `h-3 w-3`    | `h-2.5 w-2.5`|
| number size    | `text-base`  | `text-sm`    |
| label size     | `text-[8px]` | `text-[7px]` |
| chevron size   | `h-3 w-3`    | `h-2.5 w-2.5`|

Desktop still uses `sm:w-auto sm:flex-1` so cards expand to fill the row on
≥640px viewports.

### 2. Dashboard — Tasks stat row (`dashboard.tsx`)
The Total / Done / Active / Overdue row used `flex items-stretch gap-1.5` with
`flex-1` children. Combined with the global mobile CSS rule
`.mobile-content .flex:not(.overflow-x-auto)... { flex-wrap: wrap; }`, this
caused the 4 stats to wrap into a 2×2 block awkwardly (and unpredictably
depending on label length). Converted to a real 4-column grid so the layout
is deterministic, then tightened the typography to match:

| Token        | Before                    | After                          |
|--------------|---------------------------|--------------------------------|
| container    | `flex items-stretch gap-1.5` | `grid grid-cols-4 gap-1`     |
| stat cell    | `flex-1 ... p-2 text-center` | `grid place-items-center ... p-1.5 text-center` |
| number size  | `text-base`               | `text-sm`                      |
| label size   | `text-[9px]`              | `text-[8px]`                   |

On mobile the global CSS rule
`.mobile-content .grid-cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }`
will gracefully demote this to a 2×2 grid (still aligned, still readable),
and at `sm:`+ it shows the full 1×4 row.

### 3. Dashboard — Tasks + Pipeline section wrapper (`dashboard.tsx`)
The two-GlassCard Tasks + Pipeline section used
`grid gap-3 lg:grid-cols-2`. On mobile the `grid-cols-2` is not active (only
the `lg:` variant), so by default it would be 1 column — but to be defensive
against any future grid-cols override rules and to make the intent explicit,
the wrapper was changed to:

```tsx
<div className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
```

This makes mobile use flex-column (immune to the grid-cols override CSS) while
preserving the desktop 2-column grid layout.

### 4. Listening view (`listening.tsx`) — `no-wrap` escape hatches
Two flex containers in `MentionRow` were being wrapped by the global
`.mobile-content .flex:not(.overflow-x-auto)... { flex-wrap: wrap; }` rule,
which broke the visual hierarchy of each mention card:

1. **Author header** (line ~569) — avatar + author name + sentiment Pill +
   "time ago" should always stay on one line so the user can scan the author
   and sentiment at a glance. Wrapping pushed the Pill + time to a second
   line, breaking the row. Added `no-wrap` class.
2. **Reply / View action buttons** (line ~602) — `ml-auto flex items-center
   gap-1`. The `ml-auto` only works inside a non-wrapped flex row; once the
   parent flex wrapped, the action buttons lost their right-alignment.
   Added `no-wrap` class.

```tsx
<div className="no-wrap flex items-center gap-2"> {/* author header */}
...
<div className="no-wrap ml-auto flex items-center gap-1"> {/* action buttons */}
```

Other flex containers in the view (SectionHeader action, mention meta row
with `flex-wrap` already explicitly set) are intentionally wrappable and were
left alone.

### 5. Global mobile CSS escape hatch (`globals.css`)
Added `.no-wrap` to the existing escape-hatch rule (alongside `.flexnowrap`
and Tailwind's `.flex-nowrap`):

```css
.mobile-content .flexnowrap,
.mobile-content .flex-nowrap,
.mobile-content .flex.no-wrap { flex-wrap: nowrap !important; }
```

This gives a short, memorable opt-out class for designers who want to mark
specific flex rows as "do not wrap" without typing the longer `flex-nowrap`
or importing anything. (Tailwind's built-in `flex-nowrap` would also work,
but the project convention favors a short, semantic class name.)

## Validation
- `bun run lint` — passes with zero errors / warnings.
- TypeScript / Next.js compile clean (no type errors introduced).
- No new dependencies added.

## No backend / API changes
This task is purely a frontend polish pass; no API routes, Prisma schemas,
or store changes were touched.
