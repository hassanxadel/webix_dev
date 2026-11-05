/**
 * The About section's ID badge on its lanyard. Shared, mutable, no React state
 * per frame: the 3D badge (three/Badge) writes where it is on screen; the HTML
 * hit area (site/Sections About) writes the pointer and whether it is held.
 */
export const badge = {
  /** Screen box of the badge face, CSS px (0 size = not on screen). */
  box: { x: 0, y: 0, w: 0, h: 0 },
  /** Pointer in NDC (−1..1, y up) while over or dragging the badge. */
  pointer: { x: 0, y: 0 },
  hover: false,
  held: false,
};
