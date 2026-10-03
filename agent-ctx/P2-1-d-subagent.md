# Task P2-1-d — IDOR sweep (admin, devices, serial-keys, api-keys, platform-credentials, oauth, quotations, invoices)

**Agent**: subagent
**Date**: 2025

## Context
Read `/home/z/my-project/worklog.md` SECURITY-DATA section (Finding 4: widespread cross-tenant IDOR / missing tenant scoping). Confirmed `getTenantScope` + `tenantWhere` helpers exist in `src/lib/auth-guard.ts:195-219`. The primitives are correct — the bug is that they are applied inconsistently.

## Scope
This task sweeps **8 directories** under `src/app/api/` and closes the IDOR pattern from SECURITY-DATA Finding 4 on each one. No business-logic changes — only auth + tenant/ownership scoping.

## Files changed (14 files)

### 1. `src/app/api/admin/route.ts` (rewrite)
- **Before**: `requireRole(req, "admin")` only — tenant admin could read every user/email across ALL tenants (the audit's headline IDOR).
- **After**: still admin-only, but every `findMany` now uses `tenantWhere(scope)` for `User`, `Account`, `Post`, `Task`, `Comment`, `Activity`. For models without a direct `customerId` (`PostVariant`, `AccountHealth`) — filtered via the owning Account relation: `{ account: { customerId: scope.customerId } }`. Super-admin (no customerId) sees all; tenant admin sees only their own tenant.

### 2. `src/app/api/devices/route.ts` (rewrite)
- **Before**: NO auth check at all; `db.device.findMany()` returned every device across every tenant.
- **After**: `requireAuth(req)` + `getTenantScope`. `Device` has no direct `customerId` — tenant scope via the `serialKey.customerId` relation filter (`{ serialKey: { customerId: scope.customerId } }`). Devices with `serialKeyId = null` are visible only to super-admins. POST: if a `serialKeyId` is provided, verifies the caller is allowed to attach it (must belong to their tenant, unless super-admin).

### 3. `src/app/api/devices/[id]/route.ts` (rewrite)
- **Before**: NO auth check; `db.device.update/delete({ where: { id } })` mutated any device by id.
- **After**: `requireAuth` + `getTenantScope` + `getVisibleDevice(id, scope)` helper that uses the relation filter; returns 404 (not 403, to avoid leaking presence) when the target device's SerialKey isn't in the caller's tenant.

### 4. `src/app/api/serial-keys/route.ts` (rewrite)
- **Before**: NO auth check; `db.serialKey.findMany()` returned all keys; POST let anyone mint a key for an arbitrary `customerId`.
- **After**: GET = `requireAuth` + `tenantWhere(scope)`. POST = `requireRole(req, "admin")`. The body `customerId` is honoured ONLY for super-admins; tenant admins can only mint keys for their own customer (`scope.customerId`).

### 5. `src/app/api/serial-keys/[id]/route.ts` (rewrite)
- **Before**: NO auth check; `update/delete` by id.
- **After**: `requireRole(req, "admin")` + `findFirst({ where: { id, ...tenantWhere(scope) }})` before any mutation. 404 if not in caller's tenant.

### 6. `src/app/api/api-keys/route.ts` (rewrite)
- **Before**: NO auth check; listed/minted API keys for everyone.
- **After**: `requireRole(req, "admin")` on both GET + POST. Note in source: the `ApiKey` Prisma model has no `userId` / `customerId` column (it's a global server-side token for the SYNQUE API itself), so per-user scoping isn't possible without a schema migration (`bun run db:push`). Admin-only is the safest minimal fix that closes the IDOR. Left a TODO comment for the deeper fix.

### 7. `src/app/api/api-keys/[id]/route.ts` (rewrite)
- **Before**: NO auth check; `update/delete` by id.
- **After**: `requireRole(req, "admin")` + `findUnique` existence check (defensive 404 instead of leaking Prisma's "record not found" error).

### 8. `src/app/api/platform-credentials/route.ts` (rewrite)
- **Before**: NO auth check; GET/PUT/DELETE accepted an arbitrary `userId` from the body/query and let any caller read or overwrite ANY user's OAuth credentials (Twitter tokens, FB page IDs, Instagram tokens — a critical secrets leak).
- **After**: `requireAuth` + a `resolveTargetUserId()` helper that enforces:
  - Non-admin (member/editor/viewer): `userId` is overridden with `req.user.userId` (own credentials only).
  - Tenant admin/manager: body `userId` is honoured ONLY if the target user belongs to the caller's tenant (`findFirst({ where: { id: requestedUserId, customerId: scope.customerId }})`).
  - Super-admin: any `userId` is allowed.
  GET/PUT/DELETE all go through `resolveTargetUserId()` so the same rule applies to read and write.

### 9. `src/app/api/platform-credentials/[platform]/sync/route.ts` (top-of-handler rewrite)
- **Before**: NO auth check; body `{ userId, accountId }` — any caller could trigger a sync that used another user's stored Twitter/IG/FB tokens to update ANY account.
- **After**: `requireAuth` + the same `resolveTargetUserId` logic (inlined, since this route is in a different file). The target Account is now fetched via `findFirst({ where: { id: accountId, ...tenantWhere(scope) }})` — super-admin sees any, tenant users see only their tenant's accounts. The body `userId` is ignored for non-admins; tenant admins must target a user in their own tenant.

### 10. `src/app/api/oauth/connect/[platform]/route.ts` (top-of-handler rewrite)
- **Before**: NO auth check; `userId` came from the query string — any caller could initiate an OAuth flow that writes tokens into another user's `PlatformCredential` row (the callback upserts on `userId_platform`).
- **After**: `requireAuth(req)` + `const userId = user.userId`. The query `userId` param is ignored entirely. The platform credential that gets used MUST be owned by the caller — an attacker cannot initiate OAuth flows against another tenant's OAuth app.

### 11. `src/app/api/oauth/check/route.ts` (rewrite)
- **Before**: NO auth check; `userId` came from the query — any caller could probe whether another user/tenant had configured their OAuth app (info leak).
- **After**: `requireAuth(req)` + `const userId = user.userId`. The query `userId` param is ignored. Only the caller's own configured-state is reported.

### 12. `src/app/api/quotations/route.ts` (rewrite)
- **Before**: NO auth check; `findMany()` returned all quotations; POST accepted a body-controlled `customerId` (a tenant-A user could mint quotations attributed to tenant-B's customer).
- **After**: GET = `requireAuth` + `tenantWhere(scope)`. POST = `requireAuth`; `customerId` is bound to `scope.customerId` — the body `customerId` is ignored unless the caller is a super-admin.

### 13. `src/app/api/quotations/[id]/route.ts` (rewrite)
- **Before**: NO auth check; `update/delete` by id.
- **After**: `requireAuth` + `findFirst({ where: { id, ...tenantWhere(scope) }})` before any mutation.

### 14. `src/app/api/invoices/route.ts` (rewrite)
- **Before**: NO auth check; body-controlled `customerId`.
- **After**: Same pattern as quotations — `requireAuth` + tenantWhere on GET, customerId bound to caller on POST (super-admin excepted).

### 15. `src/app/api/invoices/[id]/route.ts` (rewrite)
- **Before**: NO auth check; `update/delete` by id.
- **After**: `requireAuth` + `findFirst` with `tenantWhere(scope)` before any mutation.

## Pattern applied (consistent across all 14 files)

```typescript
import { requireAuth, requireRole, getTenantScope, tenantWhere } from "@/lib/auth-guard";

const { user, error } = requireAuth(req);          // or requireRole(req, "admin")
if (error) return error;
const scope = getTenantScope(user!);

// List:
db.X.findMany({ where: tenantWhere(scope) as { customerId?: string } });

// By-id mutation:
const existing = await db.X.findFirst({
  where: { id, ...tenantWhere(scope) as { customerId?: string } },
  select: { id: true },
});
if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
await db.X.update({ where: { id }, data });
```

For ownership-bound resources (`platform-credentials`, `oauth/connect`, `oauth/check`, `platform-credentials/[platform]/sync`), the body `userId` is bound to `req.user.userId` (with an admin override that still requires the target to be in the caller's tenant).

For resources whose only tenant link is through a relation (`Device → SerialKey.customerId`, `PostVariant → Account.customerId`, `AccountHealth → Account.customerId`), used Prisma relation filters: `{ serialKey: { customerId: scope.customerId } }` / `{ account: { customerId: scope.customerId } }`.

## Notes / caveats

1. **ApiKey model has no `userId` column** — `requireRole("admin")` is the safest minimal fix without a schema migration. A deeper fix would add `userId String?` to ApiKey in `prisma/schema.prisma` and run `bun run db:push`; that's left as a TODO in source.

2. **`platform-credentials/[id]/route.ts` does not exist** — only `[platform]/sync/route.ts` exists. Both got the same auth + ownership scoping (the sync route is also covered).

3. **`oauth/callback/[platform]/route.ts`** was NOT in scope, but benefits from the connect-route fix: the HMAC-signed state now always carries the caller's `userId`, so the callback can only write tokens into the caller's own `PlatformCredential` row. No further callback-side fix needed.

4. **Lint**: `bun run lint` passes clean (no errors, no warnings).

5. **No business logic changed** — every route's response shape, error messages, and field selection are unchanged. Only auth checks + tenant/ownership `where` clauses were added.

## Verification
- `bun run lint` — clean (no errors, no warnings).
- No dev server, no DB commands run (per task rules).
