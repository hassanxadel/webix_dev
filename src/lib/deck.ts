import { SERVICES } from "./webix-data";

/**
 * The hero's services deck: hovering (or tapping) the Webix Pass deals out one
 * pass per service. Shared, mutable, no React state: the HTML layer
 * (site/ServiceDeck: intent, links, accessibility) writes `open`, `hover` and
 * the tweens; the card (three/WebixPass) animates and writes back where the
 * card and each pass are on screen (CSS px), every frame.
 */
export const deck = {
  open: false,
  /** Per pass: 0 = stacked behind the card, 1 = dealt (the springy ease overshoots a little). */
  progress: SERVICES.map(() => ({ v: 0 })),
  /** Pass under the pointer or keyboard focus (-1 = none). */
  hover: -1,
  card: { x: 0, y: 0, w: 0, h: 0 },
  /** Screen box of each dealt pass; `alpha` = how far its HTML face has faded in over the 3D slab. */
  passes: SERVICES.map(() => ({ x: 0, y: 0, w: 0, h: 0, rot: 0, alpha: 0 })),
  /** Which layout the passes deal into (chosen to fit the window): 4 across, 2+2 beside the card, or a 2×2 grid below it. */
  layout: "fan" as "fan" | "split" | "grid",
  /** Screen box of the pass that was clicked: the service sub-section header grows out of it. */
  origin: null as DOMRect | null,
};
