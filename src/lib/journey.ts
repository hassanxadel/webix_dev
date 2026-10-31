import { useEffect, useSyncExternalStore } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { JOURNEY_VH, PROCESS_STEPS, SERVICE_STEPS, STATIONS, WORK_WINDOW, WORLD_ON, stampsAt, stepAt, type StationId } from "@/config/stations";
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
  /** Scroll speed, 0..1 (drives streaks and blur: faster scrolling = faster train). */
  velocity: 0,
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
  /** The 3D world is on (from the About blackout onward); before that only the card renders. */
  world: boolean;
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
  world: false,
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
  // Nearest window (matches the snap points).
  const workStep = Math.min(PROJECTS.length - 1, Math.max(0, Math.round(((p - w0) / (w1 - w0)) * (PROJECTS.length - 1))));
  return {
    station,
    showing,
    serviceStep: stepAt(SERVICE_STEPS, p),
    workStep,
    processStep: stepAt(PROCESS_STEPS, p),
    stamps: stampsAt(p),
    world: p >= WORLD_ON,
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

    // One scroll system: Lenis, driven by GSAP's ticker, with ScrollTrigger kept in sync (for velocity).
    gsap.registerPlugin(ScrollTrigger);
    lenis?.on("scroll", ScrollTrigger.update);
    const tracker = ScrollTrigger.create({ start: 0, end: "max" });
    gsap.ticker.lagSmoothing(0);
    let lastScroll = performance.now();
    let snapping = false;
    const tick = (seconds: number) => {
      lenis?.raf(seconds * 1000);
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, journeyPx())));
      if (p !== journey.progress) lastScroll = performance.now();
      journey.progress = p;
      journey.velocity = Math.min(1, Math.abs(tracker.getVelocity()) / 4000);
      journeyStore.set(derive(p));
      // Work: once the visitor stops, settle on the nearest window.
      const [w0, w1] = WORK_WINDOW;
      if (lenis && !snapping && performance.now() - lastScroll > 140 && p > w0 - 0.004 && p < w1 + 0.004) {
        const n = PROJECTS.length - 1;
        const target = w0 + (Math.round(((p - w0) / (w1 - w0)) * n) / n) * (w1 - w0);
        if (Math.abs(target - p) > 0.0004) {
          snapping = true;
          lenis.scrollTo(target * journeyPx(), { duration: 0.6, easing: (t) => 1 - Math.pow(1 - t, 3), onComplete: () => (snapping = false) });
        }
      }
    };
    gsap.ticker.add(tick);

    const onPointer = (e: PointerEvent) => {
      journey.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      journey.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onMotion = () => journeyStore.set({ reducedMotion: motion.matches });
    window.addEventListener("pointermove", onPointer, { passive: true });
    motion.addEventListener("change", onMotion);
    return () => {
      gsap.ticker.remove(tick);
      tracker.kill();
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
