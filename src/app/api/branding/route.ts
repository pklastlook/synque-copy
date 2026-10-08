import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { parseBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

/**
 * GET /api/branding — returns the white-label branding for the current
 * user's tenant.
 *
 *   - Super-admins (role=admin, customerId=null): returns the default
 *     SYNQUE branding (no tenant to look up).
 *   - Tenant users (customerId set): returns the parsed branding JSON
 *     from their Customer row. Null fields mean "use the default".
 *
 * The response shape matches `BrandingConfig` from `@/lib/branding`:
 *   { logo: string|null, primaryColor: string|null,
 *     secondaryColor: string|null, customDomain: string|null }
 *
 * This endpoint is unauthenticated-safe: it requires a valid JWT but
 * returns ONLY the branding fields (no PII, no tenant name, no DB URL).
 * The client applies the branding to the document root as CSS variables.
 */
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  if (error) return error;

  const customerId = user!.customerId;
  if (!customerId) {
    // Super-admin — no tenant branding.
    return NextResponse.json({
      logo: null,
      primaryColor: null,
      secondaryColor: null,
      customDomain: null,
    });
  }

  try {
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { branding: true },
    });
    return NextResponse.json(parseBranding(customer?.branding));
  } catch (e) {
    console.error("[/api/branding] lookup failed:", e instanceof Error ? e.message : String(e));
    // Fail soft — return default branding so the UI keeps working.
    return NextResponse.json({
      logo: null,
      primaryColor: null,
      secondaryColor: null,
      customDomain: null,
    });
  }
}
