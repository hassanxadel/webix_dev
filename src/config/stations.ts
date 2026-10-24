/**
 * The Webix Line — single source of truth for the journey.
 *
 * Every number here is a fraction of total page scroll (0 → 1). The DOM
 * sections, the line map, the station signs, the camera path, the train
 * timetable and the card stamps all read from this file.
 */

export type StationId = "departure" | "vision" | "services" | "work" | "process" | "results" | "terminal";
export type NavId = "home" | "about" | "services" | "work" | "contact";

export type Station = {
  id: StationId;
  num: string;
  en: string;
  jp: string;
  /** Scroll range owned by this station, including the ride that follows it. */
  range: [number, number];
  /** Window in which the station's copy is on screen. */
  content: [number, number];
  /** Moment the card is stamped on arrival. */
  stamp: number;
  /** Progress the line map / navbar jumps to — where the station reads best. */
  anchor: number;
  nav?: NavId;
};

/** Total scroll length of the journey, in viewport heights. */
export const JOURNEY_VH = 1600;

export const STATIONS: Station[] = [
  { id: "departure", num: "01", en: "Departure", jp: "出発", range: [0, 0.18], content: [0, 0.045], stamp: 0.074, anchor: 0, nav: "home" },
  { id: "vision", num: "02", en: "Vision", jp: "ビジョン", range: [0.18, 0.32], content: [0.2, 0.295], stamp: 0.205, anchor: 0.235, nav: "about" },
  { id: "services", num: "03", en: "Services", jp: "サービス", range: [0.32, 0.47], content: [0.338, 0.445], stamp: 0.342, anchor: 0.345, nav: "services" },
  { id: "work", num: "04", en: "Work", jp: "実績", range: [0.47, 0.62], content: [0.492, 0.612], stamp: 0.496, anchor: 0.5, nav: "work" },
  { id: "process", num: "05", en: "Process", jp: "プロセス", range: [0.62, 0.75], content: [0.628, 0.728], stamp: 0.634, anchor: 0.634 },
  { id: "results", num: "06", en: "Results", jp: "実績数値", range: [0.75, 0.85], content: [0.768, 0.846], stamp: 0.77, anchor: 0.775 },
  { id: "terminal", num: "07", en: "Terminal", jp: "終点", range: [0.85, 1], content: [0.962, 1], stamp: 0.94, anchor: 1, nav: "contact" },
];

export const stationIndex = (id: StationId) => STATIONS.findIndex((s) => s.id === id);

/** Services: each platform screen lights at its own moment. */
export const SERVICE_STEPS = [0.345, 0.372, 0.4, 0.428];
/** Work: billboards are featured one after another across this window. */
export const WORK_WINDOW: [number, number] = [0.5, 0.608];
/** Process: the express line's four micro-stops. */
export const PROCESS_STEPS = [0.636, 0.662, 0.688, 0.714];

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
