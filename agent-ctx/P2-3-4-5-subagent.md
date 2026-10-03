# Task ID: P2-3-4-5 — subagent (security engineer)

**Task**: XSS URL allowlist + path traversal fix + HMAC webhook signature

Fixes three classes of input-validation vulnerability flagged in the
SECURITY-INPUT audit:
- **P2-3** — Stored XSS via dangerous URL schemes (`javascript:`, `data:`)
  in link-in-bio links/avatar, chat fileUrl, and WhatsApp webhook mediaUrl.
- **P2-4** — Path traversal in `LocalFilesystemAdapter.delete()` (and
  transitively `upload()`).
- **P2-5** — Unsigned WhatsApp webhook accepts forged inbound messages.

## Files changed

### 1. `src/lib/url-safety.ts` (NEW — 60 LOC)
- `isSafeUrl(url)` — accepts only `http:`/`https:` URLs via `new URL()`
  parsing. Rejects `javascript:`, `data:`, `file:`, `vbscript:`, `blob:`,
  empty / non-string input, and anything that fails URL parsing.
- `isSafeFetchableUrl(url)` — strict variant that also blocks loopback /
  private TLDs (`localhost`, `127.0.0.1`, `::1`, `0.0.0.0`, `*.localhost`,
  `*.local`). Placeholder for the SSRF follow-up task; not wired in yet.

### 2. `src/middleware.ts` (auth-allowlist tightening — P2-3-a)
- `PUBLIC_ROUTES` matched with `pathname === route` (via `Array.includes`)
  instead of `pathname.startsWith(route)`. Closes the "PATCH
  `/api/linkbio/[id]` is also public" hole.
- New `PUBLIC_EXACT_ROUTES` Set for `/api/linkbio` (list/create) + alias
  `/api/linkbio/click`.
- New `PUBLIC_LINKBIO_CLICK_RE = /^\/api\/linkbio\/[^/]+\/click$/` so the
  public click tracker at `/api/linkbio/[id]/click` still bypasses JWT
  (it's hit by every visitor on a public `/l/[slug]` page).
- Net effect: `PATCH`/`DELETE /api/linkbio/[id]` now REQUIRE a JWT, while
  `POST /api/linkbio` (create page) and `POST /api/linkbio/[id]/click`
  remain public so the sign-up + click-tracking flows still work.

### 3. `src/app/api/linkbio/route.ts` (P2-3-a)
- PATCH — when `links` is in the body, iterate `links[].url` and reject
  the whole request with 400 if any URL fails `isSafeUrl()`. The link
  array is the highest-impact stored-XSS sink (rendered as
  `<a href={link.url}>` on the public `/l/[slug]` page).
- POST — when `avatar` URL is supplied (rendered as `<img src={avatar}>`),
  reject with 400 if not `http(s)`.

### 4. `src/app/api/linkbio/[id]/route.ts` (P2-3-a)
- PATCH — same `links[].url` + `avatar` validation as the parent route.
- Mass-assignment allowlist (`allowed = [...]`) preserved; URL validation
  runs AFTER the allowlist filter so it only fires on URLs that would
  actually be persisted.

### 5. `src/app/api/chat/route.ts` (P2-3-b)
- POST — after the existing "text or file is required" check, validate
  `fileUrl` with `isSafeUrl()` and reject with 400 if not `http(s)`.
  `fileUrl` is rendered as a clickable link / image src in the chat UI.

### 6. `src/app/api/whatsapp/webhook/route.ts` (P2-3-c + P2-5)
- HMAC-SHA256 signature verification via `X-Webhook-Signature` header:
  - `WEBHOOK_SECRET = process.env.MINI_SERVICE_KEY` read at module top.
  - `verifySignature(body, signature, secret)` computes
    `crypto.createHmac("sha256", secret).update(body).digest("hex")` and
    compares with `crypto.timingSafeEqual` (constant-time). Buffers are
    length-checked first because `timingSafeEqual` throws on length
    mismatch.
  - POST handler now reads `bodyText = await req.text()` (NOT `req.json()`
    — JSON round-trip would re-serialize and break the signature), then:
    1. If `WEBHOOK_SECRET` missing → 503.
    2. If `X-Webhook-Signature` missing or `verifySignature` returns
       false → 401.
    3. Only then `JSON.parse(bodyText)` — body authenticated before any
       parsing.
- Validate `body.mediaUrl` with `isSafeUrl()` before persisting (rendered
  as clickable link in WhatsApp Inbox UI). Defence-in-depth even though
  the route is now HMAC-signed — if MINI_SERVICE_KEY leaks, attacker
  still can't inject `javascript:` URLs.

### 7. `src/lib/storage.ts` (P2-4 — path traversal)
- New module-level helper `assertWithinUploads(storageKey: string): string`
  — resolves `path.resolve(PUBLIC_UPLOADS_DIR, storageKey)`, then checks
  the result starts with `PUBLIC_UPLOADS_DIR_RESOLVED + path.sep` (or
  equals it). Throws `Error("Path traversal detected: ...")` if the
  resolved path would escape the uploads directory. `path.resolve`
  collapses `..`, so an input like `../../etc/passwd` resolves to
  `/etc/passwd` and is correctly rejected.
- Applied to `LocalFilesystemAdapter.upload()`:
  - Main file `absPath` is now `assertWithinUploads(storageKey)` instead
    of `path.join(PUBLIC_UPLOADS_DIR, storageKey)`. Even though
    `storageKey` is built from `sanitizePathSegment` /
    `sanitizeFileName` outputs, this is the defence-in-depth boundary so
    a future refactor that drops a sanitization step can't create an
    arbitrary-write primitive.
  - Thumbnail `thumbAbsPath` likewise routes through
    `assertWithinUploads(thumbStorageKey)`.
- Applied to `LocalFilesystemAdapter.delete()`:
  - Wraps the `path.join` + `fs.unlink` in a try/catch that calls
    `assertWithinUploads(storageKey)` first. On traversal attempt it
    logs server-side and returns silently (caller already wraps in
    `.catch(() => {})`).
  - The thumbnail delete path is derived from `path.dirname(absPath)` /
    `path.basename(absPath)` of the already-validated `absPath`, so it's
    automatically inside PUBLIC_UPLOADS_DIR — no separate check needed.
- `CloudinaryAdapter` is unchanged: its `delete()` calls Cloudinary's
  API (`client.uploader.destroy(public_id)`), not the local filesystem,
  so there's no path-traversal vector there. Same for its `upload()` —
  it posts buffers to a remote CDN, not the local FS.

## Lint
`cd /home/z/my-project && bun run lint` → exited 0, no errors, no warnings.

## Known follow-ups (NOT in P2-3-4-5's scope)
- **WhatsApp mini-service signing** — `mini-services/whatsapp-service/index.ts`
  must be updated to compute HMAC-SHA256 over its `JSON.stringify(payload)`
  body and send it as the `X-Webhook-Signature` header. Until that
  follow-up lands, all inbound WhatsApp messages will be rejected with 401
  — intended fail-closed behaviour.
- **SSRF hardening** — `isSafeFetchableUrl()` is defined in `url-safety.ts`
  but not yet wired into any route that does `fetch(userUrl)` (mail
  integrations, etc.). That's the SECURITY-INPUT-2 / SSRF follow-up task.
- **Rate limiting** — not addressed here; that's the SECURITY-INPUT-3
  follow-up task.
- **Mass-assignment hardening** — not addressed here; that's the
  SECURITY-INPUT-4 follow-up task.
