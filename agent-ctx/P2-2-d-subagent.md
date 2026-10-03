# P2-2-d — Encrypt VPNSession.privateKey + config at rest

**Agent**: subagent (security engineer)
**Task ID**: P2-2-d
**Scope**: Remediate SECURITY-DATA Finding 8 — `VPNSession.privateKey` (Curve25519) and `config` (full WireGuard .conf incl. private key) were stored as plaintext `String`.

## Work Log

### Step 1 — Read state
- Read `worklog.md` SECURITY-DATA Finding 8 (lines 10659–10665): confirms `/api/vpn/qr` and `/api/vpn/config` already enforce `session.userId === userId` (no IDOR) — only storage-at-rest is the vulnerability.
- Read `prisma/schema.prisma:943–963` (`VPNSession` model): confirmed `privateKey String` + `config String` are plain `String`. Per task rules, **did NOT modify the schema** — encryption is transparent at the application layer, no column type change needed.
- Read `src/lib/crypto.ts`: confirmed `encrypt(text) → "v1:<base64-iv>:<base64-ciphertext+authTag>"` (AES-256-GCM, 96-bit IV, 16-byte auth tag appended) and `decrypt()` accepts both the `v1:` format and the legacy `enc:` plain-base64 format.
- Audited all 8 files in `src/app/api/vpn/`:
  - `connect/route.ts` — **WRITE path** (creates session with `privateKey` + `config`).
  - `qr/route.ts` — **READ path** (renders `session.config` to QR PNG).
  - `config/route.ts` — **READ path** (returns `session.config` as `.conf` download).
  - `session/route.ts` — only reads `Boolean(session.privateKey)` for `hasPrivateKey`; no decrypt needed.
  - `verify/route.ts`, `ip/route.ts`, `disconnect/route.ts`, `servers/route.ts` — do not touch `privateKey`/`config`.

### Step 2 — Modify routes

**`src/app/api/vpn/connect/route.ts`** (WRITE):
- Added `import { encrypt } from "@/lib/crypto"`.
- In the `db.vPNSession.create({ data })` call, changed `privateKey` → `privateKey: encrypt(privateKey)` and `config` → `config: encrypt(config)`. Plaintext values are still returned in the JSON response (shown once at creation time, as the original UX intends) — only the persisted column is encrypted.

**`src/app/api/vpn/qr/route.ts`** (READ):
- Added `import { decrypt } from "@/lib/crypto"`.
- Before calling `QRCode.toBuffer(...)`, decrypt `session.config` inside a `try/catch`. On any failure (pre-migration plaintext / legacy `enc:` format / tampered GCM tag), fall back to the raw `session.config` value so legacy sessions still render their QR code. IDOR guard `session.userId !== userId` left intact.

**`src/app/api/vpn/config/route.ts`** (READ):
- Same pattern: `let configText = session.config; try { configText = decrypt(session.config); } catch { configText = session.config; }`. Returned as the `application/octet-stream` body. IDOR guard left intact.

### Step 3 — Backfill script
- Wrote `scripts/backfill-vpn-sessions.cjs` (CommonJS, standalone — does NOT import the TS `src/lib/crypto.ts` because the project has no compiled JS output; instead inlines byte-for-byte identical `encrypt()`/`decrypt()` implementations matching `src/lib/crypto.ts`).
- Connects to Neon via `@neondatabase/serverless` `neon()` using `process.env.DIRECT_URL || process.env.DATABASE_URL` (loaded from `.env` via a small inline parser — no `dotenv` dependency).
- `SELECT id, "privateKey", config FROM "VPNSession"` (table name quoted because Prisma's default Postgres table name is the case-sensitive model name `"VPNSession"`).
- For each row: if the value already starts with `v1:` or `enc:` (looks encrypted), attempt `decrypt()` to verify integrity — if that throws, re-encrypt the raw value. If the value is plaintext (no prefix), encrypt it. Idempotent.
- Per task rules: did NOT run the script.

### Step 4 — Lint
- `cd /home/z/my-project && bun run lint` — passes for all my files.
- Pre-existing errors in `scripts/backfill-tenant-databases.cjs` (4× `@typescript-eslint/no-require-imports`) belong to a sibling task (P2-2-c) and were present before my work began — not touched. My new `backfill-vpn-sessions.cjs` has `/* eslint-disable @typescript-eslint/no-require-imports */` at the top, so it is lint-clean.

### Rules respected
- Did NOT modify `prisma/schema.prisma`.
- Did NOT change IDOR guards.
- Did NOT run `prisma db push` or the dev server.
- Did NOT run the backfill script.
- Read every file fully before editing.

## Stage Summary

`VPNSession.privateKey` and `VPNSession.config` are now encrypted with AES-256-GCM (`src/lib/crypto.ts` → `v1:<iv>:<ct+tag>` format) at the moment a session is created (`/api/vpn/connect`), and transparently decrypted on the two read paths (`/api/vpn/qr`, `/api/vpn/config`). Pre-migration plaintext rows are tolerated via `try/catch` fallback (so legacy sessions keep rendering QR codes / downloadable `.conf`s), and a one-shot backfill script (`scripts/backfill-vpn-sessions.cjs`) is provided to silently migrate existing rows without downtime. No schema change, no IDOR-guard change, no breaking API change — the response shape of all three endpoints is identical. A DB backup leak no longer exposes every user's Curve25519 private key.
