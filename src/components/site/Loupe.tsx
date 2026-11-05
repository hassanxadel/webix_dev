import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Search } from "lucide-react";
import { HERO_GLIDE } from "@/config/sections";
import { journey, journeyStore, useJourney } from "@/lib/journey";
import { loupe } from "@/lib/loupe";

/** Glass radius: ~11% of the short side, 64–120 px. */
const radius = () => Math.min(120, Math.max(64, Math.min(innerWidth, innerHeight) * 0.11));
/** Rest position: up and right of the card, on the Moon's path. */
const rest = () => ({ x: innerWidth * 0.74, y: innerHeight * 0.3 });
const coarse = () => matchMedia("(pointer: coarse)").matches;

/** The small round toggle next to the hero's scroll hint. */
export function LoupeToggle() {
  const on = useJourney((s) => s.loupe);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Hide the magnifier" : "Show a magnifier to look at the Moon and stars"}
      onClick={() => journeyStore.set({ loupe: !on })}
      className="loupe-toggle pointer-events-auto"
    >
      <Search size={15} strokeWidth={2.4} aria-hidden />
    </button>
  );
}

/**
 * A magnifier for the Moon and the stars: a gold bezel and handle around a
 * glass that shows the scene ×2.3 (rendered in WebGL by three/LoupeView, not a
 * copy of the DOM). Pick it up and drag it; it stays where you put it, easing
 * behind the pointer (no easing with reduced motion). Arrow keys move it.
 * Coarse pointers: the toggle shows it fixed at its rest position.
 */
export function Loupe() {
  const on = useJourney((s) => s.loupe);
  const el = useRef<HTMLDivElement>(null);
  const s = useRef({ x: 0, y: 0, tx: 0, ty: 0, placed: false, grab: null as null | { dx: number; dy: number } }).current;

  // On by default for mouse / pen; off on touch (tap the toggle).
  useEffect(() => {
    if (!coarse()) journeyStore.set({ loupe: true });
  }, []);

  useEffect(() => {
    const tick = (_t: number, dtMs: number) => {
      const node = el.current;
      const inHero = journey.progress < HERO_GLIDE[0] * 0.5;
      loupe.visible = !!node && journeyStore.get().loupe && inHero;
      if (!node) return;
      const r = radius();
      if (!s.placed || coarse()) {
        const p = rest();
        [s.tx, s.ty] = [p.x, p.y];
        if (!s.placed) [s.x, s.y, s.placed] = [p.x, p.y, true];
      }
      // Keep the glass on screen.
      s.tx = Math.min(innerWidth - r, Math.max(r, s.tx));
      s.ty = Math.min(innerHeight - r, Math.max(r, s.ty));
      const k = journeyStore.get().reducedMotion ? 1 : 1 - Math.exp(-(dtMs / 1000) * 12);
      const nx = s.x + (s.tx - s.x) * k, ny = s.y + (s.ty - s.y) * k;
      if (Math.abs(nx - s.x) + Math.abs(ny - s.y) > 0.05 || r !== loupe.r) loupe.moved++;
      [s.x, s.y] = [nx, ny];
      Object.assign(loupe, { x: s.x, y: s.y, r });
      node.style.setProperty("--r", `${r}px`);
      node.style.transform = `translate3d(${s.x - r}px, ${s.y - r}px, 0)`;
      node.style.visibility = loupe.visible ? "visible" : "hidden";
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      loupe.visible = false;
    };
  }, [s]);

  if (!on) return null;
  const move = (dx: number, dy: number) => {
    s.tx += dx;
    s.ty += dy;
  };

  return (
    <div
      ref={el}
      tabIndex={0}
      role="application"
      aria-label="Magnifier lens. Drag it, or move it with the arrow keys."
      className="loupe pointer-events-auto fixed left-0 top-0 z-[35]"
      data-coarse={coarse() || undefined}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 60 : 20;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (!d) return;
        e.preventDefault();
        move(d[0], d[1]);
      }}
      onPointerDown={(e) => {
        if (coarse()) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        s.grab = { dx: s.tx - e.clientX, dy: s.ty - e.clientY };
        e.currentTarget.dataset.held = "";
      }}
      onPointerMove={(e) => {
        if (!s.grab) return;
        s.tx = e.clientX + s.grab.dx;
        s.ty = e.clientY + s.grab.dy;
      }}
      onPointerUp={(e) => {
        s.grab = null;
        delete e.currentTarget.dataset.held;
      }}
      onPointerCancel={() => (s.grab = null)}
    >
      <span aria-hidden className="loupe-handle" />
      <span aria-hidden className="loupe-bezel" />
      <span aria-hidden className="loupe-glass" />
    </div>
  );
}
