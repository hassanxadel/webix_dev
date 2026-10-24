/**
 * World layout of "Platform 8" — one continuous night-time station that the
 * camera travels along. The platform runs down -Z; the left wall carries the
 * portfolio lightboxes and vending machines, the train waits on the right.
 */
export const WORLD = {
  floorY: 0,
  ceilingY: 5.6,
  wallX: -7,
  edgeX: 3,
  trackY: -1.2,
  trainX: 5.2,
  startZ: 14,
  endZ: -100,
} as const;

export const WORK_Z = (i: number) => -15 - i * 3.4;
export const WORK_Y = 2.15;
export const SERVICE_Z = (i: number) => -42 - i * 1.65;
export const PROCESS_Z = (i: number) => -66 - i * 5;
export const ABOUT_POSTER = { x: -1.6, z: -58 } as const;
export const CONTACT_WALL_Z = -99;
export const PILLAR_ZS = [0, -12, -36, -48, -62, -86];

export const COLORS = {
  indigo: "#1A253A",
  yellow: "#FFDA24",
  red: "#E81A2E",
  pink: "#FF007F",
  blue: "#4D8BFF",
  amber: "#FFB45C",
  night: "#05060c",
  haze: "#0b0f22",
} as const;
