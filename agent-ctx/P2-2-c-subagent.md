# Task: P2-2-c — Encrypt `TenantDatabase.dbUrl` at rest

**Agent**: subagent (security engineer)
**Worklog ref**: `worklog.md` → Task ID `P2-2-c` (appended)
**Audit ref**: `worklog.md` SECURITY-DATA Finding 3 (lines 10548-10554) — Critical

## Goal
`TenantDatabase.dbUrl` is a full Neon connection string (`postgresql://user:pass@host/db?sslmode=require`) that was stored in plaintext. Encrypt at rest with AES-256-GCM; decrypt lazily on the single read site. Don't break the API shape. Don't touch the schema.

## Files changed (3)

### 1. `src/app/api/customers/route.ts` — WRITE
- Added `import { encrypt } from "@/lib/crypto";`
- Line 137 (was 131): `dbUrl` → `encrypt(dbUrl)` in `db.tenantDatabase.create({ data })`.
- Plaintext value still exists briefly in memory (needed for `npx prisma db push` to provision the tenant DB schema immediately above) but is never persisted in plaintext.
- The GET endpoint at lines 82-96 was already redacted (shipped earlier in worklog line 9372) — returns only `{ id, dbName, status, createdAt }`. No change needed.

### 2. `src/lib/tenant-db.ts` — READ
- Added `import { decrypt } from "./crypto";`
- In `getTenantDb()`, between the `tenantRow` read and `makeClient()`: `const connectionString = decrypt(tenantRow.dbUrl);`
- Decryption happens only on cache-miss (the resulting `PrismaClient` is cached per `customerId`). On tamper/wrong-key, `decrypt()` throws → surfaces as a 500 (better than silently serving a broken or compromised connection).
- The `invalidateTenantDb(customerId)` helper is unchanged — works as before.

### 3. `scripts/backfill-tenant-databases.cjs` — NEW
- CommonJS, standalone (no TS compilation dependency).
- Mirrors pattern of sibling `scripts/backfill-vpn-sessions.cjs` (P2-2-d) — inlines byte-for-byte identical `encrypt()`/`decrypt()` matching `src/lib/crypto.ts`.
- Connects via `@neondatabase/serverless` `neon()` using `DIRECT_URL || DATABASE_URL`.
- Loads `.env` via a small inline parser (no `dotenv` dep).
- Reads `SELECT id, "dbName", "dbUrl" FROM "TenantDatabase"` (table name quoted — Prisma's default Postgres table name is the case-sensitive model name).
- For each row, attempts `decrypt(dbUrl)`:
  - **succeeds** → already encrypted, no-op (idempotent).
  - **throws `unrecognized ciphertext format`** → value is plaintext → `encrypt()` + round-trip sanity check + `UPDATE`.
  - **throws anything else** (GCM auth-tag mismatch / malformed / wrong key) → suspicious → DO NOT overwrite, surface the error.
- Per-row `try/catch` so a single failure doesn't abort the run.
- Exits with code 2 if any suspicious or failed rows; 0 on clean run.
- `eslint-disable @typescript-eslint/no-require-imports` pragma at the top — CommonJS scripts legitimately must use `require()`.
- Per task rules: did NOT run the script.

## Lint
- `npx eslint src/app/api/customers/route.ts src/lib/tenant-db.ts scripts/backfill-tenant-databases.cjs` → exit 0.
- Full `bun run lint` reports 4 pre-existing errors in sibling backfill scripts (`backfill-platform-credentials.cjs` from P2-2-a, `backfill-vpn-sessions.cjs` from P2-2-d) — not my files, not touched.

## Verification checklist
- [x] `encrypt()` applied at the single write site (`customers/route.ts:131`).
- [x] `decrypt()` applied at the single read site (`tenant-db.ts:30`).
- [x] GET `/api/customers` does not return `dbUrl` (was already redacted; verified).
- [x] PATCH `/api/customers/[id]` allowlist excludes `dbUrl` (verified — no TenantDatabase mutation path).
- [x] No `prisma/schema.prisma` change (column stays `String`; ciphertext is opaque to Prisma).
- [x] No IDOR-guard change (only added encrypt/decrypt).
- [x] Backfill script is idempotent (re-running on encrypted DB is a no-op).
- [x] Backfill script is safe-by-default (suspicious rows are NOT overwritten).
- [x] Did NOT run `prisma db push`, dev server, or the backfill script.

## Stage Summary
`TenantDatabase.dbUrl` is now encrypted at rest with AES-256-GCM. A DB backup leak / `prisma studio` access / read-only replica exposure no longer reveals every tenant's Neon password. The plaintext value lives only in memory for the lifetime of the cached `PrismaClient`. No schema change, no API-shape change, no IDOR-guard change. SECURITY-DATA Finding 3 remediated.
