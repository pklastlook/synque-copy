# Task ID: reports-rebuild — `reports-rebuild-views-builder`

**Agent name**: views-builder (reports rebuild)
**Task**: Completely rebuild the Reports module at `/home/z/my-project/src/components/views/reports.tsx` — professional, enterprise-level reports inspired by Google Analytics / Hootsuite / Buffer.

## Prior context read
- `worklog.md` — read prior tasks (8-views-builder, 7-reports-view, enterprise-apple-redesign, accounts-credentials).
- `src/components/views/reports.tsx` (810 lines) — old version: confusing dialog-based generator with 4 steps, mock chart preview in a Dialog, hidden PrintLayout, dialog-based preview.
- `src/app/api/analytics/route.ts` — returns `{ series, perAccount, topContent, followerSeries }`. perAccount has full breakdown (likes/comments/shares/saves/posts/ownerName).
- `src/app/api/reports/route.ts` — GET list + POST create (name, type, description, config JSON, schedule).
- `src/app/api/reports/[id]/route.ts` — PATCH + DELETE.
- `src/app/api/reports/[id]/pdf/route.ts` — GET generates PDF via jsPDF + jspdf-autotable.
- `src/lib/hooks.ts` — `useApi` now sends `Authorization: Bearer <token>` from `socialflow-auth` localStorage.
- `src/lib/auth-store.ts` — persisted shape `{ state: { token, user, isAuthenticated } }` under `socialflow-auth`.
- `src/lib/platforms.tsx` — `PLATFORMS` map with `color` and `accent` per platform.
- `src/components/glass/glass-card.tsx` — `GlassCard`, `KpiCard`, `SectionTitle`.
- `src/components/glass/platform-badge.tsx` — `PlatformBadge`, `PlatformPill`.
- `src/app/globals.css` — `.liquid-pill`, `.glass`, `.glass-strong`, `.lift-hover`, `.scroll-liquid`, `.crystal-in`, `.shimmer`, `.num-display`, `.label-caps` all available.

## Design goals (from task brief)
1. Top bar: title + prominent "Create Report" button.
2. 4 large template cards (2×2 grid): Weekly Summary, Monthly Performance, Account Comparison, Team Activity — each 1-click generates + opens preview.
3. Prominent Date Range Selector: Today | 7 Days | 30 Days | 90 Days | Custom (date pickers).
4. Letter-size Report Preview: header (logo + title + range), 4 KPI cards, area chart (followers growth), bar chart (engagement breakdown), donut (platform distribution), per-account table, top-content table, footer with page number. Actions: Download PDF, Print, Share.
5. Saved Reports list: View / PDF / Delete per row.
6. Real data from `/api/analytics`. 2-click report generation for non-technical users.
7. Print: `@media print` + `@page { size: letter }`.

## Implementation notes
- Token helper `getToken()` + `authHeaders()` for non-`useApi` fetches (POST/PATCH/DELETE/PDF download).
- `useApi` already auths GETs for analytics + reports list.
- Date range state: `today` (1d), `7d`, `30d`, `90d`, `custom` (two `<input type="date">`).
- `days` derived from range; passed to `/api/analytics?days=X&accountId=all`.
- On mount: fetch reports list + analytics in parallel. If saved reports exist, set the first as `previewReport` (so user lands on a real report).
- Template Generate → POST `/api/reports` (creates saved record), set `previewReport`, set date range to template's days, analytics refetches automatically.
- "Create Report" top button → generates a default Performance Report with current range.
- "Share" → copies current URL to clipboard + toast.
- Report preview is inline (NOT a dialog) — visible on screen as a white letter-size document (max-w-[850px], bg-white text-zinc-900 always — even in dark mode — so it matches printed output).
- Print: `<style>` tag with `@media print { @page { size: letter; margin: 0 } body * { visibility: hidden } .report-document, .report-document * { visibility: visible } .report-document { position: absolute; top:0; left:0; width:100%; max-width:none; box-shadow:none; border-radius:0 } .no-print { display: none } }`.
- Engagement KPI computed as `likes+comments+shares+saves` (full breakdown, includes saves — different from API's `engagement` which excludes saves, but more honest for a report).
- Platform donut: aggregate `perAccount.followers` by platform, color from `PLATFORMS[platform].color`.
- Engagement bar chart: 4 categories (Likes/Comments/Shares/Saves), each a single colored bar.
- Saved reports list: GlassCard rows with template icon + name + type + lastGenerated + View/PDF/Delete actions.

## Lint target
`bun run lint` → 0 errors, 0 warnings for `reports.tsx`.
