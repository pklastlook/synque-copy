# Task P3-3-a-b — AuditLog table + instrumentation

**Agent:** subagent
**Scope:** Add `AuditLog` Prisma model + create `src/lib/audit.ts` helper + instrument 5 route files (6 audit points).
**Constraint:** Only add the `import { audit }` line and the `audit()` call to route files — do NOT change any existing logic. Only add the `AuditLog` model to `prisma/schema.prisma` — do NOT touch any other model.

## Files changed

| File | Change |
|---|---|
| `prisma/schema.prisma` | Appended `model AuditLog { ... }` at the end. Fields: `id`, `actorId?`, `action`, `targetType?`, `targetId?`, `metadata?` (JSON string), `ip?`, `createdAt`. Indexes on `[actorId]`, `[action]`, `[createdAt]`. |
| `src/lib/audit.ts` | NEW. Best-effort `audit(req, actorId, action, opts)` helper. Extracts IP from `x-forwarded-for` (first hop) or `x-real-ip`. Persists to `db.auditLog.create`. Wraps everything in try/catch and logs via `console.error` — never throws. |
| `src/app/api/auth/login/route.ts` | Added `import { audit } from "@/lib/audit"`. After `setAuthCookie(response, token)` and before `return response` (non-2FA path only): `await audit(req, user.id, "user.login")`. |
| `src/app/api/auth/2fa/disable/route.ts` | Added import. After `db.user.update` clears `totpSecret`/`twoFactorEnabled`: `await audit(req, userId, "2fa.disabled")`. |
| `src/app/api/team/[id]/route.ts` | Added import. PATCH: after `db.user.update`, conditional on `data.role` being set → `audit(req, user.userId, "user.role_changed", { targetType: "user", targetId: id, metadata: { role: data.role } })`. DELETE: right before `db.user.delete` → `audit(req, user.userId, "user.deleted", { targetType: "user", targetId: id })`. |
| `src/app/api/users/route.ts` | Added import. After successful `db.user.update` (PATCH), conditional on `typeof password === "string"` → `audit(req, user.userId, "user.password_changed", { targetType: "user", targetId: id })`. |
| `src/app/api/customers/[id]/route.ts` | Added import. In DELETE handler: captured `user` from `requireRole(req, "admin")` (was previously dropped — minimal mechanical addition needed so the audit call can reference `user.userId`). Right before `db.customer.delete`: `audit(req, user.userId, "customer.deleted", { targetType: "customer", targetId: id })`. |

## Audit events emitted

| Action name | When | Actor | Target |
|---|---|---|---|
| `user.login` | successful non-2FA login | `user.id` (DB row id) | — |
| `2fa.disabled` | after `totpSecret` cleared | `userId` | — |
| `user.role_changed` | after `db.user.update` if `data.role` set | `user.userId` (from JWT) | `user` / `id` |
| `user.deleted` | right before `db.user.delete` | `user.userId` | `user` / `id` |
| `user.password_changed` | after `db.user.update` if `password` provided | `user.userId` | `user` / `id` |
| `customer.deleted` | right before `db.customer.delete` | `user.userId` | `customer` / `id` |

## Lint result

`bun run lint` → **0 errors, 7 warnings** (all pre-existing `@next/next/no-location-assign-relative-destination` warnings in `landing-page.tsx`, `landing-shared.tsx`, `accounts.tsx`, `settings.tsx` — none in any file I touched).

## Notes for the main agent

- **Migration needed.** The main agent should run `bun run db:push` (or `prisma migrate`) to create the `AuditLog` table. Until then, every `audit()` call will hit a "table does not exist" error and silently log via `console.error` — no user-facing flow will break.
- **PGlite / Neon agnostic.** The helper uses the same `db` proxy as every other route, so it works in both local dev (PGlite) and production (Neon).
- **No relations declared.** `AuditLog` has no FK to `User` (the `actorId` is a plain `String?`). This is intentional: (a) we want to keep audit rows even if the actor is later deleted, (b) it avoids any cascade complexity, (c) it lets us log system/anonymous actions where `actorId` is null.
- **Best-effort contract.** The `audit()` helper swallows ALL exceptions and only logs to `console.error`. Route authors can rely on `await audit(...)` never throwing — no defensive try/catch is needed around the call sites.
- **Audit point semantics.** All audit calls fire on the *successful* path of the mutation (after the DB write where possible). For DELETEs we audit *before* the row is removed so the targetId can still be resolved if a downstream consumer needs to look it up.
