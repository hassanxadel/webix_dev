import * as THREE from "three";

/**
 * Geography of the Webix Line. The track runs down −Z; platforms are on the
 * −X side of the train. Every station, the train timetable and the camera
 * path share these numbers.
 */
export const LINE = {
  trackX: 3.9,
  edgeX: 2.2,
  wallX: -6,
  floorY: 0,
  trackY: -1.15,
  canopyY: 5,
  /** Car 1 door, measured from the train's nose (head). */
  doorFromHead: 19,
} as const;

export type Zone = { z0: number; z1: number };

/** Platforms (z0 > z1). */
export const PLATFORMS = {
  departure: { z0: 2, z1: -58 },
  services: { z0: -320, z1: -380 },
  work: { z0: -422, z1: -498 },
  results: { z0: -702, z1: -758 },
  terminal: { z0: -768, z1: -845 },
} satisfies Record<string, Zone>;

export const TUNNELS: Zone[] = [
  { z0: -266, z1: -316 },
  { z0: -384, z1: -418 },
  { z0: -662, z1: -698 },
];

/** Open-air stretches with skyline views: the Vision ride and the express line. */
export const OPEN_LINE: Zone[] = [
  { z0: -58, z1: -266 },
  { z0: -498, z1: -662 },
];

export const GATES_Z = 0;
/** The aisle the visitor walks through, and the reader the card taps. */
export const GATE_AISLE_X = -0.9;
export const READER = new THREE.Vector3(-1.6, 1.09, 0.5);

export const SERVICE_SCREEN_Z = [-337, -345, -353, -361];
export const BILLBOARD_Z = [-438, -448, -458, -468, -478, -488];
// Each sign stands opposite the express-ride seat, 2.6 units ahead of the door.
export const MICRO_STOPS_Z = [-532.6, -567.6, -602.6, -637.6];
export const BOARD_Z = -737;
export const TERMINAL_WALL_Z = -806;

/* ───────────────────────── Train timetable ───────────────────────── */

/**
 * Nose position (z) against scroll progress. Each leg eases in and out, so
 * the train accelerates and brakes like a real one — and the express line's
 * micro-stops fall out of the same rule.
 */
const TIMETABLE: [number, number][] = [
  [0, 95],
  [0.095, 95],
  [0.15, -29],
  [0.188, -29],
  [0.335, -369],
  [0.448, -369],
  [0.49, -476],
  [0.613, -476],
  [0.634, -549],
  [0.641, -549],
  [0.66, -584],
  [0.667, -584],
  [0.686, -619],
  [0.693, -619],
  [0.712, -654],
  [0.72, -654],
  [0.765, -744],
  [0.848, -744],
  [0.905, -824],
  [1, -824],
];

const smooth = (t: number) => t * t * (3 - 2 * t);

export function trainHead(p: number) {
  for (let i = 0; i < TIMETABLE.length - 1; i++) {
    const [p0, z0] = TIMETABLE[i];
    const [p1, z1] = TIMETABLE[i + 1];
    if (p <= p1) return z0 + (z1 - z0) * smooth(Math.min(1, Math.max(0, (p - p0) / (p1 - p0))));
  }
  return TIMETABLE[TIMETABLE.length - 1][1];
}

/** Car 1 door z at progress p. */
export const doorZ = (p: number) => trainHead(p) + LINE.doorFromHead;

/** Door opening 0..1 — open while stopped at a platform the visitor uses. */
export function doorOpen(p: number) {
  const windows: [number, number][] = [
    [0.152, 0.19],
    [0.336, 0.45],
    [0.491, 0.615],
    [0.766, 0.85],
    [0.906, 1.01],
  ];
  for (const [a, b] of windows) {
    if (p >= a && p <= b) return Math.min(1, (p - a) / 0.008, (b - p) / 0.008);
  }
  return 0;
}

/* ───────────────────────── Camera path ───────────────────────── */

type Key = {
  p: number;
  pos: [number, number, number];
  look: [number, number, number];
  /** Coordinates are relative to car 1's door (z) — the camera is riding the train. */
  ride?: boolean;
};

const screen = (i: number): Key[] => [
  { p: 0.345 + i * 0.0277, pos: [0.4, 1.68, SERVICE_SCREEN_Z[i] + 3.6], look: [LINE.wallX, 2.05, SERVICE_SCREEN_Z[i]] },
];
// Facing −X, screen-right is −Z: aiming 2.2 units toward +Z puts the billboard right of the copy panel.
const billboard = (i: number): Key => ({ p: 0.5 + i * 0.0216, pos: [0.2, 1.72, BILLBOARD_Z[i] + 5.2], look: [LINE.wallX, 2.15, BILLBOARD_Z[i] + 2.2] });

/**
 * One continuous path: gates → platform → aboard → out at each station → the
 * terminal. Eased segments between these keys give smooth, cut-free motion.
 */
export const CAMERA_KEYS: Key[] = [
  { p: 0, pos: [GATE_AISLE_X, 1.62, 4.6], look: [GATE_AISLE_X, 1.45, 0] },
  { p: 0.04, pos: [GATE_AISLE_X, 1.6, 4.3], look: [GATE_AISLE_X, 1.4, 0] },
  { p: 0.068, pos: [-1.15, 1.6, 2.5], look: [READER.x, READER.y, READER.z] },
  { p: 0.095, pos: [GATE_AISLE_X, 1.6, 1.3], look: [GATE_AISLE_X, 1.55, -6] },
  { p: 0.122, pos: [GATE_AISLE_X, 1.65, -4], look: [3.6, 1.5, -12] },
  { p: 0.15, pos: [0.6, 1.66, -7.5], look: [LINE.trackX, 1.6, -10.5] },
  { p: 0.172, pos: [1.9, 1.62, -10], look: [6, 1.6, -10] },
  { p: 0.19, pos: [3.1, 1.55, 0.4], look: [7, 1.32, -0.6], ride: true },
  { p: 0.26, pos: [3.0, 1.55, 0.6], look: [7, 1.3, -1.6], ride: true },
  { p: 0.318, pos: [3.6, 1.6, 0], look: [-1, 1.6, -0.6], ride: true },
  { p: 0.334, pos: [2.2, 1.62, 0], look: [-4, 1.8, 0.5], ride: true },
  ...[0, 1, 2, 3].flatMap(screen),
  { p: 0.441, pos: [1.9, 1.62, -350], look: [6, 1.6, -350] },
  { p: 0.452, pos: [3.3, 1.6, 0.4], look: [7, 1.55, -0.8], ride: true },
  { p: 0.48, pos: [3.6, 1.6, 0], look: [-1, 1.6, -0.6], ride: true },
  { p: 0.491, pos: [2.2, 1.62, 0], look: [-4, 1.9, 2], ride: true },
  ...[0, 1, 2, 3, 4, 5].map(billboard),
  { p: 0.613, pos: [1.9, 1.62, -457], look: [6, 1.6, -457] },
  { p: 0.622, pos: [4.7, 1.55, -2.6], look: [0, 1.32, -3.2], ride: true },
  { p: 0.72, pos: [4.7, 1.55, -2.6], look: [0, 1.32, -3.2], ride: true },
  { p: 0.758, pos: [3.6, 1.6, 0], look: [-1, 1.7, -2], ride: true },
  { p: 0.772, pos: [1.2, 1.7, -717], look: [-1.8, 3.0, BOARD_Z] },
  { p: 0.84, pos: [0.7, 1.68, -721], look: [-1.8, 3.05, BOARD_Z] },
  { p: 0.851, pos: [1.9, 1.62, -725], look: [6, 1.6, -725] },
  { p: 0.862, pos: [3.3, 1.6, 0.4], look: [7, 1.55, -0.8], ride: true },
  { p: 0.89, pos: [4.6, 1.6, 0], look: [0, 1.62, 0], ride: true },
  { p: 0.93, pos: [3.4, 1.62, 0], look: [-4, 1.75, 0], ride: true },
  // Aim past the neon (toward −Z) so it sits between the copy and the form.
  { p: 0.965, pos: [1.6, 1.66, 0.4], look: [LINE.wallX, 2.1, -2.4], ride: true },
  { p: 1, pos: [1.1, 1.66, 0.6], look: [LINE.wallX, 2.1, -2.4], ride: true },
];

const toWorld = (k: Key, p: number, out: THREE.Vector3, which: "pos" | "look") => {
  const v = k[which];
  out.set(v[0], v[1], k.ride ? v[2] + doorZ(p) : v[2]);
  return out;
};

const tmp = [0, 1].map(() => new THREE.Vector3());

/**
 * Camera position and look target at progress p (train-relative keys resolved at p).
 *
 * Each segment eases between its own two keys only. A Catmull-Rom spline would
 * also pull on neighbouring keys — and because ride keys move with the train,
 * a world-space neighbour 100 units back would drag the camera off the stop.
 */
export function cameraAt(p: number, pos: THREE.Vector3, look: THREE.Vector3) {
  const K = CAMERA_KEYS;
  let i = 0;
  while (i < K.length - 2 && p > K[i + 1].p) i++;
  const k1 = K[i];
  const k2 = K[i + 1];
  const t = Math.min(1, Math.max(0, (p - k1.p) / (k2.p - k1.p || 1)));
  const e = t * t * (3 - 2 * t);
  pos.lerpVectors(toWorld(k1, p, tmp[0], "pos"), toWorld(k2, p, tmp[1], "pos"), e);
  look.lerpVectors(toWorld(k1, p, tmp[0], "look"), toWorld(k2, p, tmp[1], "look"), e);
}

/** Is the camera inside car 1 (show the interior, hide the shell)? */
export const riding = (camZ: number, camX: number, p: number) => camX > LINE.edgeX + 0.15 && Math.abs(camZ - doorZ(p)) < 9;
