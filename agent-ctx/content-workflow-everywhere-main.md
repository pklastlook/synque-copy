# Task ID: content-workflow-everywhere

**Agent**: main (Z.ai Code)
**Completed**: yes

## Summary
Rolled out the Dashboard's 5-stage Content workflow (Posts → Drafts → Scheduled → Published → Shared) to the Team Performance, Reports, and Calendar views. Presentation-only — no API routes, Prisma schema, or Dashboard changes.

## Files modified
1. `src/components/views/calendar.tsx` — relabelled "Content pipeline" → "Content workflow" in the month-view section header and the empty-state copy.
2. `src/components/views/team-performance.tsx` — added `ContentWorkflowStrip` helper; replaced the 4-pill lifecycle grid in `PipelineSection` with the new 5-stage chevron strip. Header retitled "Content workflow".
3. `src/components/views/reports.tsx` — rewrote `PipelinePills` to render the same 5-stage chevron strip; updated both call sites (`ContentContent`, `PostsPerformanceContent`); updated Content tab desc; updated content/posts-performance KPI strips; updated the print-mode "Content Workflow" table + KPI tables + executive summary sentences.

## Visual style (locked across all views)
- Posts = `#8E8E93` gray, Layers icon
- Drafts = `#AF52DE` purple, PenSquare icon
- Scheduled = `#007AFF` blue, Clock icon
- Published = `#34C759` green, Send icon
- Shares = `#FF9500` orange, Share2 icon
- Chevron arrow (`ChevronRight`, muted/30%) between stages.
- Stage card: `flex-1 overflow-hidden rounded-xl border p-2`, border color = `${color}30`, bg = `${color}08`, icon chip = `${color}14` bg with `${color}` fg, large count + tiny label.

## Data sources per view
- Team Performance: `total` (team totals) + `pipeline` + `postsByPlatform` summed for Shares.
- Reports / Content: `totals.posts` + `teamData.pipeline` + `teamData.postsByPlatform` summed for Shares.
- Reports / Posts-Performance: `k.totalPosts` + `k.{draft,scheduled,published}` + `k.totalVariantsPublished` for Shares.
- All call sites fall back to `pipeline.published` as a Shares proxy when the upstream count is unavailable.

## What was NOT modified
- Dashboard's `ContentWorkflow` component (already done).
- API routes, Prisma schema, seed script.
- `PIPELINE_META` / `KANBAN_COLUMNS` / `STATUS_META` constants in team-performance.tsx — still used by the Kanban board and member pipeline stats.
- Calendar's existing metric strip (Posts this month / Scheduled / Published / Drafts / Pending Approval) — task asked for terminology update only.

## Verification
- `bun run lint` → exit 0, no errors.
- `npx tsc --noEmit` → no new errors in the 3 modified view files (only pre-existing errors in unrelated `examples/`, `mini-services/`, `skills/`, and a couple of API routes).
- Dev server: clean compile, 200 OK on `/`.

## Reference
- Worklog entry: see `/home/z/my-project/worklog.md` Task ID `content-workflow-everywhere`.
- Reference implementation: `src/components/views/dashboard.tsx` `ContentWorkflow` (line ~1139).
