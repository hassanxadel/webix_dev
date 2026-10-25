import { useEffect, useRef, useState } from "react";
import { HERO, coverLayout, plateFor, ramp, smooth, type Plate } from "@/lib/heroPlate";
import { journey, journeyStore } from "@/lib/journey";

/**
 * The hero's photographic station plate, kept alive with cheap 2.5D touches:
 * damped mouse parallax (opposite the card's tilt), a slow Ken Burns push-in,
 * a soft pink light travelling along the train's stripe, faint bokeh flicker,
 * grain and vignette. On scroll it pushes in toward the gate reader and blurs,
 * as if walking through the gate, then dips out to the 3D ride.
 */
export function HeroPlate() {
  const [plate, setPlate] = useState<Plate | null>(null);
  const [layout, setLayout] = useState({ s: 1, ox: 0, oy: 0 });
  const root = useRef<HTMLDivElement>(null);
  const parallax = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fit = () => {
      const p = plateFor(window.innerWidth, window.innerHeight);
      setPlate(p);
      setLayout(coverLayout(p, window.innerWidth, window.innerHeight));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    let raf = 0;
    const cur = { x: 0, y: 0 };
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const el = root.current;
      if (!el || !plate) return;
      const p = journey.progress;
      const reduced = journeyStore.get().reducedMotion;
      // Out of the hero: take the plate off the page entirely.
      el.style.display = p > HERO.end + 0.02 ? "none" : "";
      if (p > HERO.end + 0.02) return;

      // Damped parallax, opposite to the card's tilt.
      const k = 0.06;
      cur.x += ((reduced ? 0 : -journey.pointerX) - cur.x) * k;
      cur.y += ((reduced ? 0 : -journey.pointerY) - cur.y) * k;
      if (parallax.current) parallax.current.style.transform = `translate3d(${cur.x * 12}px, ${cur.y * 12}px, 0) scale(${reduced ? 1 : 1.02})`;

      // Walk through the gate: push in toward the reader and blur, then dip to dark.
      const glide = smooth(ramp(p, HERO.glide));
      const out = smooth(ramp(p, [HERO.settle[0] - 0.01, HERO.end]));
      el.style.transform = reduced ? "" : `scale(${1 + glide * 0.16 + out * 0.08})`;
      el.style.filter = reduced ? "" : `blur(${glide * 5 + out * 6}px)`;
      el.style.opacity = String(1 - out);

      // Reader flash at the tap.
      if (glow.current) {
        const d = Math.abs(p - HERO.tap);
        glow.current.style.opacity = String(0.25 + (d < 0.008 ? (1 - d / 0.008) * 0.75 : 0));
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [plate]);

  if (!plate) return null;
  const { s, ox, oy } = layout;
  const at = (x: number, y: number) => ({ left: ox + x * s, top: oy + y * s });
  const reader = at(plate.reader.x, plate.reader.y);
  const [a, b] = plate.stripe;
  const stripeLen = Math.hypot(b.x - a.x, b.y - a.y) * s;
  const stripeAngle = Math.atan2(b.y - a.y, b.x - a.x);

  return (
    <div
      ref={root}
      aria-hidden
      className="absolute inset-0 overflow-hidden will-change-transform"
      // Zoom toward the reader: it stays put while the rest of the station rushes past.
      style={{ transformOrigin: `${reader.left}px ${reader.top}px` }}
    >
      <div ref={parallax} className="absolute inset-0">
        <div className="hero-kenburns absolute inset-0">
          <img
            src={plate.src}
            alt=""
            width={plate.w}
            height={plate.h}
            fetchPriority="high"
            decoding="async"
            className="absolute max-w-none select-none"
            style={{ left: ox, top: oy, width: plate.w * s, height: plate.h * s }}
          />
          {/* Pink light travelling along the train's stripe. */}
          <div
            className="hero-sweep absolute"
            style={{ ...at(a.x, a.y), width: stripeLen, height: Math.max(3, 4 * s), transform: `rotate(${stripeAngle}rad)`, transformOrigin: "0 50%" }}
          />
          {/* Faint bokeh flicker on the practical lights. */}
          {plate.lights.map((l, i) => (
            <span key={i} className="hero-bokeh absolute rounded-full" style={{ ...at(l.x, l.y), width: 46 * s, height: 46 * s, animationDelay: `${i * 1.7}s` }} />
          ))}
          {/* The reader's glow, which flashes on the tap. */}
          <div ref={glow} className="hero-reader absolute rounded-[40%]" style={{ left: reader.left, top: reader.top, width: 150 * s, height: 70 * s }} />
        </div>
      </div>
      {/* Grain and vignette unify the 3D card with the photograph. */}
      <div className="hero-vignette pointer-events-none absolute inset-0" />
      <div className="hero-grain pointer-events-none absolute inset-0" />
    </div>
  );
}

