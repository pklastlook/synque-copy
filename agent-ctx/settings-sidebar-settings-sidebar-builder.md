# Agent record — Task ID `settings-sidebar`

**Agent name**: `settings-sidebar-builder`
**Task**: Restructure the Settings nav so the main sidebar's "Settings" item becomes an expandable parent with sub-section children (Profile, Workspace, Appearance, Team Roles, Notifications, Security, Platforms, Integrations, Billing, Data & Privacy, Danger Zone). Move the settings page's internal left-vertical nav out of the view and drive the active sub-section from the Zustand store instead. Single `/` route, obsidian + emerald "Crystal UI" aesthetic.

## Files modified
1. `/home/z/my-project/src/lib/store.ts` — added `settingsTab`, `setSettingsTab`, `settingsExpanded`, `toggleSettings` to the `useNav` Zustand store.
2. `/home/z/my-project/src/components/views/settings.tsx` — exported `SETTINGS_TABS` + `SettingsTab` type, removed the in-page left nav, switched `SettingsView` to read the active tab from `useNav().settingsTab`, full-width single-panel layout, breadcrumb header.
3. `/home/z/my-project/src/components/app-sidebar.tsx` — removed the flat "Settings" NAV entry, added a `<SettingsGroup />` expandable parent with animated chevron and sub-items.

## What was built

### `useNav` store additions (`src/lib/store.ts`)
- `settingsTab: string` (default `"team-roles"` — showcases the team-roles section so reviewers see the most distinctive panel on first visit).
- `setSettingsTab: (tab: string) => void`.
- `settingsExpanded: boolean` (default `false`).
- `toggleSettings: () => void` — flips `settingsExpanded`.

### `SETTINGS_TABS` export (`src/components/views/settings.tsx`)
- Promoted the previously module-local `TABS` array to an exported const `SETTINGS_TABS: SettingsTabDef[]`. Shared between the sidebar (sub-items) and the settings view (lookup for breadcrumb + dispatch).
- Updated the icon mappings per the task spec: `Security → Shield`, `Platforms → AtSign`, `Integrations → Plug` (previously `ShieldCheck`, `Plug`, `Zap` respectively). `ShieldCheck`, `Plug`, `Zap` remain imported because they're used elsewhere in the file (2FA section, "Connect new" button, Zapier integration row).
- `SettingsTab` and `SettingsTabDef` interfaces are now `export`ed so the sidebar can type its click handler.
- Added `SECTION_DESC: Record<SettingsTab, string>` so the breadcrumb header shows a contextual one-line description per section.

### `SettingsView` rewrite
- Removed `const [tab, setTab] = React.useState<SettingsTab>("team-roles")` — the tab is now store-driven.
- Removed the `<nav>` left-rail with `TABS.map(...)` (the in-page vertical nav).
- Removed the `lg:grid-cols-[230px_1fr]` grid layout — the view is now a single full-width column.
- Replaced the old "Workspace configuration" header with a breadcrumb header: `Settings › {active label}` (with the section's icon). Title and description both update per active sub-section.
- The content panel (`min-w-0 space-y-4`) renders exactly one `<*Section />` based on the store-driven `tab`. All 11 section components (Profile, Workspace, Appearance, TeamRoles, Notifications, Security, Platforms, Integrations, Billing, Data, Danger) are preserved unchanged — they each still ship their own `GlassCard` with `crystal-in` entrance.

### `AppSidebar` rewrite (`src/components/app-sidebar.tsx`)
- Removed the `{ id: "settings", ... }` entry from the flat `NAV` array.
- Added `ChevronDown` to the lucide-react imports.
- Added `import { SETTINGS_TABS, type SettingsTab } from "@/components/views/settings"`.
- Destructured `settingsTab`, `settingsExpanded`, `toggleSettings`, `setSettingsTab` from `useNav()`.
- Rendered a `<SettingsGroup />` component as the last child of the "Workspace" group's button list. It appears below Accounts / Team / Mail Server, exactly where the old flat Settings entry sat — so existing nav muscle memory still works.
- The user card's gear button at the bottom now also expands the settings tree on click (in addition to navigating to the settings view), so users always see where they landed.

### `<SettingsGroup />` component
Props: `active`, `expanded`, `toggle`, `setView`, `settingsTab`, `setSettingsTab`, `onNavigate`.

Behavior:
- **Parent row** uses the exact same styling as the other top-level nav buttons (`crystal-sweep`, `bg-primary/15 text-primary` + inset ring when active, hover-lift otherwise). Left emerald rail appears when active.
- Clicking the parent: `setView("settings")` + `toggle()` (flips `settingsExpanded`) + `onNavigate?.()` (closes the mobile sheet).
- A `ChevronDown` icon on the right rotates 180° when expanded (`transition-transform duration-300 ease-out`).
- **Sub-items container** is wrapped in a `div` with `overflow-hidden` and a `transition-[max-height,opacity] duration-300 ease-out` — animates from `max-h-0 opacity-0` → `max-h-[640px] opacity-100`. The inner panel is a `crystal-in` glass-tinted box with a subtle `border-border/30` so the children read as a nested group.
- Each sub-item: indented (`pl-7`), smaller text (`text-[13px]`), icon (`h-3.5 w-3.5`) + label. Click sets `view="settings"`, `settingsTab=t.id`, keeps the group expanded (so the user can see the active sub-section highlighted), and calls `onNavigate?.()` to close the mobile sheet.
- **Active sub-item** highlights with the same emerald treatment (`bg-primary/15 text-primary shadow-[inset_0_0_0_1px_var(--ring)]`).
- **Danger Zone** sub-item is visually distinct: rose tint when active (`bg-rose-500/15 text-rose-500`), muted rose when inactive (`text-rose-500/70 hover:bg-rose-500/10 hover:text-rose-500`). This preserves the "destructive" affordance that the old in-page nav had (Danger Zone section was always styled differently).
- `aria-expanded` on the parent button + `aria-controls="settings-subnav"` + `aria-current="page"` on the active sub-item for screen-reader support.

## Design-system fidelity
- Uses only existing primitives: `cn`, `useNav`, `GlassCard`, `SectionTitle`, shadcn UI components, lucide-react icons. No new globals or routes.
- Obsidian + emerald palette preserved: `bg-primary/15 text-primary`, `shadow-[inset_0_0_0_1px_var(--ring)]`, emerald rail `bg-primary shadow-[0_0_8px_var(--ring)]`.
- `crystal-in` entrance on the sub-items container matches the rest of the app's animation language.
- Mobile: the `<SettingsGroup />` is rendered inside the same `nav` as everything else, so it appears correctly inside the mobile `Sheet` (which uses the same `<AppSidebar />`). The `max-h-[640px]` is enough to show all 11 sub-items in the 280px-wide mobile sheet.

## Lint / TS check
- `bun run lint` → `$ eslint .` exit 0, **0 errors / 0 warnings**.
- Dev server log shows successful recompiles after the changes; `/api/users` (consumed by `TeamRolesSection`) returns 200.

## Verification notes
- `useNav().settingsTab` defaults to `"team-roles"`, so the first time a user opens Settings they see the Team Roles & Permissions panel — the most distinctive section of the settings view (rich member grid + permissions matrix + invite dialog).
- Clicking the parent toggles expand without losing the current sub-section (it just shows/hides the children list).
- Clicking a sub-item always keeps the group expanded — there's no auto-collapse, so navigating between sub-sections is fast and the user always sees where they are in the tree.
- The user-card gear button at the bottom of the sidebar also expands the tree on first click (only if not already expanded), so users who use that entry point aren't dropped into a collapsed tree.
- All 11 sections (including Danger Zone) remain reachable. The Danger Zone styling in the sidebar mirrors the rose-tinted danger styling used inside the settings view itself.
