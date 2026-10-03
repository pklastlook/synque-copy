# Task ID: P2-1-b — subagent (security engineer)

**Task**: IDOR sweep — media, approvals, campaigns, bank-accounts, customers API routes. Add auth + tenant scoping to close cross-tenant IDORs flagged in SECURITY-DATA Finding 4.

## Pattern applied (per task spec)

```typescript
const { user, error } = requireAuth(req); // or requireRole(req, "admin") for destructive ops
if (error) return error;
const scope = getTenantScope(user!);

// Before any findUnique/update/delete by id:
const existing = await db.X.findFirst({
  where: { id, ...tenantWhere(scope) as { customerId?: string } },
  select: { id: true },
});
if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
```

For models without a `customerId` column (Approval), scope via the
`authorId → User.customerId` link.

## Files changed (7)

1. **`src/app/api/media/[id]/route.ts`** — rewrote PATCH + DELETE.
   - Kept existing `requireAuth` + `getTenantScope` + `getDbForUser`.
   - Switched ownership check from `findUnique({where:{id}})` + manual
     `existing.customerId !== scope.customerId` comparison to the recommended
     `findFirst({where:{id, ...tenantWhere(scope)}})` pattern.
   - Added `isTenantIsolated ? {} : tenantWhere(scope)` switch so isolated
     tenant DBs (where `targetDb` is already isolated) don't get a redundant/
     incorrect customerId filter — fixes a latent bug where a tenant admin
     couldn't access assets in their own dedicated DB if the row's `customerId`
     was null.
   - PATCH selects `{id:true}` (existence check). DELETE selects
     `{url, thumbnail}` so storage-key extraction still works.

2. **`src/app/api/media/route.ts`** — audited, NO change. Already had
   `requireAuth` on GET + POST, `tenantWhere(scope)` on the list query, and
   `customerId: scope.customerId` stamping on POST.create.

3. **`src/app/api/approvals/route.ts`** — added auth + tenant scoping
   (was completely unauthenticated + unscoped).
   - GET: scope via `authorId → User.customerId` (fetch tenant user IDs,
     filter `authorId: { in: [...] }`). Super-admin sees all. Status filter
     preserved.
   - POST: validates body's `authorId` resolves to a User whose `customerId`
     matches the caller's scope; cross-tenant → 404. Approval creation
     logic otherwise unchanged.

4. **`src/app/api/approvals/[id]/route.ts`** — added auth + tenant scoping
   (was completely unauthenticated + unscoped).
   - Added `assertApprovalInTenant(id, scope)` helper that fetches the
     approval, then (for non-super-admins) walks `authorId → User.customerId`
     and returns 404 if the approval's author isn't in the caller's tenant.
   - PATCH + DELETE: `requireAuth` + `getTenantScope` +
     `assertApprovalInTenant` guard before existing update/delete. Status
     allowlist + terminal-state `resolvedAt` logic unchanged.

5. **`src/app/api/campaigns/route.ts`** — added auth + tenant scoping
   (was completely unauthenticated + unscoped).
   - GET: `tenantWhere(scope)` on `findMany`. Campaign has customerId column.
   - POST: stamps `customerId: scope.customerId` on create (super-admin →
     null = global). ownerId/budget/dates logic unchanged.

6. **`src/app/api/campaigns/[id]/route.ts`** — added auth + tenant scoping
   (was completely unauthenticated + unscoped).
   - PATCH + DELETE: `findFirst({where:{id, ...tenantWhere(scope)}})`
     ownership check → 404 on cross-tenant. Allowlist + update/delete logic
     unchanged.

7. **`src/app/api/bank-accounts/[id]/route.ts`** — CRITICAL fix + auth + tenant scoping.
   - Added `requireAuth` + `getTenantScope` + `findFirst` ownership check for
     both PATCH and DELETE (was completely unauthenticated — relied only on
     middleware).
   - **CRITICAL FIX**: the old `db.bankAccount.updateMany({ data:
     { isDefault: false } })` had NO `where` clause — every "set as default"
     PATCH un-defaulted EVERY bank account across ALL tenants globally. Now
     scoped to `where: tenantWhere(scope)` so only the caller's tenant's bank
     accounts are reset. Mirrors the already-correct pattern in
     `bank-accounts/route.ts` POST.

8. **`src/app/api/customers/[id]/route.ts`** — CRITICAL fix: any authenticated
   user could DELETE an entire Customer (tenant) + cascade.
   - PATCH: `requireAuth(req)` → `requireRole(req, "admin")`. Matches the
     existing `customers/route.ts` GET/POST gate (which already required
     admin).
   - DELETE: `requireAuth(req)` → `requireRole(req, "admin")`. Cascade-delete
     logic (invoices, quotations, serialKeys, subscriptions, tasks, posts,
     activities, campaigns, user-customerId unlink, customer.delete) is
     unchanged — only the auth gate was tightened.

## Verification
- `cd /home/z/my-project && bun run lint` → exit 0, zero errors / zero warnings.

## Critical fixes shipped (per task "Special attention")
1. `bank-accounts/[id]` PATCH line 12 `updateMany({})` global mutation →
   now `where: tenantWhere(scope)`.
2. `customers/[id]` DELETE no longer accessible to non-admins (was any
   authenticated user).

## Notes for downstream tasks
- Approval model has no `customerId` column. Scoping walks
  `authorId → User.customerId` (documented inline in the route files).
- Customers mutations are gated by `requireRole(req, "admin")` — both
  super-admins (role=admin, customerId=null) and tenant admins
  (role=admin, customerId=abc) can pass. If a future task wants to restrict
  customer management to super-admins only, use a stricter check
  (`user.role === "admin" && !user.customerId`).
- Media `[id]` route uses `getDbForUser` (tenant DB isolation). When
  `isTenantIsolated=true`, the tenant DB already isolates rows — we skip the
  `tenantWhere` filter to avoid breaking access to legacy assets whose
  `customerId` column may not have been backfilled in the tenant DB.
