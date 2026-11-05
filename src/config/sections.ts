/**
 * The page's sections — single source of truth for scroll timing.
 * Every number is a fraction of total page scroll (0 → 1). The DOM sections,
 * the menu and the card choreography all read from this file.
 */

export type SectionId = "hero" | "work" | "about" | "services" | "process" | "results" | "contact";

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

/** Section lengths in viewport heights. */
const VH: [SectionId, string, number][] = [
  ["hero", "Home", 160],
  ["work", "Work", 220],
  ["about", "About", 180],
  ["services", "Services", 180],
  ["process", "Process", 180],
  ["results", "Results", 160],
  ["contact", "Contact", 160],
];

/** Total scroll length of the page, in viewport heights. */
export const PAGE_VH = VH.reduce((n, [, , vh]) => n + vh, 0);
const at = (vh: number) => vh / PAGE_VH;

let start = 0;
export const SECTIONS: Section[] = VH.map(([id, label, vh], i) => {
  const range: [number, number] = [at(start), at(start + vh)];
  start += vh;
  const last = i === VH.length - 1;
  return { id, label, range, content: [range[0] + at(30), last ? 1 : range[1] - at(30)], anchor: range[0] + at(60) };
});

const S = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
S("hero").anchor = 0;
S("contact").anchor = 1;

/** The card glides from the centre to its side over the second half of the hero. */
export const HERO_GLIDE: [number, number] = [S("hero").range[1] * 0.35, S("hero").range[1]];

/** Work: one snap point per project, from the first panel to the last. */
export const WORK_WINDOW: [number, number] = [S("work").range[0] + at(40), S("work").range[1] - at(80)];
S("work").content = [S("work").range[0] + at(10), S("work").range[1] - at(30)];
S("work").anchor = WORK_WINDOW[0];

export const sectionIndex = (id: SectionId) => SECTIONS.findIndex((s) => s.id === id);
