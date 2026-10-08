---
Task ID: REMAINING-4
Agent: subagent
Task: A/B testing + media processing + Docker + integration tests
Work Log:

### Feature 1 — A/B Testing for Content

**Prisma schema** (`prisma/schema.prisma`)
- Added `abTestGroupId String?` field to `PostVariant` (+ `@@index([abTestGroupId])`)
- Added `hash String?` + `altText String?` to `MediaAsset` (+ `@@index([hash])`)
- Validated with `npx prisma validate` → schema is valid
- Regenerated Prisma client with `bunx prisma generate` so the new fields type-check in the route handlers

**`src/app/api/ab-tests/route.ts`** (new)
- `GET /api/ab-tests` — returns every A/B test group (variants sharing an `abTestGroupId`) visible to the caller, tenant-scoped. Each group includes per-variant engagement summaries (likes/comments/shares/saves + derived `engagement` field), total counts, and a `winnerVariantId` (highest engagement among published variants).
- `POST /api/ab-tests` — accepts `{ postId, variantIds[2–4] }`. Validates the post exists in the caller's tenant, that all variant ids belong to that post, and that none are already grouped. Stamps all variants with a fresh `abtest_xxx` cuid. Returns the new group shape (same as GET items).

**`src/app/api/ab-tests/[id]/route.ts`** (new)
- `GET /api/ab-tests/[id]` — returns the full per-variant engagement comparison for a single test group. Each variant row includes likes/comments/shares/saves/reach/impressions/engagement/engagementRate and a boolean `isWinner` flag. Only published variants are eligible to win; ties broken by reach.
- `DELETE /api/ab-tests/[id]` — stops the test by clearing `abTestGroupId` on every variant in the group (tenant-scoped). Variants + their metrics are preserved — only the grouping is removed. Returns `{ ok, cleared: <n> }`.

**`src/components/views/composer.tsx`** (modified)
- Added `FlaskConical` icon import.
- Added `abTestOpen` state + `openABTestDialog()` async helper — if no `editingPostId`, saves a draft first (so the variants exist as PostVariant rows), then opens the dialog.
- Modified `saveDraftOnly()` to return the new post id (so the dialog can fetch its variants).
- Added `onCreateABTest` + `abTestEnabled` props to `ProgressToolbar`. Renders a new "A/B Test" button (disabled until `selectedAccounts.length >= 2 && Object.keys(state.variants).length >= 2`). Button is hidden on mobile (sm:flex).
- Mounted `<ABTestDialog open={abTestOpen} postId={editingPostId} />` next to the existing SeriesDialog.

**`ABTestDialog` component** (new, in composer.tsx)
- Re-fetches the post's variants every time the dialog opens via `GET /api/posts` (filtered by postId client-side).
- Multi-select UI: clicking a variant toggles its inclusion; max 4 enforced (toast on overflow).
- Each row shows PlatformBadge + handle + status + (if published) likes/comments/shares/impressions inline pills.
- Confirm button disabled until 2 ≤ selected.size ≤ 4. POSTs to `/api/ab-tests` with `{ postId, variantIds }`. Success state shows "✓ A/B test created" with link to Analytics.

**`src/components/views/analytics.tsx`** (modified)
- Imported `FlaskConical`, `Trophy`, `Crown` icons from lucide-react.
- Mounted `<ABTestsCard />` immediately after `<AdvancedAnalyticsCard days={days} />`.

**`ABTestsCard` component** (new, in analytics.tsx)
- Fetches `GET /api/ab-tests` (returns `{ groups: ABTestGroup[] }`).
- Active count pill in the header.
- Empty state with `FlaskConical` icon + helper text directing the user to the Composer.
- Per-group `ABTestGroupRow`:
  - Header: post title + "Winner" amber pill (if winnerVariantId) + published count + total engagement + relative time
  - "Use winner" button (PATCH `/api/posts/{postId}` with `{ caption: winner.content }`) — sets the winning variant's content as the post's default caption
  - "Stop" button (DELETE `/api/ab-tests/{id}`)
  - BarChart comparing per-variant engagement; winner bar highlighted in amber (`oklch(0.7 0.18 75)`), published in `var(--primary)`, drafts in muted
  - Per-variant legend row with PlatformBadge + handle + engagement total
  - Winner caption preview block (amber-tinted, line-clamped)

### Feature 2 — Media Processing

**`src/lib/media-processing.ts`** (new)
- `compressImage(buffer, maxWidth=1920, quality=85)` — uses sharp to resize + re-encode as WebP. SVGs and GIFs returned unchanged (animated GIFs would be broken by re-encoding). Fails open (returns original on any sharp error).
- `generateVideoThumbnail(videoBuffer)` — uses sharp (libvips + ffmpeg) to extract the first frame at 640px wide JPEG q=80. Returns null on any error (server-side log).
- `calculateImageHash(buffer)` — SHA-256 (Node `crypto`, no extra deps) of the post-compression bytes. Content-addressed (not perceptual) so it dedupes exact re-uploads without false positives on visually-similar images.
- `suggestAltText(imageUrl)` — best-effort AI alt-text using the project's LLM resolver (`getLLMClient()` — Claude / OpenAI / ZAI). Returns empty string on any error. Capped at 200 chars.

**`src/app/api/media/upload/route.ts`** (new)
- Multipart form-data upload (field `file`, optional `folder`).
- Pipeline:
  1. Read raw bytes + content-type.
  2. Image → `compressImage()` (≤1920px WebP q=85). Video → `generateVideoThumbnail()` (best-effort).
  3. Hash the processed buffer (SHA-256) and check for an existing MediaAsset with the same hash in the tenant. If found → return `{ ok: true, duplicate: true, asset: <existing> }` and skip the write.
  4. Persist via `storage.upload()` (local FS or Cloudinary). For videos, separately upload the thumbnail if sharp produced one.
  5. Persist the MediaAsset row (with `hash` + `altText: null`).
  6. Kick off `suggestAltText(asset.url)` in the background (non-blocking `void` promise) → updates the row when it resolves.
- Returns the same shape as `GET /api/media`'s `assets[]` items so the frontend can append without a re-fetch.
- Note: `sharp` (^0.35.0) was already in `package.json` — no install needed.

### Feature 3 — Dockerize Mini-Services

**Dockerfiles** — all 5 use `oven/bun:1` base image, `bun install --production`, `bun run index.{js,ts}` entrypoint:

| File | Port | Entrypoint |
|---|---|---|
| `mini-services/whatsapp-service/Dockerfile` | 3002 | `bun run index.js` |
| `mini-services/ai-service/Dockerfile` | 3004 | `bun run index.js` |
| `mini-services/scheduler-service/Dockerfile` | 3003 | `bun run index.js` |
| `mini-services/zai-proxy/Dockerfile` | 3005 | `bun run index.js` |
| `mini-services/chat-service/Dockerfile` | 3006 | `bun run index.ts` (TypeScript source — bun runs TS directly) |

For `zai-proxy` (which had no `package.json`), created a minimal one + a stub `bun.lock` (empty deps) so `bun install --production` succeeds.

**`Dockerfile`** (root, new) — multi-stage build for the main Next.js 16 app:
- Stage 1 (`builder`): `oven/bun:1` → `bun install --frozen-lockfile` → `bunx prisma generate` → `bun run build` (uses `next.config.ts`'s `output: "standalone"`)
- Stage 2 (`runner`): `oven/bun:1` → copies `.next/standalone` + `.next/static` + `public` → runs as non-root `nextjs` user → `bun server.js`

**`docker-compose.yml`** (root, new) — orchestrates the 5 mini-services + the main app:
- All services on the default network so the main app can reach them by service name (e.g. `http://scheduler-service:3003`)
- Each service exposes its port for direct debugging
- All services read from `.env` (env_file) with per-service `environment:` overrides (mini-service URLs, ports, secrets)
- `app` container depends_on all 5 mini-services
- All services `restart: unless-stopped`
- Note: PostgreSQL is NOT in compose — the project uses Neon serverless Postgres via `DATABASE_URL` env var, so no local DB container is required.

### Feature 4 — Integration Tests

All 4 test files live under `src/tests/` and use `bun:test` (Bun's built-in test runner — no install needed). Each file starts with `/// <reference types="bun-types" />` so TypeScript finds the `bun:test` module types (the package was already in `package.json`).

| File | Tests |
|---|---|
| `src/tests/signup.test.ts` | signup creates Customer + Subscription + Invoice + User + TenantDB (asserts 200 + token + customerId + that the new user can immediately login); duplicate email returns 409; missing fields returns 400 (4 variants: missing password, missing email, missing name, empty body) |
| `src/tests/publish.test.ts` | publish to Twitter with valid token returns 200 (skipped unless `RUN_PUBLISH!=0` + `TEST_AUTH_TOKEN` + `TEST_TWITTER_ACCOUNT_ID`); publish without credentials returns 400 (uses random nonexistent accountId + asserts "credentials/configured" error); publish with rate-limited account returns 429 (publishes twice — first call warms up the quota, second is blocked by AccountProtection guard) |
| `src/tests/billing.test.ts` | create payment intent returns clientSecret (asserts 200 + ok + clientSecret starts with `pi_` + paymentId + amount > 0); webhook handler rejects invalid signature with 400 (sends fake `payment_intent.succeeded` event with malformed Stripe-Signature) — full happy-path test documented as requiring Stripe CLI forwarding |
| `src/tests/auth.test.ts` | login with correct credentials returns token (handles both the 2FA-on path returning `requires2FA + tempToken` and the standard path); login with wrong password returns 401 (asserts generic "Invalid email or password" — no email enumeration); protected route without token returns 401; protected route with malformed token returns 401 |

Tests are stateful — each signup test uses a unique timestamped email to avoid collisions. Tests requiring a running server hit `http://localhost:3000` by default (override via `API_BASE_URL` env var).

### Quality checks
- `npx prisma validate` → schema is valid
- `bunx prisma generate` → client regenerated (new fields present in `generated/models/PostVariant.ts` + `generated/models/MediaAsset.ts`)
- `bun run lint` → **0 errors, 7 warnings** (all pre-existing in unrelated files: landing-page.tsx ×3, landing-shared.tsx ×1, accounts.tsx ×2, settings.tsx ×1 — all `@next/next/no-location-assign-relative-destination` warnings). No new errors or warnings introduced.
- `bunx tsc --noEmit` → 0 errors in any file created or modified by this task. Pre-existing errors in unrelated files (`oauth/callback/[platform]/route.ts`, `stripe/create-subscription/route.ts`, `team-performance.tsx`, `sync-platforms.ts`) are from other agents' work and were not touched.
- Dev server NOT started per task rules.

### Files created
- `src/lib/media-processing.ts`
- `src/app/api/media/upload/route.ts`
- `src/app/api/ab-tests/route.ts`
- `src/app/api/ab-tests/[id]/route.ts`
- `mini-services/zai-proxy/Dockerfile`
- `mini-services/zai-proxy/package.json`
- `mini-services/zai-proxy/bun.lock`
- `Dockerfile` (root — Next.js app)
- `docker-compose.yml` (root)
- `src/tests/signup.test.ts`
- `src/tests/publish.test.ts`
- `src/tests/billing.test.ts`
- `src/tests/auth.test.ts`

### Files modified
- `prisma/schema.prisma` (added abTestGroupId, hash, altText + indexes)
- `mini-services/whatsapp-service/Dockerfile` (rewritten to bun base)
- `mini-services/ai-service/Dockerfile` (rewritten to bun base)
- `mini-services/scheduler-service/Dockerfile` (rewritten to bun base)
- `mini-services/chat-service/Dockerfile` (rewritten to bun base)
- `src/components/views/composer.tsx` (added ABTestDialog + button + openABTestDialog helper)
- `src/components/views/analytics.tsx` (added ABTestsCard + ABTestGroupRow + mounted after AdvancedAnalyticsCard)

### Note for main agent
- Must run `prisma db push` to materialize the new columns (`abTestGroupId` on PostVariant, `hash` + `altText` on MediaAsset).
- The integration tests under `src/tests/` will only run end-to-end with the dev server running + the appropriate env vars set (TEST_AUTH_TOKEN, TEST_USER_ID, TEST_TWITTER_ACCOUNT_ID, etc.). See each test's header comment for the full list.

Stage Summary: All 4 items complete and lint-clean. A/B testing is wired end-to-end (composer button → dialog → POST → analytics card with comparison chart + winner + use-winner + stop). Media uploads now run through a real pipeline (compress → hash → dedup → store → AI alt-text). All 5 mini-services + the main app can be brought up with `docker compose up --build`. 4 integration test files cover the signup, publish, billing, and auth critical paths.
