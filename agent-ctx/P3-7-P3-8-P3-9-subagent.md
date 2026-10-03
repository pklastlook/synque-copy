# Task ID: P3-7-P3-8-P3-9 — subagent (security engineer)

**Task**: Caddyfile hardening + dependency upgrades + strict TypeScript.

This file is the brief mirror of the worklog entry. See `worklog.md` for the
full audit trail. Earlier agents' work records live in this same
`/agent-ctx/` directory — see in particular `P1-2-a-subagent.md` for the
mini-service auth/bind/CORS work that established the five service ports
referenced in the SSRF allowlist, and `P2-3-4-5-subagent.md` for the prior
input-validation hardening pass.

## Files owned & changed
1. `Caddyfile` (P3-7) — full rewrite, +1 SSRF allowlist block, +1 403 catch-all block, +2 TLS comment blocks.
2. `package.json` (P3-8) — 6 version bumps (5 deps + `eslint-config-next`).
3. `next.config.ts` (P3-9) — two-flag flip (`ignoreBuildErrors: true → false`, `reactStrictMode: false → true`).

## P3-7 — Gateway SSRF allowlist

### Before (vulnerable)
```
:81 {
    @transform_port_query { query XTransformPort=* }
    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort} { ... }
    }
    handle /api/zai-proxy* { reverse_proxy localhost:3005 { ... } }
    handle { reverse_proxy localhost:3000 { ... } }
}
```
The `query XTransformPort=*` matcher accepted any port — `?XTransformPort=22` → SSH, `?XTransformPort=6379` → Redis, etc. Open SSRF / internal port scanner.

### After (hardened)
- Five explicit `@port_<N>` matchers, one per known service port: `3000` (app), `3002` (whatsapp), `3003` (scheduler), `3004` (ai), `3005` (zai-proxy). Each routes to its own `reverse_proxy localhost:<N>` block. Ports list sourced from the P1-2-a worklog.
- New `@blocked_port` matcher (`query XTransformPort=*`) sitting AFTER the allowlist handles → `respond "Forbidden: XTransformPort not allowed" 403`. Caddy's `handle` directive is mutually exclusive + ordered, so this catch-all only fires for non-allowlisted values and **never dials the attacker-chosen port**.
- The original `/api/zai-proxy*` fixed route (→ 3005) and the default fallthrough (→ 3000) preserved unchanged below the new matchers.
- Header comment explains why `:81` is plaintext (platform terminates TLS upstream). Bottom-of-file production TLS note shows the exact pattern to switch to when Caddy is the public edge (hostname-based site block + `:80 → https://` redirect, auto Let's Encrypt cert).

## P3-8 — Vulnerable dependency upgrades

### `package.json` diffs
| Package | Before | After | Resolved | CVE class |
|---|---|---|---|---|
| `next` (dep) | `^16.1.1` | `^16.2.5` | `16.3.8` | RCE on Windows + Image Optimization AVIF RCE |
| `next-auth` (dep) | `^4.24.11` | `^4.24.15` | `4.24.15` | Homoglyph email bypass |
| `next-intl` (dep) | `^4.3.4` | `^4.9.1` | `4.14.9` | (audit finding) |
| `sharp` (dep) | `^0.34.3` | `^0.35.0` | `0.35.4` | (audit finding) |
| `uuid` (dep) | `^11.1.0` | `^11.1.1` | `11.1.1` | (audit finding) |
| `eslint-config-next` (dev) | `^16.1.1` | `^16.2.5` | `16.3.8` | (kept in lockstep with `next` runtime) |

### Install
`bun install` → 39 packages installed, lockfile saved. No peer-dep conflicts.

### Blocked postinstall scripts (informational, NOT acted on)
- `@parcel/watcher`, `@swc/core`, `unrs-resolver`, `core-js`, `es5-ext` — all dev-only toolchain packages; prebuilt WASM is fine for `bun run lint`. Platform can run `bun pm trust <pkg>` later if native bindings are wanted.

### Breaking changes
None observed.

## P3-9 — Strict TypeScript

### `next.config.ts` diffs
- `typescript.ignoreBuildErrors: true → false` — build now fails on any TS error.
- `reactStrictMode: false → true` — React strict-mode dev checks re-enabled.

### Type-error census (NOT fixed — documented per task scope)
`bun x tsc --noEmit` → **29 TS errors across 20 files**.

In-scope for Next.js build (24 errors / 15 files):
- `prisma.config.ts` (1) — `earlyAccess` unknown on `PrismaConfig`
- `src/app/api/auth/2fa/disable/route.ts` (1)
- `src/app/api/auth/demo/route.ts` (1) — `DemoUser.status`
- `src/app/api/auth/me/route.ts` (2) — JWT secret undefined + JWT shape
- `src/app/api/vpn/qr/route.ts` (1) — `Buffer` not assignable to `BodyInit`
- `src/app/api/webauthn/authenticate/options/route.ts` (1) — `webauthnChallenge` not on `PrismaClient`
- `src/app/api/webauthn/authenticate/verify/route.ts` (3)
- `src/app/api/webauthn/register/options/route.ts` (1)
- `src/app/api/webauthn/register/verify/route.ts` (2)
- `src/components/views/vpn.tsx` (2) — undefined vs null + boolean arg
- `src/lib/2fa-temp-token.ts` (2) — JWT secret undefined
- `src/lib/audit.ts` (1) — `auditLog` not on `PrismaClient`
- `src/lib/auth-guard.ts` (4) — JWT secret undefined + JWT shape
- `src/lib/auth-session.ts` (1) — JWT secret undefined
- `src/lib/oauth-state.ts` (1) — `string | undefined` not `KeyObject | BinaryLike`

Out-of-scope reference / standalone code (5 errors / 6 files — not reached by `next build`):
- `examples/websocket/frontend.tsx`, `examples/websocket/server.ts` — missing `socket.io-client` / `socket.io` modules (reference demo, deps not installed)
- `mini-services/scheduler-service/index.ts` — missing `./generated/client`
- `mini-services/whatsapp-service/index.ts` — missing `@whiskeysockets/baileys`
- `skills/image-edit/scripts/image-edit.ts`, `skills/stock-analysis-skill/src/analyzer.ts` — standalone skill scripts not imported by the app

### Thematic clusters (24 in-scope errors)
1. **`JWT secret` from env treated as `string` not `string | undefined`** (8 errors across `auth/me`, `auth-guard`, `auth-session`, `2fa-temp-token`, `oauth-state`). Fix: runtime guard `if (!JWT_SECRET) throw ...` narrowing before use.
2. **Prisma client not regenerated after schema additions** (8 errors: `webauthnChallenge`, `auditLog`). Fix: `bun run db:generate`.
3. **`Buffer` → `BodyInit`** (1 error, `vpn/qr`). Fix: wrap with `new Uint8Array(buffer)`.
4. **Misc nullable-vs-required shape mismatches** (7 errors). Fix per-file.

The config is now strict, so any future code that introduces a type error will be caught at build time instead of being silently shipped.

## Lint
`cd /home/z/my-project && bun run lint` → **0 errors, 7 warnings**. All 7 warnings are pre-existing `@next/next/no-location-assign-relative-destination` warnings in `landing-page.tsx` (3), `landing-shared.tsx` (1), `accounts.tsx` (2), `settings.tsx` (1). No new warnings introduced by the dep upgrades or the strict-mode flip.

## Stage summary
- **P3-7 ✓** Gateway open-SSRF closed: `?XTransformPort=<arbitrary>` → 5-port allowlist + 403 catch-all. TLS production note documented.
- **P3-8 ✓** All 5 vulnerable packages bumped; `bun install` clean; lint clean. No breaking changes observed.
- **P3-9 ✓** `typescript.ignoreBuildErrors=false`, `reactStrictMode=true`. 29 pre-existing TS errors documented (24 in-app, 5 out-of-scope) but NOT fixed — they were always there, just hidden by the old `ignoreBuildErrors=true`.

## Known follow-ups (NOT in P3-7-P3-8-P3-9 scope)
- The 24 in-scope TypeScript errors above will block `bun run build` now that `ignoreBuildErrors=false`. Two highest-leverage one-shot fixes:
  - `bun run db:generate` → clears 8 of the 24 (the Prisma `webauthnChallenge` + `auditLog` errors).
  - Add a `JWT_SECRET` runtime guard helper → clears 8 more (the JWT secret `undefined` cluster).
- The 5 postinstall scripts Bun blocked are dev-only; no action required.
- The `:81` plaintext listener remains because the hosting platform terminates TLS upstream; production deploy should switch to the hostname-based config in the TLS comment block at the bottom of the new `Caddyfile`.
