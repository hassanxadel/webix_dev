# Webix — minimal space site

Agency site for Webix Software Solutions (websites, Shopify e-commerce, 3D/interactive web, branding; Egyptian market).
Concept: photoreal space. The "Webix Pass" metal card (Webix W enamel inlay) floats above the Earth's limb at sunrise,
the Moon slowly orbiting past behind it, Hubble drifting far above, NASA's real star sky behind with a twinkling star layer. Calm, cinematic.

## Stack + commands
- TanStack Start (React 19, SSR via Nitro), Vite 8, file routing (`src/routes/`, single page `/`). Tailwind v4, shadcn/ui.
- three **0.182.0 (pinned: ≥0.183 warns about THREE.Clock, which R3F uses)**, @react-three/fiber 9.8, drei 10.7,
  maath (damping), @react-three/postprocessing 3.0.4 + postprocessing 6.39, gsap 3.13, lenis 1.3, react-hook-form + zod.
- `npm run dev` (port 5173) · `npm run build` · `npm run lint` · type-check: `npx tsc --noEmit -p .`
  (pre-existing errors in `src/components/ui/*` and `vite.config.ts` are not ours; filter them out).

## File map
- `src/routes/index.tsx` — page composition; `src/routes/__root.tsx` — head, fonts, meta.
- `src/config/sections.ts` — **single source of truth**: 7 sections (range, content window, anchor), PAGE_VH, HERO_GLIDE, WORK_WINDOW.
- `src/config/projects.ts` — Work panel data (derived from webix-data; tech tags = platform only, TODO real stacks).
- `src/lib/journey.ts` — scroll progress store (`journey` mutable + `journeyStore`), Lenis on gsap.ticker, Work snap per project, `travelTo*`.
- `src/lib/webix-data.ts` — projects (6, real screenshots), services (4), process (4), RESULT_STATS (derived, no invented numbers).
- `src/lib/site-config.ts` — contact details (**placeholders**: email / WhatsApp / Instagram). `src/lib/inquiry.ts` — form schema + message.
- `src/components/site/` — HTML layer: `Sections.tsx` (all sections; glass panels), `Menu.tsx` (W top-left, Menu button + overlay
  top-right, hero "Scroll down to discover" bottom-left + wordmark bottom-right), `SceneLayer.tsx` (CSS sky + lazy canvas), `Loader`, `ContactForm`, `CaseStudyDialog`.
- `src/components/three/` — WebGL (lazy chunk):
  - `Experience.tsx` — the one Canvas: SunLights, SunDisc (god-rays source), SunGlare, Stars, StarMap, Earth, Moon, Hubble, HDRI env
    (card reflections only), card, CameraRig, Effects.
  - `Stars.tsx` — `StarMap` (NASA Deep Star Map on navy + noise nebula wisps, faint pink nebula top-right, golden glow at the sunrise,
    3 small galaxies) + `Stars` (one Points layer: 0.4–0.9 s twinkle per star, halo grows with brightness, 2% sparkles, spikes on the
    brightest 3%, 5% pink / 8% warm tints) + `ShootingStar` (every 6–12 s).
  - `Space.tsx` — Earth (night side: moonlit terrain `NIGHT_TINT`, GEBCO normal map, land mask → dark glossy oceans, Black Marble
    city lights `#FFB547`→`#FFD27A`, thin sunlit crescent `EARTH_SUN` 115°, exposure `EARTH_EXPOSURE`; faint grey-blue cloud shell;
    limb shell shaded by tangent altitude: thin blue line + green airglow band + gold toward the sun), Moon (LRO colour + normal map;
    orbits the camera: `MOON_ORBIT`/`MOON_PERIOD`/`MOON_EASE`), Hubble (glb re-materialised as PBR, ~40 s pass, 2-axis tumble),
    SunLights, SunDisc, SunGlare, `useAnchor` (screen anchoring + depth-scaled cursor parallax; Hubble only). `textures.ts` — `useProgressiveTexture` (2K first, 4K swapped in later).
  - `Effects.tsx` — NaN guard, god rays, bloom, edge-only chromatic aberration, ACES, vignette, grain (`lite` drops rays/aberration).
  - `WebixPass.tsx` — the card (+ `WInlay` from SVG) and `cardState`. `cardArt.ts` — card dims and printed front/back textures.
  - `CameraRig.tsx` — camera framing + idle drift + mouse parallax; the card's single writer (screen-anchored poses, maath damping).
- `src/styles.css` — tokens + component classes (`.btn-primary`, `.btn-secondary`, `.glass` panel, `.hud`, `.field`, `.space-sky`).
- Assets: `public/brand/webix-w.svg` (traced W, top-right), `public/brand/webix-wordmark-trim.webp` (hero wordmark, cropped from
  `webix-wordmark.webp`), `public/hdri/shanghai_bund_1k.hdr` (CC0, card reflections), `public/work/*.jpg` (project screenshots),
  `public/space/` (NASA, public domain: earth-day/night/clouds/normal 4K+2K, earth-land 2K (from GEBCO via `scripts/earth-normal.py`), moon + normal, stars 4K+2K, hubble.glb; credits in README).
  Source pipeline: NASA originals → PIL / Blender CLI (`blender -b -P`, EXR tone-mapping, glb re-export with WebP textures) → WebP.
  Source: `src/assets/logo-w.png`; `scripts/trace-w.py` re-traces the W.

## Design tokens (see `src/styles.css` `:root` / `@theme`)
- `--bg-night #070B14` page/scene bg · `--indigo #1A253A` panels, card body · `--yellow #FFDA24` primary CTA, active, gold W, LEDs
- `--pink #FF007F` small accents only (card edge, ring) · `--red #E81A2E` rare highlight · `--text #F4F1EA` warm white
- Tailwind names: `night indigo sun(yellow) neon(pink) signal(red) paper(text) dim`.
- Fonts: Poppins 600/700 headings · Inter body · JetBrains Mono small labels (`.hud`) · Lilita One for the hero headline only
  (closest free match to the logo's lettering), drawn by `.logo-type` (indigo face, yellow outline, red extruded side, dark edge;
  `.logo-type-ix` = the logo's yellow/pink "ix"). No retro/script fonts.
- Buttons: primary = solid yellow, navy text, uppercase, tracked, arrow; secondary = 1px warm-white outline.
- Sky: deep navy `#050B1E`–`#0A1430` under the NASA star map; never pure black. Rim blue `#5B9BFF`, airglow green `#6DFF9E` (faint), city lights `#FFB547`→`#FFD27A`.
- Rules: yellow = interaction; pink = small accents; lots of empty space; nothing decorative that isn't needed.

## Sections (progress 0→1 of page scroll; details in `src/config/sections.ts`)
| id | Content | Layout |
|----|---------|--------|
| hero | h1 "we launch brands into orbit." (logo lettering, −4°) + one subline | Headline centred ~16% from the top · Moon orbits behind · card slightly below centre (~29% width desktop, ~60% phone) · W top-left · Menu top-right · scroll hint bottom-left · wordmark bottom-right |
| work | 6 projects (image, n/6, type, line, tags, View project → case study, live link) | Panels slide in/out per project, snap; reduced motion = vertical list |
| about | "Your ideas. Our playground." (h2) + "We build digital journeys." + vision copy + Get Started / Explore our work | Glass panel |
| services | 4 services | Glass panel |
| process | Discover → Design → Build → Launch | Glass panel |
| results | Derived stats; testimonials = dev-only placeholder | Glass panel |
| contact | "Your stop. Let's build it." + links + form | Glass panels |
During Work the card shrinks into the top-right corner (~35%); from About on it sits in the left third (desktop) / top (phones), panels opposite.

## Decisions already made (do not revisit)
- Theme: photoreal space from real imagery (NASA Blue/Black Marble, CGI Moon Kit, Deep Star Maps, 3D Resources). No procedural stand-ins, clay objects or cartoon sprites. The train theme is gone; don't bring back stations, signage, HUD or Japanese labels.
- Lighting: the Earth is backlit by the sunrise behind its left limb (`EARTH_SUN`, 115° from the sub-camera point): night side dominant (dim cool moonlight from the right, warm city lights), a thin day crescent, a thin crisp rim. Never a bright slab or a haze over the surface: Earth exposure ~0.6, bloom threshold ≥ 0.9, god rays faint.
- The Moon orbits the camera (world space, independent of cursor parallax): right → left, climbing, ~70 s loop, ~38% on screen at 16:9; its phase changes because the sun key is fixed. The near objects (Moon, Hubble, card) share a key from the left (`SUN_DIR`) plus blue Earth-shine from below.
- Reduced motion (incl. Windows "Animation effects: Off", which the owner's PC has) slows ambient motion to ×0.3 (twinkle, shooting star, Moon, Hubble) and shrinks the card float; never fully static.
- One fixed canvas for the whole site; the card never unmounts. The sky is drawn in the canvas (opaque) with a CSS copy underneath as the instant / no-WebGL fallback.
- The card's look is final: geometry, materials, traced-W enamel inlay, pink edge, cursor tilt. Float: ±0.06 over ~5 s. It keeps the HDRI env map (plus a blue Lightformer below for the Earth-glow reflection; env never shown as background) and the scene's sun key + Earth-shine. The old pink/yellow CardLights are gone.
- One card, one writer: CameraRig computes the target pose as a pure function of progress and damps `cardState.position/quaternion/scale` with maath. Tilt is a separate offset (18° hero, ~10° elsewhere via `cardState.tilt`).
- The Moon uses envMapIntensity 0 and Hubble 0.5, so the city HDRI (there for the card) doesn't tint them.
- One scroll system: Lenis on gsap.ticker; per-frame DOM writes via gsap.ticker, no layout reads, no React state per frame.
- The W is the **traced logo SVG** `public/brand/webix-w.svg`. Never redraw it. The wordmark is the logo image, never set in a font.
- Hero copy is only the headline + one muted subline (it is the page h1). Nothing else: card, W, wordmark, Menu, scroll hint.
- Zero budget: free/OSS libraries, Google Fonts, CC0 assets only. No invented testimonials or stats.
- Card draws over everything via a depth-clear mesh (renderOrder 19); card on layer 1.
- No `anisotropy` on card materials (NaN artefacts).
- Menu order: Home · Work · Services · About · Contact.
- Work will be ThreeUI `BestsellersBookShowcase` (vendored, unmodified first, then restyled) — blocked on missing `pageTypography.ts` / `pageRecipes.ts`.

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
