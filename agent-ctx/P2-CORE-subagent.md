# P2-CORE — Email verification + Approval workflow + AI usage tracking

Task ID: **P2-CORE**
Agent: subagent
Scope: implement 3 Phase 2 features in one pass

## Work Log

### Feature 1 — Email Verification Enforcement (UX nudge, not hard block)

1. **`prisma/schema.prisma`** — added `aiUsageCount Int @default(0)` + `aiUsageResetAt DateTime @default(now())` to the `User` model (also used by Feature 3). Schema validated with `npx prisma validate`.
2. **`src/lib/auth-guard.ts`** —
   - Updated `getUserFromRequest` to also decode `emailVerified?: boolean` from the JWT (signing it on the JWT means handlers / middleware can branch on verification status without a DB hit).
   - Added `requireEmailVerified(req)` helper that returns a 403 NextResponse (`"Please verify your email to continue."`) when the JWT's `emailVerified` claim is falsy. Documented that the platform does NOT hard-block unverified users (the banner is a UX nudge); this helper is opt-in for sensitive routes.
3. **`src/lib/auth-session.ts`** — `issueSession` now signs `{ userId, email, role, customerId, emailVerified }` into the JWT. Boolean `!!user.emailVerified`.
4. **`src/app/api/auth/resend-verification/route.ts`** (new) — POST handler that regenerates a verification token + re-sends the email for the authenticated user. Uses `requireAuth`. Surfaces `verifyUrl` for dev when no mail server is configured.
5. **`src/app/api/auth/verify-email/route.ts`** — added a new GET handler `?token=xxx` that verifies the token against the `EmailVerificationToken` table, sets `user.emailVerified = now()` + `status = "active"` in a single transaction, marks the token as used, and redirects to `/?verified=true` (or `/?verified=false&error=...` on failure). Backward-compatible with the existing POST + the existing `/verify-email/confirm` JSON endpoint.
6. **`src/lib/email.ts`** — updated `sendVerificationEmail` to build the email link as `/api/auth/verify-email?token=xxx` (instead of `?verify=xxx` which the AppShell never read). Now the verification link lands on the new GET handler that redirects properly.
7. **`src/components/verify-email-banner.tsx`** (new) — dismissible amber banner shown at the top of the AppShell when `user.emailVerified` is null. Has a "Resend verification email" button that calls `/api/auth/resend-verification`. Also reads `?verified=true|false` from the URL on mount (set by the verify-email GET redirect) and shows a success / error toast + refreshes the user object via `fetchUser` + `updateUser({ emailVerified })` so the banner disappears without a full reload.
8. **`src/components/app-shell.tsx`** — imports + renders `<VerifyEmailBanner />` just above the `<AppHeader />`.

### Feature 2 — Approval Workflow Automation

1. **`src/app/api/posts/route.ts` POST** —
   - When the caller's role is `editor` or `member`, the post status is automatically set to `"pending_approval"` (instead of `"published"` / `"scheduled"`) and the variants stay `"draft"` until approved. Admins and managers keep the existing behavior.
   - A `sendForApproval: true` body flag overrides the role check — any user can explicitly request approval.
   - Activity log entry uses the new `"post_pending_approval"` type for pending submissions.
2. **`src/app/api/approvals/[id]/approve/route.ts`** (new) — POST handler that:
   - Role-gates to `admin` / `manager`.
   - Tenant-scopes via the Approval's `authorId` → User.customerId link.
   - Fetches the linked Post + variants (the Approval model has `postId` as a plain String, not a Prisma relation — so the post is loaded separately).
   - In a single `$transaction`: flips the Post + all variants to `"published"` + sets `publishedAt = now()`, and flips the Approval row to `approved` + `resolvedAt = now()`.
   - Fire-and-forget calls `/api/publish/[platform]` for each variant (forwards the caller's JWT + cookie for auth). Failures don't undo the approval — the post is already marked `"published"` in the DB.
   - Creates two notifications via `createNotification`: one for the author ("Your post '{title}' was approved and published") and one for the approver ("You approved '{title}'").
3. **`src/app/api/approvals/[id]/reject/route.ts`** (new) — POST handler with body `{ reason?: string }` that:
   - Role-gates to `admin` / `manager`.
   - Tenant-scopes as above.
   - In a single `$transaction`: flips the Post + variants back to `"draft"` (so the author can edit + resubmit), flips the Approval to `rejected` + `resolvedAt = now()`, stores the rejection reason in the `comment` field (preserving an existing comment if the new one is empty).
   - Creates an author notification: "Your post '{title}' was rejected. Review and resubmit." with the reason appended if provided.
4. **`src/components/views/approvals.tsx`** —
   - Added `approveRequest(id)` and `rejectRequest(id, reason)` async helpers that POST to the new dedicated endpoints (instead of the legacy PATCH on `/api/approvals/[id]`). The existing `confirmAction(comment)` now dispatches to these new helpers for `approve` / `reject`; the `changes` kind still uses PATCH (no publish / reject — just asks the author to revise).
   - The existing green Approve / red Reject buttons in `ApprovalCard` (hover actions) + the `ActionDialog` now route through these new endpoints, automatically inheriting the publish flow + notifications.
   - Added a pending-count amber pill to the `SectionHeader` (via the `action` prop) — shows "N pending approval(s)" with a Clock icon whenever there are pending approvals.

### Feature 3 — AI Usage Tracking + Plan Enforcement

1. **`prisma/schema.prisma`** — `User` model gained `aiUsageCount Int @default(0)` and `aiUsageResetAt DateTime @default(now())`. Schema validated.
2. **`src/lib/ai-usage.ts`** (new) — single source of truth for AI quota logic:
   - `STARTER_MONTHLY_LIMIT = 100`, `UNLIMITED = -1`.
   - `planLimit(plan)` — starter → 100; growth / enterprise / custom / admin → -1.
   - `resolvePlan(user)` — super-admin → "admin" (always unlimited); otherwise looks up the most recent active Subscription's plan, falling back to Customer.plan (default `"starter"`).
   - `getAiUsage(user)` — reads `aiUsageCount` + `aiUsageResetAt`; if the 30-day window has elapsed, resets `aiUsageCount` to 0 + bumps `aiUsageResetAt` to now (atomic UPDATE). Returns `{ used, limit, remaining, plan, resetsAt, limited }`.
   - `checkAndIncrementAiUsage(user)` — runs `getAiUsage` first (stale-window reset), returns `{ ok: false, status: 429, message }` if `used >= limit` for limited plans; otherwise atomically increments `aiUsageCount`. Unlimited plans skip the cap check but still increment best-effort.
3. **`src/app/api/ai/generate/route.ts`** — added `requireAuth` + `checkAndIncrementAiUsage`. Returns 429 with `{ error, usage }` when the user is over quota. Echoes the post-increment `usage` snapshot on every successful response (and on the fallback paths) so the client can update its indicator without a separate `/api/ai/usage` round-trip. Renamed the local `user` template literal to `userMsg` to avoid shadowing the new `user` from `requireAuth`.
4. **`src/app/api/ai/chat/route.ts`** — same `requireAuth` + `checkAndIncrementAiUsage` wiring. Echoes `usage` on the success response.
5. **`src/app/api/ai/usage/route.ts`** (new) — `GET` handler returning the `AiUsageSnapshot` (`{ used, limit, remaining, plan, resetsAt, limited }`). Triggers the lazy 30-day reset on read so the indicator is always accurate.
6. **`src/components/views/composer.tsx`** —
   - New `aiUsage` state + `refreshAiUsage` callback that hits `/api/ai/usage` on mount.
   - Derived `aiLimited` flag drives the disabled state of the generate / improve buttons.
   - `generate()` and `aiImprove()` short-circuit with an "AI generation limit reached" toast when `aiLimited`. Both also read the echoed `usage` field from the response + update the indicator immediately; on a 429 they update + toast.
   - New visible AI toolbar (between the Brief section and the per-account content boxes) showing:
     - "AI: 47/100 used this month" (or "AI: unlimited" for higher plans) + plan name + reset date.
     - A "Generate variants" primary button (calls `generate()`) — disabled when `generating`, when `aiLimited`, when caption is empty, or when no accounts are selected.
     - An "Improve" secondary button (calls `aiImprove()`) with the same disabled logic.
     - When `aiLimited`, a green "Upgrade to Growth for unlimited" CTA (links to `/billing`) replaces the generate affordance.

## Stage Summary

All three Phase 2 features are implemented and wired end-to-end:

- **Email verification**: signup → email link → `/api/auth/verify-email?token=xxx` GET → `emailVerified = now()` + redirect to `/?verified=true` → AppShell banner auto-dismisses + toast. Unverified users see a dismissible amber banner with a "Resend verification email" button — no hard block. `requireEmailVerified` is available for any route that wants to opt into a hard 403.
- **Approval workflow**: editor/member posts auto-route to `pending_approval` (manual `sendForApproval` flag works for any role); the new `/api/approvals/[id]/approve` and `/reject` endpoints flip the linked Post + variants + trigger `/api/publish/[platform]` + create author/approver notifications. The ApprovalsView now shows a pending-count pill in the header and routes its existing Approve / Reject buttons through the new endpoints.
- **AI usage tracking**: every `/api/ai/generate` and `/api/ai/chat` call now requires auth + checks + increments the per-user monthly quota (Starter = 100, others unlimited). `/api/ai/usage` exposes the snapshot; the Composer renders an "AI: X/Y used this month" indicator with an "Upgrade to Growth for unlimited" CTA + disabled Generate button when the limit is hit.

### Files touched / created

**Created:**
- `src/lib/ai-usage.ts`
- `src/components/verify-email-banner.tsx`
- `src/app/api/auth/resend-verification/route.ts`
- `src/app/api/approvals/[id]/approve/route.ts`
- `src/app/api/approvals/[id]/reject/route.ts`
- `src/app/api/ai/usage/route.ts`

**Modified:**
- `prisma/schema.prisma` (User model: +aiUsageCount, +aiUsageResetAt)
- `src/lib/auth-guard.ts` (getUserFromRequest + emailVerified; +requireEmailVerified)
- `src/lib/auth-session.ts` (issueSession signs emailVerified on JWT)
- `src/lib/email.ts` (verify URL points to GET handler)
- `src/app/api/auth/verify-email/route.ts` (+GET handler)
- `src/app/api/posts/route.ts` (auto-pending_approval for editor/member)
- `src/app/api/ai/generate/route.ts` (requireAuth + quota check + echo usage)
- `src/app/api/ai/chat/route.ts` (requireAuth + quota check + echo usage)
- `src/components/app-shell.tsx` (mount VerifyEmailBanner)
- `src/components/views/approvals.tsx` (+approveRequest, +rejectRequest, +pending pill in header)
- `src/components/views/composer.tsx` (+aiUsage state, +refreshAiUsage, +AI toolbar with Generate/Improve/Upgrade, +limit gating in generate/aiImprove)

### Validation

- `npx prisma validate` → ✅ valid
- `npx prisma generate` → ✅ client regenerated (so the new `aiUsageCount` / `aiUsageResetAt` fields type-check)
- `bun run lint` → 0 errors, 7 warnings (all pre-existing `no-location-assign-relative-destination` warnings in files I did NOT touch)
- `npx tsc --noEmit` → 2 errors, BOTH pre-existing (`oauth/callback/refreshToken`, `sync-platforms.ts null assignment`) in files I did NOT touch. All P2-CORE code is type-clean.

### Notes for the main agent

- The Prisma client was regenerated with `npx prisma generate` so my code type-checks. The main agent still needs to run `prisma db push` to materialize the new `aiUsageCount` / `aiUsageResetAt` columns.
- The `requireEmailVerified` helper is opt-in — no route currently calls it. It's available for any future route that wants a hard 403 on unverified users (e.g. team invites, billing changes). The product decision was a UX nudge (banner), per the task spec.
- The existing `/api/auth/verify-email/confirm` JSON endpoint is preserved for backward compatibility — both routes share the same `EmailVerificationToken` table.
