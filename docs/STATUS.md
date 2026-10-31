# Status

## Current state
- Site redesigned to a minimal space theme (2026-10-31): dark-blue sky, twinkling stars, 5 clay objects, one persistent card.
- Order: Hero → Work → About → Services → Process → Results → Contact. Menu overlay + W top-right on every section.
- Train/station theme fully removed (world, plates, signs, line map, HUD, sound, JP labels, post-processing).
- Build and type-check pass. Visuals not yet reviewed by the user. Local `main` is ahead of `origin/main` (not pushed).
- Archive branch `archive/synthwave-lens` holds the earlier synthwave/lens version.

## Next up
- User reviews the space redesign in the browser (desktop, phone, reduced motion); tune object positions, star density, panel layout; then push.

## Known issues
- `src/lib/site-config.ts` contact details are placeholders.
- Work tech tags show only the platform — TODO real stacks in `src/config/projects.ts`.
- Contact copy still says "Your stop." / "…make a train station feel real…" — kept as content; replace if the user wants new lines.
- Card back print (never shown now) still exists in `cardArt.ts`.
- Space objects can sit near the edge of a panel on some aspect ratios (they never move into the card).
- Real-GPU performance and reduced-motion behaviour not yet verified by the user.

## Log (newest first, keep ≤10)
- 2026-10-31 · all · space redesign: sky + stars + clay objects, Menu/W/wordmark hero, glass panels, train theme removed · (this commit)
- 2026-10-31 · 01→02 · persistent card, departure transition, Work through train windows, reorder · (this commit)
- 2026-10-26 · repo · CLAUDE.md, STATUS.md, read-deny rules, screenshot tooling removed · (this commit)
- 2026-10-25 · 01 hero · photo plate + card-only WebGL, traced W enamel inlay, minimal copy, reader-tap scroll-out · 221f1b6
- 2026-10-25 · 03–07 · world, train, tunnels, billboards, split-flap, terminal; camera path; tiers · 4dcdc83
- 2026-10-25 · card · Webix Pass card (materials, edge, stamps, tilt) · 83abd25
- 2026-10-25 · UI · tokens, fonts, stations config, navbar, line map, signs, HUD, loader, sections · b4f271d
