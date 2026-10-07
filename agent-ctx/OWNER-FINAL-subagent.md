# Task ID: OWNER-FINAL — subagent worklog

## Files touched
- `src/components/views/owner.tsx` — Tasks 1, 2, 3
- `prisma/schema.prisma` — Task 4 (Payment model + Customer.payments relation)
- `src/app/api/payments/route.ts` — Task 4 (new POST + GET)
- `src/app/billing/page.tsx` — Task 4 (client-side billing page)

## Task 1 — Drop Serial Keys section
- Removed the `{ id: "keys", ... }` entry from `OWNER_SECTIONS`.
- Removed the `{tab === "keys" && <SerialKeysTab />}` render line.
- `SerialKeysTab` function left intact in the file (not deleted) — just
  unreachable from the render tree.
- Removed the "Serial Keys" tile from the Overview tab's module overview
  grid (replaced with "Tenant DBs" tile to keep the 8-tile layout balanced).
- Removed the now-unused `licenseUtilization` derived value.

## Task 2 — Report settings print layout
- Imported `getReportSettings` from `@/components/views/settings`.
- Added three module-scope helpers:
  - `getCompany()` — reads `socialflow-company` from localStorage (mirrors
    the pattern in `custom-report.tsx`).
  - `buildReportPrintCss({...})` — builds the dynamic CSS string from the
    settings (accent color, paper size, orientation, margins, table style,
    watermark). Uses a `.print-area` scope selector by default.
  - `reportFontScale(size)` — small/medium/large → 0.88 / 1 / 1.12.
- Rewrote `InvoicePrintLayout` to apply every report setting:
  - `rs.accentColor` for the header rule, header text, totals border,
    section headers.
  - `rs.showCompanyLogo` + company.logo (with `Sparkles` fallback).
  - `rs.showReportTitle` toggles the INVOICE/QUOTATION title.
  - `rs.showDateRange` toggles the due/valid date row.
  - `rs.showFooter` + `rs.customFooterText`/`rs.footerText` for the footer.
  - `rs.showPageNumbers` toggles "Page 1 of 1".
  - `rs.paperSize` + `rs.orientation` drive the `@page` size directive.
  - `rs.fontSize` scales the base font size.
  - `rs.tableStyle` (striped/bordered/minimal) drives the table CSS.
  - `rs.marginTop/marginRight/marginBottom/marginLeft` set the page padding.
  - `rs.showWatermark` + `rs.watermarkText` render a watermark overlay.
- Mirrored the same settings in `FinancialReportLayout` — added a new
  optional `reportKind` prop ("financial" | "clients" | "subscriptions")
  that drives the visible report title.

## Task 3 — Owner panel enhancements
- **OverviewTab**: added a Quick Actions row (Add Client, Generate Invoices,
  View Reports, Manage Plans) that switches the owner tab on click. Added
  a live System Status probe (`useEffect` pings `/api/finance/overview` +
  `/api/auth/me`) that drives the database/API/sessions indicators with
  "checking" → "operational" / "degraded" states.
- **ClientsTab**: added a "View details" dropdown item + a new detail
  dialog showing client info, subscription status, invoice history
  (paid/pending/overdue counts + amounts), database status, users count,
  created date, and Edit/Suspend/Delete actions. Lazy-loads invoices +
  subscriptions + users on open so the initial tab render isn't slowed.
- **SubscriptionsTab**: added a Payment Status badge on each subscription
  card (Paid / Payment due / Overdue). Driven by a new `paymentStatusFor`
  helper that prefers invoices carrying the `subscription:<id>` fingerprint
  in their notes, falling back to any invoice for the same client.
- **InvoicesTab**: already had Send / Mark Paid / Mark Overdue (verified
  the workflow Draft → Sent → Paid → Overdue is wired up).
- **QuotationsTab**: added a "Convert to invoice" dropdown item that POSTs
  the quotation's items + totals to `/api/invoices`, then marks the
  quotation as accepted. Workflow Draft → Sent → Accepted/Rejected.
- **DevicesTab**: already had the iOS-style toggle (active/blocked), a
  Revoke button that sets status to "revoked", and the activity log dialog
  (verified in earlier worklog).
- **BankAccountsTab**: already had Set Default + currency badge (verified).
- **FinanceTab**: already had batch invoice generation + payment history
  timeline + bank accounts overview (verified).
- **ReportsTab**: added a report-type selector (`Select`) with three
  options — Financial Summary / Client Revenue / Subscription Analytics —
  whose value flows through to the dialog title, the rendered
  `FinancialReportLayout` `reportKind` prop, and the report title text.
- **DatabasesTab**: already had suspend/activate/re-push schema (verified).
- **ActivityLogTab**: already had action/actor/date filtering (verified).

## Task 4 — Subscription payment flow
### Prisma schema (`prisma/schema.prisma`)
- Added `Payment` model with the fields specified in the task (id,
  subscriptionId, invoiceId, customerId, amount, currency, method,
  cardLast4, cardBrand, status, transactionId, bankAccountId, createdAt).
  Indexed by `customerId` and `subscriptionId`.
- Added `payments Payment[]` relation to the `Customer` model.
- `npx prisma validate` → "The schema at prisma/schema.prisma is valid 🚀".
- Ran `bun run db:generate` so the TS types reflect the new model.
  Did NOT run `prisma db push` (per task rules — main agent will handle it).

### API routes
- **`src/app/api/payments/route.ts`** (new):
  - **GET**: super-admins see all payments; tenant users see only their
    own. Uses the existing `tenantWhere(scope)` helper.
  - **POST**: records a payment + side effects:
    1. Validates `amount > 0`, binds `customerId` to the caller's tenant
       (super-admins can pass a body `customerId`).
    2. Resolves the owner's default bank account (customerId = null,
       isDefault = true) so the credit can be linked back to it. Falls
       back to the caller's tenant-scoped default if no global default
       exists.
    3. Creates the `Payment` row with the requested fields
       (subscriptionId, invoiceId, amount, currency, method, cardLast4,
       cardBrand, status, transactionId, bankAccountId).
    4. When `status === "completed"` and a `subscriptionId` was provided:
       - Flips the linked subscription's status to `active`.
       - Generates a paid invoice for the current billing period (same
         discount/tax math as `/api/subscriptions/[id]/generate-invoice`).
         Uses a `subscription:<id>|payment:<paymentId>` fingerprint in the
         invoice notes for dedup. Links the new invoice back to the
         payment via `invoiceId`.
    5. Audit-logs the payment via `audit(req, user.userId, "payment.created", ...)`.
    6. Returns `{ ok, id, status, amount, currency, updatedSubscription,
       invoiceId, invoiceNumber }`.

### Client page (`src/app/billing/page.tsx`, new)
- Auth-gated: if not signed in, shows a sign-in prompt + view plans link.
- Shows the caller's current plan card (with billing cycle, next billing
  date, trial countdown, breakdown).
- Shows 3 plan cards (Starter $299, Growth $499, Enterprise Custom).
  Current plan is tagged "Current". Non-current plans show
  Subscribe / Upgrade / Downgrade / Contact sales depending on the
  caller's current plan vs. the plan price.
- Payment dialog collects card name, number (auto-formatted into 4-digit
  groups), expiry (auto-formatted MM / YY), and CVC. Detects card brand
  (visa / mastercard / amex) from the card number prefix. Validates all
  fields before enabling the Pay button.
- On submit: POSTs to `/api/payments` with the card details + amount +
  generated `txn_...` transaction id. On success: shows a success state,
  toasts the invoice number, and re-fetches the subscriptions + payments
  so the page updates instantly.
- Shows a Payment history table (last 4 digits, brand, status, amount,
  timestamp, transaction id).
- Includes the standard LandingNav + LandingBg + LandingFooter chrome.

## Verification
- `npx prisma validate` → "The schema at prisma/schema.prisma is valid 🚀".
- `bun run db:generate` → Prisma Client regenerated (Payment model is
  now in the generated types).
- `bun run lint` → **0 errors, 7 warnings** (all 7 are pre-existing
  `@next/next/no-location-assign-relative-destination` warnings about
  `window.location.href` in landing-page.tsx, landing-shared.tsx,
  accounts.tsx, and settings.tsx — none of these files were touched by
  this task).
- `npx tsc --noEmit --skipLibCheck` → no errors in any of the modified
  files. Two pre-existing errors remain in unrelated files
  (`oauth/callback/[platform]/route.ts` refreshToken +
  `sync-platforms.ts` null assignment).
- Dev server NOT started (per task rules).
- `prisma db push` NOT run (per task rules — main agent will handle it).
