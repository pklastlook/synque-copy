# Task ID: P3-4-P3-5 — subagent (security engineer)

## Task
Fix WebAuthn challenge storage (P3-4) + 2FA disable verification & setup
staging (P3-5).

## Files owned / changed
- `prisma/schema.prisma` — **ADD**: `WebauthnChallenge` model (new),
  `pendingTotpSecret String?` field on User (new — explicitly required by P3-5).
- `src/app/api/webauthn/register/options/route.ts` — store challenge in DB.
- `src/app/api/webauthn/register/verify/route.ts` — look up stored challenge
  by userId, mark used before verification.
- `src/app/api/webauthn/authenticate/options/route.ts` — store challenge in DB
  (with userId when known, null for discoverable login).
- `src/app/api/webauthn/authenticate/verify/route.ts` — look up stored
  challenge by credential's userId (fallback to null for discoverable login).
- `src/app/api/auth/2fa/disable/route.ts` — require TOTP code unconditionally,
  verify against `totpSecret`, 403 on failure.
- `src/app/api/auth/2fa/setup/route.ts` — stage new secret to
  `pendingTotpSecret` instead of overwriting `totpSecret`.

## P3-4 — WebAuthn challenge storage (replay prevention)

### Schema (`prisma/schema.prisma`)

Added a new `WebauthnChallenge` model (after `WebAuthnCredential`):

```prisma
model WebauthnChallenge {
  id          String   @id @default(cuid())
  userId      String?  // null for authenticate (user not yet known)
  challenge   String   // the base64url challenge string
  used        Boolean  @default(false)
  createdAt   DateTime @default(now())
  expiresAt   DateTime

  @@index([userId])
  @@index([challenge])
}
```

`pendingTotpSecret String?` field added to `User` model (after `totpSecret`).
See P3-5 below for rationale. Verified with `bunx prisma validate` — "The
schema at prisma/schema.prisma is valid 🚀".

### `register/options/route.ts`
After `generateRegistrationOptions(...)` returns `options` (which contains
`options.challenge`), the handler now persists a row:

```typescript
await db.webauthnChallenge.create({
  data: {
    userId: user!.userId,
    challenge: options.challenge,
    used: false,
    createdAt: new Date(now),
    expiresAt: new Date(now + 5 * 60 * 1000), // 5-min TTL
  },
});
```

The challenge string is still returned to the client in the JSON response (the
browser needs it to sign with the authenticator) — but the client is no longer
the source of truth for the expected value at verify time.

### `register/verify/route.ts`
Replaces `expectedChallenge: body.expectedChallenge || ""` with a server-side
lookup:

```typescript
const storedChallenge = await db.webauthnChallenge.findFirst({
  where: {
    userId: user!.userId,
    used: false,
    expiresAt: { gt: new Date() },
  },
  orderBy: { createdAt: "desc" },
});
if (!storedChallenge) {
  return NextResponse.json(
    { error: "Challenge expired or not found. Please restart biometric registration." },
    { status: 400 }
  );
}
// Mark used IMMEDIATELY (before verification) so a concurrent replay
// attempt cannot reuse the same row.
await db.webauthnChallenge.update({
  where: { id: storedChallenge.id },
  data: { used: true },
});
```

Then `verifyRegistrationResponse` is called with
`expectedChallenge: storedChallenge.challenge`. The body field
`expectedChallenge` is no longer read at all.

### `authenticate/options/route.ts`
Same pattern as register/options, but `userId` on the stored row is **null**
for the discoverable-passkey login flow (no email in the request body). The
handler was refactored to use a small `buildOptions(options, userId)` helper
that handles both branches (with-email → `userId = userRecord.id`, no-email →
`userId = null`) and the shared persistence + JSON response.

### `authenticate/verify/route.ts`
The user is not known until we resolve the credential by id. After resolving
`credential.userId`, the handler looks up the most-recent unused challenge for
that user. There are two scenarios to cover, so the lookup is a two-step
OR-equivalent:

1. **Preferred**: a challenge whose `userId === credential.userId` (the caller
   passed an email to `/authenticate/options`).
2. **Fallback**: a challenge whose `userId === null` (the caller did not pass
   an email — discoverable login flow).

```typescript
const now = new Date();
const storedChallenge =
  (await db.webauthnChallenge.findFirst({
    where: { userId: credential.userId, used: false, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  })) ||
  (await db.webauthnChallenge.findFirst({
    where: { userId: null, used: false, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  }));
```

The challenge is marked `used = true` immediately (before verification) for
single-use protection against concurrent replay. Then
`verifyAuthenticationResponse` is called with
`expectedChallenge: storedChallenge.challenge`. The body fields
`expectedChallenge` and `authResponse.response?.challenge` are no longer read
as a fallback.

### Why "mark used BEFORE verify"?
If we marked `used = true` only after a successful verification, an attacker
who intercepted the challenge + assertion could submit them in parallel
requests and have both succeed. Marking used immediately guarantees only the
first caller wins; the second sees `used = true` and is rejected (or
`findFirst` returns null because the `used: false` filter excludes it).

## P3-5 — 2FA disable verification + setup staging

### `2fa/disable/route.ts`
Previous code:

```typescript
if (body.code && user.totpSecret) {
  const ok = verifyTotp(body.code.trim(), user.totpSecret);
  if (!ok) { /* 400 */ }
}
await db.user.update({ data: { totpSecret: null, twoFactorEnabled: false } });
```

If `body.code` was omitted, the `if` was skipped and 2FA was silently stripped
— a hijacked session (stolen JWT, XSS-exfiltrated cookie, session-fixation
on a shared device) could trivially disable 2FA without the user's
authenticator.

New code (the verification is now a hard gate):

```typescript
// Require a TOTP code unconditionally.
if (!body.code || !/^\d{6}$/.test(body.code.trim())) {
  return NextResponse.json(
    { error: "TOTP code required to disable 2FA" },
    { status: 400 }
  );
}
// ... existing user lookup + 2FA-enabled check ...
// Verify the supplied code against the stored TOTP secret.
const ok = verifyTotp(body.code.trim(), user.totpSecret);
if (!ok) {
  return NextResponse.json({ error: "Invalid TOTP code" }, { status: 403 });
}
await db.user.update({
  data: {
    totpSecret: null,
    pendingTotpSecret: null, // also clear any staged-but-uncommitted secret
    twoFactorEnabled: false,
  },
});
```

The TOTP library is the existing `src/lib/totp.ts` — confirmed by reading
`/api/auth/2fa/login/route.ts` which imports `verifyTotp` from there. The
helper already accepts the current ±30s window to absorb clock skew and uses
constant-time comparison. Status codes follow the task spec: 400 if code
missing/malformed, 403 if verification fails, 400 if 2FA is not currently
enabled.

### `2fa/setup/route.ts`
Previous code overwrote the active `totpSecret` and flipped
`twoFactorEnabled = false`. Two problems with that:

1. **Lockout**: if the user aborted before calling `/verify`, their existing
   2FA was now broken (`totpSecret` overwritten, `twoFactorEnabled = false`).
   On their next login they would be prompted for a TOTP code that no longer
   matched their authenticator app — locked out.
2. **Premature exposure**: the new secret was written to disk before the user
   had proven their authenticator was correctly configured. A DB dump leak
   would expose a secret the user had never finished setting up.

New code stages to `pendingTotpSecret` only:

```typescript
await db.user.update({
  where: { id: auth.user!.userId },
  data: {
    pendingTotpSecret: secret,
    // DO NOT touch totpSecret or twoFactorEnabled — preserve existing 2FA
    // state until the user verifies a code from the new secret.
  },
});
```

The secret + otpauth URI are still returned to the client as before, so the
QR-code scan flow is unchanged from the UI's perspective.

### Follow-up dependency: `2fa/verify/route.ts` (NOT in owned files)
`src/app/api/auth/2fa/verify/route.ts` currently reads `user.totpSecret` and
on success sets `twoFactorEnabled: true`. After this change it needs to be
updated to:
1. Read `pendingTotpSecret` (fall back to `totpSecret` for backward-compat
   with any in-flight setup that ran before this fix landed).
2. Verify the supplied code against the staged secret.
3. On success: commit `pendingTotpSecret` → `totpSecret`, clear
   `pendingTotpSecret`, set `twoFactorEnabled: true`.

Until that follow-up lands, calling `setup` + `verify` will not enable 2FA
(`verify` will see `totpSecret` is null and return its existing 400
"2FA has not been set up. Call /api/auth/2fa/setup first."). This is the
safer fail-closed behaviour — no half-configured 2FA state that the user
can't log in with. The follow-up is documented inline in the
`2fa/setup/route.ts` JSDoc and is left to the main agent / a sibling task
because `2fa/verify/route.ts` is not in this agent's owned-files list.

## Lint
`cd /home/z/my-project && bun run lint` → exit 0, **0 errors**. 7 pre-existing
warnings in `landing-page.tsx`, `landing-shared.tsx`, `views/accounts.tsx`,
`views/settings.tsx` (all `@next/next/no-location-assign-relative-destination`
— unrelated to this task, present before my work began).

Targeted lint on my 6 route files (`npx eslint <files>`) → 0 errors, 0
warnings. (The `prisma/schema.prisma` "File ignored" warning is expected —
no eslint config matches `.prisma`.)

## Database commands
Per task rules: did NOT run `prisma db push` — the main agent will handle
the migration after reviewing. Did NOT start the dev server.

## Summary of changes
- 1 new Prisma model (`WebauthnChallenge`) + 1 new field on User
  (`pendingTotpSecret String?`). No existing fields/models modified.
- 4 WebAuthn route files refactored to use server-side challenge storage
  (write-on-generate, mark-used-on-verify, 5-min TTL, single-use).
- 2 TOTP-2FA route files hardened: disable requires a valid code, setup
  stages rather than overwrites.
