# P2-1-a — IDOR sweep on posts / inbox / comments routes

## Context
- Read `/home/z/my-project/worklog.md` — reviewed SECURITY-DATA (Finding 4/5 cross-tenant IDOR list, esp. lines 10562+ and 10616 for `/api/inbox/[id]`), SECURITY-AUTH (lines 9776+), and the P1-2-b fix on `/api/team/[id]` (lines 11367+).
- Read `/home/z/my-project/src/lib/auth-guard.ts` — confirmed `requireAuth`, `getTenantScope`, `tenantWhere` helpers (lines 72, 195, 211).
- Read `/home/z/my-project/src/app/api/team/[id]/route.ts` as the reference pattern for `findFirst({ where: { id, ...tenantWhere(scope) }})` + 404-on-cross-tenant.
- Read `/home/z/my-project/src/app/api/inbox/route.ts` as the already-fixed sibling (PATCH uses `findFirst + tenantWhere` + 404).

## Schema notes (prisma/schema.prisma)
- `Post.customerId String?` (line 150) — nullable, indexed.
- `Comment.customerId String?` (line 205) — nullable, indexed (denormalised from owning Account).
- `PostVariant` — NO `customerId` column (children of Post; tenant-scoping is inherited via the parent Post).

## Files changed

### `src/app/api/posts/[id]/route.ts`
**Before:** PATCH and DELETE had NO `requireAuth`, NO tenant check. Called `db.post.update({ where: { id }})` and `db.post.delete({ where: { id }})` directly — any authenticated user (any tenant) could mutate / delete any post by ID.

**After:**
- Both PATCH and DELETE call `requireAuth(req)` → 401 if no JWT.
- Both call `getTenantScope(user)` then `db.post.findFirst({ where: { id, ...tenantWhere(scope) }, select: { id: true }})`. If null → return **404** (not 403 — avoids confirming resource existence to a cross-tenant attacker).
- For PATCH, the findFirst guard runs BEFORE the variants-sync block. Because variants are scoped via `postId: id` and the parent post has been verified tenant-owned, the inner `postVariant.findMany`/`update`/`create` are implicitly tenant-safe — no business-logic change required.
- For DELETE, the findFirst guard runs before `postVariant.deleteMany` + `post.delete`.
- No business logic touched — only auth + tenant scoping added.

### `src/app/api/inbox/[id]/route.ts`
**Before:** PATCH and DELETE had NO `requireAuth`, NO tenant check. Called `db.comment.update({ where: { id }})` and `db.comment.delete({ where: { id }})` directly — any authenticated user could mutate / delete any comment by ID. (SECURITY-DATA Finding 5 specifically called out this route at lines 10616+.)

**After:**
- Both PATCH and DELETE call `requireAuth(req)` → 401 if no JWT.
- Both call `db.comment.findFirst({ where: { id, ...tenantWhere(scope) }, select: { id: true }})`. If null → **404**.
- Mirrors the already-fixed `PATCH /api/inbox` (the body-route sibling at `src/app/api/inbox/route.ts:47-53`).

### `src/app/api/posts/route.ts`
**Before:** GET had no auth, no tenant filter on `db.post.findMany`. POST had no auth, did not stamp `customerId` on new posts.

**After:**
- GET: added `requireAuth` + `getTenantScope`. Wrapped the existing `where` (status/authorId filters) inside `tenantWhere(scope, {...})`. Tenant users see only their own tenant's posts; super-admins see all. Existing status/authorId filtering preserved.
- POST: added `requireAuth` + `getTenantScope`. New posts are stamped with `customerId: postCustomerId` where `postCustomerId = scope.isSuperAdmin ? null : scope.customerId`. Mirrors the P1-2-b `POST /api/team` pattern (lines 113-116 of `src/app/api/team/route.ts`).

## Files audited but NOT changed
- `src/app/api/comments/[id]/route.ts` — does NOT exist. Only `src/app/api/comments/classify/route.ts` exists under `/api/comments/`, and it already calls `requireAuth(req)`. The classify route lacks tenant scoping on its `accountId` filter (any logged-in user can pass any accountId), but that was explicitly out of scope for this task (task spec named only `comments/[id]/route.ts`). Flagging for a follow-up task.

## Verification
- `cd /home/z/my-project && bun run lint` → exit code 0, no errors, no warnings.
- No database commands run, dev server not touched.

## Patterns applied (consistent with P1-2-b)
1. `requireAuth(req)` at top of every handler → 401 if no JWT.
2. `getTenantScope(user)` + `findFirst({ where: { id, ...tenantWhere(scope) }})` for any `findUnique`/`update`/`delete` by `id`.
3. Cross-tenant miss → 404 (not 403) to avoid confirming resource existence.
4. List endpoints (`findMany`) → `tenantWhere(scope, { existing filters })`.
5. Create endpoints → stamp `customerId: scope.isSuperAdmin ? null : scope.customerId`.
