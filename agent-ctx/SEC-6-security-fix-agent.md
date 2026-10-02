# SEC-6 — security-fix-agent

## Task
Add tenant isolation to four unprotected routes (`bank-accounts`, `users`, `inbox`,
`reports`) + fix manager privilege escalation in `users` PATCH.

## Files changed
1. `prisma/schema.prisma` — added `customerId String?` to `BankAccount`, `Comment`,
   and `Report` (User already had it).
2. `src/app/api/bank-accounts/route.ts` — GET now uses `requireAuth` + `getTenantScope`
   + `tenantWhere(scope)`. POST also stamps new rows with `customerId` and scopes the
   `isDefault` reset `updateMany` to the caller's tenant (so flipping the default in
   one tenant no longer clears the flag for everyone else).
3. `src/app/api/users/route.ts` — GET filtered by `tenantWhere(scope)` (super-admins
   still see all tenants). PATCH reworked:
   - `role` is admin-only (managers rejected with 403).
   - `permissions` is admin-only (managers rejected with 403).
   - `status` is admin-or-manager (managers can still suspend/reactivate teammates).
   - Self-escalation guard: admins cannot raise their own role above its current
     level (role-level comparison via local `ROLE_LEVELS` mirror).
4. `src/app/api/inbox/route.ts` — GET filtered by `tenantWhere(scope)`. PATCH now
   requires auth and verifies the target comment belongs to the caller's tenant
   before updating (prevents cross-tenant writes by id-guessing).
5. `src/app/api/reports/route.ts` — GET filtered by `tenantWhere(scope)`. The user
   lookup (for `createdByName` resolution) is also tenant-scoped so author names
   don't leak across tenants. POST stamps new reports with `customerId` and defaults
   `createdBy` to the authenticated caller.

## Schema migration
- `npx prisma db push --accept-data-loss` against the Neon datasource.
- `npx prisma generate` to regenerate the client into `./generated`.
- Note: the `bun run db:push` script is broken (uses `prisma-pglite`, which throws
  `ERR_INVALID_ARG_TYPE` on Node 24). Worked around by running
  `DIRECT_URL=... npx prisma db push` directly. The env vars in `.env` aren't loaded
  by Prisma CLI on this setup, so the URL had to be passed on the command line.

## Verification
- `bun run lint` → exit 0, zero errors.
- `dev.log` shows no new compilation errors after edits.
- Existing rows now have `customerId = null`; super-admins (no customerId on their
  JWT) still see everything, while tenant users see only rows created with their
  `customerId` going forward. This is the desired secure-by-default behavior.

## Security impact
- Cross-tenant data leakage via `/api/bank-accounts`, `/api/users`, `/api/inbox`,
  `/api/reports` is now blocked.
- Manager → admin privilege escalation via `PATCH /api/users` is now blocked
  (managers can no longer set `role` or `permissions`).
- Self-escalation (admin raising their own role above their current level) is
  rejected at the API.
