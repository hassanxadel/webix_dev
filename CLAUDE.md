# Webix — "The Pass"

Agency site for Webix Software Solutions (websites, Shopify e-commerce, 3D/interactive web, branding; Egyptian market).
Concept: a Japanese bullet-train line. Scroll = a journey through 7 stations. Hero object = a 3D metal transit card
("Webix Pass") with the Webix W as an enamel inlay. It is stamped at each station and flips at the terminal.

## Stack + commands
- TanStack Start (React 19, SSR via Nitro), Vite 8, file routing (`src/routes/`, single page `/`). Tailwind v4, shadcn/ui.
- three **0.182.0 (pinned: ≥0.183 warns about THREE.Clock, which R3F uses)**, @react-three/fiber 9.8, drei 10.7,
  @react-three/postprocessing 3.0.4, gsap 3.13, lenis 1.3, react-hook-form + zod.
- `npm run dev` (port 5173) · `npm run build` · `npm run lint` · type-check: `npx tsc --noEmit -p .`
  (pre-existing errors in `src/components/ui/*` and `vite.config.ts` are not ours; filter them out).

## File map
- `src/routes/index.tsx` — page composition; `src/routes/__root.tsx` — head, fonts, meta.
- `src/config/stations.ts` — **single source of truth**: 7 stations (range, content window, stamp, anchor), JOURNEY_VH=1900, DEPARTURE beats, WORK_WINDOW, BLACKOUT/WORLD_ON, `toLegacy`/`fromLegacy` (3D world keeps its original timeline).
- `src/config/projects.ts` — Work windows data (derived from webix-data; tech tags = platform only, TODO real stacks).
- `src/lib/journey.ts` — scroll progress store (`journey` mutable + `journeyStore`), Lenis driven by gsap.ticker + ScrollTrigger (velocity), Work snap per window, `travelTo*`.
- `src/lib/heroPlate.ts` — hero photo plates, points of interest (reader, stripe, lights), cover math, HERO beat timings.
- `src/lib/webix-data.ts` — projects (6, real screenshots), services (4), process (4), RESULT_STATS (derived, no invented numbers).
- `src/lib/site-config.ts` — contact details (**placeholders**: email / WhatsApp / Instagram). `src/lib/inquiry.ts` — form schema + message.
- `src/components/site/` — HTML layer: `Stations.tsx` (all 7 sections; hero = `Departure`), `BackgroundLayer.tsx` (plate → departure run → Shinkansen cabin windows → blackout), `SceneLayer.tsx`,
  `Navbar`, `LineMap`, `StationSign`, `Hud` (+SoundToggle), `Loader`, `ContactForm`, `CaseStudyDialog`.
- `src/components/three/` — WebGL (lazy chunk):
  - `Experience.tsx` — Canvas, HDRI env, CardLights, World, tiers, Effects.
  - `WebixPass.tsx` — the card (+ `WInlay` from SVG) and `cardState`. `cardArt.ts` — card dims and printed front/back textures.
  - `CameraRig.tsx` — camera path driver, train state, **card choreography (screen-anchored poses)**.
  - `world.ts` — line geography, train timetable, door timing, camera keys (eased per segment; NOT Catmull-Rom).
  - `Platform.tsx` (platforms, reflective floor, canopy lights, track), `Train.tsx`, `Surroundings.tsx` (sky, skyline, tunnels),
    `StationFeatures.tsx` (service screens, billboards, micro-stops, split-flap board, terminal wall), `worldArt.ts` (canvas textures), `Effects.tsx`.
- `src/styles.css` — tokens + component classes (`.btn-primary`, `.btn-secondary`, `.glass`, `.hud`, `.field`, hero plate effects).
- Assets: `public/hero/plate(.webp|-mobile.webp)`, `public/brand/webix-w.svg` (traced W), `public/brand/webix-wordmark.png` (navbar),
  `public/hdri/shanghai_bund_1k.hdr` (CC0 Poly Haven), `public/work/*.jpg` (project screenshots).
  Sources: `src/assets/hero-plate*.png`, `src/assets/logo-w.png`. `scripts/trace-w.py` re-traces the W from the PNG.

## Design tokens (see `src/styles.css` `:root` / `@theme`)
- `--bg-night #070B14` page/scene bg · `--indigo #1A253A` panels, card body · `--yellow #FFDA24` primary CTA, active, gold W, LEDs
- `--pink #FF007F` neon/light sources only (card edge, train stripe, JP sign) · `--red #E81A2E` rare highlight · `--text #F4F1EA` warm white
- Tailwind names: `night indigo sun(yellow) neon(pink) signal(red) paper(text) dim`.
- Fonts: Poppins 600/700 headings · Inter body · JetBrains Mono HUD/labels (`.hud`) · Noto Sans JP. No retro/script fonts.
- Buttons: primary = solid yellow, navy text, uppercase, tracked, arrow; secondary = 1px warm-white outline.
- Rules: dark bg always; yellow = interaction; pink = light only; one neon colour dominant per frame; no flat bright backgrounds.

## Stations (progress 0→1 of page scroll; details in `src/config/stations.ts`)
| # | id | EN / JP | Message | Visual | Status |
|---|----|---------|---------|--------|--------|
| 01 | departure | Departure / 出発 | "Your ideas. / Our playground." + "We build digital journeys." + Get Started | Photo plate + card; pinned 240vh departure: 3/4 turn → plate slides/blurs, streaks, tunnel → cabin | **v3**, awaiting review |
| 02 | work | Work / 実績 | 6 projects through train windows; info + View project (case study) | HTML/CSS cabin windows (right ⅔), card left ⅓, snap per window, yellow edge pulse | **v2**, awaiting review |
| 03 | vision | About / ビジョン | Who Webix is + CTAs | 3D world fades in after a blackout; card right third | built v1 (procedural) |
| 04 | services | Services / サービス | Websites · E-commerce · 3D/Interactive · Branding | 4 platform screens light in sequence | built v1 |
| 05 | process | Process / プロセス | Discover → Design → Build → Launch | Express line, 4 micro-stop signs | built v1 |
| 06 | results | Results / 実績数値 | Derived stats only; testimonials = dev-only placeholder | Split-flap board | built v1 |
| 07 | terminal | Terminal / 終点 | "Your stop. Let's build it." + payoff + contact form | Doors open, neon 終点; card flips to back with 7 stamps | built v1 |
v1 stations use procedural geometry; the user's realism bar now rejects that look — expect reworks section by section.

## Decisions already made (do not revisit)
- Hero + Work: HTML background layer under a transparent canvas + **only the card in WebGL**. The 3D world, scene bg and post-processing switch on only at WORLD_ON, inside the full-black BLACKOUT before About, then a dimmer quad fades it in (never toggle at a visible frame).
- One card, one writer: CameraRig computes the target pose as a pure function of progress and damps `cardState.position/quaternion/scale` with maath. Tilt is a separate offset (18° hero, ~10° elsewhere via `cardState.tilt`).
- One scroll system: Lenis on gsap.ticker; per-frame DOM writes via gsap.ticker, no layout reads, no React state per frame.
- The W is the **traced logo SVG** `public/brand/webix-w.svg` (layers: face/rim/side) → enamel inlay (navy face recessed, gold rim, pink-red depth). Never redraw it.
- Hero copy stays minimal (headline, one ≤5-word sentence, one action). No eyebrow/paragraph/HUD/line map/sign on the hero.
- No procedural / cartoonish / low-poly geometry in new work. Realism from photos, lighting, materials.
- Zero budget: free/OSS libraries, Google Fonts, CC0 assets only. No invented testimonials or stats.
- Card draws over the world via a depth-clear mesh (renderOrder 19); card on layer 1 (excluded from floor reflections).
- No `anisotropy` on materials (NaN under mirrored renders + bloom). Keep puddle roughness ≥ ~0.27.
- Navbar: logo left, links right, no tagline. Nav order Home · Work · About · Services · Contact (page order).

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
