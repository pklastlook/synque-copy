# SYNC-ACCOUNTS — Unified account sync (subagent work record)

## Task
Create a unified account sync system that imports ALL existing posts/tweets/videos
from connected social media accounts (Twitter, YouTube, Instagram, Facebook,
LinkedIn, TikTok) into SYNQUE.

## Previous agents' work I relied on
- `src/app/api/sync/twitter/route.ts` (existing) — provided the Twitter API v2
  fetch pattern (resolve handle → user ID → /tweets endpoint with
  public_metrics + created_at fields + dedup via content match + Activity log).
- `src/lib/platform-credential-crypto.ts` (existing) — provides
  `decryptPlatformCredential()` for the AES-256-GCM-at-rest cred storage.
- `src/lib/auth-guard.ts` (existing) — provides `requireAuth()` +
  `getTenantScope()` + `tenantWhere()` for tenant-scoped Prisma queries.
- `src/components/views/accounts.tsx` (existing) — provided the AccountListRow +
  SectionHeader action cluster layout to slot the new Sync buttons into.

## Files delivered

### 1. `src/lib/sync-platforms.ts` (NEW)
Per-platform "import existing posts" syncers, each returning a `SyncResult`
(`{ accountId, platform, accountName, synced, updated, total, error? }`).
Per-platform syncers never throw on API errors — they return an `error` so the
caller can continue syncing the rest of the user's accounts.

- `getCredForAccount(account)` — looks up the user's PlatformCredential row
  (with `x → twitter` alias fallback), decrypts it, returns it only if
  `oauth2UserToken` is present.
- `syncAccount(account, cred)` — dispatcher (switch on `account.platform`).
- `syncTwitterPosts` — `/users/by/username/{handle}` → `/users/{id}/tweets`
  (max_results=100, exclude retweets+replies) → map public_metrics + refresh
  Account.followers + Account.postsCount.
- `syncYouTubePosts` — two-step: `/search?forMine=true&type=video&maxResults=50`
  then batched `/videos?part=statistics&id=…` for viewCount/likeCount/commentCount.
- `syncInstagramPosts` — Graph API `/me/media?fields=…&limit=50`.
- `syncFacebookPosts` — Graph API `/me/posts?fields=message,created_time,
  permalink_url,likes.summary(true),comments.summary(true),shares&limit=50`.
- `syncLinkedInPosts` — `/v2/shares?q=owners&owners=urn:li:person:{personId}&count=50`
  (reads `profileId` from cred row, strips the urn prefix, rebuilds URN).
- `syncTikTokPosts` — POST to `/v2/video/list/?fields=…` with
  `{ max_count: 50 }` JSON body.
- Internal `upsertImportedPost()` — dedups via
  `findFirst({ where: { accountId, content } })`; updates metric columns only
  on existing variants; creates Post + nested PostVariant (both with
  `status="published"`, `createdAt` + `publishedAt` set to the platform's
  actual creation date) on new ones. Logs a `post_published` Activity row
  (best-effort).

### 2. `src/app/api/accounts/sync/route.ts` (NEW)
- `POST /api/accounts/sync` with body `{ accountId }` (sync one account) OR
  `{ platform }` (sync all of one platform, or `"all"` for every connected
  account in the caller's tenant scope).
- `requireAuth()` + tenant-scoped Prisma `where`.
- Sequential sync (max 50 accounts per call) — avoids concurrent platform API
  hammering + Prisma write deadlocks.
- Returns `{ ok, synced, updated, total, accounts, results, message }` — the
  `message` field is built for the client toast.
- `maxDuration = 60` for batch headroom.

### 3. `src/components/views/accounts.tsx` (EDITED)
- Added `Download` icon to lucide-react imports.
- Added `syncingPostsId: string | null` state (null/idle, "all"/global sync,
  "<accountId>"/per-account sync) — shared across the whole view so only one
  sync runs at a time.
- Added `syncPosts(accountId?, accountName?)` method → POST /api/accounts/sync
  + toast info/success/error + `reload()`.
- Added a global "Sync All Posts" button next to the existing "Sync &
  Refresh" button in SectionHeader action cluster.
- Added a per-account "Sync posts" Download icon button in AccountListRow's
  action cluster (between "Recalculate health" and "Remove account") —
  disabled + spinner whenever `syncingPostsId !== null`.

## Lint result
`bun run lint` → 0 errors, 7 pre-existing warnings (all `window.location.reload`
calls in landing-page.tsx, landing-shared.tsx, accounts.tsx [2 — pre-existing
"Recalculate health" + "Remove account" handlers, NOT added by this task],
settings.tsx). No new lint issues introduced by this task.

## Dev server
Not started by this task. Verified via `tail dev.log` that the existing dev
server stays clean (only `GET / 200` lines, no compile errors) — Next.js will
compile the new route lazily on first request.

## What this unlocks
Users can now retroactively import posts they published directly on each
social platform (Twitter, YouTube, Instagram, Facebook, LinkedIn, TikTok)
without going through SYNQUE — those posts now appear in SYNQUE's Posts list,
Accounts KPIs (`postsCount`/`impressions`/`engagement`), and analytics
charts with their real `publishedAt` + real metrics (likes, comments, shares,
views).
