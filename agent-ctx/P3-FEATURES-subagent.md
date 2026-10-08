# P3-FEATURES — subagent work log

Task ID: P3-FEATURES
Agent: subagent (senior full-stack developer)
Task: Data export + advanced analytics + content calendar automation

## Scope
Implement three Phase-3 feature bundles in the existing Prism Social
Next.js codebase:

1. **Data export / backup system** — 3 new CSV export API routes + 1
   verification (invoices/export already exists). Export buttons wired
   into Reports, Owner Panel → Clients, and Posts list.
2. **Advanced analytics** — 3 new analytics API routes
   (best-time, sentiment-trend, hashtag-performance) + 4 new charts in
   the AnalyticsView (best-time bar, sentiment stacked area, hashtag
   horizontal bar, follower-growth attribution annotations).
3. **Content calendar automation** — 3 new calendar automation API
   routes (bulk-import, series, auto-fill) + calendar automation
   toolbar with Smart Schedule, Auto-fill, Bulk Upload dialogs, plus a
   Series dialog wired into the Composer's ProgressToolbar.

## Files created

### Feature 1 — Export
- `src/app/api/export/posts/route.ts` — GET, `requireAuth` + tenant
  scoping, CSV with title/status/author/platform/engagement/dates.
- `src/app/api/export/analytics/route.ts` — GET, `requireAuth` + tenant
  scoping, CSV with date/followers/reach/impressions/engagement/posts.
- `src/app/api/export/clients/route.ts` — GET, `requireRole(admin)`,
  CSV with name/email/company/plan/status/lifetime-revenue.
- (Verified) `src/app/api/invoices/export/route.ts` already exists
  and is wired into the Owner Panel.

### Feature 2 — Advanced analytics
- `src/app/api/analytics/best-time/route.ts` — GET, returns
  `{ bestHours: [{ hour, posts, avgEngagement, totalEngagement }] }`
  for the last N days.
- `src/app/api/analytics/sentiment-trend/route.ts` — GET, returns
  `{ positive: [{date,count}], negative: [...], neutral: [...] }`
  joined across Comment + Mention tables.
- `src/app/api/analytics/hashtag-performance/route.ts` — GET, returns
  top-20 hashtags by engagement, sliced from PostVariant.hashtags.

### Feature 3 — Calendar automation
- `src/app/api/posts/bulk-import/route.ts` — POST, accepts
  `{ rows: [{title, caption, platform, scheduledAt}] }`, resolves
  platform → first connected account in the tenant, creates posts +
  variants in a sequential loop (capped at 500 rows).
- `src/app/api/posts/series/route.ts` — POST, accepts
  `{ caption, title?, platform, frequency: daily|weekly, duration:
  4|8|12, startDate }`, AI-generates N distinct caption variants in a
  single batched LLM call, creates N scheduled posts.
- `src/app/api/posts/auto-fill/route.ts` — POST, accepts
  `{ days, platform }`, finds empty days in the next N days, AI-generates
  distinct content ideas, creates draft posts at 10am on each empty day.

## Files modified

### Feature 1
- `src/components/views/reports.tsx` — added "Export CSV" button to the
  Reports toolbar (exports analytics CSV via `/api/export/analytics`)
  AND to the Posts list sub-toolbar (exports posts CSV via
  `/api/export/posts`). Both use `window.open(...?token=...)`.
- `src/components/views/owner.tsx` — added "Export CSV" button next to
  "Add Client" in the ClientsTab SectionHeader, exports clients CSV
  via `/api/export/clients`.

### Feature 2
- `src/components/views/analytics.tsx` — added a new
  `AdvancedAnalyticsCard` with three sub-charts (`BestTimeToPostChart`,
  `SentimentTrendChart`, `HashtagPerformanceChart`) rendered after the
  ROI calculator. Added `postsByDay` prop + follower-growth
  attribution logic to `GrowthTab` — renders vertical `ReferenceLine`
  annotations on the follower chart for any day where the day-over-day
  follower delta crossed 1.5× the average positive delta. Added a
  "Follower growth attribution" pill row below the chart that lists
  each spike with the number of posts published that day. Imported
  `ReferenceLine` from recharts and `Clock` from lucide-react.

### Feature 3
- `src/components/views/calendar.tsx` — added
  `CalendarAutomationToolbar` (mounted between ProgressToolbar and
  HelpText) with three buttons: Smart Schedule (opens
  `SmartScheduleDialog` which fetches `/api/analytics/best-time` and
  surfaces 7 next-day slots at the user's top-3 peak hours; clicking
  a slot calls `openComposer(slotIso)`), Auto-fill (POSTs to
  `/api/posts/auto-fill` with `days: 7`, shows a toast with the count
  of drafts created), and Bulk Upload (opens `BulkUploadDialog` which
  accepts a CSV file or pasted text, parses client-side with a custom
  `parseCsv` helper that handles quoted fields, validates the header,
  POSTs to `/api/posts/bulk-import`, renders a progress bar + an
  "Imported N posts successfully" success card with a per-row error
  list for failed rows). Imported `Sparkles`, `Upload`, `fmt`, and
  `DialogDescription`.
- `src/components/views/composer.tsx` — added `onCreateSeries` prop
  to `ProgressToolbar` and a "Series" button in the toolbar. Added a
  new `SeriesDialog` component (mounted after `TemplatesDialog`)
  that lets the user pick series name, platform, frequency
  (daily/weekly), duration (4/8/12 weeks), and first-occurrence
  datetime. Shows the total post count that will be created and a
  preview of the base caption. POSTs to `/api/posts/series` and
  renders an "✓ N posts created" success card. Imported
  `DialogDescription`, `Select`/`SelectContent`/`SelectItem`/
  `SelectTrigger`/`SelectValue`, and `Input` from the shadcn/ui
  component library.

## Validation
- `cd /home/z/my-project && bun run lint` → **0 errors, 7 pre-existing
  warnings** in unrelated files (`landing-page.tsx`, `landing-shared.tsx`,
  `accounts.tsx`, `settings.tsx`). No new warnings or errors introduced.
- `bunx tsc --noEmit` → 2 pre-existing errors in unrelated files
  (`src/app/api/oauth/callback/[platform]/route.ts`,
  `src/lib/sync-platforms.ts`) — files I did NOT touch. All my new code
  and all my edits to existing files type-check clean.
- Dev server NOT started (per task rules).
- `prisma db push` NOT run (no schema changes — all new features use
  existing tables).

## Notes for the main agent
- The `/api/export/posts` route emits one row per PostVariant (so a
  cross-posted post with 3 variants produces 3 CSV rows). Posts without
  variants get a single row with empty platform/engagement fields.
- The `/api/export/clients` route includes a `Lifetime Revenue (USD)`
  column computed by summing the customer's completed Payments.
- The `/api/analytics/best-time` route returns one entry per hour
  (0..23) — `avgEngagement = totalEngagement / posts`. Hours with no
  posts return `avgEngagement: 0`.
- The `/api/analytics/sentiment-trend` route joins Comment + Mention
  tables on `createdAt`/`date` and is tenant-scoped via the
  denormalised `Comment.customerId` and `ListeningQuery.customerId`
  fields.
- The `/api/analytics/hashtag-performance` route splits
  `PostVariant.hashtags` on commas/semicolons/newlines, strips leading
  `#`, lowercases, de-dupes within a variant, then aggregates by tag.
- The Smart Schedule dialog picks the user's top-3 peak hours (by
  avg engagement, posts > 0) and cycles through them across the next 7
  days — so days 1, 4, 7 use hour #1; days 2, 5 use hour #2; days 3, 6
  use hour #3.
- The Bulk Upload dialog parses CSV entirely on the client — server
  receives a pre-validated JSON `rows[]` array. This keeps server CSV
  parsing concerns minimal and lets the client surface a per-row
  progress bar.
- The Series dialog defaults to tomorrow @ 10am local time, converted
  to UTC ISO for the API. The composer caption is used as the base
  template; the AI generates N distinct rewrites in a single batched
  call.
- The Auto-fill API logs activity as `ai_generated` (not
  `post_scheduled`) since the drafts are AI-generated suggestions that
  the user must review before publishing. Status stays `"draft"` so
  the cron job doesn't auto-publish them.

## Stage Summary
All 3 Phase-3 feature bundles are implemented end-to-end. 8 new API
routes + 3 dialog components + 4 new analytics charts + 3 export
buttons + 1 calendar automation toolbar. Lint: 0 errors, 7 pre-existing
warnings. tsc: 2 pre-existing errors in unrelated files. All new code
is type-clean.
