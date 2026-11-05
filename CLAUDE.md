# Webix — minimal space site

Agency site for Webix Software Solutions (websites, Shopify e-commerce, 3D/interactive web, branding; Egyptian market).
Concept: photoreal space. The "Webix Pass" metal card (Webix W enamel inlay) floats above the Earth (Egypt, the Nile and the
Mediterranean at sunrise: day on the left, night with city lights on the right), the Moon slowly orbiting past behind it, Hubble
drifting far above, NASA's real star sky behind with a twinkling star layer. Hovering the card deals out the services. Calm, cinematic.

## Stack + commands
- TanStack Start (React 19, SSR via Nitro), Vite 8, file routing (`src/routes/`, single page `/`). Tailwind v4, shadcn/ui.
- three **0.182.0 (pinned: ≥0.183 warns about THREE.Clock, which R3F uses)**, @react-three/fiber 9.8, drei 10.7,
  maath (damping), @react-three/postprocessing 3.0.4 + postprocessing 6.39, gsap 3.13, lenis 1.3, react-hook-form + zod.
- `npm run dev` (port 5173) · `npm run build` · `npm run lint` · type-check: `npx tsc --noEmit -p .`
  (pre-existing errors in `src/components/ui/*` and `vite.config.ts` are not ours; filter them out).

## File map
- `src/routes/index.tsx` — page composition; `src/routes/__root.tsx` — head, fonts, meta.
- `src/config/sections.ts` — **single source of truth**: 7 sections (range, content window, anchor), PAGE_VH, HERO_GLIDE.
- `src/config/projects.ts` — Work panel data (derived from webix-data; tech tags = platform only, TODO real stacks).
- `src/lib/journey.ts` — scroll progress store (`journey` mutable + `journeyStore`), Lenis on gsap.ticker, `lockScroll`, `travelTo*`.
- `src/lib/webix-data.ts` — projects (6, real screenshots), services (4), process (4), RESULT_STATS (derived, no invented numbers).
- `src/lib/site-config.ts` — real contact details (single source): email hassanadelh@outlook.com, WhatsApp +966 59 797 6116
  (`wa.me/966597976116`), handle @webix_dev, owner name/title (TODO confirm), badge photo, city. No Instagram (none given). `src/lib/inquiry.ts` — form schema + message.
- `src/shaders/` — **vendored ThreeUI, byte-exact** (SHA-256 checked; `.gitattributes` keeps LF): `character-carousel/CharacterCarousel.tsx`
  (+ one host prop, `source`), `sources/character-filmstrip.html`, `character-wave.html`, `threeui.css`. Never edit the HTML sources.
- `src/components/site/` — HTML layer: `WorkFilmstrip.tsx` (Work: string transforms on the filmstrip source — projects ×2 in, square
  WebP portraits `public/work/film/`, theme CSS, a `webix-project` postMessage on selecting the front card → case study), `Sections.tsx` (all sections; glass panels), `ServiceDeck.tsx` (the card's services deck: button over
  the card, a real link over each pass, hint, Esc / tap-outside / 400 ms fold), `Menu.tsx` (W top-left, Menu button + overlay
  top-right, hero "Scroll down to discover" bottom-left + wordmark bottom-right), `SceneLayer.tsx` (CSS sky + lazy canvas), `Loader`, `ContactForm`, `CaseStudyDialog`.
- `src/components/three/` — WebGL (lazy chunk):
  - `Experience.tsx` — the one Canvas: SunLights, Stars (+ big-star layer), StarMap, Earth, Moon, Hubble, HDRI env, LoupeView (magnifier pass),
    (card reflections only), card, CameraRig, Effects.
  - `Stars.tsx` — `StarMap` (NASA Deep Star Map on navy + noise nebula wisps, faint pink nebula top-right, golden glow at the sunrise,
    3 small galaxies) + `Stars` (one Points layer: 0.4–0.9 s twinkle per star, halo grows with brightness, 2% sparkles, spikes on the
    brightest 3%, 5% pink / 8% warm tints) + `ShootingStar` (every 6–12 s).
  - `Space.tsx` — Earth (`EARTH_NADIR` 10°N 28°E under the camera → Egypt/Nile/Mediterranean in view, `EARTH_TILT`; `EARTH_SUN` from
    the left, terminator ~35–40% across, golden twilight band; day = Blue Marble × `SUN_GAIN` with GEBCO relief, ocean glint, cloud
    shadows; night = moonlit `NIGHT_TINT` + Black Marble city lights `#FFB547`→`#FFE2A0`; spins every `EARTH_DAY` s, clouds 1.2×;
    limb shell: thin blue line, orange-gold toward the sun), Moon (LRO colour + normal map; orbits the camera: `MOON_ORBIT`/
    `MOON_PERIOD`/`MOON_EASE`), Hubble (glb re-materialised as PBR, ~40 s pass, 2-axis tumble), SunLights,
    `useAnchor` (screen anchoring + depth-scaled cursor parallax; Hubble only). `textures.ts` — `useProgressiveTexture` (2K WebP
    first, then a large WebP or KTX2 swapped in; KTX2 via one `KTX2Loader`, transcoder in `public/basis/`).
  - `Effects.tsx` — NaN guard, bloom, edge-only chromatic aberration, ACES, vignette, grain (`lite` drops aberration). No sun disc, flare or god rays.
  - `LoupeView.tsx` — magnifier: same camera ×2.3 (`MAG`, `src/lib/loupe.ts`) into a square RT, drawn as a screen-space disc (fringe, rim darkening); only while visible, ~30 fps.
  - `WebixPass.tsx` — the card (+ `WInlay` from SVG), `cardState`, and the services deck's 3D half (press tilt; 4 brand-colour slabs
    stacked behind the card; `dealLayout` picks fan / split / grid so nothing overlaps; screen boxes + HTML-face alpha written to `deck`). `src/lib/deck.ts` — the deck's shared state (no three import). `cardArt.ts` — card dims and printed front/back textures.
  - `Badge.tsx` + `badgeArt.ts` — About: the crew pass on a Rapier lanyard (fixed anchor + 3 rope links + spherical joint, MeshLine strap
    along a Catmull-Rom; gravity −1.4 + drift force; drag via `src/lib/badge.ts` + the HTML `BadgeHit`; physics paused outside About;
    reduced motion = still badge, hover tilt). Lazy chunk (Rapier WASM, ~860 KB gz), loaded once the visitor reaches Work.
  - `CameraRig.tsx` — camera framing + idle drift + mouse parallax; the card's single writer (screen-anchored poses, maath damping).
- `src/styles.css` — tokens + component classes (`.btn-primary`, `.btn-secondary`, `.glass` panel, `.hud`, `.field`, `.space-sky`).
- Assets: `public/brand/webix-w.svg` (traced W, top-right), `public/brand/webix-wordmark-trim.webp` (hero wordmark, cropped from
  `webix-wordmark.webp`), `public/hdri/shanghai_bund_1k.hdr` (CC0, card reflections), `public/work/*.jpg` (project screenshots),
  `public/space/` (NASA, public domain: earth-day/night/clouds/normal 2K WebP + 4K/8K KTX2 and earth-land 2K, all built by
  `scripts/earth-textures.py` + `scripts/basisu-wasi.mjs` (official basisu WASI build under Node), moon + normal, stars 4K+2K, hubble.glb; credits in README).
  Source pipeline: NASA originals → PIL / Blender CLI (`blender -b -P`, EXR tone-mapping, glb re-export with WebP textures) → WebP.
  Source: `src/assets/logo-w.png`; `scripts/trace-w.py` re-traces the W.

## Design tokens (see `src/styles.css` `:root` / `@theme`)
- `--bg-night #070B14` page/scene bg · `--indigo #1A253A` panels, card body · `--yellow #FFDA24` primary CTA, active, gold W, LEDs
- `--pink #FF007F` small accents only (card edge, ring) · `--red #E81A2E` rare highlight · `--text #F4F1EA` warm white
- Tailwind names: `night indigo sun(yellow) neon(pink) signal(red) paper(text) dim`.
- Fonts: Poppins 600/700 headings · Inter body · JetBrains Mono small labels (`.hud`) · Lilita One for the hero headline + subline only
  (closest free match to the logo's lettering; self-hosted `public/fonts/lilita-one-latin.woff2`, OFL, preloaded), drawn by `.logo-type` (indigo face, yellow outline, red extruded side, dark edge;
  `.logo-type-ix` = the logo's yellow/pink "ix"). No retro/script fonts.
- Buttons: primary = solid yellow, navy text, uppercase, tracked, arrow; secondary = 1px warm-white outline.
- Sky: deep navy `#050B1E`–`#0A1430` under the NASA star map; never pure black. Rim blue `#5B9BFF` turning orange-gold `#FF8A1F`→`#FFB547` at the sunrise; orange horizon glow + faint lower-left haze;
  city lights `#FFB547`→`#FFE2A0`. No green.
- Rules: yellow = interaction; pink = small accents; lots of empty space; nothing decorative that isn't needed.

## Sections (progress 0→1 of page scroll; details in `src/config/sections.ts`)
| id | Content | Layout |
|----|---------|--------|
| hero | h1 "we launch brands into orbit." + subline (logo lettering, −5°) · services deck on the card · Get started pill · magnifier | Headline centred ~15% from the top · Moon orbits behind · hovering/tapping the card deals 4 brand service cards (4 across; 2+2 beside the card if narrower; 2×2 grid below on phones) · clicking one opens `#service-<slug>` · "Get started" pill under the card · magnifier lens (toggle next to the scroll hint) · card slightly below centre (~29% width desktop, ~60% phone) · W top-left · Menu top-right · scroll hint bottom-left · wordmark bottom-right |
| work | 6 projects in the ThreeUI filmstrip (screenshot, nn, name, type; select the front card → case study) | Logo-lettered heading top-left · filmstrip 26vh→97vh · card tiny in the top-right corner · sr-only project list |
| about | "Your ideas. Our playground." (h2) + "We build digital journeys." + vision copy + Get Started / Explore our work + email / WhatsApp · 3D ID badge on a lanyard | Badge left third (desktop) / top centre (phones), glass panel opposite; card stays in the top-right corner |
| services | 4 services | Glass panel |
| process | Discover → Design → Build → Launch | Glass panel |
| results | Derived stats; testimonials = dev-only placeholder | Glass panel |
| contact | "Your stop. Let's build it." + links + form | Glass panels |
During Work and About the card is tiny in the top-right corner; from Services on it sits in the left third (desktop) / top (phones), panels opposite.

## Decisions already made (do not revisit)
- Theme: photoreal space from real imagery (NASA Blue/Black Marble, CGI Moon Kit, Deep Star Maps, 3D Resources). No procedural stand-ins, clay objects or cartoon sprites. The train theme is gone; don't bring back stations, signage, HUD or Japanese labels.
- Lighting: one sun for everything. The Earth's `EARTH_SUN` ≈ `SUN_DIR` (from the left): day on the left ~35–40% of the visible
  Earth, a golden twilight band, night with city lights on the right. No haze over the surface; exposure ~0.6 (day × `SUN_GAIN`),
  bloom threshold ≥ 0.9. No sun disc / flare / god rays (removed 2026-11-05); the sunrise reads from the orange rim + sky glow only. The Earth turns every ~5 min (`EARTH_DAY`), Egypt in view at load.
- The Moon orbits the camera (world space, independent of cursor parallax): right → left, climbing, ~70 s loop, ~38% on screen at 16:9; its phase changes because the sun key is fixed. The near objects (Moon, Hubble, card) share a key from the left (`SUN_DIR`) plus blue Earth-shine from below.
- Reduced motion (incl. Windows "Animation effects: Off", which the owner's PC has) slows ambient motion to ×0.3 (twinkle, shooting star, Moon, Hubble) and shrinks the card float; never fully static.
- One fixed canvas for the whole site; the card never unmounts. The sky is drawn in the canvas (opaque) with a CSS copy underneath as the instant / no-WebGL fallback.
- The card's look is final: geometry, materials, traced-W enamel inlay, pink edge, cursor tilt. Float: ±0.06 over ~5 s. It keeps the HDRI env map (plus a blue Lightformer below for the Earth-glow reflection; env never shown as background) and the scene's sun key + Earth-shine. The old pink/yellow CardLights are gone.
- One card, one writer: CameraRig computes the target pose as a pure function of progress and damps `cardState.position/quaternion/scale` with maath. Tilt is a separate offset (18° hero, ~10° elsewhere via `cardState.tilt`).
- The Moon uses envMapIntensity 0 and Hubble 0.5, so the city HDRI (there for the card) doesn't tint them.
- One scroll system: Lenis on gsap.ticker; per-frame DOM writes via gsap.ticker, no layout reads, no React state per frame.
- The W is the **traced logo SVG** `public/brand/webix-w.svg`. Never redraw it. The wordmark is the logo image, never set in a font.
- Hero copy is only the headline + one subline (it is the page h1). Nothing else: card (+ its services deck), W, wordmark, Menu,
  scroll hint, the "hover the pass" hint.
- The card's job: hovering it (tap on touch, Enter/Space) deals out one pass per service from `SERVICES` (4; never invent more).
  The HTML layer owns intent and a11y (real button with aria-expanded, real links, Esc, 400 ms fold); the card animates and
  reports screen boxes through `deck`. Closed: brand slabs stacked behind the card (only coloured slivers peek; no text). Dealt: an HTML
  card (`.svc-card`: brand face yellow/pink/red/indigo, thick outline, extruded side, Lilita title, line icon) fades in over each slab;
  hover = forward ×1.1, others dim, line shown. Clicking one opens its sub-section (`site/ServiceDetail.tsx`, an overlay at
  `#service-<slug>`, FLIP from the card; Back / Esc / browser Back fold it to the card; Get started presets the contact form via
  `servicePreset` / `?service=<slug>`). Not a route: a route would unmount the one canvas. Reduced motion: fade in place.
- Magnifier (`site/Loupe.tsx` + `three/LoupeView.tsx`): gold→yellow bezel + handle, drag with easing (none under reduced motion), arrow
  keys; on by default for fine pointers, off on touch (toggle shows it fixed). Built from the written spec: the Sketchbook source was not supplied.
- Big stars: ~34 extra points in clear sky (`buildBig` in `Stars.tsx`, rejection-sampled away from headline/card/corners/Earth), 0.4–1.2 s twinkle to ~off.
- Zero budget: free/OSS libraries, Google Fonts, CC0 assets only. No invented testimonials or stats.
- Card draws over everything via a depth-clear mesh (renderOrder 19); card on layer 1.
- No `anisotropy` on card materials (NaN artefacts).
- Menu order: Home · Work · Services · About · Contact.
- Work is the ThreeUI CharacterCarousel **filmstrip** (2026-11-05), restyled only via an injected stylesheet + content transforms; its motion,
  rail and input are untouched. Work is 220 vh, no scroll snap. The iframe captures the wheel while the pointer is over it (inherent).

## Working rules
1. No screenshots or browser captures. Don't open images unless the user attaches one and asks. The user checks visuals.
2. Verify cheaply: `npx tsc --noEmit -p . 2>&1 | grep -v -E "components/ui/|vite.config" | head` and/or `npm run build 2>&1 | tail -20`.
3. Read narrowly: grep/glob first, read line ranges only, don't re-read unchanged files. Never read lockfiles, node_modules, dist, binaries.
4. Targeted edits only; never re-output whole files; don't echo code back in chat.
5. Replies: 3–6 bullets (what changed + files, decisions needed, commit hash).
6. One section per request; don't touch others unasked.
7. Broad multi-file exploration → Explore subagent (only its conclusion enters context).
8. End of every task: update `docs/STATUS.md` (and this file for lasting decisions) so `/clear` is always safe.
9. >~5 files or architectural change → 3-line plan first and wait.
10. Commit per task (end messages with the Co-Authored-By line). Never push unless asked.
