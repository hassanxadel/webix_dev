import { useEffect } from "react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { runtime, sceneStore, SECTION_IDS, type SectionId } from "./scene-store";
import { PROJECTS, SERVICES, PROCESS } from "./webix-data";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollToPlugin);

/** Fraction of a viewport height over which the camera blends between two sections. */
const BLEND_WINDOW = 0.6;

/** Sub-items of the pinned sections, used to map scroll progress → active item. */
const STEPS: Partial<Record<SectionId, number>> = {
  work: PROJECTS.length,
  services: SERVICES.length,
  process: PROCESS.length,
};

const stepIndex = (inner: number, count: number) => Math.min(count - 1, Math.floor(inner * count));

/**
 * Tracks scroll position and translates it into the scene's "stage": which section
 * the camera belongs to, progress inside it and the blend toward neighbours.
 * Runs independently from WebGL so the interface keeps working without it.
 */
export function useScrollStage() {
  useEffect(() => {
    let raf = 0;
    const sections = () => SECTION_IDS.map((id) => document.getElementById(id));

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const anchor = window.scrollY + vh * 0.5;
      const els = sections();
      let index = 0;
      els.forEach((el, i) => {
        if (el && el.offsetTop <= anchor) index = i;
      });
      const el = els[index];
      if (!el) return;

      const top = el.offsetTop;
      const height = el.offsetHeight;
      const pinned = el.dataset.pinned === "true";
      const range = pinned ? Math.max(1, height - vh) : height;
      const inner = pinned
        ? gsap.utils.clamp(0, 1, (window.scrollY - top) / range)
        : gsap.utils.clamp(0, 1, (anchor - top) / range);

      const win = vh * BLEND_WINDOW;
      let blend = 0;
      if (index > 0 && anchor - top < win) blend = -0.5 + (anchor - top) / (2 * win);
      else if (index < els.length - 1 && top + height - anchor < win)
        blend = 0.5 - (top + height - anchor) / (2 * win);

      runtime.section = index;
      runtime.inner = inner;
      runtime.blend = blend;

      const id = SECTION_IDS[index];
      const patch: Parameters<typeof sceneStore.set>[0] = { section: index };
      if (id === "work") patch.workIndex = stepIndex(inner, STEPS.work!);
      if (id === "services") patch.serviceIndex = stepIndex(inner, STEPS.services!);
      if (id === "process") patch.processIndex = stepIndex(inner, STEPS.process!);
      sceneStore.set(patch);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onPointer = (e: PointerEvent) => {
      runtime.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      runtime.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const smallQuery = window.matchMedia("(max-width: 767px)");
    const syncMedia = () =>
      sceneStore.set({
        reducedMotion: motionQuery.matches,
        lowPower: smallQuery.matches || (navigator.hardwareConcurrency ?? 8) <= 4,
      });

    syncMedia();
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pointermove", onPointer, { passive: true });
    motionQuery.addEventListener("change", syncMedia);
    smallQuery.addEventListener("change", syncMedia);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointer);
      motionQuery.removeEventListener("change", syncMedia);
      smallQuery.removeEventListener("change", syncMedia);
    };
  }, []);
}

/**
 * Scrolls to a section — or to one step inside a pinned section — so the camera
 * travels there through the same scroll-driven path a visitor would take.
 */
export function scrollToStage(id: SectionId, step?: number) {
  const el = document.getElementById(id);
  if (!el) return;
  let y = el.offsetTop;
  const count = STEPS[id];
  if (step !== undefined && count && el.dataset.pinned === "true") {
    const range = el.offsetHeight - window.innerHeight;
    y += ((step + 0.5) / count) * range;
  }
  const reduced = sceneStore.get().reducedMotion;
  const distance = Math.abs(window.scrollY - y);
  gsap.to(window, {
    scrollTo: { y, autoKill: true },
    duration: reduced ? 0 : gsap.utils.clamp(0.8, 2.2, distance / 2200),
    ease: "power3.inOut",
  });
}
