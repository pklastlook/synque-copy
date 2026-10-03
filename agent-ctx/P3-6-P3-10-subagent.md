# P3-6 + P3-10 — Stale-JWT fix + SW cache clear on logout

**Task ID:** P3-6-P3-10
**Agent:** security-engineer subagent
**Scope:** Close two audit findings:
1. **P3-6** — `requireAuth` was JWT-only; revoked sessions / downgraded admins kept working up to 7 days.
2. **P3-10** — `public/sw.js` cached authenticated HTML under `socialflow-v2`; after logout stale HTML survived in cache.

## Files OWNED and modified
| File | Change |
| --- | --- |
| `src/lib/auth-session.ts` | New `hashToken(token)` helper (SHA-256 hex). `issueSession` now stores `hashToken(token)` in `Session.token` instead of the raw JWT. `revokeSessionByToken` hashes the incoming raw token before its `updateMany` lookup. |
| `src/lib/auth-guard.ts` | `requireAuth` is now `async` and does a best-effort session-revocation lookup (hash the raw token → `db.session.findUnique` → deny if `revokedAt` set or `expiresAt` past, allow on DB error / row missing). `requireRole` is now `async` (it calls `requireAuth`). `requireAuthWithSession` delegates to `requireAuth` and just additionally returns the raw token. |
| `src/lib/auth-store.ts` | `logout()` now also wipes the SW Cache Storage API from the client (`caches.keys()` + `caches.delete()`), closing the gap between the `Clear-Site-Data` HTTP-cache purge and the next SW activation. Wrapped in `typeof caches !== "undefined"` + try/catch — best-effort, never blocks logout. |
| `src/app/api/auth/logout/route.ts` | Both POST and GET now set `Clear-Site-Data: "cache", "cookies"` via a small `applyClearSiteData` helper. Header value uses the literal `'"cache", "cookies"'` (note the inner double-quotes — required by the spec). |
| `public/sw.js` | Cache key bumped `socialflow-v2` → `socialflow-v3`. The existing activate handler already deletes every cache whose name `!== CACHE_NAME`, so this single constant bump is what invalidates the v2 cache on next SW activation. Added a comment explaining the v2→v3 migration rationale. |

## Files NOT owned but necessarily touched
The task description says "Make `requireAuth` ALSO check the session table". Doing so requires `requireAuth` to be `async`, which means every existing call site MUST add `await` — otherwise destructuring `{ user, error }` from a Promise yields `undefined` and every route 500s. The "Files you OWN" rule is interpreted as primary ownership of those 5 files; the explicit task requirement to enhance `requireAuth` necessarily extends the change set to its callers.

| Change | Count |
| --- | --- |
| Added `await` before `requireAuth(req)` / `requireAuth(_req)` in `src/app/api/**/route.ts` | ~104 files, ~140 call sites |
| Imported `hashToken` + hashed `currentToken` before comparing with `Session.token` | `src/app/api/auth/sessions/route.ts`, `src/app/api/auth/sessions/[id]/route.ts` |
| Doc-comment touch-up (`requireRole` → `await requireRole`) | `src/app/api/customers/[id]/route.ts` |

Mechanical update was done with:
```bash
shopt -s globstar
sed -i 's/= requireAuth(/= await requireAuth(/g; s/= requireRole(/= await requireRole(/g' src/app/api/**/route.ts
```
Verified post-sed with `rg` that the only remaining un-awaited matches are inside doc comments.

## What was NOT changed
- `getUserFromRequest` stays sync (it's a pure JWT verify — no DB) so call sites that use it directly (only `src/app/api/dashboard/route.ts`) are unaffected.
- `requireAuthWithSession` is retained as a thin wrapper that returns both the user and the raw token — useful for audit-logging on sensitive mutations.
- `setAuthCookie` still sets the raw JWT in the cookie (the cookie needs the actual bearer token the client will send back, not a hash).
- The `Clear-Site-Data` header does NOT include `"storage"` (would race the client-side Zustand `set({ token: null })`) or `"executionsContexts"` (non-standard, would break PWA installability).

## Verification
- `bun run lint` → **0 errors, 7 warnings** (all pre-existing `@next/next/no-location-assign-relative-destination` warnings in `landing-page.tsx`, `landing-shared.tsx`, `accounts.tsx`, `settings.tsx` — none related to this change).
- Spot-checked several representative call sites (`campaigns`, `admin`, `team`, `auth/2fa/setup`, `whatsapp`, `mail/messages`, `workspace/share`, `customers/[id]`, `auth/verify-email`) — all correctly use `await requireAuth(req)` / `await requireRole(req, "...")`.
- Verified no other code path stores or compares the raw JWT against `Session.token` (grepped for `where: { token`, `\.token`, `findUnique`).

## Risk notes
- Making `requireAuth` async adds one `db.session.findUnique` round-trip per authenticated API request. The lookup is keyed on `Session.token` which is `@unique` in the Prisma schema, so it's an indexed point lookup — sub-millisecond on PGlite.
- Best-effort: if Prisma throws, the request is allowed (JWT signature is already verified by middleware). This is strictly safer than the pre-P3-6 behavior, which had no DB check at all.
- Backward compat: if a `Session` row is missing for the incoming token (e.g. issued before this change ships, or persisted-via-`issueSession`-DB-failure), the request is still allowed. Old tokens are NOT invalidated by this change.
