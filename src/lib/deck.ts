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
  /** Pass flying at the camera after a click (-1 = none) and its 0..1 progress. */
  launch: -1,
  fly: { v: 0 },
  card: { x: 0, y: 0, w: 0, h: 0 },
  passes: SERVICES.map(() => ({ x: 0, y: 0, w: 0, h: 0, rot: 0, alpha: 0 })),
};
