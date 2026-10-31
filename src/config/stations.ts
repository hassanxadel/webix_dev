/**
 * The Webix Line — single source of truth for the journey.
 *
 * Every number here is a fraction of total page scroll (0 → 1). The DOM
 * sections, the line map, the station signs, the card, the background layer
 * and the 3D world all read from this file.
 */

export type StationId = "departure" | "vision" | "services" | "work" | "process" | "results" | "terminal";
export type NavId = "home" | "about" | "services" | "work" | "contact";

export type Station = {
  id: StationId;
  num: string;
  en: string;
  jp: string;
  /** Scroll range owned by this station. */
  range: [number, number];
  /** Window in which the station's copy is on screen. */
  content: [number, number];
  /** Moment the card is stamped. */
  stamp: number;
  /** Progress the line map / navbar jumps to. */
  anchor: number;
  nav?: NavId;
};

/** Total scroll length of the journey, in viewport heights. */
export const JOURNEY_VH = 1900;
const at = (vh: number) => vh / JOURNEY_VH;

/** Section lengths in vh: hero + departure 240, Work 6 windows, then the 3D ride. */
const B = { work: at(240), vision: at(840), services: at(1060), process: at(1300), results: at(1510), terminal: at(1670) };

/** Hero → Work departure (pinned, scrubbed): fractions of the departure range. */
export const DEPARTURE = {
  end: B.work,
  copyOut: [0, B.work * 0.2] as [number, number],
  run: [B.work * 0.2, B.work * 0.55] as [number, number],
  tunnel: [B.work * 0.4, B.work * 0.55] as [number, number],
  arrive: [B.work * 0.55, B.work * 0.85] as [number, number],
  settle: [B.work * 0.85, B.work] as [number, number],
};

/** Work windows: one snap point per project, then a short exit glide into About. */
export const WORK_WINDOW: [number, number] = [B.work, B.vision - at(50)];

/** Work → About: the window stage fades to black, the 3D world switches on unseen, then fades in. */
export const BLACKOUT: [number, number] = [WORK_WINDOW[1], WORK_WINDOW[1] + at(30)];
export const WORLD_ON = WORK_WINDOW[1] + at(25);
export const WORLD_FADE: [number, number] = [BLACKOUT[1], B.vision + at(20)];

/* The 3D world (Vision onward) keeps its original timeline; these map between the two. */
const LEGACY: Record<StationId, [number, number]> = {
  departure: [0, 0.15],
  work: [0.15, 0.15], // the world waits (train at the platform) while Work plays over it
  vision: [0.15, 0.32],
  services: [0.32, 0.47],
  process: [0.47, 0.75], // includes the run past the old Work platform
  results: [0.75, 0.85],
  terminal: [0.85, 1],
};

export const STATIONS: Station[] = [
  { id: "departure", num: "01", en: "Departure", jp: "出発", range: [0, B.work], content: [0, DEPARTURE.copyOut[1]], stamp: B.work * 0.2, anchor: 0, nav: "home" },
  { id: "work", num: "02", en: "Work", jp: "実績", range: [B.work, B.vision], content: [DEPARTURE.arrive[0], B.vision - at(30)], stamp: B.work * 0.92, anchor: B.work, nav: "work" },
  { id: "vision", num: "03", en: "About", jp: "ビジョン", range: [B.vision, B.services], content: [B.vision + at(25), B.services - at(30)], stamp: B.vision + at(30), anchor: B.vision + at(80), nav: "about" },
  { id: "services", num: "04", en: "Services", jp: "サービス", range: [B.services, B.process], content: [0, 0], stamp: 0, anchor: 0, nav: "services" },
  { id: "process", num: "05", en: "Process", jp: "プロセス", range: [B.process, B.results], content: [0, 0], stamp: 0, anchor: 0 },
  { id: "results", num: "06", en: "Results", jp: "実績数値", range: [B.results, B.terminal], content: [0, 0], stamp: 0, anchor: 0 },
  { id: "terminal", num: "07", en: "Terminal", jp: "終点", range: [B.terminal, 1], content: [0, 0], stamp: 0, anchor: 1, nav: "contact" },
];

/** New progress → the 3D world's original timeline. */
export function toLegacy(p: number) {
  const s = [...STATIONS].reverse().find((st) => p >= st.range[0]) ?? STATIONS[0];
  const [a, b] = s.range;
  const [la, lb] = LEGACY[s.id];
  return la + (lb - la) * Math.min(1, Math.max(0, (p - a) / (b - a || 1)));
}

/** Original-timeline progress → new progress (stations after Work only). */
export function fromLegacy(lp: number) {
  for (const s of STATIONS) {
    if (s.id === "departure" || s.id === "work") continue;
    const [la, lb] = LEGACY[s.id];
    if (lp >= la && lp <= lb) return s.range[0] + ((lp - la) / (lb - la)) * (s.range[1] - s.range[0]);
  }
  return 1;
}

/* Stations after Work keep their original beats, expressed in new progress. */
const fill = (id: StationId, content: [number, number], stamp: number, anchor: number) => {
  const s = STATIONS.find((x) => x.id === id)!;
  s.content = [fromLegacy(content[0]), fromLegacy(content[1])];
  s.stamp = fromLegacy(stamp);
  s.anchor = fromLegacy(anchor);
};
fill("services", [0.338, 0.445], 0.342, 0.345);
fill("process", [0.628, 0.728], 0.634, 0.634);
fill("results", [0.768, 0.846], 0.77, 0.775);
fill("terminal", [0.962, 1], 0.94, 1);
STATIONS[STATIONS.length - 1].anchor = 1;

export const stationIndex = (id: StationId) => STATIONS.findIndex((s) => s.id === id);

/** Original-timeline beats (the 3D world reads these against `toLegacy(progress)`). */
export const LEGACY_SERVICE_STEPS = [0.345, 0.372, 0.4, 0.428];
export const LEGACY_PROCESS_STEPS = [0.636, 0.662, 0.688, 0.714];
export const LEGACY_RESULTS_STAMP = 0.77;
/** The same beats in new progress, for the HTML. */
export const SERVICE_STEPS = LEGACY_SERVICE_STEPS.map(fromLegacy);
export const PROCESS_STEPS = LEGACY_PROCESS_STEPS.map(fromLegacy);

/** Index of the last step reached at progress p (−1 before the first). */
export function stepAt(steps: number[], p: number) {
  let i = -1;
  steps.forEach((s, k) => {
    if (p >= s - 0.004) i = k;
  });
  return i;
}

/** Number of stamps on the card at progress p. */
export const stampsAt = (p: number) => STATIONS.filter((s) => p >= s.stamp).length;
