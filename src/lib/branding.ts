"use client";

/**
 * SYNQUE White-Label Branding.
 *
 * Each Customer (tenant) can carry a `branding` JSON string with the
 * following shape — set by the Owner Panel → Client detail dialog:
 *
 *   {
 *     logo?: string,          // absolute URL to the tenant's logo
 *     primaryColor?: string,  // CSS color — applied as `--primary`
 *     secondaryColor?: string,// CSS color — applied as `--gold` / `--accent`
 *     customDomain?: string   // the tenant's white-label domain (display only)
 *   }
 *
 * When `branding` is null/empty or any field is missing, the platform falls
 * back to the default SYNQUE branding (defined below). Super-admins (no
 * customerId) always see the default SYNQUE branding.
 *
 * The branding JSON lives on the `Customer` row in Prisma (added in
 * REMAINING-2). It's surfaced to the client via /api/customers (for the
 * Owner Panel) and via the user's session (the auth store carries
 * `customerId` so the client can resolve branding without a separate fetch).
 */

export interface BrandingConfig {
  /** Absolute URL to the tenant's logo. Used in the sidebar header. */
  logo?: string | null;
  /** CSS color string (any valid CSS color). Applied as `--primary`. */
  primaryColor?: string | null;
  /** Secondary accent color. Applied as `--gold` (used in the logo gradient). */
  secondaryColor?: string | null;
  /** The tenant's white-label domain. Display-only — DNS is handled separately. */
  customDomain?: string | null;
}

/** Default SYNQUE branding — used when no tenant branding is set. */
export const DEFAULT_BRANDING: BrandingConfig = {
  logo: null,
  primaryColor: null,  // null = use the CSS theme's default --primary
  secondaryColor: null,
  customDomain: null,
};

/**
 * Parse the `branding` JSON string from a Customer row.
 *
 * Defensive: any parse error / wrong shape returns the default branding
 * instead of throwing — we never want a malformed branding string to crash
 * the app shell.
 */
export function parseBranding(raw: string | null | undefined): BrandingConfig {
  if (!raw) return DEFAULT_BRANDING;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_BRANDING;
    return {
      logo: typeof parsed.logo === "string" ? parsed.logo : null,
      primaryColor: typeof parsed.primaryColor === "string" ? parsed.primaryColor : null,
      secondaryColor: typeof parsed.secondaryColor === "string" ? parsed.secondaryColor : null,
      customDomain: typeof parsed.customDomain === "string" ? parsed.customDomain : null,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

/**
 * Serialize a BrandingConfig back to the JSON string format stored on
 * `Customer.branding`. Empty fields are dropped so the string stays compact.
 */
export function serializeBranding(b: BrandingConfig): string {
  const out: Record<string, string> = {};
  if (b.logo) out.logo = b.logo;
  if (b.primaryColor) out.primaryColor = b.primaryColor;
  if (b.secondaryColor) out.secondaryColor = b.secondaryColor;
  if (b.customDomain) out.customDomain = b.customDomain;
  return JSON.stringify(out);
}

// ============================================================================
// Server-side resolver — fetch the branding for a tenant straight from the DB.
//
// Used by /api/customers/[id] PATCH (to validate the payload) and by the
// /api/auth/me response (to attach branding to the user's session so the
// client can apply it without a separate fetch).
//
// The DB module is imported lazily so callers that don't need branding
// (e.g. the Owner Panel list view, which already includes the Customer
// row directly) don't pay the Prisma load cost.
// ============================================================================
export async function getTenantBranding(customerId: string | null): Promise<BrandingConfig> {
  if (!customerId) return DEFAULT_BRANDING;
  try {
    // Lazy-import to avoid pulling Prisma into eager module graph.
    const { db } = await import("@/lib/db");
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { branding: true },
    });
    return parseBranding(customer?.branding);
  } catch {
    return DEFAULT_BRANDING;
  }
}

// ============================================================================
// Client-side helpers — used by the app shell to apply branding CSS vars.
// ============================================================================

/**
 * Apply tenant branding to the document root as CSS custom properties.
 *
 * Sets:
 *   --primary     → branding.primaryColor (when set)
 *   --gold        → branding.secondaryColor (when set, used by the logo gradient)
 *
 * Both default to the existing theme values when the tenant hasn't
 * overridden them. No-op when called on the server.
 */
export function applyBrandingCssVars(branding: BrandingConfig): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (branding.primaryColor) {
    root.style.setProperty("--primary", branding.primaryColor);
  } else {
    root.style.removeProperty("--primary");
  }
  if (branding.secondaryColor) {
    root.style.setProperty("--gold", branding.secondaryColor);
  } else {
    root.style.removeProperty("--gold");
  }
}

/**
 * Hook helper: returns the BrandingConfig for the current user's tenant.
 *
 * The caller passes the current user's `customerId` and a map of
 * customerId → BrandingConfig (typically fetched by the AppShell from
 * /api/customers when the user is a super-admin, or from a lightweight
 * /api/branding endpoint for tenant users).
 *
 * Falls back to DEFAULT_BRANDING when no mapping is found.
 */
export function resolveTenantBranding(
  customerId: string | null | undefined,
  brandingMap: Record<string, BrandingConfig> | null,
): BrandingConfig {
  if (!customerId || !brandingMap) return DEFAULT_BRANDING;
  return brandingMap[customerId] ?? DEFAULT_BRANDING;
}
