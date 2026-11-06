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

/** Section lengths in viewport heights. */
const VH: [SectionId, string, number][] = [
  ["hero", "Home", 160],
  ["work", "Work", 220],
  ["about", "About", 180],
  ["services", "Services", 180],
  ["process", "Process", 180],
  ["contact", "Contact", 160],
  ["me", "About Me", 100],
];

/** Scroll distance of the page, in viewport heights: the last section is one screen, so the page ends as it fills the viewport. */
export const PAGE_VH = VH.reduce((n, [, , vh]) => n + vh, 0) - VH[VH.length - 1][2];
const at = (vh: number) => vh / PAGE_VH;

let start = 0;
export const SECTIONS: Section[] = VH.map(([id, label, vh]) => {
  const range: [number, number] = [at(start), at(start + vh)];
  start += vh;
  return { id, label, range, content: [range[0] + at(30), range[1] - at(30)], anchor: range[0] + at(60) };
});

const S = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
S("hero").anchor = 0;
// About Me rises from below as the page ends: it counts from 60vh before the end, the badge from 30vh.
S("me").range = [1 - at(60), 1];
S("me").content = [1 - at(30), 1];
S("me").anchor = 1;

/** The card glides from the centre to its side over the second half of the hero. */
export const HERO_GLIDE: [number, number] = [S("hero").range[1] * 0.35, S("hero").range[1]];

/** Work: the filmstrip is on screen for almost the whole section. */
S("work").content = [S("work").range[0] + at(10), S("work").range[1] - at(30)];

export const sectionIndex = (id: SectionId) => SECTIONS.findIndex((s) => s.id === id);
