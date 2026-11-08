/**
 * The page's sections — single source of truth for scroll timing.
 * Every number is a fraction of total page scroll (0 → 1). The DOM sections,
 * the menu and the card choreography all read from this file.
 */

export type SectionId = "hero" | "work" | "about" | "services" | "process" | "contact" | "me";

export type Section = {
  id: SectionId;
  label: string;
  /** Scroll range owned by this section. */
  range: [number, number];
  /** Window in which the section's panel is on screen. */
  content: [number, number];
  /** Progress the menu jumps to. */
  anchor: number;
};

/** Section lengths in viewport heights (desktop; phones: `layoutPhone`). */
const VH: [SectionId, string, number][] = [
  ["hero", "Home", 160],
  ["work", "Work", 220],
  ["about", "About", 180],
  ["services", "Services", 180],
  ["process", "Process", 180],
  ["contact", "Contact", 160],
  ["me", "About Me", 100],
];

export const sectionVh = (id: SectionId) => VH.find(([s]) => s === id)![2];

/** Tailwind's `md` edge, where the compact phone panels end: below it the page scrolls naturally. */
export const PHONE_QUERY = "(max-width: 767.98px)";

/** Scroll distance of the page, in viewport heights: the last section is one screen, so the page ends as it fills the viewport. */
export let PAGE_VH = 0;

export const SECTIONS: Section[] = VH.map(([id, label]) => ({ id, label, range: [0, 0], content: [0, 0], anchor: 0 }));
const S = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;

/** The card glides from the centre to its side over the second half of the hero. */
export const HERO_GLIDE: [number, number] = [0, 0];

/** How far before / after a section boundary the card moves to its next pose, as fractions of the page. */
export const CARD_HOP: [number, number] = [0, 0];

function layoutDesktop() {
  PAGE_VH = VH.reduce((n, [, , vh]) => n + vh, 0) - VH[VH.length - 1][2];
  const at = (vh: number) => vh / PAGE_VH;
  let start = 0;
  VH.forEach(([, , vh], i) => {
    const range: [number, number] = [at(start), at(start + vh)];
    start += vh;
    Object.assign(SECTIONS[i], { range, content: [range[0] + at(30), range[1] - at(30)], anchor: range[0] + at(60) });
  });
  S("hero").anchor = 0;
  // About Me rises from below as the page ends: it counts from 60vh before the end, the badge from 30vh.
  S("me").range = [1 - at(60), 1];
  S("me").content = [1 - at(30), 1];
  S("me").anchor = 1;
  HERO_GLIDE[0] = S("hero").range[1] * 0.35;
  HERO_GLIDE[1] = S("hero").range[1];
  // Work: the filmstrip is on screen for almost the whole section.
  S("work").content = [S("work").range[0] + at(10), S("work").range[1] - at(30)];
  CARD_HOP[0] = 0.01;
  CARD_HOP[1] = 0.02;
}

/**
 * Phones: natural scroll, one screen per section. Each section owns the half screen either side of its resting position,
 * so the panels hand over with no empty stretch; the card moves while the next section's top crosses 80% → 20% of the screen.
 */
function layoutPhone() {
  PAGE_VH = (SECTIONS.length - 1) * 100;
  const at = (vh: number) => vh / PAGE_VH;
  SECTIONS.forEach((s, i) => {
    const rest = i * 100;
    const range: [number, number] = [at(Math.max(0, rest - 50)), at(Math.min(PAGE_VH, rest + 50))];
    Object.assign(s, { range, content: [...range], anchor: at(rest) });
  });
  // The hero's chrome has faded by 28vh, so Work takes over at 30vh.
  S("hero").range[1] = S("hero").content[1] = S("work").range[0] = S("work").content[0] = at(30);
  HERO_GLIDE[0] = at(20);
  HERO_GLIDE[1] = at(80);
  CARD_HOP[0] = CARD_HOP[1] = at(30);
}

// The prerendered HTML is desktop; section heights switch in CSS (.journey-section), so hydration matches.
if (typeof window === "undefined") layoutDesktop();
else {
  const phone = window.matchMedia(PHONE_QUERY);
  const apply = () => (phone.matches ? layoutPhone() : layoutDesktop());
  apply();
  phone.addEventListener("change", apply);
}

export const sectionIndex = (id: SectionId) => SECTIONS.findIndex((s) => s.id === id);
