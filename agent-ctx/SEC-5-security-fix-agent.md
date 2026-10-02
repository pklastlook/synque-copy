# SEC-5 — security-fix-agent

## Task
Sign OAuth state + remove scheduler key fallback + httpOnly cookie.

## Files changed
1. `src/lib/oauth-state.ts` (NEW) — `signOAuthState` / `verifyOAuthState` helpers using HMAC-SHA256 over `JWT_SECRET`.
2. `src/app/api/oauth/connect/[platform]/route.ts` — sign the state with the new helper (replaces raw base64url).
3. `src/app/api/oauth/callback/[platform]/route.ts` — verify the HMAC before decoding the state; reject on tamper.
4. `src/app/api/publish/[platform]/route.ts` — removed the `REDACTED` fallback; throws at module load if `SCHEDULER_API_KEY` unset.
5. `src/lib/auth-session.ts` — `setAuthCookie`: `httpOnly: true`, `sameSite: "strict"`, `secure` in production.
6. `.env` — added `SCHEDULER_API_KEY=REDACTED_SCHEDULER_KEY` (64-char hex).

## Verification
- `bun run lint` → exit 0, zero errors.
- `dev.log` shows server still compiles cleanly; existing API routes return 200.

## Deployment note
The Railway scheduler mini-service MUST be configured with the same `SCHEDULER_API_KEY` value (sent as the `X-Scheduler-Key` header). The previous hardcoded fallback key no longer works.
