# Task ID: TS-FIX — Fix TypeScript build errors

**Agent**: subagent
**Task**: Fix all TypeScript build errors so `npx next build` succeeds (P3-9 follow-up — `typescript.ignoreBuildErrors` was just flipped from `true` to `false`, surfacing ~21 pre-existing TS errors).

## Files touched (8 total)

### Category 1 — JWT_SECRET `string | undefined` cluster (4 files)

The runtime `if (!SECRET) throw` narrowing is not carried to downstream `jwt.sign` / `jwt.verify` / `createHmac` call sites under TypeScript strict mode. Applied the `SECRET_RAW` → `SECRET: string = SECRET_RAW` pattern (mirrors the existing fix in `src/lib/auth-session.ts`):

- **`src/lib/auth-guard.ts`** — Same SECRET_RAW pattern. Both `jwt.verify(...)` sites re-cast `as unknown as {...}` because the broken-overload result type (`Jwt & JwtPayload & void`) doesn't overlap with the target shape.
- **`src/lib/2fa-temp-token.ts`** — Same SECRET_RAW pattern. No further cast needed — the overloads resolve cleanly once SECRET is `string`.
- **`src/app/api/auth/me/route.ts`** — Same SECRET_RAW pattern + `as unknown as { userId: string }` cast (same non-overlap issue).
- **`src/lib/oauth-state.ts`** — Same SECRET_RAW pattern. `createHmac("sha256", SECRET)` now gets a `string`.

### Category 2 — VPN route + component (3 errors)

- **`src/app/api/vpn/qr/route.ts`** line 51 — `new NextResponse(pngBuffer, ...)` failed because Node's `Buffer<ArrayBufferLike>` is not assignable to the DOM `BodyInit`. Wrapped with `new Uint8Array(pngBuffer)` so the binary is passed as a standard typed array.
- **`src/components/views/vpn.tsx`** line 524 — `server={connectedServer}` was `T | undefined`, prop expects `T | null`. Coerced with `?? null`.
- **`src/components/views/vpn.tsx`** line 807 — `setConfigReveal((v) => !v)` passed a function to a prop typed `(v: boolean) => void`. Changed to `setConfigReveal(!configReveal)` — mirrors the existing `PrivateKeyBlock` pattern, same toggling semantics.

### Category 3 — DemoUser missing `status` (1 error)

- **`src/app/api/auth/demo/route.ts`** line 136 — Added `status: string` to the local `DemoUser` interface and `status: true` to the `DEMO_SELECT` const. The User table already has `status String @default("active")` and the create path already sets it; only the local TS interface/select was missing it.

### Category 4 — External files excluded from build

- **`tsconfig.json`** — Old `exclude` was just `["node_modules"]`. Added `"examples/**"`, `"mini-services/**"`, `"skills/**"`, `"prisma.config.ts"` so the Next.js TS step stops type-checking standalone packages with their own tsconfig/deps.

## Verification

- `npx tsc --noEmit` → exits 0 with zero output (clean).
- `JWT_SECRET=… ENCRYPTION_KEY=… SCHEDULER_API_KEY=… MINI_SERVICE_KEY=… npx next build`:
  - ✓ Compiled successfully in 11.8s
  - ✓ Finished TypeScript in 4.4s
  - ✓ Generating static pages using 1 worker (25/25) in 971ms
- `bun run lint` → 0 errors, 7 pre-existing warnings unrelated to this change.

## Rules honored

- Read each file fully before editing.
- MINIMAL changes — no refactors, no business logic changes.
- All type errors fixed at the call site / declaration site, not suppressed with `// @ts-ignore`.
