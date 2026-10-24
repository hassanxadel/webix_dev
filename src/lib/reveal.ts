import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fades and lifts every `[data-reveal]` child into place as its container scrolls into view. */
export function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.from(root.querySelectorAll("[data-reveal]"), {
        y: 28,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: root, start: "top 70%", once: true },
      });
    }, root);
    return () => ctx.revert();
  }, [ref]);
}

/** Opening title sequence for the hero — quick, so the headline is never held back. */
export function useIntro(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root || reduced()) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-intro='line']", { y: 40, autoAlpha: 0, filter: "blur(8px)", duration: 1, stagger: 0.14 })
        .from("[data-intro='fade']", { y: 16, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, "-=0.5");
    }, root);
    return () => ctx.revert();
  }, [ref]);
}
