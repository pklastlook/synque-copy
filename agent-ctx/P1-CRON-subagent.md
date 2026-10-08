# P1-CRON — Automated scheduled publishing via Vercel Cron

**Task ID**: P1-CRON
**Agent**: subagent (senior backend developer)
**Date**: 2025

## Goal
Re-enable automated scheduled publishing using Vercel Cron Jobs. Scheduled posts (`Post.status: "scheduled"` + `Post.scheduledAt`) were stored but nothing picked them up — the previous scheduler was a Railway-hosted mini-service disconnected from Vercel.

## Files delivered
1. `prisma/schema.prisma` — added `retryCount Int @default(0)` + `lastError String?` to `PostVariant`
2. `src/middleware.ts` — added `/api/cron/publish-scheduled` to `PUBLIC_ROUTES` (bypasses JWT — uses CRON_SECRET instead)
3. `vercel.json` — added `crons` entry (`*/5 * * * *` → `/api/cron/publish-scheduled`) + `maxDuration: 60` for cron route
4. `.env` — added `CRON_SECRET` (generated via `openssl rand -hex 32`)
5. `.env.example` — documented `CRON_SECRET` with usage notes
6. `src/app/api/cron/publish-scheduled/route.ts` — new Vercel Cron route (GET, force-dynamic, 60s)
7. `src/app/api/posts/[id]/publish-now/route.ts` — new manual "Publish Now" route (POST, requireAuth-gated)

## What was built

### Vercel Cron route (`/api/cron/publish-scheduled`)
- Runs every 5 min via Vercel Cron (`vercel.json`).
- Authenticated by `CRON_SECRET` bearer token — NOT JWT.
- Queries `PostVariant` where `status: "scheduled"` AND parent `Post.scheduledAt <= now()` (scheduledAt is on Post, not Variant — matches existing scheduler mini-service).
- For each, calls `/api/publish/[platform]` via HTTP using existing `x-scheduler-key` header (same path Railway scheduler used). Reuses the real platform posting logic, account-protection enforcement, activity logging.
- Success: variant → `published` + `publishedAt`, `retryCount=0`, `lastError=null`.
- Failure: if `retryCount < 3` → keep `scheduled`, increment retryCount, capture `lastError` (≈15-min total backoff across 3 ticks). If `retryCount >= 3` → flip to `failed`.
- Reconciles parent `Post.status` after processing.

### Manual Publish Now route (`/api/posts/[id]/publish-now`)
- POST, requireAuth-gated, tenant-scoped (verifies post belongs to caller's tenant).
- Lets user click "Publish Now" instead of waiting for cron.
- Calls same `/api/publish/[platform]` endpoint with scheduler key.
- Skips already-published variants (idempotent); retries failed/draft ones.
- Optional `{ variantIds: string[] }` body for selective publishing.
- Logs manual-publish Activity row.

### Retry mechanism
- New `PostVariant.retryCount Int @default(0)` — tracks consecutive publish failures.
- New `PostVariant.lastError String?` — captures most recent error message for UI display.
- Cron retries up to 3 times (1 per 5-min tick) before marking `failed`.
- Manual Publish Now resets both fields on success.

## Schema change
```prisma
model PostVariant {
  // …existing fields…
  retryCount  Int       @default(0)
  lastError   String?
}
```

## Verification
- `npx prisma validate` → ✅ valid
- `bun run lint` → 0 errors, 7 warnings (all pre-existing, unrelated)

## Hand-offs for main agent
- **Main agent must run `bun run db:push`** to apply the PostVariant schema migration.
- Set `CRON_SECRET` in Vercel project env vars (same value as `.env`).
- `SCHEDULER_API_KEY` is already required by `/api/publish/[platform]`; cron depends on it.
- `APP_URL` should be set to the production domain on Vercel.
- The standalone Railway scheduler mini-service is left in place — the cron route is primary on Vercel; both share the same `/api/publish/[platform]` + `x-scheduler-key` contract, so behavior is identical.

## Stage Summary
Scheduled publishing is re-enabled on Vercel: cron route + `vercel.json` config drive automatic publishing every 5 minutes, with a 3-attempt retry/backoff persisted in the DB. Users can also bypass with "Publish Now". Both flows reuse the existing `/api/publish/[platform]` logic — no platform code was duplicated.
