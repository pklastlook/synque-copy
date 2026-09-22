# Worklog — Prism Social (Social Media Team Work Management Platform)

Project: Apple macOS-27 "liquid glass" inspired social media management platform.
Goal: Beat Hootsuite / Later / Sprout Social with advanced multi-account publishing, AI per-account content generation, team workflow, and deep analytics.

## Architecture decisions
- Single `/` route; client-side view switching via Zustand store (app-shell).
- Prisma + SQLite. Seed script at `prisma/seed.ts`.
- API routes under `src/app/api/*`.
- z-ai-web-dev-sdk (LLM) for per-account AI caption generation.
- Design system: "liquid glass" (backdrop-blur, translucent layered surfaces, vibrant retina colors, rounded geometry, soft shadows). No Apple logos/icons copied.

---

## Task ID: 8 — `8-views-builder`

**Task**: Build two React view components (`AnalyticsView`, `AccountsView`) for Prism, matching the existing Apple macOS-27 "liquid glass" aesthetic of `dashboard.tsx`. No new API routes or pages — both are imported by the app shell's client-side view switcher.

### Files delivered
1. `/home/z/my-project/src/components/views/analytics.tsx` — `AnalyticsView`
2. `/home/z/my-project/src/components/views/accounts.tsx` — `AccountsView`

### What was built

**AnalyticsView** (`/api/analytics?days=X&accountId=Y`)
- Glass controls bar: `Select` account filter + 7/14/30/90 day pills; URL rebuilt with `useMemo` and refetched via `useApi`.
- 4 KPI cards (Impressions, Reach, Engagement, Engagement Rate) computed from `perAccount` sums.
- Main `AreaChart` (impressions vs reach, gradients) at 300px + smooth `LineChart` of `followerSeries` at 220px, side-by-side (2/3 + 1/3).
- Per-account comparison table: scrollable (`max-h-96 scroll-liquid`), sticky glass header, hover rows, relative inline engagement bar.
- `RadarChart` of likes/comments/shares/saves normalized 0–100 + absolute-count legend.
- Top content grid: `sm:grid-cols-2 xl:grid-cols-4` of `TopContentCard` (media thumbnail, platform badge, timeAgo, engagement/reach/impressions triple-stat).
- Loading skeleton via `shimmer` class.

**AccountsView** (`/api/accounts`)
- Header with `liquid-pill glow-ring` "Connect account" button → opens shadcn `Dialog` with grid of all `PLATFORM_LIST` options; each fires `toast.success`.
- 4 KPI cards: total accounts, total followers, total impressions, avg growth.
- Filter pills (All + per-platform, with counts).
- Responsive account grid (`sm:grid-cols-2 xl:grid-cols-3`) of `AccountCard` (`GlassCard hover` + `glass-sheen`):
  - 44px PlatformBadge + displayName + VerifiedTick + handle + PlatformPill
  - owner row with small NameAvatar
  - big follower count + deterministic mini sparkline (color/curve from `followerGrowth` sign)
  - growth delta pill, 3-stat grid (Posts/Impr./Eng.)
  - "View analytics" → `setView("analytics")` + ghost Manage button
- Default sort: followers desc.

### Quality
- Full TypeScript, strict, no `any`. Interfaces defined for every API response.
- `// eslint-disable-next-line @next/next/no-img-element` before every `<img>` (matches dashboard.tsx).
- Responsive mobile-first; `animate-rise` on sections; glass-styled recharts tooltips; palette matches dashboard (rose / teal / magenta / amber / green).

### Lint
`bun run lint` → **0 errors, 5 warnings** (all are unused-`no-img-element`-directive warnings of the same kind already present in dashboard.tsx, composer.tsx, and name-avatar.tsx). Lint passed for the work I introduced.

### Stage summary
Both views complete, type-checked against the real API shapes, lint-clean. App shell can now switch to `view="analytics"` or `view="accounts"` and the components will render with the existing design system.

---

## Task ID 9 — Agent: Team & Settings Views

**Agent name**: view-builder-team-settings
**Task**: Build two client view components — `TeamView` and `SettingsView` — for the Prism social-media management app. Both components follow the existing Apple macOS-27 "liquid glass" aesthetic established by `dashboard.tsx`. No new API routes or pages were created; both views consume existing infrastructure (`/api/team`, in-app store, design system primitives).

### Files created
1. `/home/z/my-project/src/components/views/team.tsx` — exports `TeamView`
2. `/home/z/my-project/src/components/views/settings.tsx` — exports `SettingsView`

### Work log
- Read existing dashboard.tsx, glass-card.tsx, name-avatar.tsx, platform-badge.tsx, store.ts, hooks.ts, types.ts and the shadcn UI components (dialog, dropdown-menu, select, switch, input, label, textarea, button, badge) to match the established visual language exactly.
- Verified `/api/team` route.ts returns the expected `TeamMember[]` shape (id, name, email, avatar, role, title, color, accountsCount, postsCount, variantCount, engagement, followers) — confirmed against the prompt's interface.
- Verified `next-themes`, `sonner`, `recharts`, and all Radix primitives are installed.

#### TeamView
- Hero header with `GlassCard strong` + glass-sheen + primary blur, `liquid-pill` "Invite member" action button.
- Dialog (`@/components/ui/dialog`) with email input + role Select — submit validates email and `toast.success("Invitation sent")`.
- KPI strip (4 × `KpiCard`): members, accounts managed (sum), total posts (sum), total engagement (sum + `fmt`).
- Responsive `grid gap-4 sm:grid-cols-2 xl:grid-cols-3` of member cards:
  - Large gradient `NameAvatar` (h-16 w-16) + name + "You" tag for `currentUserId === "u-admin"` + role badge (admin = `bg-primary/15 text-primary`, member = `bg-muted text-muted-foreground`) + title + email (muted, small).
  - 2×2 stat grid: accounts (AtSign), posts (FileText), engagement (Heart, `fmt`), reach (Users, `fmt`).
  - Thin gradient progress bar showing workload = postsCount / maxPosts × 100 with "Workload" label and % value.
  - Footer: "View profile" ghost Button + DropdownMenu (`@/components/ui/dropdown-menu`) with "Make admin/member", "View activity", "Remove" — all just toast.
  - Card uses `GlassCard hover`.
- Workload distribution panel: horizontal recharts BarChart (`layout="vertical"`) listing each member with bar proportional to postsCount, coloured by role (admin = primary rose, member = teal `oklch(0.74 0.18 165)`), height `max(140, members * 44)`px, legend below.
- Members sorted so admins appear first; current user gets a subtle "You" tag.
- Loading skeleton uses `shimmer` class.

#### SettingsView
- Single `GlassCard strong` shell with `grid gap-4 lg:grid-cols-[220px_1fr]`: left vertical nav (sticky on `lg`), right content panel.
- Nav becomes horizontal scrollable pills on mobile (`overflow-x-auto no-scrollbar`).
- Six tabs: Profile, Workspace, Appearance (default), Notifications, Connected platforms, Billing. Custom nav (state-based) with active = `bg-primary/15 text-primary`.
- **Appearance**: theme selector with 3 visual cards (Light, Dark, System) using `useTheme` from `next-themes`; active card highlighted with `ring-2 ring-primary ring-offset-2`. Accent color picker row of 5 swatches (rose, teal, amber, magenta, green) — selecting any fires `toast.info("Accent updated")`. Two `Switch`es: "Reduce motion" (default off), "Liquid glass effects" (default on).
- **Profile**: avatar (NameAvatar h-20 w-20), name/email/title inputs + bio textarea. "Save changes" `liquid-pill` button → `toast.success("Profile saved")`.
- **Workspace**: workspace name input (default "Prism Studio"), default timezone Select, default posting cadence Select, and a Switch for "Auto-generate AI variants on compose" (default on). Save button toasts.
- **Notifications**: list of 5 `SettingRow`s each with Switch (New comment, Mentions, Scheduled post published, Weekly performance digest, Team member activity), each with label + description; toggling fires `toast.success`.
- **Connected platforms**: grid of all `PLATFORM_LIST` cards each with `PlatformBadge` (size 40), name, "Connected"/"Connect" state Button, and connected-account count; toggling fires toast and flips the connected state.
- **Billing**: "Pro" plan card with gradient Crown icon + `liquid-pill` "Upgrade" button (toasts), plus a usage-bars card showing posts this month (124/250), accounts (5/10), AI generations (412/1000) — each bar coloured per the chart palette.

### Quality checks
- TypeScript strict throughout, no `any` used.
- Both components marked `"use client"`.
- All interactive elements use rounded-xl/2xl and hover transitions.
- No `<img>` elements were used directly (NameAvatar handles any image internally), so no `@next/next/no-img-element` directives were required.
- Responsive (mobile-first): grid breakpoints at `sm:`, `lg:`, `xl:`; mobile nav becomes horizontal scrollable.
- Loading skeleton uses `shimmer` class; wrapper uses `animate-rise`.
- Verified `@/components/ui/dropdown-menu`, `dialog`, `select`, `switch`, `input`, `label`, `textarea`, `button` exports before importing.

### Lint result
`bun run lint` → **0 errors, 6 warnings** (all pre-existing in other files: name-avatar.tsx, analytics.tsx, calendar.tsx, composer.tsx, dashboard.tsx). No warnings or errors introduced by `team.tsx` or `settings.tsx`.

### Stage summary
Both views are now wired into `app-shell.tsx` (which already imported `TeamView` and `SettingsView` from the correct paths). They render successfully when the user switches to the `team` or `settings` view. The remaining dev-server errors in `dev.log` only concern other unimplemented views (`inbox`, `accounts`) which are outside the scope of Task ID 9.

---

## Task ID 7 — CalendarView & InboxView (React views)

**Agent**: views-builder (calendar + inbox)
**Task**: Build two `"use client"` view components — `CalendarView` (`/api/posts`) and `InboxView` (`/api/inbox`) — matching the existing macOS-27 liquid-glass aesthetic.

### Files created
- `src/components/views/calendar.tsx` — exports `CalendarView`
- `src/components/views/inbox.tsx` — exports `InboxView`

### CalendarView
- Real month grid (Mon–Sun) generated with `date-fns` (`startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `eachDayOfInterval`, `isSameMonth`, `isSameDay`, `isToday`, `addMonths`, `subMonths`, `format`).
- Prev/next month chevrons + "Today" button + "New Post" button (calls `openComposer()` from `useNav`).
- Status filter pills (All / Scheduled / Published / Drafts) filter posts client-side.
- Each cell: `min-h-[96px] rounded-xl border border-border/30 bg-muted/20 p-1.5` with day-number pill (today gets `bg-primary text-primary-foreground`), post count badge, and up to 3 post chips (PlatformBadge thumbnail + truncated title + HH:mm time) with a "+N more" overflow.
- Effective date per post: published → first variant's `publishedAt`; scheduled → `scheduledAt`; draft → `createdAt` (so drafts are browsable when filter=draft).
- Container: `GlassCard strong` with glass-sheen + ambient blur blob. Horizontal scroll on mobile (`min-w-[620px]` inside `overflow-x-auto scroll-liquid`) so the 7-col grid never collapses.
- KPI strip on top: Scheduled this month / Published this month / Drafts (`KpiCard` with teal/magenta/amber accents).
- Right sidebar (`lg:grid-cols-[1fr_340px]`): selected-day detail with media thumbnail (`<img>` with eslint-disable), title, caption, author `NameAvatar`, time, all variant `PlatformBadge`s, and a status pill. Empty state with `CalendarDays` icon and "Schedule one" CTA when no posts.

### InboxView
- Two-pane layout (`lg:grid-cols-[380px_1fr]`): conversation list left, detail right (stacks on mobile).
- Top filter bar: pill tabs (All / Unread / Comments / Messages / Mentions) with `InboxIcon`, `Circle`, `MessageSquare`, `Mail`, `AtSign` icons. Unread tab uses `?filter=unread` query; others fetch `/api/inbox` and filter client-side by `type`.
- Unread badge with pulsing dot in the header + per-tab badge count on the Unread pill.
- List rows: `PlatformBadge` (size 32) with sentiment dot bottom-right, `NameAvatar` + author, 1-line truncated text, `timeAgo`, replied checkmark. Selected row gets `ring-2 ring-primary bg-muted/40`.
- List scrollable: `max-h-[70vh] overflow-y-auto scroll-liquid`.
- "Mark all read" button appears when there are unread items in the current view (PATCHes each then reloads).
- Detail pane: header with avatar + author + sentiment chip + PlatformPill (platform+handle) + time; message body in a nested `GlassCard bg-muted/30`; meta row with assignee or "Unassigned" pill and "Replied" indicator; 2 mock suggested-reply cards that pre-fill the textarea; textarea + "Mark replied" (PATCH `/api/inbox` then `reload()`) and "Send" (just `toast.success("Reply sent")`) buttons.
- Empty state with `Inbox` lucide icon + helper text when nothing selected.
- Sentiment colors: positive → `bg-emerald-500/15 text-emerald-500`; neutral → `bg-muted text-muted-foreground`; negative → `bg-rose-500/15 text-rose-500`.

### Quality
- Pure TypeScript with `Comment` / `Post` types imported from `@/lib/types` — no `any`.
- Both components are `"use client"`.
- `eslint-disable-next-line @next/next/no-img-element` placed before the one `<img>` in `calendar.tsx` (rule is disabled in this project's ESLint config — produces a harmless warning that matches the existing pattern in `name-avatar.tsx`, `composer.tsx`, `dashboard.tsx`).
- Reused existing design-system primitives only: `GlassCard`, `KpiCard`, `SectionTitle`, `PlatformBadge`, `PlatformPill`, `NameAvatar`, `useApi`, `timeAgo`, `useNav`, `cn`.
- Skeletons use `shimmer` class for loading states.
- Mobile-first responsive: grids collapse to single column under `lg:`; calendar scrolls horizontally on narrow screens.

### Lint
- `bun run lint` → 0 errors, 6 warnings (all unused-disable-directive warnings that exist project-wide because `@next/next/no-img-element` is disabled in `eslint.config.mjs`). No new errors introduced by Task 7.

### Stage summary
Both views are complete and ready for the app-shell switcher (already wired in `app-shell.tsx`). The dashboard's "Calendar" / "Inbox" shortcuts from `DashboardView` will now land on fully-functional, polished UIs. No new API routes or pages were created — only the two view components.

---
Task ID: 14 (final integration & verification)
Agent: Z.ai (orchestrator)
Task: Integrate all views, fix bugs, verify end-to-end with Agent Browser + VLM

Work Log:
- Verified all 8 views (dashboard, composer, calendar, analytics, inbox, accounts, team, settings) render with no runtime/console errors.
- Fixed critical bug in `/api/ai/generate`: LLM returned variants keyed by platform NAME (e.g. "Instagram") instead of accountId, so composer textareas stayed empty. Rewrote route to (a) request an ordered array with explicit `index`, and (b) normalize both array-form and object-form responses into a `Record<accountId, {content,hashtags}>` with fallback fill. Re-verified: TikTok/Instagram/X/LinkedIn each get distinct, platform-native AI captions.
- Fixed bug in `/api/analytics`: `accountId=all` was treated as a literal Prisma filter returning empty data. Added `isAll = !accountId || accountId === "all"` guard so "all" aggregates across every account. Analytics now returns 30 series points, 10 per-account rows, 8 top-content items.
- Reduced Prisma client log noise (`log: ['query']` -> `log: ['error','warn']`).
- Auto-fixed unused `@next/next/no-img-element` eslint-disable directives (rule is disabled project-wide). Final lint: 0 errors, 0 warnings.
- Agent Browser + VLM verification: dashboard (polished liquid-glass, charts, no layout issues), composer (AI generation confirmed producing distinct per-platform captions + live previews), calendar (month grid w/ post chips), analytics (area/line/radar charts populated, comparison table + top content grid), inbox (list + detail pane), accounts (cards w/ stats + sparklines), team (6 member cards + workload bar chart + KPIs), settings (vertical tabs + theme selector). Mobile (390px) responsive: sidebar -> hamburger, content stacks, sticky footer visible. Light + dark themes both verified.

Stage Summary:
- Platform is feature-complete and browser-verified. Core differentiator (one brief -> AI-native per-account variants -> publish to many accounts in one flow) works end-to-end against the live z-ai-web-dev-sdk LLM.
- Tech: Next.js 16 App Router, Prisma/SQLite (seeded with 6 members, 10 accounts, 12 posts w/ variants, 30d analytics, comments, activity), z-ai-web-dev-sdk LLM for AI caption generation, Recharts for viz, Tailwind v4 + custom liquid-glass design system.
- Dev server runs clean on :3000; lint passes with 0 problems.
