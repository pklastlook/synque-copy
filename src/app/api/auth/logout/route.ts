import { NextRequest, NextResponse } from "next/server";
import { getRawToken } from "@/lib/auth-guard";
import { revokeSessionByToken } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/**
 * Attach the `Clear-Site-Data` header to a logout response so the
 * browser purges its HTTP cache + cookies on receipt.
 *
 * This is the second half of P3-10's stale-HTML fix: the service worker
 * is bumped to `socialflow-v3` (deleting the v2 cache on next SW
 * activation), but until the new SW activates the browser would still
 * serve stale authenticated HTML from its HTTP cache. `Clear-Site-Data`
 * forces an immediate, SW-independent purge.
 *
 * `"cookies"` is included so the auth cookie is removed by the browser
 * itself in addition to the explicit `maxAge: 0` set below — belt and
 * braces for clients that ignore one or the other.
 *
 * We deliberately do NOT include `"storage"` or `"executionsContexts"`:
 *   - `"storage"` would also wipe localStorage (where the Zustand auth
 *     store is persisted) — that's redundant here because the client
 *     already clears its own store on logout, and wiping it server-side
 *     would race the client.
 *   - `"executionsContexts"` is non-standard / experimental and would
 *     terminate the SW in a way that breaks PWA installability.
 */
function applyClearSiteData(res: NextResponse) {
  res.headers.set("Clear-Site-Data", '"cache", "cookies"');
  return res;
}

/**
 * POST /api/auth/logout
 *
 * Logs the user out by revoking their current session (sets `revokedAt`
 * on the matching Session row) and clearing the auth cookie.
 *
 * Fast path: the client (auth-store.ts logout()) clears local state
 * IMMEDIATELY and fires this request as fire-and-forget. The user sees
 * the login screen without waiting for this response.
 *
 * Safe to call even if no session exists — idempotent.
 */
export async function POST(req: NextRequest) {
  // Auth is optional on logout — if the token is invalid/expired, we just
  // clear the cookie and return success.
  const token = getRawToken(req);

  if (token) {
    // Best-effort — don't let a DB error block the logout
    try {
      await revokeSessionByToken(token);
    } catch {
      // Ignore — the cookie is cleared below regardless
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0, // expires immediately
    path: "/",
  });
  return response;
}

// Also support GET for a redirect-style logout (rarely used in this app,
// but useful for the cookie-based auth flow).
export async function GET(req: NextRequest) {
  const token = getRawToken(req);
  if (token) {
    try { await revokeSessionByToken(token); } catch {}
  }

  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.set("token", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
  return response;
}
