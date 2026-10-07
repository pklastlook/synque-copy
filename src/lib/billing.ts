/**
 * Shared billing helpers used by the Subscriptions, Invoice, and Quotation
 * API routes. Extracted here (instead of being defined inline in a route.ts)
 * so both `/api/invoices` and `/api/quotations` can reuse the same logic
 * without one route importing from another (which TypeScript in the Next.js
 * App Router doesn't always resolve cleanly).
 */

export interface DiscountInput {
  /** The pre-discount base — subtotal for invoices/quotations, `amount` for subscriptions. */
  base: number;
  /** "percentage" | "fixed" | null (null = no discount applied). */
  discountType?: string | null;
  /** The percentage value (when percentage) OR the flat amount (when fixed). */
  discountValue?: number | null;
  /** Tax percentage (e.g. 10 = 10%). */
  taxRate?: number;
}

/**
 * Compute the discount + tax totals for a subscription, invoice, or quotation.
 *
 * - discountAmount = percentage ? base * discountValue / 100 : discountValue
 * - taxableBase    = max(base - discountAmount, 0)
 * - taxAmount      = taxableBase * taxRate / 100
 * - total          = max(base - discountAmount + taxAmount, 0)
 *
 * The intermediate tax computation rounds to 2 decimal places to avoid
 * float drift (mirrors the legacy `Math.round(subtotal * rate) / 100` math
 * that previously lived in each API route).
 */
export function computeBillingTotals(opts: DiscountInput): {
  discountAmount: number;
  taxableBase: number;
  taxAmount: number;
  total: number;
} {
  const base = Number.isFinite(opts.base) ? opts.base : 0;
  const dType = opts.discountType ?? null;
  const dVal = Number.isFinite(opts.discountValue as number)
    ? (opts.discountValue as number)
    : 0;
  const taxRate = Number.isFinite(opts.taxRate as number)
    ? (opts.taxRate as number)
    : 0;

  let discountAmount = 0;
  if (dType === "percentage") {
    discountAmount = Math.round(base * dVal) / 100;
  } else if (dType === "fixed") {
    // Cap a fixed discount at the base amount so totals can never go negative.
    discountAmount = Math.min(dVal, base);
  }
  const taxableBase = Math.max(base - discountAmount, 0);
  const taxAmount = Math.round(taxableBase * taxRate) / 100;
  const total = Math.max(base - discountAmount + taxAmount, 0);
  return { discountAmount, taxableBase, taxAmount, total };
}
