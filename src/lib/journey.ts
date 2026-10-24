import { useEffect, useSyncExternalStore } from "react";
import Lenis from "lenis";
import { JOURNEY_VH, PROCESS_STEPS, SERVICE_STEPS, STATIONS, WORK_WINDOW, stampsAt, stepAt, type StationId } from "@/config/stations";
import { PROJECTS } from "./webix-data";

/**
 * Journey state, in two layers:
 * - `journey` is mutable and read every frame by the 3D scene (no React renders).
 * - `journeyStore` holds discrete values the HTML reacts to (current station, steps, UI state).
 */
export const journey = {
  /** Scroll progress 0..1 of the whole page. */
  progress: 0,
  pointerX: 0,
  pointerY: 0,
};

export type Tier = "high" | "low";

type JourneyState = {
  station: number;
  /** Station whose copy is currently on screen, or −1 between stations. */
  showing: number;
  serviceStep: number;
  workStep: number;
  processStep: number;
  stamps: number;
  hoverProject: number | null;
  openProject: number | null;
  reducedMotion: boolean;
  tier: Tier;
  sceneReady: boolean;
  /** 0..1, reported by the 3D chunk while its assets load. */
  loadProgress: number;
  sound: boolean;
};

let state: JourneyState = {
  station: 0,
  showing: 0,
  serviceStep: -1,
  workStep: 0,
  processStep: -1,
  stamps: 0,
  hoverProject: null,
  openProject: null,
  reducedMotion: false,
  tier: "high",
  sceneReady: false,
  loadProgress: 0,
  sound: false,
};

const listeners = new Set<() => void>();

export const journeyStore = {
  get: () => state,
  set(patch: Partial<JourneyState>) {
    if (!(Object.keys(patch) as (keyof JourneyState)[]).some((k) => state[k] !== patch[k])) return;
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useJourney<T>(selector: (s: JourneyState) => T): T {
  return useSyncExternalStore(
    journeyStore.subscribe,
    () => selector(journeyStore.get()),
    () => selector(journeyStore.get()),
  );
}

/** Height of the scrollable journey in pixels (progress 0..1 maps onto it). */
const journeyPx = () => (window.innerHeight * JOURNEY_VH) / 100;

function derive(p: number): Partial<JourneyState> {
  let station = 0;
  STATIONS.forEach((s, i) => {
    if (p >= s.range[0]) station = i;
  });
  const showing = STATIONS.findIndex((s) => p >= s.content[0] && p <= s.content[1]);
  const [w0, w1] = WORK_WINDOW;
  const workStep = Math.min(PROJECTS.length - 1, Math.max(0, Math.floor(((p - w0) / (w1 - w0)) * PROJECTS.length)));
  return {
    station,
    showing,
    serviceStep: stepAt(SERVICE_STEPS, p),
    workStep,
    processStep: stepAt(PROCESS_STEPS, p),
    stamps: stampsAt(p),
  };
}

let lenis: Lenis | null = null;

/** Mounts smooth scrolling and the progress tracker. Works without WebGL. */
export function useJourneyTracker() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = motion.matches;
    journeyStore.set({ reducedMotion: reduced, tier: window.matchMedia("(max-width: 767px)").matches ? "low" : "high" });

    // Lenis eases wheel input into the long, cinematic scroll; reduced motion keeps native scrolling.
    if (!reduced) lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9 });

    let raf = 0;
    const frame = (time: number) => {
      lenis?.raf(time);
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, journeyPx())));
      journey.progress = p;
      journeyStore.set(derive(p));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onPointer = (e: PointerEvent) => {
      journey.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      journey.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onMotion = () => journeyStore.set({ reducedMotion: motion.matches });
    window.addEventListener("pointermove", onPointer, { passive: true });
    motion.addEventListener("change", onMotion);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenis = null;
      window.removeEventListener("pointermove", onPointer);
      motion.removeEventListener("change", onMotion);
    };
  }, []);
}

/** Travel to a point on the line — the camera, train and card follow the scroll. */
export function travelTo(progress: number) {
  const y = progress * journeyPx();
  const distance = Math.abs(window.scrollY - y) / window.innerHeight;
  if (lenis && !journeyStore.get().reducedMotion) {
    lenis.scrollTo(y, { duration: Math.min(4.5, Math.max(1.2, distance * 0.22)), easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  } else {
    window.scrollTo({ top: y, behavior: "auto" });
  }
}

export const travelToStation = (id: StationId) => travelTo(STATIONS.find((s) => s.id === id)!.anchor);
