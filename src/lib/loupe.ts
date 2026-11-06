/**
 * The hero's magnifier lens. Shared, mutable, no React state per frame:
 * the HTML lens (site/Loupe) writes where it is; the 3D side (three/LoupeView)
 * renders the zoomed scene under it. `on` (the toggle) lives in journeyStore.
 */
export const loupe = {
  /** On screen this frame (toggle on, in the hero). */
  visible: false,
  /** Centre and radius of the glass, CSS px. */
  x: 0,
  y: 0,
  r: 90,
  /** Bumped whenever the lens moves, so the zoom re-renders right away. */
  moved: 0,
};

/** Magnification (as in the Sketchbook loupe). */
export const MAG = 2.3;

/**
 * Star uniforms shared by every star material. Star sizes are in screen px, so a narrower
 * FOV alone only moves stars apart: the lens pass sets `zoom` to MAG and `res` to its own area.
 */
export const starPass = { zoom: { value: 1 }, res: { value: [1, 1] } };
