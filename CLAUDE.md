# Webix — minimal space site

Agency site for Webix Software Solutions (websites, Shopify e-commerce, 3D/interactive web, branding; Egyptian market).
Concept (Igloo-style, in space): the "Webix Pass" metal card (Webix W enamel inlay) floats above a realistic moon
surface that fades into haze, a planet rising on the horizon, a deep dark-blue twinkling starfield behind. Calm, photographic.

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
  - `Experience.tsx` — the one Canvas: fog, sun/fill, SkyDome, Stars, Terrain, Dust, Planet, HDRI env (card reflections only), CardLights, card, Effects.
  - `Stars.tsx` — one `THREE.Points` star field on 3 far shells: Gaussian points, magnitude spread, sin+detuned-sin twinkle, scintillation.
  - `Space.tsx` — SkyDome, Terrain (CPU-displaced fBm + craters, procedural normal map, shadows), SunLights, Planet (texture + terminator +
    Fresnel atmosphere), Dust (bokeh motes). `Effects.tsx` — NaN guard, DoF on the card, bloom, ACES, vignette, grain.
  - `WebixPass.tsx` — the card (+ `WInlay` from SVG) and `cardState`. `cardArt.ts` — card dims and printed front/back textures.
  - `CameraRig.tsx` — camera framing + idle drift + mouse parallax; the card's single writer (screen-anchored poses, maath damping).
- `src/styles.css` — tokens + component classes (`.btn-primary`, `.btn-secondary`, `.glass` panel, `.hud`, `.field`, `.space-sky`).
- Assets: `public/brand/webix-w.svg` (traced W, top-right), `public/brand/webix-wordmark-trim.webp` (hero wordmark, cropped from
  `webix-wordmark.webp`), `public/hdri/shanghai_bund_1k.hdr` (CC0, card reflections), `public/work/*.jpg` (project screenshots),
  `public/space/neptune-{2k,1k}.webp` (Solar System Scope, **CC BY 4.0 — credit required**, see README).
  Source: `src/assets/logo-w.png`; `scripts/trace-w.py` re-traces the W.

## Design tokens (see `src/styles.css` `:root` / `@theme`)
- `--bg-night #070B14` page/scene bg · `--indigo #1A253A` panels, card body · `--yellow #FFDA24` primary CTA, active, gold W, LEDs
- `--pink #FF007F` small accents only (card edge, ring) · `--red #E81A2E` rare highlight · `--text #F4F1EA` warm white
- Tailwind names: `night indigo sun(yellow) neon(pink) signal(red) paper(text) dim`.
- Fonts: Poppins 600/700 headings · Inter body · JetBrains Mono small labels (`.hud`). No retro/script fonts.
- Buttons: primary = solid yellow, navy text, uppercase, tracked, arrow; secondary = 1px warm-white outline.
- Sky: `#0A1430` overhead → `#122042` at the horizon (fog uses `#122042`); dark blue, never black. Regolith `#5E636D`–`#8A8F99`.
- Rules: yellow = interaction; pink = small accents; lots of empty space; nothing decorative that isn't needed.

## Sections (progress 0→1 of page scroll; details in `src/config/sections.ts`)
| id | Content | Layout |
|----|---------|--------|
| hero | nothing but chrome | Card centre above the moon · W top-left · Menu top-right · scroll hint bottom-left · wordmark bottom-right |
| work | 6 projects (image, n/6, type, line, tags, View project → case study, live link) | Panels slide in/out per project, snap; reduced motion = vertical list |
| about | "Your ideas. Our playground." (h1) + "We build digital journeys." + vision copy + Get Started / Explore our work | Glass panel |
| services | 4 services | Glass panel |
| process | Discover → Design → Build → Launch | Glass panel |
| results | Derived stats; testimonials = dev-only placeholder | Glass panel |
| contact | "Your stop. Let's build it." + links + form | Glass panels |
During Work the card shrinks into the top-right corner (~35%); from About on it sits in the left third (desktop) / top (phones), panels opposite.

## Decisions already made (do not revisit)
- Theme: realistic space, Igloo-style (card above a moon surface, horizon planet, haze). Nothing cartoonish: no clay planets, rockets or sparkle sprites. The train theme is gone; don't bring back stations, signage, HUD or Japanese labels.
- Reduced motion (incl. Windows "Animation effects: Off", which the owner's PC has) keeps a slow, gentle twinkle; never fully static.
- One fixed canvas for the whole site; the card never unmounts. The sky is drawn in the canvas (opaque) with a CSS copy underneath as the instant / no-WebGL fallback.
- The card's look is final: geometry, materials, traced-W enamel inlay, pink edge, idle float, cursor tilt. It keeps the HDRI env map + CardLights for reflections (env never shown as background) and is also lit by the sun and the blue fill.
- One card, one writer: CameraRig computes the target pose as a pure function of progress and damps `cardState.position/quaternion/scale` with maath. Tilt is a separate offset (18° hero, ~10° elsewhere via `cardState.tilt`).
- Terrain keeps envMapIntensity ~0.08 so the city HDRI (there for the card) never tints the moon.
- One scroll system: Lenis on gsap.ticker; per-frame DOM writes via gsap.ticker, no layout reads, no React state per frame.
- The W is the **traced logo SVG** `public/brand/webix-w.svg`. Never redraw it. The wordmark is the logo image, never set in a font.
- Hero has no copy: card, W, wordmark, Menu, scroll hint only.
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
