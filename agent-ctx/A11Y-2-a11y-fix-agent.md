# A11Y-2 — a11y-fix-agent

## Task
Add ARIA semantics (aria-label, role, sr-only, alt) to three SYNQUE view files that previously had ZERO accessibility attributes:

1. `src/components/views/mail.tsx` (~1203 lines)
2. `src/components/views/influencers.tsx` (~808 lines)
3. `src/components/views/platform-settings/platform-api-section.tsx` (~419 lines)

## Approach
For each file I followed the task spec:
- **Tables**: `<Table>` got `aria-label`; every `<TableHead>` got `scope="col"`; first `<TableCell>` per row got `scope="row"`.
- **Tabs** (custom button strips): container → `role="tablist" aria-label`; each button → `role="tab" aria-selected={bool}`; icon-only tabs get `aria-label`.
- **Charts**: none of the three files actually use recharts (`<AreaChart>`, `<BarChart>`, `<LineChart>`) — they use the project's own `MetricRow` / `Pill` / `Sparkline`-style components from `dense-ui.tsx`. Skipped chart wrapper work since there were no chart wrappers to wrap. The storage usage progress bar in `mail.tsx` `ServerSummary` was upgraded to `role="progressbar" aria-valuenow/min/max`.
- **Icon-only buttons**: every icon-only button got a descriptive `aria-label` (Edit / Remove / Compose / Reply / Star / Delete / Test / Save / Sync / view-profile anchors). Decorative icons inside text-bearing buttons were marked `aria-hidden="true"`.
- **Live counts**: server status pills, mailbox unread badge, folder count badge, filter pill count badge, status banners (connected / not connected), search results container, storage usage span → `role="status"` and/or `aria-live="polite"`.
- **Data lists**: every dynamic list container → `role="list" aria-label`, each item → `role="listitem"`. `ListRow` from `dense-ui.tsx` spreads `...props` onto the underlying div, so `role="listitem"` was passed directly as a prop. `NavCard` does NOT spread props — for that I wrapped the existing `<div key={s.id}>` container with `role="listitem"` instead.

## Files modified
- `/home/z/my-project/src/components/views/mail.tsx` — 4 edit operations covering: top toolbar icons (aria-hidden), mail header (status pill + compose button + spinner), sidebar (servers/mailboxes lists + unread badge + provisioning spinner), message list (folder tabs + tablist + tablist count badges + messages list + decorative icons), detail panel action buttons (Reply/Star/Delete aria-labels), ServerSummary (Test button + IMAP/SMTP/Storage list rows + storage progressbar + Provision button).
- `/home/z/my-project/src/components/views/influencers.tsx` — 4 edit operations: search results list (role=list/listitem + aria-live + button aria-labels + icon aria-hidden), status filter pill tablist + count badge, main `<Table>` (aria-label + scope=col on 10 headers + scope=row on first cell + Edit/Remove icon buttons aria-label), Top performers list (role=list/listitem + decorative rank badge/icon aria-hidden).
- `/home/z/my-project/src/components/views/platform-settings/platform-api-section.tsx` — 4 edit operations: platform selector tab strip (tablist + tab + aria-selected + icon aria-hidden), connected/not-connected status banners (role=status + aria-live + icon aria-hidden), action buttons (aria-labels + icon aria-hidden), SyncAccountsSection list (role=list/listitem + button aria-labels + icon aria-hidden).

## Constraints honoured
- No visual behaviour changed — only ARIA attributes added; no classes, props, or logic removed.
- No existing code removed — only additive changes.
- Focused on the most impactful elements: tables, tablists, lists, icon-only buttons, live regions.

## Validation
- `bun run lint` → exit code 0 (zero errors / warnings).
- Dev server log shows continued 200 responses on `/` and downstream API routes.

## Files NOT touched
- No other view files were modified.
- No new files created.
- No CSS / styling changes.
