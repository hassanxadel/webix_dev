/**
 * The hero's photographic plate and the points of interest in it, in the
 * image's own pixels. Shared by the HTML plate (parallax, light sweep, reader
 * glow) and the 3D card (which flies to the reader), so both agree on where
 * things are on screen.
 */

type Pt = { x: number; y: number };
export type Plate = {
  src: string;
  w: number;
  h: number;
  /** The gate's card reader — where the Pass taps in. */
  reader: Pt;
  /** The pink light stripe along the train's side, rear to nose. */
  stripe: [Pt, Pt];
  /** Practical lights that get a faint bokeh flicker. */
  lights: Pt[];
};

export const PLATES: Record<"desktop" | "mobile", Plate> = {
  desktop: {
    src: "/hero/plate.webp",
    w: 1376,
    h: 768,
    reader: { x: 75, y: 678 },
    stripe: [
      { x: 446, y: 376 },
      { x: 822, y: 394 },
    ],
    lights: [
      { x: 118, y: 52 },
      { x: 690, y: 92 },
      { x: 862, y: 26 },
    ],
  },
  mobile: {
    src: "/hero/plate-mobile.webp",
    w: 768,
    h: 1376,
    reader: { x: 210, y: 1147 },
    stripe: [
      { x: 40, y: 676 },
      { x: 330, y: 700 },
    ],
    lights: [
      { x: 596, y: 168 },
      { x: 478, y: 276 },
      { x: 716, y: 80 },
    ],
  },
};

/** Portrait screens get the portrait plate. */
export const plateFor = (vw: number, vh: number) => (vw / vh < 0.9 ? PLATES.mobile : PLATES.desktop);

/** `object-fit: cover`, centred: scale and offset that map image pixels to viewport pixels. */
export function coverLayout(plate: Plate, vw: number, vh: number) {
  const s = Math.max(vw / plate.w, vh / plate.h);
  return { s, ox: (vw - plate.w * s) / 2, oy: (vh - plate.h * s) / 2 };
}

/** A plate point in viewport pixels. */
export function plateToViewport(plate: Plate, p: Pt, vw: number, vh: number) {
  const { s, ox, oy } = coverLayout(plate, vw, vh);
  return { x: ox + p.x * s, y: oy + p.y * s };
}

/** Hero scroll range (fraction of the journey) and its three beats. */
export const HERO = {
  end: 0.15,
  /** Beat 1: copy out, card turns to 3/4. */
  turn: [0, 0.054] as [number, number],
  /** Beat 2: card glides to the reader; plate blurs and pushes in. */
  glide: [0.054, 0.11] as [number, number],
  /** The tap. */
  tap: 0.11,
  /** Beat 3: card settles to the right third; Vision copy arrives. */
  settle: [0.126, 0.15] as [number, number],
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const ramp = (p: number, [a, b]: [number, number]) => clamp01((p - a) / (b - a));
export const smooth = (x: number) => x * x * (3 - 2 * x);
