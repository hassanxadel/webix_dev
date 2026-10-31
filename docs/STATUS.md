# Status

## Current state
- Hero reworked to realistic space (2026-10-31): moon terrain with grazing sun + shadows + fog, Neptune on the horizon with atmosphere, 3000 twinkling stars, dust, camera parallax, bloom/DoF/ACES. Clay objects removed.
- Order: Hero → Work → About → Services → Process → Results → Contact. W top-left + Menu top-right on every section.
- Train/station theme fully removed (world, plates, signs, line map, HUD, sound, JP labels, post-processing).
- Build and type-check pass. Visuals and runtime shader compile not yet checked (the in-app browser pane doesn't run rAF while hidden). Local `main` is ahead of `origin/main` (not pushed).
- Archive branch `archive/synthwave-lens` holds the earlier synthwave/lens version.

## Next up
- User reviews the hero in the browser; then push.
- ThreeUI Work showcase: **blocked** — the bundle lacks `src/shaders/landing-pages/pageTypography.ts` and `pageRecipes.ts` (imported by both components; not public; ThreeUI MCP needs login). Needs the user to supply them (e.g. `docs/vendor/threeui/`). Downloaded bundle hashes: LandingPages.tsx, LandingPageFrame.tsx, threeui.css match; the served HTML (55 KB, media on Supabase) differs from the listed 3.5 MB embedded-media file.

## Known issues
- `src/lib/site-config.ts` contact details are placeholders.
- Work tech tags show only the platform — TODO real stacks in `src/config/projects.ts`.
- Contact copy still says "Your stop." / "…make a train station feel real…" — kept as content; replace if the user wants new lines.
- Card back print (never shown now) still exists in `cardArt.ts`.
- Planet texture credit (Solar System Scope, CC BY 4.0) is in the README; add it to the site footer when one exists.
- Real-GPU performance and reduced-motion behaviour not yet verified by the user.

## Log (newest first, keep ≤10)
- 2026-10-31 · hero · realistic moon/planet/stars, twinkle fix (reduced motion no longer freezes it), W/Menu/wordmark/hint moved · (this commit)
- 2026-10-31 · all · space redesign: sky + stars + clay objects, Menu/W/wordmark hero, glass panels, train theme removed · (this commit)
- 2026-10-31 · 01→02 · persistent card, departure transition, Work through train windows, reorder · (this commit)
- 2026-10-26 · repo · CLAUDE.md, STATUS.md, read-deny rules, screenshot tooling removed · (this commit)
- 2026-10-25 · 01 hero · photo plate + card-only WebGL, traced W enamel inlay, minimal copy, reader-tap scroll-out · 221f1b6
- 2026-10-25 · 03–07 · world, train, tunnels, billboards, split-flap, terminal; camera path; tiers · 4dcdc83
- 2026-10-25 · card · Webix Pass card (materials, edge, stamps, tilt) · 83abd25
- 2026-10-25 · UI · tokens, fonts, stations config, navbar, line map, signs, HUD, loader, sections · b4f271d
