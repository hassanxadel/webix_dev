import { useEffect, useSyncExternalStore } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { PAGE_VH, SECTIONS, WORK_WINDOW, type SectionId } from "@/config/sections";
import { PROJECTS } from "./webix-data";

/**
 * Journey state, in two layers:
 * - `journey` is mutable and read every frame by the 3D scene (no React renders).
 * - `journeyStore` holds discrete values the HTML reacts to (current section, work step, UI state).
 */
export const journey = {
  /** Scroll progress 0..1 of the whole page. */
  progress: 0,
  pointerX: 0,
  pointerY: 0,
};

export type Tier = "high" | "low";

type JourneyState = {
  section: number;
  /** Section whose panel is currently on screen, or −1 between sections. */
  showing: number;
  workStep: number;
  openProject: number | null;
  reducedMotion: boolean;
  tier: Tier;
  sceneReady: boolean;
  /** 0..1, reported by the 3D chunk while its assets load. */
  loadProgress: number;
};

let state: JourneyState = {
  section: 0,
  showing: 0,
  workStep: 0,
  openProject: null,
  reducedMotion: false,
  tier: "high",
  sceneReady: false,
  loadProgress: 0,
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

/** Height of the scrollable page in pixels (progress 0..1 maps onto it). */
const journeyPx = () => (window.innerHeight * PAGE_VH) / 100;

function derive(p: number): Partial<JourneyState> {
  let section = 0;
  SECTIONS.forEach((s, i) => {
    if (p >= s.range[0]) section = i;
  });
  const showing = SECTIONS.findIndex((s) => p >= s.content[0] && p <= s.content[1]);
  const [w0, w1] = WORK_WINDOW;
  // Nearest project (matches the snap points).
  const workStep = Math.min(PROJECTS.length - 1, Math.max(0, Math.round(((p - w0) / (w1 - w0)) * (PROJECTS.length - 1))));
  return { section, showing, workStep };
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

    // One scroll system: Lenis, driven by GSAP's ticker (the same ticker every per-frame DOM writer uses).
    gsap.ticker.lagSmoothing(0);
    let lastScroll = performance.now();
    let snapping = false;
    const tick = (seconds: number) => {
      lenis?.raf(seconds * 1000);
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, journeyPx())));
      if (p !== journey.progress) lastScroll = performance.now();
      journey.progress = p;
      journeyStore.set(derive(p));
      // Work: once the visitor stops, settle on the nearest project.
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
      lenis?.destroy();
      lenis = null;
      window.removeEventListener("pointermove", onPointer);
      motion.removeEventListener("change", onMotion);
    };
  }, []);
}

/** Scroll to a point on the page — the card follows the scroll. */
export function travelTo(progress: number) {
  const y = progress * journeyPx();
  const distance = Math.abs(window.scrollY - y) / window.innerHeight;
  if (lenis && !journeyStore.get().reducedMotion) {
    lenis.scrollTo(y, { duration: Math.min(4.5, Math.max(1.2, distance * 0.22)), easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  } else {
    window.scrollTo({ top: y, behavior: "auto" });
  }
}

export const travelToSection = (id: SectionId) => travelTo(SECTIONS.find((s) => s.id === id)!.anchor);
