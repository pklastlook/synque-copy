# Task: landing-senior-redesign

**Agent**: Senior frontend designer + React engineer
**Goal**: Rebuild `/home/z/my-project/src/components/landing-page.tsx` to elevate landing page from 6/10 → 9.5/10.

## What I did

### Single file edited
- `/home/z/my-project/src/components/landing-page.tsx` — complete rewrite (~2,070 lines, was 2,889)

### Key changes summary

1. **Theme-aware colors** — Replaced hardcoded `const COLOR = {…} as const` (dark-only) with two palettes (`DARK_COLORS` + `LIGHT_COLORS`) and a `useColors()` hook that uses `next-themes` `useTheme()`. Defaults to dark until mounted (avoids SSR mismatch). All 24 components now call `const COLOR = useColors();` at the top.

2. **New keyframes added** to `LANDING_KEYFRAMES`:
   - `breathe` — scale 1 → 1.05 → 1 (4s) for central hub pulse
   - `shimmerSweep` — light sweep across hero (8s)
   - `iconSpin` — 360° rotation (defined; icon hover uses Tailwind `group-hover:rotate-[360deg]` instead)
   - `barGrowScroll` — for scroll-triggered bar charts (defined; AnimatedBarChart uses CSS height transition)
   - `cardFloat` — very subtle ±2px float (distinct from `floatY` which is ±12px)

3. **AuroraBg theme-aware** — Opacity bumped 0.4-0.55 → 0.55-0.70 for visibility. Blur reduced 80-95px → 60-75px. Vignette color adapts: dark=`rgba(3,3,8,0.85)`, light=`rgba(250,251,252,0.55)`.

4. **CinematicNav theme toggle** — Added Sun/Moon button between Sign in and Start trial. Uses `useTheme()` + `mounted` state to avoid hydration mismatch.

5. **PlatformOrbit FIXED** — Root cause: original applied `transform: translate(x,y)` for positioning AND `animation: floatY` (which sets `transform: translateY(-12px)`) on the same element. CSS animations override inline transforms, so all 7 badges collapsed to center. Fix: split into outer div (positioning via `left/top + translate(-50%,-50%)`) + inner div (floatY animation). Also added `breathe` 4s pulse on central hub + central glow. Orbit rings border opacity 0.12 → 0.40.

6. **GlassCard `float` prop** — Optional `float` + `floatDelay` props. When true, wraps card in outer div with `cardFloat` animation (±2px over 6s). Inner card keeps hover lift. Used on: Act2Problem, Act4Features, Act6SocialProof (stats + testimonials).

7. **IconTile hover rotate** — Added `transition-transform duration-500 group-hover:rotate-[360deg]`. Tiles rotate 360° on parent card hover.

8. **Act1Hero** — Parallax orbs opacity 0.4-0.5 → 0.6-0.7. Blur 70-100px → 55-70px. New `shimmerSweep` overlay crosses hero every 8s.

9. **New `AnimatedBarChart` component** — Bars grow from 0% to target height when scrolled into view. Staggered 80ms delays. 1.2s cubic-bezier easing. Used in Act6SocialProof as growth chart.

10. **Act8Pricing featured glow** — Featured plan's outer glow now has continuous `pulseGlow` 4s breathing.

### Verification
- `bun run lint` — clean (no errors)
- `npx tsc --noEmit` — no TS errors in landing-page.tsx (fixed by removing `as const` from color constants)
- Dev server returns HTTP 200, ~100-200ms render times
- Verified HTML output contains `auroraDrift1`, `breathe` (3×), `shimmerSweep`, `Start trial`
- Works in BOTH light and dark mode

### Components preserved unchanged
- `LandingPage` export
- `useInView` hook
- `Reveal` component
- `TrialDialog` + `StepDot` + `Field`
- `LoginScreen`
- `FooterCol`
- `PLANS` data
- All original keyframes (just appended new ones)

See `/home/z/my-project/worklog.md` for full detailed entry.
