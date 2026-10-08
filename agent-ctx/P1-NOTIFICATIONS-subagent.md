# Task ID: P1-NOTIFICATIONS — Notification system (in-app bell + email alerts)

**Agent**: subagent
**Task**: Build a complete notification system — Prisma model, helper, API routes, event triggers, header bell, and Settings toggles.

## What was delivered

### Schema (`prisma/schema.prisma`)
- New `Notification` model: `id, userId, type, title, message, read, actionView, actionId, createdAt`, with `user` relation (`onDelete: Cascade`) and two indexes (`@@index([userId, read])` + `@@index([createdAt])`).
- `notifications Notification[]` added to `User`.
- `npx prisma validate` → ✅ valid.
- `prisma db push` NOT run per task rules (main agent handles it).

### Helper (`src/lib/notifications.ts`, NEW)
- `createNotification({ userId, type, title, message, actionView?, actionId?, sendEmail? })` — best-effort, never throws. Writes the row, optionally sends an email via the existing `sendEmail()` helper.
- `createTrialExpiringNotification(userId, daysLeft)` — idempotent within 24h (so a polling scheduler can't spam).
- `NOTIFICATION_TYPES` constant + `NotificationType` union exported for type-safe callers.

### API routes (2 NEW files)
- `src/app/api/notifications/route.ts`
  - `GET` → `{ notifications, unreadCount }`. Unread first, then read. Supports `?unread=true` (count-only) and `?limit=N` (default 30, max 100).
  - `PATCH` → mark as read. Body `{ id }` (single, ownership-checked) or `{ all: true }` (every unread for caller).
- `src/app/api/notifications/[id]/route.ts`
  - `DELETE` → permanent delete (ownership-checked via `deleteMany` + `userId` filter).
  - `PATCH` → mark read/unread. Body defaults to `{ read: true }`.
- All handlers `force-dynamic`, wrapped in try/catch, auth required.

### Event triggers (5 existing files modified)
| File | Event | Type fired |
|---|---|---|
| `api/inbox/[id]/reply/route.ts` | Reply sent (only when owner ≠ caller) | `comment_received` |
| `api/publish/[platform]/route.ts` | Each successful publish (8 paths: Twitter×2, Instagram, LinkedIn, Facebook, TikTok, YouTube, Threads) | `post_published` |
| `api/subscriptions/[id]/generate-invoice/route.ts` | Invoice created (to all tenant users) | `payment_received` |
| `api/payments/route.ts` | Completed payment (to all tenant users, + email) | `payment_received` |
| `api/auth/signup/route.ts` | Signup — welcome + "trial expires in 3 days" | `trial_expiring` ×2 |

### Bell component (`src/components/glass/notification-bell.tsx`, NEW)
- `NotificationBell` — self-contained dropdown.
- **Polls** `GET /api/notifications?unread=true` every 60s (lightweight, single integer). Re-polls on `window.focus`.
- **Panel open** → `GET /api/notifications?limit=20`. Shows loading skeleton on first open.
- Each row: type-colored icon tile (8-type → icon map), bold title, 2-line clamped message, relative time via `timeAgo()`. Unread rows get a subtle blue tint + dot.
- **Click row** → optimistic mark-as-read + `setView(actionView)` + close panel.
- **"Mark all as read"** button → optimistic + `PATCH { all: true }`.
- **Per-row delete** button revealed on hover → `DELETE /api/notifications/{id}` with rollback on failure.
- **Empty state**: green CheckCircle2 + "All caught up".
- Red badge on the bell icon shows unread count ("9+" if >9). Subtle `animate-ping` ring when there are unread items.
- Auth: reads JWT from `localStorage["socialflow-auth"]`, attaches as Bearer header (mirrors `useApi`).

### Header integration (`src/components/app-header.tsx`, modified)
- Imported `NotificationBell` from `@/components/glass/notification-bell`.
- Mounted `<NotificationBell />` immediately after the mobile search icon button (spec: "place next to the search icon").
- **Removed** the legacy `NotificationsBell` function (which polled `/api/inbox?filter=unread` + `/api/dashboard` — now superseded).

### Settings → Notifications tab (`src/components/views/settings.tsx`, modified)
- Added a new "Event alerts" group with the 6 spec toggles:
  - New comments (`comment_received`)
  - Trial expiring (`trial_expiring`)
  - Payment received (`payment_received`)
  - Post published (`post_published`)
  - Post failed (`post_failed`)
  - Team invites (`team_invite`)
- Stored under `socialflow-notif-prefs.events` (alongside existing `engagement / workflow / reports / system` groups). Defaults to all-on. Toggle keys match the `type` strings in `createNotification()` so the bell can later read these prefs to client-side filter the dropdown (future enhancement — spec said "simple, no DB needed", so prefs are client-only).

## Verification

- **`npx prisma validate`** → "The schema at prisma/schema.prisma is valid 🚀"
- **`bun run lint`** → **0 errors, 7 warnings** — all pre-existing `@next/next/no-location-assign-relative-destination` in unrelated files (landing-page×3, landing-shared×1, accounts×2, settings×1 — none in any file this task touched). Exit code 0.
- **`bunx tsc --noEmit`** → 2 pre-existing errors in unrelated files (`oauth/callback/[platform]/route.ts`, `sync-platforms.ts`). After widening `actionId?: string` → `actionId?: string | null` (callers pass `null`), all new code type-checks clean.
- Dev server NOT started (per task rules).
- `prisma db push` NOT run (per task rules).

## Files touched (9 total)

| File | Status |
|---|---|
| `prisma/schema.prisma` | modified |
| `src/lib/notifications.ts` | created |
| `src/app/api/notifications/route.ts` | created |
| `src/app/api/notifications/[id]/route.ts` | created |
| `src/components/glass/notification-bell.tsx` | created |
| `src/components/app-header.tsx` | modified |
| `src/components/views/settings.tsx` | modified |
| `src/app/api/inbox/[id]/reply/route.ts` | modified |
| `src/app/api/publish/[platform]/route.ts` | modified |
| `src/app/api/subscriptions/[id]/generate-invoice/route.ts` | modified |
| `src/app/api/payments/route.ts` | modified |
| `src/app/api/auth/signup/route.ts` | modified |

## Notes for downstream agents

- The `approval_requested` notification type is wired into the helper and the bell's icon map but no event currently fires it — the approvals API can be wired in a follow-up.
- The `events` preferences in localStorage are NOT enforced server-side (per the spec). A future enhancement could have the bell client-side filter its dropdown by these prefs.
- Trial-expiring notifications fire at signup as a demo. In production, a daily scheduler should call `createTrialExpiringNotification(userId, daysLeft)` for each user whose trial ends within 3 days — the helper is idempotent within 24h so it won't spam.
- The main agent needs to run `prisma db push` to materialize the new `Notification` table + regenerate the Prisma client (so `db.notification.create()` resolves).
