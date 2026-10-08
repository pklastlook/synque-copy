# P1-IGFB — Real publishing for Instagram, Facebook, LinkedIn, TikTok

## Task
Replace the manual-redirect stubs in `src/app/api/publish/[platform]/route.ts`
with real Graph API / platform-API publishing calls for Instagram, Facebook,
LinkedIn, and TikTok. Token priority: `cred.oauth2UserToken ?? cred.accessToken`
(prefer the OAuth 2.0 user-context token from "Login with X" flow; fall back to
the manually-entered `accessToken`).

## Files inspected
- `/home/z/my-project/worklog.md` — read prior agent context.
- `/home/z/my-project/src/app/api/publish/[platform]/route.ts` — the route
  file being modified (737 → 909 lines after edits).
- `/home/z/my-project/src/lib/platform-credential-crypto.ts` — to confirm
  `oauth2UserToken` and `accessToken` are both decrypted before reaching the
  route handler (so `cred.oauth2UserToken` and `cred.accessToken` are
  already-plaintext values).
- `/home/z/my-project/prisma/schema.prisma` (lines 140-163, 768-797) — to
  confirm the `Post.mediaUrl`, `Post.mediaType`, `PlatformCredential.pageId`,
  `PlatformCredential.profileId`, and `PlatformCredential.oauth2UserToken`
  fields exist.

## What changed (all in `src/app/api/publish/[platform]/route.ts`)

### 1. Instagram (lines 303-392)
- Switched token source from `cred.accessToken` → `cred.oauth2UserToken ?? cred.accessToken`.
- Rewrote the 2-step Graph API v19.0 flow with clearer variable names
  (`createRes`/`createJson` for the container, `publishRes`/`publishJson`
  for `media_publish`).
- Removed the misleading `manualUrl: "https://www.instagram.com/"` from the
  "no image attached" error (now just returns the error — Instagram truly
  cannot publish without media).
- Enriched the success response to the contract the frontend expects:
  `{ ok: true, published: true, platform: "instagram", postId, url: "https://www.instagram.com/p/{id}/", message }`.
- Error responses now use HTTP 502 (Bad Gateway) for upstream API failures
  with the upstream `error.message` surfaced verbatim.

### 2. LinkedIn (lines 394-527)
- Switched token source to `cred.oauth2UserToken ?? cred.accessToken`.
- Added full image media support. When `post?.mediaUrl` is present:
  1. `POST /v2/assets?action=registerUpload` with the
     `feedshare-image` recipe + owner URN → returns `value.asset`
     (digitalmediaAsset URN) + `value.uploadMechanism…uploadUrl`.
  2. `fetch(post.mediaUrl)` → `Buffer.from(arrayBuffer())` →
     `PUT` the bytes to the upload URL with the correct `Content-Type`
     (taken from the upstream response, falling back to
     `application/octet-stream`).
  3. Reference the asset URN in `specificContent.com.linkedin.ugc.ShareContent.media`
     with `status: "READY"` and set `shareMediaCategory: "IMAGE"`.
- Text-only posts still use `shareMediaCategory: "NONE"` (no `media` array).
- Media upload failures are non-fatal: logged to console, then the post is
  published as text-only so the user's content still goes out.
- Success response now includes `published: true`, `platform: "linkedin"`,
  `postId: json.id` (the URN), and `url: "https://www.linkedin.com/feed/update/{urn}/"`.

### 3. Facebook (lines 529-622)
- Switched token source to `cred.oauth2UserToken ?? cred.accessToken`.
- Split into two branches based on whether `post?.mediaUrl` is set:
  - **Image**: `POST /{page-id}/photos` with `url` + `caption` + `access_token`.
    The response gives `id` (photo ID) and (when present) `post_id` (the
    timeline story ID). The `post_id` is preferred for `postId` so the
    permalink points to the actual story, not just the photo node.
    URL: `https://www.facebook.com/{pageId}/photos/{photoId}`.
  - **Text-only**: `POST /{page-id}/feed` with `message` + `access_token`.
    The response `id` is formatted `"{pageId}_{postId}"` — extract the
    trailing slug with `split("_").pop()` for a canonical permalink.
    URL: `https://www.facebook.com/{pageId}/posts/{slug}`.
- Account `postsCount` increment and `activity` log moved AFTER both branches
  so they fire exactly once per successful publish.
- Success response includes `published: true`, `platform: "facebook"`,
  `postId`, `url`, `message`.

### 4. TikTok (lines 624-720)
- Switched token source to `cred.oauth2UserToken ?? cred.accessToken`.
- Fixed the video URL source: was incorrectly using `account.avatar`
  (the user's profile picture — never a video) → now uses `post?.mediaUrl`.
- When no video is attached: returns 200 with `{ ok: false, published: false,
  platform: "tiktok", manualUrl, savedContent }` so the frontend can surface
  a "finish on tiktok.com/upload" message while preserving the drafted text.
- When a video IS attached: calls
  `POST https://open.tiktokapis.com/v2/post/publish/video/init/` with
  `source: "PULL_FROM_URL"` and `video_url`. TikTok fetches the video
  itself, so this is the complete publish flow (no separate upload step
  needed on our side). Returns `{ ok: true, published: true, platform:
  "tiktok", postId: data.publish_id, url: "https://www.tiktok.com/",
  message }`.
- Defensive fallback: if the init call returns an `upload_url` (the
  FILE_UPLOAD source flow instead of PULL_FROM_URL), surface it to the
  caller as `uploadUrl` so the user can complete the upload manually.
- Upstream errors return 502 with the TikTok `error.message` field.

### 5. Top-level docstring + unsupported-platform message
- Updated the route JSDoc to list all 7 supported platforms (twitter,
  instagram, linkedin, facebook, tiktok, youtube, threads) with a one-line
  description of each, plus a note documenting the
  `oauth2UserToken ?? accessToken` token-priority convention.
- Updated the final 501 "unsupported platform" error message to include
  tiktok and youtube in the supported-platforms list.

## Verification
- `cd /home/z/my-project && bun run lint` → **0 errors, 7 warnings** — all
  7 warnings are pre-existing `@next/next/no-location-assign-relative-destination`
  in unrelated files (`landing-page.tsx` ×3, `landing-shared.tsx` ×1,
  `accounts.tsx` ×2, `settings.tsx` ×1). None in `publish/[platform]/route.ts`.
  Exit code 0.
- `bunx tsc --noEmit` → 0 errors in `src/app/api/publish/[platform]/route.ts`
  (pre-existing errors remain in unrelated files: `cron/publish-scheduled`,
  `notifications/*`, `oauth/callback`, `posts/[id]/publish-now`,
  `stripe/create-*`).
- Dev server NOT started (per task rules).
- No Prisma schema changes — `prisma db push` not needed.

## Stage Summary
All four target platforms now perform REAL Graph API / platform API calls
instead of returning manual-redirect stubs:

- **Instagram**: full 2-step `media` → `media_publish` flow with the success
  envelope `{ ok, published, platform, postId, url }`.
- **Facebook**: routes to `/photos` (image) or `/feed` (text-only)
  automatically based on `post.mediaUrl`; correctly extracts the timeline
  post ID from both response shapes.
- **LinkedIn**: ugcPosts API with full image media upload (registerUpload →
  PUT bytes → reference asset URN). Text-only posts still supported.
- **TikTok**: video/init with PULL_FROM_URL — TikTok fetches the video
  itself. Now correctly sources the video URL from `post.mediaUrl` (was
  wrongly using `account.avatar` before). Returns manual upload URL when
  no video is attached.

All four use `cred.oauth2UserToken ?? cred.accessToken` for token priority
and return a consistent success shape: `{ ok: true, published: true,
platform, postId, url, message }`. Account `postsCount` and `activity` log
entries fire exactly once per successful publish. All upstream API errors
return HTTP 502 with the platform's `error.message` field surfaced verbatim
so the user sees the real reason (token expired, permission missing, rate
limit, etc.) instead of a generic "Unknown error".

Files touched: 1 modified (`src/app/api/publish/[platform]/route.ts`).
