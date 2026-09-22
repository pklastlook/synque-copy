# Task 7 — CalendarView & InboxView (views-builder)

**Task ID**: 7
**Agent name**: views-builder (calendar + inbox)
**Task**: Build two `"use client"` view components for the Prism Social app — `CalendarView` (data: `/api/posts`) and `InboxView` (data: `/api/inbox`) — matching the macOS-27 liquid-glass aesthetic already established in `dashboard.tsx`.

## Files created
- `/home/z/my-project/src/components/views/calendar.tsx` — exports `CalendarView`
- `/home/z/my-project/src/components/views/inbox.tsx` — exports `InboxView`

## CalendarView
- Real month grid (Mon–Sun) using `date-fns` (`startOfMonth`, `endOfMonth`, `startOfWeek`, `endOfWeek`, `eachDayOfInterval`, `isSameMonth`, `isSameDay`, `isToday`, `addMonths`, `subMonths`, `format`).
- Prev/next chevrons + "Today" + "New Post" (calls `openComposer()` from `useNav`) + status filter pills (All / Scheduled / Published / Drafts).
- Cells: `min-h-[96px] rounded-xl border border-border/30 bg-muted/20 p-1.5`. Today gets `bg-primary text-primary-foreground` day-number pill + primary border. Up to 3 post chips per cell (PlatformBadge thumbnail + truncated title + HH:mm), "+N more" overflow.
- Effective date per post: published → first variant's `publishedAt`; scheduled → `scheduledAt`; draft → `createdAt`.
- Container: `GlassCard strong` with glass-sheen + ambient blur blob. Mobile-safe horizontal scroll (`min-w-[620px]` inside `overflow-x-auto scroll-liquid`).
- KPI strip on top: Scheduled / Published this month + Drafts (KpiCards).
- Right sidebar: selected-day detail with media thumbnail, title, caption, author NameAvatar, time, all variant PlatformBadges, status pill. Empty state when no posts.

## InboxView
- Two-pane layout `lg:grid-cols-[380px_1fr]`; conversation list left, detail right (stacks on mobile).
- Top filter bar: pill tabs (All / Unread / Comments / Messages / Mentions). Unread tab → `?filter=unread`; others fetch `/api/inbox` and filter client-side by `type`.
- Unread badge with pulsing dot + per-tab badge count.
- List rows: PlatformBadge (size 32) + sentiment dot, NameAvatar + author, 1-line text, timeAgo, replied checkmark. Selected row → `ring-2 ring-primary bg-muted/40`.
- List scrollable: `max-h-[70vh] overflow-y-auto scroll-liquid`.
- "Mark all read" button when unread items exist (PATCHes each then `reload()`).
- Detail pane: avatar + author + sentiment chip + PlatformPill + time; message body in nested GlassCard; assignee row; 2 mock suggested replies that pre-fill the textarea; "Mark replied" (PATCH then reload) and "Send" (`toast.success("Reply sent")`) buttons.
- Empty state with `Inbox` lucide icon when nothing selected.
- Sentiment colors: positive → `bg-emerald-500/15 text-emerald-500`; neutral → `bg-muted text-muted-foreground`; negative → `bg-rose-500/15 text-rose-500`.

## Quality
- Strict TypeScript with `Comment` / `Post` types from `@/lib/types`. No `any`.
- Both components `"use client"`.
- `eslint-disable-next-line @next/next/no-img-element` placed before the single `<img>` in `calendar.tsx` (rule is disabled in this project's ESLint config — produces a harmless unused-disable warning that matches the existing pattern in `name-avatar.tsx`, `composer.tsx`, `dashboard.tsx`).
- Reused only existing design-system primitives: `GlassCard`, `KpiCard`, `SectionTitle`, `PlatformBadge`, `PlatformPill`, `NameAvatar`, `useApi`, `timeAgo`, `useNav`, `cn`.
- Skeletons use `shimmer` class.
- Mobile-first responsive; calendar horizontally scrollable on narrow screens.

## Lint
`bun run lint` → **0 errors, 6 warnings** (all unused-disable-directive warnings project-wide because `@next/next/no-img-element` is disabled). No new errors introduced.

## Stage summary
Both views complete and ready for the app-shell switcher (already wired in `app-shell.tsx`). No new API routes or pages. Only the two view components were added.
