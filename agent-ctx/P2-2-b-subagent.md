# P2-2-b — Encrypt Integration.credentials + add customerId column

## Context
- Read `/home/z/my-project/worklog.md` — focused on the **SECURITY-DATA** section
  (Finding 2, lines 10535-10545): `Integration.credentials` is a JSON blob of
  third-party secrets (Stripe secretKey, OpenAI apiKey, Cloudinary apiSecret,
  Slack webhookUrl, Anthropic apiKey, Gemini apiKey) stored in PLAINTEXT despite
  the schema comment claiming "encrypted". The `Integration` table also has
  NO `customerId` column — `type` is `@unique` — so the global Stripe key
  can be overwritten by ANY tenant admin via `POST /api/integrations`.
- Read `/home/z/my-project/src/lib/crypto.ts` — confirmed the AES-256-GCM
  `encrypt()` / `decrypt()` helpers (storage format `v1:<base64-iv>:<base64-ct+tag>`),
  including the legacy `enc:<base64>` plaintext back-compat path.
- Read `/home/z/my-project/src/lib/auth-guard.ts` — confirmed `requireAuth`,
  `requireRole`, `getTenantScope`, `tenantWhere` API (lines 72, 165, 195, 211).
- Read `/home/z/my-project/src/app/api/integrations/route.ts` (full) and
  `/home/z/my-project/src/app/api/integrations/[type]/route.ts` (full) —
  identified all credential write/read sites.
- Read `/home/z/my-project/src/lib/storage.ts` (lines 247-309, 555-607) —
  Cloudinary adapter reads credentials from DB via `JSON.parse(row.credentials)`.
- Read `/home/z/my-project/src/lib/llm.ts` (lines 365-518) — Claude/OpenAI/
  Gemini loaders each read credentials from DB via `JSON.parse(row.credentials)`.
  (6 total call sites.)
- Reviewed the prior P2-1 IDOR-fix pattern in `/home/z/my-project/agent-ctx/P2-1-a-subagent.md`
  for consistency: `requireAuth` → `getTenantScope` → `findFirst({ where: { ...tenantWhere(scope) }})`
  → 404 on cross-tenant miss. Mirrored for Integration reads.
- Reviewed `/home/z/my-project/scripts/wipe-and-reseed.ts` (lines 42-83) for
  the Neon-adapter + manual-.env-loader pattern used in the new backfill script.

## Schema changes — `prisma/schema.prisma`
- `Integration` model (lines 758-779):
  - Added `customerId  String?` (nullable — null = global/shared).
  - Added `@@index([customerId])` for tenant-scoped `findMany` performance.
  - **Did NOT** change `type @unique` (the task brief explicitly listed only
    `customerId` + `@@index` as additions, and said "do not change IDOR
    guards from P2-1"). Adding `@@unique([customerId, type])` would require
    removing `type @unique` and is left as a follow-up task. Documented this
    limitation in the schema comment so the next maintainer sees it.
  - Did NOT add a relation — matched the existing bare-column pattern used
    by other multi-tenant models (Post.customerId, Comment.customerId, etc.).

- Ran `bun run db:generate` (NOT `db:push` — task brief prohibited DB writes)
  to regenerate the Prisma client at `/home/z/my-project/generated/` so the
  new `customerId` field is typed on `db.integration`.

## Files changed

### `src/app/api/integrations/route.ts`
- **Imports**: added `getTenantScope, tenantWhere` from `@/lib/auth-guard`
  and `encrypt, decrypt` from `@/lib/crypto`.
- **New helper** `decryptCredentials(raw: string | null)` (exported): tries
  `decrypt(raw)` first; on failure (pre-migration plaintext, or null) falls
  back to `JSON.parse(raw)`. Returns `null` for null/empty input or when
  neither path yields valid JSON.
- **GET** handler:
  - Added `getTenantScope(user)` and a tenant-aware `where` clause:
    super-admins see all rows; tenant users see rows whose `customerId`
    matches theirs OR is null (global/shared rows). Without the `null`
    branch, a super-admin-configured integration would be invisible to
    tenant users.
- **POST** handler:
  - Added `getTenantScope(user)`.
  - On write: `credentials = encrypt(JSON.stringify(credentials))` before
    the `upsert`. (Previously `JSON.stringify(credentials)` written as
    plaintext.)
  - On write: `customerId = scope.isSuperAdmin ? null : scope.customerId`
    on BOTH the `update` and `create` branches — binds the row to the
    caller's tenant.

### `src/app/api/integrations/[type]/route.ts`
- **Imports**: added `getTenantScope` from `@/lib/auth-guard`; `decryptCredentials`
  from the sibling `../route` module (no duplication).
- **New helper** `typeWhere(scope, type)`: builds a `where` clause for a
  single integration type scoped by tenant (super-admin sees all; tenant
  users see their rows + shared null rows).
- **GET**: switched from `findUnique({ where: { type } })` to
  `findFirst({ where: typeWhere(scope, type) })` so tenant users can't
  read other tenants' integration rows by ID/type. Replaced
  `JSON.parse(row.credentials)` with `decryptCredentials(row.credentials)`.
- **DELETE**: switched `deleteMany({ where: { type } })` to
  `deleteMany({ where: typeWhere(scope, type) })` so a tenant admin can't
  wipe another tenant's integration. (Super-admin still nukes the single
  global row.)
- **POST** (test endpoint): switched `findUnique({ where: { type } })` to
  `findFirst({ where: typeWhere(scope, type) })` for the same reason.
  Replaced `JSON.parse(row.credentials)` with `decryptCredentials(row.credentials)`.
  Added a 500 fallback if `decryptCredentials` returns null (corrupt data).

### `src/lib/storage.ts`
- **Imports**: added `decrypt` from `./crypto`.
- `CloudinaryAdapter.loadCredentials()` (line ~247) and `getStatus()`
  (line ~565): replaced `JSON.parse(row.credentials)` with a decrypt-with-
  fallback sequence:
  ```ts
  let credsRaw = row.credentials;
  try { credsRaw = decrypt(row.credentials); } catch { /* plaintext */ }
  const creds = JSON.parse(credsRaw) as Record<string, string>;
  ```
  This is the same logic as `decryptCredentials` in route.ts but inlined
  (storage.ts is a leaf module; inlining keeps it self-contained).

### `src/lib/llm.ts`
- **Imports**: added `decrypt` from `./crypto`.
- **New helper** `decryptIntegrationCreds(raw)` (private to llm.ts):
  decrypt-with-fallback, returns `Record<string, string> | null`. Mirrors
  `decryptCredentials` from route.ts.
- Replaced all 6 `JSON.parse(row.credentials) as Record<string, string>`
  call sites (Claude, OpenAI, Gemini × getLLMClient + getLLMStatus) with
  `decryptIntegrationCreds(row.credentials)`. Adjusted the `if (creds.apiKey
  && creds.model)` guards to `if (creds?.apiKey && creds.model)` since the
  helper returns nullable.

### `scripts/backfill-integrations.cjs` (new file)
- CommonJS script (per task brief — `.cjs` not `.ts`). Connects to the Neon
  DB directly via `@neondatabase/serverless`'s tagged-template `sql` helper
  (does NOT depend on the generated Prisma client, so it runs even before
  `prisma generate` is re-run).
- Loads `.env` and `.env.local` manually (no `dotenv` dependency — mirrors
  the pattern in `wipe-and-reseed.ts`).
- Mirrors `src/lib/crypto.ts` byte-for-byte (AES-256-GCM, `v1:<iv>:<ct+tag>`
  format, legacy `enc:` back-compat on decrypt). Any future change to
  `crypto.ts` MUST be mirrored here — flagged in the file header.
- For each Integration row:
  1. Tries `decrypt(credentials)` — if it succeeds AND `JSON.parse()`s, the
     row is already encrypted (skip).
  2. Otherwise validates `JSON.parse(credentials)` works (so we don't
     encrypt corrupt data), then encrypts and `UPDATE`s.
  3. Always sets `customerId = NULL` on every updated row (existing rows
     are global/shared until a tenant admin re-saves through the UI, which
     binds them via `getTenantScope`).
- Idempotent: running twice is safe — the second run sees only encrypted
  rows and skips them.
- Not run per task brief.

## Files audited but NOT changed
- No other files reference `Integration.credentials` or call
  `db.integration.*` (confirmed via ripgrep — the only readers are the two
  API routes, `storage.ts`, and `llm.ts`, all updated).
- The masked-GET response in `/api/integrations/[type]/route.ts` still
  leaks `value.slice(0,4)` for non-password fields (Cloudinary cloud name,
  Stripe publishableKey prefix, OpenAI model name) — flagged in
  SECURITY-DATA Finding 2 fix-list item 3 but **out of scope** for this
  task (which only adds encryption + customerId). Left for a follow-up.

## Verification
- `cd /home/z/my-project && bun run lint` → exit code 0, no errors, no warnings.
- `bun run db:generate` → regenerated the Prisma client at `./generated`
  with the new `customerId` field on `Integration` (verified by grep on
  `generated/models/Integration.ts`).
- `bun run db:push` NOT run (per task brief).
- Backfill script NOT run (per task brief).
- Dev server NOT touched.

## Limitations / follow-ups
1. **`type @unique` still in place.** A tenant admin POSTing Stripe creds
   will `upsert({ where: { type } })` and overwrite any existing Stripe row,
   including one owned by another tenant. The `customerId` write-through
   means the row's `customerId` flips to the new caller's tenant — so the
   previous owner's GET will no longer see it. This is a known limitation
   of the literal task brief. The proper fix is `@@unique([customerId, type])`
   (removing `type @unique`), which is a schema-level change flagged for a
   follow-up task. The schema comment in `schema.prisma` documents this.
2. **GET tenant filter includes `customerId: null` rows.** This lets a
   tenant admin see (and use) integration rows configured by a super-admin
   (e.g. the global Cloudinary CDN). Without this, the app would silently
   break for super-admin-configured integrations. It does mean a tenant
   user can SEE that an integration is configured globally, but the GET
   response never returns the actual credential values (masked only).
3. **Pre-migration plaintext fallback.** All decrypt paths (`decryptCredentials`
   in route.ts, `decryptIntegrationCreds` in llm.ts, inline try/catch in
   storage.ts) fall back to `JSON.parse()` if `decrypt()` throws. This
   keeps the app working between the schema deploy and the backfill script
   run. After the backfill runs once, all rows will be encrypted and the
   fallback branch becomes dead code (still kept as a safety net for
   future migration scripts).
4. **Backfill script mirrors crypto.ts by hand.** If `src/lib/crypto.ts`
   changes its format, `scripts/backfill-integrations.cjs` must be updated
   too — flagged in the file header comment.

## Patterns applied (consistent with P2-1)
1. `requireAuth(req)` (or `requireRole(req, "admin")` for mutations) at top
   of every handler → 401/403.
2. `getTenantScope(user)` to resolve `customerId` + `isSuperAdmin`.
3. List/read endpoints → tenant-scoped `findFirst`/`findMany`.
4. Mutations (POST/DELETE) → tenant-scoped where clause on the upsert/
   deleteMany. (Note: the POST upsert still targets `{ type }` because
   `type @unique` is unchanged — see Limitation 1.)
5. Create/mutate endpoints → stamp `customerId: scope.isSuperAdmin ? null
   : scope.customerId` on the data payload.
6. Cross-tenant miss → return the same response shape as "not configured"
   (don't leak existence — the GET handler returns
   `{ type, enabled: false, configured: false }` for missing rows).
