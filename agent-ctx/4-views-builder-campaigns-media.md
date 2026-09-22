# Task ID 4 — `views-builder-campaigns-media`

## Task
Build two `"use client"` view components for the Prism Next.js 16 social-media management app:
1. `src/components/views/campaigns.tsx` — `CampaignsView` consuming `/api/campaigns`
2. `src/components/views/media-library.tsx` — `MediaLibraryView` consuming `/api/media`

Both follow the existing Apple macOS-27 "liquid glass" aesthetic established by `dashboard.tsx`.

## Previous work consulted
- `/home/z/my-project/worklog.md` (architecture, design system, all prior tasks)
- `src/components/views/dashboard.tsx` (canonical visual style)
- `src/components/views/team.tsx`, `src/components/views/accounts.tsx` (GlassCard + Dialog + DropdownMenu patterns)
- `src/components/glass/glass-card.tsx`, `name-avatar.tsx`, `platform-badge.tsx`
- `src/lib/hooks.ts` (`useApi`, `fmt`, `timeAgo`), `src/lib/store.ts` (`useNav`), `src/lib/types.ts`
- `src/app/api/campaigns/route.ts`, `src/app/api/media/route.ts` (verified shapes)
- `src/components/app-shell.tsx` (confirmed both views are already imported & switched)
- `prisma/seed.ts` (discovered preset image URLs at `https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/*.jpg`)

## Deliverables
- `src/components/views/campaigns.tsx` (21 KB) — `CampaignsView` named export, `"use client"`
- `src/components/views/media-library.tsx` (34 KB) — `MediaLibraryView` named export, `"use client"`

## CampaignsView features
- Hero GlassCard with primary+teal ambient blur + `liquid-pill` "New Campaign" button
- KPI strip: Active / Total budget ($K/M) / Completed / Drafts
- Status filter pills (All/Active/Draft/Paused/Completed) with counts
- Responsive grid `sm:grid-cols-2 xl:grid-cols-3` of `GlassCard hover` cards:
  - colored left accent bar (uses `campaign.color`)
  - color-coded status badge with pulsing dot
  - kebab dropdown (Edit/Duplicate/Archive — toast only)
  - 2-line description clamp
  - objective tag (icon) + budget pill
  - date range via date-fns (null-safe)
  - budget utilization mini gradient progress bar (40–70% from id hash)
  - "View posts" footer → `setView("calendar")`
- CreateCampaignDialog: name, description, 8-swatch color picker, objective Select, budget Input, startDate/endDate date Inputs, ownerId default "u-admin"; POSTs to `/api/campaigns` then `reload()`.

## MediaLibraryView features
- Hero with teal+primary blur + Upload liquid-pill
- KPI strip: Total assets / Total size (MB/GB) / Folders / Images
- Layout `lg:grid-cols-[240px_1fr]`:
  - **Folder sidebar**: All + root + each API folder, with counts; collapses to horizontal scrollable pill bar on mobile; "New folder" toast-only.
  - **Main area**: toolbar (search + grid/list toggle) + grid or list view.
- **Grid view** (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`): aspect-square thumbnails with type icon top-left, size badge top-right, hover overlay (name + Wand2 "Use" pill → `openComposer()`), name + tag pills below.
- **List view**: sticky-header table inside `max-h-[70vh]` scroll-liquid body, columns Asset/Folder/Size/Date/Use.
- **UploadDialog**: URL + name + tags + type Select + folder Select, plus 6 preset library thumbnails (one-click add from `z-cdn.chatglm.cn`).
- **AssetDetailDialog**: large aspect-video preview, metadata 4-grid (size/dimensions/folder/uploaded date), tag pills, URL code block, action buttons (`liquid-pill` Use in composer / outline Copy URL via clipboard / ghost Delete — toast only).

## Quality
- TypeScript strict, no `any`. Interfaces declared for all API shapes.
- Both components marked `"use client"`.
- Removed `// eslint-disable-next-line @next/next/no-img-element` directives (the rule is disabled project-wide so the directives are flagged as unused). Final lint: **0 errors, 0 warnings**.
- Mobile-first responsive (grid cols adapt, sidebar collapses to scroll, list table hides columns at sm/md).
- Reused only existing design-system primitives: `GlassCard`, `KpiCard`, `useApi`, `useNav`, `cn`, shadcn `Dialog`/`Select`/`Input`/`Label`/`Button`/`DropdownMenu`.
- Color palette consistent: rose primary, teal `oklch(0.74 0.18 165)`, magenta `oklch(0.66 0.22 305)`, amber `oklch(0.78 0.18 75)`, green `oklch(0.76 0.18 145)`.

## Lint result
`cd /home/z/my-project && bun run lint 2>&1 | tail -30` → **0 errors, 0 warnings**.

## Notes for downstream agents
- The dev server still reports "module not found" for `reports`, `link-bio`, `competitors`, `hashtags`, `listening`, `approvals` views — these are referenced in `app-shell.tsx` but not yet built. They are out of scope for Task ID 4.
- `CampaignsView` and `MediaLibraryView` are already wired into `app-shell.tsx` and will render immediately when the user navigates to "Campaigns" or "Media" in the sidebar.
- Campaign color picker uses both raw hex (`#E1306C`, `#F97316`, `#14B8A6`) and oklch() strings — the accent bar and ambient blur apply the value directly via inline `style`.
- Asset detail "Copy URL" uses `navigator.clipboard.writeText` with proper Promise + toast fallback if the browser does not support it.
