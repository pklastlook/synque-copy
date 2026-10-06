# OWNER-FIXES — Auto-fetch client details in invoices/quotations + device toggle + print reports

## Task ID: OWNER-FIXES
## Agent: subagent

### Goal
Fix four issues in the Owner Panel: (1) invoices should auto-fetch client + subscription
details when a client is selected, (2) quotations should do the same, (3) the Devices tab
should show ALL devices (cross-tenant) with client + user info and use an iOS-style toggle
for active/blocked, and (4) the Reports tab should have a print-ready financial summary
report dialog with Print + Download CSV buttons.

### Work Log

**Issue 1 — InvoicesTab auto-fetch (`src/components/views/owner.tsx`)**
- Added `useApi<SubscriptionData[]>("/api/subscriptions")` so the tab has access to every
  client's subscription data.
- Added a `React.useEffect` watching `form.customerId`. When the user picks a client:
  - Looks up the customer in the `customers` prop (already passed in by `OwnerView`).
  - Looks up the client's subscription, preferring `active`, then `trial`, then any.
  - If a subscription exists, auto-fills:
    - `items[0].description` = `"{Plan} Plan — {Billing Cycle}"`
    - `items[0].price` / `amount` = `subscription.totalAmount` (falls back to `amount`)
    - `taxRate` = `subscription.taxRate ?? 0`
    - `discountType` = `subscription.discountType ?? null`
    - `discountValue` = `subscription.discountValue ?? 0`
  - If no subscription exists, items are left empty for manual entry.
- Added a "Bill To" preview card below the client dropdown that shows the auto-filled
  customer details (name, email, company, address, city, country, phone) plus a small
  footer indicating whether a linked subscription was found.

**Issue 2 — QuotationsTab auto-fetch (`src/components/views/owner.tsx`)**
- Mirrored the InvoicesTab implementation: added the subscriptions fetch + useEffect and
  the same "Bill To" preview card.
- The auto-filled line-item description is suffixed with " (suggested)" to signal that
  the owner can edit it (since quotations are proposals, not invoices).

**Issue 3A — Devices API (`src/app/api/devices/route.ts`)**
- Switched from `requireAuth` + `getTenantScope` to `requireRole(req, "admin")` so only
  admins can read/write devices.
- The GET response now includes, for each device:
  - `customerId`, `customerName`, `customerEmail` (via `serialKey.customer`)
  - `userName`, `userEmail` (the most recently active user belonging to that client's
    tenant — pre-fetched as a `Map<customerId, {name, email}>` to avoid N+1 queries)
  - `serialKey: { key, status }` (already present, unchanged)
- Devices without a serial key return null for customer/user fields.
- The PATCH + DELETE routes in `src/app/api/devices/[id]/route.ts` were also switched to
  `requireRole(req, "admin")` and simplified (no more tenant scoping, since admin-only).

**Issue 3B — DevicesTab toggle (`src/components/views/owner.tsx`)**
- Extended the `DeviceData` interface to include `customerId`, `customerEmail`,
  `userName`, `userEmail`.
- Added a `togglingId` state to track which device is currently being toggled.
- Replaced the "Block" / "Unblock" buttons with an iOS-style toggle switch that uses the
  same `translate-x-4` / `translate-x-0.5` pattern as the existing database-creation
  toggle in `ClientsTab`:
  - Active = green toggle (on, `bg-emerald-500`)
  - Blocked = gray toggle (off, `bg-muted-foreground/30`)
  - Clicking the toggle calls PATCH `/api/devices/[id]` with the new status
  - A `Loader2` spinner overlays the toggle while the request is in flight
  - The toggle is disabled when the device is `revoked` (use the Revoke button instead)
- Added the user name + email row to the device card metadata.
- Added a "Key: {status}" row showing the serial key's activation status.

**Issue 4 — Reports print-ready dialog (`src/components/views/owner.tsx`)**
- Added a `reportOpen` + `reportDoc` state pair.
- Added a "Generate Report" button next to the existing "Export CSV" button at the top
  of the ReportsTab header.
- Added a `FinancialReportLayout` component (defined in owner.tsx, no new file) that
  renders a print-ready report with the `.print-area` class. The layout includes:
  - SYNQUE logo/header (same visual language as `InvoicePrintLayout`)
  - Report title "Financial Summary Report" + a `RPT-YYYYMMDD` ID
  - Date range + generated timestamp
  - SYNQUE HQ company info (100 Market Street, San Francisco, CA 94105, billing@synque.cloud)
  - Executive Summary KPI grid (MRR, ARR, Total Revenue, Pending, Overdue)
  - Secondary KPI row (Total Clients, Active, Trial, Total Invoices)
  - Revenue Breakdown by Plan table (plan, paid revenue, share %, share bar, total)
  - Top 10 Clients by Revenue table (rank, name + plan + status, invoices, revenue, last invoice)
  - Invoice Summary cards (Total / Paid / Pending / Overdue — count + amount)
  - Invoice Status breakdown table (status, count, total — with totals row)
  - Footer with generated date + report ID
- The Dialog shows the same layout as a preview, plus three footer buttons:
  - "Close" (dismiss)
  - "Download CSV" (calls the existing `exportCsv` function)
  - "Print" (closes the dialog and renders `FinancialReportLayout` as a top-level
    sibling with `.print-area` class — then triggers `window.print()` after 80ms.
    After the `afterprint` event fires, the layout is unmounted.)
- Used the same `<style>` + `InvoicePrintLayout` pattern that the existing invoice/quotation
  print uses, so the global `@media print` rules in `globals.css` (which hide
  `body > *:not(.print-area)`) properly isolate the report during printing.
- Added a `React.useEffect` that drives the print cycle (set timeout → call
  `window.print()` → listen for `afterprint` → clear state). Hook is declared BEFORE
  the loading-state early return so React's rules-of-hooks invariant holds.

### Files Modified
- `src/app/api/devices/route.ts` (Issue 3A — admin-only + client/user join)
- `src/app/api/devices/[id]/route.ts` (Issue 3A — admin-only mutation)
- `src/components/views/owner.tsx` (Issues 1, 2, 3B, 4 — all frontend changes)

### Verification
- `bun run lint` → 0 errors, 7 warnings (all pre-existing
  `window.location.href` warnings in landing-page.tsx, landing-shared.tsx,
  accounts.tsx, settings.tsx — none in owner.tsx or the modified API routes).
- `npx tsc --noEmit --skipLibCheck` → no errors in any of the modified files
  (the only TS errors reported are pre-existing ones in
  `src/app/api/oauth/callback/[platform]/route.ts` and `src/lib/sync-platforms.ts`,
  neither of which was touched by this task).

### Stage Summary
All four owner-panel issues are now fixed end-to-end. Creating an invoice or quotation
no longer requires re-typing client details — picking a client in the dropdown
auto-populates the Bill To section and (when the client has a subscription) auto-fills
the suggested line item, tax rate, and discount from the subscription's stored values.
The Devices tab now correctly shows every device across every client (including ones
activated by end users on their own machines) with the operator's name + email joined
in, and uses a polished iOS-style toggle (green when active, gray when blocked, with
a spinner while the PATCH is in flight) instead of two separate Block/Unblock buttons.
The Reports tab gains a "Generate Report" button that opens a print-ready dialog with
a formatted Financial Summary Report (header, KPIs, revenue-by-plan, top-10 clients,
invoice summary, footer) — clicking Print triggers `window.print()` which the global
`@media print` CSS isolates so only the report prints; clicking Download CSV dumps the
raw invoice + customer data as before.
