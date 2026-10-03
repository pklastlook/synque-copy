# P2-1-e — subagent (security engineer)

## Task
Social module — add `customerId` to Prisma schema for 5 models + IDOR sweep
across the listening / hashtags / influencers / competitors / linkbio API
routes.

## Files changed

### Schema
- `prisma/schema.prisma` — added `customerId String?` + `@@index([customerId])`
  to:
  - `ListeningQuery` (model has related `Mention` rows; mentions scoped via the
    parent query relation, no new column added to `Mention`)
  - `HashtagGroup` (task brief called it "Hashtag" or "HashtagTracking" —
    actual model name is `HashtagGroup`)
  - `Influencer`
  - `Competitor` (`CompetitorSnapshot` left unmodified — it cascades through
    the `Competitor` relation)
  - `LinkInBio` (task brief called it "LinkBio" or "LinkInBio" — actual model
    name is `LinkInBio`)

  No Customer relation was added (matches the existing pattern: `Account`,
  `Task`, `Report`, `User` all carry a bare `customerId String?` with no
  `customer Customer?` relation). The Customer model itself was not modified.

### Routes — listening
- `src/app/api/listening/route.ts` — added `requireAuth` + `getTenantScope` to
  both GET and POST. GET now scopes `listeningQuery.findMany` via
  `tenantWhere(scope)` and scopes the `mention.findMany` via the `query`
  relation. POST now stamps `customerId: scope.customerId` on the new row.
- `src/app/api/listening/[id]/route.ts` — added `requireAuth` + `getTenantScope`
  to PATCH and DELETE. Both now do a tenant-scoped `findFirst({ where: { id,
  ...tenantWhere(scope) }})` before allowing mutation, returning 404 if the
  row doesn't belong to the caller's tenant.
- `src/app/api/listening/[id]/reply/route.ts` — kept `requireAuth`, added
  `getTenantScope`. Changed `mention.findUnique({ where: { id }})` to
  `mention.findFirst({ where: { id, query: tenantWhere(scope) }})` so a user
  in tenant A can't reply to tenant B's mentions. Also tenant-scoped the
  fallback `account.findFirst({ where: { platform, ...tenantWhere(scope) }})`
  so reply posts can't use another tenant's stored OAuth tokens.
- `src/app/api/listening/sync/route.ts` — kept `requireAuth`, added
  `getTenantScope`. Merged `tenantWhere(scope)` into the
  `listeningQuery.findMany` where clause so a tenant user can only sync their
  own queries (previously: any logged-in user could trigger syncs on ALL
  active listening queries across tenants, including posting replies via
  cross-tenant PlatformCredential lookups).

### Routes — hashtags
- `src/app/api/hashtags/route.ts` — added `requireAuth` + `getTenantScope` to
  GET and POST. GET scopes by `tenantWhere(scope)`; POST stamps
  `customerId: scope.customerId`.
- `src/app/api/hashtags/[id]/route.ts` — added `requireAuth` + tenant-scoped
  `findFirst` guard before PATCH and DELETE.

### Routes — influencers
- `src/app/api/influencers/route.ts` — added `requireAuth` + `getTenantScope`
  to GET and POST. GET merges status filter with `tenantWhere(scope)`; POST
  stamps `customerId: scope.customerId`.
- `src/app/api/influencers/[id]/route.ts` — added `requireAuth` + tenant-scoped
  `findFirst` guard before PATCH and DELETE.
- `src/app/api/influencers/search/route.ts` — already had `requireAuth`; no
  tenant-scoped DB queries (pure web search + LLM), so no further change
  needed.

### Routes — competitors
- `src/app/api/competitors/route.ts` — added `requireAuth` + `getTenantScope`
  to GET and POST. GET scopes by `tenantWhere(scope)`; POST stamps
  `customerId: scope.customerId` on both the new Competitor and the seeded
  CompetitorSnapshot (snapshot inherits tenancy via the relation, no direct
  column).
- `src/app/api/competitors/[id]/route.ts` — added `requireAuth` + tenant-scoped
  `findFirst` guard before PATCH and DELETE (the snapshot deleteMany already
  cascades via `competitorId`).
- `src/app/api/competitors/sync/route.ts` — kept `requireAuth`, added
  `getTenantScope`. Merged `tenantWhere(scope)` into the
  `competitor.findMany` where clause so a tenant user can only sync their own
  competitors. (The `platformCredential.findFirst` fallback that picks any
  connected credential across tenants was NOT changed — that's part of
  Finding 1/4 about plaintext + cross-tenant PlatformCredential use, which
  is outside the P2-1-e scope.)

### Routes — linkbio
- `src/app/api/linkbio/route.ts` — per task instruction "linkbio is also PUBLIC
  for GET (the `/l/[slug]` page)": GET kept public (no auth check). POST
  (create) and PATCH (update by id in body) now require `requireAuth` +
  `getTenantScope`. POST stamps `customerId: scope.customerId` on the new
  page. PATCH does a tenant-scoped `findFirst` before update.
- `src/app/api/linkbio/[id]/route.ts` — added `requireAuth` + tenant-scoped
  `findFirst` guard before PATCH and DELETE. This was previously exposed as
  PUBLIC via the middleware `PUBLIC_ROUTES` `startsWith("/api/linkbio")`
  pattern, meaning PATCH and DELETE on `/api/linkbio/[id]` were reachable
  without any JWT at all — that public-by-default middleware still applies,
  but the route handlers now reject unauthenticated requests with 401.
- `src/app/api/linkbio/[id]/click/route.ts` — left PUBLIC. This endpoint only
  increments a click counter on a link-in-bio page (called by the public
  `/l/[slug]` page visitors). No tenant-scoped data is leaked.

## Verification
- `bun run lint` — clean (zero errors, zero warnings).
- `bunx prisma validate` — `The schema at prisma/schema.prisma is valid 🚀`.
- Did NOT run `bun run db:push` (per task instruction; main agent will handle
  the migration after reviewing all P2-1 changes).

## What was NOT touched (out of scope for P2-1-e)
- `Mention` ( ListeningQuery child) — no direct `customerId` column. Scoped
  via the parent `query` relation in the listening routes.
- `CompetitorSnapshot` — no direct `customerId`. Scoped via the parent
  `Competitor` relation (DELETE already cascades).
- `PlatformCredential` cross-tenant fallback in `listening/sync` and
  `competitors/sync` — covered by Finding 1/4 separately.
- `/api/linkbio` GET — explicitly left public per task instruction.
- `/api/linkbio/[id]/click` — explicitly left public (visitor click tracking).

## Stage Summary
- 5 schema models gained `customerId String?` + `@@index([customerId])`.
- 14 route handlers (GET/POST/PATCH/DELETE across 7 route files) gained
  `requireAuth` + `getTenantScope` + tenant-scoped `findFirst` guards.
- 4 routes that already had `requireAuth` (`listening/[id]/reply`,
  `listening/sync`, `competitors/sync`, `influencers/search`) gained
  tenant-scoped DB queries via `tenantWhere(scope)`.
- Cross-tenant IDOR for the entire listening/hashtags/influencers/competitors/
  linkbio module is now closed: any tenant user can only read/write their own
  tenant's rows. Super-admins (role=admin, customerId=null) bypass the filter
  and see all rows, matching the existing `getTenantScope` contract.
- Lint clean. Prisma schema valid. No db:push run.
