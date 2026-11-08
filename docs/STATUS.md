# Status

## Current state
- Mobile polish (2026-11-08): phones scroll naturally, one screen per section (`layoutPhone` in `config/sections.ts`; 700vh, was 1180vh), snap proximity on touch phones; Work heading on two lines, phone hint gone, smaller controls with 44 px tap areas; touch no longer feeds the camera parallax (cause of the badge sitting 13% left); phone header bar on other pages, /contact links clear of WhatsApp. **The live form stays "not connected" until `VITE_WEB3FORMS_KEY` is added as a Cloudflare build variable.** Headless checks cannot simulate iOS momentum or the address bar: check swipe feel on a real phone.
- Mobile + content (2026-11-07): Work rail horizontal on phones (swipe, prev/next + dots); About / Services / Process / Contact fit one screen on phones; `/contact` page with the shared form; About Me badge floats in place on phones (cause of the drop: progress used `innerHeight` vs `vh` heights + resize-triggered physics rebuilds); `config/business.ts` with prices, timelines, payment terms and support plans (owner to review); every TODO filled (story, Why Webix, FAQ, project challenge / outcome / stack, meta, og:image); footer. **Redeploy** (push) and keep `VITE_WEB3FORMS_KEY` as a Cloudflare build variable.
- Pre-launch 2 (2026-11-06): contact form honeypot sent only when ticked, clear error if the key is missing (real browser sends return `success: true`; **arrival in Outlook still to be confirmed by the owner**). One `<Button>` (19 buttons migrated, old classes removed, static error page matched). Work cards ×1.2, phones ≈90vw focused. `/projects` + `/projects/:slug` + Menu item + "View all projects", one data source. Static build (9 pages, 404 page) checked in headless Chrome against the built files.
  **To launch:** push `main`; Cloudflare Pages → connect the repo, build `npm run build`, output `dist/client`, env `VITE_WEB3FORMS_KEY`. Then send a test inquiry from the live site. Open owner items: owner name/title in `site-config.ts`, gallery images, real tech stacks, the 4 Who we are TODOs, absolute `og:image` URLs once the domain is known.
- Pre-launch edits (2026-11-06): stars enlarge in the lens (`uZoom`, big stars instanced quads); Work cards +30%, Pass 5vw further left;
  "Who we are" button + `/about-webix` page + Menu item; Results removed; contact form emails via Web3Forms (Instagram field, EGP
  budgets; tested with a stubbed fetch only, no real send); About Me is the badge alone, one screen, centred, "SOFTWARE ENGINEER" above
  the name, the Pass shrinks away. Text-only checks passed at 1920 / 1440 / 1280 / 1024 / 390 / 844×390 as relevant; no console errors.
- About Me (2026-11-05, later): new last section (Menu: after Contact); the badge moved here from About, centred, two straps, photo,
  opaque lit faces. Box check: badge centred at 31.3vw beside the copy (1920, 1280), 26vw / 69vw above it (1024, 390), photo loaded, no box in Contact / About.
- Work (2026-11-05, later): filmstrip cards with a 16:9 media area (1280×720 WebP from the top of each site); the Webix Pass top-right,
  fully visible (24.6vw at 16:9, 27vw phones), clear of the Menu, title and the filmstrip's cards (text-only box check).
- Hero polish (2026-11-05, later): white, slower stars; WhatsApp icon bottom-left above the magnifier toggle; subline removed;
  wordmark −36%; phones: 74vw card, FOV 68°, grid deal + ✕, no magnifier, DPR ≤ 1.5, fewer stars, 2K textures; safe-area insets.
  Overlap check (text only): no overlaps at 360/390/430 portrait, 780/844/932 landscape, 1280/1440/1920 (W, Menu, headline, card, Get started, WhatsApp, toggle, hint, wordmark; dealt passes 124–307 px, none clipped)
- Contact (2026-11-05): real email + WhatsApp (+ @webix_dev) everywhere via `SITE_CONFIG`; floating WhatsApp button bottom-right
  (lifted above the wordmark in the hero); Instagram placeholder removed.
- About (2026-11-05): founder's crew pass on a Rapier lanyard in the main canvas (one canvas rule kept), drag via an HTML hit area,
  physics paused off-screen, still badge under reduced motion. Name/title from `SITE_CONFIG.owner*` (TODO confirm); photo placeholder.
- Headless CDP check (no screenshots, 2026-11-05): no console errors at 1920×1080 / 1024×768 / 390×844; deck = fan / split / grid,
  no overlaps, clear of the card, on screen; badge box left third (desktop) / top centre (phone). Not verified: badge sway physics
  (the software GPU stalls frames), any visual look.
- Work (2026-11-05): ThreeUI CharacterCarousel filmstrip, vendored byte-exact (hashes verified), mapped to the 6 projects and restyled
  to space (transparent, navy frames, yellow/pink, JetBrains Mono); front card → case study; card tucked in the corner.
- Hero fixes (2026-11-05): sun disc / flare / god rays removed (orange rim + sky glow kept); ~34 big twinkling stars; service deck
  redesigned (brand cards stacked behind the card, fit-to-window layout fan/split/grid, hover forward + dim others), one sub-section
  per service (`#service-<slug>` overlay, FLIP from the card, Get started → contact preset); "Get started" logo pill under the card;
  magnifier lens (WebGL ×2.3) with a toggle by the scroll hint.
- Hero round 3 (2026-11-01): headline font self-hosted (Lilita One) at clamp(48px, 7vw, 112px) ~15% from the top, −5°, bevel;
  subline in the same lettering. Earth: Egypt/Nile/Mediterranean at load, day left / twilight / night right, 8K KTX2 (desktop) /
  4K KTX2 (touch), GEBCO relief, cloud shadows, more city lights, 5-min spin; green airglow removed, orange rim + sky glow.
  Card job: services deck (4 passes) on hover/tap, real button + links, click → fly + scroll to Services.
- Hero fixes (2026-11-01): Moon orbits the camera (was screen-pinned with a ~25 px drift, ×0.3 under reduced motion → looked static); Earth rebuilt as a night side (moonlit terrain, GEBCO relief, land mask, warm city lights, thin crescent, thin blue rim + green airglow, gold only near the sun; exposure 0.6, bloom 0.9, faint god rays); headline lowered to ~16% and lettered like the logo (Lilita One, `.logo-type`).
- Hero polish (2026-11-01): Earth backlit (night + city lights, thin crescent, thin rim), exposure 0.7, bloom threshold 0.88; fast twinkle + sparkles + shooting star; nebula/galaxies with faint pink and gold; Moon normal map + drift; Hubble PBR + path; card ~29% width; headline "We launch brands into orbit."
- Hero rebuilt photoreal (2026-11-01): Earth limb at sunrise (NASA Blue/Black Marble, clouds, ocean specular, atmosphere), NASA Moon, Hubble glb, NASA Deep Star Map + 1500 twinkling stars, god rays/bloom/ACES/edge aberration. Moon terrain, Neptune, fog and dust removed.
- Order: Hero → Work → About → Services → Process → Results → Contact. W top-left + Menu top-right on every section.
- Train/station theme fully removed (world, plates, signs, line map, HUD, sound, JP labels, post-processing).
- Build and type-check pass. Visuals and runtime shader compile not yet checked (the in-app browser pane doesn't run rAF while hidden). Local `main` is ahead of `origin/main` (not pushed).
- Archive branch `archive/synthwave-lens` holds the earlier synthwave/lens version.

## Next up
- User reviews the hero (desktop, phone, Animation effects on/off). Checked text-only in headless Chrome (CDP): no console
  errors; 8K KTX2 load (sRGB/linear, mips, aniso 16); deck opens/folds, fan on screen and clear of the headline and Menu at
  942×504, 1262×624, 1422×804, 1902×984 and 390×844 (touch, 2×2 grid); a pass click scrolls to Services. Not checked: how
  anything looks (no screenshots), the animation feel on a real GPU.
- User reviews the hero in the browser; then push.

## Known issues
- Badge chunk ~2.3 MB (~860 KB gz; Rapier WASM inlined) — lazy, once the visitor reaches Contact.
- `/about-webix` TODOs (dev-only markers): Webix story, timelines per project type, payment terms, maintenance terms.
- Star map in the lens is the 4K map upscaled ~4×: soft by resolution, not filtering. An 8K map would need a new asset.
- No site footer exists (the brief's "same footer"). `VITE_WEB3FORMS_KEY` must also be set on the host at build time.
- Work filmstrip: wheel over the iframe browses the carousel and does not scroll the page (move the pointer off it, or use keys).
- Work tags/tech from the old panels are not shown in the filmstrip (name, number, type only).
- Service timelines are TODO (`TIMELINE_TBD` in `webix-data.ts`); "who it's for" / intro copy written from the existing service text — confirm.
- Magnifier built from the written spec; the Sketchbook loupe source block was empty in the request.
- Name / title on the badge are the brief's "[CONFIRM]" values; no Instagram account given (link removed); no footer yet.
- Work tech tags show only the platform — TODO real stacks in `src/config/projects.ts`.
- Contact copy still says "Your stop." / "…make a train station feel real…" — kept as content; replace if the user wants new lines.
- Card back print (never shown now) still exists in `cardArt.ts`.
- "Imagery: NASA" credit is in the README; add it to the site footer when one exists.
- Headline: the earlier "default font, small, at the top" report could not be reproduced (computed styles were correct on a
  fresh server); the font is now self-hosted so it can't fall back. If it ever looks plain again: hard reload first.
- Shader compiler warnings (D3D X4122/X4008) appear in the console on Windows; pre-existing, not errors.
- Real-GPU performance and reduced-motion behaviour not yet verified by the user.

## Log (newest first, keep ≤10)
- 2026-11-08 · mobile polish · one-screen phone sections + snap, Work heading / controls, badge centred (touch out of parallax), phone header bar, /contact links · 61e0246 (and this commit)
- 2026-11-07 · mobile + content · horizontal rail + swipe, compact phone panels, /contact, floating phone badge + vh progress fix, business.ts, all TODOs filled, footer · 4c31778 907fda6 d49e471 e011c18 bea3dba
- 2026-11-07 · launch · live at https://webix-dev.18p1726.workers.dev (all pages, 404, assets, no console errors); absolute og/twitter images via `SITE_URL`. Open: `VITE_WEB3FORMS_KEY` missing from Cloudflare build variables (live form not connected) · (this commit)
- 2026-11-07 · launch · `wrangler.jsonc`: Cloudflare Workers serves `dist/client` as static assets (stops Wrangler auto-converting to SSR); checked with wrangler 4.158.0 dry run + local serve · (this commit)
- 2026-11-07 · launch · Cloudflare build fix: prerender one page at a time (2-CPU builder died on a parallel fetch; reproduced with a 10 ms connect timeout), Node pinned in `.node-version` · (this commit)
- 2026-11-06 · launch prep · contact honeypot, one Button, Work cards ×1.2, Projects pages, static build + 404 · (this commit)
- 2026-11-06 · pre-launch · lens stars, Work sizing, Who we are page, Results removed, Web3Forms, About Me badge only · (these commits)
- 2026-11-05 · about me · new last section, two-strap badge, photo, visible lighting · (this commit)
- 2026-11-05 · about · Webix Pass on the right, copy on the left · (this commit)
- 2026-11-05 · work · 16:9 filmstrip cards, Webix Pass visible top-right · (this commit)
