# Status

## Current state
- Hero fixes (2026-11-01): Moon orbits the camera (was screen-pinned with a ~25 px drift, ×0.3 under reduced motion → looked static); Earth rebuilt as a night side (moonlit terrain, GEBCO relief, land mask, warm city lights, thin crescent, thin blue rim + green airglow, gold only near the sun; exposure 0.6, bloom 0.9, faint god rays); headline lowered to ~16% and lettered like the logo (Lilita One, `.logo-type`).
- Hero polish (2026-11-01): Earth backlit (night + city lights, thin crescent, thin rim), exposure 0.7, bloom threshold 0.88; fast twinkle + sparkles + shooting star; nebula/galaxies with faint pink and gold; Moon normal map + drift; Hubble PBR + path; card ~29% width; headline "We launch brands into orbit."
- Hero rebuilt photoreal (2026-11-01): Earth limb at sunrise (NASA Blue/Black Marble, clouds, ocean specular, atmosphere), NASA Moon, Hubble glb, NASA Deep Star Map + 1500 twinkling stars, god rays/bloom/ACES/edge aberration. Moon terrain, Neptune, fog and dust removed.
- Order: Hero → Work → About → Services → Process → Results → Contact. W top-left + Menu top-right on every section.
- Train/station theme fully removed (world, plates, signs, line map, HUD, sound, JP labels, post-processing).
- Build and type-check pass. Visuals and runtime shader compile not yet checked (the in-app browser pane doesn't run rAF while hidden). Local `main` is ahead of `origin/main` (not pushed).
- Archive branch `archive/synthwave-lens` holds the earlier synthwave/lens version.

## Next up
- User reviews the hero (desktop, phone, Animation effects on/off). Nothing since the photoreal pass has been visually checked (code only, by request). Check especially: night-side brightness (`NIGHT_TINT`), the headline's extrusion/edge rendering in Chrome, Firefox and Safari, and the Moon crossing behind the card.
- User reviews the hero in the browser; then push.
- ThreeUI Work showcase: **blocked** — the bundle lacks `src/shaders/landing-pages/pageTypography.ts` and `pageRecipes.ts` (imported by both components; not public; ThreeUI MCP needs login). Needs the user to supply them (e.g. `docs/vendor/threeui/`). Downloaded bundle hashes: LandingPages.tsx, LandingPageFrame.tsx, threeui.css match; the served HTML (55 KB, media on Supabase) differs from the listed 3.5 MB embedded-media file.

## Known issues
- `src/lib/site-config.ts` contact details are placeholders.
- Work tech tags show only the platform — TODO real stacks in `src/config/projects.ts`.
- Contact copy still says "Your stop." / "…make a train station feel real…" — kept as content; replace if the user wants new lines.
- Card back print (never shown now) still exists in `cardArt.ts`.
- "Imagery: NASA" credit is in the README; add it to the site footer when one exists.
- The Earth is lit from the sunrise (behind the limb) while near objects use a left key light: a deliberate cinematic cheat so the card and Moon read.
- Real-GPU performance and reduced-motion behaviour not yet verified by the user.

## Log (newest first, keep ≤10)
- 2026-11-01 · hero · Moon orbit around the camera, night Earth (GEBCO relief, city lights, thin rim + airglow), logo-style headline · (this commit)
- 2026-11-01 · hero · polish: dark Earth, fast twinkle, nebula + pink/gold, Moon/Hubble motion, smaller card, headline · (this commit)
- 2026-11-01 · hero · photoreal Earth limb + Moon + Hubble + NASA star map, twinkle layer, god rays; card float ±0.06/5 s · (this commit)
- 2026-10-31 · hero · realistic moon/planet/stars, twinkle fix (reduced motion no longer freezes it), W/Menu/wordmark/hint moved · (this commit)
- 2026-10-31 · all · space redesign: sky + stars + clay objects, Menu/W/wordmark hero, glass panels, train theme removed · (this commit)
- 2026-10-31 · 01→02 · persistent card, departure transition, Work through train windows, reorder · (this commit)
- 2026-10-26 · repo · CLAUDE.md, STATUS.md, read-deny rules, screenshot tooling removed · (this commit)
- 2026-10-25 · 01 hero · photo plate + card-only WebGL, traced W enamel inlay, minimal copy, reader-tap scroll-out · 221f1b6
- 2026-10-25 · 03–07 · world, train, tunnels, billboards, split-flap, terminal; camera path; tiers · 4dcdc83
- 2026-10-25 · card · Webix Pass card (materials, edge, stamps, tilt) · 83abd25
- 2026-10-25 · UI · tokens, fonts, stations config, navbar, line map, signs, HUD, loader, sections · b4f271d
