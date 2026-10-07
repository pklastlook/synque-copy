# Task ID: MODULE-RIGHTS — Module rights selector in user creation + sidebar enforcement

**Agent**: subagent
**Scope**: Per-user module rights — selector UI in Owner Panel + Team view, API storage + parsing, sidebar enforcement.

## What was built

### 1. New central registry — `src/lib/module-permissions.ts`
- `MODULE_GROUPS` constant — all 28 sidebar modules grouped into 6 categories (Overview, Content, Communication, Insights, Workspace, Admin). Each group carries an accent oklch color for the selector UI.
- `ALL_MODULE_IDS` — flat list for select-all math.
- `defaultPermissionsForRole(role)` — role-based defaults:
  - admin → `["*"]`
  - manager → all except admin/owner
  - editor → content + communication modules
  - member → dashboard, composer, calendar, inbox
  - viewer → dashboard
- `hasModuleAccess(permissions, moduleId)` — frontend access check used by the sidebar. Three-tiered:
  1. Empty/null → all access (backward compat for users created before this feature).
  2. `["*"]` → wildcard.
  3. Module ID directly OR legacy `"module:action"` prefix match (e.g. `"dashboard:read"`).
- `parsePermissions(rawJson)` — safely parses the DB string column into `string[]`.
- `isAllModules(permissions)` + `describePermissions(permissions)` — helpers for the "Modules" column.

### 2. New reusable component — `src/components/glass/module-access-selector.tsx`
- `ModuleAccessSelector` — controlled component (parent owns `permissions: string[]` + `onChange`).
- Renders all modules grouped by category, each with a `Checkbox`, plus Select-all / Clear-all chips per group and Select-all / Clear at the top.
- Auto-upgrades to `["*"]` when every module is ticked.
- Auto-downgrades from `["*"]` to the explicit list when one is toggled off.
- Glass morphism styling — `crystal-in` cards, primary-tinted backgrounds, oklch accent dots.

### 3. Backend — auth + team endpoints
- `src/lib/auth-store.ts` — added `permissions?: string[]` to `AuthUser`.
- `src/lib/auth-session.ts` — `issueSession` accepts `permissions` (raw DB string), parses it via `parsePermissions`, includes the array in `userPublic`.
- `src/app/api/auth/login/route.ts` — selects `permissions` from the DB.
- `src/app/api/auth/2fa/login/route.ts` — selects `permissions`.
- `src/app/api/auth/me/route.ts` — selects `permissions` + parses for the response payload.
- `src/app/api/auth/signup/route.ts` — selects `permissions`.
- `src/app/api/auth/demo/route.ts` — added `permissions` to `DemoUser` interface + `DEMO_SELECT`.
- `src/app/api/team/route.ts` — POST now accepts `permissions` in the body. Defaults to role-based preset when omitted. Stores as `JSON.stringify(...)`. GET now returns `permissions` (parsed) on every team member.
- `src/app/api/team/[id]/route.ts` — PATCH accepts `permissions` (admin-only — managers cannot widen or narrow a teammate's module access).
- `src/app/api/users/route.ts` — already supported `permissions` in PATCH (no change needed); still admin-only.

### 4. Frontend — Owner Panel → Users tab (`src/components/views/owner.tsx`)
- `ClientUser` type now carries `permissions?: string[]`.
- New `formPermissions` state for the create-user dialog (defaults to the role-based preset for "member").
- Add User dialog:
  - Widened to `sm:max-w-2xl` with `max-h-[90vh] overflow-y-auto` so the selector fits cleanly.
  - Role dropdown now offers all 5 roles (viewer / member / editor / manager / admin) and resets `formPermissions` to the role default on change.
  - Added "Module Access" section (bordered glass card) housing the `ModuleAccessSelector`.
  - Sends `permissions: formPermissions` in the POST body.
- Edit User dialog:
  - Same widening + role expansion.
  - Loads the user's current permissions from the row state and feeds them to the selector.
  - Sends `permissions` in the PATCH body.
- User list rows: added a Modules pill before the action dropdown. Shows "All modules" (primary-tinted) when wildcard, otherwise "N modules" (or red "No module access" when empty). Clicking the pill opens the Edit dialog.

### 5. Frontend — Team view (`src/components/views/team.tsx`)
- `TeamMember` interface now carries `permissions?: string[]`.
- New `mPermissions` state for the Add Member dialog (defaults to role preset for "member").
- Add Member dialog:
  - Widened to `sm:max-w-2xl`.
  - Role dropdown resets `mPermissions` on change.
  - Added the Module Access section with `ModuleAccessSelector`.
  - Includes `permissions: mPermissions` in the POST body.
  - Reset on success back to the member default.
- `MemberRow` — added a compact Modules pill column (hidden below `lg:` breakpoint so the dense row stays scrollable).

### 6. Frontend — Sidebar enforcement (`src/components/app-sidebar.tsx`)
- Imported `hasModuleAccess` from `@/lib/module-permissions`.
- `visibleNav` filter now combines the existing role gate with the new module-rights gate.
- "New Post" primary button is hidden when the user lacks `composer` access.
- Owner Panel parent row is gated by `hasModuleAccess(userPermissions, "owner")` on top of the existing role check.
- Media Library expandable parent is gated by `hasModuleAccess(userPermissions, "media")`.
- Settings parent is gated by `hasModuleAccess(userPermissions, "settings")`.
- Organization parent is gated by `hasModuleAccess(userPermissions, "organization")`.
- Settings gear shortcut in the user card is gated by `hasModuleAccess(userPermissions, "settings")`.

## Backward compatibility
- Existing users with `permissions = null` (or empty array) keep ALL access — the sidebar's `hasModuleAccess` returns `true` for any module when permissions is empty. No existing admin or team member loses sidebar items just because they were created before this feature shipped.
- Demo viewer (legacy `"dashboard:read"` format) is preserved — the prefix-match fallback in `hasModuleAccess` treats `"dashboard:read"` as a permission to see the `dashboard` module.
- New admins (signup) still get `["*"]` out of the box via the existing `JSON.stringify(["*"])` in the signup route, which is consistent with the new `defaultPermissionsForRole("admin")`.

## Verification
- `bun run lint` — 0 errors, 7 pre-existing warnings (all `no-location-assign-relative-destination` in unrelated files: landing-page, landing-shared, accounts, settings).
- `bunx tsc --noEmit` — 3 pre-existing errors in unrelated files (oauth callback, quotations route, sync-platforms). My code introduces no new TS errors.

## Files touched
1. `src/lib/module-permissions.ts` — NEW
2. `src/components/glass/module-access-selector.tsx` — NEW
3. `src/lib/auth-store.ts`
4. `src/lib/auth-session.ts`
5. `src/app/api/auth/login/route.ts`
6. `src/app/api/auth/2fa/login/route.ts`
7. `src/app/api/auth/me/route.ts`
8. `src/app/api/auth/signup/route.ts`
9. `src/app/api/auth/demo/route.ts`
10. `src/app/api/team/route.ts`
11. `src/app/api/team/[id]/route.ts`
12. `src/components/views/owner.tsx`
13. `src/components/views/team.tsx`
14. `src/components/app-sidebar.tsx`

## Notes for the next agent
- The Prisma schema's `User.permissions` column already exists as `String?` (JSON array) — no migration was needed.
- The `defaultPermissionsForRole` function returns `string[]` (not `ModuleId[]`) because the admin path returns `["*"]` which isn't a `ModuleId`.
- The sidebar's existing role gate (`n.roles?.includes(userRole)`) is preserved — module rights are an *additional* layer, not a replacement. A "manager" with no `team-performance` permission still loses that nav item even though their role would normally allow it.
- The `OrganizationGroup` parent has its own permission gate (for the `organization` module) — but the sub-items inside it (Overview / Users / Team / Roles / Departments / Designations) are NOT individually gated. The whole group shows or hides as a unit. Future iteration could add per-sub-tab gating if needed.
