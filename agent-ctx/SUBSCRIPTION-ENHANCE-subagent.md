# SUBSCRIPTION-ENHANCE — Custom subscription plans + discount/tax across billing modules

**Task ID:** SUBSCRIPTION-ENHANCE
**Agent:** subagent
**Date:** 2026-10-06

## Goal

Enhance the Subscription / Invoice / Quotation billing modules with:
- Editable subscription plan + custom amount
- Discount support (percentage or fixed) across all three modules
- Tax computation that applies to the post-discount base
- Live preview of computed totals (base → discount → subtotal → tax → total)
- Display of the discount line in invoice/quotation print layout

## Files modified

### Prisma schema
- `prisma/schema.prisma` — added 8 new fields to `Subscription` (discountType, discountValue, discountAmount, taxRate, taxAmount, totalAmount, billingCycle, notes); added 3 new fields (discountType, discountValue, discountAmount) to both `Invoice` and `Quotation`. Validated with `npx prisma validate` ✅.

### Shared lib
- **NEW** `src/lib/billing.ts` — single `computeBillingTotals({ base, discountType, discountValue, taxRate })` helper used by all three API route families. Returns `{ discountAmount, taxableBase, taxAmount, total }`. Extracted here (instead of being defined inline in a route.ts) so the quotations [id] and route files can import it without Next.js's App Router `import` quirks blocking cross-route type resolution.

### API routes
- `src/app/api/subscriptions/route.ts` — POST now accepts all new fields (plan, amount, discountType, discountValue, taxRate, billingCycle, notes), normalizes discountType (only "percentage" | "fixed" | null allowed), and computes discountAmount / taxAmount / totalAmount server-side via `computeBillingTotals`. GET now returns all new fields. Default plan amounts bumped to match the UI (Starter $299, Growth $499, Enterprise/Custom $0). Exports `computeSubscriptionTotals` (thin wrapper around `computeBillingTotals`).
- `src/app/api/subscriptions/[id]/route.ts` — PATCH now accepts the full editable set (plan, amount, currency, status, startDate, endDate, trialEnds, discountType, discountValue, taxRate, billingCycle, notes) and recomputes discountAmount / taxAmount / totalAmount on every PATCH (so partial edits still land consistent totals). endDate + trialEnds accept `null` to clear.
- `src/app/api/invoices/route.ts` — POST accepts `discountType` + `discountValue`, computes discountAmount / taxAmount / total via `computeBillingTotals`. GET returns the new fields. Exports `computeDocTotals` (thin wrapper).
- `src/app/api/invoices/[id]/route.ts` — GET returns the new fields. PATCH recomputes totals when any of items / taxRate / discountType / discountValue change.
- `src/app/api/quotations/route.ts` — same as invoices.
- `src/app/api/quotations/[id]/route.ts` — same as invoices.
- `src/app/api/auth/signup/route.ts` — trial-signup auto-generated Subscription + Invoice now sets `billingCycle="monthly"`, `discountAmount=0`, `taxAmount=0`, `totalAmount=299` so the new schema columns are populated (the columns are nullable/`@default(0)` so the previous code would have worked, but explicit values keep the trial records consistent with what the UI expects).

### Owner panel UI
- `src/components/views/owner.tsx`:
  - `Invoice` / `Quotation` interfaces gained `discountType`, `discountValue`, `discountAmount` (nullable / default 0).
  - `DocForm` interface + `EMPTY_DOC` constant gained `discountType: string | null` + `discountValue: number` (defaults to None / 0).
  - `docTotals()` now computes discountAmount + applies tax to the post-discount taxable base. Returns `{ subtotal, discountAmount, taxAmount, total }`.
  - `InvoicePrintLayout` (used for both invoices and quotations print/PDF preview) now shows a discount line ("Discount (10%) −$29.90") + a "Taxable base" line when a discount was applied, so the printed invoice/quotation breaks down the math clearly.
  - `InvoicesTab` + `QuotationsTab` create dialogs both gained a new "Discount type" Select (None / Percentage / Fixed amount) + "Discount value" Input (disabled when type = None, with a hint explaining what to enter). The totals preview pane shows the discount line (green) when a discount > 0, before the Tax line.
  - `SubscriptionsTab` was completely rewritten:
    - `SubscriptionData` interface expanded with all new fields.
    - New `SubscriptionForm` type + `EMPTY_SUB_FORM` constant.
    - `computeSubTotals(form)` helper (mirrors the server-side math, used for the live preview).
    - Plan dropdown: Starter ($299/mo), Growth ($499/mo), Enterprise (Custom), Custom — picking "Custom" or "Enterprise" exposes the amount field as required.
    - Billing cycle dropdown (Monthly / Quarterly / Yearly).
    - Status dropdown (trial / active / cancelled / expired).
    - Start date / Trial ends / End date inputs (all type="date").
    - Discount type + value inputs (same pattern as invoices).
    - Tax rate input.
    - Notes textarea.
    - Live preview pane showing Base amount → Discount −X → Subtotal → Tax +X → Total.
    - New "Edit" button on each subscription row that opens the same dialog pre-populated (the Client select is disabled in edit mode so customerId can't be changed).
    - Subscription rows in the list now show: status pill, plan pill, billing cycle pill, base amount, discount (if any), tax (if any), total, start date, trial end date (if status=trial), end date (if set), and notes (truncated to 1 line).

## Verification

- `npx prisma validate` → "The schema at prisma/schema.prisma is valid 🚀"
- `bun run db:generate` (Prisma client regeneration) → "✔ Generated Prisma Client (7.10.0)"
- `bun run lint` → **0 errors, 7 warnings** (all 7 are pre-existing `@next/next/no-location-assign-relative-destination` warnings about `window.location.href` in `landing-page.tsx` (3), `landing-shared.tsx` (1), `accounts.tsx` (2), `settings.tsx` (1) — none of these files were touched by this task). Exit code 0.
- `npx tsc --noEmit -p tsconfig.json` → 2 pre-existing errors unrelated to this task (`oauth/callback/[platform]/route.ts:466` and `sync-platforms.ts:167`). All errors introduced by this task's schema change were resolved by running `prisma generate` + extracting `computeBillingTotals` into `src/lib/billing.ts`.
- Dev server NOT started (per task rules).
- `prisma db push` NOT run (per task rules — main agent will handle it).

## Notes for the main agent

- After running `bun run db:push` to materialize the schema changes, existing rows will get the new columns populated with `null` / `0` defaults. The trial-signup Subscription + Invoice rows created today already set `billingCycle="monthly"` + `totalAmount`/`discountAmount`/`taxAmount` explicitly, so they will look correct in the UI immediately. Older trial rows (created before this task) will display with the legacy `$299` total (computed from `amount` only when `totalAmount` is null) thanks to the `s.totalAmount ?? s.amount` fallback in the SubscriptionsTab row renderer.
- Plan default amounts were bumped from $29/$89 to $299/$499 (Starter/Growth) to match the task spec ("Starter $299, Growth $499"). The signup route already used $299 (STARTER_PRICE) so trial signups remain consistent.
