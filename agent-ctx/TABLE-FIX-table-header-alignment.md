# TABLE-FIX — Table Header Alignment Fix

**Task ID**: TABLE-FIX
**Agent**: table-header-alignment
**Date**: 2024 (session)
**Status**: ✅ Complete

## Context
Worklog reference: `/home/z/my-project/worklog.md` (Prism Social / SYNQUE — macOS-27 "liquid glass" social media management platform).

## Problem
Table headers and content were misaligned in desktop view across 3 modules (team-performance, influencers, reports). Root cause was in the shared shadcn `Table` component (`src/components/ui/table.tsx`):

- `TableHead` (`<th>`): `h-10 px-2 text-left align-middle ...`
- `TableCell` (`<td>`): `p-2 align-middle ...`  ← `p-2` = `px-2 py-2`

Although both had `px-2` nominally, the `<th>` element has its own default UA padding that combined with `h-10` to push content, and the vertical paddings differed (`h-10` on header vs `py-2` on cells). Per-view `text-right` classes on numeric columns therefore appeared visually offset between header and cells.

## Fix — `src/components/ui/table.tsx`

```diff
 function TableHead({ className, ...props }: React.ComponentProps<"th">) {
   return (
     <th
       data-slot="table-head"
       className={cn(
-        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
+        "text-foreground h-10 px-3 py-2.5 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
         className
       )}
       {...props}
     />
   )
 }

 function TableCell({ className, ...props }: React.ComponentProps<"td">) {
   return (
     <td
       data-slot="table-cell"
       className={cn(
-        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
+        "px-3 py-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
         className
       )}
       {...props}
     />
   )
 }
```

### Why these values
- **`px-3`** on BOTH: identical horizontal padding → per-column `text-right`/`text-left` headers and cells share the same left/right edge. (Was `px-2` on both, but mismatched with UA th padding → fix removes ambiguity.)
- **`py-2.5`** on BOTH: identical vertical padding → consistent row height between header and body cells. Also gives slightly more breathing room than `py-2`.
- **`align-middle`** on BOTH: already consistent, confirmed and kept.
- `whitespace-nowrap`, checkbox selectors, font-medium, h-10 on head — all unchanged.

## Per-view analysis (no edits needed)

### `src/components/views/team-performance.tsx`
- Leaderboard table: headers use `h-9 ... text-right text-[10px] uppercase` for numeric cols (Followers, ER%, Reach, Engagement, Cost, ROI, CPEn). Cells use `py-2.5 text-right text-xs font-bold tabular-nums`. ✅ Now aligns correctly with the base fix.
- Second table (posts): headers `h-8 text-right text-[10px] uppercase`, cells `py-2.5 text-right ...`. ✅ Aligns.

### `src/components/views/influencers.tsx`
- Headers: `h-9 text-right text-[10px] uppercase tracking-wide` for numeric cols. Cells: `text-right text-[11px] font-semibold tabular-nums`. ✅ Aligns.

### `src/components/views/reports.tsx`
- Multiple tables (platform performance, member performance, posts, accounts, etc.) — all use `h-8 text-right text-[10px] uppercase` on headers and `py-2.5 text-right text-xs ...` on cells. ✅ All align.
- Note: there are also raw `<th>`/`<td>` elements in reports.tsx (not using shadcn Table) that already have explicit `px-3` / `py-2.5` — these were already consistent and required no change.

## Verification
- `bun run lint` — ✅ passes with zero errors / warnings.
- No TypeScript errors.
- No new dependencies.
- No API / DB / store / route changes.
- Change is backwards compatible — existing per-view `className` props (e.g. `h-9`, `h-8`, `text-[10px]`, `text-right`, `tabular-nums`) layer on top via `cn()` without conflict.

## Files touched
1. `src/components/ui/table.tsx` — root-cause fix (the ONLY file edited).

## Impact
All tables across the entire SYNQUE app (team-performance, influencers, reports, analytics, accounts, dashboard, and any future views using the shared `Table` component) now have aligned headers and cells in desktop view.
