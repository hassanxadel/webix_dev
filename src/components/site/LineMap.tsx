import { useEffect, useRef } from "react";
import { STATIONS } from "@/config/stations";
import { journey, travelTo, useJourney } from "@/lib/journey";

/** Where the train is along the drawn line (0..1), interpolated between station anchors. */
function trainPosition(p: number) {
  const last = STATIONS.length - 1;
  for (let i = 0; i < last; i++) {
    const a = STATIONS[i].anchor;
    const b = STATIONS[i + 1].anchor;
    if (p <= b) return (i + Math.max(0, (p - a) / (b - a))) / last;
  }
  return 1;
}

/**
 * The signature metro-line diagram: vertical on the right edge (desktop),
 * horizontal along the bottom (mobile). The yellow dot moves with scroll;
 * every dot is a keyboard-reachable button that travels to its station.
 */
export function LineMap() {
  const stamps = useJourney((s) => s.stamps);
  const station = useJourney((s) => s.station);
  const vDot = useRef<HTMLSpanElement>(null);
  const vFill = useRef<HTMLSpanElement>(null);
  const hDot = useRef<HTMLSpanElement>(null);
  const hFill = useRef<HTMLSpanElement>(null);

  // Position updates run outside React, once per frame.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = trainPosition(journey.progress) * 100;
      if (vDot.current) vDot.current.style.top = `${t}%`;
      if (vFill.current) vFill.current.style.height = `${t}%`;
      if (hDot.current) hDot.current.style.left = `${t}%`;
      if (hFill.current) hFill.current.style.width = `${t}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const stationButton = (i: number, vertical: boolean) => {
    const s = STATIONS[i];
    const passed = i < stamps;
    const current = i === station;
    return (
      <li key={s.id} className={vertical ? "absolute right-0 -translate-y-1/2" : "absolute top-0 -translate-x-1/2"} style={vertical ? { top: `${(i / (STATIONS.length - 1)) * 100}%` } : { left: `${(i / (STATIONS.length - 1)) * 100}%` }}>
        <button
          type="button"
          onClick={() => travelTo(s.anchor)}
          aria-label={`Station ${s.num}: ${s.en}`}
          aria-current={current ? "step" : undefined}
          className="group relative flex items-center"
        >
          {vertical && (
            <span className={`hud mr-4 whitespace-nowrap opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 ${current ? "text-sun" : "text-paper/60"}`}>
              {s.num} {s.en}
            </span>
          )}
          <span
            className={`block h-2.5 w-2.5 rounded-full border transition-colors duration-300 ${
              passed ? "border-sun bg-sun" : "border-paper/50 bg-night"
            } ${current ? "ring-4 ring-sun/20" : ""}`}
          />
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Webix Line — stations">
      {/* Desktop: vertical line on the right edge. */}
      <div className="fixed right-8 top-1/2 z-40 hidden h-[52vh] -translate-y-1/2 md:block lg:right-12">
        <span className="absolute right-[4.5px] top-0 h-full w-px bg-paper/20" aria-hidden />
        <span ref={vFill} className="absolute right-[4.5px] top-0 w-px bg-sun" aria-hidden />
        <ol className="relative h-full">{STATIONS.map((_, i) => stationButton(i, true))}</ol>
        <span ref={vDot} className="pointer-events-none absolute right-[-2px] h-4 w-4 -translate-y-1/2 rounded-full bg-sun shadow-[0_0_14px_rgb(255_218_36/0.8)]" aria-hidden />
      </div>

      {/* Mobile: horizontal line along the bottom. */}
      <div className="fixed inset-x-6 bottom-5 z-40 h-3 md:hidden">
        <span className="absolute left-0 top-[4.5px] h-px w-full bg-paper/20" aria-hidden />
        <span ref={hFill} className="absolute left-0 top-[4.5px] h-px bg-sun" aria-hidden />
        <ol className="relative h-full">{STATIONS.map((_, i) => stationButton(i, false))}</ol>
        <span ref={hDot} className="pointer-events-none absolute top-[-2px] h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-sun shadow-[0_0_12px_rgb(255_218_36/0.8)]" aria-hidden />
      </div>
    </nav>
  );
}
