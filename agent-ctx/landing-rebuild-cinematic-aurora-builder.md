# Task ID: landing-rebuild — `cinematic-aurora-builder`

**Agent**: cinematic-aurora-builder
**Task**: Rebuild `/home/z/my-project/src/components/landing-page.tsx` with a cinematic, futuristic, story-driven design ("Cinematic Aurora").

## Context loaded from `/agent-ctx`
- `4-views-builder-campaigns-media.md`, `6-views-builder-approvals-competitors.md`, `7-views-builder.md`, `8-views-builder.md` — dashboard view builders (AnalyticsView, AccountsView, etc.)
- `admin-panel-admin-panel-builder.md`, `reports-rebuild-views-builder.md`, `settings-sidebar-settings-sidebar-builder.md` — admin/settings work

None of the prior agents touched `landing-page.tsx`; this rebuild is independent and only edits that one file.

## Files delivered
- `/home/z/my-project/src/components/landing-page.tsx` — full rewrite (~1,500 lines, down from 2,685)

## What was built

### New `COLOR` constant
Near-black void (#030308) base + electric blue (#3B82F6) / violet (#8B5CF6) / teal (#06B6D4) / pink (#EC4899) / emerald (#10B981) / gold (#F59E0B) / rose (#F43F5E) accent palette. Each accent has an `A(alpha)` helper for `rgba()` generation.

### `AuroraBg` component (replaces `MysticOceanBg`)
Fixed full-screen animated gradient mesh:
- 4 drifting radial-gradient blobs at low opacity (0.4–0.55) with 80–95px blur, animated via `auroraDrift1/2/3/4` (22–28s ease-in-out alternate)
- SVG `feTurbulence` grain overlay at 3.5% opacity
- Edge vignette

### 10 new sections (story-driven, cinematic)
1. `CinematicNav` — floating glass pill, scroll-reactive
2. `Act1Hero` — massive headline + GlowCTA + 4-stat glass grid + `HeroDashboardMockup` with `floatY`
3. `Act2Problem` — 3 rose-accented pain cards + pain stats strip
4. `Act3Solution` — "Turn chaos into flow" gradient text + converging-dots CSS visualization
5. `Act4Features` — bento grid (6 cards with varied col-spans)
6. `Act5Workflow` — 4-step flow with animated gradient connector (desktop horizontal, mobile vertical)
7. `Act6SocialProof` — 4 stat cards + 3 testimonials + company logos row
8. `Act7Pricing` — 3-tier glass cards, Pro card with gradient border + "Most popular" badge
9. `Act8FinalCTA` — 3 vibrant animated orbs + gradient headline + GlowCTA
10. `Act9Footer` — 4 link columns + LogoWordmark + Twitter/Linkedin/Github/Mail social icons

### `LANDING_KEYFRAMES` (rewritten)
14 new keyframes: `auroraDrift1-4`, `orbDrift1-3`, `gradientShift`/`heroGradientShift`, `floatY`, `pulseGlow`, `shimmer`, `scrollDown`, `dotConverge`, `flowDash`, `lineShimmer`, `pulseRing`, `statGlow`.

### Components KEPT unchanged
`LandingPage` export, `useInView`, `Reveal`, `OutlineCTA`, `Eyebrow`, `TrialDialog`, `StepDot`, `Field`, `LoginScreen`, `FooterCol`, `HeroDashboardMockup` (only added `animation: floatY 6s ease-in-out infinite` to root div).

`GlowCTA` kept its structure but background was updated from solid `COLOR.accent` to `linear-gradient(120deg, accent, violet)` to match the new cinematic palette.

### Components removed
`ParticleField`, `ConfettiField`, `TypingBubble`, `GrowingBars`, `MysticOceanBg`, `MysticCard`, `FloatingTag`, all old `Act1`–`Act11` sections, `FEATURES` and `COMPARE_ROWS` constants.

### New helpers
- `GlassCard` — glassmorphic card with optional top accent hairline + shimmer sweep on hover
- `IconTile` — colored circle icon container (sm/md/lg sizes)

## Verification
- `bun run lint` — clean (no errors)
- `npx tsc --noEmit` — no errors in `src/components/landing-page.tsx` (unrelated pre-existing TS errors in api routes / mini-services / examples are out of scope)
- Dev server (port 3000) — page returns HTTP 200, render ~150-180ms, all new section headings verified in HTML output ("Zero chaos", "Turn chaos into", "Everything your team needs", "From idea to published", "Loved by teams", "Simple, transparent pricing", "Ready to orchestrate")
- `auroraDrift` keyframe name present in rendered HTML (confirms `<style>` injection works)

## Lessons / notes for future agents
- The `LoginScreen` uses global CSS classes (`retaina-bg`, `blob-3`, `glass-strong`, `crystal-in`, `liquid-pill`, `glow-ring`, `gold-text`, `label-caps`, `login-splash-ripple`, `login-splash-logo`) — these come from `globals.css` and were intentionally NOT touched.
- The `TrialDialog` uses CSS vars `var(--gold)`, `var(--primary)`, `var(--gold-foreground)`, `var(--gold)]/15`, `bg-border`, `bg-muted`, `text-muted-foreground` — also global, intentionally NOT touched.
- `lucide-react@0.525.0` still exports brand icons `Twitter`, `Linkedin`, `Github` (verified via `lucide-react.js` exports). Safe to import.
- `CheckCircle2` and `PenSquare` both exist (PenSquare is aliased to SquarePen).
- `HeroDashboardMockup` uses these `COLOR` fields: `accent`, `gold`, `emerald`, `rose`, `textHead`, `textBody`, `accentA` — all present in the new palette. The original used `COLOR.rose` only (no `roseA`) for the platform color list; I added `roseA` to the palette anyway as a safe addition for any future consumer.
- Aurora background is `position: fixed inset-0 z-0` so it persists across the entire scroll. Content is wrapped in `relative z-10`.
- All sections set `style={{ background: "transparent" }}` so the fixed AuroraBg shows through uniformly — no per-section color shifts.
