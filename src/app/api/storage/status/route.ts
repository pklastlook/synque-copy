import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { getStatus } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** GET /api/storage/status — active storage provider + connection status.
 *  Used by the Settings → Integrations UI to show whether Cloudinary is
 *  properly configured (either via DB/Settings UI or via .env). */
export async function GET(req: NextRequest) {
  const { error } = requireAuth(req);
  if (error) return error;

  return NextResponse.json(await getStatus());
}
