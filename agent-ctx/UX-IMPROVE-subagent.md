# UX-IMPROVE — subagent

**Task**: 5 UX improvements — grouped tabs, font sizes, empty states, onboarding, step wizard.

## Files modified
1. `src/app/globals.css` — base body `font-size: 13px`; `.label-caps` 11px; doc comment on `.num-display` (KPI minimum 18px).
2. `src/components/glass/dense-ui.tsx` — MetricRow `text-base → text-lg`, `text-lg → text-xl`; delta `text-[10px] → text-[12px]`; label `text-[9px] → text-[11px]`, `sm:text-[10px] → sm:text-[12px]`; DeltaBadge / Pill / NavCard labels `text-[10px] → text-[12px]`.
3. `src/components/views/owner.tsx`:
   - `OWNER_SECTIONS` reordered into 3 visual groups (Dashboard / Clients / System), each entry tagged with `category`.
   - `OWNER_CATEGORY_META` constant for group labels + accent colors.
   - `MobileNavSelect` renders group headers between sections (non-clickable `SelectContent` rows).
   - All `text-[8/9/10/11px]` bumped one step (only `text-[9/10/11px]` actually existed — became `text-[11/12/13px]`).
   - 6 bespoke empty-state blocks replaced with `<EmptyState>` (clients, invoices, quotations, devices, subscriptions, API keys, bank accounts — 7 in total).
   - `SubscriptionsTab` form refactored into a 3-step wizard: `renderStep1` (Plan), `renderStep2` (Pricing), `renderStep3` (Access); `StepIndicator` component; `step` state + `setStep` reset on open; Next/Back/Create-or-Save buttons in the dialog footer.
4. `src/components/views/dashboard.tsx`:
   - All `text-[8/9/10/11px]` bumped one step (4+20+17+23 = 64 substitutions).
   - 2 bespoke "No posts yet" / "Nothing published yet" blocks replaced with `<EmptyState>`.
   - `OnboardingChecklist` rendered at top of dashboard, above the hero header. 4 steps derived from `data.kpis.accounts`, `data.kpis.postsCreated.value`, `data.topContributors.length`, and a separate `useApi("/api/subscriptions")` fetch. Each step navigates to its corresponding view (`accounts`, `composer`, `team`, `owner`).
5. `src/components/glass/empty-state.tsx` (NEW) — reusable `EmptyState` (icon + title + description + optional CTA button, accessible `role="status"`).
6. `src/components/glass/onboarding-checklist.tsx` (NEW) — dismissible `OnboardingChecklist` with progress bar + step list. Dismissed state persisted to `localStorage["socialflow-onboarding-dismissed-v1"]`. SSR-safe hydration gate.
7. `src/components/app-sidebar.tsx` — `OWNER_SUBITEMS` reordered to match `OWNER_SECTIONS` (3 groups); `OWNER_GROUP_LABELS` constant; rendering loop now inserts a small uppercase group header (`Dashboard` / `Clients` / `System`) before each new group; `maxHeight` bumped 640→820px to fit 13 items + 3 headers; added `Database` + `Activity` icon imports.

## Verification
- `cd /home/z/my-project && bun run lint` → **0 errors, 7 warnings** (all pre-existing `@next/next/no-location-assign-relative-destination` warnings in `landing-page.tsx` ×3, `landing-shared.tsx` ×1, `accounts.tsx` ×2, `settings.tsx` ×1 — **none in the 5 files this task touched**).
- TypeScript: `bunx tsc --noEmit` shows 2 pre-existing errors in unrelated files (`oauth/callback/route.ts`, `sync-platforms.ts`) — none in any file touched by this task.
- Dev server NOT started (per task rules).
- No Prisma schema changes — `prisma db push` not needed.

## Stage Summary
All 5 UX improvements landed cleanly without regressing existing functionality:
1. **Grouped tabs** — sidebar + mobile dropdown now visually cluster the 13 owner sections into Dashboard / Clients / System groups. Sidebar also picked up the same grouping (plus group headers).
2. **Font sizes** — minimum body text 13px, minimum label 11px, KPI numbers 18px+. All `text-[8/9/10/11px]` patterns bumped one step across owner/dashboard/dense-ui.
3. **EmptyState** — reusable component added, 7+ bespoke empty blocks replaced with consistent accessible CTA-driven placeholder.
4. **OnboardingChecklist** — dismissible 4-step progress card on the dashboard top, auto-derived from existing dashboard data + a subscriptions probe, persisted to localStorage.
5. **Subscription wizard** — single 13-field form split into Plan / Pricing / Access steps with a `StepIndicator` and contextual Next/Back/Save buttons in both create + edit dialogs.
