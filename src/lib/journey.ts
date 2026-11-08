import { useEffect, useSyncExternalStore } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { PAGE_VH, PHONE_QUERY, SECTIONS, type SectionId } from "@/config/sections";

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
  openProject: number | null;
  /** Service sub-section on screen (index into SERVICES), or null. */
  openService: number | null;
  /** Service the contact form should preselect (a SERVICES name), set by a sub-section's Get started. */
  servicePreset: string | null;
  /** Hero magnifier toggle. */
  loupe: boolean;
  /** Phones / touch (`(max-width: 768px), (pointer: coarse)`): no magnifier, DPR ≤ 1.5, fewer stars, 2K textures. */
  mobile: boolean;
  reducedMotion: boolean;
  tier: Tier;
  sceneReady: boolean;
  /** 0..1, reported by the 3D chunk while its assets load. */
  loadProgress: number;
};

let state: JourneyState = {
  section: 0,
  showing: 0,
  openProject: null,
  openService: null,
  servicePreset: null,
  loupe: false,
  mobile: false,
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

/**
 * CSS 100vh in px. Section heights are in `vh`, which on phones is the large viewport and does not change
 * when the address bar shows / hides; window.innerHeight does, and used here it shifted the progress
 * mid-scroll (About Me dropped out of its window and the badge left). Measured once per resize, never per frame.
 */
let vh100 = 0;
function measureVh() {
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;top:0;width:0;height:100vh;visibility:hidden;pointer-events:none";
  document.body.append(probe);
  vh100 = probe.offsetHeight || window.innerHeight;
  probe.remove();
}

/** Height of the scrollable page in pixels (progress 0..1 maps onto it). */
const journeyPx = () => ((vh100 || window.innerHeight) * PAGE_VH) / 100;

function derive(p: number): Partial<JourneyState> {
  let section = 0;
  SECTIONS.forEach((s, i) => {
    if (p >= s.range[0]) section = i;
  });
  const showing = SECTIONS.findIndex((s) => p >= s.content[0] && p <= s.content[1]);
  return { section, showing };
}

let lenis: Lenis | null = null;

/** Mounts smooth scrolling and the progress tracker. Works without WebGL. */
export function useJourneyTracker() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const reduced = motion.matches;
    journeyStore.set({ reducedMotion: reduced, mobile: phone.matches, tier: window.matchMedia("(max-width: 767px)").matches ? "low" : "high" });
    measureVh();
    window.addEventListener("resize", measureVh);

    // Lenis eases wheel input into the long, cinematic scroll; reduced motion keeps native scrolling.
    if (!reduced) lenis = new Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 0.9 });

    // Deep links (/#contact from another page) land on the section's anchor, where its panel shows, not on its top edge.
    const linked = SECTIONS.find((x) => `#${x.id}` === window.location.hash);
    if (linked) window.scrollTo(0, linked.anchor * journeyPx());

    // One scroll system: Lenis, driven by GSAP's ticker (the same ticker every per-frame DOM writer uses).
    gsap.ticker.lagSmoothing(0);
    const tick = (seconds: number) => {
      lenis?.raf(seconds * 1000);
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, journeyPx())));
      journey.progress = p;
      journeyStore.set(derive(p));
    };
    gsap.ticker.add(tick);

    const onPointer = (e: PointerEvent) => {
      // A finger is not a cursor: its last position stayed in the camera parallax and pushed the scene (and the badge) sideways.
      if (e.pointerType === "touch") return;
      journey.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      journey.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onMotion = () => journeyStore.set({ reducedMotion: motion.matches });
    const onPhone = () => journeyStore.set({ mobile: phone.matches });
    window.addEventListener("pointermove", onPointer, { passive: true });
    motion.addEventListener("change", onMotion);
    phone.addEventListener("change", onPhone);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", measureVh);
      motion.removeEventListener("change", onMotion);
      phone.removeEventListener("change", onPhone);
    };
  }, []);
}

/** Freezes page scrolling while an overlay (service sub-section) is open. */
export function lockScroll(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

/** Scroll to a point on the page — the card follows the scroll. */
export function travelTo(progress: number) {
  const y = progress * journeyPx();
  const distance = Math.abs(window.scrollY - y) / window.innerHeight;
  const reduced = journeyStore.get().reducedMotion;
  // Touch phones snap to sections in CSS, and Lenis's per-frame scrollTo would be pulled to every snap point on the way.
  if (lenis && !reduced && !window.matchMedia(`${PHONE_QUERY} and (pointer: coarse)`).matches) {
    lenis.scrollTo(y, { duration: Math.min(4.5, Math.max(1.2, distance * 0.22)), easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  } else {
    window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  }
}

export const travelToSection = (id: SectionId) => travelTo(SECTIONS.find((s) => s.id === id)!.anchor);
