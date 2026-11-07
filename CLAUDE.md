# Webix — minimal space site

Agency site for Webix Software Solutions (websites, Shopify e-commerce, 3D/interactive web, branding; Egyptian market).
Concept: photoreal space. The "Webix Pass" metal card (Webix W enamel inlay) floats above the Earth (Egypt, the Nile and the
Mediterranean at sunrise: day on the left, night with city lights on the right), the Moon slowly orbiting past behind it, Hubble
drifting far above, NASA's real star sky behind with a twinkling star layer. Hovering the card deals out the services. Calm, cinematic.

## Stack + commands
- TanStack Start (React 19, SSR via Nitro), Vite 8, file routing (`src/routes/`, single page `/`). Tailwind v4, shadcn/ui.
- three **0.182.0 (pinned: ≥0.183 warns about THREE.Clock, which R3F uses)**, @react-three/fiber 9.8, drei 10.7,
  maath (damping), @react-three/postprocessing 3.0.4 + postprocessing 6.39, gsap 3.13, lenis 1.3, react-hook-form + zod.
- Env: `VITE_WEB3FORMS_KEY` (contact form) in `.env` (git-ignored; `.env.example` documents it). It's read at build time, so hosting needs it too.
- `npm run dev` (port 5173) · `npm run build` (static: every page prerendered into `dist/client`) · `npm run lint` · type-check: `npx tsc --noEmit -p .`
  (pre-existing errors in `src/components/ui/*` and `vite.config.ts` are not ours; filter them out).

## File map
- `src/routes/index.tsx` — home composition; `src/routes/about-webix.tsx` — the "Who we are" page (CSS star sky, no 3D, same Menu; story, Why Webix, timelines, pricing, payment terms, support plans and FAQ, the business values from `config/business.ts`); `src/routes/contact.tsx` — `/contact`, the inquiry form on its own page (phones reach it from the Contact card; `?service=<slug>` presets it); `src/routes/projects.index.tsx` — `/projects` (filter pills, 3/2/1-column grid); `src/routes/projects.$slug.tsx` — `/projects/:slug` (overview, what we did, tech, gallery + lightbox, prev/next; unique head); `src/routes/__root.tsx` — head, fonts, meta.
- `src/config/sections.ts` — **single source of truth**: 7 sections (range, content window, anchor), PAGE_VH (scroll distance: excludes the last, one-screen section), HERO_GLIDE.
- `src/config/business.ts` — **the one place for business values**: offers (starting price EGP + typical timeline), payment terms, support plans, hourly rate; services, Who we are and the FAQ read it.
- `src/config/projects.ts` — `WORK`, derived from `PROJECTS` and read by the carousel, `/projects` and the detail pages (16:9 cover, category, tech = the real stack).
- `src/lib/journey.ts` — scroll progress store (`journey` mutable + `journeyStore`), Lenis on gsap.ticker, `lockScroll`, `travelTo*`.
- `src/lib/webix-data.ts` — projects (6, real screenshots; `category`, `gallery[]`, `stack` (read from each live site), `challenge`, `timeline` (typical for the scope), `outcome` (qualitative); optional `results` / `testimonial` stay hidden until real ones are added: **the one source of project data**), services (4; timeline + price from business.ts), process (4; `short` for phones).
- `src/lib/site-config.ts` — real contact details (single source): email hassanadelh@outlook.com, WhatsApp +966 59 797 6116
  (`wa.me/966597976116`), handle @webix_dev, owner name/title (Hassan Adel, Founder & Lead Developer), badge photo, city, `SITE_URL`. No Instagram (none given). `src/lib/inquiry.ts` — form schema, EGP budgets, Web3Forms send, fallback message. `src/lib/instagram.ts` — @handle / URL normaliser (self-check: `node --experimental-strip-types scripts/check-instagram.mjs`).
- `src/shaders/` — **vendored ThreeUI, byte-exact** (SHA-256 checked; `.gitattributes` keeps LF): `character-carousel/CharacterCarousel.tsx`
  (+ one host prop, `source`), `sources/character-filmstrip.html`, `character-wave.html`, `threeui.css`. Never edit the HTML sources.
- `src/components/site/` — HTML layer: `WorkFilmstrip.tsx` (Work: string transforms on the filmstrip source — projects ×2 in,
  WebP 16:9 screenshots `public/work/film/` (1280×720, top of the site), cards clamp(296px,29.64vw,452px) (phones 73vw ≈ 90vw focused) with a 16:9 media area, theme CSS, a `webix-project` postMessage on selecting the front card → case study; horizontal at every width (the source's `compact` forced off), touch swipe (≥ 40 px, clearly horizontal; stage `touch-action: pan-y`; the click after a swipe is swallowed), phones: prev/next icon Buttons + dots under the rail (`webix-step` / `webix-active` messages, source-checked both ways)), `Sections.tsx` (all sections; glass panels), `ServiceDeck.tsx` (the card's services deck: button over
  the card, a real link over each pass, hint, Esc / tap-outside / 400 ms fold), `Menu.tsx` (W top-left, Menu button + overlay
  top-right, hero "Scroll down to discover" bottom-left + wordmark bottom-right), `SceneLayer.tsx` (CSS sky + lazy canvas), `Loader`, `ContactForm`, `CaseStudyDialog`, `Button.tsx` (the one button), `PageShell.tsx` (star sky + Menu + Footer for pages outside the journey; `Block`, `Pairs`), `Footer.tsx` (© 2026, quick links, email, WhatsApp; also a slim line at the end of the home page), `LogoWord.tsx`, `Lightbox.tsx`.
- `src/components/three/` — WebGL (lazy chunk):
  - `Experience.tsx` — the one Canvas: SunLights, Stars (+ big-star layer), StarMap, Earth, Moon, Hubble, HDRI env, LoupeView (magnifier pass),
    (card reflections only), card, CameraRig, Effects.
  - `Stars.tsx` — `StarMap` (NASA Deep Star Map on navy, its stars desaturated to white, + noise nebula wisps, faint pink nebula top-right,
    golden glow at the sunrise, 3 small galaxies) + `Stars` (white only #FFFFFF→#EEF3FF: 1500 points (600 on phones), 2–5 s twinkle per
    star, halo grows with brightness, 2% slow sparkles, spikes on the brightest 3%; + 34 big stars (14 on phones), 4–7 s, instanced quads so no GPU point-size cap) + `ShootingStar`. All share `starPass` (`src/lib/loupe.ts`): the lens pass sets `uZoom` = MAG.
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
  - `Badge.tsx` + `badgeArt.ts` — About Me: the crew pass worn on a two-strap Rapier lanyard (two fixed anchors above the screen, 0.3 of
    the badge apart; 3 rope links each, collision-filtered; both spherical-jointed to either side of the clip; MeshLine straps along
    Catmull-Roms with a twist-width; gravity −1.4 + drift; drag via `src/lib/badge.ts` + the HTML `BadgeHit`). Centred in the viewport;
    ~34vw (72vw phones), at most 86% of the height. Opaque printed faces (2048 px print as
    its own emissive + key + HDRI), clearcoat sleeve. Only in About Me (hidden + physics paused elsewhere); reduced motion = still badge,
    hover tilt. **Phones (`mobile`): `FloatBadge`, no physics**: centred, ±8 px bob, ±3° sway, curved straps that follow, a tap wobbles it. The layout ignores height-only resizes < 150 px (address bar); desktop physics has a safety net (beyond 35% of the view height from rest → steered back). Photo `public/about/me.webp` (from `src/assets/me.png`, cropped to the subject). Lazy chunk, loaded at Contact.
  - `CameraRig.tsx` — camera framing + idle drift + mouse parallax; the card's single writer (screen-anchored poses, maath damping).
- `src/styles.css` — tokens + component classes (`.btn`, `.glass` panel, `.hud`, `.field`, `.space-sky`).
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
- Buttons: **all buttons use `<Button>`** (`site/Button.tsx`, `.btn`; `asChild` for links and Radix triggers; never a new button class). A rounded pill in Lilita with an extruded edge, lifting on hover, pressing on click, ≥44 px tall. `primary` yellow/red edge · `secondary` indigo, yellow outline, pink edge · `ghost` transparent yellow outline · `icon` circle. Plain inline text links stay links; the WhatsApp icon, service cards and invisible hit areas are not buttons.
- Stars: white only (no yellow / pink / orange / blue tints, anywhere), calm twinkle (2–5 s; big 4–7 s), never in sync.
- Sky: deep navy `#050B1E`–`#0A1430` under the NASA star map; never pure black. Rim blue `#5B9BFF` turning orange-gold `#FF8A1F`→`#FFB547` at the sunrise; orange horizon glow + faint lower-left haze;
  city lights `#FFB547`→`#FFE2A0`. No green.
- Rules: yellow = interaction; pink = small accents; lots of empty space; nothing decorative that isn't needed.

## Sections (progress 0→1 of page scroll; details in `src/config/sections.ts`)
| id | Content | Layout |
|----|---------|--------|
| hero | h1 "we launch brands into orbit." (logo lettering, −5°; no subline) · services deck on the card · Get started pill · magnifier (desktop only) | Headline centred ~15% from the top · Moon orbits behind · hovering/tapping the card deals 4 brand service cards (4 across; 2+2 beside the card if narrower; 2×2 grid below on phones) · clicking one opens `#service-<slug>` · "Get started" pill under the card · magnifier lens (toggle next to the scroll hint; not on phones / touch) · card slightly below centre (~29% width desktop, ~74vw phone, FOV 68° portrait) · W top-left · Menu top-right · WhatsApp + toggle + scroll hint bottom-left · wordmark bottom-right (11.5vw / 32vw) · touch: ✕ on the card folds the deck · safe-area insets (`.safe-edges`) |
| work | 6 projects in the ThreeUI filmstrip (16:9 screenshot, nn, name, type; select the front card → case study) | Logo-lettered heading top-left · filmstrip 26vh→97vh, horizontal at every width (phones: swipe, prev/next + dots under the rail) · cards ×1.56 of the original · "View all projects" pill under the filmstrip (bottom-right on short, wide windows) · card top-right, 5vw in from the old spot, fully visible (~24vw desktop, ~27vw phones), above the filmstrip's cards · sr-only project list |
| about | "Your ideas. Our playground." (h2) + "We build digital journeys." + vision copy + Get Started / Explore our work / Who we are (→ `/about-webix`) | Glass panel on the left (`Section copy="left"`), the Webix Pass on the right, centred (~31vw); phones: card above, a compact panel (two lines + Who we are) |
| services | 4 services | Glass panel; phones: 2-column tiles (icon + name) that open each sub-section |
| process | Discover → Design → Build → Launch | Glass panel; phones: 2×2 grid (number, name, one short line) |
| contact | "Your stop. Let's build it." + links + form (Web3Forms → owner's email; Instagram optional; EGP budgets) | Glass panels; phones: one card with a "Start an inquiry" pill → `/contact` (the form's own page) |
| me | Only the 3D crew-pass badge on its two-strap lanyard (sr-only text for assistive tech) + a slim footer line | One screen (100svh, the page ends here); badge centred; the Webix Pass shrinks away as it enters, back on the way up |
Card path: hero centre → Work top-right (~24vw) → About right side, centred (~31vw; phones: above the copy, ~50vw) → from Services on the left third (desktop) / top (phones), panels opposite → scales to nothing in About Me.

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
- One scroll system: Lenis on gsap.ticker; per-frame DOM writes via gsap.ticker, no layout reads, no React state per frame. Scroll progress uses a measured CSS 100vh (once per resize), not `innerHeight`: section heights are in `vh`, which on phones ignores the address bar while `innerHeight` does not (that mismatch dropped About Me out of its window).
- The W is the **traced logo SVG** `public/brand/webix-w.svg`. Never redraw it. The wordmark is the logo image, never set in a font.
- Hero copy is only the headline (it is the page h1; the subline was removed 2026-11-05). Nothing else: card (+ its services deck), W,
  wordmark, Menu, WhatsApp, magnifier toggle, scroll hint, the "hover the pass" hint.
- Phones (< 768 px, `md:hidden` / `hidden md:block`): About, Services, Process and Contact have compact versions that fit one screen under the Pass (panels from 30vh); desktop markup is unchanged. Inputs are 16 px (iOS zoom).
- Phones / touch (`journeyStore.mobile` = `(max-width: 768px), (pointer: coarse)`): no magnifier (lens, toggle and render pass not
  mounted), DPR ≤ 1.5, ~40% of the stars, 2K Earth / star textures. Headline clamp(32px, 9vw, 48px) under the W / Menu row.
- WhatsApp (`Menu.tsx`): the official icon `public/brand/whatsapp.webp` (from `src/assets/WhatsApp_icon.png`), 46 px, bottom-left on every
  section; in the hero it sits 12 px above the magnifier toggle / scroll hint row.
- The card's job: hovering it (tap on touch, Enter/Space) deals out one pass per service from `SERVICES` (4; never invent more).
  The HTML layer owns intent and a11y (real button with aria-expanded, real links, Esc, 400 ms fold); the card animates and
  reports screen boxes through `deck`. Closed: brand slabs stacked behind the card (only coloured slivers peek; no text). Dealt: an HTML
  card (`.svc-card`: brand face yellow/pink/red/indigo, thick outline, extruded side, Lilita title, line icon) fades in over each slab;
  hover = forward ×1.1, others dim, line shown. Clicking one opens its sub-section (`site/ServiceDetail.tsx`, an overlay at
  `#service-<slug>`, FLIP from the card; Back / Esc / browser Back fold it to the card; Get started presets the contact form via
  `servicePreset` / `?service=<slug>`). Not a route: a route would unmount the one canvas. Reduced motion: fade in place.
- Magnifier (`site/Loupe.tsx` + `three/LoupeView.tsx`): gold→yellow bezel + handle, drag with easing (none under reduced motion), arrow
  keys; on by default on desktop; not on phones / touch. Built from the written spec: the Sketchbook source was not supplied.
- Big stars: ~34 extra points in clear sky (`buildBig` in `Stars.tsx`, rejection-sampled away from headline/card/corners/Earth), 4–7 s twinkle to ~off.
- Deck layouts (`dealLayout`): passes as large as fit — fan 0.45–0.55 of the card, split ≤ 0.75, grid ≤ 0.62 scaled to the width and the
  height left under the card (84 px kept free at the bottom); a pass below 120 px wide moves on to the next layout.
- Zero budget: free/OSS libraries, Google Fonts, CC0 assets only. No invented testimonials or stats. Business values (prices, timelines, terms, plans) live only in `config/business.ts`; project timelines are "typical for this scope", not tracked durations.
- Card draws over everything via a depth-clear mesh (renderOrder 19); card on layer 1.
- No `anisotropy` on card materials (NaN artefacts).
- Menu order: Home · Work · Services · About · Contact · About Me · Projects · Who we are. Page order: Hero → Work → About → Services → Process → Contact → About Me (last). Results was removed (2026-11-06).
- Contact form: Web3Forms from the browser (no backend), email required, phone optional, botcheck honeypot; a failure keeps the details and offers Try again + mailto / WhatsApp. No form data in the console.
- Links from `/about-webix` into the home page are plain `<a href="/#id">` (full load); the home page lands `/#section` on that section's anchor.
- Work is the ThreeUI CharacterCarousel **filmstrip** (2026-11-05), restyled only via an injected stylesheet + content transforms; its motion
  is untouched. Changed on request (2026-11-07): horizontal at every width, touch swipe, phone step buttons / dots. Work is 220 vh, no scroll snap. The iframe captures the wheel while the pointer is over it (inherent).

- Hosting: static. `prerender` in `vite.config.ts` writes every page to `dist/client`, because nothing needs a server at runtime (the contact form posts from the browser). So the site must stay free of server functions. `public/404.html` is the host's 404 page; without it Cloudflare Pages serves the home page for every bad URL. Host: Cloudflare Workers (Free), static assets only: `wrangler.jsonc` uploads `dist/client` (`drop-trailing-slash`, `404-page`); keep that file, or `wrangler deploy` auto-converts the project to an SSR Worker whose Vite plugin breaks on the filmstrip HTML. Static requests are free and unlimited; the terms have no non-commercial limit (they bar collecting card details on free plans); Vercel Hobby is non-commercial only. Build `npm run build`, deploy `npx wrangler deploy`, build variable `VITE_WEB3FORMS_KEY`. Prerender runs one page at a time (small builders time out otherwise); Node pinned in `.node-version`. Live: https://webix-dev.18p1726.workers.dev (`SITE_URL` in `site-config.ts`, used for absolute social-preview images; change it with a custom domain). If the build variable is missing, the build drops the form's send code and the live form says it isn't connected.

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
