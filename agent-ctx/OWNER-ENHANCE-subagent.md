---
Task ID: OWNER-ENHANCE
Agent: subagent
Task: Enhance owner module — Databases tab, Activity Log tab, enriched Overview + Customers

## Summary of work

### New backend API routes (all owner-only — `requireRole(req, "admin")` on every handler)

1. **`src/app/api/tenant-databases/route.ts`**
   - `GET` — lists every `TenantDatabase` row joined with `Customer` (name/email/status/plan) + live on-disk size via `pg_database_size()` (one round-trip to the Neon maintenance DB).
   - `POST` — provisions a dedicated Neon DB for an existing Customer (takes `{ customerId }`). Calls `provisionTenantDatabase()`, creates the `TenantDatabase` row, audits `tenant_database.provisioned`.

2. **`src/app/api/tenant-databases/[id]/route.ts`**
   - `PATCH` — updates status (active | suspended). Invalidates the cached tenant PrismaClient. Audits `tenant_database.status_changed`.
   - `POST` — re-pushes the Prisma schema. Decrypts the stored `dbUrl`, calls `pushSchemaToTenantDb(dbUrl)`. Audits `tenant_database.schema_pushed`.

3. **`src/app/api/audit-logs/route.ts`**
   - `GET` — filterable list of `AuditLog` rows joined with the acting `User`. Supports `action`, `actor` (ILIKE on name/email), `from`/`to` date range, `limit`/`offset`.

### Updated backend

- **`src/app/api/finance/overview/route.ts`** — extended the parallel fetch to also compute: `tenantDatabases`, `activeDatabases`, `suspendedDatabases`, `totalStorageMb`, `activityLogs` (total count), `trialConversionRate` (% converted from trial), `recentActivity` (last 5 audit log entries with actor name), `churnRiskCustomers` (tenant customers with at least one user inactive 30+ days).

### Updated frontend

- **`src/lib/store.ts`** — added `ownerDbFilter` + `setOwnerDbFilter` (one-shot cross-tab filter for the "View Database" action).

- **`src/components/views/owner.tsx`** (now ~4500 lines):
  - Imports: added `Activity, Play, Pause, RefreshCw, HardDrive, Search, History` from lucide-react; `formatDistanceToNow` from date-fns; `Table` family from `@/components/ui/table`.
  - Added `id` to the `Customer.database` field (was missing — type was inaccurate).
  - Added `AuditLogEntry`, `ChurnRiskCustomer`, `TenantDbRow` interfaces.
  - Extended BOTH `FinanceOverview` declarations (OverviewTab + FinanceTab) with: `tenantDatabases`, `activeDatabases`, `suspendedDatabases`, `totalStorageMb`, `activityLogs`, `trialConversionRate`, `recentActivity`, `churnRiskCustomers`.
  - `OWNER_SECTIONS` — added the two new tab entries per the task spec (with `countKey` so the MobileNavSelect shows counts).
  - Helpers: `auditActionTone(action)` → color dot/label; `prettyAction(action)` → "tenant_database.status_changed" → "Status changed".
  - **OverviewTab** — added a 4-metric KPI row (Tenant DBs / Storage / Trial→Paid % / Audit Events) + a 3-column section: tenant DB health card (4-cell grid), recent activity card (last 5 audit logs), churn risk card (top 6 churn-risk customers with lastActive + idle user count).
  - **CustomersTab** — added `useNav` hook, `provisioningId` state, `viewDatabase`/`provisionDatabase`/`trialDaysLeft` helpers. Per-card: DB status dot pill next to StatusPill, conditional "Trial expired / X days left in trial" amber/rose banner, "View Database" button (when DB exists) or full-width "Provision database" button (when no DB), and matching dropdown menu items.
  - **DatabasesTab** — 4-metric KPI row + filter bar (Clear filter pill + search input) + sticky-header scrollable Table. Columns: Database, Customer, Status, Size, Health (Healthy/Suspended/No size data), Created, Actions (re-push schema + suspend/activate toggle). Action buttons show spinners and are disabled while busy.
  - **ActivityLogTab** — filter bar (Action select populated from observed actions, Actor search, From/To date inputs, Clear filters button) + sticky-header scrollable Table. URL is memoized so the `useApi` hook re-fetches on every filter change. Columns: Action (color dot + pretty label + raw string + metadata JSON), Actor (NameAvatar + name + email), Target (type + ID), IP, When (date + time).
  - **OwnerView render** — wired in `{tab === "databases" && <DatabasesTab />}` and `{tab === "activity" && <ActivityLogTab />}`.

## Verification

- `bun run lint` → 0 errors, 7 pre-existing `no-location-assign-relative-destination` warnings (all in unrelated files: `landing-page.tsx`, `landing-shared.tsx`, `accounts.tsx`, `settings.tsx`).
- `npx tsc --noEmit` → only 2 pre-existing errors in `src/app/api/media/upload/route.ts` (unrelated `thumbnail` vs `thumbnailUrl` typo). All new code type-checks cleanly. The two merged `FinanceOverview` interface declarations merge without TS erroring (identical property types are accepted by TS interface merging).

## Files touched

New:
- `src/app/api/tenant-databases/route.ts`
- `src/app/api/tenant-databases/[id]/route.ts`
- `src/app/api/audit-logs/route.ts`

Modified:
- `src/app/api/finance/overview/route.ts`
- `src/lib/store.ts`
- `src/components/views/owner.tsx`
