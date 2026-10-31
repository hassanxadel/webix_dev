# Status

## Current state
- "The Pass" journey is live end to end: 7 stations, Lenis scroll, line map, station signs, HUD, Boarding loader.
- Order is now Hero 01 → Work 02 → About 03 → Services 04 → Process 05 → Results 06 → Terminal 07.
- Hero → Work: pinned bullet-train departure (plate slide + directional blur, streaks, tunnel, ≤2px shake) into a Shinkansen cabin; Work = 6 project windows with snap. Persistent damped card; world switches on unseen in a blackout before About.
- Stations 03–07 are v1: procedural 3D world (train, platforms, tunnels, skyline). Functional, but below the new realism bar.
- Build passes; production console clean. Local `main` is 4+ commits ahead of `origin/main` (not pushed).
- Archive branch `archive/synthwave-lens` holds the earlier synthwave/lens version.

## Next up
- User reviews Hero → Work in the browser (desktop, phone, reduced motion); then push.
- Rework stations one at a time to the hero's quality bar (photo plates / real assets, not procedural geometry). Likely start with 02 Vision.

## Known issues
- `src/lib/site-config.ts` contact details are placeholders.
- Hero plate is 1376 px wide → slightly soft on ≥1440 px screens (a 2560 px export would fix it).
- Ken Burns can shift the photo's reader up to ~20 px from the card's tap target.
- Vision's in-train interior (procedural) looks flat/beige; enamel W face reads grey-navy.
- Unused legacy files in `src/assets/` (Room.png, chest.*, Gemini_*, bedroom.jpg, space.jpg) ~25 MB — candidates for deletion.
- Work tech tags show only the platform (e.g. "Custom build", "Vercel", "Shopify") — TODO real stacks in `src/config/projects.ts`.
- Departure/Work tuning (streak density, window size, card poses) not yet seen by the user.
- Real-GPU performance and reduced-motion behaviour not yet verified by the user.

## Log (newest first, keep ≤10)
- 2026-10-31 · 01→02 · persistent card, departure transition, Work through train windows, reorder · (this commit)
- 2026-10-26 · repo · CLAUDE.md, STATUS.md, read-deny rules, screenshot tooling removed · (this commit)
- 2026-10-25 · 01 hero · photo plate + card-only WebGL, traced W enamel inlay, minimal copy, reader-tap scroll-out · 221f1b6
- 2026-10-25 · 03–07 · world, train, tunnels, billboards, split-flap, terminal; camera path; tiers · 4dcdc83
- 2026-10-25 · card · Webix Pass card (materials, edge, stamps, tilt) · 83abd25
- 2026-10-25 · UI · tokens, fonts, stations config, navbar, line map, signs, HUD, loader, sections · b4f271d
