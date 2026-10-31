import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BLACKOUT, DEPARTURE, WORK_WINDOW } from "@/config/stations";
import { WORK } from "@/config/projects";
import { coverLayout, plateFor, ramp, smooth, type Plate } from "@/lib/heroPlate";
import { journey, journeyStore, useJourney } from "@/lib/journey";

/** Light streaks for the departure run: lane (0..1 of height), length (vw), colour, speed. */
const STREAKS = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 91.7 + n * 13.1) * 43758.5453) % 1 + 1) % 1;
  return { y: 0.08 + r(1) * 0.84, len: 0.18 + r(2) * 0.5, speed: 0.7 + r(3) * 0.9, phase: r(4), color: ["#ff007f", "#ffda24", "#f4f1ea"][i % 3], h: 1 + Math.round(r(5) * 2) };
});
/** Wall bays before and after the project windows, so the cabin wall always fills the screen. */
const PAD = 4;

type Stage = { vw: number; vh: number; mobile: boolean; win: number; pitch: number; cx: number };
const measure = (): Stage => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = vw < 768;
  const win = mobile ? vw * 0.82 : Math.min(vw * 0.42, (vh * 0.4) / 0.62);
  return { vw, vh, mobile, win, pitch: mobile ? vw : win * 1.32, cx: mobile ? vw / 2 : (vw * 2) / 3 };
};

/**
 * Everything behind the (transparent) canvas until About: the hero's photographic
 * plate, the departure run (slide, directional blur, light streaks, tunnel, ≤2px
 * shake) and the Shinkansen cabin whose windows frame the Work projects. Every
 * value is a function of scroll progress, written straight to the DOM each tick
 * (no React state per frame, no layout reads).
 */
export function BackgroundLayer() {
  const [plate, setPlate] = useState<Plate | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const reduced = useJourney((s) => s.reducedMotion);
  const r = {
    root: useRef<HTMLDivElement>(null),
    shake: useRef<HTMLDivElement>(null),
    plate: useRef<HTMLDivElement>(null),
    parallax: useRef<HTMLDivElement>(null),
    blur: useRef<HTMLDivElement>(null),
    scrim: useRef<HTMLDivElement>(null),
    streaks: useRef<HTMLDivElement>(null),
    tunnel: useRef<HTMLDivElement>(null),
    cabin: useRef<HTMLDivElement>(null),
    row: useRef<HTMLDivElement>(null),
    blackout: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    const fit = () => {
      setPlate(plateFor(window.innerWidth, window.innerHeight));
      setStage(measure());
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (!plate || !stage) return;
    const cur = { x: 0, y: 0, travel: 0, city: 0 };
    const E = DEPARTURE.end;
    const [w0, w1] = WORK_WINDOW;
    const n = WORK.length - 1;
    const streakEls = Array.from(r.streaks.current?.children ?? []) as HTMLElement[];
    const lowTier = journeyStore.get().tier === "low";

    const tick = (time: number, dtMs: number) => {
      const root = r.root.current;
      if (!root) return;
      const p = journey.progress;
      const v = journey.velocity;
      const dt = Math.min(0.05, dtMs / 1000);
      const motion = !journeyStore.get().reducedMotion;

      // After the blackout the 3D world owns the screen.
      const gone = p > BLACKOUT[1] + 0.004;
      root.style.visibility = gone ? "hidden" : "visible";
      if (gone) return;

      const run = ramp(p, DEPARTURE.run);
      const tunnel = ramp(p, DEPARTURE.tunnel);
      const arrive = smooth(ramp(p, [DEPARTURE.arrive[0], E]));
      // Train speed: builds through the run, peaks in the tunnel, decelerates on arrival.
      const speed = motion ? Math.sin(Math.min(1, ramp(p, [DEPARTURE.run[0], DEPARTURE.arrive[1]])) * Math.PI) : 0;

      // Plate: damped parallax, then it slides left with growing directional blur.
      cur.x += ((motion ? -journey.pointerX : 0) - cur.x) * 0.06;
      cur.y += ((motion ? -journey.pointerY : 0) - cur.y) * 0.06;
      if (r.parallax.current) r.parallax.current.style.transform = `translate3d(${cur.x * 12}px, ${cur.y * 12}px, 0) scale(1.02)`;
      const slide = motion ? run * run * stage.vw * 0.55 : 0;
      const plateOut = smooth(ramp(p, motion ? [DEPARTURE.tunnel[0] + 0.004, DEPARTURE.tunnel[1]] : [DEPARTURE.copyOut[1], DEPARTURE.arrive[0]]));
      if (r.plate.current) {
        r.plate.current.style.transform = `translate3d(${-slide}px, 0, 0) scale(${1 + smooth(ramp(p, DEPARTURE.copyOut)) * 0.04})`;
        r.plate.current.style.opacity = String(1 - plateOut);
      }
      if (r.blur.current) r.blur.current.style.opacity = String(motion ? smooth(run) * 0.95 : 0);
      if (r.scrim.current) r.scrim.current.style.opacity = String(1 - smooth(ramp(p, DEPARTURE.copyOut)));

      // Streaks right → left: driven by progress and scroll speed.
      const intensity = motion ? speed * (0.55 + v * 0.8) : 0;
      cur.travel += dt * (0.4 + speed * 2.6 + v * 3) * (lowTier ? 0.8 : 1);
      streakEls.forEach((el, i) => {
        const s = STREAKS[i];
        const span = 1 + s.len;
        const x = (1 - (((cur.travel * s.speed + s.phase) % span) + span) % span) * stage.vw;
        el.style.transform = `translate3d(${x}px, 0, 0) scaleX(${0.6 + speed * 0.8})`;
        el.style.opacity = String(Math.min(1, intensity * (i % 3 === 2 ? 0.6 : 0.9)));
      });

      // Tunnel: one dark pass (~80%).
      if (r.tunnel.current) r.tunnel.current.style.opacity = String(motion ? Math.sin(tunnel * Math.PI) * 0.8 : 0);
      // ≤2px vibration while the train is moving.
      if (r.shake.current) r.shake.current.style.transform = motion && speed > 0.01 ? `translate3d(${Math.sin(time * 53) * speed * 2}px, ${Math.cos(time * 47) * speed * 1.5}px, 0)` : "";

      // Cabin: appears as the train leaves the tunnel; windows slide in and settle on project 01.
      const cabinIn = smooth(ramp(p, motion ? [DEPARTURE.tunnel[0] + 0.006, DEPARTURE.arrive[0] + 0.004] : [DEPARTURE.copyOut[1], DEPARTURE.arrive[0]]));
      // Reduced motion: no cabin; Work is a plain vertical list over the dark background.
      if (r.cabin.current) r.cabin.current.style.opacity = String(motion ? cabinIn : 0);
      if (r.row.current) {
        const f = p < w0 ? -(1 - arrive) * 2.4 : Math.min(n, ((p - w0) / (w1 - w0)) * n);
        const x = stage.cx - stage.pitch / 2 - (f + PAD) * stage.pitch;
        r.row.current.style.transform = `translate3d(${x}px, 0, 0)`;
        // City lights outside the glass: fast during arrival, slowing to a drift; bursts when scrolled fast.
        cur.city += dt * (motion ? 40 + (1 - arrive) * 900 + v * 1400 : 0);
        r.row.current.style.setProperty("--cityx", `${-cur.city % 2400}px`);
        r.row.current.style.setProperty("--burst", String(motion ? Math.min(1, v * 1.6 + (1 - arrive) * 0.6) : 0));
      }

      if (r.blackout.current) r.blackout.current.style.opacity = String(smooth(ramp(p, BLACKOUT)));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [plate, stage]);

  if (!plate || !stage) return null;
  const { s, ox, oy } = coverLayout(plate, stage.vw, stage.vh);
  const at = (x: number, y: number) => ({ left: ox + x * s, top: oy + y * s });
  const [a, b] = plate.stripe;
  const img = { left: ox, top: oy, width: plate.w * s, height: plate.h * s };
  const winH = stage.win * 0.62;
  const bays = [...Array(PAD).fill(null), ...WORK, ...Array(PAD).fill(null)];

  return (
    <div ref={r.root} aria-hidden className="absolute inset-0 overflow-hidden bg-night">
      <svg width="0" height="0" className="absolute">
        <filter id="motion-blur-x" x="-10%" width="120%">
          <feGaussianBlur stdDeviation={stage.mobile ? "16 0" : "30 0"} />
        </filter>
      </svg>
      <div ref={r.shake} className="absolute inset-[-4px] will-change-transform">
        {/* The hero plate. */}
        <div ref={r.plate} className="absolute inset-0 will-change-transform">
          <div ref={r.parallax} className="absolute inset-0">
            <div className="hero-kenburns absolute inset-0">
              <img src={plate.src} alt="" width={plate.w} height={plate.h} fetchPriority="high" decoding="async" className="absolute max-w-none select-none" style={img} />
              <div className="hero-sweep absolute" style={{ ...at(a.x, a.y), width: Math.hypot(b.x - a.x, b.y - a.y) * s, height: Math.max(3, 4 * s), transform: `rotate(${Math.atan2(b.y - a.y, b.x - a.x)}rad)`, transformOrigin: "0 50%" }} />
              {plate.lights.map((l, i) => (
                <span key={i} className="hero-bokeh absolute rounded-full" style={{ ...at(l.x, l.y), width: 46 * s, height: 46 * s, animationDelay: `${i * 1.7}s` }} />
              ))}
              <div className="hero-reader absolute rounded-[40%] opacity-25" style={{ ...at(plate.reader.x, plate.reader.y), width: 150 * s, height: 70 * s }} />
            </div>
          </div>
          {/* Directional (horizontal) motion blur: a pre-blurred copy that fades in with speed. */}
          {!reduced && (
            <div ref={r.blur} className="absolute inset-0 opacity-0" style={{ filter: "url(#motion-blur-x)" }}>
              <img src={plate.src} alt="" width={plate.w} height={plate.h} decoding="async" className="absolute max-w-none select-none" style={img} />
            </div>
          )}
        </div>
        <div ref={r.scrim} className="hero-copy-scrim pointer-events-none absolute inset-0" />

        {/* Train cabin: wall bays with the project windows. */}
        <div ref={r.cabin} className="cabin absolute inset-0 opacity-0">
          <div
            ref={r.row}
            className="cabin-row absolute inset-y-0 left-0 flex will-change-transform"
            style={{ ["--wy" as string]: stage.mobile ? "50%" : "40%", ["--win" as string]: `${stage.win}px`, ["--win-h" as string]: `${winH}px`, ["--pitch" as string]: `${stage.pitch}px` }}
          >
            {bays.map((p, i) => (
              <div key={i} className="cabin-bay">
                <div className="cabin-window">
                  <div className="cabin-glass">
                    <div className="cabin-city" />
                    {p && <img src={p.image} alt="" width={1280} height={800} loading={i - PAD < 2 ? "eager" : "lazy"} decoding="async" className="cabin-shot" />}
                    <div className="cabin-reflection" />
                    <div className="cabin-blind" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="cabin-shade pointer-events-none absolute inset-0" />
        </div>

        <div ref={r.streaks} className="pointer-events-none absolute inset-0">
          {STREAKS.slice(0, stage.mobile ? 8 : 16).map((st, i) => (
            <span key={i} className="streak absolute left-0 opacity-0" style={{ top: `${st.y * 100}%`, width: `${st.len * 100}vw`, height: st.h, ["--c" as string]: st.color }} />
          ))}
        </div>
        <div ref={r.tunnel} className="pointer-events-none absolute inset-0 bg-[#030509] opacity-0" />
      </div>
      <div className="hero-vignette pointer-events-none absolute inset-0" />
      <div className="hero-grain pointer-events-none absolute inset-0" />
      <div ref={r.blackout} className="pointer-events-none absolute inset-0 bg-night opacity-0" />
    </div>
  );
}
