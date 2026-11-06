import { useEffect } from "react";
import filmstrip from "@/shaders/character-carousel/sources/character-filmstrip.html?raw";
import { CharacterCarousel } from "@/shaders/character-carousel/CharacterCarousel";
import { WORK } from "@/config/projects";
import { journeyStore } from "@/lib/journey";
import "@/shaders/threeui.css";

/**
 * Work: the ThreeUI CharacterCarousel (filmstrip), mapped to Webix projects and
 * restyled to the space theme. The vendored source stays byte-exact; this file
 * applies checked string transforms at the host boundary: projects in place of
 * the profiles (media = project screenshot, 16:9 WebP; footer = number,
 * name, type), the embedded JPEGs dropped, a theme stylesheet added (transparent
 * stage, navy frames, warm-white text, yellow / pink accents, JetBrains Mono,
 * faint grain), and one message out: clicking the card already in front asks the
 * page to open that project's case study. Motion, rail and input are untouched.
 */

const MESSAGE = "webix-project";
const short = (type: string) => (/commerce/i.test(type) ? "E-commerce" : type.split(" ")[0]);
// Twice round, so the looping rail never shows the same card at both ends.
const CARDS = [...WORK, ...WORK].map((w) => ({
  name: w.name,
  role: short(w.type),
  image: w.image,
  no: String(w.index + 1).padStart(2, "0"),
  project: w.index,
}));

const THEME = /* css */ `<style data-webix-theme>
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap");
:root { color-scheme: dark; background: transparent; font-family: "JetBrains Mono", ui-monospace, monospace; }
html, body { background: transparent !important; }
.stage, .stage[class] {
  background:
    linear-gradient(90deg, rgba(244, 241, 234, 0.045) 1px, transparent 1px) 50% 0 / 25% 100%,
    radial-gradient(circle at var(--pointer-x) 48%, rgba(255, 218, 36, 0.09), transparent 34%) !important;
}
@media (max-width: 650px) {
  .stage { background: radial-gradient(circle at 50% 50%, rgba(255, 218, 36, 0.09), transparent 35%) !important; }
}
.stage::before {
  opacity: 0.1;
  mix-blend-mode: screen;
  background: repeating-radial-gradient(circle at 12% 18%, rgba(244, 241, 234, 0.14) 0 0.5px, transparent 0.7px 4px);
}
.stage::after { background: none; }
/* 16:9 media: a wider, landscape card (only its size changes; the rail, spacing and motion are the source's). */
/* The focused card is ×1.23 and about as tall as this width is wide, so 80vh of this frame keeps it from clipping on short windows. */
.card { width: min(clamp(296px, 29.64vw, 452px), 80vh); aspect-ratio: 1.24; }
.portrait { inset: 7px 7px auto 7px; aspect-ratio: 16 / 9; }
/* Footer: the space under the media (card height − 3 gaps − (124% of the height − 14px) × 9/16). */
.footer { top: calc(69.75% + 6.125px); height: auto; }
/* Phones: 73vw × the focus scale of 1.23 ≈ 90vw on screen. */
@media (max-width: 650px) { .card { width: min(73vw, 405px); } }
.card {
  border-color: rgba(255, 218, 36, 0.32);
  border-radius: 8px;
  color: #f4f1ea;
  background: #1a253a;
  box-shadow:
    0 calc(10px + var(--focus) * 24px) calc(18px + var(--focus) * 36px) rgba(2, 5, 14, calc(0.4 + var(--focus) * 0.3)),
    inset 0 0 0 1px rgba(244, 241, 234, 0.07);
}
.card::before { border-color: rgba(255, 218, 36, calc(0.08 + var(--focus) * 0.3)); }
.card:focus-visible { box-shadow: 0 26px 50px rgba(2, 5, 14, 0.6), 0 0 0 3px #ffda24; }
.portrait { background: #0a1430; }
.portrait img {
  object-fit: cover;
  object-position: 50% 0;
  filter: saturate(calc(0.55 + var(--focus) * 0.45)) brightness(calc(0.7 + var(--focus) * 0.3)) contrast(1.04);
}
.footer { color: #f4f1ea; background: #070b14; }
.index { border-color: #ffda24; color: #ffda24; font-family: "JetBrains Mono", ui-monospace, monospace; }
.name { color: #f4f1ea; font-family: "JetBrains Mono", ui-monospace, monospace; font-weight: 700; letter-spacing: 0.04em; }
.role { color: #ff3d9a; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: clamp(7px, 0.55vw, 9px); }
</style>`;

/** Replace `from` with `to`, or fail loudly in dev if the source no longer has it. */
function swap(html: string, from: string | RegExp, to: string) {
  const out = html.replace(from, to);
  if (out === html && import.meta.env.DEV) throw new Error(`WorkFilmstrip: source anchor not found: ${String(from).slice(0, 60)}`);
  return out;
}

let doc = filmstrip;
doc = swap(doc, /\n      const portraits = \{[\s\S]*?\n      \};\n/, "\n");
doc = swap(doc, /const profiles = \[[\s\S]*?\]\.map\(\(\[name, role, portrait\]\) => \(\{ name, role, portrait \}\)\);/, `const profiles = ${JSON.stringify(CARDS)};`);
doc = swap(doc, '<img src="${portraits[profile.portrait]}" alt="Generated portrait of ${profile.name}">', '<img src="${profile.image}" alt="Screenshot of the ${profile.name} website" width="1280" height="720" decoding="async">');
doc = swap(doc, '<span class="index">${String(index + 1).padStart(2, "0")}</span>', '<span class="index">${profile.no}</span>');
doc = swap(doc, 'card.setAttribute("aria-label", `Focus ${profile.name}, ${profile.role}`);', 'card.setAttribute("aria-label", `${profile.no} ${profile.name}, ${profile.role}. Select again to open the project.`);');
doc = swap(
  doc,
  'card.addEventListener("click", () => moveTo(index));',
  `card.addEventListener("click", () => { if (index === nearestIndex()) parent.postMessage({ type: "${MESSAGE}", index: profiles[index].project }, "*"); moveTo(index); });`,
);
doc = swap(doc, "<title>Character Filmstrip</title>", "<title>Webix projects</title>");
doc = swap(doc, '<h1 class="sr-only">Character Filmstrip</h1>', '<h1 class="sr-only">Webix projects</h1>');
doc = swap(doc, "browse the portraits.", "browse the projects. Select the card in front to open it.");
doc = swap(doc, "</head>", `${THEME}</head>`);
const SOURCE = doc;

export function WorkFilmstrip() {
  // The only message the frame sends; validated before it opens anything.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: unknown; index?: unknown } | null;
      if (d?.type !== MESSAGE || !Number.isInteger(d.index) || (d.index as number) < 0 || (d.index as number) >= WORK.length) return;
      journeyStore.set({ openProject: d.index as number });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="work-film absolute inset-x-0 bottom-[3vh] top-[26vh]">
      <CharacterCarousel variant="filmstrip" source={SOURCE} speed={1.0} scale={1.0} opacity={1.0} hue={0} saturation={1.0} brightness={1.0} />
    </div>
  );
}
