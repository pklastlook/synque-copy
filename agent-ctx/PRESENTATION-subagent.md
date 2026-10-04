# Task ID: PRESENTATION — Interactive Slide Deck

**Agent**: subagent
**Task**: Create a beautiful, interactive 15-slide presentation at `/presentation`

## Context reviewed
- `/home/z/my-project/worklog.md` — project context (SYNQUE social media platform, liquid-glass aesthetic, dark theme + gold/indigo accents)
- `/home/z/my-project/src/components/landing-shared.tsx` — COLOR tokens (gold oklch(0.78 0.16 80), surface/border/text), LandingBg, LandingNav, TrialCTA patterns
- `/home/z/my-project/src/app/pricing/page.tsx` — page structure, PLANS array, glass-card patterns
- `/home/z/my-project/src/components/glass/logo.tsx` — SYNQUE logo (SYN+QUE gradient)
- `/home/z/my-project/src/app/globals.css` — design tokens, dark mode palette
- `/home/z/my-project/src/app/layout.tsx` — root layout, dark default theme
- `package.json` — confirmed framer-motion 12, recharts 2.15, lucide-react 0.525 installed

## File delivered
`/home/z/my-project/src/app/presentation/page.tsx` (~1653 lines, self-contained)

## Slides built (15 total)
1. **Title** — SYNQUE 3D rotateX logo reveal, gold gradient text, particle bg, nav hints
2. **Problem** — 3 rose-accented pain cards (scattered/safety/insights) with stats
3. **Solution** — 3 cards, center card gold-elevated with glow + hover rotate
4. **Feature grid** — 8 feature cards, gold icon tiles, staggered entrance + hover lift
5. **Supported platforms** — 7 platform cards w/ brand colors + char limits + "post all 7" CTA
6. **Cross-posting killer feature** — animated diagram: draft → AI → 7 variants → publish
7. **Plan limits table** — 10-row comparison (Starter/Growth-gold/Enterprise), animated rows
8. **Multi-workspace architecture** — Main DB → SVG paths → 3 isolated Neon tenant DBs
9. **AI Composer** — 3 sample cards with typewriter animation (IG/LinkedIn/X tones)
10. **Account safety** — pulsing emerald shield + 4 safety feature cards
11. **Security & compliance** — 8 security badges + SOC2-ready pill
12. **Team collaboration** — 5 roles + approval workflow diagram (Draft→Review→Approve→Publish)
13. **Analytics** — Recharts: AreaChart (revenue), PieChart (platform mix), BarChart (engagement)
14. **Pricing** — 3 tiers, Growth featured gold, feature checklists
15. **CTA** — "Start Your Free Trial" w/ gold gradient button + trust badges

## Navigation
- **Keyboard**: ← → arrows, Space (advance), 1-9 (jump), F (fullscreen), Esc (exit fs)
- **Click**: left/right screen halves (desktop), side arrow buttons, clickable dots
- **Auto-advance**: Play/Pause toggle (6s/slide)
- **Fullscreen**: Maximize/Minimize toggle via Fullscreen API
- **Progress bar**: top gold gradient bar (animates width)
- **Counter**: 01/15 glass pill at bottom
- **Transitions**: AnimatePresence mode="wait" with directional slide; `useReducedMotion` respected

## Design system
- Dark #0A0B0F base, gold oklch(0.78 0.16 80) accent, emerald #34D399 for safety, rose #F43F5E for problems
- `GlassCard` (translucent + backdrop-blur + ring + optional gold glow shadow)
- `GoldText` (135deg gold gradient clip)
- `PresentationBg` (3 animated mesh blobs + 18 floating gold particles + subtle grid)
- `SlideShell` / `SlideKicker` / `SlideTitle` / `SlideSubtitle` layout primitives
- Staggered motion variants with ease curve `[0.22, 1, 0.36, 1]`

## Lint
`bun run lint` → **0 errors, 0 warnings** in presentation file (7 pre-existing warnings in other files unrelated to this task).
